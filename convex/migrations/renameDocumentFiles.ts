/**
 * Migration : Renommer les fichiers des documents consulaires avec le matricule.
 *
 * Etape 1 : Generer un matricule pour chaque profil qui n'en a pas
 * Etape 2 : Renommer les fichiers des 5 types consulaires au format :
 *   {type-document}-{matricule}.{ext}
 *   Ex: photo-identite-gab-fr-2026-00042.jpg
 *
 * Usage :
 *   npx convex run migrations/renameDocumentFiles:runMigration
 */
import { internalMutation, mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { generateMatricule, formatDocumentFilename } from "../lib/referenceHelpers";

const BATCH_SIZE = 50;

/** Types de documents consulaires concernes */
const CONSULAR_DOC_TYPES = new Set([
  "identity_photo",
  "passport",
  "proof_of_address",
  "birth_certificate",
  "residence_permit",
]);

/** Labels lisibles par type de document */
const DOC_TYPE_LABELS: Record<string, string> = {
  identity_photo: "Photo d'identité",
  passport: "Passeport",
  proof_of_address: "Justificatif de domicile",
  birth_certificate: "Acte de naissance",
  residence_permit: "Titre de séjour",
};

/** Catégories correctes par type */
const DOC_TYPE_CATEGORIES: Record<string, string> = {
  identity_photo: "identity",
  passport: "identity",
  proof_of_address: "housing",
  birth_certificate: "civil_status",
  residence_permit: "identity",
};

/**
 * Etape 1 : Generer les matricules manquants pour tous les profils.
 */
export const generateMatricules = internalMutation({
  args: {
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("profiles").paginate({
      cursor: args.cursor ?? null,
      numItems: BATCH_SIZE,
    });

    let generated = 0;

    for (const profile of page.page) {
      // Resoudre le code pays : countryOfResidence > org.country > "xx"
      let countryCode = (profile as any).countryOfResidence ?? "";
      if (!countryCode && (profile as any).managedByOrgId) {
        const org = await ctx.db.get((profile as any).managedByOrgId);
        countryCode = (org as any)?.country ?? "";
      }
      if (!countryCode && (profile as any).signaledToOrgId) {
        const org = await ctx.db.get((profile as any).signaledToOrgId);
        countryCode = (org as any)?.country ?? "";
      }
      countryCode = (countryCode || "xx").toLowerCase().slice(0, 3);

      if (profile.matricule) {
        // Corriger les matricules avec "xx" si on connait maintenant le pays
        const lower = profile.matricule.toLowerCase();
        const hasWrongCountry = lower.includes("-xx-") && countryCode !== "xx";
        const needsLowercase = lower !== profile.matricule;

        if (hasWrongCountry) {
          // Remplacer le code pays dans le matricule existant
          const corrected = lower.replace(/-xx-/, `-${countryCode}-`);
          await ctx.db.patch(profile._id, { matricule: corrected });
          generated++;
        } else if (needsLowercase) {
          await ctx.db.patch(profile._id, { matricule: lower });
          generated++;
        }
        continue;
      }

      const matricule = await generateMatricule(ctx, countryCode);
      await ctx.db.patch(profile._id, { matricule });
      generated++;
    }

    console.log(
      `[generateMatricules] Batch : ${page.page.length} profils scannes, ${generated} matricules generes`,
    );

    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.renameDocumentFiles.generateMatricules,
        { cursor: page.continueCursor },
      );
    } else {
      console.log("[generateMatricules] Terminee — lancement du renommage des fichiers");
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.renameDocumentFiles.renameFiles,
        { cursor: undefined },
      );
    }
  },
});

/**
 * Etape 2 : Renommer les fichiers des documents consulaires.
 */
export const renameFiles = internalMutation({
  args: {
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("documents").paginate({
      cursor: args.cursor ?? null,
      numItems: BATCH_SIZE,
    });

    let renamed = 0;

    for (const doc of page.page) {
      // Ne traiter que les 5 types consulaires
      if (!doc.documentType || !CONSULAR_DOC_TYPES.has(doc.documentType)) continue;
      if (!doc.files?.length) continue;

      // Trouver le profil owner pour recuperer le matricule
      const owner = await ctx.db.get(doc.ownerId as any);
      if (!owner) continue;

      // Le owner peut etre un profil (avec matricule) ou un user
      const matricule = (owner as any).matricule;
      if (!matricule) continue;

      // Recalculer le filename pour chaque fichier (avec mimeType pour l'extension)
      const firstFile = doc.files[0];
      const newFilename = formatDocumentFilename(
        firstFile.filename,
        doc.documentType,
        matricule,
        firstFile.mimeType,
      );

      // Calculer le label et la catégorie corrects
      const correctLabel = DOC_TYPE_LABELS[doc.documentType];
      const correctCategory = DOC_TYPE_CATEGORIES[doc.documentType];

      const needsFileRename = newFilename !== firstFile.filename;
      const needsLabel = correctLabel && doc.label !== correctLabel;
      const needsCategory = correctCategory && doc.category !== correctCategory;

      if (!needsFileRename && !needsLabel && !needsCategory) continue;

      const patch: Record<string, unknown> = { updatedAt: Date.now() };

      if (needsFileRename) {
        patch.files = doc.files.map((f, i) =>
          i === 0 ? { ...f, filename: newFilename } : f,
        );
      }

      if (needsLabel) {
        patch.label = correctLabel;
      }

      if (needsCategory) {
        patch.category = correctCategory;
      }

      await ctx.db.patch(doc._id, patch);
      renamed++;
    }

    console.log(
      `[renameFiles] Batch : ${page.page.length} docs scannes, ${renamed} renommes`,
    );

    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.renameDocumentFiles.renameFiles,
        { cursor: page.continueCursor },
      );
    } else {
      console.log("[renameFiles] Terminee — lancement du lien profil-documents");
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.renameDocumentFiles.linkDocumentsToProfiles,
        { cursor: undefined },
      );
    }
  },
});

