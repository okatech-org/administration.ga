/**
 * Backfill pour les tables et aggregates du module /skills super-admin.
 *
 * Étapes (orchestrées par `backfillAll`) :
 *
 *   1. cvSkillItems — dénormalise tous les `cv.skills[]` existants
 *   2. aiSuggestedSkillItems — dénormalise `profiles.profession.aiSuggestedSkills[]`
 *   3. skillCatalogStats — recalcule declaredCount + aiCount + byLevel
 *   4. professionTitleStats — recalcule count par titre + catégorie
 *   5. Aggregates (TableAggregate) — idempotent insert sur profiles + cvSkillItems
 *
 * Toutes les étapes utilisent le pattern chained pagination (BATCH_SIZE
 * rows par run, schedule self continuation) pour rester sous la limite
 * de 16 Mo de lecture par mutation.
 *
 * Usage :
 *   npx convex run migrations/backfillSkillsAggregates:backfillAll
 *
 * Ou par étape :
 *   npx convex run migrations/backfillSkillsAggregates:rebuildCvSkillItems
 *   npx convex run migrations/backfillSkillsAggregates:rebuildAiSuggestedItems
 *   npx convex run migrations/backfillSkillsAggregates:rebuildStats
 *   npx convex run migrations/backfillSkillsAggregates:rebuildAggregates
 *
 * Idempotent : `insertIfDoesNotExist` côté agrégats, et un clearAll
 * préalable côté tables dérivées (cvSkillItems / aiSuggestedSkillItems
 * / skillCatalogStats / professionTitleStats) garantit la reproductibilité.
 */
import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  profilesByCategory,
  profilesByProfessionStatus,
  profilesByEnrichmentStatus,
  cvSkillItemsByLevel,
} from "../lib/aggregates";

const BATCH_SIZE = 100;

// ─── Helpers ─────────────────────────────────────────────────────────

function canonicalSkillName(raw: string): { key: string; display: string } | null {
  const display = raw.trim();
  if (display.length === 0) return null;
  return { key: display.toLowerCase(), display };
}

function canonicalTitle(raw: string): { key: string; display: string } | null {
  const display = raw.trim();
  if (display.length === 0) return null;
  return { key: display.toLowerCase(), display };
}

// ════════════════════════════════════════════════════════════════════
// 1. cvSkillItems — dénormalise cv.skills[]
// ════════════════════════════════════════════════════════════════════

export const clearCvSkillItems = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("cvSkillItems").paginate({
      cursor: args.cursor ?? null,
      numItems: BATCH_SIZE,
    });
    for (const doc of page.page) await ctx.db.delete(doc._id);
    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.backfillSkillsAggregates.clearCvSkillItems,
        { cursor: page.continueCursor },
      );
      console.log(`[skills] clearCvSkillItems: ${page.page.length} deleted, continuing`);
    } else {
      console.log(`[skills] clearCvSkillItems: done`);
    }
  },
});

export const backfillCvSkillItems = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("cv").paginate({
      cursor: args.cursor ?? null,
      numItems: BATCH_SIZE,
    });
    let inserted = 0;
    for (const cv of page.page) {
      for (const s of cv.skills ?? []) {
        const c = canonicalSkillName(s.name);
        if (!c) continue;
        await ctx.db.insert("cvSkillItems", {
          userId: cv.userId,
          cvId: cv._id,
          skillName: c.key,
          displayName: c.display,
          level: s.level,
        });
        inserted++;
      }
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.backfillSkillsAggregates.backfillCvSkillItems,
        { cursor: page.continueCursor },
      );
      console.log(
        `[skills] backfillCvSkillItems: ${page.page.length} cvs, ${inserted} items, continuing`,
      );
    } else {
      console.log(
        `[skills] backfillCvSkillItems: done (final batch ${page.page.length} cvs, ${inserted} items)`,
      );
    }
  },
});

// Reconstruit cvSkillItems (clear → backfill chaîné).
export const rebuildCvSkillItems = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("[skills] rebuildCvSkillItems: clearing…");
    await ctx.scheduler.runAfter(
      0,
      internal.migrations.backfillSkillsAggregates.clearCvSkillItems,
      {},
    );
    // Le backfill démarre une fois le clear terminé. Pour le séquencer
    // simplement, on schedule à T+10s en supposant qu'un clear de 100k
    // items ait le temps de finir. Pour les cas plus gros, lancer
    // clearCvSkillItems puis backfillCvSkillItems manuellement.
    await ctx.scheduler.runAfter(
      10_000,
      internal.migrations.backfillSkillsAggregates.backfillCvSkillItems,
      {},
    );
  },
});

