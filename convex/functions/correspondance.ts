/**
 * iCorrespondance — Convex Functions
 *
 * CRUD complet pour les dossiers, items et workflow
 * de correspondance diplomatique officielle.
 */

import { v } from "convex/values";
import { authMutation, authQuery } from "../lib/customFunctions";
import {
  correspondanceTypeValidator,
  correspondancePriorityValidator,
  correspondanceStatusValidator,
  correspondanceWorkflowStepTypeValidator,
} from "../schemas/correspondance";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a diplomatic reference number: DIPL/YYYY/TYPE/00042 */
function generateReference(type: string): string {
  const year = new Date().getFullYear();
  const code = type.substring(0, 3).toUpperCase();
  const n = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  return `DIPL/${year}/${code}/${n}`;
}

// ═════════════════════════════════════════════════════════════════════════════
// FOLDERS
// ═════════════════════════════════════════════════════════════════════════════

/** List all active folders for an org */
export const getFolders = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("correspondanceFolders")
      .withIndex("by_org_deleted", (q) =>
        q.eq("orgId", args.orgId).eq("deletedAt", undefined),
      )
      .collect();
  },
});

/** Create a new folder */
export const createFolder = authMutation({
  args: {
    orgId: v.id("orgs"),
    name: v.string(),
    parentFolderId: v.optional(v.id("correspondanceFolders")),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("correspondanceFolders", {
      orgId: args.orgId,
      createdBy: ctx.user._id,
      name: args.name,
      parentFolderId: args.parentFolderId,
      tags: args.tags ?? [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Rename a folder */
export const renameFolder = authMutation({
  args: {
    folderId: v.id("correspondanceFolders"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.folderId, {
      name: args.name,
      updatedAt: Date.now(),
    });
  },
});

/** Soft-delete a folder */
export const deleteFolder = authMutation({
  args: { folderId: v.id("correspondanceFolders") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.folderId, { deletedAt: Date.now() });
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// ITEMS
// ═════════════════════════════════════════════════════════════════════════════

/** List all active items for an org, optionally filtered by folder */
export const getItems = authQuery({
  args: {
    orgId: v.id("orgs"),
    folderId: v.optional(v.id("correspondanceFolders")),
  },
  handler: async (ctx, args) => {
    let items = await ctx.db
      .query("correspondanceItems")
      .withIndex("by_org_deleted", (q) =>
        q.eq("orgId", args.orgId).eq("deletedAt", undefined),
      )
      .collect();

    if (args.folderId !== undefined) {
      items = items.filter((i) => i.folderId === args.folderId);
    }

    // Attach storage URLs for attachments
    const itemsWithUrls = await Promise.all(
      items.map(async (item) => {
        const attachmentsWithUrls = await Promise.all(
          item.attachments.map(async (att) => ({
            ...att,
            url: await ctx.storage.getUrl(att.storageId),
          })),
        );
        return { ...item, attachments: attachmentsWithUrls };
      }),
    );

    return itemsWithUrls;
  },
});

/** Get a single item by ID */
export const getItem = authQuery({
  args: { itemId: v.id("correspondanceItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return null;

    const attachmentsWithUrls = await Promise.all(
      item.attachments.map(async (att) => ({
        ...att,
        url: await ctx.storage.getUrl(att.storageId),
      })),
    );

    return { ...item, attachments: attachmentsWithUrls };
  },
});

/** Create a new correspondence item */
export const createItem = authMutation({
  args: {
    orgId: v.id("orgs"),
    folderId: v.optional(v.id("correspondanceFolders")),
    title: v.string(),
    type: correspondanceTypeValidator,
    priority: correspondancePriorityValidator,
    senderName: v.string(),
    senderOrg: v.optional(v.string()),
    senderEmail: v.optional(v.string()),
    recipientName: v.string(),
    recipientOrg: v.optional(v.string()),
    recipientEmail: v.optional(v.string()),
    comment: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    requiresApproval: v.optional(v.boolean()),
    direction: v.optional(v.union(v.literal("incoming"), v.literal("outgoing"))),
    dateReponseAttendue: v.optional(v.number()),
    parentItemId: v.optional(v.id("correspondanceItems")),
    confidentialite: v.optional(v.union(
      v.literal("standard"),
      v.literal("confidentiel"),
      v.literal("secret"),
    )),
    // Linked sender/recipient IDs
    senderUserId: v.optional(v.id("users")),
    primaryRecipientId: v.optional(v.id("users")),
    primaryRecipientOrgId: v.optional(v.id("orgs")),
    ccRecipients: v.optional(v.array(v.object({
      userId: v.id("users"),
      orgId: v.id("orgs"),
      name: v.string(),
      email: v.optional(v.string()),
      positionTitle: v.optional(v.string()),
      orgName: v.string(),
    }))),
    attachments: v.optional(
      v.array(
        v.object({
          storageId: v.id("_storage"),
          filename: v.string(),
          mimeType: v.string(),
          sizeBytes: v.number(),
          uploadedAt: v.number(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const reference = generateReference(args.type);

    const itemId = await ctx.db.insert("correspondanceItems", {
      orgId: args.orgId,
      folderId: args.folderId,
      createdBy: ctx.user._id,
      reference,
      title: args.title,
      type: args.type,
      priority: args.priority,
      status: "draft",
      senderName: args.senderName,
      senderOrg: args.senderOrg,
      senderEmail: args.senderEmail,
      recipientName: args.recipientName,
      recipientOrg: args.recipientOrg,
      recipientEmail: args.recipientEmail,
      comment: args.comment,
      tags: args.tags ?? [],
      requiresApproval: args.requiresApproval ?? false,
      direction: args.direction ?? "outgoing",
      dateReponseAttendue: args.dateReponseAttendue,
      parentItemId: args.parentItemId,
      confidentialite: args.confidentialite ?? "standard",
      senderUserId: args.senderUserId,
      primaryRecipientId: args.primaryRecipientId,
      primaryRecipientOrgId: args.primaryRecipientOrgId,
      readByIds: [ctx.user._id as string],
      attachments: args.attachments ?? [],
      // Documents enrichis (convertis depuis attachments)
      documents: (args.attachments ?? []).map((att, i) => ({
        ...att,
        ordre: i + 1,
        isMainDocument: i === 0,
      })),
      // Mécanisme de copie — brouillon = original appartenant à l'org
      isCopy: false,
      copyOwnerOrgId: args.orgId,
      createdAt: now,
      updatedAt: now,
    });

    // Insert recipient records (junction table)
    if (args.primaryRecipientId) {
      await ctx.db.insert("correspondanceRecipients", {
        itemId,
        userId: args.primaryRecipientId,
        orgId: args.primaryRecipientOrgId ?? args.orgId,
        role: "primary",
        name: args.recipientName,
        email: args.recipientEmail,
        orgName: args.recipientOrg ?? "",
        createdAt: now,
      });
    }
    if (args.ccRecipients) {
      for (const cc of args.ccRecipients) {
        await ctx.db.insert("correspondanceRecipients", {
          itemId,
          userId: cc.userId,
          orgId: cc.orgId,
          role: "cc",
          name: cc.name,
          email: cc.email,
          positionTitle: cc.positionTitle,
          orgName: cc.orgName,
          createdAt: now,
        });
      }
    }

    // Log CREATED workflow step
    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId,
      stepType: "CREATED",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      isRead: true,
      createdAt: now,
    });

    return itemId;
  },
});

/** Update item metadata (title, folder, tags, comment, priority) */
export const updateItem = authMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    folderId: v.optional(v.id("correspondanceFolders")),
    title: v.optional(v.string()),
    priority: v.optional(correspondancePriorityValidator),
    comment: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { itemId, ...fields } = args;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (fields.folderId !== undefined) updates.folderId = fields.folderId;
    if (fields.title !== undefined) updates.title = fields.title;
    if (fields.priority !== undefined) updates.priority = fields.priority;
    if (fields.comment !== undefined) updates.comment = fields.comment;
    if (fields.tags !== undefined) updates.tags = fields.tags;
    await ctx.db.patch(itemId, updates as any);
  },
});

/** Update item status directly */
export const updateStatus = authMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    status: correspondanceStatusValidator,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.itemId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

/** Soft-delete an item */
export const deleteItem = authMutation({
  args: { itemId: v.id("correspondanceItems") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.itemId, { deletedAt: Date.now() });
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// ATTACHMENTS
// ═════════════════════════════════════════════════════════════════════════════

/** Generate a Convex storage upload URL */
export const generateUploadUrl = authMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/** Add an attachment to an existing item */
export const addAttachment = authMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    storageId: v.id("_storage"),
    filename: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");

    const attachment = {
      storageId: args.storageId,
      filename: args.filename,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      uploadedAt: Date.now(),
    };

    await ctx.db.patch(args.itemId, {
      attachments: [...item.attachments, attachment],
      updatedAt: Date.now(),
    });
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// WORKFLOW
// ═════════════════════════════════════════════════════════════════════════════

/** Get workflow history for an item */
export const getWorkflowHistory = authQuery({
  args: { itemId: v.id("correspondanceItems") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("correspondanceWorkflowSteps")
      .withIndex("by_item_created", (q) => q.eq("itemId", args.itemId))
      .order("asc")
      .collect();
  },
});

/** Submit for approval (status → pending, assign holder) */
export const submitForApproval = authMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    approverId: v.id("users"),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.itemId, {
      status: "pending",
      currentHolderId: args.approverId,
      requiresApproval: true,
      updatedAt: now,
    });

    const approver = await ctx.db.get(args.approverId);

    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: args.itemId,
      stepType: "SENT_FOR_APPROVAL",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      targetId: args.approverId,
      targetName: approver?.name ?? approver?.email,
      comment: args.comment ?? "Soumis pour approbation",
      isRead: false,
      createdAt: now,
    });
  },
});

/** Approve an item (holder approves → status = approved) */
export const approveItem = authMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");

    await ctx.db.patch(args.itemId, {
      status: "approved",
      approvedById: ctx.user._id,
      approvedAt: now,
      currentHolderId: item.createdBy,
      updatedAt: now,
    });

    const creator = await ctx.db.get(item.createdBy);

    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: args.itemId,
      stepType: "APPROVED",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      targetId: item.createdBy,
      targetName: creator?.name ?? creator?.email,
      comment: args.comment ?? "Approuvé",
      isRead: false,
      createdAt: now,
    });
  },
});

