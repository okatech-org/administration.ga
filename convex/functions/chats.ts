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
import { canDoTask } from "../lib/permissions";
import { TaskCode } from "../lib/taskCodes";
import { isPublicUser } from "../lib/userCategory";

/** Délai au-delà duquel un thread standard revendiqué par un agent humain
 * est réaffecté à Mr Ray (l'agent n'a pas répondu, le citoyen patiente). */
const CLAIMED_BY_STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48h

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
 *
 * Pour les threads "standard" (citoyen ↔ Mr Ray) avec un `orgId`, seuls les
 * agents de l'org qui possèdent la permission explicite
 * `chats.accessStandardThread` sont autorisés — typiquement les superviseurs
 * et admins. Sans ce contrôle, TOUT agent membre de l'org pouvait lire les
 * conversations assistant IA ↔ citoyen (escalation de privilèges HIGH).
 */
async function validateParticipation(
  ctx: { db: any; user?: any },
  chatId: Id<"chats">,
  userId: Id<"users">,
) {
  const chat = await ctx.db.get(chatId);
  if (!chat) throw error(ErrorCode.NOT_FOUND, "Conversation non trouvée");
  if (chat.participantA === userId || chat.participantB === userId) {
    return chat;
  }
  // Threads standard org-scoped : exiger la task `chats.accessStandardThread`.
  if (chat.type === "standard" && chat.orgId) {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q: any) =>
        q.eq("userId", userId).eq("orgId", chat.orgId),
      )
      .first();
    if (membership && !membership.deletedAt) {
      // Résoudre l'utilisateur si non fourni (helper utilisable hors authQuery).
      const user = ctx.user ?? (await ctx.db.get(userId));
      if (user) {
        const canAccess = await canDoTask(
          ctx as any,
          user,
          membership,
          TaskCode.chats.accessStandardThread,
        );
        if (canAccess) return chat;
      }
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

    // ── Batch 1 : résoudre tous les interlocuteurs en un seul round-trip ──
    // Avant : boucle Promise.all avec db.get() dans chaque itération (N+1).
    // Après : collecter tous les userIds uniques, un Promise.all unique.
    const otherUserIds = new Set<string>();
    const requestIds = new Set<string>();
    for (const chat of allChats) {
      const otherId = chat.participantA === userId ? chat.participantB : chat.participantA;
      otherUserIds.add(otherId as string);
      if (chat.requestId) requestIds.add(chat.requestId as string);
    }

    const otherUsersList = await Promise.all(
      [...otherUserIds].map((id) => ctx.db.get(id as Id<"users">)),
    );
    const otherUsersById = new Map<string, any>();
    for (const u of otherUsersList) {
      if (u) otherUsersById.set(u._id as string, u);
    }

    const requestsList = await Promise.all(
      [...requestIds].map((id) => ctx.db.get(id as Id<"requests">)),
    );
    const requestRefsById = new Map<string, string>();
    for (const r of requestsList as any[]) {
      if (r?.reference) requestRefsById.set(r._id as string, r.reference);
    }

    // ── Batch 2 : unread counts en parallèle (1 query par chat mais async) ──
    const enriched = await Promise.all(
      allChats.map(async (chat) => {
        const otherUserId = chat.participantA === userId ? chat.participantB : chat.participantA;
        const otherUser = otherUsersById.get(otherUserId as string);

        const unreadMessages = await ctx.db
          .query("chatMessages")
          .withIndex("by_chat_created", (q: any) => q.eq("chatId", chat._id))
          .collect();

        const unreadCount = unreadMessages.filter(
          (m: any) => m.senderId !== userId && !m.readAt && !m.deletedAt,
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
          requestRef: chat.requestId ? requestRefsById.get(chat.requestId as string) ?? null : null,
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
 * Pagination cursor-based : `before` (timestamp) + `limit` pour remonter
 * l'historique sans charger 500 messages d'un coup.
 */
export const listMessages = authQuery({
  args: {
    chatId: v.id("chats"),
    limit: v.optional(v.number()),
    /** Timestamp exclusif : retourne messages créés AVANT cette valeur. */
    before: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await validateParticipation(ctx, args.chatId, ctx.user._id);

    const limit = Math.min(args.limit ?? 50, 200);

    let query = ctx.db
      .query("chatMessages")
      .withIndex("by_chat_created", (q: any) => {
        const base = q.eq("chatId", args.chatId);
        return args.before ? base.lt("createdAt", args.before) : base;
      })
      .order("desc");

    const messages = await query.take(limit);

    // Batch N+1 : collecter tous les senderIds uniques avant un unique Promise.all
    const senderIds = new Set<string>(messages.map((m: any) => m.senderId as string));
    const sendersList = await Promise.all(
      [...senderIds].map((id) => ctx.db.get(id as Id<"users">)),
    );
    const sendersById = new Map<string, any>();
    for (const s of sendersList) {
      if (s) sendersById.set(s._id as string, s);
    }

    // Résolution des URLs de pièces jointes. On fait un unique batch de
    // `ctx.storage.getUrl` par message, mais on ne résout que les messages
    // qui en ont — la majorité n'en a pas.
    const enriched = await Promise.all(
      messages.map(async (msg: any) => {
        const sender = sendersById.get(msg.senderId as string);
        let attachmentFilesWithUrl:
          | Array<{
              storageId: string;
              filename: string;
              mimeType: string;
              sizeBytes: number;
              url: string | null;
            }>
          | undefined;

        if (msg.attachmentFiles && msg.attachmentFiles.length > 0) {
          attachmentFilesWithUrl = await Promise.all(
            msg.attachmentFiles.map(async (f: any) => ({
              storageId: f.storageId,
              filename: f.filename,
              mimeType: f.mimeType,
              sizeBytes: f.sizeBytes,
              url: await ctx.storage.getUrl(f.storageId),
            })),
          );
        }

        return {
          ...msg,
          senderName: sender
            ? [sender.firstName, sender.lastName].filter(Boolean).join(" ") || sender.name || sender.email
            : "Inconnu",
          senderAvatar: sender?.avatarUrl,
          attachmentFiles: attachmentFilesWithUrl,
        };
      }),
    );

    // Retourner dans l'ordre chronologique (plus ancien en premier).
    // Signature array préservée pour compat client ; pagination via l'arg
    // `before` (le client passe le `createdAt` du plus ancien message déjà
    // chargé pour obtenir la page suivante).
    return enriched.reverse();
  },
});

/**
 * Génère une URL d'upload Convex Storage pour une pièce jointe de chat.
 * Le client POST son fichier sur cette URL, récupère le `storageId` dans la
 * réponse, puis l'envoie via `sendMessage({ attachmentFiles: [...] })`.
 *
 * Pas de restriction par thread : tout utilisateur authentifié peut générer
 * une URL. Le lien est éphémère et la validation de permission (participation
 * au chat) s'applique au moment de l'appel à `sendMessage`.
 */
export const generateAttachmentUploadUrl = authMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
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
    initialAttachmentFiles: v.optional(
      v.array(
        v.object({
          storageId: v.id("_storage"),
          filename: v.string(),
          mimeType: v.string(),
          sizeBytes: v.number(),
        }),
      ),
    ),
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

    const hasInitialAttachments = !!(
      args.initialAttachmentFiles && args.initialAttachmentFiles.length > 0
    );
    if (!args.initialMessage.trim() && !hasInitialAttachments) {
      throw error(ErrorCode.INVALID_ARGUMENT, "Message initial vide");
    }

    const previewText = args.initialMessage.trim()
      ? args.initialMessage.slice(0, 100)
      : hasInitialAttachments
      ? `📎 ${args.initialAttachmentFiles![0].filename}${
          args.initialAttachmentFiles!.length > 1
            ? ` (+${args.initialAttachmentFiles!.length - 1})`
            : ""
        }`
      : "";

    if (!chat) {
      // Créer le thread
      const chatId = await ctx.db.insert("chats", {
        participantA,
        participantB,
        initiatedBy: ctx.user._id,
        orgId: args.orgId,
        requestId: args.requestId,
        lastMessageText: previewText,
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
      attachmentFiles: args.initialAttachmentFiles,
      type: "text",
      createdAt: now,
    });

    // Mettre à jour le dernier message
    await ctx.db.patch(chat!._id, {
      lastMessageText: previewText,
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
    /** Fichiers joints inline (storage refs). Préféré à `attachments`. */
    attachmentFiles: v.optional(
      v.array(
        v.object({
          storageId: v.id("_storage"),
          filename: v.string(),
          mimeType: v.string(),
          sizeBytes: v.number(),
        }),
      ),
    ),
    /** Clé d'idempotence générée client (UUID) — déduplique les doubles envois. */
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const chat = await validateParticipation(ctx, args.chatId, ctx.user._id);

    if (chat.status === "archived") {
      throw error(ErrorCode.INVALID_ARGUMENT, "Cette conversation est archivée");
    }

    // Contenu vide autorisé uniquement si au moins un fichier est joint.
    const hasAttachments = !!(args.attachmentFiles && args.attachmentFiles.length > 0);
    if (!args.content.trim() && !hasAttachments) {
      throw error(ErrorCode.INVALID_ARGUMENT, "Message vide");
    }

    // Anti-double-send : si le client a déjà envoyé un message avec cette clé
    // (même chatId), on retourne l'existant sans réinsérer. Cas couvert :
    // double-clic utilisateur, retry réseau après timeout côté client mais
    // succès DB côté serveur, remount StrictMode en dev.
    if (args.idempotencyKey) {
      const existing = await ctx.db
        .query("chatMessages")
        .withIndex("by_chat_idempotency", (q: any) =>
          q.eq("chatId", args.chatId).eq("idempotencyKey", args.idempotencyKey),
        )
        .first();
      if (existing) {
        return { messageId: existing._id, deduplicated: true };
      }
    }

    const now = Date.now();

    const messageId = await ctx.db.insert("chatMessages", {
      chatId: args.chatId,
      senderId: ctx.user._id,
      content: args.content,
      attachments: args.attachments,
      attachmentFiles: args.attachmentFiles,
      type: "text",
      idempotencyKey: args.idempotencyKey,
      createdAt: now,
    });

    // Mettre à jour le dernier message du thread. Pour un message sans texte
    // mais avec pièces jointes, on affiche un label "📎 <filename>" pour que
    // la liste des threads montre quelque chose de signifiant.
    const previewText = args.content.trim()
      ? args.content.slice(0, 100)
      : hasAttachments
      ? `📎 ${args.attachmentFiles![0].filename}${
          args.attachmentFiles!.length > 1
            ? ` (+${args.attachmentFiles!.length - 1})`
            : ""
        }`
      : "";
    await ctx.db.patch(args.chatId, {
      lastMessageText: previewText,
      lastMessageAt: now,
      lastMessageBy: ctx.user._id,
    });

    // Logique spécifique aux threads "standard" (Mr Ray)
    if (chat.type === "standard") {
      const isCitizen = await isPublicUser(ctx, ctx.user._id);

      if (!isCitizen && !chat.claimedBy) {
        // Un agent humain prend le relais → Mr Ray se retire.
        // NB : si plusieurs agents envoient simultanément, le dernier patch
        // gagne — on accepte cette race : peu importe lequel est noté, le
        // citoyen est pris en charge par un humain.
        await ctx.db.patch(args.chatId, { claimedBy: ctx.user._id });
      } else if (isCitizen && !chat.claimedBy) {
        // Le citoyen envoie et pas d'agent humain → scheduler Mr Ray IA
        await ctx.scheduler.runAfter(500, internal.ai.mrRay.generateReply, {
          chatId: args.chatId,
          citizenMessage: args.content,
        });
      }
    }

    // Notification push au destinataire (autre participant du thread P2P).
    // Stub silencieux si VAPID manquant (cf. actions/push.ts).
    const otherUserId = chat.participantA === ctx.user._id ? chat.participantB : chat.participantA;
    if (otherUserId && otherUserId !== ctx.user._id) {
      await ctx.scheduler.runAfter(0, internal.actions.push.sendPushNotification, {
        userId: otherUserId as Id<"users">,
        payload: {
          title: "Nouveau message",
          body: args.content.slice(0, 120),
          url: `/iasted?chat=${args.chatId}`,
          tag: `chat-${args.chatId}`,
        },
      });
    }

    return { messageId, deduplicated: false };
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
    initialAttachmentFiles: v.optional(
      v.array(
        v.object({
          storageId: v.id("_storage"),
          filename: v.string(),
          mimeType: v.string(),
          sizeBytes: v.number(),
        }),
      ),
    ),
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

    const hasInitialAttachments = !!(
      args.initialAttachmentFiles && args.initialAttachmentFiles.length > 0
    );
    if (!args.initialMessage.trim() && !hasInitialAttachments) {
      throw error(ErrorCode.INVALID_ARGUMENT, "Message initial vide");
    }

    const previewText = args.initialMessage.trim()
      ? args.initialMessage.slice(0, 100)
      : hasInitialAttachments
      ? `📎 ${args.initialAttachmentFiles![0].filename}${
          args.initialAttachmentFiles!.length > 1
            ? ` (+${args.initialAttachmentFiles!.length - 1})`
            : ""
        }`
      : "";

    if (!chat) {
      // Créer le thread standard
      const chatId = await ctx.db.insert("chats", {
        participantA,
        participantB,
        initiatedBy: ctx.user._id,
        orgId: args.orgId,
        type: "standard",
        lastMessageText: previewText,
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
      attachmentFiles: args.initialAttachmentFiles,
      type: "text",
      createdAt: now,
    });

    // Mettre à jour le dernier message
    await ctx.db.patch(chat!._id, {
      lastMessageText: previewText,
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


/**
 * Cron quotidien : si un thread "standard" est revendiqué (claimedBy) par un
 * agent humain mais que le dernier message date de plus de 48h, on le libère
 * pour que Mr Ray reprenne la conversation quand le citoyen écrira à nouveau.
 * Protège contre les agents en congé qui laissent le citoyen sans réponse.
 */
export const resetStaleClaimedThreads = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const cutoff = now - CLAIMED_BY_STALE_THRESHOLD_MS;

    // On scan les chats "standard" claimedBy (pas d'index dédié, on bornera
    // par take(500) — suffisant pour un consulat : peu de threads simultanés).
    const claimedThreads = await ctx.db
      .query("chats")
      .filter((q: any) =>
        q.and(
          q.eq(q.field("type"), "standard"),
          q.neq(q.field("claimedBy"), undefined),
        ),
      )
      .take(500);

    let reset = 0;
    for (const chat of claimedThreads) {
      const lastActivity = (chat as any).lastMessageAt ?? (chat as any).createdAt;
      if (lastActivity && lastActivity < cutoff) {
        await ctx.db.patch(chat._id, { claimedBy: undefined });
        reset++;
      }
    }

    return { reset };
  },
});

// ============================================
// SOFT-DELETE & EDIT (fenêtre courte)
// ============================================

/** Fenêtre d'édition/suppression d'un message par son auteur. */
const MESSAGE_EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Supprime (soft-delete) un message que l'utilisateur a lui-même envoyé,
 * dans les 15 minutes suivant l'envoi. Pas de hard-delete : on conserve
 * la row avec `deletedAt` renseigné pour l'audit et les exports légaux.
 */
export const deleteMessage = authMutation({
  args: { messageId: v.id("chatMessages") },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.messageId);
    if (!msg) throw error(ErrorCode.NOT_FOUND, "Message introuvable");
    if (msg.senderId !== ctx.user._id) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Vous ne pouvez supprimer que vos propres messages.",
      );
    }
    if (msg.deletedAt) {
      return { alreadyDeleted: true };
    }
    const age = Date.now() - msg.createdAt;
    if (age > MESSAGE_EDIT_WINDOW_MS) {
      throw error(
        ErrorCode.INVALID_ARGUMENT,
        "Fenêtre de suppression expirée (15 min après envoi).",
      );
    }

    await ctx.db.patch(args.messageId, {
      deletedAt: Date.now(),
      content: "",
    });

    // Mettre à jour le lastMessageText du chat si le message supprimé était
    // le dernier affiché : on recalcule en prenant le plus récent non supprimé.
    const chat = await ctx.db.get(msg.chatId);
    if (chat && (chat as any).lastMessageAt === msg.createdAt) {
      const prev = await ctx.db
        .query("chatMessages")
        .withIndex("by_chat_created", (q: any) => q.eq("chatId", msg.chatId))
        .order("desc")
        .take(5);
      const lastNonDeleted = prev.find(
        (m: any) => m._id !== msg._id && !m.deletedAt,
      );
      if (lastNonDeleted) {
        await ctx.db.patch(msg.chatId, {
          lastMessageText: (lastNonDeleted as any).content.slice(0, 100),
          lastMessageAt: (lastNonDeleted as any).createdAt,
          lastMessageBy: (lastNonDeleted as any).senderId,
        });
      } else {
        await ctx.db.patch(msg.chatId, {
          lastMessageText: "[Message supprimé]",
        });
      }
    }

    return { deletedAt: Date.now() };
  },
});

/**
 * Édite un message que l'utilisateur a envoyé, dans la même fenêtre de
 * 15 minutes. `editedAt` est mis à jour pour que l'UI affiche le tag
 * "(modifié)" à côté du timestamp.
 */
export const editMessage = authMutation({
  args: {
    messageId: v.id("chatMessages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.messageId);
    if (!msg) throw error(ErrorCode.NOT_FOUND, "Message introuvable");
    if (msg.senderId !== ctx.user._id) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Vous ne pouvez modifier que vos propres messages.",
      );
    }
    if (msg.deletedAt) {
      throw error(ErrorCode.INVALID_ARGUMENT, "Message supprimé.");
    }
    const age = Date.now() - msg.createdAt;
    if (age > MESSAGE_EDIT_WINDOW_MS) {
      throw error(
        ErrorCode.INVALID_ARGUMENT,
        "Fenêtre d'édition expirée (15 min après envoi).",
      );
    }

    const trimmed = args.content.trim();
    if (!trimmed) {
      throw error(ErrorCode.INVALID_ARGUMENT, "Contenu vide interdit.");
    }

    await ctx.db.patch(args.messageId, {
      content: trimmed,
      editedAt: Date.now(),
    });

    // Mettre à jour le lastMessageText si c'était le dernier message.
    const chat = await ctx.db.get(msg.chatId);
    if (chat && (chat as any).lastMessageAt === msg.createdAt) {
      await ctx.db.patch(msg.chatId, {
        lastMessageText: trimmed.slice(0, 100),
      });
    }

    return { editedAt: Date.now() };
  },
});

// ============================================
// TYPING INDICATORS
// ============================================

/** Durée de vie d'un ping typing avant expiration automatique. */
const TYPING_TTL_MS = 6_000; // 6 secondes

/**
 * Signal que l'utilisateur est en train d'écrire. Le client appelle cette
 * mutation à chaque frappe (throttle recommandé côté UI à ~2 s pour éviter
 * la charge inutile). Le row expire automatiquement 6 s après le dernier ping.
 *
 * Idempotent : on upsert un row unique par (chatId, userId).
 */
export const setTyping = authMutation({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    await validateParticipation(ctx, args.chatId, ctx.user._id);

    const existing = await ctx.db
      .query("chatTyping")
      .withIndex("by_chat_user", (q: any) =>
        q.eq("chatId", args.chatId).eq("userId", ctx.user._id),
      )
      .first();

    const expiresAt = Date.now() + TYPING_TTL_MS;

    if (existing) {
      await ctx.db.patch(existing._id, { expiresAt });
    } else {
      await ctx.db.insert("chatTyping", {
        chatId: args.chatId,
        userId: ctx.user._id,
        expiresAt,
      });
    }
  },
});

/**
 * Supprime explicitement l'indicateur typing (ex. l'utilisateur a envoyé ou
 * vidé son input). Optionnel : le TTL s'en charge sinon.
 */
export const clearTyping = authMutation({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("chatTyping")
      .withIndex("by_chat_user", (q: any) =>
        q.eq("chatId", args.chatId).eq("userId", ctx.user._id),
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

/**
 * Liste les utilisateurs en train d'écrire dans ce thread, en EXCLUANT
 * l'utilisateur connecté (pas de "vous êtes en train d'écrire").
 * Retourne les `userId` + nom d'affichage minimal.
 */
export const listTyping = authQuery({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    await validateParticipation(ctx, args.chatId, ctx.user._id);

    const now = Date.now();
    const rows = await ctx.db
      .query("chatTyping")
      .withIndex("by_chat", (q: any) => q.eq("chatId", args.chatId))
      .collect();

    const fresh = rows.filter(
      (r) => r.expiresAt > now && r.userId !== ctx.user._id,
    );
    if (fresh.length === 0) return [];

    const users = await Promise.all(
      fresh.map((r) => ctx.db.get(r.userId)),
    );
    return users
      .filter((u): u is NonNullable<typeof u> => u !== null)
      .map((u) => ({
        userId: u._id,
        displayName:
          [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || u.email,
      }));
  },
});

/**
 * Cron : purge les typing indicators expirés pour éviter l'accumulation.
 * À brancher dans convex/crons.ts (toutes les minutes).
 */
export const purgeExpiredTyping = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("chatTyping")
      .withIndex("by_expires", (q: any) => q.lt("expiresAt", now))
      .take(500);
    for (const row of expired) {
      await ctx.db.delete(row._id);
    }
    return { purged: expired.length };
  },
});
