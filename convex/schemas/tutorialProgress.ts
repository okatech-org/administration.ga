import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Tutorial progress per user
 * 0-100 percent + lastWatchedAt + completedAt
 */
export const tutorialProgressTable = defineTable({
  userId: v.id("users"),
  tutorialId: v.id("tutorials"),
  percent: v.number(),
  lastWatchedAt: v.number(),
  completedAt: v.optional(v.number()),
})
  .index("by_user_tutorial", ["userId", "tutorialId"])
  .index("by_user", ["userId"]);