/** Reject an item with a reason */
export const rejectItem = authMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");

    await ctx.db.patch(args.itemId, {
      status: "draft",
      currentHolderId: item.createdBy,
      updatedAt: now,
    });

    const creator = await ctx.db.get(item.createdBy);

    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: args.itemId,
      stepType: "REJECTED",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      targetId: item.createdBy,
      targetName: creator?.name ?? creator?.email,
      comment: args.reason,
      isRead: false,
      createdAt: now,
    });
  },
});

/** Mark item as sent (email or internal) and log the step */
export const markAsSent = authMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    recipientEmail: v.optional(v.string()),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.itemId, {
      status: "sent",
      sentAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: args.itemId,
      stepType: "SENT_EMAIL",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      comment:
        args.comment ??
        (args.recipientEmail
          ? `Envoyé à ${args.recipientEmail}`
          : "Correspondance envoyée"),
      isRead: true,
      createdAt: now,
    });
  },
});

/** Archive an item */
export const archiveItem = authMutation({
  args: { itemId: v.id("correspondanceItems") },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.itemId, {
      status: "archived",
      updatedAt: now,
    });

    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: args.itemId,
      stepType: "ARCHIVED",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      isRead: true,
      createdAt: now,
    });
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// SENDER & RECIPIENTS
// ═════════════════════════════════════════════════════════════════════════════