// ════════════════════════════════════════════════════════════════════
// 2. aiSuggestedSkillItems — dénormalise profession.aiSuggestedSkills[]
// ════════════════════════════════════════════════════════════════════

export const clearAiSuggestedItems = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("aiSuggestedSkillItems").paginate({
      cursor: args.cursor ?? null,
      numItems: BATCH_SIZE,
    });
    for (const doc of page.page) await ctx.db.delete(doc._id);
    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.backfillSkillsAggregates.clearAiSuggestedItems,
        { cursor: page.continueCursor },
      );
      console.log(`[skills] clearAiSuggestedItems: ${page.page.length} deleted, continuing`);
    } else {
      console.log(`[skills] clearAiSuggestedItems: done`);
    }
  },
});

export const backfillAiSuggestedItems = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("profiles").paginate({
      cursor: args.cursor ?? null,
      numItems: BATCH_SIZE,
    });
    let inserted = 0;
    for (const profile of page.page) {
      for (const name of profile.profession?.aiSuggestedSkills ?? []) {
        const c = canonicalSkillName(name);
        if (!c) continue;
        await ctx.db.insert("aiSuggestedSkillItems", {
          userId: profile.userId,
          profileId: profile._id,
          skillName: c.key,
          displayName: c.display,
        });
        inserted++;
      }
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.backfillSkillsAggregates.backfillAiSuggestedItems,
        { cursor: page.continueCursor },
      );
      console.log(
        `[skills] backfillAiSuggestedItems: ${page.page.length} profiles, ${inserted} items, continuing`,
      );
    } else {
      console.log(
        `[skills] backfillAiSuggestedItems: done (final batch ${page.page.length} profiles, ${inserted} items)`,
      );
    }
  },
});

export const rebuildAiSuggestedItems = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("[skills] rebuildAiSuggestedItems: clearing…");
    await ctx.scheduler.runAfter(
      0,
      internal.migrations.backfillSkillsAggregates.clearAiSuggestedItems,
      {},
    );
    await ctx.scheduler.runAfter(
      10_000,
      internal.migrations.backfillSkillsAggregates.backfillAiSuggestedItems,
      {},
    );
  },
});

// ════════════════════════════════════════════════════════════════════
// 3. skillCatalogStats — recalcule (declaredCount, aiCount, byLevel)
// ════════════════════════════════════════════════════════════════════
// Reconstruit à zéro pour garantir la cohérence : on lit cvSkillItems +
// aiSuggestedSkillItems et on cumule par skillName. Beaucoup plus
// rapide que de recompter à chaque insert.

export const clearSkillCatalogStats = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("skillCatalogStats").paginate({
      cursor: args.cursor ?? null,
      numItems: BATCH_SIZE,
    });
    for (const doc of page.page) await ctx.db.delete(doc._id);
    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.backfillSkillsAggregates.clearSkillCatalogStats,
        { cursor: page.continueCursor },
      );
    } else {
      console.log(`[skills] clearSkillCatalogStats: done`);
    }
  },
});

type StatsAcc = {
  displayName: string;
  declared: number;
  ai: number;
  beginner: number;
  intermediate: number;
  advanced: number;
  expert: number;
};

// Accumule les compteurs cvSkillItems dans des docs `skillCatalogStats`
// en upsert. Plutôt que tenter d'agréger en RAM (limite 16 Mo), on
// patche le doc à chaque batch.
export const accumulateCvSkillStats = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("cvSkillItems").paginate({
      cursor: args.cursor ?? null,
      numItems: BATCH_SIZE,
    });
    // Regroupe le batch par skillName pour minimiser les lectures.
    const batchAcc = new Map<string, Omit<StatsAcc, "ai">>();
    for (const it of page.page) {
      const cur = batchAcc.get(it.skillName) ?? {
        displayName: it.displayName,
        declared: 0,
        beginner: 0,
        intermediate: 0,
        advanced: 0,
        expert: 0,
      };
      cur.declared++;
      cur[it.level]++;
      batchAcc.set(it.skillName, cur);
    }
    for (const [key, acc] of batchAcc) {
      const existing = await ctx.db
        .query("skillCatalogStats")
        .withIndex("by_name", (q) => q.eq("skillName", key))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, {
          declaredCount: existing.declaredCount + acc.declared,
          byLevel: {
            beginner: existing.byLevel.beginner + acc.beginner,
            intermediate: existing.byLevel.intermediate + acc.intermediate,
            advanced: existing.byLevel.advanced + acc.advanced,
            expert: existing.byLevel.expert + acc.expert,
          },
        });
      } else {
        await ctx.db.insert("skillCatalogStats", {
          skillName: key,
          displayName: acc.displayName,
          declaredCount: acc.declared,
          aiCount: 0,
          byLevel: {
            beginner: acc.beginner,
            intermediate: acc.intermediate,
            advanced: acc.advanced,
            expert: acc.expert,
          },
        });
      }
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.backfillSkillsAggregates.accumulateCvSkillStats,
        { cursor: page.continueCursor },
      );
    } else {
      console.log(`[skills] accumulateCvSkillStats: done`);
    }
  },
});

