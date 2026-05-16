/**
 * Queries server-side du module super-admin /skills.
 *
 * Toutes les agrégations sont en O(log n) via :
 *   - 4 aggregates Convex (`profilesByCategory`, `profilesByProfessionStatus`,
 *     `profilesByEnrichmentStatus`, `cvSkillItemsByLevel`)
 *   - 2 tables stats indexées par count (`skillCatalogStats`,
 *     `professionTitleStats`)
 *   - `globalCounts` + `usersByCountry` déjà en place
 *
 * Architecture maintenue par triggers — cf.
 * `convex/triggers/skillsAggregation.ts`.
 *
 * Backfill initial : voir
 * `convex/migrations/backfillSkillsAggregates.ts`.
 */

import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { backofficeQuery } from "../lib/customFunctions";
import {
  cvSkillItemsByLevel,
  globalCounts,
  profilesByCategory,
  profilesByEnrichmentStatus,
  profilesByProfessionStatus,
  usersByCountry,
} from "../lib/aggregates";
import {
  PROFESSION_CATEGORY_VALUES,
  type ProfessionCategoryValue,
} from "../lib/validators";
import { SkillLevel, WorkStatus } from "../lib/constants";
import type { Doc, Id } from "../_generated/dataModel";

// ─── Constantes utilitaires ─────────────────────────────────────────

const ENRICHMENT_STATUSES = [
  "no_title",
  "pending",
  "enriched",
  "ai_failed",
] as const;
type EnrichmentStatus = (typeof ENRICHMENT_STATUSES)[number];

const WORK_STATUS_VALUES = [
  WorkStatus.Employee,
  WorkStatus.SelfEmployed,
  WorkStatus.Entrepreneur,
  WorkStatus.Unemployed,
  WorkStatus.Retired,
  WorkStatus.Student,
  WorkStatus.Other,
] as const;

const SKILL_LEVEL_VALUES = [
  SkillLevel.Beginner,
  SkillLevel.Intermediate,
  SkillLevel.Advanced,
  SkillLevel.Expert,
] as const;

// ════════════════════════════════════════════════════════════════════
// 1. getKpis — KPI strip du tab Overview
// ════════════════════════════════════════════════════════════════════

export const getKpis = backofficeQuery({
  args: {},
  handler: async (ctx) => {
    // total users → globalCounts (déjà maintenu)
    const totalProfiles = await globalCounts.count(ctx, {});

    // # profils avec un title renseigné = total - no_title
    const noTitle = await profilesByEnrichmentStatus.count(ctx, {
      namespace: "no_title",
    });
    const pending = await profilesByEnrichmentStatus.count(ctx, {
      namespace: "pending",
    });
    const enriched = await profilesByEnrichmentStatus.count(ctx, {
      namespace: "enriched",
    });
    const aiFailed = await profilesByEnrichmentStatus.count(ctx, {
      namespace: "ai_failed",
    });
    const profilesWithProfession = pending + enriched + aiFailed;
    const aiEnrichedCount = enriched + aiFailed;

    // # skills uniques + # entrées totales : count via stats table
    // (1 doc par skill name unique) + somme des declaredCount.
    // Pour rester O(log n) sur les "uniques", on lit le total via le
    // composant globalCounts dédié — mais on n'en a pas pour
    // skillCatalogStats. Acceptable de collecter ici car la taille est
    // bornée au nombre de skills distinctes (~ quelques milliers max).
    const allSkillStats = await ctx.db.query("skillCatalogStats").collect();
    const uniqueSkills = allSkillStats.length;
    const totalSkillEntries = allSkillStats.reduce(
      (s, x) => s + x.declaredCount,
      0,
    );

    // # métiers uniques : count via professionTitleStats
    const allTitleStats = await ctx.db
      .query("professionTitleStats")
      .collect();
    const uniqueProfessions = allTitleStats.length;

    // # profils ayant ≥ 1 skill ET ≥ 1 expérience : nécessite la table cv.
    // Comme cv est petit (1 doc par user qui a un CV), full scan acceptable.
    const allCvs = await ctx.db.query("cv").collect();
    const cvCompleteCount = allCvs.filter(
      (cv) => (cv.skills?.length ?? 0) > 0 && (cv.experiences?.length ?? 0) > 0,
    ).length;
    const cvCompletePct =
      totalProfiles > 0
        ? Math.round((cvCompleteCount / totalProfiles) * 100)
        : 0;
    const aiCoveragePct =
      profilesWithProfession > 0
        ? Math.round((aiEnrichedCount / profilesWithProfession) * 100)
        : 0;

    return {
      totalProfiles,
      profilesWithProfession,
      uniqueProfessions,
      uniqueSkills,
      totalSkillEntries,
      aiEnrichedCount,
      cvCompleteCount,
      aiCoveragePct,
      cvCompletePct,
      enrichmentBreakdown: { noTitle, pending, enriched, aiFailed },
    };
  },
});

