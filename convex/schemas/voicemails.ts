import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Voicemails — Audio messages left by citizens when no agent answers
 *
 * Linked to the originating meeting. Transcription is best-effort.
 */
export const voicemailsTable = defineTable({
  meetingId: v.id("meetings"),
  orgId: v.id("orgs"),
  callLineId: v.optional(v.id("callLines")),

  // Caller identity (may be anonymous)
  citizenUserId: v.optional(v.id("users")),
  citizenDisplayName: v.optional(v.string()),
  citizenPhoneOrEmail: v.optional(v.string()),

  // Media
  audioStorageId: v.optional(v.id("_storage")),
  egressId: v.optional(v.string()),
  durationMs: v.optional(v.float64()),
  failureReason: v.optional(v.string()),

  // Transcription
  transcript: v.optional(v.string()),
  transcriptConfidence: v.optional(v.float64()),

  // Read state
  isRead: v.boolean(),
  readAt: v.optional(v.float64()),
  readBy: v.optional(v.id("users")),

  createdAt: v.float64(),
})
  .index("by_meeting", ["meetingId"])
  .index("by_egress_id", ["egressId"])
  .index("by_line", ["callLineId"])
  .index("by_org_created", ["orgId", "createdAt"])
  .index("by_org_unread", ["orgId", "isRead"]);
