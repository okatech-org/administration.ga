import { defineTable } from "convex/server";
import { v } from "convex/values";

export const faqsTable = defineTable({
  question: v.string(),
  answer: v.string(),
  category: v.optional(v.string()),
  order: v.optional(v.float64()),
  isActive: v.optional(v.boolean()),
  featured: v.optional(v.boolean()),
  updatedAt: v.optional(v.float64()),
  createdAt: v.optional(v.float64()),
});