/** Get current user's sender info (auto-fill for correspondance wizard) */
export const getCurrentUserSenderInfo = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org_deletedAt", (q: any) =>
        q
          .eq("userId", ctx.user._id)
          .eq("orgId", args.orgId)
          .eq("deletedAt", undefined),
      )
      .first();

    let positionTitle: { fr: string; en?: string } | undefined;
    if (membership?.positionId) {
      const position = (await ctx.db.get(membership.positionId)) as any;
      positionTitle = position?.title;
    }

    return {
      userId: ctx.user._id,
      name: ctx.user.name ?? ctx.user.email,
      email: ctx.user.email,
      orgName: org?.name ?? "",
      positionTitle,
    };
  },
});

/** List all available recipients across orgs with the correspondance module */
export const listAvailableRecipients = authQuery({
  args: {},
  handler: async (ctx) => {
    // Get all active orgs
    const allOrgs = await ctx.db
      .query("orgs")
      .filter((q: any) =>
        q.and(
          q.eq(q.field("isActive"), true),
          q.eq(q.field("deletedAt"), undefined),
        ),
      )
      .collect();

    // Filter orgs with correspondance module
    const corrOrgs = allOrgs.filter(
      (org: any) =>
        org.modules?.includes("correspondance") || true, // fallback: include all active orgs
    );

    // For each org, get members with positions
    const result = await Promise.all(
      corrOrgs.map(async (org: any) => {
        const memberships = await ctx.db
          .query("memberships")
          .withIndex("by_org_deletedAt", (q: any) =>
            q.eq("orgId", org._id).eq("deletedAt", undefined),
          )
          .collect();

        const members = (
          await Promise.all(
            memberships.map(async (m: any) => {
              if (m.userId === ctx.user._id) return null; // exclude self
              const user = (await ctx.db.get(m.userId)) as any;
              if (!user || !user.isActive) return null;

              let positionTitle: string | undefined;
              if (m.positionId) {
                const position = (await ctx.db.get(m.positionId)) as any;
                positionTitle = position?.title?.fr;
              }

              return {
                userId: user._id as string,
                name: user.name ?? user.email,
                email: user.email,
                positionTitle,
                avatarUrl: user.avatarUrl,
              };
            }),
          )
        ).filter(Boolean);

        return {
          orgId: org._id as string,
          orgName: org.name as string,
          orgType: org.type as string,
          members,
        };
      }),
    );

    return result.filter((g) => g.members.length > 0);
  },
});

