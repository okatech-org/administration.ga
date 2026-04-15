# Prompt d'implémentation — Système de Dossiers Opérateurs Économiques

> **Module :** Affaires Diplomatiques  
> **Projet :** consulat.ga (gabon-diplomatie)  
> **Date :** 8 avril 2026  
> **Prérequis :** Lire `convex/_generated/ai/guidelines.md` avant tout code Convex.

---

## Contexte

Le module **Affaires Diplomatiques** gère un pipeline IA en 5 phases :
**Cibles → Plan Stratégique → Lettres → Rapports → Projets**

Chaque phase est portée par une table Convex dédiée dans `convex/schemas/diplomaticAffairs.ts` et des fonctions CRUD dans `convex/functions/diplomaticAffairs.ts`. L'IA (Gemini 2.5 Flash) est dans `convex/ai/diplomaticAI.ts`.

**Problème actuel :** Quand une cible est identifiée, il n'existe aucun système pour organiser les documents produits (plans, lettres, rapports, projets) dans une arborescence structurée et exportable.

**Solution :** Créer un système **hybride** :
1. **Convex Storage** gère la structure virtuelle (métadonnées, liens aux documents)
2. Un bouton **« Exporter le dossier »** génère l'arborescence complète en ZIP téléchargeable

---

## Architecture cible

### Arborescence par secteur → cible

```
📁 Opérateurs Économiques/
    📁 {Secteur}/                          ← ex: "Énergie Renouvelable"
        📁 {Nom Cible}/                    ← ex: "Acciona S.A."
            📄 Fiche_Cible_{Nom}.docx      ← AUTO-GÉNÉRÉE à la création
            📄 Fiche_Cible_{Nom}.pdf       ← AUTO-GÉNÉRÉE à la création
            📁 Plans Stratégiques/
                📄 Plan_{Catégorie}_{Nom}_{Année}.pptx
                📄 Plan_{Catégorie}_{Nom}_{Année}.pdf
            📁 Lettres/
                📄 {Référence}_{Type}.docx
                📄 {Référence}_{Type}.pdf
            📁 Rapports/
                📄 Rapport_{Type}_{Période}.docx
                📄 Rapport_{Type}_{Période}.pdf
            📁 Projets/
                📄 Projet_{Référence}_{Titre}.docx
                📄 Projet_{Référence}_{Titre}.pdf
```

### Formats des documents
- **DOCX** — Documents Word éditables (lettres, rapports, fiches, projets)
- **PPTX** — Présentations PowerPoint (plans stratégiques uniquement)
- **PDF** — Version archivage/envoi officiel de chaque document

---

## Phase 1 — Schema Convex (2 nouvelles tables)

### Fichier : `convex/schemas/diplomaticAffairs.ts`

Ajouter **en dessous** des tables existantes (`diplomaticPrioritiesTable`) les 2 nouvelles tables.

#### Table 1 : `diplomaticFoldersTable`

```typescript
// ─── Dossiers Opérateurs Économiques ───────────────────────────────────────

export const folderStatusValidator = v.union(
  v.literal("active"),
  v.literal("archived"),
  v.literal("exported"),
);

export const diplomaticFoldersTable = defineTable({
  orgId: v.id("orgs"),
  createdBy: v.id("users"),
  targetId: v.id("diplomaticTargets"),

  // Structure du dossier
  sector: v.string(),                    // Secteur d'activité (clé de regroupement)
  targetName: v.string(),                // Nom de la cible (dénormalisé pour perf)
  folderPath: v.string(),                // Chemin virtuel : "Secteur/NomCible"

  // Fiche cible auto-générée
  ficheDocxStorageId: v.optional(v.id("_storage")),
  fichePdfStorageId: v.optional(v.id("_storage")),
  ficheGeneratedAt: v.optional(v.number()),

  // Statistiques dénormalisées
  documentCount: v.number(),             // Nombre total de documents dans le dossier
  lastDocumentAt: v.optional(v.number()), // Date du dernier document ajouté

  // Gestion
  status: folderStatusValidator,
  lastExportedAt: v.optional(v.number()),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
  deletedAt: v.optional(v.number()),
})
  .index("by_org", ["orgId"])
  .index("by_org_sector", ["orgId", "sector"])
  .index("by_target", ["targetId"])
  .index("by_org_status", ["orgId", "status"]);
```

#### Table 2 : `diplomaticDocumentsTable`

