/**
 * Document Vault Functions (e-Documents)
 *
 * Personal document storage with categorization and expiration tracking.
 * Documents are owned by the user's profile (ownerId = profileId)
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation as rawInternalMutation, internalQuery as rawInternalQuery } from "../_generated/server";
import { authQuery, authMutation, superadminMutation } from "../lib/customFunctions";
import { error, ErrorCode, ensure } from "../lib/errors";
import { DocumentStatus } from "../lib/constants";
import { logAudit } from "./archive";
import {
  documentTypeCategoryValidator,
  detailedDocumentTypeValidator,
} from "../lib/validators";
import {
  documentsByOwnerCategory,
  documentsByOwnerExpiry,
} from "../lib/aggregates";
import { DocumentTypeCategory } from "../lib/constants";
import { getDefaultFoldersForOrgType } from "../lib/iDocumentDefaultFolders";

// ═══════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all vault documents for current user
 */
export const getMyVault = authQuery({
  args: {},
  handler: async (ctx) => {
    // Resolve owner: prefer profileId, fallback to userId
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();
    const ownerId = profile?._id ?? ctx.user._id;

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect();

    return documents;
  },
});

/**
 * Get vault documents by category
 */
export const getByCategory = authQuery({
  args: { category: documentTypeCategoryValidator },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();
    const ownerId = profile?._id ?? ctx.user._id;

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_category", (q) =>
        q.eq("ownerId", ownerId).eq("category", args.category),
      )
      .collect();

    return documents;
  },
});

/**
 * Get expiring documents (within X days)
 */
export const getExpiring = authQuery({
  args: { daysAhead: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const days = args.daysAhead ?? 30; // Default 30 days
    const threshold = Date.now() + days * 24 * 60 * 60 * 1000;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();
    const ownerId = profile?._id ?? ctx.user._id;

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect();

    return documents
      .filter((d) => d.expiresAt && d.expiresAt <= threshold)
      .sort((a, b) => (a.expiresAt ?? 0) - (b.expiresAt ?? 0));
  },
});

/**
 * Get vault statistics
 */
