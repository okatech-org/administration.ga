/**
 * iCorrespondance — CRUD de base
 *
 * Les fonctions métier (envoi, espaces, approbation hiérarchique, réception)
 * sont dans `correspondanceCore.ts`. Ce fichier contient uniquement le CRUD :
 * - Dossiers (folders) : create/rename/delete/get
 * - Items : create/update/delete/restore/getItem(s)/updateStatus/archive
 * - Upload : generateUploadUrl
 * - Workflow : getWorkflowHistory
 * - Expéditeur/Destinataires : getCurrentUserSenderInfo, listAvailableRecipients
 * - Recherche : searchItems
 */

import { v } from "convex/values";
import { authMutation, authQuery } from "../lib/customFunctions";
import {
  correspondanceTypeValidator,
  correspondancePriorityValidator,
  correspondanceStatusValidator,
  correspondanceWorkflowStepTypeValidator,
} from "../schemas/correspondance";
import {
  requireCorrespondanceAccess,
  generateSequentialReference,
  assertValidTransition,
} from "../lib/correspondanceHelpers";
import { getMembership } from "../lib/auth";
import { assertCanDoTask, isSuperAdmin } from "../lib/permissions";
import { TaskCode } from "../lib/taskCodes";
import { error, ErrorCode } from "../lib/errors";

// ═════════════════════════════════════════════════════════════════════════════
// FOLDERS
// ═════════════════════════════════════════════════════════════════════════════