/** Map documentType → cle dans profile.documents */
const DOC_TO_PROFILE_KEY: Record<string, string> = {
  identity_photo: "identityPhoto",
  passport: "passport",
  proof_of_address: "proofOfAddress",
  birth_certificate: "birthCertificate",
  residence_permit: "proofOfResidency",
};

/**
 * Etape 3 : Lier les documents existants au profil.
 * Pour chaque profil, verifie que profile.documents.{key} pointe vers un document existant.
 * Si le lien manque mais qu'un document du bon type existe, cree le lien.
 */
export const linkDocumentsToProfiles = internalMutation({
  args: {
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("profiles").paginate({
      cursor: args.cursor ?? null,
      numItems: BATCH_SIZE,
    });

    let linked = 0;

    for (const profile of page.page) {
      // Recuperer tous les documents du profil
      const docs = await ctx.db
        .query("documents")
        .withIndex("by_owner", (q: any) => q.eq("ownerId", profile._id))
        .collect();

      const currentDocs = (profile as any).documents ?? {};
      let needsUpdate = false;
      const updatedDocs = { ...currentDocs };

      for (const [docType, profileKey] of Object.entries(DOC_TO_PROFILE_KEY)) {
        // Si le lien existe deja et pointe vers un document valide, passer
        if (currentDocs[profileKey]) {
          const existing = await ctx.db.get(currentDocs[profileKey]);
          if (existing) continue;
        }

        // Chercher un document du bon type
        const match = docs.find(
          (d) => d.documentType === docType && d.files?.length > 0,
        );

        if (match) {
          updatedDocs[profileKey] = match._id;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await ctx.db.patch(profile._id, { documents: updatedDocs });
        linked++;
      }
    }

    console.log(
      `[linkDocumentsToProfiles] Batch : ${page.page.length} profils scannes, ${linked} lies`,
    );

    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.renameDocumentFiles.linkDocumentsToProfiles,
        { cursor: page.continueCursor },
      );
    } else {
      console.log("[linkDocumentsToProfiles] Terminee — lancement du nettoyage des doublons");
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.renameDocumentFiles.deduplicateConsularDocs,
        { cursor: undefined },
      );
    }
  },
});

/**
 * Etape 4 : Supprimer les doublons consulaires.
 * Pour chaque profil, ne garder qu'un seul document par type consulaire
 * (celui lie dans profile.documents). Supprimer les autres.
 */
export const deduplicateConsularDocs = internalMutation({
  args: {
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("profiles").paginate({
      cursor: args.cursor ?? null,
      numItems: BATCH_SIZE,
    });

    let deleted = 0;

    for (const profile of page.page) {
      const docs = await ctx.db
        .query("documents")
        .withIndex("by_owner", (q: any) => q.eq("ownerId", profile._id))
        .collect();

      const profileDocs = (profile as any).documents ?? {};

      // IDs des documents lies au profil (ceux a garder)
      const linkedIds = new Set(
        Object.values(profileDocs).filter(Boolean).map(String),
      );

      for (const docType of CONSULAR_DOC_TYPES) {
        const docsOfType = docs.filter((d) => d.documentType === docType);
        if (docsOfType.length <= 1) continue;

        // Garder le document lie au profil, ou le plus recent
        for (const doc of docsOfType) {
          if (linkedIds.has(String(doc._id))) continue; // Garder celui lie
          await ctx.db.delete(doc._id);
          deleted++;
        }
      }
    }

    console.log(
      `[deduplicateConsularDocs] Batch : ${page.page.length} profils, ${deleted} doublons supprimes`,
    );

    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.renameDocumentFiles.deduplicateConsularDocs,
        { cursor: page.continueCursor },
      );
    } else {
      console.log("[deduplicateConsularDocs] Migration complete terminee");
    }
  },
});

/**
 * Point d'entree public pour lancer la migration complete via CLI :
 *   npx convex run migrations/renameDocumentFiles:runMigration
 */
export const runMigration = mutation({
  args: {},
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(
      0,
      internal.migrations.renameDocumentFiles.generateMatricules,
      { cursor: undefined },
    );
    return {
      started: true,
      message: "Migration demarree : generation matricules → renommage fichiers.",
    };
  },
});