export const getStats = authQuery({
  args: {},
  handler: async (ctx) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();
    const ownerId = profile?._id ?? ctx.user._id;
    const ns = ownerId as unknown as string;

    const now = Date.now();
    const thirtyDays = now + 30 * 24 * 60 * 60 * 1000;
    const sevenDays = now + 7 * 24 * 60 * 60 * 1000;

    const categories = Object.values(DocumentTypeCategory);

    const [total, byCategoryPairs, expiringSoon, expiringUrgent, expired] =
      await Promise.all([
        documentsByOwnerCategory.count(ctx, {
          namespace: ns,
          bounds: { prefix: [0] },
        }),
        Promise.all(
          categories.map((cat) =>
            documentsByOwnerCategory
              .count(ctx, { namespace: ns, bounds: { prefix: [0, cat] } })
              .then((n) => [cat, n] as const),
          ),
        ),
        documentsByOwnerExpiry.count(ctx, {
          namespace: ns,
          bounds: {
            lower: { key: [0, 0], inclusive: true },
            upper: { key: [0, thirtyDays], inclusive: true },
          },
        }),
        documentsByOwnerExpiry.count(ctx, {
          namespace: ns,
          bounds: {
            lower: { key: [0, 0], inclusive: true },
            upper: { key: [0, sevenDays], inclusive: true },
          },
        }),
        documentsByOwnerExpiry.count(ctx, {
          namespace: ns,
          bounds: {
            lower: { key: [0, 0], inclusive: true },
            upper: { key: [0, now], inclusive: true },
          },
        }),
      ]);

    const byCategory = Object.fromEntries(
      byCategoryPairs.filter(([, n]) => n > 0),
    );

    return {
      total,
      byCategory,
      expiringSoon,
      expiringUrgent,
      expired,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Add document to vault
 */
export const addToVault = authMutation({
  args: {
    storageId: v.id("_storage"),
    filename: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    documentType: v.optional(detailedDocumentTypeValidator),
    category: v.optional(documentTypeCategoryValidator),
    label: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Resolve owner: prefer profileId, fallback to userId
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();
    const ownerId = profile?._id ?? ctx.user._id;

    return await ctx.db.insert("documents", {
      ownerId,
      files: [
        {
          storageId: args.storageId,
          filename: args.filename,
          mimeType: args.mimeType,
          sizeBytes: args.sizeBytes,
          uploadedAt: now,
        },
      ],
      documentType: args.documentType,
      category: args.category,
      label: args.label,
      expiresAt: args.expiresAt,
      status: DocumentStatus.Pending,
      updatedAt: now,
    });
  },
});

/**
 * Update vault document metadata
 */
export const updateDocument = authMutation({
  args: {
    id: v.id("documents"),
    category: v.optional(documentTypeCategoryValidator),
    label: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);

    if (!doc) {
      throw error(ErrorCode.NOT_FOUND, "Document not found");
    }

    // Check ownership (user or profile)
    const ownerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();
    if (doc.ownerId !== ctx.user._id && !(ownerProfile && doc.ownerId === ownerProfile._id)) {
      throw error(ErrorCode.FORBIDDEN, "Access denied");
    }

    const { id, ...updates } = args;

    await ctx.db.patch(args.id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Remove from vault (hard delete) - also deletes files from storage
 */
export const removeFromVault = authMutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);

    if (!doc) {
      throw error(ErrorCode.NOT_FOUND, "Document not found");
    }

    // Check ownership (user or profile)
    const ownerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();
    if (doc.ownerId !== ctx.user._id && !(ownerProfile && doc.ownerId === ownerProfile._id)) {
      throw error(ErrorCode.FORBIDDEN, "Access denied");
    }

    // Delete all files from storage
    for (const file of doc.files) {
      await ctx.storage.delete(file.storageId);
    }

    // Hard delete the document
    await ctx.db.delete(args.id);

    return args.id;
  },
});

/**
 * Move document to different category
 */
export const changeCategory = authMutation({
  args: {
    id: v.id("documents"),
    category: documentTypeCategoryValidator,
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);

    if (!doc) {
      throw error(ErrorCode.NOT_FOUND, "Document not found");
    }

    const ownerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();
    if (doc.ownerId !== ctx.user._id && !(ownerProfile && doc.ownerId === ownerProfile._id)) {
      throw error(ErrorCode.FORBIDDEN, "Access denied");
    }

    await ctx.db.patch(args.id, {
      category: args.category,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Set expiration date
 */
export const setExpiration = authMutation({
  args: {
    id: v.id("documents"),
    expiresAt: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);

    if (!doc) {
      throw error(ErrorCode.NOT_FOUND, "Document not found");
    }

    const ownerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();
    if (doc.ownerId !== ctx.user._id && !(ownerProfile && doc.ownerId === ownerProfile._id)) {
      throw error(ErrorCode.FORBIDDEN, "Access denied");
    }

    await ctx.db.patch(args.id, {
      expiresAt: args.expiresAt ?? undefined,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// ORG-LEVEL VAULT (for agent-web iDocument)
// ═══════════════════════════════════════════════════════════════════════════

/** Get all vault documents for an organization */
export const getOrgVault = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const allDocs = await ctx.db
      .query("documents")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.orgId))
      .collect();

    // Exclure les documents archives et supprimes
    const documents = allDocs.filter(
      (d) => d.archivedAt === undefined && d.deletedAt === undefined,
    );

    const withUrls = await Promise.all(
      documents.map(async (doc) => {
        const filesWithUrls = await Promise.all(
          doc.files.map(async (file) => ({
            ...file,
            url: await ctx.storage.getUrl(file.storageId),
          })),
        );
        return { ...doc, files: filesWithUrls };
      }),
    );

    return withUrls;
  },
});

/** Get org vault stats */
export const getOrgVaultStats = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.orgId))
      .collect();

    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalSize = 0;

    for (const doc of documents) {
      const cat = doc.category ?? "uncategorized";
      byCategory[cat] = (byCategory[cat] ?? 0) + 1;
      byStatus[doc.status] = (byStatus[doc.status] ?? 0) + 1;
      for (const file of doc.files) {
        totalSize += file.sizeBytes;
      }
    }

    return { totalDocuments: documents.length, totalSize, byCategory, byStatus };
  },
});

