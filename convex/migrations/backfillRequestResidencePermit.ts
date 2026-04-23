/**
 * Migration : rattache le titre de séjour depuis le profil sur les requests
 * qui n'en ont pas dans leurs pièces fournies.
 *
 * Règles :
 *  - Ignore les requests liées à un `childProfiles` (titre de séjour non requis).
 *  - Skip si `request.documents` contient déjà un doc `documentType === "residence_permit"`.
 *  - Lit `profile.documents.proofOfResidency` (clé adulte). Si absent, skip.
 *  - Valide que le doc cible est bien un `residence_permit`, puis l'append à
 *    `request.documents`.
 *
 * Pagination chaînée (auto-scheduled) : lance, ça s'auto-relance jusqu'à la fin.
 *
 * Usage :
 *   npx convex run migrations/backfillRequestResidencePermit:run
 *   npx convex run migrations/backfillRequestResidencePermit:run '{"dryRun": true}'
 */
import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { DetailedDocumentType } from "../lib/constants";

const BATCH_SIZE = 100;

/** Kickoff — lance la migration, s'auto-relance ensuite. */
export const run = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, { dryRun }) => {
    console.log(
      `[backfillRequestResidencePermit] start dryRun=${dryRun ?? false}`,
    );
    await ctx.scheduler.runAfter(
      0,
      internal.migrations.backfillRequestResidencePermit.processBatch,
      { dryRun: dryRun ?? false, patchedTotal: 0, scannedTotal: 0 },
    );
  },
});

/** @internal — traite une page puis se replanifie. */
export const processBatch = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    dryRun: v.boolean(),
    patchedTotal: v.number(),
    scannedTotal: v.number(),
  },
  handler: async (ctx, { cursor, dryRun, patchedTotal, scannedTotal }) => {
    const page = await ctx.db.query("requests").paginate({
      cursor: cursor ?? null,
      numItems: BATCH_SIZE,
    });

    let patched = 0;
    let skippedChild = 0;
    let skippedHasPermit = 0;
    let skippedNoProfile = 0;
    let skippedNoProfilePermit = 0;
    let skippedInvalidDoc = 0;

    for (const request of page.page) {
      if (!request.profileId) {
        skippedNoProfile++;
        continue;
      }

      const requestDocIds = request.documents ?? [];
      const requestDocs = await Promise.all(
        requestDocIds.map((id) => ctx.db.get(id)),
      );
      if (
        requestDocs.some(
          (d) => d?.documentType === DetailedDocumentType.ResidencePermit,
        )
      ) {
        skippedHasPermit++;
        continue;
      }

      const linked = await ctx.db.get(request.profileId as Id<"profiles">);
      if (!linked) {
        skippedNoProfile++;
        continue;
      }

      // childProfiles a les champs `parents` + `authorUserId` ; profiles non.
      const isChild =
        "parents" in (linked as Record<string, unknown>) &&
        "authorUserId" in (linked as Record<string, unknown>);
      if (isChild) {
        skippedChild++;
        continue;
      }

      const profileDocs = (
        linked as { documents?: { proofOfResidency?: Id<"documents"> } }
      ).documents;
      const profilePermitId = profileDocs?.proofOfResidency;
      if (!profilePermitId) {
        skippedNoProfilePermit++;
        continue;
      }

      const profilePermitDoc = await ctx.db.get(profilePermitId);
      if (
        !profilePermitDoc ||
        profilePermitDoc.documentType !== DetailedDocumentType.ResidencePermit
      ) {
        skippedInvalidDoc++;
        continue;
      }

      if (requestDocIds.includes(profilePermitId)) {
        skippedHasPermit++;
        continue;
      }

      if (!dryRun) {
        await ctx.db.patch(request._id, {
          documents: [...requestDocIds, profilePermitId],
        });
      }
      patched++;
    }

    const newScanned = scannedTotal + page.page.length;
    const newPatched = patchedTotal + patched;

    console.log(
      `[backfillRequestResidencePermit] batch=${page.page.length} patched=${patched} ` +
        `skipped{child=${skippedChild}, hasPermit=${skippedHasPermit}, ` +
        `noProfile=${skippedNoProfile}, noProfilePermit=${skippedNoProfilePermit}, ` +
        `invalidDoc=${skippedInvalidDoc}} total{scanned=${newScanned}, patched=${newPatched}}`,
    );

    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.backfillRequestResidencePermit.processBatch,
        {
          cursor: page.continueCursor,
          dryRun,
          patchedTotal: newPatched,
          scannedTotal: newScanned,
        },
      );
    } else {
      console.log(
        `[backfillRequestResidencePermit] done dryRun=${dryRun} scanned=${newScanned} patched=${newPatched}`,
      );
    }
  },
});
