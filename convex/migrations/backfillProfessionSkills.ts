/**
 * Enrichissement IA des profils professionnels.
 *
 * Pour chaque profil ayant un `profession.title` (texte libre saisi à
 * l'inscription), Gemini classifie le métier dans une taxonomie fermée
 * (`ProfessionCategory`) et suggère 6-10 compétences typiques. Les compétences
 * sont écrites sur `profiles.profession.aiSuggestedSkills` (pour filtrer la
 * diaspora) et fusionnées sans doublon dans `cv.skills` quand un CV existe
 * déjà (niveau par défaut `intermediate`).
 *
 * Pré-requis : `GEMINI_API_KEY` configurée dans les Convex secrets.
 *
 * Usage :
 *
 *   # Dry-run (aucune écriture, aucun appel Gemini)
 *   bunx convex run migrations/backfillProfessionSkills:run '{"dryRun":true,"limit":20}'
 *
 *   # Exécution test sur 5 profils
 *   bunx convex run migrations/backfillProfessionSkills:run '{"dryRun":false,"limit":5,"delayMs":500}'
 *
 *   # Run complet
 *   bunx convex run migrations/backfillProfessionSkills:run '{"dryRun":false,"delayMs":300}'
 *
 * Idempotent : skip les profils ayant déjà `profession.aiEnrichedAt`.
 */

import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { extractJSON, generate } from "../lib/ai/gemini";
import {
  PROFESSION_CATEGORY_VALUES,
  ProfessionCategory,
  type ProfessionCategoryValue,
} from "../lib/validators";
import { SkillLevel } from "../lib/constants";

const BATCH_SIZE = 50;
const DEFAULT_DELAY_MS = 300;

interface BackfillCounts {
  total: number;
  skippedAlreadyEnriched: number;
  skippedNoTitle: number;
  aiSuccess: number;
  aiFailed: number;
  profilesPatched: number;
  cvsEnriched: number;
}

interface ProfileBatchItem {
  _id: Id<"profiles">;
  userId: Id<"users">;
  title: string | null;
  enrichedAt: number | null;
}

interface AiResult {
  category: ProfessionCategoryValue;
  skills: string[];
}

/**
 * Liste paginée des profils — l'action externe orchestre la boucle.
 */
export const listBatch = internalQuery({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("profiles").paginate({
      numItems: BATCH_SIZE,
      cursor: args.cursor ?? null,
    });
    return {
      profiles: page.page.map((p): ProfileBatchItem => ({
        _id: p._id,
        userId: p.userId,
        title: p.profession?.title ?? null,
        enrichedAt: p.profession?.aiEnrichedAt ?? null,
      })),
      cursor: page.continueCursor,
      isDone: page.isDone,
    };
  },
});

/**
 * Patch des champs IA sur `profile.profession`. Idempotent : merge avec
 * l'existant pour ne pas écraser status/employer.
 */
export const patchProfile = internalMutation({
  args: {
    profileId: v.id("profiles"),
    category: v.string(),
    skills: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) return false;

    const profession = profile.profession ?? {};
    await ctx.db.patch(args.profileId, {
      profession: {
        ...profession,
        category: args.category as ProfessionCategoryValue,
        aiSuggestedSkills: args.skills,
        aiEnrichedAt: Date.now(),
      },
    });
    return true;
  },
});

/**
 * Fusionne les compétences IA dans le CV existant — sans doublon, niveau
 * `intermediate` par défaut. Ne crée PAS de CV : les skills restent
 * disponibles sur `profile.profession.aiSuggestedSkills`.
 */
export const mergeCvSkills = internalMutation({
  args: {
    userId: v.id("users"),
    skills: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const cv = await ctx.db
      .query("cv")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (!cv) return false;

    const existingNames = new Set(
      (cv.skills ?? []).map((s) => s.name.toLowerCase().trim()),
    );
    const toAdd = args.skills
      .map((name) => name.trim())
      .filter((name) => name.length > 0)
      .filter((name) => !existingNames.has(name.toLowerCase()));

    if (toAdd.length === 0) return false;

    const merged = [
      ...(cv.skills ?? []),
      ...toAdd.map((name) => ({ name, level: SkillLevel.Intermediate })),
    ];
    await ctx.db.patch(cv._id, { skills: merged, updatedAt: Date.now() });
    return true;
  },
});

function buildPrompt(title: string): string {
  const categories = PROFESSION_CATEGORY_VALUES.join(", ");
  return `Tu es un expert RH. À partir d'un intitulé de métier libre saisi par un Gabonais de la diaspora, retourne UN JSON strict (aucun texte hors JSON, aucun bloc markdown).

Intitulé saisi : "${title}"

Catégories autorisées (choisir EXACTEMENT UNE valeur de cette liste) :
${categories}

Règles :
- "category" doit être l'une des valeurs ci-dessus, en minuscules, exactement. Si rien ne correspond clairement, utilise "autre".
- "skills" : 6 à 10 compétences typiques de ce métier, en français, concrètes et filtrables (ex: "Soins infirmiers", "Suturage" plutôt que "Travail d'équipe"). Mélange compétences techniques et transverses si pertinent. Sans niveaux, sans doublons, sans phrases.

Réponds UNIQUEMENT en JSON :
{
  "category": "...",
  "skills": ["...", "..."]
}`;
}

