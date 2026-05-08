import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { RequestStatus, DocumentStatus } from "../lib/constants";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

// ─── Helper queries (run in default Convex runtime) ─────────────────────────

export const getStaleRequests = internalQuery({
  args: { olderThan: v.number() },
  handler: async (ctx, args) => {
    const stale = await ctx.db
      .query("requests")
      .filter((q) =>
        q.and(
          q.or(
            q.eq(q.field("status"), RequestStatus.Pending),
            q.eq(q.field("status"), RequestStatus.UnderReview),
            q.eq(q.field("status"), RequestStatus.InProduction),
          ),
          q.lt(q.field("_creationTime"), args.olderThan),
        ),
      )
      .take(500);

    const now = Date.now();
    const oldestCreation = stale.length > 0
      ? Math.min(...stale.map((r) => r._creationTime))
      : now;
    const oldestDays = Math.floor((now - oldestCreation) / DAY_MS);

    return { count: stale.length, oldestDays };
  },
});

export const getPendingVerifications = internalQuery({
  args: { olderThan: v.number() },
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("documents")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), DocumentStatus.Pending),
          q.lt(q.field("_creationTime"), args.olderThan),
        ),
      )
      .take(500);

    const now = Date.now();
    const oldestCreation = pending.length > 0
      ? Math.min(...pending.map((d) => d._creationTime))
      : now;
    const oldestHours = Math.floor((now - oldestCreation) / HOUR_MS);

    return { count: pending.length, oldestHours };
  },
});