/** Add a document to org vault */
export const addToOrgVault = authMutation({
  args: {
    orgId: v.id("orgs"),
    storageId: v.id("_storage"),
    filename: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    label: v.optional(v.string()),
    category: v.optional(documentTypeCategoryValidator),
    documentType: v.optional(detailedDocumentTypeValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("documents", {
      ownerId: args.orgId,
      files: [{
        storageId: args.storageId,
        filename: args.filename,
        mimeType: args.mimeType,
        sizeBytes: args.sizeBytes,
        uploadedAt: now,
      }],
      label: args.label,
      category: args.category,
      documentType: args.documentType,
      status: DocumentStatus.Pending,
      updatedAt: now,
    });
  },
});

/** Generate upload URL for org vault */
export const generateOrgUploadUrl = authMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/** Delete document from org vault */
export const deleteFromOrgVault = authMutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw error(ErrorCode.NOT_FOUND, "Document introuvable");
    await ctx.db.delete(args.documentId);
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// DOSSIERS iDOCUMENT — Arborescence réelle en base
// ═══════════════════════════════════════════════════════════════════════════

/** Récupérer tous les dossiers d'une org avec compteurs */
export const getOrgFolders = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const folders = await ctx.db
      .query("documentFolders")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Calculer les compteurs pour chaque dossier
    const withCounts = await Promise.all(
      folders.map(async (folder) => {
        const docs = await ctx.db
          .query("documents")
          .withIndex("by_folder", (q) => q.eq("folderId", folder._id))
          .collect();

        const subfolders = folders.filter(
          (f) => f.parentFolderId === folder._id,
        );

        return {
          ...folder,
          documentCount: docs.length,
          subfolderCount: subfolders.length,
        };
      }),
    );

    return withCounts;
  },
});