```typescript
// ─── Documents du dossier opérateur ────────────────────────────────────────

export const docSourceTypeValidator = v.union(
  v.literal("fiche"),
  v.literal("plan"),
  v.literal("letter"),
  v.literal("report"),
  v.literal("project"),
);

export const docFormatValidator = v.union(
  v.literal("docx"),
  v.literal("pptx"),
  v.literal("pdf"),
);

export const diplomaticDocumentsTable = defineTable({
  orgId: v.id("orgs"),
  folderId: v.id("diplomaticFolders"),
  
  // Source
  sourceType: docSourceTypeValidator,    // Type d'entité source
  sourceId: v.string(),                  // ID Convex de l'entité (plan, lettre, etc.)
  
  // Organisation
  subfolder: v.string(),                 // "Plans Stratégiques" | "Lettres" | "Rapports" | "Projets" | ""
  filename: v.string(),                  // Nom du fichier généré
  format: docFormatValidator,            // docx | pptx | pdf
  
  // Stockage
  storageId: v.id("_storage"),
  sizeBytes: v.number(),
  
  // Versioning
  version: v.number(),                   // Numéro de version (incrémental)
  
  // Timestamps
  generatedAt: v.number(),
  deletedAt: v.optional(v.number()),
})
  .index("by_folder", ["folderId"])
  .index("by_folder_subfolder", ["folderId", "subfolder"])
  .index("by_folder_source", ["folderId", "sourceType", "sourceId"])
  .index("by_org", ["orgId"]);
```

### Fichier : `convex/schema.ts`

Ajouter les imports et les enregistrements :

```typescript
// Dans les imports (avec les autres imports diplomatiques)
import {
  // ... imports existants ...
  diplomaticFoldersTable,
  diplomaticDocumentsTable,
} from "./schemas/diplomaticAffairs";

// Dans defineSchema({...})
  diplomaticFolders: diplomaticFoldersTable,
  diplomaticDocuments: diplomaticDocumentsTable,
```

### Fichier : `convex/schemas/index.ts`

Ajouter les exports :

```typescript
export {
  // ... exports existants ...
  diplomaticFoldersTable,
  diplomaticDocumentsTable,
} from "./diplomaticAffairs";
```

---

## Phase 2 — Fonctions Convex (nouveau fichier)

### Fichier à créer : `convex/functions/diplomaticFolders.ts`

Ce fichier gère le CRUD des dossiers et documents. **NE PAS** modifier `diplomaticAffairs.ts` directement pour le CRUD des dossiers — respecter la convention 1 module = 1 fichier.

```typescript
/**
 * Dossiers Opérateurs Économiques — Fonctions Convex
 *
 * Gestion des dossiers virtuels et documents associés aux cibles diplomatiques.
 * Structure : Secteur / Cible / Sous-dossiers (Plans, Lettres, Rapports, Projets)
 */

import { v } from "convex/values";
import {
  internalMutation as rawInternalMutation,
  internalQuery as rawInternalQuery,
  internalAction as rawInternalAction,
} from "../_generated/server";
import { authMutation, authQuery, authAction } from "../lib/customFunctions";
import {
  folderStatusValidator,
  docSourceTypeValidator,
  docFormatValidator,
} from "../schemas/diplomaticAffairs";
import { internal } from "../_generated/api";

// NOTE: Ce projet utilise les patterns suivants pour les custom functions :
//   - authQuery / authMutation / authAction  → endpoints publics authentifiés
//   - rawInternalMutation / rawInternalQuery  → endpoints internes (pas d'auth, pas de triggers)
//   - triggeredInternalMutation              → interne avec triggers (audit/aggregates)
//   - ctx.scheduler.runAfter(0, internal.xxx) → appel async cross-mutation
```

#### 2.1 — Queries

```typescript
// ─── Queries ─────────────────────────────────────────────────────────────────

/** Récupère le dossier d'une cible avec tous ses documents */
export const getFolderByTarget = authQuery({
  args: { targetId: v.id("diplomaticTargets") },
  handler: async (ctx, args) => {
    const folder = await ctx.db
      .query("diplomaticFolders")
      .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .first();

    if (!folder) return null;

    const documents = await ctx.db
      .query("diplomaticDocuments")
      .withIndex("by_folder", (q) => q.eq("folderId", folder._id))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Grouper par sous-dossier
    const bySubfolder: Record<string, typeof documents> = {};
    for (const doc of documents) {
      const key = doc.subfolder || "racine";
      if (!bySubfolder[key]) bySubfolder[key] = [];
      bySubfolder[key].push(doc);
    }

    // Résoudre les URLs de téléchargement
    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => ({
        ...doc,
        url: await ctx.storage.getUrl(doc.storageId),
      }))
    );

    return {
      folder,
      documents: documentsWithUrls,
      bySubfolder,
    };
  },
});

/** Liste les dossiers groupés par secteur pour la vue d'ensemble */
export const listFoldersBySector = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const folders = await ctx.db
      .query("diplomaticFolders")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Grouper par secteur
    const bySector: Record<string, typeof folders> = {};
    for (const folder of folders) {
      const sector = folder.sector || "Autre";
      if (!bySector[sector]) bySector[sector] = [];
      bySector[sector].push(folder);
    }

    return { folders, bySector, totalFolders: folders.length };
  },
});

/** Statistiques d'un dossier */
export const getFolderStats = authQuery({
  args: { folderId: v.id("diplomaticFolders") },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("diplomaticDocuments")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const stats = {
      total: documents.length,
      byType: { fiche: 0, plan: 0, letter: 0, report: 0, project: 0 },
      byFormat: { docx: 0, pptx: 0, pdf: 0 },
      totalSizeBytes: 0,
      lastUpdate: 0,
    };

    for (const doc of documents) {
      stats.byType[doc.sourceType]++;
      stats.byFormat[doc.format]++;
      stats.totalSizeBytes += doc.sizeBytes;
      if (doc.generatedAt > stats.lastUpdate) stats.lastUpdate = doc.generatedAt;
    }

    return stats;
  },
});
```

