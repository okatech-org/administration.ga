import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Supervision sessions — Sprint 6.
 *
 * Trace chaque session de supervision active ou passée entre un superviseur
 * et un appel (meeting) : listen (écoute), whisper (souffler à l'agent),
 * barge (intervention).
 *
 * Un superviseur peut n'avoir qu'UNE session active à la fois (non enforced
 * par le schema, géré par la mutation).
 *
 * Durée : session fermée = endedAt défini. Un cron peut nettoyer les sessions
 * orphelines (endedAt undefined + startedAt très ancien).
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