/** List all active folders for an org */
export const getFolders = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    await requireCorrespondanceAccess(ctx, ctx.user, args.orgId, "view");
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
    await requireCorrespondanceAccess(ctx, ctx.user, args.orgId, "create");
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
    const folder = await ctx.db.get(args.folderId);
    if (!folder) throw error(ErrorCode.NOT_FOUND, "Dossier introuvable");
    await requireCorrespondanceAccess(ctx, ctx.user, folder.orgId, "create");
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
    const folder = await ctx.db.get(args.folderId);
    if (!folder) throw error(ErrorCode.NOT_FOUND, "Dossier introuvable");
    await requireCorrespondanceAccess(ctx, ctx.user, folder.orgId, "create");
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
    await requireCorrespondanceAccess(ctx, ctx.user, args.orgId, "view");
    let items = await ctx.db
      .query("correspondanceItems")
      .withIndex("by_org_deleted", (q) =>
        q.eq("orgId", args.orgId).eq("deletedAt", undefined),
      )
      .collect();

    if (args.folderId !== undefined) {
      items = items.filter((i) => i.folderId === args.folderId);
    }

    // Enrichir avec les URLs de storage des documents
    const itemsWithUrls = await Promise.all(
      items.map(async (item) => {
        const documentsWithUrls = await Promise.all(
          (item.documents ?? []).map(async (doc) => ({
            ...doc,
            url: await ctx.storage.getUrl(doc.storageId),
          })),
        );
        return { ...item, documents: documentsWithUrls };
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

    // Vérifier l'accès à l'org propriétaire
    const orgId = item.copyOwnerOrgId ?? item.orgId;
    await requireCorrespondanceAccess(ctx, ctx.user, orgId, "view");

    const documentsWithUrls = await Promise.all(
      (item.documents ?? []).map(async (doc) => ({
        ...doc,
        url: await ctx.storage.getUrl(doc.storageId),
      })),
    );

    return { ...item, documents: documentsWithUrls };
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
    documents: v.optional(
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
    await requireCorrespondanceAccess(ctx, ctx.user, args.orgId, "create");
    const now = Date.now();
    const reference = await generateSequentialReference(ctx, args.type);

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
      documents: (args.documents ?? []).map((doc, i) => ({
        ...doc,
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
    const item = await ctx.db.get(args.itemId);
    if (!item) throw error(ErrorCode.NOT_FOUND, "Correspondance introuvable");
    const orgId = item.copyOwnerOrgId ?? item.orgId;
    await requireCorrespondanceAccess(ctx, ctx.user, orgId, "create");

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

/**
 * Update item status with transition validation, access control, and audit trail.
 *
 * Seuls les utilisateurs avec la permission correspondance.admin ou le
 * currentHolder du dossier peuvent changer le statut, et uniquement
 * vers les statuts autorisés par la matrice de transitions.
 */
export const updateStatus = authMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    status: correspondanceStatusValidator,
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const item = await ctx.db.get(args.itemId);
    if (!item) throw error(ErrorCode.NOT_FOUND, "Correspondance introuvable");

    // Contrôle d'accès : membership dans l'org
    const orgId = item.copyOwnerOrgId ?? item.orgId;
    await requireCorrespondanceAccess(ctx, ctx.user, orgId, "admin");

    // Valider la transition
    assertValidTransition(item.status, args.status);

    // Appliquer la transition
    await ctx.db.patch(args.itemId, {
      status: args.status,
      updatedAt: now,
    });

    // Trace d'audit
    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: args.itemId,
      stepType: args.status === "archived" ? "ARCHIVED" : "VIEWED",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      comment: args.comment ?? `Statut changé manuellement : ${item.status} → ${args.status}`,
      isRead: true,
      createdAt: now,
    });
  },
});

/** Soft-delete an item */
export const deleteItem = authMutation({
  args: { itemId: v.id("correspondanceItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw error(ErrorCode.NOT_FOUND, "Correspondance introuvable");
    const orgId = item.copyOwnerOrgId ?? item.orgId;
    await requireCorrespondanceAccess(ctx, ctx.user, orgId, "create");
    await ctx.db.patch(args.itemId, { deletedAt: Date.now() });
  },
});

/** Restore an item from trash (undo soft-delete) */
export const restoreFromTrash = authMutation({
  args: { itemId: v.id("correspondanceItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw error(ErrorCode.NOT_FOUND, "Correspondance introuvable");
    if (!item.deletedAt) throw error(ErrorCode.VALIDATION_ERROR, "Cet élément n'est pas dans la corbeille");
    const orgId = item.copyOwnerOrgId ?? item.orgId;
    await requireCorrespondanceAccess(ctx, ctx.user, orgId, "create");

    await ctx.db.patch(args.itemId, {
      deletedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// ATTACHMENTS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Limites d'upload — dupliquées côté client (AttachmentUploader.tsx) pour
 * feedback immédiat et ici pour defense-in-depth. Un client malveillant
 * qui contourne la validation JS ne peut pas attacher un fichier de 500 Mo
 * ou un .exe au meeting.
 */
const MAX_ATTACHMENT_SIZE_BYTES = 50 * 1024 * 1024; // 50 Mo
const ALLOWED_ATTACHMENT_MIME_TYPES = new Set<string>([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

/** Generate a Convex storage upload URL */
export const generateUploadUrl = authMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// WORKFLOW
// ═════════════════════════════════════════════════════════════════════════════

/** Get workflow history for an item */
export const getWorkflowHistory = authQuery({
  args: { itemId: v.id("correspondanceItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return [];
    const orgId = item.copyOwnerOrgId ?? item.orgId;
    await requireCorrespondanceAccess(ctx, ctx.user, orgId, "view");

    return await ctx.db
      .query("correspondanceWorkflowSteps")
      .withIndex("by_item_created", (q) => q.eq("itemId", args.itemId))
      .order("asc")
      .collect();
  },
});

/** Archive an item */
export const archiveItem = authMutation({
  args: { itemId: v.id("correspondanceItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw error(ErrorCode.NOT_FOUND, "Correspondance introuvable");
    const orgId = item.copyOwnerOrgId ?? item.orgId;
    await requireCorrespondanceAccess(ctx, ctx.user, orgId, "transmit");
    assertValidTransition(item.status, "archived");
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
    await requireCorrespondanceAccess(ctx, ctx.user, args.orgId, "view");
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
// ═════════════════════════════════════════════════════════════════════════════
// SEARCH
// ═════════════════════════════════════════════════════════════════════════════

/** Search items by text (uses search index) */
export const searchItems = authQuery({
  args: {
    orgId: v.id("orgs"),
    searchText: v.string(),
  },
  handler: async (ctx, args) => {
    await requireCorrespondanceAccess(ctx, ctx.user, args.orgId, "view");
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

