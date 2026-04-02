/**
 * Migration : Corriger les photos d'identité existantes.
 *
 * Les photos uploadées avant la correction avaient :
 * - category: "other" → doit être "identity"
 * - label: undefined → doit être "Photo d'identité"
 * - filename: nom original → doit être "Photo_identite_{ownerId}.{ext}"
 *
 * Usage :
 *   npx convex run migrations/fixIdentityPhotos:fix
 */
import { internalMutation, mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

const BATCH_SIZE = 50;

export const fix = internalMutation({
  args: {
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("documents").paginate({
      cursor: args.cursor ?? null,
      numItems: BATCH_SIZE,
    });

    let fixed = 0;

    for (const doc of page.page) {
      // Ne corriger que les documents de type identity_photo
      if (doc.documentType !== "identity_photo") continue;

      const needsCategoryFix = !doc.category || doc.category === "other";
      const needsLabelFix = !doc.label || doc.label === "Autre";

      // Vérifier si le filename a besoin d'être renommé
      const firstFile = doc.files?.[0];
      const needsFilenameFix = firstFile && !firstFile.filename.startsWith("Photo_identite_");

      if (!needsCategoryFix && !needsLabelFix && !needsFilenameFix) continue;

      const patch: Record<string, unknown> = { updatedAt: Date.now() };

      // Corriger la catégorie
      if (needsCategoryFix) {
        patch.category = "identity";
      }

      // Corriger le label
      if (needsLabelFix) {
        patch.label = "Photo d'identité";
      }

      // Renommer le fichier
      if (needsFilenameFix && firstFile) {
        const ext = firstFile.filename.split(".").pop() ?? "jpg";
        const ownerRef = String(doc.ownerId).replace(/[^a-zA-Z0-9]/g, "");
        const newFilename = `Photo_identite_${ownerRef}.${ext}`;

        patch.files = doc.files.map((f, i) =>
          i === 0 ? { ...f, filename: newFilename } : f,
        );
      }

      await ctx.db.patch(doc._id, patch);
      fixed++;
    }

    console.log(
      `[fixIdentityPhotos] Batch : ${page.page.length} docs scannés, ${fixed} corrigés`,
    );

    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.fixIdentityPhotos.fix,
        { cursor: page.continueCursor },
      );
    } else {
      console.log("[fixIdentityPhotos] Migration terminée");
    }
  },
});

/**
 * Point d'entrée public pour lancer la migration via CLI :
 *   npx convex run migrations/fixIdentityPhotos:runFix
 */
export const runFix = mutation({
  args: {},
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(
      0,
      internal.migrations.fixIdentityPhotos.fix,
      { cursor: undefined },
    );
    return { started: true, message: "Migration fixIdentityPhotos démarrée en arrière-plan." };
  },
});
