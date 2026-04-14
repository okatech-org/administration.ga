/**
 * Chat Functions — Messagerie peer-to-peer temps réel.
 *
 * Restriction métier :
 *   - Seuls les agents (Catégorie A) peuvent initier un thread P2P
 *   - Les citoyens (Catégorie B) peuvent initier un thread "standard" (Mr Ray)
 *   - Les citoyens peuvent répondre dans tout thread existant
 *   - Tout utilisateur peut lire ses propres threads
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { authQuery, authMutation } from "../lib/customFunctions";
import { error, ErrorCode } from "../lib/errors";
import { isPublicUser } from "../lib/userCategory";

// ============================================
// Helpers
// ============================================

/**
 * Trie deux IDs utilisateur pour garantir l'unicité du thread.
 * participantA = min(a, b), participantB = max(a, b)
 */
function sortParticipants(
  a: Id<"users">,
  b: Id<"users">,
): { participantA: Id<"users">; participantB: Id<"users"> } {
  return a < b
    ? { participantA: a, participantB: b }
    : { participantA: b, participantB: a };
}

/**
 * Vérifie que l'utilisateur est bien un participant du chat.
 * Pour les threads "standard" (citoyen ↔ Mr Ray), les agents membres
 * de l'org du chat sont aussi autorisés (supervision / prise en charge).
 */
async function validateParticipation(
  ctx: { db: any },
  chatId: Id<"chats">,
  userId: Id<"users">,
) {
  const chat = await ctx.db.get(chatId);
  if (!chat) throw error(ErrorCode.NOT_FOUND, "Conversation non trouvée");
  if (chat.participantA === userId || chat.participantB === userId) {
    return chat;
  }
  // Pour les threads standard, autoriser les agents de l'org
  if (chat.type === "standard" && chat.orgId) {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q: any) =>
        q.eq("userId", userId).eq("orgId", chat.orgId),
      )
      .first();
    if (membership && !membership.deletedAt) {
      return chat;
    }
  }
  throw error(ErrorCode.INSUFFICIENT_PERMISSIONS, "Vous ne faites pas partie de cette conversation");
}

// ============================================
// QUERIES
// ============================================

/**
 * Liste les threads de chat de l'utilisateur connecté.
 * Enrichit avec les données de l'interlocuteur.
 */
export const listMyChats = authQuery({
  args: {},
  handler: async (ctx) => {
    const userId = ctx.user._id;

    // Chercher tous les threads où l'utilisateur est participantA ou participantB
    const asA = await ctx.db
      .query("chats")
      .withIndex("by_participantA", (q: any) => q.eq("participantA", userId))
      .collect();

    const asB = await ctx.db
      .query("chats")
      .withIndex("by_participantB", (q: any) => q.eq("participantB", userId))
      .collect();

    // Fusionner et dédoublonner
    const allChats = [...asA];
    const seenIds = new Set(asA.map((c) => c._id as string));
    for (const chat of asB) {
      if (!seenIds.has(chat._id as string)) {
        allChats.push(chat);
        seenIds.add(chat._id as string);
      }
    }

    // Trier par dernier message (plus récent en premier)
    allChats.sort((a, b) => (b.lastMessageAt ?? b.createdAt) - (a.lastMessageAt ?? a.createdAt));

    // Enrichir avec les données de l'interlocuteur
    const enriched = await Promise.all(
      allChats.map(async (chat) => {
        const otherUserId = chat.participantA === userId ? chat.participantB : chat.participantA;
        const otherUser = await ctx.db.get(otherUserId) as any;

        // Compter les messages non lus
        const unreadMessages = await ctx.db
          .query("chatMessages")
          .withIndex("by_chat_created", (q: any) => q.eq("chatId", chat._id))
          .collect();

        const unreadCount = unreadMessages.filter(
          (m: any) => m.senderId !== userId && !m.readAt,
        ).length;

        // Enrichir avec la référence de la demande liée
        let requestRef: string | null = null;
        if (chat.requestId) {
          const request = await ctx.db.get(chat.requestId) as any;
          if (request) requestRef = request.reference ?? null;
        }

        return {
          ...chat,
          otherUser: otherUser
            ? {
                id: otherUser._id,
                firstName: otherUser.firstName,
                lastName: otherUser.lastName,
                name: otherUser.name,
                email: otherUser.email,
                avatarUrl: otherUser.avatarUrl,
              }
            : null,
          unreadCount,
          requestRef,
        };
      }),
    );

    return enriched;
  },
});