// ════════════════════════════════════════════════════════════════════
// 2. getOverview — Top 10 professions / skills / pays + donut statut +
//                  distribution niveaux
// ════════════════════════════════════════════════════════════════════

export const getOverview = backofficeQuery({
  args: {},
  handler: async (ctx) => {
    // Top 10 métiers déclarés — via stats table indexée by_count desc.
    const topProfessionsDocs = await ctx.db
      .query("professionTitleStats")
      .withIndex("by_count")
      .order("desc")
      .take(10);
    const topProfessions = topProfessionsDocs.map((d) => ({
      title: d.displayTitle,
      count: d.count,
      category: d.category,
    }));

    // Top 10 compétences CV déclarées — via stats indexée by_declared desc.
    const topSkillsDocs = await ctx.db
      .query("skillCatalogStats")
      .withIndex("by_declared")
      .order("desc")
      .take(10);
    const topSkills = topSkillsDocs.map((d) => ({
      skill: d.displayName,
      total: d.declaredCount,
      byLevel: d.byLevel,
    }));

    // Donut statut professionnel — count par namespace fixe.
    const statusCountsRaw = await Promise.all(
      WORK_STATUS_VALUES.map((s) =>
        profilesByProfessionStatus.count(ctx, { namespace: s }),
      ),
    );
    const proStatus = WORK_STATUS_VALUES.map((s, i) => ({
      status: s,
      count: statusCountsRaw[i],
    })).filter((d) => d.count > 0);

    // Distribution niveaux globale — count par namespace fixe.
    const levelCountsRaw = await Promise.all(
      SKILL_LEVEL_VALUES.map((l) =>
        cvSkillItemsByLevel.count(ctx, { namespace: l }),
      ),
    );
    const levelDistribution = SKILL_LEVEL_VALUES.map((l, i) => ({
      level: l,
      count: levelCountsRaw[i],
    }));

    // Top 8 pays — usersByCountry est ns=ISO code, count par namespace.
    // On ne connaît pas la liste des namespaces a priori : on appelle
    // `.namespaces({ paginationOpts })` pour les énumérer, puis on count.
    // À l'échelle de quelques dizaines de pays présents, c'est instantané.
    const countryNamespaces: string[] = [];
    let cursor: string | undefined = undefined;
    while (true) {
      const page = await usersByCountry.paginateNamespaces(ctx, cursor, 200);
      for (const ns of page.page) {
        if (ns !== "__none__") countryNamespaces.push(ns);
      }
      if (page.isDone) break;
      cursor = page.cursor;
    }
    const countryCounts = await Promise.all(
      countryNamespaces.map(async (iso) => ({
        iso,
        count: await usersByCountry.count(ctx, { namespace: iso }),
      })),
    );
    countryCounts.sort((a, b) => b.count - a.count);
    const topCountries = countryCounts.slice(0, 8);

    return {
      topProfessions,
      topSkills,
      proStatus,
      levelDistribution,
      topCountries,
    };
  },
});

