/**
 * Dossiers Opérateurs Économiques — Fonctions Convex
 *
 * Gestion des dossiers virtuels dans iDocument (correspondanceFolders)
 * et du registre de documents générés (diplomaticDocuments).
 *
 * Structure : Opérateurs Économiques / {Secteur} / {Nom Cible}
 */

import { v } from "convex/values";
import {
  internalMutation as rawInternalMutation,
  internalQuery as rawInternalQuery,
} from "../_generated/server";
import { authQuery, authMutation } from "../lib/customFunctions";
import {
  docSourceTypeValidator,
  docFormatValidator,
} from "../schemas/diplomaticAffairs";
import { internal } from "../_generated/api";

// ─── Constantes ──────────────────────────────────────────────────────────────

const ROOT_FOLDER_NAME = "Opérateurs Économiques";
const TAG_PREFIX = "diplomatic:target:";

// ═════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═════════════════════════════════════════════════════════════════════════════

/** Récupère les documents d'une cible avec URLs de téléchargement */
export const getTargetDocuments = authQuery({
  args: { targetId: v.id("diplomaticTargets") },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("diplomaticDocuments")
      .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Résoudre les URLs et grouper par subfolder
    const bySubfolder: Record<
      string,
      Array<{
        _id: string;
        filename: string;
        format: string;
        sourceType: string;
        sizeBytes: number;
        version: number;
        generatedAt: number;
        url: string | null;
      }>
    > = {};

    for (const doc of documents) {
      const url = await ctx.storage.getUrl(doc.storageId);
      const key = doc.subfolder || "Fiche";
      if (!bySubfolder[key]) bySubfolder[key] = [];
      bySubfolder[key].push({
        _id: doc._id,
        filename: doc.filename,
        format: doc.format,
        sourceType: doc.sourceType,
        sizeBytes: doc.sizeBytes,
        version: doc.version,
        generatedAt: doc.generatedAt,
        url,
      });
    }

    // Récupérer le dossier cible dans iDocument
    const targetTag = `${TAG_PREFIX}${args.targetId}`;
    const allFolders = await ctx.db
      .query("correspondanceFolders")
      .withIndex("by_org_deleted")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const targetFolder = allFolders.find((f) =>
      f.tags.includes(targetTag),
    );

    return {
      folder: targetFolder ?? null,
      documents,
      bySubfolder,
      totalDocuments: documents.length,
      totalSize: documents.reduce((sum, d) => sum + d.sizeBytes, 0),
    };
  },
});

/** Liste les dossiers opérateurs groupés par secteur */
export const listOperatorFolders = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    // Trouver le dossier racine "Opérateurs Économiques"
    const allFolders = await ctx.db
      .query("correspondanceFolders")
      .withIndex("by_org_deleted", (q) =>
        q.eq("orgId", args.orgId).eq("deletedAt", undefined),
      )
      .collect();

    const rootFolder = allFolders.find(
      (f) => f.name === ROOT_FOLDER_NAME && !f.parentFolderId,
    );
    if (!rootFolder) return { sectors: {}, totalFolders: 0, totalDocuments: 0 };

    // Trouver les sous-dossiers secteur
    const sectorFolders = allFolders.filter(
      (f) => f.parentFolderId === rootFolder._id,
    );

    const sectors: Record<
      string,
      Array<{
        folderId: string;
        name: string;
        targetId: string | null;
        documentCount: number;
        tags: string[];
      }>
    > = {};

    let totalDocuments = 0;
    let totalFolders = 0;

    for (const sector of sectorFolders) {
      const targetFolders = allFolders.filter(
        (f) => f.parentFolderId === sector._id,
      );

      const entries = [];
      for (const tf of targetFolders) {
        const targetTag = tf.tags.find((t) => t.startsWith(TAG_PREFIX));
        const targetId = targetTag ? targetTag.replace(TAG_PREFIX, "") : null;

        const docs = await ctx.db
          .query("diplomaticDocuments")
          .withIndex("by_folder", (q) => q.eq("folderId", tf._id))
          .filter((q) => q.eq(q.field("deletedAt"), undefined))
          .collect();

        totalDocuments += docs.length;
        totalFolders++;

        entries.push({
          folderId: tf._id,
          name: tf.name,
          targetId,
          documentCount: docs.length,
          tags: tf.tags,
        });
      }

      if (entries.length > 0) {
        sectors[sector.name] = entries;
      }
    }

    return { sectors, totalFolders, totalDocuments };
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// INTERNAL QUERIES
// ═════════════════════════════════════════════════════════════════════════════