/**
 * Récupère un thread de chat avec les données enrichies.
 */
export const getChat = authQuery({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    const chat = await validateParticipation(ctx, args.chatId, ctx.user._id);

    const otherUserId = chat.participantA === ctx.user._id ? chat.participantB : chat.participantA;
    const otherUser = await ctx.db.get(otherUserId) as any;

    return {
      ...chat,
      otherUser: otherUser
        ? {
            id: otherUser._id,
            firstName: otherUser.firstName,
            lastName: otherUser.lastName,
            name: otherUser.name,
            email: otherUser.email,
            avatarUrl: otherUser.avatarUrl,
          }
        : null,
    };
  },
});

/**
 * Liste les messages d'un thread (paginé, plus récent en dernier).
 */
export const listMessages = authQuery({
  args: {
    chatId: v.id("chats"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await validateParticipation(ctx, args.chatId, ctx.user._id);

    const limit = args.limit ?? 50;

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_chat_created", (q: any) => q.eq("chatId", args.chatId))
      .order("desc")
      .take(limit);

    // Enrichir avec les noms des expéditeurs
    const enriched = await Promise.all(
      messages.map(async (msg) => {
        const sender = await ctx.db.get(msg.senderId);
        return {
          ...msg,
          senderName: sender
            ? [sender.firstName, sender.lastName].filter(Boolean).join(" ") || sender.name || sender.email
            : "Inconnu",
          senderAvatar: sender?.avatarUrl,
        };
      }),
    );

    // Retourner dans l'ordre chronologique (plus ancien en premier)
    return enriched.reverse();
  },
});

/**
 * Trouve un chat existant entre l'utilisateur et un autre.
 */
export const findChatWith = authQuery({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, args) => {
    const { participantA, participantB } = sortParticipants(ctx.user._id, args.targetUserId);

    const chat = await ctx.db
      .query("chats")
      .withIndex("by_participantA_B", (q: any) =>
        q.eq("participantA", participantA).eq("participantB", participantB),
      )
      .first();

    return chat;
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Initier une conversation avec un autre utilisateur.
 * RESTRICTION : les citoyens (Catégorie B) ne peuvent PAS initier.
 * Si un thread existe déjà, envoie directement le message.
 */
export const initiateChat = authMutation({
  args: {
    targetUserId: v.id("users"),
    orgId: v.optional(v.id("orgs")),
    requestId: v.optional(v.id("requests")),
    initialMessage: v.string(),
  },
  handler: async (ctx, args) => {
    // Restriction citoyen
    const isCitizen = await isPublicUser(ctx, ctx.user._id);
    if (isCitizen) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Les ressortissants ne peuvent pas initier de conversations. Vous pouvez répondre aux messages reçus.",
      );
    }

    if (args.targetUserId === ctx.user._id) {
      throw error(ErrorCode.INVALID_ARGUMENT, "Vous ne pouvez pas vous écrire à vous-même");
    }

    // Vérifier que l'utilisateur cible existe
    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) throw error(ErrorCode.NOT_FOUND, "Utilisateur non trouvé");

    // Chercher un thread existant
    const { participantA, participantB } = sortParticipants(ctx.user._id, args.targetUserId);

    let chat = await ctx.db
      .query("chats")
      .withIndex("by_participantA_B", (q: any) =>
        q.eq("participantA", participantA).eq("participantB", participantB),
      )
      .first();

    const now = Date.now();

    if (!chat) {
      // Créer le thread
      const chatId = await ctx.db.insert("chats", {
        participantA,
        participantB,
        initiatedBy: ctx.user._id,
        orgId: args.orgId,
        requestId: args.requestId,
        lastMessageText: args.initialMessage.slice(0, 100),
        lastMessageAt: now,
        lastMessageBy: ctx.user._id,
        status: "active",
        createdAt: now,
      });
      chat = await ctx.db.get(chatId);
    }

    // Envoyer le premier message
    await ctx.db.insert("chatMessages", {
      chatId: chat!._id,
      senderId: ctx.user._id,
      content: args.initialMessage,
      type: "text",
      createdAt: now,
    });

    // Mettre à jour le dernier message
    await ctx.db.patch(chat!._id, {
      lastMessageText: args.initialMessage.slice(0, 100),
      lastMessageAt: now,
      lastMessageBy: ctx.user._id,
    });

    return { chatId: chat!._id };
  },
});