/** Get recipients for a correspondance item */
export const getItemRecipients = authQuery({
  args: { itemId: v.id("correspondanceItems") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("correspondanceRecipients")
      .withIndex("by_item", (q: any) => q.eq("itemId", args.itemId))
      .collect();
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// ENHANCED QUERIES (register, deadlines, threads, search)
// ═════════════════════════════════════════════════════════════════════════════

/** Get items by direction (register view: incoming/outgoing) */
export const getItemsByDirection = authQuery({
  args: {
    orgId: v.id("orgs"),
    direction: v.union(v.literal("incoming"), v.literal("outgoing")),
  },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("correspondanceItems")
      .withIndex("by_org_direction", (q) =>
        q.eq("orgId", args.orgId).eq("direction", args.direction),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .order("desc")
      .collect();

    return items;
  },
});

/** Get overdue items (past deadline, not sent/archived) */
export const getOverdueItems = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const items = await ctx.db
      .query("correspondanceItems")
      .withIndex("by_org_deleted", (q) =>
        q.eq("orgId", args.orgId).eq("deletedAt", undefined),
      )
      .collect();

    return items.filter(
      (i) =>
        i.dateReponseAttendue &&
        i.dateReponseAttendue < now &&
        !["sent", "archived"].includes(i.status),
    );
  },
});

/** Get thread replies for a parent item */
export const getThreadReplies = authQuery({
  args: { parentItemId: v.id("correspondanceItems") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("correspondanceItems")
      .withIndex("by_parent", (q) => q.eq("parentItemId", args.parentItemId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .order("asc")
      .collect();
  },
});

/** Mark an item as read by current user */
export const markAsRead = authMutation({
  args: { itemId: v.id("correspondanceItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return;

    const userId = ctx.user._id as string;
    const readByIds = item.readByIds ?? [];

    if (!readByIds.includes(userId)) {
      await ctx.db.patch(args.itemId, {
        readByIds: [...readByIds, userId],
      });
    }
  },
});

/** Search items by text (uses search index) */
export const searchItems = authQuery({
  args: {
    orgId: v.id("orgs"),
    searchText: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.searchText.trim()) return [];

    const results = await ctx.db
      .query("correspondanceItems")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.searchText).eq("orgId", args.orgId),
      )
      .collect();

    return results.filter((i) => !i.deletedAt);
  },
});

/** Count items pending approval for current user (badge) */
export const getPendingApprovalCount = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("correspondanceItems")
      .withIndex("by_holder", (q) => q.eq("currentHolderId", ctx.user._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("orgId"), args.orgId),
          q.eq(q.field("deletedAt"), undefined),
        ),
      )
      .collect();

    return pending.length;
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// ENVOI — Mécanisme de copie (Phase 1 refonte)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Envoyer une correspondance — crée l'original chez le destinataire
 * et transforme l'item source en copie chez l'expéditeur.
 *
 * C'est le cœur du modèle "correspondance mobile" :
 * l'original se déplace, l'expéditeur conserve une copie.
 */
