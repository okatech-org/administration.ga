import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  postCategoryValidator,
  postStatusValidator,
  localizedStringValidator,
} from "../lib/validators";

/**
 * Source / reference link affichee en pied d'article.
 */
const articleSourceValidator = v.object({
  label: v.string(),
  url: v.string(),
});

/**
 * Posts table — Actualites, Evenements, Communiques.
 *
 * Champs etendus pour supporter la maquette Article.html.
 *
 * Bilinguisme : `title` / `excerpt` / `content` restent string FR (pour
 * preserver le searchIndex et les usages existants). Les champs jumeaux
 * `titleI18n` / `excerptI18n` / `contentI18n` portent la version bilingue
 * `{fr, en}` quand presente. Le renderer doit utiliser
 * `getLocalizedValue(titleI18n ?? title, lang)`. Meme pattern que
 * `org.nameI18n`.
 */
export const postsTable = defineTable({
  // === Champs communs ===
  title: v.string(),
  titleI18n: v.optional(localizedStringValidator),
  slug: v.string(),
  excerpt: v.string(),
  excerptI18n: v.optional(localizedStringValidator),
  content: v.string(), // HTML from Tiptap editor (FR)
  contentI18n: v.optional(localizedStringValidator),
  coverImageStorageId: v.optional(v.id("_storage")),

  category: postCategoryValidator,
  status: postStatusValidator,

  // Publication
  publishedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),

  // Relations
  orgId: v.optional(v.id("orgs")), // null = global post (superadmin)
  authorId: v.id("users"),

  // === Champs editoriaux etendus (tous optionnels) ===
  lede: v.optional(v.string()),
  ledeI18n: v.optional(localizedStringValidator),
  heroImageCaption: v.optional(v.string()),
  heroImageCaptionI18n: v.optional(localizedStringValidator),
  heroImageCredit: v.optional(v.string()),                   // « © MAEAI / Reuters »
  readingMinutes: v.optional(v.number()),
  location: v.optional(v.string()),                          // « Houston, Texas »
  subCategory: v.optional(v.string()),                       // « Diplomatie »
  subCategoryI18n: v.optional(localizedStringValidator),
  region: v.optional(v.string()),                            // code zone (AMERIQUES, EUROPE, AFRIQUE, ASIE)
  tags: v.optional(v.array(v.string())),                     // slugs
  sources: v.optional(v.array(articleSourceValidator)),
  referenceNumber: v.optional(v.string()),                   // « N° 2026-118 »
  authorName: v.optional(v.string()),
  authorRole: v.optional(v.string()),

  // === Champs EVENEMENT ===
  eventStartAt: v.optional(v.number()),
  eventEndAt: v.optional(v.number()),
  eventLocation: v.optional(v.string()),
  eventTicketUrl: v.optional(v.string()),

  // === Champs COMMUNIQUE ===
  documentStorageId: v.optional(v.id("_storage")), // PDF officiel
})
  .index("by_slug", ["slug"])
  .index("by_category", ["category"])
  .index("by_status", ["status"])
  .index("by_org", ["orgId"])
  .index("by_published", ["status", "publishedAt"])
  .index("by_org_status", ["orgId", "status"])
  .index("by_region", ["region", "status"]);
