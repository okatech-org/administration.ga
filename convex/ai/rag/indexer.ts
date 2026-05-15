/**
 * indexer — Pipeline d'indexation RAG iAsted.
 *
 * Cycle :
 *   1. `refreshAll` (action, appelée par cron quotidien) :
 *      → collecte les entités à indexer (orgs, FAQ, services...)
 *      → calcule l'embedding via `embeddingService.embedTexts`
 *      → upsert dans `iastedKnowledge` via `upsertChunk`
 *
 *   2. Indexation incrémentale (triggers — Phase 3.x) :
 *      → quand une org/FAQ/service est mis à jour, on déclenche
 *        un re-embedding pour le chunk correspondant uniquement.
 *
 * Coût : ~$0.05 par re-indexation full (5000 entités x 500 tokens).
 */

import { v } from "convex/values";
import { internal } from "../../_generated/api";
import {
  action,
  internalMutation,
  internalQuery,
} from "../../_generated/server";

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

// ─────────────────────────────────────────────────────────────
// Upsert d'un chunk (utilisé par toutes les sources)
// ─────────────────────────────────────────────────────────────

export const upsertChunk = internalMutation({
  args: {
    sourceType: sourceTypeValidator,
    sourceId: v.string(),
    orgScope: v.optional(v.id("orgs")),
    title: v.string(),
    content: v.string(),
    embedding: v.array(v.float64()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("iastedKnowledge")
      .withIndex("by_source", (q) =>
        q.eq("sourceType", args.sourceType).eq("sourceId", args.sourceId),
      )
      .unique();

    const now = Date.now();
    const payload = {
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      orgScope: args.orgScope,
      title: args.title,
      content: args.content,
      embedding: args.embedding,
      metadata: args.metadata,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }
    return await ctx.db.insert("iastedKnowledge", payload);
  },
});

// ─────────────────────────────────────────────────────────────
// Collecte des entités sources (lecture seule)
// ─────────────────────────────────────────────────────────────

interface ChunkInput {
  sourceType: (typeof SOURCE_TYPES)[number];
  sourceId: string;
  orgScope?: string;
  title: string;
  content: string;
  metadata?: any;
}

export const collectOrgsChunks = internalQuery({
  args: {},
  handler: async (ctx): Promise<ChunkInput[]> => {
    const orgs = await ctx.db
      .query("orgs")
      .withIndex("by_active_notDeleted", (q) =>
        q.eq("isActive", true).eq("deletedAt", undefined),
      )
      .take(500);
    return orgs.map((o: any) => {
      const desc = [
        o.name,
        o.country ? `pays : ${o.country}` : null,
        o.type ? `type : ${o.type}` : null,
        o.address ? `adresse : ${o.address}` : null,
        o.contactEmail ? `email : ${o.contactEmail}` : null,
        o.contactPhone ? `tél : ${o.contactPhone}` : null,
        Array.isArray(o.modules) && o.modules.length > 0
          ? `modules actifs : ${o.modules.join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");
      return {
        sourceType: "org" as const,
        sourceId: o._id as string,
        orgScope: o._id as string,
        title: o.name as string,
        content: desc,
        metadata: { type: o.type, country: o.country },
      };
    });
  },
});

export const collectFaqsChunks = internalQuery({
  args: {},
  handler: async (ctx): Promise<ChunkInput[]> => {
    const faqs = await ctx.db.query("faqs").take(500);
    return faqs.map((f: any) => ({
      sourceType: "faq" as const,
      sourceId: f._id as string,
      orgScope: (f.orgId as string | undefined) ?? undefined,
      title: (f.question as string) ?? "FAQ",
      content: `Question : ${f.question ?? ""}\nRéponse : ${f.answer ?? ""}`,
      metadata: { category: f.category },
    }));
  },
});

export const collectServicesChunks = internalQuery({
  args: {},
  handler: async (ctx): Promise<ChunkInput[]> => {
    const services = await ctx.db.query("services").take(500);
    return services.map((s: any) => ({
      sourceType: "service" as const,
      sourceId: s._id as string,
      orgScope: undefined,
      title: (s.name as string) ?? (s.code as string) ?? "Service",
      content: [
        s.name && `Nom : ${s.name}`,
        s.code && `Code : ${s.code}`,
        s.description && `Description : ${s.description}`,
        s.category && `Catégorie : ${s.category}`,
      ]
        .filter(Boolean)
        .join("\n"),
      metadata: { category: s.category, code: s.code },
    }));
  },
});

// ─────────────────────────────────────────────────────────────
// Action principale : refreshAll
// ─────────────────────────────────────────────────────────────

const BATCH_SIZE = 50;

export const refreshAll = action({
  args: {},
  handler: async (ctx): Promise<{ indexed: number; skipped: number }> => {
    // Si pas de clé OpenAI configurée, on skip silencieusement.
    if (!process.env.OPENAI_API_KEY) {
      return { indexed: 0, skipped: 0 };
    }

    // Collecte des sources
    const [orgsChunks, faqsChunks, servicesChunks]: [
      ChunkInput[],
      ChunkInput[],
      ChunkInput[],
    ] = await Promise.all([
      ctx.runQuery(internal.ai.rag.indexer.collectOrgsChunks, {}),
      ctx.runQuery(internal.ai.rag.indexer.collectFaqsChunks, {}),
      ctx.runQuery(internal.ai.rag.indexer.collectServicesChunks, {}),
    ]);

    const allChunks: ChunkInput[] = [
      ...orgsChunks,
      ...faqsChunks,
      ...servicesChunks,
    ].filter((c) => c.content.trim().length > 0);

    let indexed = 0;
    for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
      const batch = allChunks.slice(i, i + BATCH_SIZE);
      const texts = batch.map((c) => `${c.title}\n${c.content}`);
      const embeddings = await ctx.runAction(
        internal.ai.rag.embeddingService.embedTexts,
        { texts },
      );
      if (!embeddings) {
        // Clé non configurée côté action — abort silencieux.
        return { indexed, skipped: allChunks.length - indexed };
      }
      for (let j = 0; j < batch.length; j += 1) {
        const c = batch[j];
        const e = embeddings[j];
        if (!c || !e) continue;
        await ctx.runMutation(internal.ai.rag.indexer.upsertChunk, {
          sourceType: c.sourceType,
          sourceId: c.sourceId,
          orgScope: c.orgScope as any,
          title: c.title,
          content: c.content,
          embedding: e,
          metadata: c.metadata,
        });
        indexed += 1;
      }
    }

    return { indexed, skipped: 0 };
  },
});
