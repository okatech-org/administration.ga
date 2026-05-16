import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { PostStatus, TutorialCategory } from "../lib/constants";
import {
  tutorialCategoryValidator,
  tutorialTypeValidator,
  tutorialBadgeValidator,
  postStatusValidator,
  localizedStringValidator,
} from "../lib/validators";
import { requireBackOfficeAccess } from "../lib/auth";
import { error, ErrorCode } from "../lib/errors";

// ────────────────────────────────────────────────────────────────────────
// Editorial extension validators (Guide.html maquette)
// ────────────────────────────────────────────────────────────────────────
const requirementV = v.union(
  v.literal("required"),
  v.literal("optional"),
  v.literal("ifAvailable"),
);
const speedV = v.union(
  v.literal("fast"),
  v.literal("standard"),
  v.literal("long"),
);

const procedureSummaryArg = v.object({
  steps: v.optional(v.string()),
  stepsI18n: v.optional(localizedStringValidator),
  delay: v.optional(v.string()),
  delayI18n: v.optional(localizedStringValidator),
  fees: v.optional(v.string()),
  feesI18n: v.optional(localizedStringValidator),
  location: v.optional(v.string()),
  locationI18n: v.optional(localizedStringValidator),
});

const prerequisiteArg = v.object({
  title: v.string(),
  titleI18n: v.optional(localizedStringValidator),
  description: v.optional(v.string()),
  descriptionI18n: v.optional(localizedStringValidator),
  requirement: requirementV,
});

const guideStepArg = v.object({
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

const feeRowArg = v.object({
  label: v.string(),
  labelI18n: v.optional(localizedStringValidator),
  description: v.optional(v.string()),
  descriptionI18n: v.optional(localizedStringValidator),
  delay: v.optional(v.string()),
  delayI18n: v.optional(localizedStringValidator),
  amount: v.string(),
  badge: v.optional(v.string()),
});

const delayRowArg = v.object({
  region: v.string(),
  label: v.string(),
  labelI18n: v.optional(localizedStringValidator),
  description: v.string(),
  descriptionI18n: v.optional(localizedStringValidator),
  speed: speedV,
});

const guideFaqArg = v.object({
  question: v.string(),
  questionI18n: v.optional(localizedStringValidator),
  answer: v.string(),
  answerI18n: v.optional(localizedStringValidator),
});

const tutorialSourceArg = v.object({
  label: v.string(),
  url: v.string(),
});

const tutorialEditorialExtraArgs = {
  titleI18n: v.optional(localizedStringValidator),
  excerptI18n: v.optional(localizedStringValidator),
  contentI18n: v.optional(localizedStringValidator),
  durationI18n: v.optional(localizedStringValidator),
  lede: v.optional(v.string()),
  ledeI18n: v.optional(localizedStringValidator),
  procedureSummary: v.optional(procedureSummaryArg),
  prerequisites: v.optional(v.array(prerequisiteArg)),
  steps: v.optional(v.array(guideStepArg)),
  fees: v.optional(v.array(feeRowArg)),
  delays: v.optional(v.array(delayRowArg)),
  faqItems: v.optional(v.array(guideFaqArg)),
  relatedServiceId: v.optional(v.id("services")),
  sources: v.optional(v.array(tutorialSourceArg)),
  availableLocales: v.optional(v.array(v.string())),
} as const;

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * List published tutorials with optional category filter
 */
export const list = query({
  args: {
    category: v.optional(tutorialCategoryValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let tutorials;
    if (args.category) {
      tutorials = await ctx.db
        .query("tutorials")
        .withIndex("by_category_status", (q) => q.eq("category", args.category!).eq("status", PostStatus.Published))
        .collect();
      // Sort by publishedAt desc and limit
      tutorials = tutorials
        .sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0))
        .slice(0, limit);
    } else {
      tutorials = await ctx.db
        .query("tutorials")
        .withIndex("by_published", (q) => q.eq("status", PostStatus.Published))
        .order("desc")
        .take(limit);
    }

    // Resolve cover images
    return Promise.all(
      tutorials.map(async (tutorial) => {
        let coverImageUrl: string | null = null;
        if (tutorial.coverImageStorageId) {
          coverImageUrl = await ctx.storage.getUrl(
            tutorial.coverImageStorageId,
          );
        }
        return { ...tutorial, coverImageUrl };
      }),
    );
  },
});

/**
 * Get a single tutorial by slug (public).
 * Resolves cover image, author, and related service (for the « Commencer
 * la demarche » CTA on guide detail pages).
 */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const tutorial = await ctx.db
      .query("tutorials")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!tutorial || tutorial.status !== "published") {
      return null;
    }

    let coverImageUrl: string | null = null;
    if (tutorial.coverImageStorageId) {
      coverImageUrl = await ctx.storage.getUrl(tutorial.coverImageStorageId);
    }

    // Get author info
    const author = await ctx.db.get(tutorial.authorId);

    // Related service for guide CTA
    let relatedService:
      | { _id: string; slug: string; name: unknown; category?: string }
      | null = null;
    if (tutorial.relatedServiceId) {
      const svc = await ctx.db.get(tutorial.relatedServiceId);
      if (svc) {
        relatedService = {
          _id: svc._id,
          slug: svc.slug,
          name: svc.name,
          category: svc.category,
        };
      }
    }

    return {
      ...tutorial,
      coverImageUrl,
      authorName: author?.name ?? "Inconnu",
      relatedService,
    };
  },
});

