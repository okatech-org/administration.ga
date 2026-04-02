import { v } from "convex/values";
import { query } from "../_generated/server";
import { authMutation, authQuery } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";
import {
  documentStatusValidator,
  documentTypeCategoryValidator,
  detailedDocumentTypeValidator,
} from "../lib/validators";
import { ActivityType as EventType, DocumentStatus, DetailedDocumentType, DocumentTypeCategory } from "../lib/constants";
import { logCortexAction } from "../lib/neocortex";
import { SIGNAL_TYPES, CATEGORIES_ACTION } from "../lib/types";
import { formatDocumentFilename } from "../lib/referenceHelpers";

const MAX_FILES_PER_DOCUMENT = 10;

/**
 * Get documents for an owner (user or org)
 */
export const getByOwner = query({
  args: {
    ownerId: v.union(v.id("users"), v.id("orgs")),
  },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .collect();

    return docs;
  },
});

/**
 * List documents for current user (My Space / Document Vault)
 */
export const listMine = authQuery({
  args: {},
  handler: async (ctx) => {
    // Look up user's profile to query by profileId
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();

    const ownerId = profile?._id ?? ctx.user._id;
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect();

    return docs;
  },
});

/**
 * Get document by ID
 */
export const getById = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.documentId);
  },
});

/**
 * Get multiple documents by ID, with resolved file URLs
 */
export const getDocumentsByIds = query({
  args: { ids: v.array(v.id("documents")) },
  handler: async (ctx, args) => {
    const documents = await Promise.all(args.ids.map((id) => ctx.db.get(id)));
    const validDocs = documents.filter(
      (doc): doc is NonNullable<typeof doc> => doc !== null,
    );

    return Promise.all(
      validDocs.map(async (doc) => ({
        ...doc,
        files: await Promise.all(
          doc.files.map(async (file) => ({
            ...file,
            url: await ctx.storage.getUrl(file.storageId),
          })),
        ),
      })),
    );
  },
});

/**
 * Generate upload URL for a new document
 */
export const generateUploadUrl = authMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Create document with initial file
 * Documents are owned by the current user's profile (falls back to userId)
 */
export const create = authMutation({
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

    // Auto-assign category and label for identity photos
    let resolvedCategory = args.category;
    let resolvedLabel = args.label;
    if (args.documentType === DetailedDocumentType.IdentityPhoto) {
      if (!resolvedCategory) resolvedCategory = DocumentTypeCategory.Identity;
      if (!resolvedLabel) resolvedLabel = "Photo d'identité";
    }

    // Nommage du fichier avec le matricule consulaire si disponible
    const resolvedFilename = formatDocumentFilename(
      args.filename,
      args.documentType,
      profile?.matricule,
    );

    // Create document with single file in files array
    const docId = await ctx.db.insert("documents", {
      ownerId,
      documentType: args.documentType,
      category: resolvedCategory,
      label: resolvedLabel,
      expiresAt: args.expiresAt,
      files: [
        {
          storageId: args.storageId,
          filename: resolvedFilename,
          mimeType: args.mimeType,
          sizeBytes: args.sizeBytes,
          uploadedAt: now,
        },
      ],
      status: DocumentStatus.Pending,
      updatedAt: now,
    });

    // Log event
    await ctx.db.insert("events", {
      targetType: "document",
      targetId: docId as unknown as string,
      actorId: ctx.user._id,
      type: EventType.DocumentUploaded,
      data: {
        ownerId,
        documentType: args.documentType,
        fileCount: 1,
      },
    });

    // NEOCORTEX: Signal document créé
    await logCortexAction(ctx, {
      action: "CREATE_DOCUMENT",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "documents",
      entiteId: docId,
      userId: ctx.user._id,
      apres: { type: args.documentType, category: args.category },
      signalType: SIGNAL_TYPES.DOCUMENT_UPLOADE,
    });

    return docId;
  },
});

/**
 * Create document with multiple files at once (deferred upload flow)
 * Files must already be uploaded to storage via generateUploadUrl
 */