export const sendCorrespondance = authMutation({
  args: {
    itemId: v.id("correspondanceItems"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Correspondance introuvable");
    if (item.deletedAt) throw new Error("Correspondance supprimée");

    // Vérifier le status — seuls draft et approved peuvent être envoyés
    if (item.status !== "draft" && item.status !== "approved") {
      throw new Error(`Impossible d'envoyer une correspondance en statut "${item.status}"`);
    }

    // Vérifier que l'expéditeur est le créateur ou a approuvé
    if (item.createdBy !== ctx.user._id && item.approvedById !== ctx.user._id) {
      throw new Error("Seul le créateur ou l'approbateur peut envoyer");
    }

    // Vérifier qu'il y a un destinataire
    if (!item.primaryRecipientOrgId) {
      throw new Error("Aucune organisation destinataire définie");
    }

    // ── Étape 1 : Créer l'item REÇU chez le destinataire ──
    const receivedItemId = await ctx.db.insert("correspondanceItems", {
      orgId: item.primaryRecipientOrgId,
      copyOwnerOrgId: item.primaryRecipientOrgId,
      isCopy: false,
      createdBy: item.createdBy,
      reference: item.reference,
      title: item.title,
      type: item.type,
      priority: item.priority,
      status: "received",
      direction: "incoming",
      senderName: item.senderName,
      senderOrg: item.senderOrg,
      senderEmail: item.senderEmail,
      senderUserId: item.senderUserId,
      recipientName: item.recipientName,
      recipientOrg: item.recipientOrg,
      recipientEmail: item.recipientEmail,
      primaryRecipientId: item.primaryRecipientId,
      primaryRecipientOrgId: item.primaryRecipientOrgId,
      comment: item.comment,
      tags: item.tags,
      requiresApproval: false,
      attachments: item.attachments,
      // Documents enrichis (copie vers le destinataire, sans filigrane)
      documents: (item.documents ?? []).map((d) => ({ ...d, copyWatermark: false })),
      confidentialite: item.confidentialite,
      parentItemId: item.parentItemId,
      dateReponseAttendue: item.dateReponseAttendue,
      recipientStatus: "recu",
      recipientStatusUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // ── Étape 2 : Transformer l'item source en COPIE expéditeur ──
    // Marquer les documents avec copyWatermark: true
    const copyDocuments = (item.documents ?? []).map((d) => ({
      ...d,
      copyWatermark: true,
    }));

    await ctx.db.patch(args.itemId, {
      isCopy: true,
      copyOwnerOrgId: item.orgId,
      originalItemId: receivedItemId,
      status: "sent",
      sentAt: now,
      recipientStatus: "recu",
      recipientStatusUpdatedAt: now,
      documents: copyDocuments,
      updatedAt: now,
    });

    // ── Étape 3 : Log workflow ──
    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: args.itemId,
      stepType: "SENT_EMAIL",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      comment: `Correspondance envoyée à ${item.recipientOrg ?? item.recipientName}`,
      isRead: true,
      createdAt: now,
    });

    // Dupliquer les recipients pour l'item reçu
    const recipients = await ctx.db
      .query("correspondanceRecipients")
      .withIndex("by_item", (q) => q.eq("itemId", args.itemId))
      .collect();

    for (const r of recipients) {
      await ctx.db.insert("correspondanceRecipients", {
        itemId: receivedItemId,
        userId: r.userId,
        orgId: r.orgId,
        role: r.role,
        name: r.name,
        email: r.email,
        positionTitle: r.positionTitle,
        orgName: r.orgName,
        createdAt: now,
      });
    }

    return { sentItemId: args.itemId, receivedItemId };
  },
});

/**
 * Synchroniser le recipientStatus d'une copie expéditeur
 * quand le destinataire prend une action sur l'original.
 */
export const syncRecipientStatus = authMutation({
  args: {
    originalItemId: v.id("correspondanceItems"),
    newStatus: v.union(
      v.literal("en_transit"),
      v.literal("recu"),
      v.literal("en_attente"),
      v.literal("approuve"),
      v.literal("repondu"),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Trouver la copie de l'expéditeur via l'index by_original
    const copies = await ctx.db
      .query("correspondanceItems")
      .withIndex("by_original", (q) =>
        q.eq("originalItemId", args.originalItemId),
      )
      .collect();

    for (const copy of copies) {
      if (copy.isCopy) {
        await ctx.db.patch(copy._id, {
          recipientStatus: args.newStatus,
          recipientStatusUpdatedAt: now,
          updatedAt: now,
        });
      }
    }
  },
});

/**
 * Enregistrer la réception d'une correspondance entrante
 * (attribue un numéro d'arrivée et met à jour le suivi)
 */
export const registerIncoming = authMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    arrivalReference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Correspondance introuvable");
    if (item.status !== "received") {
      throw new Error("Seule une correspondance reçue peut être enregistrée");
    }

    await ctx.db.patch(args.itemId, {
      arrivalReference: args.arrivalReference ?? `ARR/${new Date().getFullYear()}/${Math.floor(Math.random() * 100000).toString().padStart(5, "0")}`,
      arrivalDate: now,
      recipientStatus: "recu",
      recipientStatusUpdatedAt: now,
      updatedAt: now,
    });

    // Synchroniser le recipientStatus vers la copie expéditeur
    // (chercher les copies qui pointent vers cet item)
    const copies = await ctx.db
      .query("correspondanceItems")
      .withIndex("by_original", (q) => q.eq("originalItemId", args.itemId))
      .collect();
    for (const copy of copies) {
      if (copy.isCopy) {
        await ctx.db.patch(copy._id, {
          recipientStatus: "recu",
          recipientStatusUpdatedAt: now,
          updatedAt: now,
        });
      }
    }

    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: args.itemId,
      stepType: "VIEWED",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      comment: "Correspondance enregistrée à l'arrivée",
      isRead: true,
      createdAt: now,
    });
  },
});

