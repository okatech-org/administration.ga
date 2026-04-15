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
export const supervisionModeValidator = v.union(
  v.literal("listen"), // Invisible pour agent + citoyen, mic forcé off
  v.literal("whisper"), // Mic on, audible uniquement par l'agent
  v.literal("barge"), // Participant normal, audible par tous
);

export const supervisionSessionsTable = defineTable({
  meetingId: v.id("meetings"),
  supervisorId: v.id("users"),
  orgId: v.id("orgs"),
  mode: supervisionModeValidator,
  /** Identity LiveKit : "supervisor_${userId}_${mode}" (utilisée pour filtrage). */
  liveKitIdentity: v.string(),
  startedAt: v.number(),
  /** Session fermée si défini. */
  endedAt: v.optional(v.number()),
})
  .index("by_meeting", ["meetingId"])
  .index("by_supervisor_active", ["supervisorId", "endedAt"])
  .index("by_org", ["orgId"]);
