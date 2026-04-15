import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Call Lines — Multi-line call routing for organizations
 *
 * Two types:
 *   - "org": shared line (N agents), e.g. "Urgences", "Accueil"
 *   - "personal": direct line for a single agent (auto-created on membership)
 *
 * When a citizen calls an org, they can select a specific line.
 * Only agents assigned to that line will receive the call.
 */
export const callLinesTable = defineTable({
  // Type
  type: v.union(v.literal("org"), v.literal("personal")),
  orgId: v.id("orgs"),

  // Display
  label: v.string(),
  description: v.optional(v.string()),
  icon: v.optional(v.string()),
  color: v.optional(v.string()),
  priority: v.number(),
  isDefault: v.optional(v.boolean()),

  // Status
  isActive: v.boolean(),

  // Agents assigned to this line
  membershipIds: v.array(v.id("memberships")),

  // For personal lines: direct link to the user
  userId: v.optional(v.id("users")),

  // ─── PHASE 2 : SLA, Load balancing, Fallback ────────────────
  // Stratégie de distribution des appels entrants aux agents assignés
  loadBalancingStrategy: v.optional(
    v.union(
      v.literal("broadcast"), // actuel — tous agents reçoivent simultanément
      v.literal("round_robin"), // tour à tour, équitable
      v.literal("least_busy"), // agent le moins occupé
      v.literal("priority_order"), // ordre de priorité dans membershipIds
    ),
  ),

  // Timeout spécifique à cette ligne (override du défaut 60s)
  ringTimeoutSeconds: v.optional(v.number()),

  // SLA : temps max pour qu'un agent décroche
  slaResponseSeconds: v.optional(v.number()),

  // Si personne ne décroche : basculer sur une autre ligne
  fallbackCallLineId: v.optional(v.id("callLines")),
  fallbackAction: v.optional(
    v.union(
      v.literal("voicemail"),
      v.literal("other_line"),
      v.literal("notification_only"),
    ),
  ),

  // Statistiques (dénormalisées pour affichage rapide)
  stats: v.optional(
    v.object({
      totalCallsLast30Days: v.number(),
      missedCallsLast30Days: v.number(),
      averageResponseSeconds: v.optional(v.number()),
      lastUpdatedAt: v.number(),
    }),
  ),
})
  .index("by_org", ["orgId"])
  .index("by_org_active", ["orgId", "isActive"])
  .index("by_user", ["userId"]);