/**
 * Assigner une correspondance entrante à un agent traitant
 */
export const assignCorrespondance = authMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    assignedToId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Correspondance introuvable");

    const assignee = await ctx.db.get(args.assignedToId);

    await ctx.db.patch(args.itemId, {
      assignedToId: args.assignedToId,
      recipientStatus: "en_attente",
      recipientStatusUpdatedAt: now,
      updatedAt: now,
    });

    // Synchroniser vers la copie expéditeur
    const copies = await ctx.db
      .query("correspondanceItems")
      .withIndex("by_original", (q) => q.eq("originalItemId", args.itemId))
      .collect();
    for (const copy of copies) {
      if (copy.isCopy) {
        await ctx.db.patch(copy._id, {
          recipientStatus: "en_attente",
          recipientStatusUpdatedAt: now,
          updatedAt: now,
        });
      }
    }

    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: args.itemId,
      stepType: "RETURNED_TO_AGENT",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      targetId: args.assignedToId,
      targetName: assignee?.name ?? assignee?.email ?? "Agent",
      comment: `Assigné à ${assignee?.name ?? assignee?.email ?? "un agent"}`,
      isRead: false,
      createdAt: now,
    });
  },
});

/**
 * Répondre à une correspondance reçue.
 * Crée une nouvelle correspondance liée (parentItemId) et met à jour
 * le recipientStatus → "repondu" sur la copie de l'expéditeur original.
 */
export const respondToCorrespondance = authMutation({
  args: {
    originalItemId: v.id("correspondanceItems"),
    title: v.string(),
    comment: v.optional(v.string()),
    attachments: v.optional(v.array(v.object({
      storageId: v.id("_storage"),
      filename: v.string(),
      mimeType: v.string(),
      sizeBytes: v.number(),
      uploadedAt: v.number(),
    }))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const original = await ctx.db.get(args.originalItemId);
    if (!original) throw new Error("Correspondance originale introuvable");

    // Créer la réponse (nouvelle correspondance sortante liée)
    const reference = generateReference(original.type);
    const responseItemId = await ctx.db.insert("correspondanceItems", {
      orgId: original.orgId,
      copyOwnerOrgId: original.copyOwnerOrgId ?? original.orgId,
      isCopy: false,
      createdBy: ctx.user._id,
      reference,
      title: args.title,
      type: original.type,
      priority: original.priority,
      status: "draft",
      direction: "outgoing",
      // Inverser expéditeur/destinataire
      senderName: original.recipientName,
      senderOrg: original.recipientOrg,
      senderEmail: original.recipientEmail,
      senderUserId: ctx.user._id,
      recipientName: original.senderName,
      recipientOrg: original.senderOrg,
      recipientEmail: original.senderEmail,
      primaryRecipientId: original.senderUserId,
      primaryRecipientOrgId: original.orgId !== original.copyOwnerOrgId
        ? original.orgId : undefined,
      comment: args.comment,
      tags: ["réponse", ...original.tags.filter((t) => t !== "réponse")],
      requiresApproval: false,
      attachments: args.attachments ?? [],
      confidentialite: original.confidentialite,
      parentItemId: args.originalItemId,
      readByIds: [ctx.user._id as string],
      createdAt: now,
      updatedAt: now,
    });

    // Mettre à jour le recipientStatus de l'original → "repondu"
    await ctx.db.patch(args.originalItemId, {
      recipientStatus: "repondu",
      recipientStatusUpdatedAt: now,
      updatedAt: now,
    });

    // Synchroniser vers la copie de l'expéditeur original
    const copies = await ctx.db
      .query("correspondanceItems")
      .withIndex("by_original", (q) => q.eq("originalItemId", args.originalItemId))
      .collect();
    for (const copy of copies) {
      if (copy.isCopy) {
        await ctx.db.patch(copy._id, {
          recipientStatus: "repondu",
          recipientStatusUpdatedAt: now,
          updatedAt: now,
        });
      }
    }

    // Log workflow
    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: args.originalItemId,
      stepType: "TRANSMITTED",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      comment: `Réponse créée : ${args.title}`,
      isRead: true,
      createdAt: now,
    });

    return { responseItemId };
  },
});