/**
 * Related tutorials for the « Guides complementaires » section.
 *
 * Strategy:
 *  - same `category` first
 *  - then same `countryCode` (or WORLD)
 *  - fallback : latest published
 */
export const getRelated = query({
  args: {
    slug: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 3;
    const current = await ctx.db
      .query("tutorials")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!current) return [];

    const published = await ctx.db
      .query("tutorials")
      .withIndex("by_published", (q) =>
        q.eq("status", PostStatus.Published),
      )
      .order("desc")
      .take(60);

    const candidates = published.filter((t) => t._id !== current._id);

    const scored = candidates.map((t) => {
      let score = 0;
      if (t.category === current.category) score += 3;
      if (t.countryCode && current.countryCode) {
        if (t.countryCode === current.countryCode) score += 2;
        else if (t.countryCode === "WORLD") score += 1;
      }
      if (t.featured) score += 0.5;
      return { tutorial: t, score };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.tutorial.publishedAt ?? 0) - (a.tutorial.publishedAt ?? 0);
    });

    const top = scored.slice(0, limit).map((s) => s.tutorial);

    return Promise.all(
      top.map(async (t) => ({
        ...t,
        coverImageUrl: t.coverImageStorageId
          ? await ctx.storage.getUrl(t.coverImageStorageId)
          : null,
      })),
    );
  },
});

/**
 * List featured tutorials (for the "Vos guides personnalisés" section)
 */
export const listFeatured = query({
  args: {
    countryCode: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 6;

    const featured = await ctx.db
      .query("tutorials")
      .withIndex("by_featured_status", (q) =>
        q.eq("featured", true).eq("status", PostStatus.Published),
      )
      .collect();

    const filtered = args.countryCode
      ? featured.filter(
          (t) =>
            !t.countryCode ||
            t.countryCode === "WORLD" ||
            t.countryCode === args.countryCode,
        )
      : featured;

    const sliced = filtered
      .sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0))
      .slice(0, limit);

    return Promise.all(
      sliced.map(async (tutorial) => {
        const coverImageUrl = tutorial.coverImageStorageId
          ? await ctx.storage.getUrl(tutorial.coverImageStorageId)
          : null;
        return { ...tutorial, coverImageUrl };
      }),
    );
  },
});

/**
 * Count published tutorials grouped by category
 */
export const countByCategory = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db
      .query("tutorials")
      .withIndex("by_status", (q) => q.eq("status", PostStatus.Published))
      .collect();

    const counts: Record<string, number> = {
      [TutorialCategory.Administrative]: 0,
      [TutorialCategory.Entrepreneurship]: 0,
      [TutorialCategory.Travel]: 0,
      [TutorialCategory.PracticalLife]: 0,
      [TutorialCategory.ConsularProcedures]: 0,
      [TutorialCategory.CivilStatus]: 0,
      [TutorialCategory.EducationGrants]: 0,
      [TutorialCategory.Taxation]: 0,
      [TutorialCategory.ReturnGabon]: 0,
    };

    for (const t of all) {
      counts[t.category] = (counts[t.category] ?? 0) + 1;
    }

    return { total: all.length, byCategory: counts };
  },
});

/**
 * Full-text search across published tutorials
 */
export const search = query({
  args: {
    q: v.string(),
    category: v.optional(tutorialCategoryValidator),
    type: v.optional(tutorialTypeValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const q = args.q.trim();
    if (!q) return [];

    const results = await ctx.db
      .query("tutorials")
      .withSearchIndex("search_content", (b) => {
        let expr = b.search("title", q).eq("status", PostStatus.Published);
        if (args.category) expr = expr.eq("category", args.category);
        if (args.type) expr = expr.eq("type", args.type);
        return expr;
      })
      .take(limit);

    return Promise.all(
      results.map(async (tutorial) => {
        const coverImageUrl = tutorial.coverImageStorageId
          ? await ctx.storage.getUrl(tutorial.coverImageStorageId)
          : null;
        return { ...tutorial, coverImageUrl };
      }),
    );
  },
});

// ============================================================================
// SUPERADMIN QUERIES
// ============================================================================

/**
 * List all tutorials (superadmin only)
 */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireBackOfficeAccess(ctx);
    const tutorials = await ctx.db.query("tutorials").order("desc").take(200);

    return Promise.all(
      tutorials.map(async (tutorial) => {
        const coverImageUrl =
          tutorial.coverImageStorageId ?
            await ctx.storage.getUrl(tutorial.coverImageStorageId)
          : null;
        const author = await ctx.db.get(tutorial.authorId);

        return {
          ...tutorial,
          coverImageUrl,
          authorName: author?.name ?? "Inconnu",
        };
      }),
    );
  },
});

