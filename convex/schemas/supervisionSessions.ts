import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Supervision Sessions — Supervisor joining a live call to listen,
 * whisper (audible only to the agent), or barge (audible to everyone).
 */
export const supervisionSessionsTable = defineTable({
  meetingId: v.id("meetings"),
  orgId: v.id("orgs"),
  supervisorId: v.id("users"),

  mode: v.union(
    v.literal("listen"),
    v.literal("whisper"),
    v.literal("barge"),
  ),

  // LiveKit participant identity used by the supervisor (distinct from user id
  // because the same supervisor could join several sessions with separate tracks)
  liveKitIdentity: v.string(),

  startedAt: v.float64(),
  endedAt: v.optional(v.float64()),
})
  .index("by_meeting", ["meetingId"])
  .index("by_org", ["orgId"])
  .index("by_supervisor_active", ["supervisorId", "endedAt"]);