/**
 * Résoudre la chaîne d'approbation pour un item donné.
 * Utilise le typeConfig de l'org et la hiérarchie des positions.
 */
export const resolveApprovalChain = authQuery({
  args: {
    orgId: v.id("orgs"),
    typeCode: v.string(),
  },
  handler: async (ctx, args) => {
    // Chercher le typeConfig pour cette org
    const typeConfig = await ctx.db
      .query("correspondanceTypeConfigs")
      .withIndex("by_org_type", (q) =>
        q.eq("orgId", args.orgId).eq("typeCode", args.typeCode),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .first();

    if (!typeConfig) {
      return { requiresApproval: false, chain: [], autoRoute: false };
    }

    const { workflowConfig } = typeConfig;

    if (!workflowConfig.requiresApproval) {
      return { requiresApproval: false, chain: [], autoRoute: false };
    }

    // Si autoRouteByHierarchy, construire la chaîne automatiquement
    if (workflowConfig.autoRouteByHierarchy) {
      // Trouver le membership de l'utilisateur courant
      const membership = await ctx.db
        .query("memberships")
        .withIndex("by_user_org_deletedAt", (q: any) =>
          q.eq("userId", ctx.user._id).eq("orgId", args.orgId).eq("deletedAt", undefined),
        )
        .first();

      if (!membership || !membership.positionId) {
        return { requiresApproval: true, chain: workflowConfig.approvalChain, autoRoute: true };
      }

      const position = await ctx.db.get(membership.positionId);
      const userGrade = (position as any)?.grade ?? "agent";

      // Trouver les positions supérieures dans l'org
      const allPositions = await ctx.db
        .query("positions")
        .withIndex("by_org", (q: any) => q.eq("orgId", args.orgId).eq("isActive", true))
        .collect();

      const gradeOrder = ["external", "agent", "counselor", "deputy_chief", "chief"];
      const userGradeIndex = gradeOrder.indexOf(userGrade);

      // Trouver les supérieurs hiérarchiques
      const superiors = allPositions
        .filter((p: any) => {
          const pGradeIndex = gradeOrder.indexOf(p.grade ?? "agent");
          return pGradeIndex > userGradeIndex && p.grade !== userGrade;
        })
        .sort((a: any, b: any) => {
          const aIdx = gradeOrder.indexOf(a.grade ?? "agent");
          const bIdx = gradeOrder.indexOf(b.grade ?? "agent");
          return aIdx - bIdx; // Du plus proche au plus haut
        });

      // Trouver les occupants de ces positions
      const chain: Array<{
        ordre: number;
        approverId: string;
        approverName: string;
        approverRole: string;
        positionTitle: string;
      }> = [];

      for (let i = 0; i < superiors.length; i++) {
        const sup = superiors[i] as any;
        // Trouver le membre qui occupe cette position
        const occupant = await ctx.db
          .query("memberships")
          .withIndex("by_user_org_deletedAt", (q: any) =>
            q.eq("orgId", args.orgId),
          )
          .filter((q: any) =>
            q.and(
              q.eq(q.field("positionId"), sup._id),
              q.eq(q.field("deletedAt"), undefined),
            ),
          )
          .first();

        if (occupant) {
          const user = await ctx.db.get(occupant.userId);
          chain.push({
            ordre: i + 1,
            approverId: occupant.userId as string,
            approverName: user?.name ?? user?.email ?? "Supérieur",
            approverRole: sup.grade ?? "agent",
            positionTitle: sup.title?.fr ?? sup.code,
          });
        }
      }

      return { requiresApproval: true, chain, autoRoute: true };
    }

    // Sinon utiliser la chaîne statique définie dans le config
    return {
      requiresApproval: true,
      chain: workflowConfig.approvalChain,
      autoRoute: false,
    };
  },
});

/**
 * Soumettre pour approbation avec chaîne multi-niveaux.
 * Crée les ApprovalSteps et route vers le premier approbateur.
 */
export const submitForChainApproval = authMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    approvalChain: v.array(v.object({
      ordre: v.number(),
      approverId: v.id("users"),
      approverName: v.optional(v.string()),
      approverRole: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Correspondance introuvable");
    if (item.status !== "draft") throw new Error("Seul un brouillon peut être soumis");
    if (args.approvalChain.length === 0) throw new Error("La chaîne d'approbation est vide");

    // Créer les étapes d'approbation
    for (const step of args.approvalChain) {
      await ctx.db.insert("correspondanceApprovalSteps", {
        itemId: args.itemId,
        ordre: step.ordre,
        approverId: step.approverId,
        approverName: step.approverName,
        approverRole: step.approverRole,
        status: step.ordre === 1 ? "pending" : "pending",
        createdAt: now,
      });
    }

    // Mettre à jour l'item
    const firstApprover = args.approvalChain[0];
    await ctx.db.patch(args.itemId, {
      status: "pending",
      requiresApproval: true,
      currentHolderId: firstApprover.approverId,
      updatedAt: now,
    });

    // Log workflow
    const firstUser = await ctx.db.get(firstApprover.approverId);
    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: args.itemId,
      stepType: "SENT_FOR_APPROVAL",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      targetId: firstApprover.approverId,
      targetName: firstUser?.name ?? firstUser?.email ?? "Approbateur",
      comment: `Soumis pour approbation (${args.approvalChain.length} étape${args.approvalChain.length > 1 ? "s" : ""})`,
      isRead: false,
      createdAt: now,
    });
  },
});