// ════════════════════════════════════════════════════════════════════
// 3. getCategoryStats — Tab Catégories : 14 cards avec count, top titles
//                       et top skills par catégorie
// ════════════════════════════════════════════════════════════════════

export const getCategoryStats = backofficeQuery({
  args: {},
  handler: async (ctx) => {
    // Count par catégorie via l'aggregate.
    const counts = await Promise.all(
      PROFESSION_CATEGORY_VALUES.map((c) =>
        profilesByCategory.count(ctx, { namespace: c }),
      ),
    );

    // Top 4 titles par catégorie via index composite by_category_count.
    const titlesByCat: Record<string, Array<{ title: string; count: number }>> =
      {};
    await Promise.all(
      PROFESSION_CATEGORY_VALUES.map(async (cat) => {
        const docs = await ctx.db
          .query("professionTitleStats")
          .withIndex("by_category_count", (q) => q.eq("category", cat))
          .order("desc")
          .take(4);
        titlesByCat[cat] = docs.map((d) => ({
          title: d.displayTitle,
          count: d.count,
        }));
      }),
    );

    const totalCategorized = counts.reduce((s, c) => s + c, 0);

    return {
      categories: PROFESSION_CATEGORY_VALUES.map((c, i) => ({
        id: c as ProfessionCategoryValue,
        count: counts[i],
        topTitles: titlesByCat[c] ?? [],
        share: totalCategorized > 0 ? counts[i] / totalCategorized : 0,
      })),
      totalCategorized,
    };
  },
});

// ════════════════════════════════════════════════════════════════════
// 4. getSkillCatalog — Tab Catalogue, paginé + recherche/tri/filtre
// ════════════════════════════════════════════════════════════════════

export const getSkillCatalog = backofficeQuery({
  args: {
    paginationOpts: paginationOptsValidator,
    sort: v.optional(
      v.union(
        v.literal("total"),
        v.literal("declared"),
        v.literal("ai"),
        v.literal("gap"),
      ),
    ),
    onlyGaps: v.optional(v.boolean()),
    search: v.optional(v.string()),
    minGap: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const sort = args.sort ?? "total";
    const minGap = args.minGap ?? 50;

    // Pour les tris "ai" et "declared", on a un index direct. Pour "total"
    // et "gap" il faut calculer côté serveur sur la collection complète
    // (bornée à quelques milliers de skill names). Acceptable car les
    // stats sont des docs légers (~50 octets l'un).
    let rows;
    if (sort === "declared") {
      const p = await ctx.db
        .query("skillCatalogStats")
        .withIndex("by_declared")
        .order("desc")
        .paginate(args.paginationOpts);
      rows = p;
    } else if (sort === "ai") {
      const p = await ctx.db
        .query("skillCatalogStats")
        .withIndex("by_ai")
        .order("desc")
        .paginate(args.paginationOpts);
      rows = p;
    } else {
      // total ou gap : on récupère tout, trie en RAM, paginé manuellement.
      const all = await ctx.db.query("skillCatalogStats").collect();
      const sorted = [...all].sort((a, b) => {
        if (sort === "total") {
          return b.declaredCount + b.aiCount - (a.declaredCount + a.aiCount);
        }
        // gap = max(0, ai - declared)
        const gapA = Math.max(0, a.aiCount - a.declaredCount);
        const gapB = Math.max(0, b.aiCount - b.declaredCount);
        return gapB - gapA;
      });
      const cursor = args.paginationOpts.cursor;
      const num = args.paginationOpts.numItems;
      const startIdx = cursor ? Number.parseInt(cursor, 10) : 0;
      const page = sorted.slice(startIdx, startIdx + num);
      rows = {
        page,
        isDone: startIdx + num >= sorted.length,
        continueCursor: String(startIdx + num),
      };
    }

    // Filtres post-pagination (acceptable tant qu'on n'écrête pas trop) :
    const search = args.search?.toLowerCase().trim();
    const filtered = rows.page.filter((d) => {
      if (search && !d.skillName.includes(search)) return false;
      if (args.onlyGaps) {
        const gap = Math.max(0, d.aiCount - d.declaredCount);
        if (gap < minGap) return false;
      }
      return true;
    });

    return {
      page: filtered.map((d) => ({
        _id: d._id,
        skillName: d.displayName,
        declared: d.declaredCount,
        ai: d.aiCount,
        gap: Math.max(0, d.aiCount - d.declaredCount),
        byLevel: d.byLevel,
      })),
      isDone: rows.isDone,
      continueCursor: rows.continueCursor,
    };
  },
});