/**
 * Envoyer un message dans un thread existant.
 * Pas de restriction : tout participant peut envoyer (y compris citoyens).
 * Pour les threads "standard" :
 *   - Si un agent humain envoie → claimedBy est mis à jour (Mr Ray se retire)
 *   - Si un citoyen envoie et que le thread n'est pas revendiqué → scheduler Mr Ray
 */
export const sendMessage = authMutation({
  args: {
    chatId: v.id("chats"),
    content: v.string(),
    attachments: v.optional(v.array(v.id("documents"))),
  },
  handler: async (ctx, args) => {
    const chat = await validateParticipation(ctx, args.chatId, ctx.user._id);

    if (chat.status === "archived") {
      throw error(ErrorCode.INVALID_ARGUMENT, "Cette conversation est archivée");
    }

    const now = Date.now();

    const messageId = await ctx.db.insert("chatMessages", {
      chatId: args.chatId,
      senderId: ctx.user._id,
      content: args.content,
      attachments: args.attachments,
      type: "text",
      createdAt: now,
    });

    // Mettre à jour le dernier message du thread
    await ctx.db.patch(args.chatId, {
      lastMessageText: args.content.slice(0, 100),
      lastMessageAt: now,
      lastMessageBy: ctx.user._id,
    });

    // Logique spécifique aux threads "standard" (Mr Ray)
    if (chat.type === "standard") {
      const isCitizen = await isPublicUser(ctx, ctx.user._id);

      if (!isCitizen && !chat.claimedBy) {
        // Un agent humain prend le relais → Mr Ray se retire
        await ctx.db.patch(args.chatId, { claimedBy: ctx.user._id });
      } else if (isCitizen && !chat.claimedBy) {
        // Le citoyen envoie et pas d'agent humain → scheduler Mr Ray IA
        await ctx.scheduler.runAfter(500, internal.ai.mrRay.generateReply, {
          chatId: args.chatId,
          citizenMessage: args.content,
        });
      }
    }

    return { messageId };
  },
});

/**
 * Marquer les messages non lus comme lus dans un thread.
 */
export const markRead = authMutation({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    await validateParticipation(ctx, args.chatId, ctx.user._id);

    const now = Date.now();

    // Récupérer les messages non lus envoyés par l'autre
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_chat_created", (q: any) => q.eq("chatId", args.chatId))
      .collect();

    const unread = messages.filter(
      (m) => m.senderId !== ctx.user._id && !m.readAt,
    );

    // Marquer comme lus
    for (const msg of unread) {
      await ctx.db.patch(msg._id, { readAt: now });
    }

    return { markedCount: unread.length };
  },
});

// ============================================
// STANDARD CHAT (Mr Ray)
// ============================================

/** Email du compte Mr Ray dans le seed */
const MR_RAY_EMAIL = "assistant-admin2@consulatdugabon.fr";

/**
 * Initier un thread Standard (Mr Ray) — autorisé pour les citoyens.
 * Crée ou réutilise un thread type "standard" entre le citoyen et Mr Ray.
 */
