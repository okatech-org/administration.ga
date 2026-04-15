import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Meetings table — Audio/video calls and group meetings (LiveKit)
 *
 * Supports two modes:
 *   - "call": 1:1 audio/video call (agent ↔ citizen)
 *   - "meeting": group meeting (multiple participants)
 *
 * Linked to LiveKit rooms via `roomName`.
 */

const meetingParticipantValidator = v.object({
  userId: v.id("users"),
  joinedAt: v.optional(v.number()),
  leftAt: v.optional(v.number()),
  role: v.union(v.literal("host"), v.literal("participant")),
});

export const meetingsTable = defineTable({
  // Identity
  title: v.string(),
  type: v.union(v.literal("call"), v.literal("meeting")),
  status: v.union(
    v.literal("scheduled"),
    v.literal("active"),
    v.literal("ended"),
    v.literal("cancelled"),
  ),

  // LiveKit
  roomName: v.string(),
  roomSid: v.optional(v.string()),

  // Ownership (optional for C2C calls)
  orgId: v.optional(v.id("orgs")),
  createdBy: v.id("users"),

  // Participants
  participants: v.array(meetingParticipantValidator),

  // Inbound org call (citizen calling the organization directly)
  isOrgInbound: v.optional(v.boolean()),

  // Call line routing (optional — if set, only agents on this line see the call)
  callLineId: v.optional(v.id("callLines")),

  // Context linking (optional)
  requestId: v.optional(v.id("requests")),
  appointmentId: v.optional(v.id("appointments")),

  // Media type (audio-only or video allowed)
  mediaType: v.optional(v.union(v.literal("audio"), v.literal("video"))),

  // Config
  maxParticipants: v.optional(v.number()),
  recordingEnabled: v.optional(v.boolean()),

  // Timestamps
  scheduledAt: v.optional(v.number()),
  startedAt: v.optional(v.number()),
  endedAt: v.optional(v.number()),

  // ─── PHASE 2 : Traçabilité & qualité ────────────────────────
  // Raison de fin (normal, missed, timeout, etc.) pour stats + missedCalls
  endReason: v.optional(
    v.union(
      v.literal("normal"),
      v.literal("missed"), // personne n'a décroché
      v.literal("rejected"),
      v.literal("no_agent_available"),
      v.literal("timeout"),
      v.literal("error"),
    ),
  ),

  // Métriques de qualité réseau/audio (remplies en fin d'appel)
  qualityMetrics: v.optional(
    v.object({
      audioQuality: v.optional(v.number()), // 0-1
      videoQuality: v.optional(v.number()),
      packetLossPercent: v.optional(v.number()),
      averageLatencyMs: v.optional(v.number()),
    }),
  ),

  // Enregistrement (si recording activé)
  recordingUrl: v.optional(v.string()),
  recordingDurationSeconds: v.optional(v.number()),
  recordingStorageId: v.optional(v.id("_storage")), // si stocké en Convex Storage

  // Legacy : callStatus utilisé par des documents historiques avant endReason.
  // Gardé optionnel pour préserver les données existantes (rétrocompatibilité).
  // À migrer progressivement vers `endReason`.
  callStatus: v.optional(v.string()),
})
  .index("by_org", ["orgId"])
  .index("by_roomName", ["roomName"])
  .index("by_createdBy", ["createdBy"])
  .index("by_org_status", ["orgId", "status"])
  .index("by_org_endReason", ["orgId", "endReason"])
  .index("by_request", ["requestId"]);
