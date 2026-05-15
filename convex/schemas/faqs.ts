import { defineTable } from "convex/server";
import { v } from "convex/values";
import { faqCategoryValidator } from "../lib/validators";

/**
 * FAQs table - Foire aux questions publique
 * Géré côté backoffice, exposé en lecture publique
 */
export const faqsTable = defineTable({
  question: v.string(),
  answer: v.string(),
  category: faqCategoryValidator,
  order: v.number(),
  featured: v.boolean(),
  isActive: v.boolean(),
  updatedAt: v.number(),
})
  .index("by_active_order", ["isActive", "order"])
  .index("by_category_order", ["category", "order"])
  .index("by_featured", ["featured", "isActive"])
  .searchIndex("search_qa", {
    searchField: "question",
    filterFields: ["isActive", "category"],
  });
