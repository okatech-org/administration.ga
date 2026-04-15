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
    v.literal("busy"),    // Currently in a call or meeting
    v.literal("away"),    // Idle > 5 min
    v.literal("offline"),
  ),
  lastHeartbeat: v.number(),
  lastActivity: v.number(),
  currentCallId: v.optional(v.id("meetings")),
  clientType: v.optional(v.string()), // "agent-web" | "agent-desktop"
})
  .index("by_user_and_org", ["userId", "orgId"])
  .index("by_org_and_status", ["orgId", "status"])
  .index("by_org", ["orgId"]);
