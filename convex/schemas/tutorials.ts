import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  tutorialCategoryValidator,
  tutorialTypeValidator,
  tutorialBadgeValidator,
  postStatusValidator,
  localizedStringValidator,
} from "../lib/validators";

const requirementValidator = v.union(
  v.literal("required"),
  v.literal("optional"),
  v.literal("ifAvailable"),
);

const speedValidator = v.union(
  v.literal("fast"),
  v.literal("standard"),
  v.literal("long"),
);

/**
 * Resume « Resume de la demarche » affiche dans le hero du guide.
 * Toutes les valeurs en FR par defaut + variantes I18n optionnelles.
 */
const procedureSummaryValidator = v.object({
  steps: v.optional(v.string()),
  stepsI18n: v.optional(localizedStringValidator),
  delay: v.optional(v.string()),
  delayI18n: v.optional(localizedStringValidator),
  fees: v.optional(v.string()),
  feesI18n: v.optional(localizedStringValidator),
  location: v.optional(v.string()),
  locationI18n: v.optional(localizedStringValidator),
});

/**
 * Piece a fournir.
 */
const prerequisiteValidator = v.object({
  title: v.string(),
  titleI18n: v.optional(localizedStringValidator),
  description: v.optional(v.string()),
  descriptionI18n: v.optional(localizedStringValidator),
  requirement: requirementValidator,
});

/**
 * Etape structuree d'un guide procedural.
 * `body` peut contenir du HTML Tiptap (listes, tips, callouts).
 */
const guideStepValidator = v.object({
  number: v.number(),
  title: v.string(),
  titleI18n: v.optional(localizedStringValidator),
  durationLabel: v.optional(v.string()),
  durationLabelI18n: v.optional(localizedStringValidator),
  locationLabel: v.optional(v.string()),
  locationLabelI18n: v.optional(localizedStringValidator),
  body: v.optional(v.string()),
  bodyI18n: v.optional(localizedStringValidator),
});

/**
 * Ligne tarifaire.
 */
const feeRowValidator = v.object({
  label: v.string(),
  labelI18n: v.optional(localizedStringValidator),
  description: v.optional(v.string()),
  descriptionI18n: v.optional(localizedStringValidator),
  delay: v.optional(v.string()),
  delayI18n: v.optional(localizedStringValidator),
  amount: v.string(),       // « 60 € » — string brut, conversion locale au runtime
  badge: v.optional(v.string()),
});

/**
 * Delai par zone.
 */
const delayRowValidator = v.object({
  region: v.string(),       // « europe », « afrique », « ameriques », « asie »
  label: v.string(),
  labelI18n: v.optional(localizedStringValidator),
  description: v.string(),
  descriptionI18n: v.optional(localizedStringValidator),
  speed: speedValidator,
});

/**
 * FAQ scopee au guide (separee de la table faqs globale).
 */
const guideFaqItemValidator = v.object({
  question: v.string(),
  questionI18n: v.optional(localizedStringValidator),
  answer: v.string(),
  answerI18n: v.optional(localizedStringValidator),
});

/**
 * Source externe.
 */
const tutorialSourceValidator = v.object({
  label: v.string(),
  url: v.string(),
});

/**
 * Tutorials table — Academie Numerique content.
 * Guides, videos, and articles for citizens.
 *
 * Bilinguisme : meme pattern que `posts` — string FR de base + champ
 * jumeau `*I18n` optionnel. Permet de preserver le searchIndex et la
 * compatibilite avec les contenus existants.
 */
export const tutorialsTable = defineTable({
  title: v.string(),
  titleI18n: v.optional(localizedStringValidator),
  slug: v.string(),
  excerpt: v.string(),
  excerptI18n: v.optional(localizedStringValidator),
  content: v.string(), // HTML from Tiptap (FR)
  contentI18n: v.optional(localizedStringValidator),
  coverImageStorageId: v.optional(v.id("_storage")),

  category: tutorialCategoryValidator,
  type: tutorialTypeValidator,
  duration: v.optional(v.string()),
  durationI18n: v.optional(localizedStringValidator),
  readingMinutes: v.optional(v.number()),
  stepCount: v.optional(v.number()),
  badges: v.optional(v.array(tutorialBadgeValidator)),
  featured: v.optional(v.boolean()),
  countryCode: v.optional(v.string()),
  videoUrl: v.optional(v.string()),

  status: postStatusValidator,
  publishedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
  authorId: v.id("users"),

  // === Champs editoriaux etendus (tous optionnels) ===
  lede: v.optional(v.string()),
  ledeI18n: v.optional(localizedStringValidator),
  procedureSummary: v.optional(procedureSummaryValidator),
  prerequisites: v.optional(v.array(prerequisiteValidator)),
  steps: v.optional(v.array(guideStepValidator)),
  fees: v.optional(v.array(feeRowValidator)),
  delays: v.optional(v.array(delayRowValidator)),
  faqItems: v.optional(v.array(guideFaqItemValidator)),
  relatedServiceId: v.optional(v.id("services")),
  sources: v.optional(v.array(tutorialSourceValidator)),
  availableLocales: v.optional(v.array(v.string())),
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