// ════════════════════════════════════════════════════════════════════
// 5. getDataHealth — Tab Santé : gauges + non-enrichis + AI failures
// ════════════════════════════════════════════════════════════════════

export const getDataHealth = backofficeQuery({
  args: {},
  handler: async (ctx) => {
    const totalProfiles = await globalCounts.count(ctx, {});
    const noTitle = await profilesByEnrichmentStatus.count(ctx, {
      namespace: "no_title",
    });
    const pending = await profilesByEnrichmentStatus.count(ctx, {
      namespace: "pending",
    });
    const enriched = await profilesByEnrichmentStatus.count(ctx, {
      namespace: "enriched",
    });
    const aiFailed = await profilesByEnrichmentStatus.count(ctx, {
      namespace: "ai_failed",
    });
    const profilesWithProfession = pending + enriched + aiFailed;

    // % CV complet (≥ 1 skill + ≥ 1 expérience) — un scan minimal.
    const allCvs = await ctx.db.query("cv").collect();
    const cvComplete = allCvs.filter(
      (cv) =>
        (cv.skills?.length ?? 0) > 0 && (cv.experiences?.length ?? 0) > 0,
    ).length;

    return {
      gauges: {
        profession: {
          pct:
            totalProfiles > 0
              ? Math.round((profilesWithProfession / totalProfiles) * 100)
              : 0,
          filled: profilesWithProfession,
          total: totalProfiles,
        },
        ai: {
          pct:
            profilesWithProfession > 0
              ? Math.round((enriched / profilesWithProfession) * 100)
              : 0,
          enriched,
          eligible: profilesWithProfession,
        },
        cv: {
          pct:
            totalProfiles > 0
              ? Math.round((cvComplete / totalProfiles) * 100)
              : 0,
          complete: cvComplete,
          total: totalProfiles,
        },
      },
      pending,
      enriched,
      aiFailed,
      noTitle,
    };
  },
});