/** Créer un dossier dans iDocument */
export const createFolder = authMutation({
  args: {
    orgId: v.id("orgs"),
    name: v.string(),
    parentFolderId: v.optional(v.id("documentFolders")),
    tags: v.optional(v.array(v.string())),
    isSystem: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("documentFolders", {
      orgId: args.orgId,
      name: args.name,
      parentFolderId: args.parentFolderId,
      tags: args.tags ?? [],
      createdBy: ctx.user._id,
      isSystem: args.isSystem ?? false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Mettre à jour la politique d'archivage d'un dossier (rétention,
 * confidentialité, événement de départ du compteur). Héritée optionnellement
 * vers les enfants (sous-dossiers + documents).
 */
export const updateFolderArchivePolicy = authMutation({
  args: {
    folderId: v.id("documentFolders"),
    archiveCategorySlug: v.optional(v.string()),
    confidentiality: v.optional(v.string()),
    retentionYears: v.optional(v.number()),
    countingStartEvent: v.optional(v.string()),
    inheritToChildren: v.optional(v.boolean()),
    inheritToDocuments: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const folder = await ctx.db.get(args.folderId);
    ensure(folder, ErrorCode.FOLDER_NOT_FOUND);
    const now = Date.now();

    const patch: Record<string, unknown> = { updatedAt: now };
    if (args.archiveCategorySlug !== undefined) patch.archiveCategorySlug = args.archiveCategorySlug;
    if (args.confidentiality !== undefined) patch.confidentiality = args.confidentiality;
    if (args.retentionYears !== undefined) patch.retentionYears = args.retentionYears;
    if (args.countingStartEvent !== undefined) patch.countingStartEvent = args.countingStartEvent;

    await ctx.db.patch(args.folderId, patch);

    let inheritedFolders = 0;
    let inheritedDocs = 0;

    // Héritage vers les sous-dossiers
    if (args.inheritToChildren) {
      const allOrgFolders = await ctx.db
        .query("documentFolders")
        .withIndex("by_org", (q) => q.eq("orgId", folder.orgId))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect();
      const descendantIds = collectDescendantFolderIds(args.folderId, allOrgFolders);
      for (const subId of descendantIds) {
        await ctx.db.patch(subId, patch);
        inheritedFolders++;
      }
    }

    // Héritage vers les documents enfants directs (+ descendants si demandé)
    if (args.inheritToDocuments) {
      const directDocs = await ctx.db
        .query("documents")
        .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect();
      const docPatch: Record<string, unknown> = { updatedAt: now };
      if (args.archiveCategorySlug !== undefined) docPatch.archiveCategorySlug = args.archiveCategorySlug;
      if (args.confidentiality !== undefined) docPatch.confidentiality = args.confidentiality;
      for (const doc of directDocs) {
        await ctx.db.patch(doc._id, docPatch);
        inheritedDocs++;
      }
      // Cas étendu : si inheritToChildren ET inheritToDocuments, on a déjà
      // collecté `descendantIds`. On ré-applique aussi aux docs des sous-dossiers.
      if (args.inheritToChildren) {
        const allOrgFolders = await ctx.db
          .query("documentFolders")
          .withIndex("by_org", (q) => q.eq("orgId", folder.orgId))
          .collect();
        const descendantIds = collectDescendantFolderIds(args.folderId, allOrgFolders);
        for (const subId of descendantIds) {
          const subDocs = await ctx.db
            .query("documents")
            .withIndex("by_folder", (q) => q.eq("folderId", subId))
            .filter((q) => q.eq(q.field("deletedAt"), undefined))
            .collect();
          for (const doc of subDocs) {
            await ctx.db.patch(doc._id, docPatch);
            inheritedDocs++;
          }
        }
      }
    }

    await logAudit(ctx, {
      orgId: folder.orgId,
      folderId: args.folderId,
      action: "update_archive_policy",
      actorId: ctx.user._id,
      detail: {
        archiveCategorySlug: args.archiveCategorySlug,
        confidentiality: args.confidentiality,
        retentionYears: args.retentionYears,
        countingStartEvent: args.countingStartEvent,
        inheritedFolders,
        inheritedDocs,
      },
    });

    return { inheritedFolders, inheritedDocs };
  },
});

/** Créer les dossiers système si absents pour une org.
 *
 * Les 3 dossiers système (Mes Documents, Brouillons, Poubelle) sont créés
 * inconditionnellement. Le set de dossiers utilisateurs initiaux dépend du
 * type d'org (cf. `lib/iDocumentDefaultFolders.ts`) :
 *   - postes diplomatiques → set consulaire
 *   - administration centrale (Ministry/IntelligenceAgency/ThirdParty/other)
 *     → set adapté à la supervision (Notes & Circulaires, Directives, Audit, …)
 */
export const ensureSystemFolders = authMutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const org = await ctx.db.get(args.orgId);
    if (!org) {
      throw error(ErrorCode.ORG_NOT_FOUND, "Org introuvable");
    }
    const existing = await ctx.db
      .query("documentFolders")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) =>
        q.and(
          q.eq(q.field("isSystem"), true),
          q.eq(q.field("deletedAt"), undefined),
        ),
      )
      .collect();

    const systemFolders = [
      { name: "Mes Documents", tags: [] },
      { name: "Brouillons", tags: [] },
      { name: "Poubelle", tags: [] },
    ];

    const defaultFolders = getDefaultFoldersForOrgType(org.type);

    const createdIds: Id<"documentFolders">[] = [];
    const existingNames = new Set(existing.map((f) => f.name));

    // Créer les dossiers système manquants
    for (const sf of systemFolders) {
      if (!existingNames.has(sf.name)) {
        const id = await ctx.db.insert("documentFolders", {
          orgId: args.orgId,
          name: sf.name,
          tags: sf.tags,
          createdBy: ctx.user._id,
          isSystem: true,
          createdAt: now,
          updatedAt: now,
        });
        createdIds.push(id);
      }
    }

    // Créer les dossiers par défaut (non-système) s'ils n'existent pas
    const allExisting = await ctx.db
      .query("documentFolders")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
    const allNames = new Set(allExisting.map((f) => f.name));

    for (const df of defaultFolders) {
      if (!allNames.has(df.name)) {
        const id = await ctx.db.insert("documentFolders", {
          orgId: args.orgId,
          name: df.name,
          tags: df.tags,
          createdBy: ctx.user._id,
          isSystem: false,
          createdAt: now,
          updatedAt: now,
        });
        createdIds.push(id);
      }
    }

    return { created: createdIds.length };
  },
});

