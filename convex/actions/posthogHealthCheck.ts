"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { captureServerEvent } from "./posthog";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Daily health check that emits summary events to PostHog.
 * These events can trigger PostHog alerts for operational monitoring.
 *
 * Runs at 7:00 UTC daily (registered in convex/crons.ts).
 */
export const run = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // 1. Requests stuck in processing for > 7 days
    const staleRequests = await ctx.runQuery(
      internal.crons.posthogHealthCheck.getStaleRequests,
      { olderThan: now - 7 * DAY_MS },
    );
    if (staleRequests.count > 0) {
      await captureServerEvent("system", "server_health_stale_requests", {
        count: staleRequests.count,
        oldestDays: staleRequests.oldestDays,
      });
    }

    // 2. Pending document verifications older than 48h
    const pendingVerifs = await ctx.runQuery(
      internal.crons.posthogHealthCheck.getPendingVerifications,
      { olderThan: now - 2 * DAY_MS },
    );
    if (pendingVerifs.count > 0) {
      await captureServerEvent("system", "server_health_pending_verifications", {
        count: pendingVerifs.count,
        oldestHours: pendingVerifs.oldestHours,
      });
    }
  },
});
