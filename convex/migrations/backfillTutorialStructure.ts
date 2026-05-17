/**
 * Enrichissement IA des guides « Ressources ».
 *
 * Contexte : la nouvelle template `/ressources/[slug]` (Guide.html) n'affiche
 * que les sections structurées (`prerequisites`, `steps`, `fees`, `delays`,
 * `faqItems`, `procedureSummary`, `lede`, `sources`). Or les guides contribués
 * via le backoffice ne contiennent à ce jour que `content` (HTML Tiptap), ce
 * qui produit des pages quasi-vides (seul le sommaire hardcodé apparaît).
 *
 * Cette migration parse le `content` HTML via Gemini et extrait les champs
 * structurés. Conservative : n'invente JAMAIS de tarifs, sources ou délais
 * absents du contenu — préfère un tableau vide à une hallucination dans un
 * contexte officiel diplomatique.
 *
 * Pré-requis : `GEMINI_API_KEY` configurée dans les Convex secrets.
 *
 * Usage :
 *
 *   # Dry-run sur 1 guide ciblé (aucune écriture, AUCUN appel Gemini)
 *   bunx convex run migrations/backfillTutorialStructure:run \
 *     '{"dryRun":true,"slugs":["creer-entreprise-gabon-etranger"]}'
 *
 *   # Enrichir 1 guide ciblé (test)
 *   bunx convex run migrations/backfillTutorialStructure:run \
 *     '{"dryRun":false,"slugs":["creer-entreprise-gabon-etranger"]}'
 *
 *   # Run complet sur tous les guides publiés non enrichis
 *   bunx convex run migrations/backfillTutorialStructure:run \
 *     '{"dryRun":false,"delayMs":500}'
 *
 *   # Forcer un re-enrichissement (écrase l'existant)
 *   bunx convex run migrations/backfillTutorialStructure:run \
 *     '{"dryRun":false,"force":true,"slugs":["creer-entreprise-gabon-etranger"]}'
 *
 * Idempotent : skip les guides ayant déjà au moins une section structurée
 * (`prerequisites` ou `steps`), sauf si `force=true`.
 */

import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { extractJSON, generate } from "../lib/ai/gemini";
import { PostStatus } from "../lib/constants";

const BATCH_SIZE = 50;
const DEFAULT_DELAY_MS = 500;

interface BackfillCounts {
  inspected: number;
  skippedAlreadyStructured: number;
  skippedNoContent: number;
  aiSuccess: number;
  aiFailed: number;
  patched: number;
}

type Requirement = "required" | "optional" | "ifAvailable";
type Speed = "fast" | "standard" | "long";

interface ExtractedStructure {
  lede?: string;
  procedureSummary?: {
    steps?: string;
    delay?: string;
    fees?: string;
    location?: string;
  };
  prerequisites?: Array<{
    title: string;
    description?: string;
    requirement: Requirement;
  }>;
  steps?: Array<{
    number: number;
    title: string;
    durationLabel?: string;
    locationLabel?: string;
    body?: string;
  }>;
  fees?: Array<{
    label: string;
    description?: string;
    delay?: string;
    amount: string;
    badge?: string;
  }>;
  delays?: Array<{
    region: string;
    label: string;
    description: string;
    speed: Speed;
  }>;
  faqItems?: Array<{ question: string; answer: string }>;
  sources?: Array<{ label: string; url: string }>;
}

interface BatchItem {
  _id: Id<"tutorials">;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  hasStructure: boolean;
}

const REQUIREMENT_VALUES: readonly Requirement[] = [
  "required",
  "optional",
  "ifAvailable",
];
const SPEED_VALUES: readonly Speed[] = ["fast", "standard", "long"];

/**
 * Liste paginée des guides publiés. Le filtrage par slug se fait côté action
 * pour rester simple (on charge la page, on filtre en mémoire). Vu le volume
 * attendu (<200 guides), c'est largement suffisant.
 */