async function classifyWithGemini(title: string): Promise<AiResult | null> {
  try {
    const raw = await generate(buildPrompt(title));
    const parsed = extractJSON(raw) as {
      category?: unknown;
      skills?: unknown;
    };

    const categoryRaw =
      typeof parsed.category === "string" ? parsed.category.toLowerCase().trim() : "";
    const category: ProfessionCategoryValue =
      (PROFESSION_CATEGORY_VALUES as readonly string[]).includes(categoryRaw)
        ? (categoryRaw as ProfessionCategoryValue)
        : ProfessionCategory.other;

    if (!Array.isArray(parsed.skills)) return null;
    const skills = parsed.skills
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter((s) => s.length > 0);
    if (skills.length === 0) return null;

    // Déduplication insensible à la casse
    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const s of skills) {
      const key = s.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(s);
      }
    }

    return { category, skills: deduped };
  } catch (err) {
    console.warn("[backfillProfessionSkills] Gemini call failed", {
      title,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Spot-check qualité : retourne les N derniers profils enrichis (title +
 * category + skills) pour validation manuelle après un run.
 */
export const sampleEnriched = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    const page = await ctx.db.query("profiles").paginate({
      numItems: 500,
      cursor: null,
    });
    return page.page
      .filter((p) => p.profession?.aiEnrichedAt)
      .sort(
        (a, b) =>
          (b.profession?.aiEnrichedAt ?? 0) -
          (a.profession?.aiEnrichedAt ?? 0),
      )
      .slice(0, limit)
      .map((p) => ({
        profileId: p._id,
        title: p.profession?.title ?? null,
        category: p.profession?.category ?? null,
        skills: p.profession?.aiSuggestedSkills ?? [],
        enrichedAt: p.profession?.aiEnrichedAt ?? null,
      }));
  },
});

export const run = internalAction({
  args: {
    dryRun: v.boolean(),
    limit: v.optional(v.number()),
    delayMs: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<BackfillCounts> => {
    const counts: BackfillCounts = {
      total: 0,
      skippedAlreadyEnriched: 0,
      skippedNoTitle: 0,
      aiSuccess: 0,
      aiFailed: 0,
      profilesPatched: 0,
      cvsEnriched: 0,
    };

    // `limit` borne le nombre d'appels Gemini effectifs (success + fail),
    // pas les profils inspectés. Les skip (already-enriched, no-title) sont
    // gratuits et n'entament pas le budget — ça permet de lancer des runs
    // successifs sans avoir à se soucier de la fenêtre de pagination.
    const maxAiCalls = args.limit ?? Number.POSITIVE_INFINITY;
    const delay = args.delayMs ?? DEFAULT_DELAY_MS;

    let cursor: string | null = null;
    let aiCalls = 0;

    while (true) {
      const batch: {
        profiles: ProfileBatchItem[];
        cursor: string;
        isDone: boolean;
      } = await ctx.runQuery(
        internal.migrations.backfillProfessionSkills.listBatch,
        { cursor },
      );

      for (const p of batch.profiles) {
        if (aiCalls >= maxAiCalls) break;
        counts.total += 1;

        if (p.enrichedAt) {
          counts.skippedAlreadyEnriched += 1;
          continue;
        }

        const title = (p.title ?? "").trim();
        if (title.length === 0) {
          counts.skippedNoTitle += 1;
          continue;
        }

        if (args.dryRun) {
          // En dry-run : aucun appel Gemini, on compte juste les candidats
          counts.aiSuccess += 1;
          aiCalls += 1;
          continue;
        }

        const result = await classifyWithGemini(title);
        aiCalls += 1;
        if (!result) {
          counts.aiFailed += 1;
          if (delay > 0) await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        counts.aiSuccess += 1;

        const patched: boolean = await ctx.runMutation(
          internal.migrations.backfillProfessionSkills.patchProfile,
          {
            profileId: p._id,
            category: result.category,
            skills: result.skills,
          },
        );
        if (patched) counts.profilesPatched += 1;

        const cvUpdated: boolean = await ctx.runMutation(
          internal.migrations.backfillProfessionSkills.mergeCvSkills,
          { userId: p.userId, skills: result.skills },
        );
        if (cvUpdated) counts.cvsEnriched += 1;

        // Throttle pour respecter le quota Gemini
        if (delay > 0) await new Promise((r) => setTimeout(r, delay));
      }

      if (batch.isDone || aiCalls >= maxAiCalls) break;
      cursor = batch.cursor;
    }

    console.log(
      `[backfillProfessionSkills] ${args.dryRun ? "DRY-RUN" : "EXECUTE"} done`,
      counts,
    );
    return counts;
  },
});
