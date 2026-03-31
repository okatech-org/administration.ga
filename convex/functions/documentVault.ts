/**
 * Document Vault Functions (e-Documents)
 *
 * Personal document storage with categorization and expiration tracking.
 * Documents are owned by the user's profile (ownerId = profileId)
 */

import { v } from "convex/values";
import { authQuery, authMutation } from "../lib/customFunctions";
import { error, ErrorCode } from "../lib/errors";
import { DocumentStatus } from "../lib/constants";
import {
  documentTypeCategoryValidator,
  detailedDocumentTypeValidator,
} from "../lib/validators";

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

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect();

    const activeDocs = documents;

    // Count by category
    const byCategory: Record<string, number> = {};
    for (const doc of activeDocs) {
      const cat = doc.category ?? "other";
      byCategory[cat] = (byCategory[cat] ?? 0) + 1;
    }

    // Count expiring
    const now = Date.now();
    const thirtyDays = now + 30 * 24 * 60 * 60 * 1000;
    const sevenDays = now + 7 * 24 * 60 * 60 * 1000;

    const expiringSoon = activeDocs.filter(
      (d) => d.expiresAt && d.expiresAt <= thirtyDays,
    ).length;
    const expiringUrgent = activeDocs.filter(
      (d) => d.expiresAt && d.expiresAt <= sevenDays,
    ).length;
    const expired = activeDocs.filter(
      (d) => d.expiresAt && d.expiresAt <= now,
    ).length;

    return {
      total: activeDocs.length,
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
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.orgId))
      .collect();

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
