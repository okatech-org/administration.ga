/**
 * Archive Functions (iArchive)
 *
 * Gestion de l'archivage des documents : archiver, restaurer,
 * supprimer definitivement, politiques de retention, audit.
 */

import { v } from "convex/values";
import { authQuery, authMutation } from "../lib/customFunctions";
import { error, ErrorCode } from "../lib/errors";
import {
  ARCHIVE_CATEGORY_MAP,
  computeRetentionExpiry,
  getArchiveStatus,
} from "../lib/archiveHelpers";
import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

export async function logAudit(
  ctx: MutationCtx,
  args: {
    orgId: Id<"orgs">;
    documentId?: Id<"documents">;
    folderId?: Id<"documentFolders">;
    action: string;
    actorId: Id<"users">;
    actorName?: string;
    detail?: unknown;
  },
) {
  await ctx.db.insert("archiveAuditLog", {
    orgId: args.orgId,
    documentId: args.documentId,
    folderId: args.folderId,
    action: args.action,
    actorId: args.actorId,
    actorName: args.actorName,
    detail: args.detail,
    createdAt: Date.now(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lister les documents archives d'une organisation.
 * Filtre : archivedAt defini ET deletedAt non defini.
 */
export const listArchivedDocuments = authQuery({
  args: {
    orgId: v.id("orgs"),
    categorySlug: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_owner_and_archivedAt", (q) => q.eq("ownerId", args.orgId))
      .collect();

    // Filtrer : archive et non supprime
    let results = docs.filter(
      (d) => d.archivedAt !== undefined && d.deletedAt === undefined,
    );

    if (args.categorySlug) {
      results = results.filter((d) => d.archiveCategorySlug === args.categorySlug);
    }

    if (args.search) {
      const q = args.search.toLowerCase();
      results = results.filter(
        (d) =>
          d.label?.toLowerCase().includes(q) ||
          d.files.some((f) => f.filename.toLowerCase().includes(q)),
      );
    }

    // Enrichir avec URLs et statut archive
    const enriched = await Promise.all(
      results.map(async (doc) => {
        const filesWithUrls = await Promise.all(
          doc.files.map(async (file) => ({
            ...file,
            url: await ctx.storage.getUrl(file.storageId),
          })),
        );
        return {
          ...doc,
          files: filesWithUrls,
          archiveStatus: getArchiveStatus(doc.retentionExpiresAt),
        };
      }),
    );

    return enriched;
  },
});

/**
 * Statistiques d'archive pour une organisation.
 */
export const getArchiveStats = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_owner_and_archivedAt", (q) => q.eq("ownerId", args.orgId))
      .collect();

    const archived = docs.filter(
      (d) => d.archivedAt !== undefined && d.deletedAt === undefined,
    );

    const byCategory: Record<string, number> = {};
    let active = 0;
    let expiring = 0;
    let expired = 0;
    let perpetual = 0;

    for (const doc of archived) {
      const cat = doc.archiveCategorySlug ?? "non-classe";
      byCategory[cat] = (byCategory[cat] ?? 0) + 1;

      const status = getArchiveStatus(doc.retentionExpiresAt);
      if (status === "active") active++;
      else if (status === "expiring") expiring++;
      else if (status === "expired") expired++;
      else perpetual++;
    }

    return {
      total: archived.length,
      active,
      expiring,
      expired,
      perpetual,
      byCategory,
    };
  },
});

/**
 * Lister les politiques d'archivage d'une organisation.
 */
export const getArchivePolicies = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("archivePolicies")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

/**
 * Journal d'audit des operations d'archivage.
 */
export const getArchiveAuditLog = authQuery({
  args: {
    orgId: v.id("orgs"),
    documentId: v.optional(v.id("documents")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.documentId) {
      return await ctx.db
        .query("archiveAuditLog")
        .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
        .order("desc")
        .take(args.limit ?? 50);
    }
    return await ctx.db
      .query("archiveAuditLog")
      .withIndex("by_org_and_createdAt", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

/**
 * Timeline de retention — documents tries par date d'expiration.
 */
export const getRetentionTimeline = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_owner_and_archivedAt", (q) => q.eq("ownerId", args.orgId))
      .collect();

    return docs
      .filter(
        (d) =>
          d.archivedAt !== undefined &&
          d.deletedAt === undefined &&
          d.retentionExpiresAt !== undefined,
      )
      .sort((a, b) => (a.retentionExpiresAt ?? 0) - (b.retentionExpiresAt ?? 0))
      .map((doc) => ({
        _id: doc._id,
        label: doc.label ?? doc.files[0]?.filename ?? "Sans titre",
        archiveCategorySlug: doc.archiveCategorySlug,
        retentionExpiresAt: doc.retentionExpiresAt!,
        archiveStatus: getArchiveStatus(doc.retentionExpiresAt),
      }));
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Archiver un document.
 */
export const archiveDocument = authMutation({
  args: {
    documentId: v.id("documents"),
    categorySlug: v.string(),
    confidentiality: v.optional(v.string()),
    note: v.optional(v.string()),
    countingStartEvent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw error(ErrorCode.DOCUMENT_NOT_FOUND);
    if (doc.archivedAt !== undefined) throw error(ErrorCode.DOCUMENT_ALREADY_ARCHIVED);

    const category = ARCHIVE_CATEGORY_MAP[args.categorySlug];
    if (!category) throw error(ErrorCode.INVALID_ARCHIVE_CATEGORY);

    // Verifier si une politique org override la retention
    const orgId = doc.ownerId as Id<"orgs">;
    const policy = await ctx.db
      .query("archivePolicies")
      .withIndex("by_org_and_categorySlug", (q) =>
        q.eq("orgId", orgId).eq("categorySlug", args.categorySlug),
      )
      .unique();

    const retentionYears = policy?.retentionYears ?? category.retentionYears;
    const now = Date.now();

    const retentionExpiresAt = computeRetentionExpiry(
      now,
      retentionYears,
      category.isPerpetual,
    );

    await ctx.db.patch(args.documentId, {
      archivedAt: now,
      archivedBy: ctx.user._id,
      archiveCategorySlug: args.categorySlug,
      retentionExpiresAt,
      confidentiality: args.confidentiality ?? policy?.confidentiality ?? "internal",
      archiveNote: args.note,
    });

    await logAudit(ctx, {
      orgId,
      documentId: args.documentId,
      action: "archive",
      actorId: ctx.user._id,
      detail: { categorySlug: args.categorySlug, retentionYears, confidentiality: args.confidentiality },
    });
  },
});

/**
 * Archiver plusieurs documents en lot.
 */
export const archiveBulk = authMutation({
  args: {
    documentIds: v.array(v.id("documents")),
    categorySlug: v.string(),
    confidentiality: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const category = ARCHIVE_CATEGORY_MAP[args.categorySlug];
    if (!category) throw error(ErrorCode.INVALID_ARCHIVE_CATEGORY);

    const now = Date.now();

    for (const docId of args.documentIds) {
      const doc = await ctx.db.get(docId);
      if (!doc || doc.archivedAt !== undefined) continue;

      const orgId = doc.ownerId as Id<"orgs">;
      const policy = await ctx.db
        .query("archivePolicies")
        .withIndex("by_org_and_categorySlug", (q) =>
          q.eq("orgId", orgId).eq("categorySlug", args.categorySlug),
        )
        .unique();

      const retentionYears = policy?.retentionYears ?? category.retentionYears;
      const retentionExpiresAt = computeRetentionExpiry(now, retentionYears, category.isPerpetual);

      await ctx.db.patch(docId, {
        archivedAt: now,
        archivedBy: ctx.user._id,
        archiveCategorySlug: args.categorySlug,
        retentionExpiresAt,
        confidentiality: args.confidentiality ?? policy?.confidentiality ?? "internal",
      });

      await logAudit(ctx, {
        orgId,
        documentId: docId,
        action: "archive",
        actorId: ctx.user._id,
        detail: { categorySlug: args.categorySlug, bulk: true },
      });
    }
  },
});

/**
 * Restaurer un document archive (retour dans iDocument).
 */
export const restoreDocument = authMutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw error(ErrorCode.DOCUMENT_NOT_FOUND);
    if (doc.archivedAt === undefined) throw error(ErrorCode.DOCUMENT_NOT_ARCHIVED);

    const orgId = doc.ownerId as Id<"orgs">;

    await ctx.db.patch(args.documentId, {
      archivedAt: undefined,
      archivedBy: undefined,
      archiveCategorySlug: undefined,
      retentionExpiresAt: undefined,
      confidentiality: undefined,
      archiveNote: undefined,
    });

    await logAudit(ctx, {
      orgId,
      documentId: args.documentId,
      action: "restore",
      actorId: ctx.user._id,
    });
  },
});

/**
 * Supprimer definitivement un document archive.
 * Le document doit etre deja archive.
 */
export const permanentlyDeleteArchived = authMutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw error(ErrorCode.DOCUMENT_NOT_FOUND);
    if (doc.archivedAt === undefined) throw error(ErrorCode.DOCUMENT_NOT_ARCHIVED);
    if (doc.deletedAt !== undefined) throw error(ErrorCode.DOCUMENT_ALREADY_DELETED);

    const orgId = doc.ownerId as Id<"orgs">;

    await ctx.db.patch(args.documentId, {
      deletedAt: Date.now(),
      deletedBy: ctx.user._id,
    });

    await logAudit(ctx, {
      orgId,
      documentId: args.documentId,
      action: "permanent_delete",
      actorId: ctx.user._id,
      detail: { label: doc.label, categorySlug: doc.archiveCategorySlug },
    });
  },
});

