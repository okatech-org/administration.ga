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
      v.literal("rejected"),  // Legacy value — kept for backward compat
      v.literal("voicemail_recorded"), // Sprint 6 — IVR fallback → voicemail
    ),
  ),

  // Context linking (optional)
  requestId: v.optional(v.id("requests")),
  appointmentId: v.optional(v.id("appointments")),

  // Priority classification (Centre d'Appels multi-lignes).
  // Initialement dérivée de `callLines.priority` + flags côté appelant,
  // puis utilisée pour trier la file d'attente des agents.
  priority: v.optional(
    v.union(
      v.literal("urgent"),
      v.literal("high"),
      v.literal("normal"),
    ),
  ),

  // Timestamp auquel l'appel a été mis en attente (par un agent).
  // Permet les statistiques SLA de temps d'attente et la détection de slots stagnants.
  parkedAt: v.optional(v.number()),

  // IVR Fallback — marqué `true` après que le cron a redirigé l'appel vers
  // la ligne de secours (`callLines.fallbackCallLineId`). Empêche les boucles
  // infinies et permet de tracer l'historique du routage.
  fallbackApplied: v.optional(v.boolean()),
  // Ligne d'origine avant redirection (pour l'audit et les stats)
  originalCallLineId: v.optional(v.id("callLines")),

  // Media type (audio-only or video allowed)
  mediaType: v.optional(v.union(v.literal("audio"), v.literal("video"))),

  // Config
  maxParticipants: v.optional(v.number()),
  recordingEnabled: v.optional(v.boolean()),

  // Sprint 6 — Consent RGPD du citoyen pour l'enregistrement de l'appel.
  // Affichage banner obligatoire côté citoyen AVANT déclenchement RoomEgress.
  citizenConsent: v.optional(
    v.object({
      recordingAccepted: v.optional(v.boolean()),
      recordingAcceptedAt: v.optional(v.number()),
      recordingDeclinedAt: v.optional(v.number()),
      // Plan Intelligence iAsted × Sprint 6 — Phase ε.
      // Timestamp écrit par `meetings.requestRecordingConsent` (agent) ; le
      // citoyen y réagit en affichant le banner côté iAsted tant que
      // `recordingAccepted`/`recordingDeclinedAt` ne sont pas encore renseignés.
      recordingConsentRequestedAt: v.optional(v.number()),
    }),
  ),

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
