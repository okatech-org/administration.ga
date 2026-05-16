import { v } from "convex/values";
import { query } from "../_generated/server";
import { PostStatus } from "../lib/constants";

/**
 * Aggregate stats for the public /ressources hero
 */
export const stats = query({
  args: {},
  handler: async (ctx) => {
    const [guides, tutorials, faqs] = await Promise.all([
      ctx.db
        .query("guides")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect(),
      ctx.db
        .query("tutorials")
        .withIndex("by_status", (q) => q.eq("status", PostStatus.Published))
        .collect(),
      ctx.db
        .query("faqs")
        .withIndex("by_active_order", (q) => q.eq("isActive", true))
        .collect(),
    ]);

    const byCategory: Record<string, number> = {};
    for (const t of tutorials) {
      byCategory[t.category] = (byCategory[t.category] ?? 0) + 1;
    }

    const byType: Record<string, number> = {};
    for (const t of tutorials) {
      byType[t.type] = (byType[t.type] ?? 0) + 1;
    }

    return {
      guidesCount: guides.length,
      tutorialsCount: tutorials.length,
      videosCount: byType["video"] ?? 0,
      faqsCount: faqs.length,
      languagesCount: 12, // FR/EN + 10 langues planifiées
      byCategory,
      total: tutorials.length,
    };
  },
});

type UnifiedResult = {
  kind: "tutorial" | "faq" | "guide";
  id: string;
  title: string;
  excerpt: string;
  href: string;
  category?: string;
};

/**
 * Unified full-text search across tutorials, FAQs, and guides.
 * Fan-out (Convex searchIndex is per-table). Results interleaved by kind.
 */
export const search = query({
  args: {
    q: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const q = args.q.trim();
    if (!q) return [] as UnifiedResult[];
    const perKind = Math.max(1, Math.floor((args.limit ?? 12) / 3));

    const [tutorialHits, faqHits, guideAll] = await Promise.all([
      ctx.db
        .query("tutorials")
        .withSearchIndex("search_content", (b) =>
          b.search("title", q).eq("status", PostStatus.Published),
        )
        .take(perKind),
      ctx.db
        .query("faqs")
        .withSearchIndex("search_qa", (b) =>
          b.search("question", q).eq("isActive", true),
        )
        .take(perKind),
      // No search index on guides (rich nested content) — fallback scan
      ctx.db
        .query("guides")
        .withIndex("by_active", (qb) => qb.eq("isActive", true))
        .collect(),
    ]);

    const lowerQ = q.toLowerCase();
    const guideHits = guideAll
      .filter((g) => {
        const t = `${g.title.fr} ${g.title.en} ${g.subtitle.fr} ${g.subtitle.en}`.toLowerCase();
        return t.includes(lowerQ);
      })
      .slice(0, perKind);

    const results: UnifiedResult[] = [];

    for (const t of tutorialHits) {
      results.push({
        kind: "tutorial",
        id: t._id,
        title: t.title,
        excerpt: t.excerpt,
        href: `/ressources/${t.slug}`,
        category: t.category,
      });
    }
    for (const f of faqHits) {
      results.push({
        kind: "faq",
        id: f._id,
        title: f.question,
        excerpt: f.answer.slice(0, 160),
        href: `/faq#${f._id}`,
        category: f.category,
      });
    }
    for (const g of guideHits) {
      results.push({
        kind: "guide",
        id: g._id,
        title: g.title.fr,
        excerpt: g.subtitle.fr,
        href: `/ressources/guides/${g.slug}`,
      });
    }

    return results;
  },
});