#### 2.2 — Mutations

```typescript
// ─── Mutations ───────────────────────────────────────────────────────────────

/** Crée le dossier virtuel pour une cible (appelé automatiquement par createTarget) */
export const createTargetFolder = authMutation({
  args: {
    orgId: v.id("orgs"),
    targetId: v.id("diplomaticTargets"),
    targetName: v.string(),
    sector: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const sector = args.sector || "Autre";
    const folderPath = `${sector}/${args.targetName}`;

    // Vérifier qu'un dossier n'existe pas déjà pour cette cible
    const existing = await ctx.db
      .query("diplomaticFolders")
      .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
      .first();

    if (existing) return existing._id;

    const folderId = await ctx.db.insert("diplomaticFolders", {
      orgId: args.orgId,
      createdBy: ctx.user._id,
      targetId: args.targetId,
      sector,
      targetName: args.targetName,
      folderPath,
      documentCount: 0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    // Déclencher la génération de la fiche cible (async)
    await ctx.scheduler.runAfter(0, internal.functions.diplomaticFolders.generateAndStoreFiche, {
      folderId,
      targetId: args.targetId,
    });

    return folderId;
  },
});

/** Rattache un document généré au dossier d'une cible */
export const addDocumentToFolder = authMutation({
  args: {
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

    // Trouver le dossier de la cible
    const folder = await ctx.db
      .query("diplomaticFolders")
      .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .first();

    if (!folder) {
      throw new Error("Dossier introuvable pour cette cible. Le dossier doit être créé avant d'y ajouter des documents.");
    }

    // Déterminer la version (incrémenter si même source + même format)
    const existing = await ctx.db
      .query("diplomaticDocuments")
      .withIndex("by_folder_source", (q) =>
        q.eq("folderId", folder._id).eq("sourceType", args.sourceType).eq("sourceId", args.sourceId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("format"), args.format),
          q.eq(q.field("deletedAt"), undefined)
        )
      )
      .collect();

    const version = existing.length > 0
      ? Math.max(...existing.map((d) => d.version)) + 1
      : 1;

    // Soft-delete les versions précédentes du même document+format
    for (const prev of existing) {
      await ctx.db.patch(prev._id, { deletedAt: now });
    }

    // Créer le nouveau document
    const docId = await ctx.db.insert("diplomaticDocuments", {
      orgId: folder.orgId,
      folderId: folder._id,
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

    // Mettre à jour les compteurs du dossier
    const allDocs = await ctx.db
      .query("diplomaticDocuments")
      .withIndex("by_folder", (q) => q.eq("folderId", folder._id))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    await ctx.db.patch(folder._id, {
      documentCount: allDocs.length,
      lastDocumentAt: now,
      updatedAt: now,
    });

    return docId;
  },
});

/** Régénère la fiche cible (appelé à chaque changement de phase) */
export const regenerateTargetFiche = authMutation({
  args: { targetId: v.id("diplomaticTargets") },
  handler: async (ctx, args) => {
    const folder = await ctx.db
      .query("diplomaticFolders")
      .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .first();

    if (!folder) return;

    await ctx.scheduler.runAfter(0, internal.functions.diplomaticFolders.generateAndStoreFiche, {
      folderId: folder._id,
      targetId: args.targetId,
    });
  },
});

/** Archive un dossier */
export const archiveFolder = authMutation({
  args: { folderId: v.id("diplomaticFolders") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.folderId, {
      status: "archived",
      updatedAt: Date.now(),
    });
  },
});
```

#### 2.3 — Actions (async, génération de fichiers)

