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
import {
  requireCorrespondanceAccess,
  generateSequentialReference,
  buildCorrespondanceSearchText,
} from "../lib/correspondanceHelpers";
import { buildDocumentSearchText } from "../lib/documentHelpers";
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

    await ctx.db.patch(args.itemId, {
      documents: [...currentDocs, newDoc],
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

    // Créer le document dans iDocument (table documents) avec back-pointer + origin
    const docLabel = removedDoc.label ?? `Extrait de ${item.reference}`;
    const docTags = ["source:correspondance"];
    const docOrigin = {
      type: "correspondance" as const,
      correspondanceReference: item.reference,
      correspondanceArrivalRef: item.arrivalReference,
      senderName: item.senderName,
      recipientName: item.recipientName,
      sourceDate: item.createdAt,
      classedAt: now,
      classedByUserId: ctx.user._id,
    };
    const docFiles = [
      {
        storageId: removedDoc.storageId,
        filename: removedDoc.filename,
        mimeType: removedDoc.mimeType,
        sizeBytes: removedDoc.sizeBytes,
        uploadedAt: removedDoc.uploadedAt,
      },
    ];
    const documentId = await ctx.db.insert("documents", {
      ownerId: item.orgId,
      files: docFiles,
      label: docLabel,
      status: DocumentStatus.Pending,
      updatedAt: now,
      linkedCorrespondanceItemId: args.itemId,
      origin: docOrigin,
      tags: docTags,
      searchText: buildDocumentSearchText({
        label: docLabel,
        files: docFiles,
        tags: docTags,
        origin: docOrigin,
      }),
    });

    // Retirer du dossier
    const newDocs = docs.filter((_, i) => i !== args.documentIndex);

    await ctx.db.patch(args.itemId, {
      documents: newDocs,
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
    const docTags = [
      "source:correspondance",
      ...(args.tags ?? []),
    ];
    const docOrigin = {
      type: "correspondance" as const,
      correspondanceReference: item.reference,
      correspondanceArrivalRef: item.arrivalReference,
      senderName: item.senderName,
      recipientName: item.recipientName,
      sourceDate: item.createdAt,
      classedAt: now,
      classedByUserId: ctx.user._id,
    };

    // Transférer chaque document vers iDocument avec back-pointer + origin
    for (const doc of docs) {
      const files = [
        {
          storageId: doc.storageId,
          filename: doc.filename,
          mimeType: doc.mimeType,
          sizeBytes: doc.sizeBytes,
          uploadedAt: doc.uploadedAt,
        },
      ];
      const label = doc.label ?? `${item.reference} — ${doc.filename}`;
      const docId = await ctx.db.insert("documents", {
        ownerId: item.orgId,
        files,
        label,
        status: DocumentStatus.Pending,
        updatedAt: now,
        linkedCorrespondanceItemId: args.itemId,
        origin: docOrigin,
        tags: docTags,
        archiveCategorySlug: args.category,
        searchText: buildDocumentSearchText({
          label,
          files,
          tags: docTags,
          origin: docOrigin,
        }),
      });
      createdDocIds.push(docId as string);
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
 * Rollback symétrique de `classerCorrespondanceDansIDocument`.
 *
 * Restaure le `correspondanceItem` (annule le soft-delete) et marque les
 * documents iDocument issus du classement (linkedCorrespondanceItemId ==
 * itemId) comme supprimés. Le storage binaire reste intact (les docs
 * conservent les `storageId` originaux dans l'item correspondance).
 *
 * Cas d'usage : un utilisateur a classé par erreur, ou souhaite reprendre
 * un dossier archivé pour réponse.
 */
export const unclasserCorrespondance = authMutation({
  args: {
    itemId: v.id("correspondanceItems"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const item = await ctx.db.get(args.itemId);
    if (!item) throw error(ErrorCode.NOT_FOUND, "Dossier introuvable");
    if (!item.deletedAt) {
      throw error(
        ErrorCode.VALIDATION_ERROR,
        "Le dossier n'a pas été classé (pas dans la corbeille).",
      );
    }
    const orgId = item.copyOwnerOrgId ?? item.orgId;
    await requireCorrespondanceAccess(ctx, ctx.user, orgId, "transmit");

    // Soft-delete les documents iDocument issus du classement
    const linkedDocs = await ctx.db
      .query("documents")
      .withIndex("by_correspondance_item", (q) =>
        q.eq("linkedCorrespondanceItemId", args.itemId),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    let removedCount = 0;
    for (const doc of linkedDocs) {
      // Seulement les docs ayant origin.type === "correspondance" (créés par
      // le classement). Ignorer d'autres docs qui pourraient pointer le même
      // item via une autre origine.
      if (doc.origin?.type === "correspondance") {
        await ctx.db.patch(doc._id, {
          deletedAt: now,
          deletedBy: ctx.user._id,
        });
        removedCount++;
      }
    }

    // Restaurer le correspondanceItem
    await ctx.db.patch(args.itemId, {
      deletedAt: undefined,
      updatedAt: now,
    });

    // Log workflow
    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: args.itemId,
      stepType: "VIEWED",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      comment: `Dossier déclassé d'iDocument (${removedCount} documents archivés en corbeille iDocument)`,
      isRead: true,
      createdAt: now,
    });

    return { removedDocCount: removedCount };
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

    await ctx.db.patch(args.correspondanceItemId, {
      documents: [...currentDocs, newDoc],
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

      const dispersedTitle = `[Dispersé] ${item.title}`;
      const dispersedComment = `Documents dispersés depuis ${item.reference}`;
      const dispersedTags = ["dispersé", ...item.tags];
      const newItemId = await ctx.db.insert("correspondanceItems", {
        orgId: item.orgId,
        copyOwnerOrgId: item.copyOwnerOrgId ?? item.orgId,
        isCopy: false,
        createdBy: ctx.user._id,
        reference,
        title: dispersedTitle,
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
        comment: dispersedComment,
        tags: dispersedTags,
        requiresApproval: false,
        documents: groupDocs,
        confidentialite: item.confidentialite,
        parentItemId: args.itemId,
        readByIds: [ctx.user._id as string],
        searchText: buildCorrespondanceSearchText({
          title: dispersedTitle,
          reference,
          senderName: item.recipientName,
          senderOrg: item.recipientOrg,
          recipientName: group.recipientName,
          recipientOrg: group.recipientOrgName,
          comment: dispersedComment,
          tags: dispersedTags,
        }),
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

    if (remainingDocs.length === 0) {
      // Tous les documents sont dispersés → archiver le dossier
      await ctx.db.patch(args.itemId, {
        documents: [],
        status: "archived",
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(args.itemId, {
        documents: remainingDocs,
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
