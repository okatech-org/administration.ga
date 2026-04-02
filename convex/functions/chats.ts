/**
 * Chat Functions — Messagerie peer-to-peer temps réel.
 *
 * Restriction métier :
 *   - Seuls les agents (Catégorie A) peuvent initier un thread
 *   - Les citoyens (Catégorie B) peuvent répondre dans un thread existant
 *   - Tout utilisateur peut lire ses propres threads
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
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
 */
async function validateParticipation(
  ctx: { db: any },
  chatId: Id<"chats">,
  userId: Id<"users">,
) {
  const chat = await ctx.db.get(chatId);
  if (!chat) throw error(ErrorCode.NOT_FOUND, "Conversation non trouvée");
  if (chat.participantA !== userId && chat.participantB !== userId) {
    throw error(ErrorCode.INSUFFICIENT_PERMISSIONS, "Vous ne faites pas partie de cette conversation");
  }
  return chat;
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
