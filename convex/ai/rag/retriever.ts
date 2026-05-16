/**
 * retriever — Recherche sémantique dans `iastedKnowledge`.
 *
 * Pipeline :
 *   1. Convertit la question en embedding via `embeddingService.embedTexts`.
 *   2. Appelle `ctx.vectorSearch("iastedKnowledge", "by_embedding", ...)`.
 *   3. Charge les chunks correspondants via `getByIds` (la vector search
 *      ne retourne que des `_id` + scores, pas les documents complets).
 *   4. Retourne un tableau de `RetrievedChunk` enrichis.
 *
 * Le retriever est appelé par `realtimeToolExecutor` quand l'agent
 * invoque `query_platform_knowledge`.
 */

import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { internal } from "../../_generated/api";
import { action, internalQuery } from "../../_generated/server";

const SOURCE_TYPES = [
  "org",
  "position",
  "service",
  "workflow",
  "doc",
  "faq",
  "intel_brief",
  "procedure",
] as const;

const sourceTypeValidator = v.union(
  ...SOURCE_TYPES.map((t) => v.literal(t)),
);

export interface RetrievedChunk {
  id: string;
  sourceType: (typeof SOURCE_TYPES)[number];
  sourceId: string;
  title: string;
  content: string;
  score: number;
  orgScope?: string;
}

// ─────────────────────────────────────────────────────────────
// Internal query : récupère les chunks par batch d'IDs
// ─────────────────────────────────────────────────────────────

export const getChunksByIds = internalQuery({
  args: {
    ids: v.array(v.id("iastedKnowledge")),
  },
  handler: async (ctx, { ids }) => {
    const docs = await Promise.all(ids.map((id) => ctx.db.get(id)));
    return docs.filter((d): d is NonNullable<typeof d> => d !== null);
  },
});

// ─────────────────────────────────────────────────────────────
// Action principale : query
// ─────────────────────────────────────────────────────────────

export const query = action({
  args: {
    query: v.string(),
    sourceTypes: v.optional(v.array(sourceTypeValidator)),
    orgScope: v.optional(v.id("orgs")),
    topK: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<RetrievedChunk[]> => {
    const text = (args.query ?? "").trim();
    if (!text) return [];
    if (!process.env.OPENAI_API_KEY) return [];

    const topK = Math.max(1, Math.min(args.topK ?? 5, 20));

    // 1. Embedding de la question
    const embeddings = await ctx.runAction(
      internal.ai.rag.embeddingService.embedTexts,
      { texts: [text] },
    );
    if (!embeddings || embeddings.length === 0 || !embeddings[0]) return [];

    // 2. Vector search
    const filter = (q: any) => {
      let chain = q;
      if (args.orgScope) {
        chain = chain.eq("orgScope", args.orgScope);
      }
      // Note : la filterExpression Convex ne supporte qu'un filterField à la fois
      // par chain. Pour orgScope + sourceTypes, on fait deux passes ou on filtre
      // post-search. Ici on privilégie orgScope (impact RBAC).
      return chain;
    };

    const results = await ctx.vectorSearch("iastedKnowledge", "by_embedding", {
      vector: embeddings[0],
      limit: topK * 2, // overshoot pour filtrage sourceTypes post-search
      filter: args.orgScope ? filter : undefined,
    });

    if (results.length === 0) return [];

    // 3. Charge les documents complets
    const ids = results.map((r) => r._id as Id<"iastedKnowledge">);
    const docs = (await ctx.runQuery(
      internal.ai.rag.retriever.getChunksByIds,
      { ids },
    )) as any[];

    // Map id → score
    const scoreById = new Map<string, number>(
      results.map((r) => [r._id as string, r._score]),
    );

    // 4. Filtre par sourceTypes si demandé + tri par score
    let filtered = docs;
    if (args.sourceTypes && args.sourceTypes.length > 0) {
      const allowed = new Set(args.sourceTypes);
      filtered = docs.filter((d) => allowed.has(d.sourceType));
    }
    filtered.sort(
      (a, b) =>
        (scoreById.get(b._id as string) ?? 0) -
        (scoreById.get(a._id as string) ?? 0),
    );

    return filtered.slice(0, topK).map((d) => ({
      id: d._id as string,
      sourceType: d.sourceType,
      sourceId: d.sourceId,
      title: d.title,
      content: d.content,
      score: scoreById.get(d._id as string) ?? 0,
      orgScope: d.orgScope,
    }));
  },
});