// Liste paginée des profils ayant un title mais pas encore enrichis.
// Filtré côté serveur par namespace "pending" → on prend cet aggregate
// pour itérer les _id sans toucher au reste de la table profiles.
export const listPendingEnrichment = backofficeQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    // pagineate over profilesByEnrichmentStatus avec namespace=pending
    // donne les profileIds en O(log n). On hydrate ensuite chaque doc.
    const page = await profilesByEnrichmentStatus.paginate(ctx, {
      namespace: "pending",
      pageSize: args.paginationOpts.numItems,
      cursor: args.paginationOpts.cursor ?? undefined,
      order: "desc", // plus récents en premier
    });
    const profiles = await Promise.all(
      page.page.map(async (entry) => {
        const profile = await ctx.db.get(entry.id);
        if (!profile) return null;
        const user = await ctx.db.get(profile.userId);
        return {
          profileId: profile._id,
          userId: profile.userId,
          name:
            `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() ||
            user?.email ||
            "—",
          freeProfession: profile.profession?.title ?? "",
          country:
            profile.countryOfResidence ||
            profile.addresses?.residence?.country ||
            profile.identity?.nationality ||
            null,
          registeredAt: user?._creationTime ?? profile._creationTime,
        };
      }),
    );
    return {
      page: profiles.filter((p): p is NonNullable<typeof p> => p !== null),
      isDone: page.isDone,
      continueCursor: page.cursor,
    };
  },
});

// Liste paginée des "AI failures" — profiles enrichis par l'IA mais sans
// catégorie résolvée ou sans skills suggérées.
export const listAiFailures = backofficeQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const page = await profilesByEnrichmentStatus.paginate(ctx, {
      namespace: "ai_failed",
      pageSize: args.paginationOpts.numItems,
      cursor: args.paginationOpts.cursor ?? undefined,
      order: "desc",
    });
    const items = await Promise.all(
      page.page.map(async (entry) => {
        const profile = await ctx.db.get(entry.id);
        if (!profile) return null;
        const user = await ctx.db.get(profile.userId);
        return {
          profileId: profile._id,
          userId: profile.userId,
          name:
            `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() ||
            user?.email ||
            "—",
          freeProfession: profile.profession?.title ?? "",
          category: profile.profession?.category ?? null,
          suggestedSkillsCount:
            profile.profession?.aiSuggestedSkills?.length ?? 0,
          enrichedAt: profile.profession?.aiEnrichedAt ?? null,
        };
      }),
    );
    return {
      page: items.filter((p): p is NonNullable<typeof p> => p !== null),
      isDone: page.isDone,
      continueCursor: page.cursor,
    };
  },
});

// Historique des runs IA (Tab Santé section 4).
export const listAiRuns = backofficeQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiEnrichmentRuns")
      .withIndex("by_startedAt")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

// ════════════════════════════════════════════════════════════════════
// 6. searchProfiles — Tab Recherche de talents : filtres + paginé
// ════════════════════════════════════════════════════════════════════
//
// La combinaison de filtres est libre — on ne peut pas tout indexer.
// On prend l'index le plus restrictif (catégorie ou skill déclarée) en
// point d'entrée, puis on filtre les autres champs après hydratation.
//
// Si aucun filtre restrictif n'est passé, on tombe sur un scan paginé
// de la table `profiles` (ordre descendant par _creationTime).

const searchFiltersValidator = v.object({
  category: v.optional(v.string()),
  skill: v.optional(v.string()), // canonical lowercase
  level: v.optional(v.string()),
  workStatus: v.optional(v.string()),
  country: v.optional(v.string()),
  continent: v.optional(v.string()),
  search: v.optional(v.string()), // libre : nom / email / métier / compétence
});

