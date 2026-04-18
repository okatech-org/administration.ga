import { defineTable } from "convex/server";
import { v } from "convex/values";

export const profileNotesTable = defineTable({
  profileId: v.union(v.id("profiles"), v.id("childProfiles")),
  authorId: v.id("users"),
  content: v.string(),
  createdAt: v.number(),
}).index("by_profile", ["profileId", "createdAt"]);