/**
 * Changer la categorie d'archivage d'un document.
 */
export const changeArchiveCategory = authMutation({
  args: {
    documentId: v.id("documents"),
    newCategorySlug: v.string(),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw error(ErrorCode.DOCUMENT_NOT_FOUND);
    if (doc.archivedAt === undefined) throw error(ErrorCode.DOCUMENT_NOT_ARCHIVED);

    const category = ARCHIVE_CATEGORY_MAP[args.newCategorySlug];
    if (!category) throw error(ErrorCode.INVALID_ARCHIVE_CATEGORY);

    const orgId = doc.ownerId as Id<"orgs">;
    const oldSlug = doc.archiveCategorySlug;

    const retentionExpiresAt = computeRetentionExpiry(
      doc.archivedAt,
      category.retentionYears,
      category.isPerpetual,
    );

    await ctx.db.patch(args.documentId, {
      archiveCategorySlug: args.newCategorySlug,
      retentionExpiresAt,
    });

    await logAudit(ctx, {
      orgId,
      documentId: args.documentId,
      action: "category_change",
      actorId: ctx.user._id,
      detail: { from: oldSlug, to: args.newCategorySlug },
    });
  },
});

/**
 * Prolonger la retention d'un document archive.
 */
export const extendRetention = authMutation({
  args: {
    documentId: v.id("documents"),
    additionalYears: v.number(),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw error(ErrorCode.DOCUMENT_NOT_FOUND);
    if (doc.archivedAt === undefined) throw error(ErrorCode.DOCUMENT_NOT_ARCHIVED);

    const orgId = doc.ownerId as Id<"orgs">;

    // Si perpetuel, ne rien faire
    if (doc.retentionExpiresAt === undefined) return;

    const newExpiry = new Date(doc.retentionExpiresAt);
    newExpiry.setFullYear(newExpiry.getFullYear() + args.additionalYears);

    await ctx.db.patch(args.documentId, {
      retentionExpiresAt: newExpiry.getTime(),
    });

    await logAudit(ctx, {
      orgId,
      documentId: args.documentId,
      action: "retention_extend",
      actorId: ctx.user._id,
      detail: { additionalYears: args.additionalYears, newExpiresAt: newExpiry.getTime() },
    });
  },
});

