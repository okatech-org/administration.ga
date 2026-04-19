import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Appointment status enum values
 */
export const AppointmentStatus = {
  Pending: "pending",
  Confirmed: "confirmed",
  Cancelled: "cancelled",
  Completed: "completed",
  NoShow: "no_show",
  Rescheduled: "rescheduled",
} as const;

export const appointmentStatusValidator = v.union(
  v.literal(AppointmentStatus.Pending),
  v.literal(AppointmentStatus.Confirmed),
  v.literal(AppointmentStatus.Cancelled),
  v.literal(AppointmentStatus.Completed),
  v.literal(AppointmentStatus.NoShow),
  v.literal(AppointmentStatus.Rescheduled)
);

/**
 * Appointment type: deposit (dépôt) or pickup (retrait)
 */
export const appointmentTypeValidator = v.union(
  v.literal("deposit"),
  v.literal("pickup"),
);

/**
 * Appointment mode: in-person, remote (video), phone
 */
export const AppointmentMode = {
  InPerson: "in_person",
  Remote: "remote",
  Phone: "phone",
} as const;

export const appointmentModeValidator = v.union(
  v.literal(AppointmentMode.InPerson),
  v.literal(AppointmentMode.Remote),
  v.literal(AppointmentMode.Phone),
);

/**
 * Channel of creation for manual agent bookings
 */
export const appointmentChannelValidator = v.union(
  v.literal("citizen_web"),
  v.literal("walk_in"),
  v.literal("phone_call"),
  v.literal("admin"),
);

/**
 * Appointment — A booked appointment
 * Dynamic: no pre-generated slots, computed on-the-fly.
 */
export const appointmentsTable = defineTable({
  // Link to the request that triggered this appointment
  requestId: v.optional(v.id("requests")),
  
  // Attendee (citizen) — references profiles table
  attendeeProfileId: v.id("profiles"),
  
  // Organization
  orgId: v.id("orgs"),
  
  // Agent handling this appointment (membership in the org)
  agentId: v.optional(v.id("memberships")),

  // Service this appointment is for
  orgServiceId: v.optional(v.id("orgServices")),
  
  // Appointment type: deposit or pickup
  appointmentType: v.optional(appointmentTypeValidator),
  
  // Time fields
  date: v.string(), // YYYY-MM-DD
  time: v.string(), // HH:mm (start time)
  endTime: v.optional(v.string()), // HH:mm (end time)
  durationMinutes: v.optional(v.number()),
  
  // Status
  status: appointmentStatusValidator,
  
  // Mode (in-person / remote video / phone)
  mode: v.optional(appointmentModeValidator),
  livekitRoomName: v.optional(v.string()),
  remoteJoinUrl: v.optional(v.string()),

  // Reschedule lineage — when an appointment is rescheduled, the old one is
  // marked "rescheduled" and a new row is inserted linked via rescheduledFromId.
  rescheduledFromId: v.optional(v.id("appointments")),
  rescheduledToId: v.optional(v.id("appointments")),
  rescheduleCount: v.optional(v.number()),
  rescheduleReason: v.optional(v.string()),

  // Agent-created appointments (walk-in / phone) — distinguish creation channel
  createdByAgentId: v.optional(v.id("memberships")),
  creationChannel: v.optional(appointmentChannelValidator),

  // Timestamps
  confirmedAt: v.optional(v.number()),
  cancelledAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  reminderSentAt: v.optional(v.number()),
  hourlyReminderSentAt: v.optional(v.number()),

  // Notes
  notes: v.optional(v.string()),
  cancellationReason: v.optional(v.string()),
})
  .index("by_attendee", ["attendeeProfileId"])
  .index("by_org_date", ["orgId", "date"])
  .index("by_org_date_status", ["orgId", "date", "status"])
  .index("by_org_status_date", ["orgId", "status", "date"])
  .index("by_request", ["requestId"])
  .index("by_attendee_status", ["attendeeProfileId", "status"])
  .index("by_agent_date", ["agentId", "date"])
  .index("by_rescheduledFromId", ["rescheduledFromId"]);