export const createWithFiles = authMutation({
  args: {
    files: v.array(
      v.object({
        storageId: v.id("_storage"),
        filename: v.string(),
        mimeType: v.string(),
        sizeBytes: v.number(),
      }),
    ),
    documentType: v.optional(detailedDocumentTypeValidator),
    category: v.optional(documentTypeCategoryValidator),
    label: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.files.length === 0) {
      throw new Error("At least one file is required");
    }
    if (args.files.length > MAX_FILES_PER_DOCUMENT) {
      throw new Error(`Maximum ${MAX_FILES_PER_DOCUMENT} files per document`);
    }

    const now = Date.now();

    // Resolve owner: prefer profileId, fallback to userId
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();
    const ownerId = profile?._id ?? ctx.user._id;

    const docId = await ctx.db.insert("documents", {
      ownerId,
      documentType: args.documentType,
      category: args.category,
      label: args.label,
      expiresAt: args.expiresAt,
      files: args.files.map((f) => ({
        ...f,
        uploadedAt: now,
      })),
      status: DocumentStatus.Pending,
      updatedAt: now,
    });

    // Log event
    await ctx.db.insert("events", {
      targetType: "document",
      targetId: docId as unknown as string,
      actorId: ctx.user._id,
      type: EventType.DocumentUploaded,
      data: {
        ownerId,
        documentType: args.documentType,
        fileCount: args.files.length,
      },
    });

    return docId;
  },
});

/**
 * Create document for a specific owner (org agents can create for orgs)
 */
export const createForOwner = authMutation({
  args: {
    ownerId: v.union(v.id("users"), v.id("orgs")),
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
    // Permission: only org agents with documents.validate can create for another owner
    // Determine orgId — if ownerId is an org, that's the org; if it's a user, we skip org checks
    // For now, if ownerId is an org, require permission in that org
    const ownerId = args.ownerId;
    // Try to load as an org to determine permission scope
    const org = await ctx.db.get(ownerId as any);
    if (org && "slug" in org) {
      // It's an org — require documents.validate
      const membership = await getMembership(ctx, ctx.user._id, ownerId as any);
      await assertCanDoTask(ctx, ctx.user, membership, "documents.validate");
    }
    const now = Date.now();

    const docId = await ctx.db.insert("documents", {
      ownerId: args.ownerId,
      documentType: args.documentType,
      category: args.category,
      label: args.label,
      expiresAt: args.expiresAt,
      files: [
        {
          storageId: args.storageId,
          filename: args.filename,
          mimeType: args.mimeType,
          sizeBytes: args.sizeBytes,
          uploadedAt: now,
        },
      ],
      status: DocumentStatus.Pending,
      updatedAt: now,
    });

    return docId;
  },
});

/**
 * Add file to existing document
 */
export const addFile = authMutation({
  args: {
    documentId: v.id("documents"),
    storageId: v.id("_storage"),
    filename: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) {
      throw error(ErrorCode.DOCUMENT_NOT_FOUND);
    }

    // Check file limit
    if (doc.files.length >= MAX_FILES_PER_DOCUMENT) {
      throw new Error(`Maximum ${MAX_FILES_PER_DOCUMENT} files per document`);
    }

    const now = Date.now();
    const newFile = {
      storageId: args.storageId,
      filename: args.filename,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      uploadedAt: now,
    };

    await ctx.db.patch(args.documentId, {
      files: [...doc.files, newFile],
      updatedAt: now,
    });

    // Log event
    await ctx.db.insert("events", {
      targetType: "document",
      targetId: args.documentId as unknown as string,
      actorId: ctx.user._id,
      type: EventType.DocumentUploaded,
      data: {
        action: "file_added",
        filename: args.filename,
        fileCount: doc.files.length + 1,
      },
    });

    return args.documentId;
  },
});

/**
 * Remove file from document
 */
export const removeFile = authMutation({
  args: {
    documentId: v.id("documents"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) {
      throw error(ErrorCode.DOCUMENT_NOT_FOUND);
    }

    const fileToRemove = doc.files.find((f) => f.storageId === args.storageId);
    if (!fileToRemove) {
      throw new Error("File not found in document");
    }

    // Delete from storage
    await ctx.storage.delete(args.storageId);

    // Remove from files array
    const updatedFiles = doc.files.filter(
      (f) => f.storageId !== args.storageId,
    );

    // If no files left, delete the entire document
    if (updatedFiles.length === 0) {
      await ctx.db.delete(args.documentId);
    } else {
      await ctx.db.patch(args.documentId, {
        files: updatedFiles,
        updatedAt: Date.now(),
      });
    }

    return true;
  },
});

