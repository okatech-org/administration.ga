import { internalMutation, mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { DetailedDocumentType } from "../lib/constants";

const BATCH_SIZE = 50;

/** Types de documents consulaires concernes */
const CONSULAR_DOC_TYPES = new Set([
  DetailedDocumentType.IdentityPhoto,
  DetailedDocumentType.Passport,
  DetailedDocumentType.ProofOfAddress,
  DetailedDocumentType.BirthCertificate,
  DetailedDocumentType.ResidencePermit,
]);

export const fixOwnerIdsAndDeduplicate = internalMutation({
  args: {
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Mettre à jour tous les documents dont le ownerId est un userId
    // On trouve les documents qui n'appartiennent pas à un profil
    const batch = await ctx.db.query("profiles").paginate({
      cursor: args.cursor ?? null,
      numItems: BATCH_SIZE,
    });

    let fixedOwners = 0;
    let deletedDups = 0;

    for (const profile of batch.page) {
      // Rechercher les documents avec ownerId = userId
      const docsWithUserId = await ctx.db
        .query("documents")
        .withIndex("by_owner", (q) => q.eq("ownerId", profile.userId))
        .collect();

      for (const doc of docsWithUserId) {
        await ctx.db.patch(doc._id, { ownerId: profile._id });
        fixedOwners++;
      }

      // 2. Maintenant que tous les docs sont rapatriés sur profile._id, dedupliquer
      const allDocs = await ctx.db
        .query("documents")
        .withIndex("by_owner", (q) => q.eq("ownerId", profile._id))
        .collect();

      const profileDocs = (profile.documents as any) ?? {};
      const linkedIds = new Set(
        Object.values(profileDocs).filter(Boolean).map(String),
      );

      const typesArray = Array.from(CONSULAR_DOC_TYPES);
      for (const docType of typesArray) {
        const docsOfType = allDocs.filter((d) => d.documentType === docType);
        if (docsOfType.length <= 1) continue;

        // Trouver le "meilleur" document à garder:
        // 1. Celui qui est lié au profil
        // 2. Ou le plus récent (avec des fichiers)
        const sortedDocs = [...docsOfType].sort((a, b) => b._creationTime - a._creationTime);
        const linkedDoc = sortedDocs.find((d) => linkedIds.has(String(d._id)));
        const docToKeep = linkedDoc ?? sortedDocs[0];

        // S'assurer qu'il est lié au profil s'il ne l'est pas
        if (!linkedDoc) {
           const DOC_PROFILE_KEY: Record<string, string> = {
            [DetailedDocumentType.IdentityPhoto]: "identityPhoto",
            [DetailedDocumentType.Passport]: "passport",
            [DetailedDocumentType.ProofOfAddress]: "proofOfAddress",
            [DetailedDocumentType.BirthCertificate]: "birthCertificate",
            [DetailedDocumentType.ResidencePermit]: "proofOfResidency",
          };
          const profileKey = DOC_PROFILE_KEY[docType];
          if (profileKey) {
             profileDocs[profileKey] = docToKeep._id;
             await ctx.db.patch(profile._id, { documents: profileDocs });
          }
        }

        for (const doc of sortedDocs) {
          if (doc._id === docToKeep._id) continue;

          // Supprimer les fichiers de storage
          if (doc.files?.length) {
             for (const file of doc.files) {
                if (file.storageId) {
                  try {
                    await ctx.storage.delete(file.storageId);
                  } catch (e) {
                    console.log("[STORAGE] delete failed", e);
                  }
                }
             }
          }
          await ctx.db.delete(doc._id);
          deletedDups++;
        }
      }
    }

    console.log(
      `[fixOwnerIdsAndDeduplicate] Batch: ${fixedOwners} ownerId corrigés, ${deletedDups} doublons supprimés`
    );

    if (!batch.isDone) {
      await ctx.scheduler.runAfter(
        0,
        (internal.migrations as any).fixOwnerIds.fixOwnerIdsAndDeduplicate,
        { cursor: batch.continueCursor }
      );
    } else {
      console.log("[fixOwnerIdsAndDeduplicate] Migration terminée !");
    }
  },
});

export const runFix = mutation({
  args: {},
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(
      0,
      (internal.migrations as any).fixOwnerIds.fixOwnerIdsAndDeduplicate,
      { cursor: undefined }
    );
    return "Migration fixOwnerIdsAndDeduplicate lancée en arrière-plan.";
  },
});