/**
 * Get a single tutorial by ID (for editing)
 */
export const getById = query({
  args: { tutorialId: v.id("tutorials") },
  handler: async (ctx, args) => {
    const tutorial = await ctx.db.get(args.tutorialId);
    if (!tutorial) return null;

    const coverImageUrl =
      tutorial.coverImageStorageId ?
        await ctx.storage.getUrl(tutorial.coverImageStorageId)
      : null;

    return { ...tutorial, coverImageUrl };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new tutorial
 */
export const create = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    content: v.string(),
    category: tutorialCategoryValidator,
    type: tutorialTypeValidator,
    duration: v.optional(v.string()),
    readingMinutes: v.optional(v.number()),
    stepCount: v.optional(v.number()),
    badges: v.optional(v.array(tutorialBadgeValidator)),
    featured: v.optional(v.boolean()),
    countryCode: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    coverImageStorageId: v.optional(v.id("_storage")),
    publish: v.optional(v.boolean()),

    // Editorial extensions (Guide.html maquette)
    ...tutorialEditorialExtraArgs,
  },
  handler: async (ctx, args) => {
    const user = await requireBackOfficeAccess(ctx);

    const existing = await ctx.db
      .query("tutorials")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      throw error(
        ErrorCode.TUTORIAL_SLUG_EXISTS,
        "Un tutoriel avec ce slug existe déjà",
      );
    }

    const now = Date.now();
    const status = args.publish ? PostStatus.Published : PostStatus.Draft;
    const { publish: _publish, ...rest } = args;

    const tutorialId = await ctx.db.insert("tutorials", {
      ...rest,
      stepCount: rest.stepCount ?? rest.steps?.length,
      status,
      publishedAt: _publish ? now : undefined,
      createdAt: now,
      updatedAt: now,
      authorId: user._id,
    });

    return tutorialId;
  },
});

/**
 * Update an existing tutorial
 */
export const update = mutation({
  args: {
    tutorialId: v.id("tutorials"),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    excerpt: v.optional(v.string()),
    content: v.optional(v.string()),
    category: v.optional(tutorialCategoryValidator),
    type: v.optional(tutorialTypeValidator),
    duration: v.optional(v.string()),
    readingMinutes: v.optional(v.number()),
    stepCount: v.optional(v.number()),
    badges: v.optional(v.array(tutorialBadgeValidator)),
    featured: v.optional(v.boolean()),
    countryCode: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    coverImageStorageId: v.optional(v.id("_storage")),

    // Editorial extensions (Guide.html maquette)
    ...tutorialEditorialExtraArgs,
  },
  handler: async (ctx, args) => {
    await requireBackOfficeAccess(ctx);

    const tutorial = await ctx.db.get(args.tutorialId);
    if (!tutorial) {
      throw error(ErrorCode.TUTORIAL_NOT_FOUND, "Tutoriel non trouvé");
    }

    if (args.slug && args.slug !== tutorial.slug) {
      const existing = await ctx.db
        .query("tutorials")
        .withIndex("by_slug", (q) => q.eq("slug", args.slug!))
        .first();

      if (existing) {
        throw error(
          ErrorCode.TUTORIAL_SLUG_EXISTS,
          "Un tutoriel avec ce slug existe déjà",
        );
      }
    }

    const { tutorialId, ...updates } = args;

    await ctx.db.patch(tutorialId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return tutorialId;
  },
});

/**
 * Publish or unpublish a tutorial
 */
export const setStatus = mutation({
  args: {
    tutorialId: v.id("tutorials"),
    status: postStatusValidator,
  },
  handler: async (ctx, args) => {
    await requireBackOfficeAccess(ctx);

    const tutorial = await ctx.db.get(args.tutorialId);
    if (!tutorial) {
      throw error(ErrorCode.TUTORIAL_NOT_FOUND, "Tutoriel non trouvé");
    }

    await ctx.db.patch(args.tutorialId, {
      status: args.status,
      publishedAt:
        args.status === PostStatus.Published ?
          Date.now()
        : tutorial.publishedAt,
    });

    return args.tutorialId;
  },
});

/**
 * Delete a tutorial
 */
export const remove = mutation({
  args: { tutorialId: v.id("tutorials") },
  handler: async (ctx, args) => {
    await requireBackOfficeAccess(ctx);

    const tutorial = await ctx.db.get(args.tutorialId);
    if (!tutorial) {
      throw error(ErrorCode.TUTORIAL_NOT_FOUND, "Tutoriel non trouvé");
    }

    // Delete associated files
    if (tutorial.coverImageStorageId) {
      await ctx.storage.delete(tutorial.coverImageStorageId);
    }

    await ctx.db.delete(args.tutorialId);

    return args.tutorialId;
  },
});
