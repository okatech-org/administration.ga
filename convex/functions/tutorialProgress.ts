import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getCurrentUser, requireAuth } from "../lib/auth";

/**
 * Get progress for the authenticated user across a set of tutorial IDs.
 * Returns {} if not authenticated (safe for SSR and anonymous calls).
 */
export const myProgress = query({
  args: {
    tutorialIds: v.array(v.id("tutorials")),
  },
  handler: async (ctx, args) => {
    const out: Record<
      string,
      { percent: number; completedAt?: number; lastWatchedAt: number }
    > = {};

    const user = await getCurrentUser(ctx);
    if (!user) return out;

    for (const tid of args.tutorialIds) {
      const row = await ctx.db
        .query("tutorialProgress")
        .withIndex("by_user_tutorial", (q) =>
          q.eq("userId", user._id).eq("tutorialId", tid),
        )
        .first();
      if (row) {
        out[tid] = {
          percent: row.percent,
          completedAt: row.completedAt,
          lastWatchedAt: row.lastWatchedAt,
        };
      }
    }

    return out;
  },
});

/**
 * Upsert progress for a tutorial. Percent clamped 0..100.
 * Sets completedAt automatically at ≥ 95%.
 */
export const updateProgress = mutation({
  args: {
    tutorialId: v.id("tutorials"),
    percent: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const percent = Math.max(0, Math.min(100, Math.round(args.percent)));
    const now = Date.now();

    const existing = await ctx.db
      .query("tutorialProgress")
      .withIndex("by_user_tutorial", (q) =>
        q.eq("userId", user._id).eq("tutorialId", args.tutorialId),
      )
      .first();

    const isCompleted = percent >= 95;

    if (existing) {
      await ctx.db.patch(existing._id, {
        percent,
        lastWatchedAt: now,
        completedAt:
          isCompleted ? (existing.completedAt ?? now) : existing.completedAt,
      });
      return existing._id;
    }

    return ctx.db.insert("tutorialProgress", {
      userId: user._id,
      tutorialId: args.tutorialId,
      percent,
      lastWatchedAt: now,
      completedAt: isCompleted ? now : undefined,
    });
  },
});

/**
 * Mark a tutorial as completed (100%).
 */
export const markCompleted = mutation({
  args: { tutorialId: v.id("tutorials") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query("tutorialProgress")
      .withIndex("by_user_tutorial", (q) =>
        q.eq("userId", user._id).eq("tutorialId", args.tutorialId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        percent: 100,
        lastWatchedAt: now,
        completedAt: existing.completedAt ?? now,
      });
      return existing._id;
    }

    return ctx.db.insert("tutorialProgress", {
      userId: user._id,
      tutorialId: args.tutorialId,
      percent: 100,
      lastWatchedAt: now,
      completedAt: now,
    });
  },
});