```typescript
// ─── Actions (génération de fichiers) ────────────────────────────────────────

/** Génère la fiche cible DOCX + PDF et la stocke */
export const generateAndStoreFiche = rawInternalAction({
  args: {
    folderId: v.id("diplomaticFolders"),
    targetId: v.id("diplomaticTargets"),
  },
  handler: async (ctx, args) => {
    // 1. Récupérer les données de la cible
    const target = await ctx.runQuery(internal.functions.diplomaticAffairs.getTarget, {
      targetId: args.targetId,
    });
    if (!target) throw new Error("Cible introuvable");

    // 2. Récupérer les stats pipeline
    const pipeline = await ctx.runQuery(internal.functions.diplomaticAffairs.getTargetPipeline, {
      targetId: args.targetId,
    });

    // 3. Générer le DOCX avec docx-js
    //    IMPORTANT : Utiliser le même pattern que le SKILL docx
    //    - Arial comme police par défaut
    //    - Bandeau tricolore gabonais en en-tête (décoratif uniquement)
    //    - Format A4 (11906 x 16838 DXA)
    //    - Sections : Identification, Contact, Évaluation, Analyse IA, Pipeline
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
            Header, Footer, HeadingLevel, BorderStyle, WidthType, ShadingType,
            AlignmentType, PageNumber } = require("docx");

    const doc = buildFicheDocument(target, pipeline);
    const docxBuffer = await Packer.toBuffer(doc);

    // 4. Stocker le DOCX
    const docxBlob = new Blob([docxBuffer], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
    const docxStorageId = await ctx.storage.store(docxBlob);

    // 5. Convertir en PDF (via LibreOffice headless ou API externe)
    //    Option A : LibreOffice dans l'action Convex (si disponible)
    //    Option B : API externe (gotenberg, cloudconvert, etc.)
    //    Option C : Stocker uniquement le DOCX pour le MVP, PDF en phase 2
    // const pdfStorageId = await convertToPdf(ctx, docxBuffer);

    // 6. Mettre à jour le dossier avec les storageIds
    const now = Date.now();
    await ctx.runMutation(internal.functions.diplomaticFolders.updateFolderFiche, {
      folderId: args.folderId,
      ficheDocxStorageId: docxStorageId,
      // fichePdfStorageId: pdfStorageId,
      ficheGeneratedAt: now,
    });

    // 7. Ajouter le document DOCX au registre
    const sanitizedName = target.name.replace(/[^a-zA-Z0-9À-ÿ\s.-]/g, "").replace(/\s+/g, "_");
    await ctx.runMutation(internal.functions.diplomaticFolders.internalAddDocument, {
      folderId: args.folderId,
      orgId: target.orgId,
      sourceType: "fiche",
      sourceId: args.targetId,
      subfolder: "",
      filename: `Fiche_Cible_${sanitizedName}.docx`,
      format: "docx",
      storageId: docxStorageId,
      sizeBytes: docxBuffer.byteLength,
    });
  },
});

/** Export ZIP de tout le dossier */
export const exportFolderAsZip = authAction({
  args: { folderId: v.id("diplomaticFolders") },
  handler: async (ctx, args) => {
    // 1. Récupérer le dossier et ses documents
    const folder = await ctx.runQuery(internal.functions.diplomaticFolders.internalGetFolder, {
      folderId: args.folderId,
    });
    if (!folder) throw new Error("Dossier introuvable");

    const documents = await ctx.runQuery(internal.functions.diplomaticFolders.internalGetFolderDocuments, {
      folderId: args.folderId,
    });

    // 2. Construire le ZIP avec archiver ou JSZip
    const JSZip = require("jszip");
    const zip = new JSZip();

    const basePath = `Opérateurs Économiques/${folder.folderPath}`;

    for (const doc of documents) {
      const fileBuffer = await ctx.storage.get(doc.storageId);
      if (!fileBuffer) continue;

      const filePath = doc.subfolder
        ? `${basePath}/${doc.subfolder}/${doc.filename}`
        : `${basePath}/${doc.filename}`;

      zip.file(filePath, fileBuffer);
    }

    // 3. Générer et stocker le ZIP
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const zipBlob = new Blob([zipBuffer], { type: "application/zip" });
    const zipStorageId = await ctx.storage.store(zipBlob);

    // 4. Mettre à jour le timestamp d'export
    await ctx.runMutation(internal.functions.diplomaticFolders.markExported, {
      folderId: args.folderId,
    });

    // 5. Retourner l'URL de téléchargement
    const zipUrl = await ctx.storage.getUrl(zipStorageId);
    return { zipUrl, zipStorageId, fileCount: documents.length };
  },
});
```

#### 2.4 — Internal mutations (appelées par les actions)

```typescript
// ─── Internal mutations (appelées par les actions) ───────────────────────────

export const updateFolderFiche = rawInternalMutation({
  args: {
    folderId: v.id("diplomaticFolders"),
    ficheDocxStorageId: v.id("_storage"),
    fichePdfStorageId: v.optional(v.id("_storage")),
    ficheGeneratedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {
      ficheDocxStorageId: args.ficheDocxStorageId,
      ficheGeneratedAt: args.ficheGeneratedAt,
      updatedAt: Date.now(),
    };
    if (args.fichePdfStorageId) {
      patch.fichePdfStorageId = args.fichePdfStorageId;
    }
    await ctx.db.patch(args.folderId, patch);
  },
});

export const internalAddDocument = rawInternalMutation({
  args: {
    folderId: v.id("diplomaticFolders"),
    orgId: v.id("orgs"),
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
    await ctx.db.insert("diplomaticDocuments", {
      orgId: args.orgId,
      folderId: args.folderId,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      subfolder: args.subfolder,
      filename: args.filename,
      format: args.format,
      storageId: args.storageId,
      sizeBytes: args.sizeBytes,
      version: 1,
      generatedAt: now,
    });

    // Mettre à jour le compteur
    const allDocs = await ctx.db
      .query("diplomaticDocuments")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    await ctx.db.patch(args.folderId, {
      documentCount: allDocs.length,
      lastDocumentAt: now,
      updatedAt: now,
    });
  },
});

export const markExported = rawInternalMutation({
  args: { folderId: v.id("diplomaticFolders") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.folderId, {
      lastExportedAt: Date.now(),
      status: "exported",
      updatedAt: Date.now(),
    });
  },
});

export const internalGetFolder = rawInternalQuery({
  args: { folderId: v.id("diplomaticFolders") },
  handler: async (ctx, args) => ctx.db.get(args.folderId),
});

export const internalGetFolderDocuments = rawInternalQuery({
  args: { folderId: v.id("diplomaticFolders") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("diplomaticDocuments")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});
```

