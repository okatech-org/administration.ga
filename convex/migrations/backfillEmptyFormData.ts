/**
 * Migration: Backfill empty formData on consular card registration requests.
 *
 * Finds all requests for a given orgServiceId where formData is empty ({}),
 * fetches the linked profile, and populates formData using buildRegistrationFormData.
 *
 * Usage:
 *   npx convex run migrations/backfillEmptyFormData:run '{"orgServiceId":"<ID>"}'
 *
 * Dry-run (preview only):
 *   npx convex run migrations/backfillEmptyFormData:run '{"orgServiceId":"<ID>","dryRun":true}'
 */
import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { buildRegistrationFormData } from "../functions/profiles";

function isFormDataEmpty(formData: unknown): boolean {
  if (!formData) return true;
  if (typeof formData !== "object") return false;
  const keys = Object.keys(formData as Record<string, unknown>);
  // Empty or only has meta keys (type, profileId, duration) with no actual section data
  if (keys.length === 0) return true;
  // Check if all section values are empty/undefined
  const sectionKeys = keys.filter(
    (k) => !["type", "profileId", "duration"].includes(k),
  );
  return sectionKeys.length === 0;
}

export const run = mutation({
  args: {
    orgServiceId: v.id("orgServices"),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;

    // Fetch all requests for this orgService
    const requests = await ctx.db
      .query("requests")
      .filter((q) => q.eq(q.field("orgServiceId"), args.orgServiceId))
      .collect();

    const emptyRequests = requests.filter((r) => isFormDataEmpty(r.formData));

    console.log(
      `Found ${emptyRequests.length} request(s) with empty formData out of ${requests.length} total`,
    );

    const results: Array<{
      reference: string;
      profileId: string;
      status: string;
      filled: boolean;
      reason?: string;
    }> = [];

    for (const request of emptyRequests) {
      if (!request.profileId) {
        results.push({
          reference: request.reference,
          profileId: "none",
          status: request.status,
          filled: false,
          reason: "No profileId on request",
        });
        continue;
      }

      const profile = await ctx.db.get(request.profileId);
      if (!profile) {
        results.push({
          reference: request.reference,
          profileId: request.profileId as string,
          status: request.status,
          filled: false,
          reason: "Profile not found",
        });
        continue;
      }

      const formData = buildRegistrationFormData(profile, "1_year");

      if (!dryRun) {
        await ctx.db.patch(request._id, {
          formData,
          updatedAt: Date.now(),
        });
      }

      results.push({
        reference: request.reference,
        profileId: request.profileId as string,
        status: request.status,
        filled: true,
      });
    }

    const filledCount = results.filter((r) => r.filled).length;
    const skippedCount = results.filter((r) => !r.filled).length;

    console.log(
      `${dryRun ? "[DRY RUN] " : ""}Filled: ${filledCount}, Skipped: ${skippedCount}`,
    );

    for (const r of results) {
      console.log(
        `  ${r.reference} (${r.status}) → ${r.filled ? "FILLED" : `SKIPPED: ${r.reason}`}`,
      );
    }

    return {
      dryRun,
      total: requests.length,
      emptyCount: emptyRequests.length,
      filled: filledCount,
      skipped: skippedCount,
      details: results,
    };
  },
});