export const accumulateAiSuggestedStats = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("aiSuggestedSkillItems").paginate({
      cursor: args.cursor ?? null,
      numItems: BATCH_SIZE,
    });
    const batchAcc = new Map<string, { display: string; count: number }>();
    for (const it of page.page) {
      const cur = batchAcc.get(it.skillName) ?? { display: it.displayName, count: 0 };
      cur.count++;
      batchAcc.set(it.skillName, cur);
    }
    for (const [key, acc] of batchAcc) {
      const existing = await ctx.db
        .query("skillCatalogStats")
        .withIndex("by_name", (q) => q.eq("skillName", key))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, {
          aiCount: existing.aiCount + acc.count,
        });
      } else {
        await ctx.db.insert("skillCatalogStats", {
          skillName: key,
          displayName: acc.display,
          declaredCount: 0,
          aiCount: acc.count,
          byLevel: { beginner: 0, intermediate: 0, advanced: 0, expert: 0 },
        });
      }
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.backfillSkillsAggregates.accumulateAiSuggestedStats,
        { cursor: page.continueCursor },
      );
    } else {
      console.log(`[skills] accumulateAiSuggestedStats: done`);
    }
  },
});

export const rebuildSkillCatalogStats = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("[skills] rebuildSkillCatalogStats: clearing…");
    await ctx.scheduler.runAfter(
      0,
      internal.migrations.backfillSkillsAggregates.clearSkillCatalogStats,
      {},
    );
    await ctx.scheduler.runAfter(
      10_000,
      internal.migrations.backfillSkillsAggregates.accumulateCvSkillStats,
      {},
    );
    await ctx.scheduler.runAfter(
      20_000,
      internal.migrations.backfillSkillsAggregates.accumulateAiSuggestedStats,
      {},
    );
  },
});

// ════════════════════════════════════════════════════════════════════
// 4. professionTitleStats — recalcule count par titre libre
// ════════════════════════════════════════════════════════════════════

export const clearProfessionTitleStats = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("professionTitleStats").paginate({
      cursor: args.cursor ?? null,
      numItems: BATCH_SIZE,
    });
    for (const doc of page.page) await ctx.db.delete(doc._id);
    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.backfillSkillsAggregates.clearProfessionTitleStats,
        { cursor: page.continueCursor },
      );
    } else {
      console.log(`[skills] clearProfessionTitleStats: done`);
    }
  },
});

export const accumulateProfessionTitles = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("profiles").paginate({
      cursor: args.cursor ?? null,
      numItems: BATCH_SIZE,
    });
    for (const profile of page.page) {
      const title = profile.profession?.title;
      if (!title) continue;
      const c = canonicalTitle(title);
      if (!c) continue;
      const existing = await ctx.db
        .query("professionTitleStats")
        .withIndex("by_title", (q) => q.eq("titleLower", c.key))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, {
          count: existing.count + 1,
          ...(profile.profession?.category !== undefined
            ? { category: profile.profession.category }
            : {}),
        });
      } else {
        await ctx.db.insert("professionTitleStats", {
          titleLower: c.key,
          displayTitle: c.display,
          count: 1,
          category: profile.profession?.category,
        });
      }
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.backfillSkillsAggregates.accumulateProfessionTitles,
        { cursor: page.continueCursor },
      );
    } else {
      console.log(`[skills] accumulateProfessionTitles: done`);
    }
  },
});

export const rebuildProfessionTitleStats = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("[skills] rebuildProfessionTitleStats: clearing…");
    await ctx.scheduler.runAfter(
      0,
      internal.migrations.backfillSkillsAggregates.clearProfessionTitleStats,
      {},
    );
    await ctx.scheduler.runAfter(
      10_000,
      internal.migrations.backfillSkillsAggregates.accumulateProfessionTitles,
      {},
    );
  },
});

// ════════════════════════════════════════════════════════════════════
// 5. Aggregates (B-tree component) — idempotent insert
// ════════════════════════════════════════════════════════════════════