---

## Phase 3 — Hooks sur les mutations existantes

### Fichier : `convex/functions/diplomaticAffairs.ts`

**IMPORTANT :** Ces modifications sont des ajouts **à la fin** des handlers existants. Ne pas réécrire les mutations, juste ajouter les appels au système de dossiers.

#### 3.1 — Hook sur `createTarget` (ligne ~95-107)

Ajouter **après** le `ctx.db.insert(...)` et **avant** le `return` :

```typescript
// Dans createTarget, après l'insert et avant le return :
const targetId = await ctx.db.insert("diplomaticTargets", { ... });

// ── Hook : créer le dossier opérateur ──
await ctx.scheduler.runAfter(0, internal.functions.diplomaticFolders.createTargetFolder, {
  orgId: args.orgId,
  targetId,
  targetName: args.name,
  sector: args.sector || "Autre",
});

return targetId;
```

> **Note :** On utilise `ctx.scheduler.runAfter(0, ...)` plutôt qu'un appel direct car `createTargetFolder` est une mutation qui déclenche elle-même une action async. Cela évite les problèmes de transaction imbriquée.

#### 3.2 — Hook sur `advancePhase` (ligne ~141-163)

Ajouter **après** le `ctx.db.patch(...)` :

```typescript
// Dans advancePhase, après le patch :
await ctx.db.patch(args.targetId, {
  pipelinePhase: args.newPhase,
  updatedAt: Date.now(),
});

// ── Hook : régénérer la fiche cible ──
await ctx.scheduler.runAfter(0, internal.functions.diplomaticFolders.regenerateTargetFiche, {
  targetId: args.targetId,
});
```

#### 3.3 — Hook sur `createPlan` (ligne ~265-317)

Ajouter **après** l'insert, si `targetId` est fourni :

```typescript
const planId = await ctx.db.insert("diplomaticPlans", { ... });

// ── Hook : déclencher génération PPTX pour le dossier ──
if (args.targetId) {
  await ctx.scheduler.runAfter(0, internal.functions.diplomaticFolders.generatePlanDocument, {
    planId,
    targetId: args.targetId,
  });
}

return planId;
```

#### 3.4 — Hook sur `updateLetterStatus` (ligne ~483-504)

Ajouter une condition **quand le statut passe à `approved`** :

```typescript
// Dans updateLetterStatus, après le patch :
if (args.status === "approved") {
  const letter = await ctx.db.get(args.letterId);
  if (letter?.targetId) {
    await ctx.scheduler.runAfter(0, internal.functions.diplomaticFolders.generateLetterDocument, {
      letterId: args.letterId,
      targetId: letter.targetId,
    });
  }
}
```

#### 3.5 — Hook sur `updateReportStatus` (ligne ~606-625)

Ajouter une condition **quand le statut passe à `submitted`** :

```typescript
// Dans updateReportStatus, après le patch :
if (args.status === "submitted") {
  const report = await ctx.db.get(args.reportId);
  if (report?.targetIds && report.targetIds.length > 0) {
    // Ajouter le rapport au dossier de chaque cible concernée
    for (const targetId of report.targetIds) {
      await ctx.scheduler.runAfter(0, internal.functions.diplomaticFolders.generateReportDocument, {
        reportId: args.reportId,
        targetId,
      });
    }
  }
}
```

#### 3.6 — Hook sur `updateProjectStatus` (ligne ~770-797)

Ajouter une condition **quand le statut passe à `validated`** :

```typescript
// Dans updateProjectStatus, après le patch :
if (args.status === "validated") {
  const project = await ctx.db.get(args.projectId);
  if (project?.targetId) {
    await ctx.scheduler.runAfter(0, internal.functions.diplomaticFolders.generateProjectDocument, {
      projectId: args.projectId,
      targetId: project.targetId,
    });
  }
}
```

---

## Phase 4 — Générateurs de documents (Actions)

### Fichier : `convex/functions/diplomaticFolders.ts` (suite)

Ajouter les actions de génération pour chaque type de document.

#### 4.1 — Fonction utilitaire : `buildFicheDocument`

```typescript
/**
 * Construit le Document docx-js pour la fiche cible.
 * 
 * RÈGLES DESIGN (voir DESIGN_CHARTER.md) :
 * - Police : Arial
 * - Couleurs Gabon (vert #009E49 / jaune #FCD116 / bleu #3A75C4) = décoratif uniquement
 * - Palette achromatique pour le contenu
 * - Ombres achromatiques
 * - Pas de couleurs Tailwind brutes
 */
function buildFicheDocument(target: any, pipeline: any) {
  const { Document, Paragraph, TextRun, Table, TableRow, TableCell,
          Header, Footer, HeadingLevel, BorderStyle, WidthType, ShadingType,
          AlignmentType, PageNumber } = require("docx");

  // ... Construire le document avec :
  // 1. En-tête : bandeau tricolore + "FICHE OPÉRATEUR ÉCONOMIQUE"
  // 2. Section Identification : nom, type, secteur, pays, ville, site web
  // 3. Section Contact : nom, titre, email, téléphone
  // 4. Section Évaluation : priorité, score d'opportunité, statut pipeline
  // 5. Section Analyse IA : description, matchReason, tags
  // 6. Section Données découverte : source, searchQuery, aiConfidence
  // 7. Section Pipeline : tableau récap (nb plans, lettres, rapports, projets)
  // 8. Pied de page : "Consulat.ga — Affaires Diplomatiques | Page X"

  return new Document({ /* ... */ });
}
```

