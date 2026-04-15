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

  // ─── Call state machine (type === "call" only) ───
  callStatus: v.optional(
    v.union(
      v.literal("initiating"), // Call created, citizen connecting to LiveKit
      v.literal("ringing"),    // Citizen connected, agents notified
      v.literal("connected"),  // Agent answered, both parties in room
      v.literal("on_hold"),    // Call temporarily on hold
      v.literal("ended"),      // Normal termination
      v.literal("missed"),     // No agent answered within timeout
      v.literal("declined"),   // All eligible agents explicitly declined
    ),
  ),
  answeredBy: v.optional(v.id("users")),
  answeredAt: v.optional(v.number()),
  declinedBy: v.optional(v.array(v.id("users"))),
  endReason: v.optional(
    v.union(
      v.literal("normal"),    // One party hung up
      v.literal("timeout"),   // No answer within timeout
      v.literal("declined"),  // All agents declined
      v.literal("error"),     // Technical error
      v.literal("cancelled"), // Caller cancelled before answer
      v.literal("voicemail_recorded"), // Voicemail captured instead of live answer
    ),
  ),

  // ─── Fallback / routing extensions ───
  // True when the call was redirected via a fallback rule (another line / voicemail)
  fallbackApplied: v.optional(v.boolean()),
  // When a fallback was applied, which line was originally dialed
  originalCallLineId: v.optional(v.id("callLines")),
  // Timestamp when the call entered a "parked" / hold state
  parkedAt: v.optional(v.number()),

  // Priority tier (used for queue ordering, SLA, monitoring)
  priority: v.optional(
    v.union(
      v.literal("low"),
      v.literal("normal"),
      v.literal("high"),
      v.literal("urgent"),
    ),
  ),

  // Consent capture for citizens (recording, transcript)
  citizenConsent: v.optional(
    v.object({
      recording: v.optional(v.boolean()),
      transcript: v.optional(v.boolean()),
      grantedAt: v.optional(v.number()),
    }),
  ),

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
})
  .index("by_org", ["orgId"])
  .index("by_roomName", ["roomName"])
  .index("by_createdBy", ["createdBy"])
  .index("by_org_status", ["orgId", "status"])
  .index("by_callStatus_and_org", ["callStatus", "orgId"])
  .index("by_request", ["requestId"]);