// ─── Internal : utilisé par diplomaticFolders via scheduler ──────────────

/** Cherche un dossier par nom + parent, le crée s'il n'existe pas */
export const internalFindOrCreateFolder = rawInternalMutation({
  args: {
    orgId: v.id("orgs"),
    name: v.string(),
    parentFolderId: v.optional(v.id("documentFolders")),
    tags: v.array(v.string()),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Chercher un dossier existant avec le même nom sous le même parent
    const existing = await ctx.db
      .query("documentFolders")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) =>
        q.and(
          q.eq(q.field("name"), args.name),
          args.parentFolderId
            ? q.eq(q.field("parentFolderId"), args.parentFolderId)
            : q.eq(q.field("parentFolderId"), undefined),
          q.eq(q.field("deletedAt"), undefined),
        ),
      )
      .first();

    if (existing) return existing._id;

    const now = Date.now();
    return await ctx.db.insert("documentFolders", {
      orgId: args.orgId,
      name: args.name,
      parentFolderId: args.parentFolderId,
      tags: args.tags,
      createdBy: args.createdBy,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Cherche un dossier par tag (utilisé pour retrouver le dossier d'une cible) */
export const internalFindFolderByTag = rawInternalQuery({
  args: {
    orgId: v.id("orgs"),
    tag: v.string(),
  },
  handler: async (ctx, args) => {
    const folders = await ctx.db
      .query("documentFolders")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    return folders.find((f) => f.tags.includes(args.tag)) ?? null;
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// CORBEILLE (Poubelle) — Soft-delete, restauration, suppression definitive
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Collecte recursive les IDs de tous les sous-dossiers.
 */
function collectDescendantFolderIds(
  parentId: Id<"documentFolders">,
  allFolders: Array<{ _id: Id<"documentFolders">; parentFolderId?: Id<"documentFolders"> }>,
): Id<"documentFolders">[] {
  const children = allFolders.filter((f) => f.parentFolderId === parentId);
  const ids: Id<"documentFolders">[] = [];
  for (const child of children) {
    ids.push(child._id);
    ids.push(...collectDescendantFolderIds(child._id, allFolders));
  }
  return ids;
}

/** Deplacer un document dans la corbeille (soft-delete) */
export const softDeleteDocument = authMutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    ensure(doc, ErrorCode.DOCUMENT_NOT_FOUND);
    ensure(doc.deletedAt === undefined, ErrorCode.DOCUMENT_IN_TRASH, "Ce document est deja dans la corbeille");

    const now = Date.now();
    await ctx.db.patch(args.documentId, {
      deletedAt: now,
      deletedBy: ctx.user._id,
    });

    // Audit — on utilise ownerId comme orgId (fonctionne pour les docs org)
    const orgId = doc.ownerId as Id<"orgs">;
    await logAudit(ctx, {
      orgId,
      documentId: args.documentId,
      action: "soft_delete",
      actorId: ctx.user._id,
      detail: { label: doc.label, folderId: doc.folderId },
    });
  },
});

/** Deplacer un dossier et tout son contenu dans la corbeille */
export const softDeleteFolder = authMutation({
  args: { folderId: v.id("documentFolders") },
  handler: async (ctx, args) => {
    const folder = await ctx.db.get(args.folderId);
    ensure(folder, ErrorCode.FOLDER_NOT_FOUND);
    ensure(!folder.isSystem, ErrorCode.FOLDER_IS_SYSTEM, "Les dossiers systeme ne peuvent pas etre supprimes");
    ensure(folder.deletedAt === undefined, ErrorCode.FOLDER_IN_TRASH, "Ce dossier est deja dans la corbeille");

    const now = Date.now();

    // Soft-delete le dossier lui-meme
    await ctx.db.patch(args.folderId, { deletedAt: now, deletedBy: ctx.user._id });

    // Soft-delete les documents dans ce dossier
    const docsInFolder = await ctx.db
      .query("documents")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .collect();
    let docCount = 0;
    for (const doc of docsInFolder) {
      if (doc.deletedAt === undefined) {
        await ctx.db.patch(doc._id, { deletedAt: now, deletedBy: ctx.user._id });
        docCount++;
      }
    }

    // Recursion sur les sous-dossiers
    const allOrgFolders = await ctx.db
      .query("documentFolders")
      .withIndex("by_org", (q) => q.eq("orgId", folder.orgId))
      .collect();

    const descendantIds = collectDescendantFolderIds(args.folderId, allOrgFolders);
    let subfolderCount = 0;
    for (const subId of descendantIds) {
      const sub = await ctx.db.get(subId);
      if (sub && sub.deletedAt === undefined) {
        await ctx.db.patch(subId, { deletedAt: now, deletedBy: ctx.user._id });
        subfolderCount++;
      }
      // Soft-delete les documents dans chaque sous-dossier
      const subDocs = await ctx.db
        .query("documents")
        .withIndex("by_folder", (q) => q.eq("folderId", subId))
        .collect();
      for (const doc of subDocs) {
        if (doc.deletedAt === undefined) {
          await ctx.db.patch(doc._id, { deletedAt: now, deletedBy: ctx.user._id });
          docCount++;
        }
      }
    }

    await logAudit(ctx, {
      orgId: folder.orgId,
      folderId: args.folderId,
      action: "soft_delete",
      actorId: ctx.user._id,
      detail: { folderName: folder.name, docCount, subfolderCount },
    });
  },
});

/** Restaurer un document depuis la corbeille */
export const restoreFromTrash = authMutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    ensure(doc, ErrorCode.DOCUMENT_NOT_FOUND);
    ensure(doc.deletedAt !== undefined, ErrorCode.NOT_FOUND, "Ce document n'est pas dans la corbeille");

    // Si le dossier parent est aussi supprime, on deplace le document a la racine
    let newFolderId = doc.folderId;
    if (doc.folderId) {
      const parentFolder = await ctx.db.get(doc.folderId);
      if (!parentFolder || parentFolder.deletedAt !== undefined) {
        newFolderId = undefined;
      }
    }

    await ctx.db.patch(args.documentId, {
      deletedAt: undefined,
      deletedBy: undefined,
      folderId: newFolderId,
    });

    const orgId = doc.ownerId as Id<"orgs">;
    await logAudit(ctx, {
      orgId,
      documentId: args.documentId,
      action: "restore_from_trash",
      actorId: ctx.user._id,
      detail: { label: doc.label },
    });
  },
});

/** Restaurer un dossier et tout son contenu depuis la corbeille */
export const restoreFolderFromTrash = authMutation({
  args: { folderId: v.id("documentFolders") },
  handler: async (ctx, args) => {
    const folder = await ctx.db.get(args.folderId);
    ensure(folder, ErrorCode.FOLDER_NOT_FOUND);
    ensure(folder.deletedAt !== undefined, ErrorCode.NOT_FOUND, "Ce dossier n'est pas dans la corbeille");

    // Si le parent est supprime, deplacer a la racine
    let newParent = folder.parentFolderId;
    if (folder.parentFolderId) {
      const parent = await ctx.db.get(folder.parentFolderId);
      if (!parent || parent.deletedAt !== undefined) {
        newParent = undefined;
      }
    }

    await ctx.db.patch(args.folderId, {
      deletedAt: undefined,
      deletedBy: undefined,
      parentFolderId: newParent,
    });

    // Restaurer les documents du dossier
    const docsInFolder = await ctx.db
      .query("documents")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .collect();
    let docCount = 0;
    for (const doc of docsInFolder) {
      if (doc.deletedAt !== undefined) {
        await ctx.db.patch(doc._id, { deletedAt: undefined, deletedBy: undefined });
        docCount++;
      }
    }

    // Restaurer recursivement les sous-dossiers
    const allOrgFolders = await ctx.db
      .query("documentFolders")
      .withIndex("by_org", (q) => q.eq("orgId", folder.orgId))
      .collect();
    const descendantIds = collectDescendantFolderIds(args.folderId, allOrgFolders);

    for (const subId of descendantIds) {
      const sub = await ctx.db.get(subId);
      if (sub && sub.deletedAt !== undefined) {
        await ctx.db.patch(subId, { deletedAt: undefined, deletedBy: undefined });
      }
      const subDocs = await ctx.db
        .query("documents")
        .withIndex("by_folder", (q) => q.eq("folderId", subId))
        .collect();
      for (const doc of subDocs) {
        if (doc.deletedAt !== undefined) {
          await ctx.db.patch(doc._id, { deletedAt: undefined, deletedBy: undefined });
          docCount++;
        }
      }
    }

    await logAudit(ctx, {
      orgId: folder.orgId,
      folderId: args.folderId,
      action: "restore_from_trash",
      actorId: ctx.user._id,
      detail: { folderName: folder.name, docCount, subfolderCount: descendantIds.length },
    });
  },
});

/** Supprimer definitivement un document (super admin uniquement) */
export const permanentlyDeleteFromTrash = authMutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    ensure(doc, ErrorCode.DOCUMENT_NOT_FOUND);
    ensure(doc.deletedAt !== undefined, ErrorCode.NOT_FOUND, "Ce document n'est pas dans la corbeille");

    const orgId = doc.ownerId as Id<"orgs">;

    // Supprimer les fichiers du storage
    for (const file of doc.files) {
      try { await ctx.storage.delete(file.storageId); } catch { /* fichier déjà supprimé */ }
    }

    // Hard delete
    await ctx.db.delete(args.documentId);

    await logAudit(ctx, {
      orgId,
      documentId: args.documentId,
      action: "permanent_delete",
      actorId: ctx.user._id,
      detail: { label: doc.label },
    });
  },
});