/** Résout le folderId du dossier cible depuis son targetId (via tag) */
export const internalGetFolderByTarget = rawInternalQuery({
  args: { targetId: v.id("diplomaticTargets") },
  handler: async (ctx, args) => {
    const targetTag = `${TAG_PREFIX}${args.targetId}`;
    const folders = await ctx.db
      .query("correspondanceFolders")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    return folders.find((f) => f.tags.includes(targetTag)) ?? null;
  },
});

/** Récupère tous les documents d'un dossier */
export const internalGetFolderDocuments = rawInternalQuery({
  args: { folderId: v.id("correspondanceFolders") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("diplomaticDocuments")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

/** Récupère une cible par ID (interne) */
export const internalGetTarget = rawInternalQuery({
  args: { targetId: v.id("diplomaticTargets") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.targetId);
  },
});

/** Récupère un plan par ID (interne) */
export const internalGetPlan = rawInternalQuery({
  args: { planId: v.id("diplomaticPlans") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.planId);
  },
});

/** Récupère une lettre par ID (interne) */
export const internalGetLetter = rawInternalQuery({
  args: { letterId: v.id("diplomaticLetters") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.letterId);
  },
});

/** Récupère un rapport par ID (interne) */
export const internalGetReport = rawInternalQuery({
  args: { reportId: v.id("diplomaticReports") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.reportId);
  },
});

