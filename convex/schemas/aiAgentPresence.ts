/**
 * AI Agent Presence Schema (volatile, TTL 5 min)
 *
 * Stocke le contexte courant de chaque agent dans l'UI :
 *   - Quelle route est ouverte ?
 *   - Quelle entite consultee (request, document, etc.) ?
 *   - Sur quel champ formulaire le focus est-il ?
 *
 * Permet a l'agent IA proactif de pousser des suggestions
 * pertinentes en temps reel : si l'agent ouvre une request en
 * UnderReview, on sait qu'il regarde ID=xxx et on peut proposer
 * une analyse de documents en moins d'une seconde.
 *
 * High-churn : update toutes les 1-5 secondes via heartbeat client.
 * Cleanup via cron (rows > 5 min sans heartbeat = supprimees).
 *
 * Une row par (membershipId).
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const aiAgentPresenceTable = defineTable({
  membershipId: v.id("memberships"),
  userId: v.id("users"),
  orgId: v.id("orgs"),

  /** Route Next.js actuelle (ex: /requests/abc123) */
  route: v.string(),

  /** Type de l'entite consultee (request, document, correspondance, target, etc.) */
  entityType: v.optional(v.string()),

  /** ID Convex de l'entite consultee */
  entityId: v.optional(v.string()),

  /** Nom du champ formulaire actuellement focus (pour suggestions inline) */
  focusedField: v.optional(v.string()),

  /** Action en cours (ex: "drafting_correspondance", "reviewing_request") */
  currentAction: v.optional(v.string()),

  /** Timestamp du dernier heartbeat (utilise pour TTL et cleanup) */
  lastHeartbeatAt: v.number(),

  /** Type de client (agent-web | agent-desktop) */
  clientType: v.optional(v.string()),
})
  .index("by_membership", ["membershipId"])
  .index("by_user", ["userId"])
  .index("by_org", ["orgId"])
  .index("by_org_entity", ["orgId", "entityType", "entityId"])
  .index("by_heartbeat", ["lastHeartbeatAt"]);
