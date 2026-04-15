import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Table orgEscalationPolicy — Politique d'escalation unifiée (Phase D3)
 *
 * Fusionne les 2 systèmes d'escalation dispersés :
 *   1. `orgIAstedConfig.escalation` → quand iAsted doit passer la main à un humain
 *   2. `callLines.fallbackCallLineId` → quand personne ne répond à un appel
 *
 * Cardinalité : 1:1 avec orgs.
 *
 * Migration progressive : les deux systèmes existants continuent de fonctionner,
 * cette table est consultée en plus. Les nouvelles écritures vont ici, et à
 * terme iAsted/callLines liront depuis ici (Phase E ultérieure).
 */

// ─── Configuration escalation chatbot (iAsted → agent) ─────
export const chatbotEscalationValidator = v.object({
  // Déclencheurs
  triggerKeywords: v.array(v.string()),
  triggerSentiment: v.union(
    v.literal("never"),
    v.literal("negative_only"),
    v.literal("frustrated"),
  ),
  maxTurnsBeforeSuggestHandoff: v.number(),

  // Cible du handoff
  target: v.object({
    type: v.union(
      v.literal("call_line"),
      v.literal("membership"),
      v.literal("chat_standard"),
    ),
    callLineId: v.optional(v.id("callLines")),
    membershipIds: v.optional(v.array(v.id("memberships"))),
  }),

  // Message présenté au citoyen
  handoffMessage: v.string(),
});

// ─── Configuration escalation callcenter (appel non répondu) ──
export const callcenterEscalationValidator = v.object({
  // Ligne de fallback si personne ne répond sur la ligne primaire
  fallbackLineId: v.optional(v.id("callLines")),

  // Stratégie de distribution avant fallback
  strategy: v.union(
    v.literal("broadcast"),
    v.literal("round_robin"),
    v.literal("least_busy"),
    v.literal("priority_order"),
  ),

  // Délai avant escalation (en secondes)
  ringTimeoutBeforeFallback: v.optional(v.number()),

  // Action si fallback échoue aussi (tous ring timeouts dépassés)
  finalAction: v.optional(
    v.union(
      v.literal("voicemail"),
      v.literal("callback_request"),
      v.literal("disconnect"),
    ),
  ),
});

export const orgEscalationPolicyTable = defineTable({
  orgId: v.id("orgs"),

  chatbot: chatbotEscalationValidator,
  callcenter: callcenterEscalationValidator,

  // Audit
  updatedAt: v.number(),
  updatedBy: v.optional(v.id("users")),
})
  .index("by_org", ["orgId"])
  // Phase F2.2 — Index composite pour les requêtes filtrées par date.
  .index("by_org_updatedAt", ["orgId", "updatedAt"]);