/**
 * Creer ou modifier une politique d'archivage pour une categorie org.
 */
export const upsertArchivePolicy = authMutation({
  args: {
    orgId: v.id("orgs"),
    categorySlug: v.string(),
    retentionYears: v.number(),
    confidentiality: v.string(),
    countingStartEvent: v.string(),
    autoArchiveOnApproval: v.optional(v.boolean()),
    notifyBeforeExpiryDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!ARCHIVE_CATEGORY_MAP[args.categorySlug]) {
      throw error(ErrorCode.INVALID_ARCHIVE_CATEGORY);
    }

    const existing = await ctx.db
      .query("archivePolicies")
      .withIndex("by_org_and_categorySlug", (q) =>
        q.eq("orgId", args.orgId).eq("categorySlug", args.categorySlug),
      )
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        retentionYears: args.retentionYears,
        confidentiality: args.confidentiality,
        countingStartEvent: args.countingStartEvent,
        autoArchiveOnApproval: args.autoArchiveOnApproval,
        notifyBeforeExpiryDays: args.notifyBeforeExpiryDays,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("archivePolicies", {
        orgId: args.orgId,
        categorySlug: args.categorySlug,
        retentionYears: args.retentionYears,
        confidentiality: args.confidentiality,
        countingStartEvent: args.countingStartEvent,
        autoArchiveOnApproval: args.autoArchiveOnApproval,
        notifyBeforeExpiryDays: args.notifyBeforeExpiryDays,
        createdBy: ctx.user._id,
        createdAt: now,
        updatedAt: now,
      });
    }

    await logAudit(ctx, {
      orgId: args.orgId,
      action: "policy_update",
      actorId: ctx.user._id,
      detail: {
        categorySlug: args.categorySlug,
        retentionYears: args.retentionYears,
        mode: existing ? "update" : "create",
      },
    });
  },
});

/**
 * Definir la politique d'archivage sur un dossier.
 */
export const setFolderArchivePolicy = authMutation({
  args: {
    folderId: v.id("documentFolders"),
    archiveCategorySlug: v.optional(v.string()),
    confidentiality: v.optional(v.string()),
    retentionYears: v.optional(v.number()),
    countingStartEvent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const folder = await ctx.db.get(args.folderId);
    if (!folder) throw error(ErrorCode.FOLDER_NOT_FOUND);

    await ctx.db.patch(args.folderId, {
      archiveCategorySlug: args.archiveCategorySlug,
      confidentiality: args.confidentiality,
      retentionYears: args.retentionYears,
      countingStartEvent: args.countingStartEvent,
    });

    await logAudit(ctx, {
      orgId: folder.orgId,
      folderId: args.folderId,
      action: "policy_update",
      actorId: ctx.user._id,
      detail: { categorySlug: args.archiveCategorySlug, retentionYears: args.retentionYears },
    });
  },
});
