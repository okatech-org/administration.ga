/**
 * AI Realtime Sessions — supervise + audit + cost tracking.
 *
 * Une row par session vocale iAsted (OpenAI Realtime). Créée lors de
 * `realtimeToken.create`, patchée à chaque heartbeat (tool call) et au
 * `recordSessionEnd` côté client.
 *
 * Cas d'usage :
 *   - Dashboard "qui parle à iAsted" en temps réel (backoffice supervision).
 *   - Compteur coût mensuel par org (facturation interne / quotas).
 *   - Audit des sessions douteuses (anomalies de durée, erreurs récurrentes).
 *
 * Le `sessionId` interne (OpenAI) est référencé pour corréler aux logs OpenAI.
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const aiRealtimeSessionsTable = defineTable({
  /** ID de session retourné par OpenAI (sess_xxx ou fallback timestamp). */
  externalSessionId: v.string(),

  /** Utilisateur ayant ouvert la session. */
  userId: v.id("users"),

  /** Organisation active au moment de l'ouverture (optionnel pour citizen). */
  orgId: v.optional(v.id("orgs")),

  /** Surface d'origine (agent/backoffice/citizen). */
  surface: v.union(
    v.literal("agent"),
    v.literal("backoffice"),
    v.literal("citizen"),
  ),

  /** Modèle OpenAI utilisé (ex : "gpt-realtime"). */
  model: v.optional(v.string()),

  /** Voix sélectionnée. */
  voice: v.optional(v.string()),

  /** Timestamps. */
  startedAt: v.number(),
  endedAt: v.optional(v.number()),
  lastHeartbeatAt: v.optional(v.number()),

  /** État courant. */
  status: v.union(
    v.literal("active"),
    v.literal("ended"),
    v.literal("force_terminated"),
    v.literal("crashed"),
  ),

  /** Métriques d'usage envoyées côté client à la fermeture. */
  usage: v.optional(
    v.object({
      durationSeconds: v.number(),
      audioInSeconds: v.optional(v.number()),
      audioOutSeconds: v.optional(v.number()),
      toolCallCount: v.optional(v.number()),
    }),
  ),

  /** Coût estimé en micro-cents (1/1_000_000 USD). */
  costMicroCents: v.optional(v.number()),

  /** Raison de fin (normal, error, idle_timeout, force_terminated). */
  endReason: v.optional(v.string()),
})
  .index("by_user", ["userId", "status"])
  .index("by_org", ["orgId", "status"])
  .index("by_org_started", ["orgId", "startedAt"])
  .index("by_status_started", ["status", "startedAt"])
  .index("by_external_session", ["externalSessionId"]);
