import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  tutorialCategoryValidator,
  tutorialTypeValidator,
  tutorialBadgeValidator,
  postStatusValidator,
} from "../lib/validators";

/**
 * Tutorials table - Académie Numérique content
 * Guides, videos, and articles for citizens
 */
export const tutorialsTable = defineTable({
  title: v.string(),
  slug: v.string(),
  excerpt: v.string(),
  content: v.string(), // HTML from Tiptap
  coverImageStorageId: v.optional(v.id("_storage")),

  category: tutorialCategoryValidator,
  type: tutorialTypeValidator,
  duration: v.optional(v.string()), // video runtime "7:42"
  readingMinutes: v.optional(v.number()), // for fiches / articles
  stepCount: v.optional(v.number()), // procedural fiches
  badges: v.optional(v.array(tutorialBadgeValidator)),
  featured: v.optional(v.boolean()),
  countryCode: v.optional(v.string()), // ISO-2 or "WORLD"
  videoUrl: v.optional(v.string()),

  status: postStatusValidator,
  publishedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
  authorId: v.id("users"),
})
  .index("by_slug", ["slug"])
  .index("by_category", ["category"])
  .index("by_status", ["status"])
  .index("by_published", ["status", "publishedAt"])
  .index("by_category_status", ["category", "status"])
  .index("by_featured_status", ["featured", "status"])
  .searchIndex("search_content", {
    searchField: "title",
    filterFields: ["status", "category", "type", "countryCode"],
  });
