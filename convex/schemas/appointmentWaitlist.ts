import { defineTable } from "convex/server";
import { v } from "convex/values";
import { appointmentTypeValidator } from "./appointments";

/**
 * Waitlist status lifecycle:
 *   waiting  -> offered    (when an agent cancels or manually promotes)
 *   offered  -> claimed    (citizen accepted the offer, appointment booked)
 *   offered  -> expired    (offer window passed without claim)
 *   waiting  -> cancelled  (citizen left voluntarily)
 */
export const WaitlistStatus = {
  Waiting: "waiting",
  Offered: "offered",
  Claimed: "claimed",
  Expired: "expired",
  Cancelled: "cancelled",
} as const;

export const waitlistStatusValidator = v.union(
  v.literal(WaitlistStatus.Waiting),
  v.literal(WaitlistStatus.Offered),
  v.literal(WaitlistStatus.Claimed),
  v.literal(WaitlistStatus.Expired),
  v.literal(WaitlistStatus.Cancelled),
);

/**
 * Appointment waitlist — FIFO queue per org+service.
 *
 * A citizen joins when no slot matches their window; when any appointment
 * is cancelled (or an agent promotes manually), the oldest waiting entry
 * whose `earliestDate/latestDate` covers the freed slot gets an `offered`
 * status with an `offerExpiresAt` deadline. If not claimed in time,
 * status flips to `expired` and the next entry is offered.
 */
export const appointmentWaitlistTable = defineTable({
  orgId: v.id("orgs"),
  orgServiceId: v.id("orgServices"),
  attendeeProfileId: v.id("profiles"),

  appointmentType: v.optional(appointmentTypeValidator),

  // Preference window (inclusive) — ISO dates YYYY-MM-DD.
  earliestDate: v.string(),
  latestDate: v.string(),

  status: waitlistStatusValidator,
  joinedAt: v.number(),

  // Optional FIFO tiebreaker : earlier requestId/requestId sort at front.
  requestId: v.optional(v.id("requests")),

  // If offered: transient state
  offeredAppointmentId: v.optional(v.id("appointments")),
  offeredAt: v.optional(v.number()),
  offerExpiresAt: v.optional(v.number()),

  // Terminal states
  claimedAt: v.optional(v.number()),
  cancelledAt: v.optional(v.number()),
  expiredAt: v.optional(v.number()),

  notes: v.optional(v.string()),
})
  .index("by_org_service_status", ["orgId", "orgServiceId", "status"])
  .index("by_attendee_status", ["attendeeProfileId", "status"])
  .index("by_status_offerExpiresAt", ["status", "offerExpiresAt"]);
