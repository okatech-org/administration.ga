import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Call Recordings — LiveKit egress recordings for org calls
 *
 * Linked 1:1 to a meeting. Recording starts only after citizen consent
 * (stored on meetings.citizenConsent). A retention timestamp drives the
 * delete job.
 */
export const callRecordingsTable = defineTable({
  meetingId: v.id("meetings"),
  orgId: v.id("orgs"),

  // LiveKit egress
  egressId: v.optional(v.string()),
  storageId: v.optional(v.id("_storage")),

  // State
  status: v.union(
    v.literal("pending"),
    v.literal("completed"),
    v.literal("failed"),
  ),
  failureReason: v.optional(v.string()),

  // Consent
  consentBannerShown: v.boolean(),
  consentAcceptedByCitizenAt: v.optional(v.float64()),

  // Lifecycle
  startedAt: v.float64(),
  startedBy: v.optional(v.id("users")),
  endedAt: v.optional(v.float64()),
  durationMs: v.optional(v.float64()),

  // Retention / GDPR
  retentionUntil: v.float64(),
  deletedAt: v.optional(v.float64()),
})
  .index("by_meeting", ["meetingId"])
  .index("by_egress_id", ["egressId"])
  .index("by_org_started", ["orgId", "startedAt"])
  .index("by_retention", ["retentionUntil"]);
