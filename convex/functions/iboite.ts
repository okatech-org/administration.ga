/**
 * iBoîte — Messagerie institutionnelle informelle (Phase 5, MVP).
 *
 * Backend Convex pour la table `iBoite_messages`. Périmètre MVP :
 *   - `send`         : envoyer un message à un autre membership de la même org
 *   - `inbox`        : lister les messages reçus non archivés
 *   - `sent`         : lister les messages envoyés
 *   - `markRead`     : marquer un message reçu comme lu
 *   - `acknowledge`  : envoyer un accusé de réception explicite
 *
 * Le module est distinct de :
 *  - `messages` (notifications agent ↔ citoyen),
 *  - `chats` (chat peer-to-peer agents),
 *  - `correspondanceItems` (courriers officiels avec workflow signé).
 *
 * Tasks (cf. taskCodes.ts) :
 *   reader  → iboite.view
 *   editor  → iboite.view, iboite.send, iboite.acknowledge
 *   admin   → … + iboite.configure
 */

import { v } from "convex/values";
import { authQuery, authMutation } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";
import { TaskCode } from "../lib/taskCodes";

const attachmentValidator = v.object({
  name: v.string(),
  storageId: v.id("_storage"),
  sizeBytes: v.number(),
  mimeType: v.optional(v.string()),
});

/**
 * Envoie un message iBoîte interne à l'org.
 *
 * Contrôles MVP :
 *  - expéditeur et destinataire DOIVENT appartenir à la même org,
 *  - destinataire actif (non soft-deleted),
 *  - subject et body non vides.
 */
export const send = authMutation({
  args: {
    orgId: v.id("orgs"),
    toMembershipId: v.id("memberships"),
    subject: v.string(),
    body: v.string(),
    attachments: v.optional(v.array(attachmentValidator)),
    relatedItemKind: v.optional(v.string()),
    relatedItemId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const senderMembership = await getMembership(ctx, ctx.user._id, args.orgId);
    if (!senderMembership) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Aucun rattachement actif à cette organisation.",
      );
    }
    await assertCanDoTask(ctx, ctx.user, senderMembership, TaskCode.iboite.send);

    const recipientMembership = await ctx.db.get(args.toMembershipId);
    if (!recipientMembership || recipientMembership.deletedAt != null) {
      throw error(ErrorCode.NOT_FOUND, "Destinataire introuvable ou inactif.");
    }
    if (recipientMembership.orgId !== args.orgId) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Le destinataire doit appartenir à la même organisation.",
      );
    }

    const subject = args.subject.trim();
    const body = args.body.trim();
    if (!subject) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS, "Sujet obligatoire.");
    }
    if (!body) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS, "Corps du message obligatoire.");
    }

    const messageId = await ctx.db.insert("iBoite_messages", {
      orgId: args.orgId,
      fromMembershipId: senderMembership._id,
      toMembershipId: args.toMembershipId,
      subject,
      body,
      attachments: args.attachments,
      sentAt: Date.now(),
      relatedItemKind: args.relatedItemKind,
      relatedItemId: args.relatedItemId,
    });

    return { messageId };
  },
});

/**
 * Liste les messages reçus par le membership courant dans une org,
 * en excluant ceux archivés par le destinataire.
 */
export const inbox = authQuery({
  args: {
    orgId: v.id("orgs"),
    includeArchived: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.iboite.view);
    if (!membership) return [];

    const limit = Math.max(1, Math.min(args.limit ?? 50, 200));

    const rows = await ctx.db
      .query("iBoite_messages")
      .withIndex("by_org_recipient", (q) =>
        q.eq("orgId", args.orgId).eq("toMembershipId", membership._id),
      )
      .order("desc")
      .take(limit * 2);

    const filtered = args.includeArchived
      ? rows
      : rows.filter((r) => r.archivedByRecipient !== true);

    return filtered.slice(0, limit);
  },
});

/**
 * Liste les messages envoyés par le membership courant dans une org,
 * en excluant ceux archivés côté expéditeur.
 */
export const sent = authQuery({
  args: {
    orgId: v.id("orgs"),
    includeArchived: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.iboite.view);
    if (!membership) return [];

    const limit = Math.max(1, Math.min(args.limit ?? 50, 200));

    const rows = await ctx.db
      .query("iBoite_messages")
      .withIndex("by_org_sender", (q) =>
        q.eq("orgId", args.orgId).eq("fromMembershipId", membership._id),
      )
      .order("desc")
      .take(limit * 2);

    const filtered = args.includeArchived
      ? rows
      : rows.filter((r) => r.archivedBySender !== true);

    return filtered.slice(0, limit);
  },
});

/**
 * Marque un message reçu comme lu. Le timestamp `readAt` est mis à jour
 * uniquement s'il était `undefined` (idempotent).
 */
export const markRead = authMutation({
  args: { messageId: v.id("iBoite_messages") },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw error(ErrorCode.NOT_FOUND, "Message introuvable.");
    }

    const membership = await getMembership(ctx, ctx.user._id, message.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.iboite.view);
    if (!membership || message.toMembershipId !== membership._id) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Seul le destinataire peut marquer ce message comme lu.",
      );
    }

    if (message.readAt == null) {
      await ctx.db.patch(args.messageId, { readAt: Date.now() });
    }
    return { messageId: args.messageId };
  },
});

/**
 * Accuse réception du message (acknowledge). Distinct de `markRead` : il
 * s'agit d'un acte volontaire qui sera visible côté expéditeur.
 */
export const acknowledge = authMutation({
  args: { messageId: v.id("iBoite_messages") },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw error(ErrorCode.NOT_FOUND, "Message introuvable.");
    }

    const membership = await getMembership(ctx, ctx.user._id, message.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.iboite.acknowledge);
    if (!membership || message.toMembershipId !== membership._id) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Seul le destinataire peut accuser réception.",
      );
    }

    const now = Date.now();
    await ctx.db.patch(args.messageId, {
      readAt: message.readAt ?? now,
      acknowledgedAt: message.acknowledgedAt ?? now,
    });

    return { messageId: args.messageId };
  },
});