/** Supprimer definitivement un dossier et son contenu */
export const permanentlyDeleteFolderFromTrash = authMutation({
  args: { folderId: v.id("documentFolders") },
  handler: async (ctx, args) => {
    const folder = await ctx.db.get(args.folderId);
    ensure(folder, ErrorCode.FOLDER_NOT_FOUND);
    ensure(folder.deletedAt !== undefined, ErrorCode.NOT_FOUND, "Ce dossier n'est pas dans la corbeille");

    // Collecter tous les sous-dossiers
    const allOrgFolders = await ctx.db
      .query("documentFolders")
      .withIndex("by_org", (q) => q.eq("orgId", folder.orgId))
      .collect();
    const descendantIds = collectDescendantFolderIds(args.folderId, allOrgFolders);
    const allFolderIds = [args.folderId, ...descendantIds];

    let docCount = 0;
    // Hard delete les documents de chaque dossier
    for (const fId of allFolderIds) {
      const docs = await ctx.db
        .query("documents")
        .withIndex("by_folder", (q) => q.eq("folderId", fId))
        .collect();
      for (const doc of docs) {
        for (const file of doc.files) {
          try { await ctx.storage.delete(file.storageId); } catch { /* fichier déjà supprimé */ }
        }
        await ctx.db.delete(doc._id);
        docCount++;
      }
    }

    // Hard delete les dossiers (sous-dossiers d'abord)
    for (const fId of [...descendantIds].reverse()) {
      await ctx.db.delete(fId);
    }
    await ctx.db.delete(args.folderId);

    await logAudit(ctx, {
      orgId: folder.orgId,
      folderId: args.folderId,
      action: "permanent_delete",
      actorId: ctx.user._id,
      detail: { folderName: folder.name, docCount, subfolderCount: descendantIds.length },
    });
  },
});