#### 4.2 — Générateur Plan Stratégique (PPTX)

```typescript
/** Génère le PPTX du plan stratégique */
export const generatePlanDocument = rawInternalAction({
  args: {
    planId: v.id("diplomaticPlans"),
    targetId: v.id("diplomaticTargets"),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.runQuery(internal.functions.diplomaticAffairs.getPlan, {
      planId: args.planId,
    });
    if (!plan) return;

    // Utiliser pptxgenjs pour générer la présentation
    // npm install pptxgenjs (à ajouter dans package.json du dossier convex)
    const PptxGenJS = require("pptxgenjs");
    const pptx = new PptxGenJS();

    // Slides à générer :
    // 1. Couverture : titre du plan + nom cible + catégorie + période
    // 2. Besoins du pays (countryNeeds)
    // 3. Capacités opérateur (operatorCapabilities)
    // 4. Bénéfices mutuels (mutualBenefits)
    // 5. Points de négociation (negotiationPoints)
    // 6. Agenda de réunion (meetingAgenda)
    // 7. Risques identifiés (risks)
    // 8. Objectifs et timeline

    const pptxBuffer = await pptx.write({ outputType: "nodebuffer" });

    // Stocker et enregistrer
    const blob = new Blob([pptxBuffer], {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    });
    const storageId = await ctx.storage.store(blob);

    const sanitizedName = plan.title.replace(/[^a-zA-Z0-9À-ÿ\s.-]/g, "").replace(/\s+/g, "_");
    const year = new Date().getFullYear();

    await ctx.runMutation(internal.functions.diplomaticFolders.internalAddDocument, {
      folderId: /* résolu via targetId */,
      orgId: plan.orgId,
      sourceType: "plan",
      sourceId: args.planId,
      subfolder: "Plans Stratégiques",
      filename: `Plan_${plan.category}_${sanitizedName}_${year}.pptx`,
      format: "pptx",
      storageId,
      sizeBytes: pptxBuffer.byteLength,
    });
  },
});
```

#### 4.3 — Générateur Lettre (DOCX)

```typescript
/** Génère le DOCX de la lettre approuvée */
export const generateLetterDocument = rawInternalAction({
  args: {
    letterId: v.id("diplomaticLetters"),
    targetId: v.id("diplomaticTargets"),
  },
  handler: async (ctx, args) => {
    // 1. Récupérer la lettre
    // 2. Générer le DOCX avec docx-js (format lettre formelle)
    //    - En-tête : bandeau gabonais + logo consulat
    //    - Référence : LD/YYYY/XXXXX
    //    - Destinataire : nom, titre, organisation
    //    - Corps : content ou aiDraftContent
    //    - Pied de page avec numéro
    // 3. Stocker dans Convex Storage
    // 4. Appeler internalAddDocument avec subfolder "Lettres"
    //    filename : "{reference}_{type}.docx"
  },
});
```

#### 4.4 — Générateur Rapport (DOCX)

```typescript
/** Génère le DOCX du rapport soumis */
export const generateReportDocument = rawInternalAction({
  args: {
    reportId: v.id("diplomaticReports"),
    targetId: v.id("diplomaticTargets"),
  },
  handler: async (ctx, args) => {
    // 1. Récupérer le rapport
    // 2. Générer le DOCX avec docx-js (format rapport officiel)
    //    - Page de garde : titre, type, destinataire, période
    //    - Sommaire exécutif (summary ou aiGeneratedSummary)
    //    - Statistiques si disponibles
    //    - Corps (content)
    // 3. Stocker + enregistrer avec subfolder "Rapports"
    //    filename : "Rapport_{type}_{period}.docx"
  },
});
```

#### 4.5 — Générateur Projet (DOCX)

```typescript
/** Génère le DOCX du projet validé */
export const generateProjectDocument = rawInternalAction({
  args: {
    projectId: v.id("diplomaticProjects"),
    targetId: v.id("diplomaticTargets"),
  },
  handler: async (ctx, args) => {
    // 1. Récupérer le projet
    // 2. Générer le DOCX avec docx-js (format document de projet)
    //    - Page de garde : titre, référence, type, statut
    //    - Description
    //    - Objectifs (tableau avec statut et deadline)
    //    - Parties prenantes (tableau)
    //    - Budget, dates début/fin
    //    - Validation haute autorité
    // 3. Stocker + enregistrer avec subfolder "Projets"
    //    filename : "Projet_{reference}_{title}.docx"
  },
});
```

---

## Phase 5 — Composants Frontend

