import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { DetailedDocumentType } from "../lib/constants";

/**
 * Backfill: rattache le titre de séjour depuis le profil sur les requests
 * d'inscription consulaire qui n'en ont pas dans leurs pièces fournies.
 *
 * Règles :
 *  - On ne touche que les requests dont le profile lié est un `profiles`
 *    (adulte). Les `childProfiles` sont ignorés : le titre de séjour n'est
 *    pas exigé pour un enfant.
 *  - On ne modifie que les requests dont `request.documents` ne contient
 *    AUCUN document avec `documentType === "residence_permit"`.
 *  - On lit `profile.documents.proofOfResidency` (clé adulte). Si absent,
 *    skip. Si le document référencé n'existe plus ou n'est pas un titre
 *    de séjour, skip.
 *  - On append l'id au tableau `request.documents` (sans doublon).
 *
 * Run: npx convex run migrations/backfillRequestResidencePermit:backfill
 */

const BATCH_SIZE = 100;

export const backfill = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { cursor, dryRun }) => {
    const page = await ctx.db.query("requests").paginate({
      cursor: cursor ?? null,
      numItems: BATCH_SIZE,
    });

    const stats = {
      scanned: 0,
      skippedChild: 0,
      skippedAlreadyHasPermit: 0,
      skippedNoProfile: 0,
      skippedNoProfilePermit: 0,
      skippedInvalidPermitDoc: 0,
      patched: [] as string[],
    };

    for (const request of page.page) {
      stats.scanned++;

      if (!request.profileId) {
        stats.skippedNoProfile++;
        continue;
      }

      // Child profile → résidence pas requis
      if (request.profileId.toString().startsWith("childProfiles")) {
        // Heuristique id-prefix insuffisante en Convex : on tente la lecture
        // typée via db.get et on check la table via _id.
      }

      const requestDocIds = request.documents ?? [];
      const requestDocs = await Promise.all(
        requestDocIds.map((id) => ctx.db.get(id)),
      );
      const alreadyHasPermit = requestDocs.some(
        (d) => d?.documentType === DetailedDocumentType.ResidencePermit,
      );
      if (alreadyHasPermit) {
        stats.skippedAlreadyHasPermit++;
        continue;
      }

      // Lecture du profil lié (peut être profiles OU childProfiles)
      const linked = await ctx.db.get(request.profileId as any);
      if (!linked) {
        stats.skippedNoProfile++;
        continue;
      }

      // Distinction adulte vs enfant :
      //   profiles → a un champ userId (identique à request.userId en général)
      //              et documents.proofOfResidency
      //   childProfiles → a `parents` + `authorUserId`
      const isChild =
        "parents" in (linked as Record<string, unknown>) &&
        "authorUserId" in (linked as Record<string, unknown>);
      if (isChild) {
        stats.skippedChild++;
        continue;
      }

      const profileDocs = (
        linked as { documents?: { proofOfResidency?: Id<"documents"> } }
      ).documents;
      const profilePermitId = profileDocs?.proofOfResidency;
      if (!profilePermitId) {
        stats.skippedNoProfilePermit++;
        continue;
      }

      // Sanity-check le doc
      const profilePermitDoc = await ctx.db.get(profilePermitId);
      if (
        !profilePermitDoc ||
        profilePermitDoc.documentType !== DetailedDocumentType.ResidencePermit
      ) {
        stats.skippedInvalidPermitDoc++;
        continue;
      }

      if (requestDocIds.includes(profilePermitId)) {
        // Déjà présent en tant qu'id mais sans documentType correct côté doc
        // (cas improbable : on compte comme skip)
        stats.skippedAlreadyHasPermit++;
        continue;
      }

      if (!dryRun) {
        await ctx.db.patch(request._id, {
          documents: [...requestDocIds, profilePermitId],
        });
      }
      stats.patched.push(request.reference);
    }

    return {
      ...stats,
      nextCursor: page.isDone ? null : page.continueCursor,
      isDone: page.isDone,
      dryRun: dryRun ?? false,
    };
  },
});