export const initiateStandardChat = authMutation({
  args: {
    orgId: v.id("orgs"),
    initialMessage: v.string(),
  },
  handler: async (ctx, args) => {
    // Trouver le user Mr Ray par email
    const mrRayUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", MR_RAY_EMAIL))
      .first();

    if (!mrRayUser) {
      throw error(ErrorCode.NOT_FOUND, "Le service Standard n'est pas disponible actuellement.");
    }

    // Chercher un thread standard existant entre le citoyen et Mr Ray
    const { participantA, participantB } = sortParticipants(ctx.user._id, mrRayUser._id);

    let chat = await ctx.db
      .query("chats")
      .withIndex("by_participantA_B", (q: any) =>
        q.eq("participantA", participantA).eq("participantB", participantB),
      )
      .first();

    const now = Date.now();

    if (!chat) {
      // Créer le thread standard
      const chatId = await ctx.db.insert("chats", {
        participantA,
        participantB,
        initiatedBy: ctx.user._id,
        orgId: args.orgId,
        type: "standard",
        lastMessageText: args.initialMessage.slice(0, 100),
        lastMessageAt: now,
        lastMessageBy: ctx.user._id,
        status: "active",
        createdAt: now,
      });
      chat = await ctx.db.get(chatId);
    }

    // Envoyer le message du citoyen
    await ctx.db.insert("chatMessages", {
      chatId: chat!._id,
      senderId: ctx.user._id,
      content: args.initialMessage,
      type: "text",
      createdAt: now,
    });

    // Mettre à jour le dernier message
    await ctx.db.patch(chat!._id, {
      lastMessageText: args.initialMessage.slice(0, 100),
      lastMessageAt: now,
      lastMessageBy: ctx.user._id,
    });

    // Scheduler la réponse IA de Mr Ray (délai 500ms pour laisser le temps d'afficher)
    if (!chat!.claimedBy) {
      await ctx.scheduler.runAfter(500, internal.ai.mrRay.generateReply, {
        chatId: chat!._id,
        citizenMessage: args.initialMessage,
      });
    }

    return { chatId: chat!._id };
  },
});

/**
 * Lister les threads Standard pour un agent de la représentation.
 * Retourne les threads type "standard" liés à l'org de l'agent.
 */
export const listStandardChats = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    // Vérifier que l'agent appartient à cette org
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q: any) =>
        q.eq("userId", ctx.user._id).eq("orgId", args.orgId),
      )
      .first();

    if (!membership || membership.deletedAt) {
      return [];
    }

    // Récupérer les threads standard de cette org
    const standardChats = await ctx.db
      .query("chats")
      .withIndex("by_org_type", (q: any) =>
        q.eq("orgId", args.orgId).eq("type", "standard"),
      )
      .collect();

    // Enrichir avec les données du citoyen
    const enriched = await Promise.all(
      standardChats
        .filter((c) => c.status === "active")
        .map(async (chat) => {
          // Trouver le citoyen (pas Mr Ray)
          const mrRay = await ctx.db
            .query("users")
            .withIndex("by_email", (q: any) => q.eq("email", MR_RAY_EMAIL))
            .first();

          const citizenId = mrRay && chat.participantA === mrRay._id
            ? chat.participantB
            : chat.participantA;

          const citizen = await ctx.db.get(citizenId) as any;

          // Compter les messages non lus
          const messages = await ctx.db
            .query("chatMessages")
            .withIndex("by_chat_created", (q: any) => q.eq("chatId", chat._id))
            .collect();

          const unreadCount = messages.filter(
            (m: any) => m.senderId !== ctx.user._id && !m.readAt,
          ).length;

          return {
            ...chat,
            otherUser: citizen
              ? {
                  id: citizen._id,
                  firstName: citizen.firstName,
                  lastName: citizen.lastName,
                  name: citizen.name,
                  email: citizen.email,
                  avatarUrl: citizen.avatarUrl,
                }
              : null,
            unreadCount,
            isStandard: true,
          };
        }),
    );

    return enriched.sort(
      (a, b) => (b.lastMessageAt ?? b.createdAt) - (a.lastMessageAt ?? a.createdAt),
    );
  },
});

/**
 * Mutation interne : insère un message de Mr Ray dans un thread.
 * Appelée par l'action IA après la génération de la réponse.
 */
export const insertMrRayMessage = internalMutation({
  args: {
    chatId: v.id("chats"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Trouver Mr Ray
    const mrRay = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", MR_RAY_EMAIL))
      .first();

    if (!mrRay) return;

    const now = Date.now();

    await ctx.db.insert("chatMessages", {
      chatId: args.chatId,
      senderId: mrRay._id,
      content: args.content,
      type: "text",
      createdAt: now,
    });

    await ctx.db.patch(args.chatId, {
      lastMessageText: args.content.slice(0, 100),
      lastMessageAt: now,
      lastMessageBy: mrRay._id,
    });
  },
});
