/**
 * Dossiers Opérateurs Économiques — Fonctions Convex
 *
 * Gestion des dossiers virtuels dans iDocument (documentFolders)
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
import { DocumentStatus } from "../lib/constants";
import {
  docSourceTypeValidator,
  docFormatValidator,
} from "../schemas/diplomaticAffairs";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

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

    // Résoudre les URLs et grouper par sourceType
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

    // Récupérer le dossier cible dans iDocument (documentFolders)
    const target = await ctx.db.get(args.targetId);
    let targetFolder = null;
    if (target) {
      const targetTag = `${TAG_PREFIX}${args.targetId}`;
      const folders = await ctx.db
        .query("documentFolders")
        .withIndex("by_org", (q) => q.eq("orgId", target.orgId))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect();
      targetFolder = folders.find((f) => f.tags.includes(targetTag)) ?? null;
    }

    return {
      folder: targetFolder,
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
    const allFolders = await ctx.db
      .query("documentFolders")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const rootFolder = allFolders.find(
      (f) => f.name === ROOT_FOLDER_NAME && !f.parentFolderId,
    );
    if (!rootFolder) return { sectors: {}, totalFolders: 0, totalDocuments: 0 };

    const sectorFolders = allFolders.filter(
      (f) => f.parentFolderId === rootFolder._id,
    );

    // Charger TOUS les documents diplomatiques de l'org en une seule query
    // (evite le N+1 : avant on faisait 1 query par dossier cible)
    const allDocs = await ctx.db
      .query("diplomaticDocuments")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Grouper les documents par folderId en memoire
    const docCountByFolder = new Map<string, number>();
    for (const d of allDocs) {
      docCountByFolder.set(
        d.folderId,
        (docCountByFolder.get(d.folderId) ?? 0) + 1,
      );
    }

    // Charger les cibles pour enrichir les cartes (phase pipeline, score)
    const targetIds = new Set<string>();
    for (const f of allFolders) {
      const tag = f.tags.find((t) => t.startsWith(TAG_PREFIX));
      if (tag) targetIds.add(tag.replace(TAG_PREFIX, ""));
    }
    const targetsMap = new Map<string, { pipelinePhase?: string; opportunityScore?: number }>();
    for (const tid of targetIds) {
      const t = await ctx.db.get(tid as Id<"diplomaticTargets">);
      if (t && !t.deletedAt) {
        targetsMap.set(tid, {
          pipelinePhase: t.pipelinePhase,
          opportunityScore: t.opportunityScore,
        });
      }
    }

    const sectors: Record<
      string,
      Array<{
        folderId: string;
        name: string;
        targetId: string | null;
        documentCount: number;
        pipelinePhase: string | null;
        opportunityScore: number | null;
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
        const docCount = docCountByFolder.get(tf._id) ?? 0;
        const targetInfo = targetId ? targetsMap.get(targetId) : null;

        totalDocuments += docCount;
        totalFolders++;

        entries.push({
          folderId: tf._id,
          name: tf.name,
          targetId,
          documentCount: docCount,
          pipelinePhase: targetInfo?.pipelinePhase ?? null,
          opportunityScore: targetInfo?.opportunityScore ?? null,
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
    const target = await ctx.db.get(args.targetId);
    if (!target) return null;

    const targetTag = `${TAG_PREFIX}${args.targetId}`;
    const folders = await ctx.db
      .query("documentFolders")
      .withIndex("by_org", (q) => q.eq("orgId", target.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    return folders.find((f) => f.tags.includes(targetTag)) ?? null;
  },
});

/** Récupère tous les documents d'un dossier */
export const internalGetFolderDocuments = rawInternalQuery({
  args: { folderId: v.id("documentFolders") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("diplomaticDocuments")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

/** Nettoie les dossiers secteur orphelins (sans cible enfant active) */
export const internalCleanOrphanFolders = rawInternalMutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const folders = await ctx.db
      .query("documentFolders")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const root = folders.find(
      (f) => f.name === ROOT_FOLDER_NAME && !f.parentFolderId,
    );
    if (!root) return { deleted: 0 };

    let deleted = 0;

    // Trouver les dossiers secteur
    const sectorFolders = folders.filter(
      (f) => f.parentFolderId === root._id && f.tags.includes("diplomatique"),
    );

    for (const sf of sectorFolders) {
      // Compter les enfants (dossiers cible)
      const children = folders.filter((f) => f.parentFolderId === sf._id);
      if (children.length === 0) {
        // Pas d'enfant → orphelin, supprimer
        await ctx.db.delete(sf._id);
        deleted++;
      }
    }

    // Supprimer les dossiers cible dont la cible n'existe plus
    const targetFolders = folders.filter((f) =>
      f.tags.some((t) => t.startsWith(TAG_PREFIX)),
    );
    for (const tf of targetFolders) {
      const targetTag = tf.tags.find((t) => t.startsWith(TAG_PREFIX));
      if (!targetTag) continue;
      const targetId = targetTag.replace(TAG_PREFIX, "");
      const target = await ctx.db.get(targetId as Id<"diplomaticTargets">);
      if (!target) {
        await ctx.db.delete(tf._id);
        deleted++;
        // Re-check parent secteur
        const parentChildren = folders.filter(
          (f) => f.parentFolderId === tf.parentFolderId && f._id !== tf._id,
        );
        if (parentChildren.length === 0 && tf.parentFolderId) {
          await ctx.db.delete(tf.parentFolderId);
          deleted++;
        }
      }
    }

    return { deleted };
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

/** Récupère le pipeline complet d'une cible */
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
 * Crée l'arborescence de dossiers dans iDocument (documentFolders) pour une cible.
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
      .query("documentFolders")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const existingTarget = existingFolders.find((f) =>
      f.tags.includes(targetTag),
    );
    if (existingTarget) return existingTarget._id;

    // Fonction utilitaire : chercher ou créer un dossier (anti-doublon)
    const findOrCreate = async (
      name: string,
      parentFolderId: string | undefined,
      tags: string[],
    ) => {
      // Toujours re-query pour éviter les race conditions
      const fresh = await ctx.db
        .query("documentFolders")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect();

      const existing = fresh.find(
        (f) =>
          f.name === name &&
          (parentFolderId
            ? f.parentFolderId === parentFolderId
            : !f.parentFolderId),
      );
      if (existing) return existing;

      const id = await ctx.db.insert("documentFolders", {
        orgId: args.orgId,
        createdBy: args.createdBy,
        name,
        parentFolderId: parentFolderId as any,
        tags,
        isSystem: false,
        createdAt: now,
        updatedAt: now,
      });
      const inserted = await ctx.db.get(id);
      if (!inserted) throw new Error(`Échec création dossier ${name}`);
      return inserted;
    };

    // 1. Chercher/créer le dossier racine "Opérateurs Économiques"
    const rootFolder = await findOrCreate(
      ROOT_FOLDER_NAME,
      undefined,
      ["diplomatique", "operateurs"],
    );

    // 2. Chercher/créer le sous-dossier secteur
    const sectorFolder = await findOrCreate(
      sector,
      rootFolder._id,
      ["diplomatique", "secteur"],
    );

    // 3. Créer le sous-dossier cible
    const targetFolderId = await ctx.db.insert("documentFolders", {
      orgId: args.orgId,
      createdBy: args.createdBy,
      name: args.targetName,
      parentFolderId: sectorFolder._id,
      tags: [targetTag, "diplomatique", "cible"],
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    });

    // 4. Déclencher la génération de la fiche cible PDF
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
    folderId: v.id("documentFolders"),
    targetId: v.id("diplomaticTargets"),
    sourceType: docSourceTypeValidator,
    sourceId: v.string(),
    subfolder: v.string(),
    filename: v.string(),
    format: docFormatValidator,
    storageId: v.id("_storage"),
    sizeBytes: v.number(),
    isDraft: v.optional(v.boolean()),
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

    // Insérer dans diplomaticDocuments (registre de liaison)
    const dipDocId = await ctx.db.insert("diplomaticDocuments", {
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

    // Soft-delete les anciennes versions dans la table documents (iDocument)
    // (utilise soft-delete au lieu de hard-delete pour preserver l'audit trail)
    const oldDocs = await ctx.db
      .query("documents")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .collect();
    for (const old of oldDocs) {
      if (
        old.label === args.filename &&
        old.deletedAt === undefined
      ) {
        await ctx.db.patch(old._id, { deletedAt: now, updatedAt: now });
      }
    }

    // Insérer dans documents (table iDocument) pour qu'il apparaisse dans l'UI
    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    };

    // DOCX brouillons → pas de folderId (apparaissent dans "Brouillons" à la racine)
    // PDF/PPTX approuvés → folderId du dossier cible
    const docInsert: Record<string, unknown> = {
      ownerId: args.orgId,
      files: [
        {
          storageId: args.storageId,
          filename: args.filename,
          mimeType: mimeTypes[args.format] ?? "application/octet-stream",
          sizeBytes: args.sizeBytes,
          uploadedAt: now,
        },
      ],
      label: args.filename,
      status: args.isDraft ? DocumentStatus.Pending : DocumentStatus.Validated,
      updatedAt: now,
    };

    // Seulement mettre dans le dossier cible si ce n'est PAS un brouillon
    if (!args.isDraft) {
      docInsert.folderId = args.folderId;
    }

    await ctx.db.insert("documents", docInsert);

    return dipDocId;
  },
});

/** Marque le dossier comme exporté */
export const internalMarkExported = rawInternalMutation({
  args: { folderId: v.id("documentFolders") },
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
