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
      if (profile.matricule) {
        // Normaliser les matricules existants en minuscules
        const lower = profile.matricule.toLowerCase();
        if (lower !== profile.matricule) {
          await ctx.db.patch(profile._id, { matricule: lower });
          generated++;
        }
        continue;
      }

      const matricule = await generateMatricule(
        ctx,
        (profile as any).countryOfResidence ?? "xx",
      );
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

      // Recalculer le filename pour chaque fichier
      const originalFilename = doc.files[0].filename;
      const newFilename = formatDocumentFilename(
        originalFilename,
        doc.documentType,
        matricule,
      );

      // Calculer le label et la catégorie corrects
      const correctLabel = DOC_TYPE_LABELS[doc.documentType];
      const correctCategory = DOC_TYPE_CATEGORIES[doc.documentType];

      const needsFileRename = newFilename !== originalFilename;
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
      console.log("[renameFiles] Migration terminee");
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