### Design System

Respecter la **Charte Graphique Consulat.ga** (voir `DESIGN_CHARTER.md`) :
- Palette achromatique 6 gris + 4 accents (bleu, vert, amber, rose)
- Couleurs Gabon = décoratif uniquement (stripes, tints)
- JAMAIS de couleurs Tailwind brutes (`blue-500`, `green-100`, etc.)
- Icônes : `lucide-react` exclusivement
- Ombres achromatiques
- Classes utilitaires `.neu-*`, `.gabon-*`

### 5.1 — `FolderExplorer.tsx`

**Emplacement :** `apps/agent-web/src/components/diplomatic/FolderExplorer.tsx`

```tsx
/**
 * Explorateur de dossier opérateur économique.
 * Affiche l'arborescence : Fiche → Plans → Lettres → Rapports → Projets
 * avec icônes, compteurs, et boutons de téléchargement par document.
 *
 * Props :
 *   targetId: Id<"diplomaticTargets">
 *
 * Query utilisée : diplomaticFolders.getFolderByTarget
 *
 * Structure UI :
 * ┌─────────────────────────────────────────────┐
 * │ 📁 Dossier Opérateur — Acciona S.A.        │
 * │ Secteur : Énergie Renouvelable              │
 * │ 12 documents · Dernière MAJ : 5 avr. 2026   │
 * ├─────────────────────────────────────────────┤
 * │ 📄 Fiche_Cible_Acciona.docx     ⬇ DOCX PDF │
 * │                                              │
 * │ 📁 Plans Stratégiques (2)                    │
 * │   📄 Plan_Bilateral_Acciona_2026.pptx ⬇     │
 * │                                              │
 * │ 📁 Lettres (3)                               │
 * │   📄 LD_2026_ABC12_Introduction.docx  ⬇     │
 * │   📄 LD_2026_DEF34_Follow_Up.docx    ⬇     │
 * │                                              │
 * │ 📁 Rapports (1)                              │
 * │   📄 Rapport_Activite_Q1_2026.docx   ⬇     │
 * │                                              │
 * │ 📁 Projets (0)                               │
 * │   (aucun projet validé)                      │
 * ├─────────────────────────────────────────────┤
 * │ [📦 Exporter tout le dossier (ZIP)]          │
 * └─────────────────────────────────────────────┘
 *
 * Icônes lucide-react :
 *   FolderOpen, FileText, FileSpreadsheet, Download, Archive, Package
 */
```

### 5.2 — `FichePreview.tsx`

**Emplacement :** `apps/agent-web/src/components/diplomatic/FichePreview.tsx`

```tsx
/**
 * Aperçu compact de la fiche cible dans la page détail.
 * Affiche un résumé visuel sans ouvrir le DOCX.
 *
 * Props :
 *   target: Doc<"diplomaticTargets">
 *   folder: Doc<"diplomaticFolders"> | null
 *
 * Structure UI :
 * ┌────────────────────────────────────────┐
 * │ ● Score: 95%  │ 🔴 critical  │ Phase: Strategy │
 * ├────────────────────────────────────────┤
 * │ Contact : José Manuel Entrecanales     │
 * │ Secteur : Énergie Renouvelable         │
 * │ Pays : Espagne · Madrid                │
 * ├────────────────────────────────────────┤
 * │ "Acciona répond directement aux        │
 * │  besoins du Gabon en énergie..."       │
 * ├────────────────────────────────────────┤
 * │ [⬇ Télécharger DOCX] [⬇ Télécharger PDF] │
 * └────────────────────────────────────────┘
 */
```

### 5.3 — `ExportZipButton.tsx`

**Emplacement :** `apps/agent-web/src/components/diplomatic/ExportZipButton.tsx`

```tsx
/**
 * Bouton d'export ZIP avec barre de progression.
 *
 * Props :
 *   folderId: Id<"diplomaticFolders">
 *   folderName: string
 *
 * Action utilisée : diplomaticFolders.exportFolderAsZip
 *
 * États :
 *   idle → loading (spinner + "Compilation en cours...") → success (lien de téléchargement)
 *
 * Icônes : Package, Download, Loader2
 */
```

### 5.4 — `SectorGrid.tsx`

**Emplacement :** `apps/agent-web/src/components/diplomatic/SectorGrid.tsx`

```tsx
/**
 * Vue d'ensemble des dossiers groupés par secteur.
 * Accessible depuis l'onglet "Vue d'ensemble" du header.
 *
 * Query utilisée : diplomaticFolders.listFoldersBySector
 *
 * Structure UI :
 * ┌─────────────────────────────────────────────────────┐
 * │ 📊 Vue d'ensemble — Opérateurs Économiques          │
 * │ 3 secteurs · 8 opérateurs · 47 documents            │
 * ├─────────────────────────────────────────────────────┤
 * │                                                      │
 * │ ── Énergie Renouvelable (3 opérateurs) ──────────── │
 * │ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
 * │ │ Acciona  │ │ Iberdrola│ │ EDP      │              │
 * │ │ 12 docs  │ │ 8 docs   │ │ 3 docs   │              │
 * │ │ Strategy │ │ Contact  │ │ Target   │              │
 * │ └──────────┘ └──────────┘ └──────────┘              │
 * │                                                      │
 * │ ── Numérique (2 opérateurs) ─────────────────────── │
 * │ ┌──────────┐ ┌──────────┐                            │
 * │ │Telefónica│ │ Indra    │                            │
 * │ │ 15 docs  │ │ 6 docs   │                            │
 * │ └──────────┘ └──────────┘                            │
 * └─────────────────────────────────────────────────────┘
 *
 * Chaque carte est cliquable → navigue vers /affaires-diplomatiques/$targetId
 */
```

