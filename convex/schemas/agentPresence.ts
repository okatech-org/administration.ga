import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Agent presence — real-time online/busy/away/offline status.
 *
 * High-churn table (heartbeats every 30s). Deliberately separate from
 * memberships/users to avoid write contention on stable profile data.
 *
 * One row per (userId, orgId) pair. An agent with memberships in
 * multiple orgs has one presence row per org.
 */
export const agentPresenceTable = defineTable({
  userId: v.id("users"),
  orgId: v.id("orgs"),
  status: v.union(
    v.literal("online"),
    v.literal("busy"),    // Currently in an active call (audio live)
    v.literal("away"),    // Idle > 5 min
    v.literal("offline"),
  ),
  lastHeartbeat: v.number(),
  lastActivity: v.number(),
  // Legacy scalaire — conservé pendant la migration vers multi-call.
  // Rempli en miroir de activeCallId pour la rétrocompatibilité.
  currentCallId: v.optional(v.id("meetings")),
  // Multi-call (Centre d'Appels) : tous les slots joints par l'agent (actifs + en attente)
  currentCallIds: v.optional(v.array(v.id("meetings"))),
  // Le slot dont l'audio est actuellement publié (exactement 0 ou 1)
  activeCallId: v.optional(v.id("meetings")),
  clientType: v.optional(v.string()), // "agent-web" | "agent-desktop"
  // Do-Not-Disturb — timestamp d'expiration. Si `dndUntil > Date.now()`,
  // l'agent est exclu des stratégies de routing `least_busy` et `priority_order`.
  // Écrit par `agentPresence.setDnd` (Plan Phase β — Intelligence iAsted × Sprint 6).
  dndUntil: v.optional(v.number()),
})
  .index("by_user_and_org", ["userId", "orgId"])
  .index("by_org_and_status", ["orgId", "status"])
  .index("by_org", ["orgId"]);
