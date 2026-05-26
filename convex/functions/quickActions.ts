import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import { internalAction, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { buildRegistrationFormData } from "./profiles";

/**
 * Quick Action — batch mutation.
 * Finds requests with empty formData, rebuilds it from the linked profile.
 */
export const quickActionBatch = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    batchSize: v.number(),
  },
  handler: async (ctx, args) => {
    const { page, isDone, continueCursor } = await ctx.db
      .query("requests")
      .paginate({ cursor: args.cursor ?? null, numItems: args.batchSize });

    let processed = 0;
    let matched = 0;
    let patched = 0;

    for (const req of page) {
      processed++;

      const isEmpty =
        !req.formData ||
        (typeof req.formData === "object" && Object.keys(req.formData as Record<string, unknown>).length === 0);

      if (!isEmpty) continue;

      matched++;

      // Need a profileId to rebuild formData
      if (!req.profileId) {
        continue;
      }

      // Try adult profile first, then child profile
      const adultProfile = await ctx.db.get(req.profileId as Id<"profiles">);
      const childProfile = !adultProfile
        ? await ctx.db.get(req.profileId as Id<"childProfiles">)
        : null;

      const profile = adultProfile ?? childProfile;
      if (!profile) {
        continue;
      }

      const formData = buildRegistrationFormData(profile as any, "long_stay");

      await ctx.db.patch(req._id, { formData });
      patched++;
    }

    return {
      processed,
      matched,
      patched,
      continueCursor,
      isDone,
    };
  },
});

/**
 * Quick Action — orchestrator action.
 * Runs quickActionBatch in a loop across all requests.
 *
 * Usage:
 *   npx convex run functions/quickActions:runQuickAction
 */
export const runQuickAction = internalAction({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 100;
    let cursor: string | undefined = undefined;

    let totalProcessed = 0;
    let totalMatched = 0;
    let totalPatched = 0;
    let isDone = false;

    while (!isDone) {
      const result: any = await ctx.runMutation(internal.functions.quickActions.quickActionBatch, {
        cursor,
        batchSize,
      });

      totalProcessed += result.processed;
      totalMatched += result.matched;
      totalPatched += result.patched;
      cursor = result.continueCursor;
      isDone = result.isDone;
    }

    return {
      message: "Quick action completed",
      totalProcessed,
      totalMatched,
      totalPatched,
    };
  },
});

// =============================================================================
// BACKFILL EMAIL/PHONE — Data Migration
// =============================================================================

/**
 * Batch mutation: backfill missing contacts.email / contacts.phone on profiles.
 *
 * Recovery strategy (in priority order):
 *  1. User auth email from the `users` table
 *  2. formData.contact_info.email / formData.contact_info.phone on the linked request
 */
export const backfillEmailPhoneBatch = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    batchSize: v.number(),
  },
  handler: async (ctx, args) => {
    const { page, isDone, continueCursor } = await ctx.db
      .query("profiles")
      .paginate({ cursor: args.cursor ?? null, numItems: args.batchSize });

    let processed = 0;
    let missingEmail = 0;
    let missingPhone = 0;
    let patchedEmail = 0;
    let patchedPhone = 0;

    for (const profile of page) {
      processed++;

      const hasEmail = !!profile.contacts?.email;
      const hasPhone = !!profile.contacts?.phone;

      if (hasEmail && hasPhone) continue;

      if (!hasEmail) missingEmail++;
      if (!hasPhone) missingPhone++;

      let recoveredEmail: string | undefined;
      let recoveredPhone: string | undefined;

      // Strategy 1: Get from the linked user record
      if (profile.userId) {
        const user = await ctx.db.get(profile.userId);
        if (user) {
          if (!hasEmail && user.email) recoveredEmail = user.email;
          if (!hasPhone && user.phone) recoveredPhone = user.phone;
        }
      }

      // Strategy 2: Get from request formData (if still missing)
      if (!recoveredEmail || !recoveredPhone) {
        const request = await ctx.db
          .query("requests")
          .filter((q) => q.eq(q.field("profileId"), profile._id))
          .first();

        if (request?.formData) {
          const fd = request.formData as Record<string, any>;
          const contactInfo = fd.contact_info ?? {};
          if (!recoveredEmail && contactInfo.email) {
            recoveredEmail = contactInfo.email;
          }
          if (!recoveredPhone && contactInfo.phone) {
            recoveredPhone = contactInfo.phone;
          }
        }
      }

      // Apply patches
      if (recoveredEmail || recoveredPhone) {
        const patch: Record<string, any> = {
          contacts: {
            ...profile.contacts,
            ...(recoveredEmail ? { email: recoveredEmail } : {}),
            ...(recoveredPhone ? { phone: recoveredPhone } : {}),
          },
        };
        await ctx.db.patch(profile._id, patch);

        if (recoveredEmail) {
          patchedEmail++;
        }
        if (recoveredPhone) {
          patchedPhone++;
        }
      }
    }

    return {
      processed,
      missingEmail,
      missingPhone,
      patchedEmail,
      patchedPhone,
      continueCursor,
      isDone,
    };
  },
});

/**
 * Orchestrator action: runs backfillEmailPhoneBatch across all profiles.
 *
 * Usage:
 *   npx convex run functions/quickActions:runBackfillEmailPhone
 */
export const runBackfillEmailPhone = internalAction({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 100;
    let cursor: string | undefined = undefined;
    let isDone = false;

    let totalProcessed = 0;
    let totalMissingEmail = 0;
    let totalMissingPhone = 0;
    let totalPatchedEmail = 0;
    let totalPatchedPhone = 0;

    while (!isDone) {
      const result: any = await ctx.runMutation(internal.functions.quickActions.backfillEmailPhoneBatch, {
        cursor,
        batchSize,
      });

      totalProcessed += result.processed;
      totalMissingEmail += result.missingEmail;
      totalMissingPhone += result.missingPhone;
      totalPatchedEmail += result.patchedEmail;
      totalPatchedPhone += result.patchedPhone;
      cursor = result.continueCursor;
      isDone = result.isDone;
    }

    return {
      message: "Email/phone backfill completed",
      totalProcessed,
      totalMissingEmail,
      totalMissingPhone,
      totalPatchedEmail,
      totalPatchedPhone,
    };
  },
});