async function chainedInsertIfDoesNotExist(
  ctx: any,
  tableName: string,
  aggregate: { insertIfDoesNotExist: (ctx: any, doc: any) => Promise<void> },
  continuationFn: any,
  cursor?: string,
) {
  const page = await ctx.db.query(tableName).paginate({
    cursor: cursor ?? null,
    numItems: BATCH_SIZE,
  });
  for (const doc of page.page) {
    await aggregate.insertIfDoesNotExist(ctx, doc);
  }
  if (!page.isDone) {
    await ctx.scheduler.runAfter(0, continuationFn, { cursor: page.continueCursor });
  } else {
    console.log(`[skills] aggregate ${tableName}: done (final ${page.page.length} rows)`);
  }
}

export const backfillProfilesByCategory = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await chainedInsertIfDoesNotExist(
      ctx,
      "profiles",
      profilesByCategory,
      internal.migrations.backfillSkillsAggregates.backfillProfilesByCategory,
      args.cursor,
    );
  },
});

export const backfillProfilesByProfessionStatus = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await chainedInsertIfDoesNotExist(
      ctx,
      "profiles",
      profilesByProfessionStatus,
      internal.migrations.backfillSkillsAggregates.backfillProfilesByProfessionStatus,
      args.cursor,
    );
  },
});

export const backfillProfilesByEnrichmentStatus = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await chainedInsertIfDoesNotExist(
      ctx,
      "profiles",
      profilesByEnrichmentStatus,
      internal.migrations.backfillSkillsAggregates.backfillProfilesByEnrichmentStatus,
      args.cursor,
    );
  },
});

export const backfillCvSkillItemsByLevel = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await chainedInsertIfDoesNotExist(
      ctx,
      "cvSkillItems",
      cvSkillItemsByLevel,
      internal.migrations.backfillSkillsAggregates.backfillCvSkillItemsByLevel,
      args.cursor,
    );
  },
});

export const rebuildAggregates = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("[skills] rebuildAggregates: clearing all 4 aggregates…");
    await profilesByCategory.clearAll(ctx);
    await profilesByProfessionStatus.clearAll(ctx);
    await profilesByEnrichmentStatus.clearAll(ctx);
    await cvSkillItemsByLevel.clearAll(ctx);
    // Schedule backfill avec espacement pour éviter contention.
    const fns = [
      internal.migrations.backfillSkillsAggregates.backfillProfilesByCategory,
      internal.migrations.backfillSkillsAggregates.backfillProfilesByProfessionStatus,
      internal.migrations.backfillSkillsAggregates.backfillProfilesByEnrichmentStatus,
      internal.migrations.backfillSkillsAggregates.backfillCvSkillItemsByLevel,
    ];
    for (let i = 0; i < fns.length; i++) {
      await ctx.scheduler.runAfter(i * 2000, fns[i], {});
    }
  },
});

// ════════════════════════════════════════════════════════════════════
// Orchestrator — exécute toutes les étapes dans l'ordre
// ════════════════════════════════════════════════════════════════════

/**
 * Backfill complet du module /skills.
 *
 *   npx convex run migrations/backfillSkillsAggregates:backfillAll
 *
 * Délais entre étapes pour minimiser la contention :
 *   T+0s    : clear cvSkillItems
 *   T+15s   : backfill cvSkillItems
 *   T+60s   : clear aiSuggestedSkillItems
 *   T+75s   : backfill aiSuggestedSkillItems
 *   T+120s  : clear skillCatalogStats + professionTitleStats
 *   T+135s  : accumulate skillCatalogStats (cv + ai)
 *   T+150s  : accumulate professionTitleStats
 *   T+180s  : rebuild aggregates (clear + backfill)
 *
 * Les délais sont conservateurs ; pour des datasets < 10k profils ça
 * passe en < 60s en pratique.
 */
export const backfillAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const at = (sec: number, fn: any) =>
      ctx.scheduler.runAfter(sec * 1000, fn, {});

    await at(0, internal.migrations.backfillSkillsAggregates.clearCvSkillItems);
    await at(15, internal.migrations.backfillSkillsAggregates.backfillCvSkillItems);
    await at(60, internal.migrations.backfillSkillsAggregates.clearAiSuggestedItems);
    await at(75, internal.migrations.backfillSkillsAggregates.backfillAiSuggestedItems);

    await at(120, internal.migrations.backfillSkillsAggregates.clearSkillCatalogStats);
    await at(120, internal.migrations.backfillSkillsAggregates.clearProfessionTitleStats);
    await at(135, internal.migrations.backfillSkillsAggregates.accumulateCvSkillStats);
    await at(140, internal.migrations.backfillSkillsAggregates.accumulateAiSuggestedStats);
    await at(150, internal.migrations.backfillSkillsAggregates.accumulateProfessionTitles);

    await at(180, internal.migrations.backfillSkillsAggregates.rebuildAggregates);

    console.log("[skills] backfillAll: scheduled all phases");
  },
});
