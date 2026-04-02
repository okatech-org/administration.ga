/**
 * iCorrespondance — Actions sur les documents d'un dossier
 *
 * Gère les opérations sur les documents individuels à l'intérieur
 * d'un dossier de correspondance : retirer, ajouter, réordonner,
 * disperser, classer dans iDocument.
 */

import { v } from "convex/values";
import { authMutation, authQuery } from "../lib/customFunctions";
import { DocumentStatus } from "../lib/constants";
import { correspondanceDocumentValidator } from "../schemas/correspondance";
import { requireCorrespondanceAccess, generateSequentialReference } from "../lib/correspondanceHelpers";
import { error, ErrorCode } from "../lib/errors";

// ═════════════════════════════════════════════════════════════════════════════
// DOCUMENT ACTIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Ajouter un document à un dossier de correspondance.
 */
export const addDocumentToCorrespondance = authMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    storageId: v.id("_storage"),
    filename: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    documentType: v.optional(v.string()),
    label: v.optional(v.string()),
    isMainDocument: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const item = await ctx.db.get(args.itemId);
    if (!item) throw error(ErrorCode.NOT_FOUND, "Dossier de correspondance introuvable");
    const orgId = item.copyOwnerOrgId ?? item.orgId;
    await requireCorrespondanceAccess(ctx, ctx.user, orgId, "create");

    const currentDocs = item.documents ?? [];
    const maxOrdre = currentDocs.length > 0
      ? Math.max(...currentDocs.map((d) => d.ordre))
      : 0;

    const newDoc = {
      storageId: args.storageId,
      filename: args.filename,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      uploadedAt: now,
      documentType: args.documentType,
      label: args.label,
      ordre: maxOrdre + 1,
      isMainDocument: args.isMainDocument ?? (currentDocs.length === 0),
    };

    // Aussi ajouter dans attachments (rétrocompatibilité)
    const currentAttachments = item.attachments ?? [];

    await ctx.db.patch(args.itemId, {
      documents: [...currentDocs, newDoc],
      attachments: [...currentAttachments, {
        storageId: args.storageId,
        filename: args.filename,
        mimeType: args.mimeType,
        sizeBytes: args.sizeBytes,
        uploadedAt: now,
      }],
      updatedAt: now,
    });

    // Log workflow
    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: args.itemId,
      stepType: "DOCUMENT_ADDED",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      comment: `Document ajouté : ${args.filename}`,
      isRead: true,
      createdAt: now,
    });
  },
});

/**
 * Retirer un document d'un dossier et le classer dans iDocument.
 */
export const removeDocumentFromCorrespondance = authMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    documentIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const item = await ctx.db.get(args.itemId);
    if (!item) throw error(ErrorCode.NOT_FOUND, "Dossier de correspondance introuvable");
    const orgId = item.copyOwnerOrgId ?? item.orgId;
    await requireCorrespondanceAccess(ctx, ctx.user, orgId, "create");

    const docs = item.documents ?? [];
    if (args.documentIndex < 0 || args.documentIndex >= docs.length) {
      throw error(ErrorCode.VALIDATION_ERROR, "Index de document invalide");
    }

    const removedDoc = docs[args.documentIndex];

    // Créer le document dans iDocument (table documents)
    const documentId = await ctx.db.insert("documents", {
      ownerId: item.orgId,
      files: [{
        storageId: removedDoc.storageId,
        filename: removedDoc.filename,
        mimeType: removedDoc.mimeType,
        sizeBytes: removedDoc.sizeBytes,
        uploadedAt: removedDoc.uploadedAt,
      }],
      label: removedDoc.label ?? `Extrait de ${item.reference}`,
      status: DocumentStatus.Pending,
      updatedAt: now,
    });

    // Retirer du dossier
    const newDocs = docs.filter((_, i) => i !== args.documentIndex);
    const newAttachments = (item.attachments ?? []).filter(
      (a) => a.storageId !== removedDoc.storageId,
    );

    await ctx.db.patch(args.itemId, {
      documents: newDocs,
      attachments: newAttachments,
      updatedAt: now,
    });

    // Log
    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: args.itemId,
      stepType: "DOCUMENT_REMOVED",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      comment: `Document retiré et classé dans iDocument : ${removedDoc.filename}`,
      isRead: true,
      createdAt: now,
    });

    return { documentId };
  },
});

/**
 * Réordonner les documents dans un dossier.
 */
export const reorderDocuments = authMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    newOrder: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw error(ErrorCode.NOT_FOUND, "Dossier introuvable");
    const orgId = item.copyOwnerOrgId ?? item.orgId;
    await requireCorrespondanceAccess(ctx, ctx.user, orgId, "create");

    const docs = item.documents ?? [];
    if (args.newOrder.length !== docs.length) {
      throw error(ErrorCode.VALIDATION_ERROR, "Le nombre d'indices ne correspond pas au nombre de documents");
    }

    const reordered = args.newOrder.map((oldIndex, newIndex) => ({
      ...docs[oldIndex],
      ordre: newIndex + 1,
    }));

    await ctx.db.patch(args.itemId, {
      documents: reordered,
      updatedAt: Date.now(),
    });
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// CLASSEMENT DANS iDOCUMENT
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Classer un dossier de correspondance entier dans iDocument.
 * Tous les documents sont transférés, le correspondanceItem est soft-deleted.
 */
