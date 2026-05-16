/**
 * iAsted Knowledge Schema
 *
 * Stocke les chunks indexés sémantiquement consommés par le RAG de l'agent
 * vocal iAsted. Chaque ligne = un fragment textuel (titre + contenu) issu
 * d'une entité de la plateforme (organisation, position, service,
 * workflow, document, FAQ, procédure, intel brief).
 *
 * Le RAG permet à iAsted de répondre à des questions de type :
 *   - "Quelle est la procédure de légalisation à Paris ?"
 *   - "Qui s'occupe du dossier visa Mbeng ?"
 *   - "Quels services consulaires propose l'ambassade de Madrid ?"
 *
 * Pipeline :
 *   1. `indexer.ts` peuple cette table par batches (cron quotidien + triggers).
 *   2. `embeddingService.ts` appelle OpenAI text-embedding-3-small (1536 dim).
 *   3. `retriever.ts` interroge via `ctx.db.vectorSearch("iastedKnowledge", "by_embedding", ...)`
 *      et retourne les top-K chunks pertinents.
 *
 * Coût opérationnel : ~$0.05 par re-indexation full (5000 entités x 500 tokens).
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const iastedKnowledgeTable = defineTable({
  /**
   * Type de la source. Permet de filtrer côté retriever
   * (« cherche seulement dans les FAQ », etc.).
   */
  sourceType: v.union(
    v.literal("org"),
    v.literal("position"),
    v.literal("service"),
    v.literal("workflow"),
    v.literal("doc"),
    v.literal("faq"),
    v.literal("intel_brief"),
    v.literal("procedure"),
  ),
  /** Identifiant Convex original de la source (en string pour généraliser). */
  sourceId: v.string(),
  /**
   * Org dans laquelle ce chunk est visible. Optionnel : si absent,
   * le chunk est global (procédures partagées, FAQ communes).
   */
  orgScope: v.optional(v.id("orgs")),
  /** Titre court (ex : nom de l'org, libellé de la procédure). */
  title: v.string(),
  /** Contenu textuel embedded (max ~8K tokens pratiqué). */
  content: v.string(),
  /** Embedding OpenAI text-embedding-3-small (1536 dimensions). */
  embedding: v.array(v.float64()),
  /** Métadonnées libres (paramètres workflow, statut, etc.). */
  metadata: v.optional(v.any()),
  /** Timestamp de la dernière indexation. */
  updatedAt: v.number(),
})
  .index("by_source", ["sourceType", "sourceId"])
  .index("by_orgScope", ["orgScope"])
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 1536,
    filterFields: ["orgScope", "sourceType"],
  });