export const listBatch = internalQuery({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("tutorials")
      .withIndex("by_status", (q) => q.eq("status", PostStatus.Published))
      .paginate({ numItems: BATCH_SIZE, cursor: args.cursor ?? null });

    return {
      tutorials: page.page.map((t): BatchItem => ({
        _id: t._id,
        slug: t.slug,
        title: t.title,
        excerpt: t.excerpt,
        content: t.content ?? "",
        hasStructure:
          (t.prerequisites?.length ?? 0) > 0 ||
          (t.steps?.length ?? 0) > 0,
      })),
      cursor: page.continueCursor,
      isDone: page.isDone,
    };
  },
});

/**
 * Patch un guide avec les champs structurés extraits. Ne touche PAS aux
 * champs absents du résultat IA (merge non-destructif pour preserver des
 * données potentiellement saisies manuellement).
 */
export const patchTutorial = internalMutation({
  args: {
    tutorialId: v.id("tutorials"),
    lede: v.optional(v.string()),
    procedureSummary: v.optional(
      v.object({
        steps: v.optional(v.string()),
        delay: v.optional(v.string()),
        fees: v.optional(v.string()),
        location: v.optional(v.string()),
      }),
    ),
    prerequisites: v.optional(
      v.array(
        v.object({
          title: v.string(),
          description: v.optional(v.string()),
          requirement: v.union(
            v.literal("required"),
            v.literal("optional"),
            v.literal("ifAvailable"),
          ),
        }),
      ),
    ),
    steps: v.optional(
      v.array(
        v.object({
          number: v.number(),
          title: v.string(),
          durationLabel: v.optional(v.string()),
          locationLabel: v.optional(v.string()),
          body: v.optional(v.string()),
        }),
      ),
    ),
    fees: v.optional(
      v.array(
        v.object({
          label: v.string(),
          description: v.optional(v.string()),
          delay: v.optional(v.string()),
          amount: v.string(),
          badge: v.optional(v.string()),
        }),
      ),
    ),
    delays: v.optional(
      v.array(
        v.object({
          region: v.string(),
          label: v.string(),
          description: v.string(),
          speed: v.union(
            v.literal("fast"),
            v.literal("standard"),
            v.literal("long"),
          ),
        }),
      ),
    ),
    faqItems: v.optional(
      v.array(
        v.object({
          question: v.string(),
          answer: v.string(),
        }),
      ),
    ),
    sources: v.optional(
      v.array(v.object({ label: v.string(), url: v.string() })),
    ),
  },
  handler: async (ctx, args) => {
    const tutorial = await ctx.db.get(args.tutorialId);
    if (!tutorial) return false;

    const { tutorialId, ...updates } = args;
    const patch: Partial<Doc<"tutorials">> = {
      ...updates,
      updatedAt: Date.now(),
    };

    // stepCount reflète la nouvelle structure si on l'a extraite
    if (updates.steps && updates.steps.length > 0) {
      patch.stepCount = updates.steps.length;
    }

    await ctx.db.patch(tutorialId, patch);
    return true;
  },
});