/**
 * Approuver à une étape de la chaîne.
 * Si c'est la dernière étape, envoie automatiquement la correspondance.
 */
export const approveChainStep = authMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Correspondance introuvable");
    if (item.status !== "pending") throw new Error("Cette correspondance n'est pas en attente d'approbation");

    // Trouver l'étape courante de l'utilisateur
    const steps = await ctx.db
      .query("correspondanceApprovalSteps")
      .withIndex("by_item", (q) => q.eq("itemId", args.itemId))
      .collect();

    const myStep = steps.find(
      (s) => s.approverId === ctx.user._id && s.status === "pending",
    );

    if (!myStep) throw new Error("Vous n'avez pas d'étape d'approbation en attente");

    // Approuver l'étape courante
    await ctx.db.patch(myStep._id, {
      status: "approved",
      comment: args.comment,
      decidedAt: now,
    });

    // Log
    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: args.itemId,
      stepType: "APPROVED",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      comment: args.comment ?? "Approuvé",
      isRead: true,
      createdAt: now,
    });

    // Trouver l'étape suivante
    const sortedSteps = steps.sort((a, b) => a.ordre - b.ordre);
    const myIndex = sortedSteps.findIndex((s) => s._id === myStep._id);
    const nextStep = sortedSteps[myIndex + 1];

    if (nextStep) {
      // Passer au prochain approbateur
      await ctx.db.patch(args.itemId, {
        currentHolderId: nextStep.approverId,
        approvedById: ctx.user._id,
        approvedAt: now,
        updatedAt: now,
      });
    } else {
      // Dernière étape — marquer comme approuvé
      await ctx.db.patch(args.itemId, {
        status: "approved",
        approvedById: ctx.user._id,
        approvedAt: now,
        currentHolderId: item.createdBy,
        updatedAt: now,
      });
    }
  },
});

/**
 * Rejeter à une étape de la chaîne.
 * Retourne le brouillon au créateur.
 */
export const rejectChainStep = authMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Correspondance introuvable");

    // Trouver l'étape courante
    const myStep = await ctx.db
      .query("correspondanceApprovalSteps")
      .withIndex("by_approver_status", (q) =>
        q.eq("approverId", ctx.user._id).eq("status", "pending"),
      )
      .first();

    if (!myStep || myStep.itemId !== args.itemId) {
      throw new Error("Vous n'avez pas d'étape d'approbation en attente pour cette correspondance");
    }

    // Rejeter
    await ctx.db.patch(myStep._id, {
      status: "rejected",
      comment: args.reason,
      decidedAt: now,
    });

    // Retourner au créateur
    await ctx.db.patch(args.itemId, {
      status: "draft",
      currentHolderId: item.createdBy,
      updatedAt: now,
    });

    // Log
    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: args.itemId,
      stepType: "REJECTED",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      comment: args.reason,
      isRead: false,
      createdAt: now,
    });
  },
});

/** Obtenir les étapes d'approbation d'un item */
export const getApprovalSteps = authQuery({
  args: { itemId: v.id("correspondanceItems") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("correspondanceApprovalSteps")
      .withIndex("by_item", (q) => q.eq("itemId", args.itemId))
      .collect();
  },
});