/**
 * Validate a document (org agent only)
 */
export const validate = authMutation({
  args: {
    documentId: v.id("documents"),
    status: documentStatusValidator,
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) {
      throw error(ErrorCode.DOCUMENT_NOT_FOUND);
    }

    // Permission: require documents.validate in the owning org
    const ownerOrg = await ctx.db.get(doc.ownerId as any);
    if (ownerOrg && "slug" in ownerOrg) {
      const membership = await getMembership(ctx, ctx.user._id, doc.ownerId as any);
      await assertCanDoTask(ctx, ctx.user, membership, "documents.validate");
    }

    await ctx.db.patch(args.documentId, {
      status: args.status,
      validatedBy: ctx.user._id,
      validatedAt: Date.now(),
      rejectionReason:
        args.status === DocumentStatus.Rejected ?
          args.rejectionReason
        : undefined,
      updatedAt: Date.now(),
    });

    // Log event
    await ctx.db.insert("events", {
      targetType: "document",
      targetId: args.documentId as unknown as string,
      actorId: ctx.user._id,
      type:
        args.status === DocumentStatus.Validated ?
          EventType.DocumentValidated
        : EventType.DocumentRejected,
      data: {
        status: args.status,
        reason: args.rejectionReason,
      },
    });

    // NEOCORTEX: Signal document vérifié/rejeté
    await logCortexAction(ctx, {
      action: args.status === DocumentStatus.Validated ? "VERIFY_DOCUMENT" : "REJECT_DOCUMENT",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "documents",
      entiteId: args.documentId,
      userId: ctx.user._id,
      avant: { status: doc.status },
      apres: { status: args.status },
      signalType: args.status === DocumentStatus.Validated ? SIGNAL_TYPES.DOCUMENT_VERIFIE : SIGNAL_TYPES.DOCUMENT_REJETE,
    });

    return args.documentId;
  },
});

/**
 * Delete a document (hard delete) and all its files from storage
 */
export const remove = authMutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) {
      throw error(ErrorCode.DOCUMENT_NOT_FOUND);
    }

    // Permission: only document owner (user or profile) or org agent with documents.delete
    const ownerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();
    const isOwner = doc.ownerId === ctx.user._id || (ownerProfile && doc.ownerId === ownerProfile._id);
    if (!isOwner) {
      const ownerOrg = await ctx.db.get(doc.ownerId as any);
      if (ownerOrg && "slug" in ownerOrg) {
        const membership = await getMembership(ctx, ctx.user._id, doc.ownerId as any);
        await assertCanDoTask(ctx, ctx.user, membership, "documents.delete");
      } else {
        throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
      }
    }

    // Delete all files from storage
    for (const file of doc.files) {
      await ctx.storage.delete(file.storageId);
    }

    // NEOCORTEX: Signal document supprimé
    await logCortexAction(ctx, {
      action: "DELETE_DOCUMENT",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "documents",
      entiteId: args.documentId,
      userId: ctx.user._id,
      avant: { type: doc?.documentType },
      signalType: SIGNAL_TYPES.DOCUMENT_SUPPRIME,
    });

    // Hard delete the document record
    await ctx.db.delete(args.documentId);

    return true;
  },
});

/**
 */
export const getUrls = authQuery({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) {
      throw error(ErrorCode.DOCUMENT_NOT_FOUND);
    }

    const urls = await Promise.all(
      doc.files.map(async (file) => ({
        storageId: file.storageId,
        filename: file.filename,
        mimeType: file.mimeType,
        url: await ctx.storage.getUrl(file.storageId),
      })),
    );

    return urls;
  },
});

/**
 */
export const getUrl = authQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const getUrlsByStorageIds = authQuery({
  args: { storageIds: v.array(v.id("_storage")) },
  handler: async (ctx, args) => {
    const urls = await Promise.all(
      args.storageIds.map(async (storageId) => {
        return await ctx.storage.getUrl(storageId);
      }),
    );

    return urls;
  },
});