function buildPrompt(item: BatchItem): string {
  return `Tu es un expert en structuration de guides procéduraux pour un site officiel diplomatique gabonais (consulat.ga).

À partir d'un guide existant (titre + résumé + corps HTML), tu dois extraire un JSON STRICT qui structure le contenu en sections claires pour l'affichage public.

# Guide source

Titre : ${item.title}
Résumé : ${item.excerpt}

Corps HTML (Tiptap) :
"""
${item.content.slice(0, 12000)}
"""

# Sortie attendue (JSON STRICT, sans bloc markdown, sans texte autour)

{
  "lede": "Phrase ou paragraphe d'introduction reformulé depuis le résumé/corps (1-3 phrases, ton institutionnel). Vide si rien d'exploitable.",
  "procedureSummary": {
    "steps": "ex: \\"5 étapes\\" si tu peux compter",
    "delay": "ex: \\"2 à 4 semaines\\" UNIQUEMENT si mentionné dans le corps, sinon omettre",
    "fees": "ex: \\"60 €\\" UNIQUEMENT si mentionné, sinon omettre",
    "location": "ex: \\"En ligne via ANPI\\" si pertinent, sinon omettre"
  },
  "prerequisites": [
    {
      "title": "Nom du document/prérequis",
      "description": "Détail court (optionnel)",
      "requirement": "required" | "optional" | "ifAvailable"
    }
  ],
  "steps": [
    {
      "number": 1,
      "title": "Titre court de l'étape",
      "durationLabel": "ex: \\"15 min\\" (optionnel)",
      "locationLabel": "ex: \\"En ligne\\" (optionnel)",
      "body": "<p>Description HTML simple. Balises autorisées: p, br, strong, em, ul, ol, li, a, h3, h4. Pas de div/span sauf classe 'callout' ou 'step-tip'.</p>"
    }
  ],
  "fees": [
    {
      "label": "Nom de la prestation",
      "description": "Détail (optionnel)",
      "delay": "ex: \\"48h\\" (optionnel)",
      "amount": "ex: \\"60 €\\" — string brut, garder la devise telle quelle"
    }
  ],
  "delays": [
    {
      "region": "europe" | "afrique" | "ameriques" | "asie",
      "label": "ex: \\"Europe (postal recommandé)\\"",
      "description": "Détail du circuit/retrait",
      "speed": "fast" | "standard" | "long"
    }
  ],
  "faqItems": [
    { "question": "...", "answer": "..." }
  ],
  "sources": [
    { "label": "Nom de la source officielle", "url": "https://..." }
  ]
}

# Règles IMPÉRATIVES

1. **N'INVENTE RIEN.** Tarifs, délais chiffrés, URLs de sources, références juridiques : UNIQUEMENT si présents dans le corps source. Si absents → tableau vide ou champ omis. Tu écris pour un site officiel, une hallucination chiffrée est inacceptable.

2. **Étapes** : si le corps contient des sections (h2/h3) ou listes ordonnées (ol), transforme-les en \`steps\` numérotés. Si le corps est purement narratif sans découpage logique → tableau vide.

3. **Prérequis** : si le corps liste des documents/conditions (souvent dans une \`<ul>\` ou un paragraphe « Pour … vous devez »), extrais-les. Marque \`requirement\` à "required" sauf indication explicite contraire.

4. **FAQ** : ne génère des questions QUE si elles apparaissent explicitement dans le corps (sections « Questions fréquentes », « FAQ », ou questions formulées). Ne fabrique pas de Q/R pour combler.

5. **Délais par région** : ne génère cette section QUE si le corps mentionne explicitement des variations régionales (Europe/Afrique/etc.). Sinon → tableau vide.

6. **Sources** : ne reproduis QUE des URLs littéralement présentes dans le corps (balises \`<a href="...">\`). Aucune URL inventée.

7. **lede** : peut reformuler/synthétiser, c'est le seul champ où une légère reformulation est attendue. Garde le ton institutionnel sobre.

8. **JSON strict** : pas de markdown, pas de commentaires, pas de \`\`\`json. Réponds UNIQUEMENT par le JSON.`;
}

function clampString(v: unknown, maxLen = 4000): string | undefined {
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.slice(0, maxLen);
}

function coerceRequirement(v: unknown): Requirement {
  if (typeof v === "string" && (REQUIREMENT_VALUES as readonly string[]).includes(v)) {
    return v as Requirement;
  }
  return "required";
}

function coerceSpeed(v: unknown): Speed {
  if (typeof v === "string" && (SPEED_VALUES as readonly string[]).includes(v)) {
    return v as Speed;
  }
  return "standard";
}