/** Récupère un projet par ID (interne) */
export const internalGetProject = rawInternalQuery({
  args: { projectId: v.id("diplomaticProjects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.projectId);
  },
});

/** Récupère le pipeline complet d'une cible (plans, lettres, projets) */
export const internalGetTargetPipeline = rawInternalQuery({
  args: { targetId: v.id("diplomaticTargets") },
  handler: async (ctx, args) => {
    const plans = await ctx.db
      .query("diplomaticPlans")
      .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const letters = await ctx.db
      .query("diplomaticLetters")
      .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const projects = await ctx.db
      .query("diplomaticProjects")
      .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    return { plans, letters, projects };
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// INTERNAL MUTATIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Crée l'arborescence de dossiers dans iDocument pour une cible.
 * Structure : Opérateurs Économiques / {Secteur} / {Nom Cible}
 *
 * Idempotent : ne crée pas de doublon si le dossier existe déjà.
 */
export const internalEnsureOperatorFolders = rawInternalMutation({
  args: {
    orgId: v.id("orgs"),
    targetId: v.id("diplomaticTargets"),
    targetName: v.string(),
    sector: v.string(),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const sector = args.sector || "Autre";

    // Vérifier si le dossier cible existe déjà (via tag)
    const targetTag = `${TAG_PREFIX}${args.targetId}`;
    const existingFolders = await ctx.db
      .query("correspondanceFolders")
      .withIndex("by_org_deleted", (q) =>
        q.eq("orgId", args.orgId).eq("deletedAt", undefined),
      )
      .collect();

    const existingTarget = existingFolders.find((f) =>
      f.tags.includes(targetTag),
    );
    if (existingTarget) return existingTarget._id;

    // 1. Chercher/créer le dossier racine "Opérateurs Économiques"
    let rootFolder = existingFolders.find(
      (f) => f.name === ROOT_FOLDER_NAME && !f.parentFolderId,
    );
    if (!rootFolder) {
      const rootId = await ctx.db.insert("correspondanceFolders", {
        orgId: args.orgId,
        createdBy: args.createdBy,
        name: ROOT_FOLDER_NAME,
        tags: ["diplomatic:root"],
        createdAt: now,
        updatedAt: now,
      });
      rootFolder = (await ctx.db.get(rootId)) ?? undefined;
    }

    // 2. Chercher/créer le sous-dossier secteur
    let sectorFolder = existingFolders.find(
      (f) =>
        f.name === sector && f.parentFolderId === rootFolder!._id,
    );
    if (!sectorFolder) {
      const sectorId = await ctx.db.insert("correspondanceFolders", {
        orgId: args.orgId,
        createdBy: args.createdBy,
        name: sector,
        parentFolderId: rootFolder!._id,
        tags: ["diplomatic:sector"],
        createdAt: now,
        updatedAt: now,
      });
      sectorFolder = (await ctx.db.get(sectorId)) ?? undefined;
    }

    // 3. Créer le sous-dossier cible
    const targetFolderId = await ctx.db.insert("correspondanceFolders", {
      orgId: args.orgId,
      createdBy: args.createdBy,
      name: args.targetName,
      parentFolderId: sectorFolder!._id,
      tags: [targetTag, "diplomatic:target"],
      createdAt: now,
      updatedAt: now,
    });

    // 4. Déclencher la génération de la fiche cible
    await ctx.scheduler.runAfter(
      0,
      internal.functions.diplomaticFoldersActions.generateTargetFiche,
      { targetId: args.targetId },
    );

    return targetFolderId;
  },
});

/** Ajoute un document au registre diplomaticDocuments */
export const internalAddDocument = rawInternalMutation({
  args: {
    orgId: v.id("orgs"),
    folderId: v.id("correspondanceFolders"),
    targetId: v.id("diplomaticTargets"),
    sourceType: docSourceTypeValidator,
    sourceId: v.string(),
    subfolder: v.string(),
    filename: v.string(),
    format: docFormatValidator,
    storageId: v.id("_storage"),
    sizeBytes: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Déterminer la version (incrémenter si même source + même format)
    const existing = await ctx.db
      .query("diplomaticDocuments")
      .withIndex("by_target_source", (q) =>
        q
          .eq("targetId", args.targetId)
          .eq("sourceType", args.sourceType)
          .eq("sourceId", args.sourceId),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("format"), args.format),
          q.eq(q.field("deletedAt"), undefined),
        ),
      )
      .collect();

    const version =
      existing.length > 0
        ? Math.max(...existing.map((d) => d.version)) + 1
        : 1;

    // Soft-delete les versions précédentes du même document+format
    for (const prev of existing) {
      await ctx.db.patch(prev._id, { deletedAt: now });
    }

    // Insérer le nouveau document
    return await ctx.db.insert("diplomaticDocuments", {
      orgId: args.orgId,
      folderId: args.folderId,
      targetId: args.targetId,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      subfolder: args.subfolder,
      filename: args.filename,
      format: args.format,
      storageId: args.storageId,
      sizeBytes: args.sizeBytes,
      version,
      generatedAt: now,
    });
  },
});

/** Marque le dossier comme exporté */
export const internalMarkExported = rawInternalMutation({
  args: { folderId: v.id("correspondanceFolders") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.folderId, {
      updatedAt: Date.now(),
    });
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// PUBLIC MUTATIONS
// ═════════════════════════════════════════════════════════════════════════════

/** Déclenche l'export ZIP du dossier d'une cible */
export const requestZipExport = authMutation({
  args: { targetId: v.id("diplomaticTargets") },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(
      0,
      internal.functions.diplomaticFoldersActions.exportAsZip,
      { targetId: args.targetId },
    );
  },
});