/** Vider la corbeille d'une organisation (super admin uniquement) */
export const emptyTrash = superadminMutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    // Supprimer tous les documents en corbeille
    const allDocs = await ctx.db
      .query("documents")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.orgId))
      .collect();
    const trashedDocs = allDocs.filter((d) => d.deletedAt !== undefined);

    for (const doc of trashedDocs) {
      for (const file of doc.files) {
        await ctx.storage.delete(file.storageId);
      }
      await ctx.db.delete(doc._id);
    }

    // Supprimer tous les dossiers en corbeille
    const allFolders = await ctx.db
      .query("documentFolders")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    const trashedFolders = allFolders.filter((f) => f.deletedAt !== undefined);

    for (const folder of trashedFolders) {
      await ctx.db.delete(folder._id);
    }

    await logAudit(ctx, {
      orgId: args.orgId,
      action: "trash_emptied",
      actorId: ctx.user._id,
      detail: { docCount: trashedDocs.length, folderCount: trashedFolders.length },
    });

    return { deletedDocs: trashedDocs.length, deletedFolders: trashedFolders.length };
  },
});

/** Lister le contenu de la corbeille d'une organisation */
export const getTrashItems = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    // Documents en corbeille
    const allDocs = await ctx.db
      .query("documents")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.orgId))
      .collect();
    const trashedDocs = allDocs.filter((d) => d.deletedAt !== undefined);

    const documents = await Promise.all(
      trashedDocs.map(async (doc) => {
        const filesWithUrls = await Promise.all(
          doc.files.map(async (file) => ({
            ...file,
            url: await ctx.storage.getUrl(file.storageId),
          })),
        );
        // Resoudre le nom du suppresseur
        let deletedByName: string | undefined;
        if (doc.deletedBy) {
          const deleter = await ctx.db.get(doc.deletedBy);
          deletedByName = deleter?.name ?? deleter?.email;
        }
        return { ...doc, files: filesWithUrls, deletedByName };
      }),
    );

    // Dossiers en corbeille (seulement les racines, pas les sous-dossiers d'un dossier supprime)
    const allFolders = await ctx.db
      .query("documentFolders")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    const trashedFolders = allFolders
      .filter((f) => f.deletedAt !== undefined)
      .filter((f) => {
        // Ne montrer que les dossiers dont le parent n'est PAS supprime (= racine de suppression)
        if (!f.parentFolderId) return true;
        const parent = allFolders.find((p) => p._id === f.parentFolderId);
        return !parent || parent.deletedAt === undefined;
      });

    const folders = await Promise.all(
      trashedFolders.map(async (folder) => {
        let deletedByName: string | undefined;
        if (folder.deletedBy) {
          const deleter = await ctx.db.get(folder.deletedBy);
          deletedByName = deleter?.name ?? deleter?.email;
        }
        // Compter les documents dans ce dossier
        const docsInFolder = allDocs.filter((d) => d.folderId === folder._id);
        return { ...folder, deletedByName, documentCount: docsInFolder.length };
      }),
    );

    return {
      documents,
      folders,
      totalCount: documents.length + folders.length,
    };
  },
});
