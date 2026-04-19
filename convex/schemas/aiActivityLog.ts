/**
 * AI Activity Log Schema (append-only)
 *
 * Trace immuable de toutes les interventions de l'agent IA proactif :
 *   - Suggestions generees (proposed)
 *   - Suggestions acceptees / rejetees / auto-appliquees
 *   - Erreurs LLM, timeouts, depassements de budget
 *
 * Sert a :
 *   - Audit reglementaire (qui/quoi/quand/cout)
 *   - Tracking des couts LLM par org
 *   - Calcul du ROI (suggestions acceptees vs rejetees)
 *   - Debugging des hallucinations IA
 *
 * Append-only : aucune mutation ne doit jamais update/delete une row de cette table.
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const aiActivityLogTable = defineTable({
  // ─── Scope ───────────────────────────────────────────────
  orgId: v.id("orgs"),
  membershipId: v.optional(v.id("memberships")),
  userId: v.optional(v.id("users")),

  // ─── Reference suggestion ────────────────────────────────
  /** Suggestion concernee (peut etre vide si erreur avant creation) */
  suggestionId: v.optional(v.id("aiSuggestions")),

  // ─── Identification ──────────────────────────────────────
  capabilityCode: v.string(),

  /** Type d'evenement loggue */
  action: v.union(
    v.literal("proposed"),       // Suggestion creee
    v.literal("accepted"),       // Agent a applique manuellement
    v.literal("dismissed"),      // Agent a rejete
    v.literal("auto_applied"),   // IA a applique sans validation
    v.literal("expired"),        // Suggestion expiree (TTL)
    v.literal("undone"),         // Auto-apply annule par l'agent
    v.literal("errored"),        // Echec LLM/permission/budget
    v.literal("rate_limited"),   // Quota IA atteint
    v.literal("budget_exceeded"),// Budget org IA epuise
    v.literal("blocked"),        // Bloque par kill switch ou config
  ),

  // ─── Performances LLM ────────────────────────────────────
  model: v.optional(v.string()),
  latencyMs: v.optional(v.number()),
  tokensIn: v.optional(v.number()),
  tokensOut: v.optional(v.number()),
  /** Cout en cents (multiplie par 1000 pour eviter les decimales) */
  costMicroCents: v.optional(v.number()),

  // ─── Erreur eventuelle ──────────────────────────────────
  error: v.optional(v.string()),

  // ─── Metadonnees libres ─────────────────────────────────
  metadata: v.optional(v.any()),

  timestamp: v.number(),
})
  .index("by_org", ["orgId"])
  .index("by_org_timestamp", ["orgId", "timestamp"])
  .index("by_membership", ["membershipId"])
  .index("by_membership_timestamp", ["membershipId", "timestamp"])
  .index("by_suggestion", ["suggestionId"])
  .index("by_capability", ["capabilityCode"])
  .index("by_action", ["action"]);
