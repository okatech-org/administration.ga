import { v } from "convex/values";
import { query, internalMutation as rawInternalMutation } from "../_generated/server";
import { authMutation, authQuery, backofficeMutation } from "../lib/customFunctions";
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
import { buildDocumentSearchText } from "../lib/documentHelpers";

const MAX_FILES_PER_DOCUMENT = 10;

/**
 * Get documents for an owner (user, org, or profile).
 * Requires authentication — caller must own the resource or be superadmin.
 */
export const getByOwner = authQuery({
  args: {
    ownerId: v.union(v.id("users"), v.id("orgs"), v.id("profiles")),
  },
  handler: async (ctx, args) => {
    // Vérifier que l'appelant est le propriétaire ou superadmin
    const isSuperadmin = ctx.user.isSuperadmin || ctx.user.role === "super_admin";
    const isOwnUser = args.ownerId === (ctx.user._id as string);

    // Vérifier si ownerId est le profile de l'utilisateur
    let isOwnProfile = false;
    if (!isOwnUser) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
        .unique();
      isOwnProfile = profile?._id === args.ownerId;
    }

    // Vérifier si l'utilisateur est membre de l'org
    let isOrgMember = false;
    if (!isOwnUser && !isOwnProfile) {
      const membership = await getMembership(ctx, ctx.user._id, args.ownerId as any);
      isOrgMember = !!membership;
    }

    if (!isSuperadmin && !isOwnUser && !isOwnProfile && !isOrgMember) {
      return [];
    }

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
 * Recupere l'URL de la photo d'identite du citoyen connecte.
 *
 * Strategie de resolution (ordre de priorite) :
 *   1. profile.documents.identityPhoto (lien direct)
 *   2. Document avec documentType = "identity_photo" et ownerId = profileId
 *   3. Document avec documentType = "identity_photo" et ownerId = userId
 *      (cas des uploads avant la correction du lien automatique)
 *
 * Retourne l'URL ou null.
 */
export const getMyIdentityPhotoUrl = authQuery({
  args: {},
  handler: async (ctx) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();
    if (!profile) return null;

    // Strategie 1 : lien direct profile.documents.identityPhoto
    if (profile.documents?.identityPhoto) {
      const doc = await ctx.db.get(profile.documents.identityPhoto);
      if (doc?.files?.[0]?.storageId) {
        const url = await ctx.storage.getUrl(doc.files[0].storageId);
        if (url) return url;
      }
    }

    // Strategie 2 : recherche par type dans TOUS les documents du profil ET du user
    // Prend le plus recent (tri par _creationTime descendant)
    const docsByProfile = await ctx.db
      .query("documents")
      .withIndex("by_owner", (q) => q.eq("ownerId", profile._id))
      .collect();

    const docsByUser = await ctx.db
      .query("documents")
      .withIndex("by_owner", (q) => q.eq("ownerId", ctx.user._id))
      .collect();

    // Fusionner, filtrer par type, trier par le plus recent
    const allPhotos = [...docsByProfile, ...docsByUser]
      .filter((d) => d.documentType === "identity_photo" && d.files?.length > 0)
      .sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0));

    // Prendre le plus recent qui a un storageId valide
    for (const photo of allPhotos) {
      const url = await ctx.storage.getUrl(photo.files[0].storageId);
      if (url) return url;
    }

    return null;
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

    // Auto-assign category and label for consular document types
    let resolvedCategory = args.category;
    let resolvedLabel = args.label;
    const DOC_AUTO_LABELS: Record<string, { label: string; category: string }> = {
      [DetailedDocumentType.IdentityPhoto]: { label: "Photo d'identité", category: DocumentTypeCategory.Identity },
      [DetailedDocumentType.Passport]: { label: "Passeport", category: DocumentTypeCategory.Identity },
      [DetailedDocumentType.ProofOfAddress]: { label: "Justificatif de domicile", category: DocumentTypeCategory.Housing },
      [DetailedDocumentType.BirthCertificate]: { label: "Acte de naissance", category: DocumentTypeCategory.CivilStatus },
      [DetailedDocumentType.ResidencePermit]: { label: "Titre de séjour", category: DocumentTypeCategory.Identity },
    };
    if (args.documentType && args.documentType in DOC_AUTO_LABELS) {
      const auto = DOC_AUTO_LABELS[args.documentType];
      if (!resolvedCategory) resolvedCategory = auto.category as any;
      if (!resolvedLabel) resolvedLabel = auto.label;
    }

    // Nommage du fichier avec le matricule consulaire si disponible
    const resolvedFilename = formatDocumentFilename(
      args.filename,
      args.documentType,
      profile?.matricule,
      args.mimeType,
    );

    const fileData = {
      storageId: args.storageId,
      filename: resolvedFilename,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      uploadedAt: now,
    };

    // Pour les 5 types consulaires : remplacer le document existant au lieu d'en creer un nouveau
    const CONSULAR_TYPES = new Set([
      DetailedDocumentType.IdentityPhoto,
      DetailedDocumentType.Passport,
      DetailedDocumentType.ProofOfAddress,
      DetailedDocumentType.BirthCertificate,
      DetailedDocumentType.ResidencePermit,
    ]);

    let docId;

    if (args.documentType && CONSULAR_TYPES.has(args.documentType as DetailedDocumentType)) {
      // Chercher un document existant du meme type pour ce owner
      const existing = await ctx.db
        .query("documents")
        .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
        .collect();
      const existingDoc = existing.find((d) => d.documentType === args.documentType);

      if (existingDoc) {
        // Remplacer le fichier dans le document existant
        await ctx.db.patch(existingDoc._id, {
          files: [fileData],
          category: resolvedCategory,
          label: resolvedLabel,
          status: DocumentStatus.Pending,
          updatedAt: now,
        });
        docId = existingDoc._id;
      } else {
        // Creer un nouveau document
        docId = await ctx.db.insert("documents", {
          ownerId,
          documentType: args.documentType,
          category: resolvedCategory,
          label: resolvedLabel,
          expiresAt: args.expiresAt,
          files: [fileData],
          status: DocumentStatus.Pending,
          updatedAt: now,
        });
      }
    } else {
      // Autres types : toujours creer un nouveau document
      docId = await ctx.db.insert("documents", {
        ownerId,
        documentType: args.documentType,
        category: resolvedCategory,
        label: resolvedLabel,
        expiresAt: args.expiresAt,
        files: [fileData],
        status: DocumentStatus.Pending,
        updatedAt: now,
      });
    }

    // Lier automatiquement au profil pour les 5 types consulaires
    if (profile && args.documentType) {
      const DOC_PROFILE_KEY: Record<string, string> = {
        [DetailedDocumentType.IdentityPhoto]: "identityPhoto",
        [DetailedDocumentType.Passport]: "passport",
        [DetailedDocumentType.ProofOfAddress]: "proofOfAddress",
        [DetailedDocumentType.BirthCertificate]: "birthCertificate",
        [DetailedDocumentType.ResidencePermit]: "proofOfResidency",
      };
      const profileKey = DOC_PROFILE_KEY[args.documentType];
      if (profileKey) {
        const currentDocs = profile.documents ?? {};
        await ctx.db.patch(profile._id, {
          documents: { ...currentDocs, [profileKey]: docId },
        });
      }
    }

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

    // Auto-assign category and label for consular document types
    let resolvedCategory = args.category;
    let resolvedLabel = args.label;
    const DOC_AUTO: Record<string, { label: string; category: string }> = {
      [DetailedDocumentType.IdentityPhoto]: { label: "Photo d'identité", category: DocumentTypeCategory.Identity },
      [DetailedDocumentType.Passport]: { label: "Passeport", category: DocumentTypeCategory.Identity },
      [DetailedDocumentType.ProofOfAddress]: { label: "Justificatif de domicile", category: "housing" },
      [DetailedDocumentType.BirthCertificate]: { label: "Acte de naissance", category: "civil_status" },
      [DetailedDocumentType.ResidencePermit]: { label: "Titre de séjour", category: DocumentTypeCategory.Identity },
    };
    if (args.documentType && args.documentType in DOC_AUTO) {
      const auto = DOC_AUTO[args.documentType];
      if (!resolvedCategory) resolvedCategory = auto.category as any;
      if (!resolvedLabel) resolvedLabel = auto.label;
    }

    // Nommage avec matricule pour le premier fichier
    const resolvedFiles = args.files.map((f, i) => ({
      ...f,
      filename: i === 0
        ? formatDocumentFilename(f.filename, args.documentType, profile?.matricule, f.mimeType)
        : f.filename,
      uploadedAt: now,
    }));

    // Pour les 5 types consulaires : remplacer le document existant
    const CONSULAR_TYPES = new Set([
      DetailedDocumentType.IdentityPhoto,
      DetailedDocumentType.Passport,
      DetailedDocumentType.ProofOfAddress,
      DetailedDocumentType.BirthCertificate,
      DetailedDocumentType.ResidencePermit,
    ]);

    let docId;

    if (args.documentType && CONSULAR_TYPES.has(args.documentType as DetailedDocumentType)) {
      const existing = await ctx.db
        .query("documents")
        .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
        .collect();
      const existingDoc = existing.find((d) => d.documentType === args.documentType);

      if (existingDoc) {
        await ctx.db.patch(existingDoc._id, {
          files: resolvedFiles,
          category: resolvedCategory,
          label: resolvedLabel,
          status: DocumentStatus.Pending,
          updatedAt: now,
        });
        docId = existingDoc._id;
      } else {
        docId = await ctx.db.insert("documents", {
          ownerId,
          documentType: args.documentType,
          category: resolvedCategory,
          label: resolvedLabel,
          expiresAt: args.expiresAt,
          files: resolvedFiles,
          status: DocumentStatus.Pending,
          updatedAt: now,
        });
      }
    } else {
      docId = await ctx.db.insert("documents", {
        ownerId,
        documentType: args.documentType,
        category: resolvedCategory,
        label: resolvedLabel,
        expiresAt: args.expiresAt,
        files: resolvedFiles,
        status: DocumentStatus.Pending,
        updatedAt: now,
      });
    }

    // Lier automatiquement au profil pour les 5 types consulaires
    if (profile && args.documentType) {
      const DOC_PROFILE_KEY: Record<string, string> = {
        [DetailedDocumentType.IdentityPhoto]: "identityPhoto",
        [DetailedDocumentType.Passport]: "passport",
        [DetailedDocumentType.ProofOfAddress]: "proofOfAddress",
        [DetailedDocumentType.BirthCertificate]: "birthCertificate",
        [DetailedDocumentType.ResidencePermit]: "proofOfResidency",
      };
      const profileKey = DOC_PROFILE_KEY[args.documentType];
      if (profileKey) {
        const currentDocs = profile.documents ?? {};
        await ctx.db.patch(profile._id, {
          documents: { ...currentDocs, [profileKey]: docId },
        });
      }
    }

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

/**
 * Mettre a jour le statut d'un document (validation/rejet par un agent).
 * Protege par requireBackOfficeAccess.
 */
export const updateDocumentStatus = backofficeMutation({
  args: {
    documentId: v.id("documents"),
    status: v.union(v.literal(DocumentStatus.Validated), v.literal(DocumentStatus.Rejected), v.literal(DocumentStatus.Pending)),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw error(ErrorCode.NOT_FOUND);

    await ctx.db.patch(args.documentId, {
      status: args.status,
      ...(args.reason ? { rejectionReason: args.reason } : {}),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// FILIATION iCorrespondance ↔ iDocument (Phase 2 — alignement)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Liste les documents iDocument liés à un courrier (back-pointer
 * `linkedCorrespondanceItemId`). Utilisé par la query inverse côté
 * iCorrespondance pour afficher "Documents classés" à côté d'un courrier
 * archivé.
 */
export const listByLinkedCorrespondance = authQuery({
  args: { itemId: v.id("correspondanceItems") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_correspondance_item", (q) =>
        q.eq("linkedCorrespondanceItemId", args.itemId),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

/**
 * Recherche full-text serveur dans les documents d'une organisation
 * (Phase 1 — searchIndex `search_all`). Pendant exact de
 * `correspondance.searchItems`, exploitable par la barre de recherche
 * unifiée et par le dialog d'import.
 */
export const searchByOwner = authQuery({
  args: {
    ownerId: v.union(v.id("users"), v.id("orgs"), v.id("profiles"), v.id("childProfiles")),
    searchText: v.string(),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const trimmed = args.searchText.trim();
    if (!trimmed) return [];

    // Autorisation : même règle que `getByOwner`.
    const isSuperadmin =
      ctx.user.isSuperadmin || ctx.user.role === "super_admin";
    const isOwnUser = args.ownerId === (ctx.user._id as string);
    let isOwnProfile = false;
    if (!isOwnUser) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
        .unique();
      isOwnProfile = profile?._id === args.ownerId;
    }
    let isOrgMember = false;
    if (!isOwnUser && !isOwnProfile) {
      const membership = await getMembership(
        ctx,
        ctx.user._id,
        args.ownerId as any,
      );
      isOrgMember = !!membership;
    }
    if (!isSuperadmin && !isOwnUser && !isOwnProfile && !isOrgMember) {
      return [];
    }

    const max = args.limit ?? 50;
    const results = await ctx.db
      .query("documents")
      .withSearchIndex("search_all", (q) => {
        let builder = q.search("searchText", trimmed).eq("ownerId", args.ownerId);
        if (args.status !== undefined) {
          builder = builder.eq("status", args.status as any);
        }
        return builder;
      })
      .take(max * 2);

    return results
      .filter((d) => !d.deletedAt)
      .slice(0, max);
  },
});

// ─── Recherche cross-folder ───────────────────────────────────────────────

/**
 * Recherche full-text dans tous les documents d'une org (cross-folder).
 * Pendant exact de `correspondance.searchItems` côté iCorrespondance.
 *
 * Utilise le searchIndex `search_all` (champ `searchText` reconstruit à
 * chaque mutation via `buildDocumentSearchText`). Filtre côté serveur par
 * `ownerId == orgId` et optionnellement par statut.
 */
export const searchOrgWide = authQuery({
  args: {
    orgId: v.id("orgs"),
    query: v.string(),
    status: v.optional(documentStatusValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const trimmed = args.query.trim();
    if (!trimmed) return [];

    const isSuperadmin =
      ctx.user.isSuperadmin || ctx.user.role === "super_admin";
    if (!isSuperadmin) {
      const membership = await getMembership(ctx, ctx.user._id, args.orgId);
      if (!membership) {
        throw error(ErrorCode.FORBIDDEN, "Accès refusé à cette organisation");
      }
    }

    const max = Math.min(args.limit ?? 50, 100);
    const results = await ctx.db
      .query("documents")
      .withSearchIndex("search_all", (q) => {
        let builder = q
          .search("searchText", trimmed)
          .eq("ownerId", args.orgId);
        if (args.status) {
          builder = builder.eq("status", args.status);
        }
        return builder;
      })
      .take(max * 2);

    return results.filter((d) => !d.deletedAt).slice(0, max);
  },
});

// ─── Helpers iAsted ──────────────────────────────────────────────────────────

/**
 * Insère un document généré par iAsted dans la table `documents`, posé dans
 * un dossier virtuel (typiquement « iAsted Documents »).
 *
 * Appelé depuis l'action `realtimeToolExecutor.executeRealtimeTool` après
 * génération du PDF (correspondance officielle ou template standalone).
 * L'auth a déjà été vérifiée dans l'action parente.
 */
export const createFromIAsted = rawInternalMutation({
  args: {
    orgId: v.id("orgs"),
    userId: v.id("users"),
    folderId: v.id("documentFolders"),
    storageId: v.id("_storage"),
    filename: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    label: v.string(),
    originType: v.union(
      v.literal("iasted-correspondance"),
      v.literal("iasted-document"),
    ),
    correspondanceType: v.optional(v.string()),
    templateCode: v.optional(v.string()),
    subject: v.optional(v.string()),
    recipientName: v.optional(v.string()),
    linkedCorrespondanceItemId: v.optional(v.id("correspondanceItems")),
    extraTags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const files = [
      {
        storageId: args.storageId,
        filename: args.filename,
        mimeType: args.mimeType,
        sizeBytes: args.sizeBytes,
        uploadedAt: now,
      },
    ];
    const origin = {
      type: args.originType,
      classedAt: now,
      classedByUserId: args.userId,
      correspondanceType: args.correspondanceType,
      templateCode: args.templateCode,
      subject: args.subject,
      recipientName: args.recipientName,
    };
    const tags = ["source:iasted", ...(args.extraTags ?? [])];

    return await ctx.db.insert("documents", {
      ownerId: args.orgId,
      files,
      label: args.label,
      status: DocumentStatus.Pending,
      folderId: args.folderId,
      updatedAt: now,
      linkedCorrespondanceItemId: args.linkedCorrespondanceItemId,
      origin,
      tags,
      searchText: buildDocumentSearchText({
        label: args.label,
        files,
        tags,
        origin,
      }),
    });
  },
});
