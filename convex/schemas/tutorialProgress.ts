import { defineTable } from "convex/server";
import { v } from "convex/values";

export const tutorialProgressTable = defineTable({
  userId: v.id("users"),
  tutorialId: v.id("tutorials"),
  progress: v.optional(v.float64()),
  completedAt: v.optional(v.float64()),
}).index("by_user", ["userId"]);