export const searchProfiles = backofficeQuery({
  args: {
    paginationOpts: paginationOptsValidator,
    filters: searchFiltersValidator,
  },
  handler: async (ctx, args) => {
    const f = args.filters;
    const searchLower = f.search?.toLowerCase().trim();

    // Choix de l'index de départ :
    //   1. skill ciblée → cvSkillItems by_skillName → profileIds
    //   2. category → profiles via aggregate paginate
    //   3. fallback : profiles ordre desc
    let seedProfileIds: Id<"profiles">[] | null = null;
    const cursorOrNull: string | null = args.paginationOpts.cursor;
    const cursorOrUndef: string | undefined = args.paginationOpts.cursor ?? undefined;
    let isDone = true;
    let continueCursor: string = "";

    if (f.skill) {
      // Skill canonical (lowercased) → cvSkillItems index.
      const skillKey = f.skill.toLowerCase().trim();
      const itemsPage = await ctx.db
        .query("cvSkillItems")
        .withIndex("by_skillName", (q) => q.eq("skillName", skillKey))
        .paginate({
          cursor: cursorOrNull,
          numItems: args.paginationOpts.numItems * 4, // sur-fetch pour compenser les filtres post
        });
      seedProfileIds = [];
      const seen = new Set<string>();
      // cvSkillItems → userId → profile.
      const userIds = Array.from(new Set(itemsPage.page.map((i) => i.userId)));
      const profileDocs = await Promise.all(
        userIds.map((uid) =>
          ctx.db
            .query("profiles")
            .withIndex("by_user", (q) => q.eq("userId", uid))
            .unique(),
        ),
      );
      for (const p of profileDocs) {
        if (p && !seen.has(p._id)) {
          seen.add(p._id);
          seedProfileIds.push(p._id);
        }
      }
      isDone = itemsPage.isDone;
      continueCursor = itemsPage.continueCursor;
    } else if (f.category) {
      // Paginate par aggregate sur la catégorie.
      const page = await profilesByCategory.paginate(ctx, {
        namespace: f.category,
        pageSize: args.paginationOpts.numItems * 2,
        cursor: cursorOrUndef,
        order: "desc",
      });
      seedProfileIds = page.page.map((e) => e.id);
      isDone = page.isDone;
      continueCursor = page.cursor;
    }

    // Récupère les docs profils correspondants.
    let candidates: Doc<"profiles">[];
    if (seedProfileIds !== null) {
      const docs = await Promise.all(
        seedProfileIds.map((id) => ctx.db.get(id as Id<"profiles">)),
      );
      candidates = docs.filter((p): p is Doc<"profiles"> => p !== null);
    } else {
      // Fallback : scan paginé de profiles.
      const page = await ctx.db
        .query("profiles")
        .order("desc")
        .paginate(args.paginationOpts);
      candidates = page.page;
      isDone = page.isDone;
      continueCursor = page.continueCursor;
    }

    // Filtres post-fetch.
    const filtered: typeof candidates = [];
    for (const profile of candidates) {
      // workStatus
      if (
        f.workStatus &&
        f.workStatus !== profile.profession?.status
      )
        continue;
      // category — si le seed est skill-only, on filtre ici aussi.
      if (f.category && profile.profession?.category !== f.category) continue;
      // country (code ISO upper-case)
      if (f.country) {
        const code =
          profile.countryOfResidence ||
          profile.addresses?.residence?.country ||
          profile.identity?.nationality;
        if (!code || String(code).toUpperCase() !== f.country.toUpperCase())
          continue;
      }
      // search libre
      if (searchLower) {
        const hay = [
          profile.profession?.title ?? "",
          profile.identity?.firstName ?? "",
          profile.identity?.lastName ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(searchLower)) continue;
      }
      filtered.push(profile);
    }

    // Niveau filter : nécessite de regarder cvSkillItems du user (au moins
    // 1 skill au niveau requis). Skip si pas de filtre.
    let levelFiltered = filtered;
    if (f.level) {
      const lvl = f.level;
      levelFiltered = [];
      for (const profile of filtered) {
        const hasLevel = await ctx.db
          .query("cvSkillItems")
          .withIndex("by_user", (q) => q.eq("userId", profile.userId))
          .filter((q) => q.eq(q.field("level"), lvl))
          .first();
        if (hasLevel) levelFiltered.push(profile);
      }
    }

    // Hydratation : on joint user + CV ciblé.
    const rows = await Promise.all(
      levelFiltered.slice(0, args.paginationOpts.numItems).map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        const cv = await ctx.db
          .query("cv")
          .withIndex("by_user", (q) => q.eq("userId", profile.userId))
          .unique();
        return {
          profileId: profile._id,
          userId: profile.userId,
          firstName: user?.firstName ?? null,
          lastName: user?.lastName ?? null,
          email: user?.email ?? null,
          flag: null as string | null,
          country:
            profile.countryOfResidence ||
            profile.addresses?.residence?.country ||
            profile.identity?.nationality ||
            null,
          workStatus: profile.profession?.status ?? null,
          profession: profile.profession?.title ?? null,
          category: profile.profession?.category ?? null,
          declared: (cv?.skills ?? []).map((s) => ({
            name: s.name,
            level: s.level,
          })),
          aiSuggestedCount:
            profile.profession?.aiSuggestedSkills?.length ?? 0,
        };
      }),
    );

    return {
      page: rows,
      isDone,
      continueCursor,
    };
  },
});