### 5.5 — Intégration dans la page détail cible

**Fichier à modifier :** La route `$targetId` dans les routes affaires-diplomatiques

Ajouter la section `FolderExplorer` **en dessous** des sections existantes (Plans Stratégiques, Lettres de Contact, Projets de Coopération) :

```tsx
{/* Section existante : Plans Stratégiques */}
{/* Section existante : Lettres de Contact */}
{/* Section existante : Projets de Coopération */}

{/* NOUVELLE SECTION : Dossier Opérateur */}
<div className="mt-8">
  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
    <FolderOpen className="h-5 w-5" />
    Dossier Opérateur
  </h2>
  <FolderExplorer targetId={targetId} />
</div>
```

---

## Phase 6 — Dépendances npm

### Fichier : `package.json` (racine ou convex/)

```json
{
  "dependencies": {
    "docx": "^9.0.0",
    "pptxgenjs": "^3.13.0",
    "jszip": "^3.10.1"
  }
}
```

> **Note :** `docx` est pour la génération DOCX dans les actions Convex.  
> `pptxgenjs` est pour la génération PPTX des plans stratégiques.  
> `jszip` est pour l'export ZIP du dossier complet.

---

## Ordre d'implémentation recommandé

| # | Tâche | Fichier(s) | Complexité |
|---|-------|------------|------------|
| 1 | Ajouter les 2 tables au schema | `convex/schemas/diplomaticAffairs.ts`, `convex/schema.ts` | Faible |
| 2 | Créer `diplomaticFolders.ts` (queries + mutations CRUD) | `convex/functions/diplomaticFolders.ts` | Moyenne |
| 3 | Hook `createTarget` → `createTargetFolder` | `convex/functions/diplomaticAffairs.ts` ligne ~95 | Faible |
| 4 | Implémenter `generateAndStoreFiche` (action docx-js) | `convex/functions/diplomaticFolders.ts` | Élevée |
| 5 | Hook `advancePhase` → `regenerateTargetFiche` | `convex/functions/diplomaticAffairs.ts` ligne ~158 | Faible |
| 6 | Implémenter `generatePlanDocument` (action pptxgenjs) | `convex/functions/diplomaticFolders.ts` | Élevée |
| 7 | Hooks lettres/rapports/projets | `convex/functions/diplomaticAffairs.ts` | Faible |
| 8 | Implémenter `generateLetterDocument` | `convex/functions/diplomaticFolders.ts` | Moyenne |
| 9 | Implémenter `generateReportDocument` | `convex/functions/diplomaticFolders.ts` | Moyenne |
| 10 | Implémenter `generateProjectDocument` | `convex/functions/diplomaticFolders.ts` | Moyenne |
| 11 | Implémenter `exportFolderAsZip` | `convex/functions/diplomaticFolders.ts` | Moyenne |
| 12 | Créer `FolderExplorer.tsx` | `apps/agent-web/src/components/diplomatic/` | Moyenne |
| 13 | Créer `FichePreview.tsx` | `apps/agent-web/src/components/diplomatic/` | Faible |
| 14 | Créer `ExportZipButton.tsx` | `apps/agent-web/src/components/diplomatic/` | Faible |
| 15 | Créer `SectorGrid.tsx` | `apps/agent-web/src/components/diplomatic/` | Moyenne |
| 16 | Intégrer dans la page détail cible | Route `$targetId` | Faible |

---

## Règles à respecter

1. **Convex guidelines** : Toujours lire `convex/_generated/ai/guidelines.md` avant de coder
2. **Module isolé** : Le fichier `diplomaticFolders.ts` est autonome, il n'importe PAS depuis `diplomaticAffairs.ts` directement (utilise `internal.*`)
3. **Transactions** : Utiliser `ctx.scheduler.runAfter(0, ...)` pour les appels cross-mutation depuis les hooks
4. **Soft delete** : Pattern `deletedAt` + `filter(q.eq(q.field("deletedAt"), undefined))`
5. **Auth** : `authMutation` / `authQuery` / `authAction` pour les endpoints publics ; `rawInternalMutation` / `rawInternalQuery` / `rawInternalAction` (importés de `../_generated/server`) pour les internes ; `triggeredInternalMutation` si les triggers (audit/aggregates) doivent se déclencher
6. **Design** : Charte Graphique Consulat.ga — pas de couleurs Tailwind brutes, lucide-react pour les icônes
7. **Nommage** : Fichiers kebab-case, composants PascalCase, fonctions camelCase
8. **Français** : Labels UI en français, codes backend en anglais