export const classerCorrespondanceDansIDocument = authMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const item = await ctx.db.get(args.itemId);
    if (!item) throw error(ErrorCode.NOT_FOUND, "Dossier introuvable");
    const orgId = item.copyOwnerOrgId ?? item.orgId;
    await requireCorrespondanceAccess(ctx, ctx.user, orgId, "transmit");

    const docs = item.documents ?? [];
    const createdDocIds: string[] = [];

    // Transférer chaque document vers iDocument
    for (const doc of docs) {
      const docId = await ctx.db.insert("documents", {
        ownerId: item.orgId,
        files: [{
          storageId: doc.storageId,
          filename: doc.filename,
          mimeType: doc.mimeType,
          sizeBytes: doc.sizeBytes,
          uploadedAt: doc.uploadedAt,
        }],
        label: doc.label ?? `${item.reference} — ${doc.filename}`,
        status: DocumentStatus.Pending,
        updatedAt: now,
      });
      createdDocIds.push(docId as string);
    }

    // Si pas de documents enrichis, transférer les attachments legacy
    if (docs.length === 0 && item.attachments.length > 0) {
      for (const att of item.attachments) {
        const docId = await ctx.db.insert("documents", {
          ownerId: item.orgId,
          files: [{
            storageId: att.storageId,
            filename: att.filename,
            mimeType: att.mimeType,
            sizeBytes: att.sizeBytes,
            uploadedAt: att.uploadedAt,
          }],
          label: `${item.reference} — ${att.filename}`,
          status: DocumentStatus.Pending,
          updatedAt: now,
        });
        createdDocIds.push(docId as string);
      }
    }

    // Soft-delete le correspondanceItem
    await ctx.db.patch(args.itemId, {
      deletedAt: now,
      updatedAt: now,
    });

    // Log
    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: args.itemId,
      stepType: "ARCHIVED",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      comment: `Dossier classé dans iDocument (${createdDocIds.length} documents transférés)`,
      isRead: true,
      createdAt: now,
    });

    return { documentIds: createdDocIds };
  },
});

/**
 * Importer un document depuis iDocument vers un dossier de correspondance.
 */