function normalizeStructure(raw: unknown): ExtractedStructure {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const out: ExtractedStructure = {};

  const lede = clampString(r.lede, 600);
  if (lede) out.lede = lede;

  if (r.procedureSummary && typeof r.procedureSummary === "object") {
    const s = r.procedureSummary as Record<string, unknown>;
    const summary: ExtractedStructure["procedureSummary"] = {};
    const steps = clampString(s.steps, 80);
    const delay = clampString(s.delay, 120);
    const fees = clampString(s.fees, 120);
    const location = clampString(s.location, 200);
    if (steps) summary.steps = steps;
    if (delay) summary.delay = delay;
    if (fees) summary.fees = fees;
    if (location) summary.location = location;
    if (Object.keys(summary).length > 0) out.procedureSummary = summary;
  }

  if (Array.isArray(r.prerequisites)) {
    const items = r.prerequisites
      .map((p): ExtractedStructure["prerequisites"] extends Array<infer U> | undefined ? U | null : never => {
        if (!p || typeof p !== "object") return null as never;
        const obj = p as Record<string, unknown>;
        const title = clampString(obj.title, 200);
        if (!title) return null as never;
        const description = clampString(obj.description, 600);
        const item = {
          title,
          requirement: coerceRequirement(obj.requirement),
        } as { title: string; description?: string; requirement: Requirement };
        if (description) item.description = description;
        return item as never;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    if (items.length > 0) out.prerequisites = items;
  }

  if (Array.isArray(r.steps)) {
    const items = r.steps
      .map((s, idx) => {
        if (!s || typeof s !== "object") return null;
        const obj = s as Record<string, unknown>;
        const title = clampString(obj.title, 200);
        if (!title) return null;
        const num =
          typeof obj.number === "number" && obj.number > 0
            ? Math.round(obj.number)
            : idx + 1;
        const item: {
          number: number;
          title: string;
          durationLabel?: string;
          locationLabel?: string;
          body?: string;
        } = { number: num, title };
        const durationLabel = clampString(obj.durationLabel, 80);
        const locationLabel = clampString(obj.locationLabel, 120);
        const body = clampString(obj.body, 4000);
        if (durationLabel) item.durationLabel = durationLabel;
        if (locationLabel) item.locationLabel = locationLabel;
        if (body) item.body = body;
        return item;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    if (items.length > 0) out.steps = items;
  }

  if (Array.isArray(r.fees)) {
    const items = r.fees
      .map((f) => {
        if (!f || typeof f !== "object") return null;
        const obj = f as Record<string, unknown>;
        const label = clampString(obj.label, 200);
        const amount = clampString(obj.amount, 80);
        if (!label || !amount) return null;
        const item: {
          label: string;
          amount: string;
          description?: string;
          delay?: string;
          badge?: string;
        } = { label, amount };
        const description = clampString(obj.description, 400);
        const delay = clampString(obj.delay, 80);
        const badge = clampString(obj.badge, 40);
        if (description) item.description = description;
        if (delay) item.delay = delay;
        if (badge) item.badge = badge;
        return item;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    if (items.length > 0) out.fees = items;
  }

  if (Array.isArray(r.delays)) {
    const items = r.delays
      .map((d) => {
        if (!d || typeof d !== "object") return null;
        const obj = d as Record<string, unknown>;
        const region = clampString(obj.region, 40);
        const label = clampString(obj.label, 200);
        const description = clampString(obj.description, 600);
        if (!region || !label || !description) return null;
        return {
          region,
          label,
          description,
          speed: coerceSpeed(obj.speed),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    if (items.length > 0) out.delays = items;
  }

  if (Array.isArray(r.faqItems)) {
    const items = r.faqItems
      .map((f) => {
        if (!f || typeof f !== "object") return null;
        const obj = f as Record<string, unknown>;
        const question = clampString(obj.question, 400);
        const answer = clampString(obj.answer, 2000);
        if (!question || !answer) return null;
        return { question, answer };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    if (items.length > 0) out.faqItems = items;
  }

  if (Array.isArray(r.sources)) {
    const items = r.sources
      .map((s) => {
        if (!s || typeof s !== "object") return null;
        const obj = s as Record<string, unknown>;
        const label = clampString(obj.label, 200);
        const url = clampString(obj.url, 500);
        if (!label || !url) return null;
        // Garde-fou : on n'accepte que les URLs http(s) littérales
        if (!/^https?:\/\//i.test(url)) return null;
        return { label, url };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    if (items.length > 0) out.sources = items;
  }

  return out;
}

async function extractWithGemini(
  item: BatchItem,
): Promise<ExtractedStructure | null> {
  try {
    const raw = await generate(buildPrompt(item));
    const parsed = extractJSON(raw);
    const normalized = normalizeStructure(parsed);
    // Considère échec si AUCUNE section structurée n'a pu être extraite
    const hasAny =
      normalized.steps?.length ||
      normalized.prerequisites?.length ||
      normalized.faqItems?.length ||
      normalized.lede;
    if (!hasAny) return null;
    return normalized;
  } catch (err) {
    console.warn("[backfillTutorialStructure] Gemini call failed", {
      slug: item.slug,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Spot-check : retourne les N derniers guides patchés avec leurs sections.
 * Utile pour valider manuellement la qualité de l'extraction après un run.
 */
export const sampleEnriched = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5;
    const all = await ctx.db
      .query("tutorials")
      .withIndex("by_status", (q) => q.eq("status", PostStatus.Published))
      .collect();

    return all
      .filter((t) => (t.steps?.length ?? 0) > 0 || (t.prerequisites?.length ?? 0) > 0)
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
      .slice(0, limit)
      .map((t) => ({
        slug: t.slug,
        title: t.title,
        lede: t.lede ?? null,
        prerequisitesCount: t.prerequisites?.length ?? 0,
        stepsCount: t.steps?.length ?? 0,
        feesCount: t.fees?.length ?? 0,
        delaysCount: t.delays?.length ?? 0,
        faqCount: t.faqItems?.length ?? 0,
        sourcesCount: t.sources?.length ?? 0,
        updatedAt: t.updatedAt ?? null,
      }));
  },
});

export const run = internalAction({
  args: {
    dryRun: v.boolean(),
    /** Liste de slugs à cibler. Si omise, balaie tous les guides publiés. */
    slugs: v.optional(v.array(v.string())),
    /** Réenrichit même les guides ayant déjà des sections structurées. */
    force: v.optional(v.boolean()),
    /** Borne le nombre d'appels Gemini effectifs (success + fail). */
    limit: v.optional(v.number()),
    /** Throttle entre deux appels Gemini (ms). */
    delayMs: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<BackfillCounts> => {
    const counts: BackfillCounts = {
      inspected: 0,
      skippedAlreadyStructured: 0,
      skippedNoContent: 0,
      aiSuccess: 0,
      aiFailed: 0,
      patched: 0,
    };

    const slugFilter = args.slugs && args.slugs.length > 0
      ? new Set(args.slugs)
      : null;
    const force = args.force === true;
    const maxAiCalls = args.limit ?? Number.POSITIVE_INFINITY;
    const delay = args.delayMs ?? DEFAULT_DELAY_MS;

    let cursor: string | null = null;
    let aiCalls = 0;

    while (true) {
      const batch: {
        tutorials: BatchItem[];
        cursor: string;
        isDone: boolean;
      } = await ctx.runQuery(
        internal.migrations.backfillTutorialStructure.listBatch,
        { cursor },
      );

      for (const t of batch.tutorials) {
        if (aiCalls >= maxAiCalls) break;
        if (slugFilter && !slugFilter.has(t.slug)) continue;
        counts.inspected += 1;

        if (t.hasStructure && !force) {
          counts.skippedAlreadyStructured += 1;
          continue;
        }
        if (t.content.trim().length < 50) {
          counts.skippedNoContent += 1;
          continue;
        }

        if (args.dryRun) {
          counts.aiSuccess += 1;
          aiCalls += 1;
          console.log(
            `[backfillTutorialStructure] DRY-RUN candidat`,
            { slug: t.slug, contentLen: t.content.length },
          );
          continue;
        }

        const result = await extractWithGemini(t);
        aiCalls += 1;
        if (!result) {
          counts.aiFailed += 1;
          if (delay > 0) await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        counts.aiSuccess += 1;

        const patched: boolean = await ctx.runMutation(
          internal.migrations.backfillTutorialStructure.patchTutorial,
          { tutorialId: t._id, ...result },
        );
        if (patched) counts.patched += 1;

        console.log(`[backfillTutorialStructure] patched`, {
          slug: t.slug,
          stepsCount: result.steps?.length ?? 0,
          prerequisitesCount: result.prerequisites?.length ?? 0,
          feesCount: result.fees?.length ?? 0,
          faqCount: result.faqItems?.length ?? 0,
        });

        if (delay > 0) await new Promise((r) => setTimeout(r, delay));
      }

      if (batch.isDone || aiCalls >= maxAiCalls) break;
      cursor = batch.cursor;
    }

    console.log(
      `[backfillTutorialStructure] ${args.dryRun ? "DRY-RUN" : "EXECUTE"} done`,
      counts,
    );
    return counts;
  },
});