export const importDocumentFromIDocument = authMutation({
  args: {
    correspondanceItemId: v.id("correspondanceItems"),
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const item = await ctx.db.get(args.correspondanceItemId);
    if (!item) throw error(ErrorCode.NOT_FOUND, "Dossier de correspondance introuvable");
    const orgId = item.copyOwnerOrgId ?? item.orgId;
    await requireCorrespondanceAccess(ctx, ctx.user, orgId, "create");

    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw error(ErrorCode.NOT_FOUND, "Document iDocument introuvable");

    const file = doc.files?.[0];
    if (!file) throw new Error("Aucun fichier dans le document iDocument");

    const currentDocs = item.documents ?? [];
    const maxOrdre = currentDocs.length > 0
      ? Math.max(...currentDocs.map((d) => d.ordre))
      : 0;

    const newDoc = {
      storageId: file.storageId,
      filename: file.filename,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      uploadedAt: file.uploadedAt,
      documentType: (doc as any).documentType,
      label: doc.label ?? file.filename,
      ordre: maxOrdre + 1,
      isMainDocument: currentDocs.length === 0,
    };

    const currentAttachments = item.attachments ?? [];

    await ctx.db.patch(args.correspondanceItemId, {
      documents: [...currentDocs, newDoc],
      attachments: [...currentAttachments, {
        storageId: file.storageId,
        filename: file.filename,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        uploadedAt: file.uploadedAt,
      }],
      updatedAt: now,
    });

    // Log
    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: args.correspondanceItemId,
      stepType: "DOCUMENT_ADDED",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      comment: `Document importé depuis iDocument : ${file.filename}`,
      isRead: true,
      createdAt: now,
    });
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// DISPERSION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Disperser les documents d'un dossier reçu vers plusieurs destinataires.
 * Chaque groupe de documents crée une nouvelle correspondance en brouillon.
 */
export const disperseCorrespondance = authMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    groups: v.array(v.object({
      documentIndices: v.array(v.number()),
      recipientName: v.string(),
      recipientOrgId: v.optional(v.id("orgs")),
      recipientOrgName: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const item = await ctx.db.get(args.itemId);
    if (!item) throw error(ErrorCode.NOT_FOUND, "Dossier introuvable");
    const orgId = item.copyOwnerOrgId ?? item.orgId;
    await requireCorrespondanceAccess(ctx, ctx.user, orgId, "transmit");

    const docs = item.documents ?? [];
    const dispersedIndices = new Set<number>();
    const createdIds: string[] = [];

    // Valider l'existence des organisations destinataires
    for (const group of args.groups) {
      if (group.recipientOrgId) {
        const recipientOrg = await ctx.db.get(group.recipientOrgId);
        if (!recipientOrg || (recipientOrg as any).deletedAt) {
          throw error(
            ErrorCode.NOT_FOUND,
            `Organisation destinataire introuvable : ${group.recipientOrgName ?? group.recipientOrgId}`,
          );
        }
      }
    }

    for (const group of args.groups) {
      // Extraire les documents pour ce groupe
      const groupDocs = group.documentIndices
        .filter((i) => i >= 0 && i < docs.length)
        .map((i, ordre) => ({
          ...docs[i],
          ordre: ordre + 1,
          isMainDocument: ordre === 0,
        }));

      if (groupDocs.length === 0) continue;

      // Créer une nouvelle correspondance brouillon avec référence séquentielle
      const reference = await generateSequentialReference(ctx, item.type);

      const newItemId = await ctx.db.insert("correspondanceItems", {
        orgId: item.orgId,
        copyOwnerOrgId: item.copyOwnerOrgId ?? item.orgId,
        isCopy: false,
        createdBy: ctx.user._id,
        reference,
        title: `[Dispersé] ${item.title}`,
        type: item.type,
        priority: item.priority,
        status: "draft",
        direction: "outgoing",
        senderName: item.recipientName,
        senderOrg: item.recipientOrg,
        senderEmail: item.recipientEmail,
        senderUserId: ctx.user._id,
        recipientName: group.recipientName,
        recipientOrg: group.recipientOrgName,
        primaryRecipientOrgId: group.recipientOrgId,
        comment: `Documents dispersés depuis ${item.reference}`,
        tags: ["dispersé", ...item.tags],
        requiresApproval: false,
        attachments: groupDocs.map((d) => ({
          storageId: d.storageId,
          filename: d.filename,
          mimeType: d.mimeType,
          sizeBytes: d.sizeBytes,
          uploadedAt: d.uploadedAt,
        })),
        documents: groupDocs,
        confidentialite: item.confidentialite,
        parentItemId: args.itemId,
        readByIds: [ctx.user._id as string],
        createdAt: now,
        updatedAt: now,
      });

      createdIds.push(newItemId as string);

      // Marquer les indices comme dispersés
      for (const i of group.documentIndices) {
        dispersedIndices.add(i);
      }
    }

    // Retirer les documents dispersés du dossier original
    const remainingDocs = docs.filter((_, i) => !dispersedIndices.has(i))
      .map((d, i) => ({ ...d, ordre: i + 1 }));
    const remainingAttachments = (item.attachments ?? []).filter(
      (a) => !docs.some((d, i) => dispersedIndices.has(i) && d.storageId === a.storageId),
    );

    if (remainingDocs.length === 0) {
      // Tous les documents sont dispersés → archiver le dossier
      await ctx.db.patch(args.itemId, {
        documents: [],
        attachments: [],
        status: "archived",
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(args.itemId, {
        documents: remainingDocs,
        attachments: remainingAttachments,
        updatedAt: now,
      });
    }

    // Log
    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: args.itemId,
      stepType: "TRANSMITTED",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      comment: `Documents dispersés en ${createdIds.length} correspondance(s)`,
      isRead: true,
      createdAt: now,
    });

    return { createdCorrespondanceIds: createdIds };
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// CONFIG ORG
// ═════════════════════════════════════════════════════════════════════════════

/** Obtenir la configuration correspondance d'une organisation */
export const getOrgCorrespondanceConfig = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    await requireCorrespondanceAccess(ctx, ctx.user, args.orgId, "view");
    const org = await ctx.db.get(args.orgId);
    if (!org) return null;
    return (org.settings as any)?.correspondanceConfig ?? null;
  },
});

/** Mettre à jour la configuration correspondance d'une organisation */
export const updateOrgCorrespondanceConfig = authMutation({
  args: {
    orgId: v.id("orgs"),
    config: v.object({
      isEnabled: v.boolean(),
      defaultReferencePattern: v.optional(v.string()),
      registreCourrier: v.optional(v.object({
        prefixArrivee: v.string(),
        prefixDepart: v.string(),
        numerotationAnnuelle: v.boolean(),
      })),
      approbationGlobale: v.optional(v.object({
        autoRouteByHierarchy: v.boolean(),
        chefDePosteRequired: v.boolean(),
      })),
      typesActifs: v.optional(v.array(v.string())),
      signatureConfig: v.optional(v.object({
        signatureElectronique: v.boolean(),
        cachetOrganisme: v.boolean(),
        cachetStorageId: v.optional(v.id("_storage")),
      })),
    }),
  },
  handler: async (ctx, args) => {
    await requireCorrespondanceAccess(ctx, ctx.user, args.orgId, "configure");
    const org = await ctx.db.get(args.orgId);
    if (!org) throw error(ErrorCode.NOT_FOUND, "Organisation introuvable");

    const currentSettings = (org.settings ?? {}) as Record<string, unknown>;

    await ctx.db.patch(args.orgId, {
      settings: {
        ...currentSettings,
        correspondanceConfig: args.config,
      } as any,
      updatedAt: Date.now(),
    });
  },
});
