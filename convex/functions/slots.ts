import { v } from "convex/values";
import { authQuery, authMutation } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask, canDoTask } from "../lib/permissions";
import { canSuperviseAgent } from "./management";
import { error, ErrorCode } from "../lib/errors";
import { getOrgSchedule } from "../lib/orgHelpers";
import {
  AppointmentStatus,
  AppointmentMode,
  appointmentStatusValidator,
  appointmentModeValidator,
  appointmentChannelValidator,
} from "../schemas/appointments";
import { logCortexAction } from "../lib/neocortex";
import { SIGNAL_TYPES, CATEGORIES_ACTION } from "../lib/types";
import { dispatchAppointmentNotification } from "../lib/appointmentNotify";
import {
  signAppointmentIcalToken,
} from "../lib/ical";
import { internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * ============================================================================
 * DYNAMIC SLOT COMPUTATION
 * ============================================================================
 */

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

const parseTimeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const minutesToTimeString = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

/**
 * Compute available appointment slots dynamically for a given date.
 * 
 * Algorithm:
 * 1. Get org opening hours for the requested day
 * 2. Get all active agent schedules for the org (filtered by orgService)
 * 3. Get slot duration from orgService config
 * 4. Intersect agent availability with org opening hours
 * 5. Generate slot grid and subtract existing bookings
 * 6. Return array of { startTime, endTime, availableCount }
 */
export const computeAvailableSlots = authQuery({
  args: {
    orgId: v.id("orgs"),
    orgServiceId: v.id("orgServices"),
    date: v.string(), // YYYY-MM-DD
    appointmentType: v.optional(v.union(v.literal("deposit"), v.literal("pickup"))),
  },
  handler: async (ctx, args) => {
    const type = args.appointmentType ?? "deposit";

    // 1. Get org & opening hours
    const org = await ctx.db.get(args.orgId);
    if (!org) throw error(ErrorCode.NOT_FOUND, "Organization not found");

    const dayOfWeek = new Date(args.date + "T00:00:00").getDay();
    const dayName = DAY_NAMES[dayOfWeek];

    // Phase E.4 — Utilisation du helper unifié (orgCalendar > openingHours fallback).
    const openingHours = (await getOrgSchedule(ctx, org)) as
      | Record<string, { open?: string; close?: string; closed?: boolean }>
      | undefined
      | null;
    if (!openingHours) return [];

    const dayHours = openingHours[dayName];
    if (!dayHours || dayHours.closed || !dayHours.open || !dayHours.close) {
      return [];
    }

    const orgOpenMinutes = parseTimeToMinutes(dayHours.open);
    const orgCloseMinutes = parseTimeToMinutes(dayHours.close);

    // 2. Get org service config for durations
    const orgService = await ctx.db.get(args.orgServiceId);
    if (!orgService) throw error(ErrorCode.SERVICE_NOT_FOUND);

    const duration = type === "pickup"
      ? (orgService.pickupAppointmentDurationMinutes ?? orgService.appointmentDurationMinutes ?? 15)
      : (orgService.appointmentDurationMinutes ?? 15);

    const breakMins = type === "pickup"
      ? (orgService.pickupAppointmentBreakMinutes ?? orgService.appointmentBreakMinutes ?? 0)
      : (orgService.appointmentBreakMinutes ?? 0);

    const capacity = orgService.appointmentCapacity ?? 1;

    // 3. Get all active agent schedules for this org (optionally scoped to service)
    const allSchedules = await ctx.db
      .query("agentSchedules")
      .withIndex("by_org_active", (q) => q.eq("orgId", args.orgId).eq("isActive", true))
      .take(50);

    // Filter schedules by orgServiceId (or those without a specific service scope)
    const relevantSchedules = allSchedules.filter(
      (s) => !s.orgServiceId || s.orgServiceId === args.orgServiceId
    );

    if (relevantSchedules.length === 0) return [];

    // 4. For each agent, compute their available time ranges for this date
    interface AgentTimeRange {
      agentId: string;
      start: number;
      end: number;
    }

    const agentRanges: AgentTimeRange[] = [];

    for (const schedule of relevantSchedules) {
      // Check exceptions first
      const exception = schedule.exceptions?.find((e) => e.date === args.date);
      if (exception && !exception.available) continue; // Day off

      // Get time ranges for this day
      const dayEntry = exception?.timeRanges
        ?? schedule.weeklySchedule.find((d) => d.day === dayName)?.timeRanges;

      if (!dayEntry || dayEntry.length === 0) continue;

      for (const range of dayEntry) {
        const rangeStart = Math.max(parseTimeToMinutes(range.start), orgOpenMinutes);
        const rangeEnd = Math.min(parseTimeToMinutes(range.end), orgCloseMinutes);
        if (rangeStart < rangeEnd) {
          agentRanges.push({
            agentId: schedule.agentId,
            start: rangeStart,
            end: rangeEnd,
          });
        }
      }
    }

    if (agentRanges.length === 0) return [];

    // 5. Generate all possible slot start times
    const allStarts = new Set<number>();
    for (const range of agentRanges) {
      let t = range.start;
      while (t + duration <= range.end) {
        allStarts.add(t);
        t += duration + breakMins;
      }
    }

    const sortedStarts = Array.from(allStarts).sort((a, b) => a - b);
    if (sortedStarts.length === 0) return [];

    // 6. Get existing bookings for this date + org
    const existingAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_org_date", (q) => q.eq("orgId", args.orgId).eq("date", args.date))
      .filter((q) => q.neq(q.field("status"), AppointmentStatus.Cancelled))
      .take(200);

    // Count bookings per slot start time per agent
    const bookingCounts = new Map<string, number>(); // "agentId|startMinutes" -> count
    for (const apt of existingAppointments) {
      const aptStart = parseTimeToMinutes(apt.time);
      if (apt.agentId) {
        const key = `${apt.agentId}|${aptStart}`;
        bookingCounts.set(key, (bookingCounts.get(key) ?? 0) + 1);
      }
    }

    // 7. For each slot, count how many agents are available (not fully booked)
    const slots: { startTime: string; endTime: string; availableCount: number }[] = [];

    for (const start of sortedStarts) {
      let available = 0;

      // Get agents that cover this slot
      const coveringAgents = new Set<string>();
      for (const range of agentRanges) {
        if (range.start <= start && start + duration <= range.end) {
          coveringAgents.add(range.agentId);
        }
      }

      for (const agentId of coveringAgents) {
        const key = `${agentId}|${start}`;
        const booked = bookingCounts.get(key) ?? 0;
        if (booked < capacity) {
          available += (capacity - booked);
        }
      }

      if (available > 0) {
        slots.push({
          startTime: minutesToTimeString(start),
          endTime: minutesToTimeString(start + duration),
          availableCount: available,
        });
      }
    }

    return slots;
  },
});

/**
 * Compute which dates in a month have at least one available slot.
 * Used by the frontend calendar to highlight bookable days.
 */
export const computeAvailableDates = authQuery({
  args: {
    orgId: v.id("orgs"),
    orgServiceId: v.id("orgServices"),
    month: v.string(), // YYYY-MM
    appointmentType: v.optional(v.union(v.literal("deposit"), v.literal("pickup"))),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (!org) return [];

    // Phase E.4 — Utilisation du helper unifié (orgCalendar > openingHours fallback).
    const openingHours = (await getOrgSchedule(ctx, org)) as
      | Record<string, { open?: string; close?: string; closed?: boolean }>
      | undefined
      | null;
    if (!openingHours) return [];

    // Get org service config
    const orgService = await ctx.db.get(args.orgServiceId);
    if (!orgService) return [];

    // Get active agent schedules
    const schedules = await ctx.db
      .query("agentSchedules")
      .withIndex("by_org_active", (q) => q.eq("orgId", args.orgId).eq("isActive", true))
      .take(50);

    const relevantSchedules = schedules.filter(
      (s) => !s.orgServiceId || s.orgServiceId === args.orgServiceId
    );

    if (relevantSchedules.length === 0) return [];

    const [yearStr, monthStr] = args.month.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date().toISOString().split("T")[0];

    const availableDates: string[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

      // Skip past dates
      if (dateStr < today) continue;

      const dayOfWeek = new Date(dateStr + "T00:00:00").getDay();
      const dayName = DAY_NAMES[dayOfWeek];

      // Check org is open
      const dayHours = openingHours[dayName];
      if (!dayHours || dayHours.closed || !dayHours.open || !dayHours.close) continue;

      // Check at least one agent is available
      let hasAgent = false;
      for (const schedule of relevantSchedules) {
        const exception = schedule.exceptions?.find((e) => e.date === dateStr);
        if (exception && !exception.available) continue;

        const dayEntry = exception?.timeRanges
          ?? schedule.weeklySchedule.find((de) => de.day === dayName)?.timeRanges;

        if (dayEntry && dayEntry.length > 0) {
          hasAgent = true;
          break;
        }
      }

      if (hasAgent) {
        availableDates.push(dateStr);
      }
    }

    return availableDates;
  },
});

/**
 * ============================================================================
 * APPOINTMENT BOOKING
 * ============================================================================
 */

/**
 * Book an appointment dynamically (no pre-generated slot needed).
 * Verifies availability in real time, auto-assigns an available agent.
 */
export const bookDynamicAppointment = authMutation({
  args: {
    orgId: v.id("orgs"),
    orgServiceId: v.id("orgServices"),
    date: v.string(), // YYYY-MM-DD
    startTime: v.string(), // HH:mm
    appointmentType: v.optional(v.union(v.literal("deposit"), v.literal("pickup"))),
    requestId: v.optional(v.id("requests")),
    notes: v.optional(v.string()),
    mode: v.optional(appointmentModeValidator),
  },
  handler: async (ctx, args) => {
    const type = args.appointmentType ?? "deposit";
    const now = Date.now();

    // 1. Get org service config
    const orgService = await ctx.db.get(args.orgServiceId);
    if (!orgService) throw error(ErrorCode.SERVICE_NOT_FOUND);

    const duration = type === "pickup"
      ? (orgService.pickupAppointmentDurationMinutes ?? orgService.appointmentDurationMinutes ?? 15)
      : (orgService.appointmentDurationMinutes ?? 15);

    const capacity = orgService.appointmentCapacity ?? 1;

    const requestedStart = parseTimeToMinutes(args.startTime);
    const endTime = minutesToTimeString(requestedStart + duration);

    // 2. Get org opening hours to validate
    const org = await ctx.db.get(args.orgId);
    if (!org) throw error(ErrorCode.NOT_FOUND);

    const dayOfWeek = new Date(args.date + "T00:00:00").getDay();
    const dayName = DAY_NAMES[dayOfWeek];

    // Phase E.4 — Utilisation du helper unifié (orgCalendar > openingHours fallback).
    const openingHours = (await getOrgSchedule(ctx, org)) as
      | Record<string, { open?: string; close?: string; closed?: boolean }>
      | undefined
      | null;
    const dayHours = openingHours?.[dayName];
    if (!dayHours || dayHours.closed || !dayHours.open || !dayHours.close) {
      throw error(ErrorCode.SLOT_NOT_AVAILABLE, "Organization is closed on this day");
    }

    const orgOpenMinutes = parseTimeToMinutes(dayHours.open);
    const orgCloseMinutes = parseTimeToMinutes(dayHours.close);

    if (requestedStart < orgOpenMinutes || requestedStart + duration > orgCloseMinutes) {
      throw error(ErrorCode.SLOT_NOT_AVAILABLE, "Requested time is outside opening hours");
    }

    // 3. Get active agent schedules
    const allSchedules = await ctx.db
      .query("agentSchedules")
      .withIndex("by_org_active", (q) => q.eq("orgId", args.orgId).eq("isActive", true))
      .take(50);

    const relevantSchedules = allSchedules.filter(
      (s) => !s.orgServiceId || s.orgServiceId === args.orgServiceId
    );

    // 4. Find agents available at this time
    const availableAgents: string[] = [];

    for (const schedule of relevantSchedules) {
      const exception = schedule.exceptions?.find((e) => e.date === args.date);
      if (exception && !exception.available) continue;

      const dayEntry = exception?.timeRanges
        ?? schedule.weeklySchedule.find((d) => d.day === dayName)?.timeRanges;

      if (!dayEntry) continue;

      // Check if any time range covers the requested slot
      const covers = dayEntry.some((range) => {
        const rangeStart = Math.max(parseTimeToMinutes(range.start), orgOpenMinutes);
        const rangeEnd = Math.min(parseTimeToMinutes(range.end), orgCloseMinutes);
        return rangeStart <= requestedStart && requestedStart + duration <= rangeEnd;
      });

      if (covers) {
        availableAgents.push(schedule.agentId);
      }
    }

    if (availableAgents.length === 0) {
      throw error(ErrorCode.SLOT_NOT_AVAILABLE, "No agent available at this time");
    }

    // 5. Get existing bookings to find the least-booked agent
    const existingAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_org_date", (q) => q.eq("orgId", args.orgId).eq("date", args.date))
      .filter((q) => q.neq(q.field("status"), AppointmentStatus.Cancelled))
      .take(200);

    // Select agent with fewest bookings at this time
    let selectedAgent: string | null = null;
    let minBookings = Infinity;

    for (const agentId of availableAgents) {
      const agentBookings = existingAppointments.filter(
        (a) => a.agentId === agentId && a.time === args.startTime
      ).length;

      if (agentBookings < capacity && agentBookings < minBookings) {
        minBookings = agentBookings;
        selectedAgent = agentId;
      }
    }

    if (!selectedAgent) {
      throw error(ErrorCode.SLOT_FULLY_BOOKED, "All agents are fully booked at this time");
    }

    // 6. Get attendee profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();

    if (!profile) {
      throw error(ErrorCode.NOT_FOUND, "Profile not found. Please complete your profile first.");
    }

    // 7. Check no duplicate booking
    const existingForUser = existingAppointments.find(
      (a) =>
        a.attendeeProfileId === profile._id &&
        a.time === args.startTime &&
        a.status !== AppointmentStatus.Cancelled
    );

    if (existingForUser) {
      throw error(ErrorCode.APPOINTMENT_ALREADY_EXISTS, "You already have an appointment at this time");
    }

    // 8. Determine initial status based on service config
    const requireValidation = orgService.requireAgentValidation ?? false;
    const initialStatus = requireValidation
      ? AppointmentStatus.Pending
      : AppointmentStatus.Confirmed;

    // Resolve appointment mode (defaults to in_person if not specified)
    const allowedModes = orgService.allowedAppointmentModes ?? ["in_person"];
    const requestedMode = args.mode ?? AppointmentMode.InPerson;
    if (!allowedModes.includes(requestedMode)) {
      throw error(
        ErrorCode.SLOT_NOT_AVAILABLE,
        "This appointment mode is not allowed for this service",
      );
    }

    // 9. Create the appointment
    const appointmentId = await ctx.db.insert("appointments", {
      attendeeProfileId: profile._id,
      orgId: args.orgId,
      orgServiceId: args.orgServiceId,
      agentId: selectedAgent as any,
      appointmentType: type,
      mode: requestedMode,
      date: args.date,
      time: args.startTime,
      endTime,
      durationMinutes: duration,
      status: initialStatus,
      confirmedAt: requireValidation ? undefined : now,
      requestId: args.requestId,
      notes: args.notes,
      creationChannel: "citizen_web",
      rescheduleCount: 0,
    });

    // NEOCORTEX: Signal RDV créé (non bloquant)
    await logCortexAction(ctx, {
      action: "BOOK_APPOINTMENT",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "appointments",
      entiteId: appointmentId,
      userId: ctx.user._id,
      apres: { status: initialStatus, date: args.date, time: args.startTime },
      signalType: SIGNAL_TYPES.RDV_CREE,
    });

    await dispatchAppointmentNotification(ctx, {
      appointmentId,
      event: "created",
    });

    return appointmentId;
  },
});

/**
 * ============================================================================
 * APPOINTMENT MANAGEMENT
 * ============================================================================
 */

/**
 * Confirm an appointment (agent only) — transitions Pending → Confirmed.
 * Idempotent: already-confirmed appointments are a no-op.
 */
export const confirmAppointment = authMutation({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw error(ErrorCode.NOT_FOUND);

    const membership = await getMembership(ctx, ctx.user._id, appointment.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "appointments.manage");

    if (appointment.status === AppointmentStatus.Confirmed) {
      return args.appointmentId;
    }
    if (
      appointment.status !== AppointmentStatus.Pending &&
      appointment.status !== AppointmentStatus.Rescheduled
    ) {
      throw error(
        ErrorCode.INVALID_STATE_TRANSITION,
        `Cannot confirm appointment in status "${appointment.status}"`,
      );
    }

    await ctx.db.patch(args.appointmentId, {
      status: AppointmentStatus.Confirmed,
      confirmedAt: Date.now(),
    });

    await logCortexAction(ctx, {
      action: "CONFIRM_APPOINTMENT",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "appointments",
      entiteId: args.appointmentId,
      userId: ctx.user._id,
      apres: { status: AppointmentStatus.Confirmed },
      signalType: SIGNAL_TYPES.RDV_CONFIRME,
    });

    await dispatchAppointmentNotification(ctx, {
      appointmentId: args.appointmentId,
      event: "confirmed",
    });

    return args.appointmentId;
  },
});

/**
 * Internal helper: validate that a given slot is available for booking at the
 * chosen (date, startTime) for the specified service, and return the selected
 * agent + derived end time + duration. Shared by bookDynamicAppointment,
 * bookByAgent and rescheduleAppointment.
 *
 * Throws a Convex error if the slot is unavailable.
 */
async function resolveSlotForBooking(
  ctx: any,
  args: {
    orgId: any;
    orgServiceId: any;
    date: string;
    startTime: string;
    appointmentType: "deposit" | "pickup";
    preferredAgentId?: string;
    excludeAppointmentId?: any;
  },
): Promise<{
  selectedAgent: string;
  endTime: string;
  duration: number;
  capacity: number;
  orgService: any;
}> {
  const orgService = await ctx.db.get(args.orgServiceId);
  if (!orgService) throw error(ErrorCode.SERVICE_NOT_FOUND);

  const duration = args.appointmentType === "pickup"
    ? (orgService.pickupAppointmentDurationMinutes ?? orgService.appointmentDurationMinutes ?? 15)
    : (orgService.appointmentDurationMinutes ?? 15);
  const capacity = orgService.appointmentCapacity ?? 1;

  const requestedStart = parseTimeToMinutes(args.startTime);
  const endTime = minutesToTimeString(requestedStart + duration);

  const org = await ctx.db.get(args.orgId);
  if (!org) throw error(ErrorCode.NOT_FOUND);

  const dayOfWeek = new Date(args.date + "T00:00:00").getDay();
  const dayName = DAY_NAMES[dayOfWeek];

  const openingHours = (await getOrgSchedule(ctx, org)) as
    | Record<string, { open?: string; close?: string; closed?: boolean }>
    | undefined
    | null;
  const dayHours = openingHours?.[dayName];
  if (!dayHours || dayHours.closed || !dayHours.open || !dayHours.close) {
    throw error(ErrorCode.SLOT_NOT_AVAILABLE, "Organization is closed on this day");
  }

  const orgOpenMinutes = parseTimeToMinutes(dayHours.open);
  const orgCloseMinutes = parseTimeToMinutes(dayHours.close);
  if (requestedStart < orgOpenMinutes || requestedStart + duration > orgCloseMinutes) {
    throw error(ErrorCode.SLOT_NOT_AVAILABLE, "Requested time is outside opening hours");
  }

  const allSchedules = await ctx.db
    .query("agentSchedules")
    .withIndex("by_org_active", (q: any) => q.eq("orgId", args.orgId).eq("isActive", true))
    .take(50);
  const relevantSchedules = allSchedules.filter(
    (s: any) => !s.orgServiceId || s.orgServiceId === args.orgServiceId,
  );

  const availableAgents: string[] = [];
  for (const schedule of relevantSchedules) {
    const exception = schedule.exceptions?.find((e: any) => e.date === args.date);
    if (exception && !exception.available) continue;
    const dayEntry = exception?.timeRanges
      ?? schedule.weeklySchedule.find((d: any) => d.day === dayName)?.timeRanges;
    if (!dayEntry) continue;
    const covers = dayEntry.some((range: any) => {
      const rangeStart = Math.max(parseTimeToMinutes(range.start), orgOpenMinutes);
      const rangeEnd = Math.min(parseTimeToMinutes(range.end), orgCloseMinutes);
      return rangeStart <= requestedStart && requestedStart + duration <= rangeEnd;
    });
    if (covers) availableAgents.push(schedule.agentId);
  }
  if (availableAgents.length === 0) {
    throw error(ErrorCode.SLOT_NOT_AVAILABLE, "No agent available at this time");
  }

  const existingAppointments = await ctx.db
    .query("appointments")
    .withIndex("by_org_date", (q: any) => q.eq("orgId", args.orgId).eq("date", args.date))
    .filter((q: any) => q.neq(q.field("status"), AppointmentStatus.Cancelled))
    .take(200);

  // Least-booked agent selection, preferring the requested agent if passed.
  let selectedAgent: string | null = null;
  let minBookings = Infinity;

  const candidates = args.preferredAgentId && availableAgents.includes(args.preferredAgentId)
    ? [args.preferredAgentId, ...availableAgents.filter((a) => a !== args.preferredAgentId)]
    : availableAgents;

  for (const agentId of candidates) {
    const agentBookings = existingAppointments.filter(
      (a: any) =>
        a.agentId === agentId &&
        a.time === args.startTime &&
        a._id !== args.excludeAppointmentId,
    ).length;
    if (agentBookings < capacity && agentBookings < minBookings) {
      minBookings = agentBookings;
      selectedAgent = agentId;
      if (args.preferredAgentId === agentId) break;
    }
  }
  if (!selectedAgent) {
    throw error(ErrorCode.SLOT_FULLY_BOOKED, "All agents are fully booked at this time");
  }

  return { selectedAgent, endTime, duration, capacity, orgService };
}

/**
 * Reschedule an appointment atomically: marks the original as "Rescheduled"
 * and inserts a new appointment linked via rescheduledFromId.
 *
 * Authorization: owner (citizen) or agent with appointments.manage.
 * Enforces cancellationPolicyHours from org calendar config when the caller is
 * the citizen owner (agents can override).
 */
export const rescheduleAppointment = authMutation({
  args: {
    appointmentId: v.id("appointments"),
    newDate: v.string(),
    newStartTime: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw error(ErrorCode.NOT_FOUND);

    if (
      appointment.status !== AppointmentStatus.Confirmed &&
      appointment.status !== AppointmentStatus.Pending
    ) {
      throw error(
        ErrorCode.INVALID_STATE_TRANSITION,
        `Cannot reschedule appointment in status "${appointment.status}"`,
      );
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();
    const isOwner = profile && appointment.attendeeProfileId === profile._id;

    let isAgent = false;
    if (!isOwner) {
      const membership = await getMembership(ctx, ctx.user._id, appointment.orgId);
      await assertCanDoTask(ctx, ctx.user, membership, "appointments.manage");
      isAgent = true;
    }

    // Enforce cancellation policy for citizen owners
    if (isOwner && !isAgent) {
      const orgCalendar = await ctx.db
        .query("orgCalendar")
        .withIndex("by_org", (q: any) => q.eq("orgId", appointment.orgId))
        .unique();
      const policyHours = orgCalendar?.appointmentConfig?.cancellationPolicyHours ?? 24;
      const aptTs = new Date(`${appointment.date}T${appointment.time}:00`).getTime();
      const msUntil = aptTs - Date.now();
      if (msUntil < policyHours * 3600 * 1000) {
        throw error(
          ErrorCode.APPOINTMENT_PAST_CANCELLATION_DEADLINE,
          `Rescheduling requires at least ${policyHours}h advance notice`,
        );
      }
    }

    // Resolve new slot (throws if unavailable)
    const { selectedAgent, endTime, duration } = await resolveSlotForBooking(ctx, {
      orgId: appointment.orgId,
      orgServiceId: appointment.orgServiceId!,
      date: args.newDate,
      startTime: args.newStartTime,
      appointmentType: appointment.appointmentType ?? "deposit",
      preferredAgentId: appointment.agentId,
      excludeAppointmentId: args.appointmentId,
    });

    const now = Date.now();
    const previousCount = appointment.rescheduleCount ?? 0;

    // Insert new appointment first so we can link back via rescheduledToId.
    const newAppointmentId = await ctx.db.insert("appointments", {
      attendeeProfileId: appointment.attendeeProfileId,
      orgId: appointment.orgId,
      orgServiceId: appointment.orgServiceId,
      agentId: selectedAgent as any,
      appointmentType: appointment.appointmentType,
      mode: appointment.mode,
      livekitRoomName: appointment.livekitRoomName,
      remoteJoinUrl: appointment.remoteJoinUrl,
      date: args.newDate,
      time: args.newStartTime,
      endTime,
      durationMinutes: duration,
      status: appointment.status, // Preserve Pending vs Confirmed
      confirmedAt: appointment.status === AppointmentStatus.Confirmed ? now : undefined,
      requestId: appointment.requestId,
      notes: appointment.notes,
      rescheduledFromId: args.appointmentId,
      rescheduleCount: previousCount + 1,
      rescheduleReason: args.reason,
      creationChannel: isAgent ? "admin" : "citizen_web",
      createdByAgentId: isAgent && !isOwner ? undefined : appointment.createdByAgentId,
    });

    // Link old → new and close it
    await ctx.db.patch(args.appointmentId, {
      status: AppointmentStatus.Rescheduled,
      rescheduledToId: newAppointmentId,
      rescheduleReason: args.reason ?? appointment.rescheduleReason,
    });

    await logCortexAction(ctx, {
      action: "RESCHEDULE_APPOINTMENT",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "appointments",
      entiteId: newAppointmentId,
      userId: ctx.user._id,
      avant: { date: appointment.date, time: appointment.time, status: appointment.status },
      apres: { date: args.newDate, time: args.newStartTime, rescheduledFromId: args.appointmentId },
      signalType: SIGNAL_TYPES.RDV_CREE,
    });

    await dispatchAppointmentNotification(ctx, {
      appointmentId: newAppointmentId,
      event: "rescheduled",
      reason: args.reason,
    });

    return newAppointmentId;
  },
});

/**
 * Book an appointment manually on behalf of a citizen (walk-in / phone call).
 * Agent-only. Skips the lead-time validation since the agent is acting in real
 * time. Always creates a Confirmed appointment.
 */
export const bookByAgent = authMutation({
  args: {
    orgId: v.id("orgs"),
    orgServiceId: v.id("orgServices"),
    attendeeProfileId: v.id("profiles"),
    date: v.string(),
    startTime: v.string(),
    appointmentType: v.optional(v.union(v.literal("deposit"), v.literal("pickup"))),
    mode: v.optional(appointmentModeValidator),
    channel: v.optional(appointmentChannelValidator),
    notes: v.optional(v.string()),
    requestId: v.optional(v.id("requests")),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "appointments.manage");
    if (!membership) throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);

    const profile = await ctx.db.get(args.attendeeProfileId);
    if (!profile) throw error(ErrorCode.PROFILE_NOT_FOUND);

    const type = args.appointmentType ?? "deposit";
    const { selectedAgent, endTime, duration, orgService } = await resolveSlotForBooking(ctx, {
      orgId: args.orgId,
      orgServiceId: args.orgServiceId,
      date: args.date,
      startTime: args.startTime,
      appointmentType: type,
    });

    const allowedModes = orgService.allowedAppointmentModes ?? ["in_person"];
    const requestedMode = args.mode ?? AppointmentMode.InPerson;
    if (!allowedModes.includes(requestedMode)) {
      throw error(
        ErrorCode.SLOT_NOT_AVAILABLE,
        "This appointment mode is not allowed for this service",
      );
    }

    const now = Date.now();
    const appointmentId = await ctx.db.insert("appointments", {
      attendeeProfileId: args.attendeeProfileId,
      orgId: args.orgId,
      orgServiceId: args.orgServiceId,
      agentId: selectedAgent as any,
      appointmentType: type,
      mode: requestedMode,
      date: args.date,
      time: args.startTime,
      endTime,
      durationMinutes: duration,
      status: AppointmentStatus.Confirmed,
      confirmedAt: now,
      requestId: args.requestId,
      notes: args.notes,
      createdByAgentId: membership._id,
      creationChannel: args.channel ?? "walk_in",
      rescheduleCount: 0,
    });

    await logCortexAction(ctx, {
      action: "BOOK_APPOINTMENT_BY_AGENT",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "appointments",
      entiteId: appointmentId,
      userId: ctx.user._id,
      apres: {
        attendeeProfileId: args.attendeeProfileId,
        date: args.date,
        time: args.startTime,
        channel: args.channel ?? "walk_in",
      },
      signalType: SIGNAL_TYPES.RDV_CREE,
    });

    await dispatchAppointmentNotification(ctx, {
      appointmentId,
      event: "confirmed",
    });

    return appointmentId;
  },
});

/**
 * Cancel an appointment (by citizen or agent)
 */
export const cancelAppointment = authMutation({
  args: {
    appointmentId: v.id("appointments"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) {
      throw error(ErrorCode.NOT_FOUND);
    }

    // Check authorization: attendee or org agent
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();

    const isOwner = profile && appointment.attendeeProfileId === profile._id;
    if (!isOwner) {
      const membership = await getMembership(ctx, ctx.user._id, appointment.orgId);
      await assertCanDoTask(ctx, ctx.user, membership, "appointments.manage");
    }

    if (appointment.status === AppointmentStatus.Cancelled) {
      throw error(ErrorCode.APPOINTMENT_ALREADY_CANCELLED);
    }

    await ctx.db.patch(args.appointmentId, {
      status: AppointmentStatus.Cancelled,
      cancelledAt: Date.now(),
      cancellationReason: args.reason,
    });

    await logCortexAction(ctx, {
      action: "CANCEL_APPOINTMENT",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "appointments",
      entiteId: args.appointmentId,
      userId: ctx.user._id,
      apres: { status: AppointmentStatus.Cancelled },
      signalType: SIGNAL_TYPES.RDV_ANNULE,
    });

    await dispatchAppointmentNotification(ctx, {
      appointmentId: args.appointmentId,
      event: "cancelled",
      reason: args.reason,
    });

    // Offer the freed slot to the waitlist (best-effort, non-blocking).
    if (appointment.orgServiceId) {
      await ctx.scheduler.runAfter(
        0,
        internal.functions.appointmentWaitlist.offerSlotToWaitlist,
        {
          orgId: appointment.orgId,
          orgServiceId: appointment.orgServiceId,
          date: appointment.date,
          freedAppointmentId: args.appointmentId,
        },
      );
    }

    return args.appointmentId;
  },
});

/**
 * Mark appointment as completed (agent only)
 */
export const completeAppointment = authMutation({
  args: {
    appointmentId: v.id("appointments"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) {
      throw error(ErrorCode.NOT_FOUND);
    }

    const membership = await getMembership(ctx, ctx.user._id, appointment.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "appointments.manage");

    await ctx.db.patch(args.appointmentId, {
      status: AppointmentStatus.Completed,
      completedAt: Date.now(),
      notes: args.notes ?? appointment.notes,
    });

    await logCortexAction(ctx, {
      action: "COMPLETE_APPOINTMENT",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "appointments",
      entiteId: args.appointmentId,
      userId: ctx.user._id,
      apres: { status: AppointmentStatus.Completed },
      signalType: SIGNAL_TYPES.RDV_COMPLETE,
    });

    await dispatchAppointmentNotification(ctx, {
      appointmentId: args.appointmentId,
      event: "completed",
    });

    return args.appointmentId;
  },
});

/**
 * Mark appointment as no-show (agent only)
 */
export const markNoShow = authMutation({
  args: {
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) {
      throw error(ErrorCode.NOT_FOUND);
    }

    const membership = await getMembership(ctx, ctx.user._id, appointment.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "appointments.manage");

    await ctx.db.patch(args.appointmentId, {
      status: AppointmentStatus.NoShow,
    });

    await logCortexAction(ctx, {
      action: "MARK_NO_SHOW",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "appointments",
      entiteId: args.appointmentId,
      userId: ctx.user._id,
      apres: { status: AppointmentStatus.NoShow },
      signalType: SIGNAL_TYPES.RDV_NO_SHOW,
      priorite: "HIGH",
    });

    await dispatchAppointmentNotification(ctx, {
      appointmentId: args.appointmentId,
      event: "noShow",
    });

    return args.appointmentId;
  },
});

/**
 * ============================================================================
 * APPOINTMENT QUERIES
 * ============================================================================
 */

/**
 * List appointments for the current user (citizen)
 */
export const listMyAppointments = authQuery({
  args: {
    status: v.optional(appointmentStatusValidator),
  },
  handler: async (ctx, args) => {
    // Find the user's profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();

    if (!profile) return [];

    let appointments;
    if (args.status) {
      appointments = await ctx.db
        .query("appointments")
        .withIndex("by_attendee_status", (q) => 
          q.eq("attendeeProfileId", profile._id).eq("status", args.status!)
        )
        .take(200);
    } else {
      appointments = await ctx.db
        .query("appointments")
        .withIndex("by_attendee", (q) => q.eq("attendeeProfileId", profile._id))
        .take(200);
    }

    // Enrich with org details
    const enriched = await Promise.all(
      appointments.map(async (apt) => {
        const org = await ctx.db.get(apt.orgId);
        return {
          ...apt,
          org,
        };
      })
    );

    return enriched;
  },
});

/**
 * List appointments by day for calendar view (agent)
 */
export const listByDay = authQuery({
  args: {
    orgId: v.id("orgs"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "appointments.view");

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_org_date", (q) => 
        q.eq("orgId", args.orgId).eq("date", args.date)
      )
      .take(200);

    // Enrich with attendee profile, service, and request details
    const enriched = await Promise.all(
      appointments.map(async (apt) => {
        const attendeeProfile = await ctx.db.get(apt.attendeeProfileId);
        
        // Get service name
        let service = null;
        if (apt.orgServiceId) {
          const orgSvc = await ctx.db.get(apt.orgServiceId);
          if (orgSvc) service = await ctx.db.get(orgSvc.serviceId);
        }

        // Get request details
        const request = apt.requestId ? await ctx.db.get(apt.requestId) : null;

        return {
          ...apt,
          attendee: attendeeProfile ? {
            userId: attendeeProfile.userId,
            firstName: attendeeProfile.identity?.firstName,
            lastName: attendeeProfile.identity?.lastName,
            email: attendeeProfile.contacts?.email,
          } : null,
          service: service ? { name: service.name } : null,
          request: request ? { _id: request._id, reference: request.reference, status: request.status } : null,
        };
      })
    );

    // Sort by time
    return enriched.sort((a, b) => a.time.localeCompare(b.time));
  },
});

/**
 * Get appointment by ID
 */
export const getAppointmentById = authQuery({
  args: {
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) return null;

    // Check access: attendee or agent
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();

    const isOwner = profile && appointment.attendeeProfileId === profile._id;
    if (!isOwner) {
      const membership = await getMembership(ctx, ctx.user._id, appointment.orgId);
      await assertCanDoTask(ctx, ctx.user, membership, "appointments.view");
    }

    const [attendeeProfile, org] = await Promise.all([
      ctx.db.get(appointment.attendeeProfileId),
      ctx.db.get(appointment.orgId),
    ]);

    let service = null;
    let orgService = null;
    if (appointment.orgServiceId) {
      orgService = await ctx.db.get(appointment.orgServiceId);
      if (orgService) service = await ctx.db.get(orgService.serviceId);
    }

    // Get request details
    const request = appointment.requestId ? await ctx.db.get(appointment.requestId) : null;

    return {
      ...appointment,
      attendee: attendeeProfile ? {
        userId: attendeeProfile.userId,
        firstName: attendeeProfile.identity?.firstName,
        lastName: attendeeProfile.identity?.lastName,
        email: attendeeProfile.contacts?.email,
      } : null,
      org,
      orgService,
      service,
      request: request ? { _id: request._id, reference: request.reference, status: request.status } : null,
    };
  },
});

/**
 * List all appointments for an organization (dashboard list view)
 */
export const listAppointmentsByOrg = authQuery({
  args: {
    orgId: v.id("orgs"),
    status: v.optional(appointmentStatusValidator),
    date: v.optional(v.string()),
    month: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "appointments.view");

    let appointments;

    if (args.date) {
      appointments = await ctx.db
        .query("appointments")
        .withIndex("by_org_date", (q) => q.eq("orgId", args.orgId).eq("date", args.date!))
        .take(200);
    } else if (args.month) {
      const startDate = `${args.month}-01`;
      const [year, month] = args.month.split("-").map(Number);
      const endDate = `${args.month}-${new Date(year, month, 0).getDate()}`;
      
      appointments = await ctx.db
        .query("appointments")
        .withIndex("by_org_date", (q) => q.eq("orgId", args.orgId))
        .filter((q) => 
          q.and(
            q.gte(q.field("date"), startDate),
            q.lte(q.field("date"), endDate)
          )
        )
        .take(100);
    } else {
      appointments = await ctx.db
        .query("appointments")
        .withIndex("by_org_date", (q) => q.eq("orgId", args.orgId))
        .order("desc")
        .take(200);
    }

    // Filter by status if specified
    if (args.status) {
      appointments = appointments.filter((apt) => apt.status === args.status);
    }

    // Enrich with attendee and request details
    const enriched = await Promise.all(
      appointments.map(async (apt) => {
        const [attendeeProfile, request] = await Promise.all([
          ctx.db.get(apt.attendeeProfileId),
          apt.requestId ? ctx.db.get(apt.requestId) : null,
        ]);
        
        let service = null;
        if (apt.orgServiceId) {
          const orgSvc = await ctx.db.get(apt.orgServiceId);
          if (orgSvc) service = await ctx.db.get(orgSvc.serviceId);
        }

        return {
          ...apt,
          attendee: attendeeProfile ? {
            userId: attendeeProfile.userId,
            firstName: attendeeProfile.identity?.firstName,
            lastName: attendeeProfile.identity?.lastName,
            email: attendeeProfile.contacts?.email,
          } : null,
          service: service ? { name: service.name } : null,
          request: request ? { _id: request._id, reference: request.reference, status: request.status } : null,
        };
      })
    );

    // Sort by date and time descending
    return enriched.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.time.localeCompare(a.time);
    });
  },
});

/**
 * List appointments in a date range, optimised for the printable schedule view.
 *
 * Permission model:
 *   - Caller must hold `appointments.view` on the org.
 *   - Without `agentId`, results are scoped to the caller's own membership
 *     (an agent prints their own schedule).
 *   - Passing an `agentId` other than the caller's requires either
 *     `appointments.manage` (manager) OR `team.supervise` when the target
 *     agent is in the caller's supervision scope (sub-tree by ministryGroup).
 *
 * Returns appointments enriched with attendee (firstName/lastName/email/phone),
 * service name, related request reference, agent display info, and notes —
 * everything needed for an agent to walk into the appointment prepared.
 *
 * Sorted by date+time ascending (chronological planning order).
 */
export const listAppointmentsForPrint = authQuery({
  args: {
    orgId: v.id("orgs"),
    from: v.string(), // YYYY-MM-DD inclusive
    to: v.string(),   // YYYY-MM-DD inclusive
    agentId: v.optional(v.id("memberships")),
    status: v.optional(appointmentStatusValidator),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "appointments.view");

    // Caller must specify an agent explicitly when they have no membership
    // in the org (superadmin scenario) — we can't infer "their own" planning.
    const callerAgentId = membership?._id ?? null;
    const targetAgentId = args.agentId ?? callerAgentId;
    if (!targetAgentId) {
      throw error(ErrorCode.VALIDATION_ERROR);
    }

    if (targetAgentId !== callerAgentId) {
      // Manager (appointments.manage) OU superviseur (team.supervise) avec
      // l'agent cible dans son sous-arbre.
      const canManage = await canDoTask(ctx, ctx.user, membership, "appointments.manage");
      if (!canManage) {
        const canSupervise = await canDoTask(ctx, ctx.user, membership, "team.supervise");
        const target = canSupervise ? await ctx.db.get(targetAgentId) : null;
        const allowed =
          canSupervise && target && (await canSuperviseAgent(ctx, membership, target));
        if (!allowed) {
          throw error(ErrorCode.FORBIDDEN);
        }
      }
    }

    let appointments = await ctx.db
      .query("appointments")
      .withIndex("by_agent_date", (q) =>
        q
          .eq("agentId", targetAgentId)
          .gte("date", args.from)
          .lte("date", args.to),
      )
      .take(500);

    // Defensive: ensure org match (agentId is unique per org but be safe).
    appointments = appointments.filter((apt) => apt.orgId === args.orgId);

    if (args.status) {
      appointments = appointments.filter((apt) => apt.status === args.status);
    }

    // Enrich with attendee, service, request, agent
    const agentUserCache = new Map<string, { firstName?: string; lastName?: string; email?: string }>();
    const enriched = await Promise.all(
      appointments.map(async (apt) => {
        const [attendeeProfile, request] = await Promise.all([
          ctx.db.get(apt.attendeeProfileId),
          apt.requestId ? ctx.db.get(apt.requestId) : null,
        ]);

        let service = null;
        if (apt.orgServiceId) {
          const orgSvc = await ctx.db.get(apt.orgServiceId);
          if (orgSvc) service = await ctx.db.get(orgSvc.serviceId);
        }

        let agent: { firstName?: string; lastName?: string; email?: string } | null = null;
        if (apt.agentId) {
          const cached = agentUserCache.get(apt.agentId);
          if (cached) {
            agent = cached;
          } else {
            const ms = await ctx.db.get(apt.agentId);
            if (ms) {
              const user = await ctx.db.get(ms.userId);
              if (user) {
                agent = {
                  firstName: user.firstName,
                  lastName: user.lastName,
                  email: user.email,
                };
                agentUserCache.set(apt.agentId, agent);
              }
            }
          }
        }

        return {
          ...apt,
          attendee: attendeeProfile
            ? {
                userId: attendeeProfile.userId,
                firstName: attendeeProfile.identity?.firstName,
                lastName: attendeeProfile.identity?.lastName,
                email: attendeeProfile.contacts?.email,
                phone: attendeeProfile.contacts?.phone,
              }
            : null,
          service: service ? { name: service.name } : null,
          request: request
            ? { _id: request._id, reference: request.reference, status: request.status }
            : null,
          agent,
        };
      }),
    );

    // Chronological order: date asc, then time asc.
    return enriched.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });
  },
});

/**
 * List the org's agents (memberships) for the print-page agent selector.
 * Gated on `appointments.manage` since only managers need to switch agents.
 */
export const listOrgAgentsForAppointments = authQuery({
  args: {
    orgId: v.id("orgs"),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "appointments.manage");

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const agents = await Promise.all(
      memberships.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return user
          ? {
              _id: m._id, // membership ID = agentId
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
            }
          : null;
      }),
    );

    return agents.filter((a): a is NonNullable<typeof a> => a !== null);
  },
});

/**
 * ============================================================================
 * iCal EXPORT
 * ============================================================================
 *
 * Generates a short-lived HMAC token so citizens can download an .ics file
 * for their appointment without exposing their session cookie to calendar
 * clients (Apple Calendar / Google / Outlook).
 */

export const createIcalToken = authQuery({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw error(ErrorCode.NOT_FOUND);

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();
    const isOwner = profile && appointment.attendeeProfileId === profile._id;
    if (!isOwner) {
      const membership = await getMembership(ctx, ctx.user._id, appointment.orgId);
      await assertCanDoTask(ctx, ctx.user, membership, "appointments.view");
    }

    // 30-day token — long enough for a user to re-subscribe the .ics periodically.
    const expiresAt = Date.now() + 30 * 24 * 3600 * 1000;
    const token = await signAppointmentIcalToken(args.appointmentId, expiresAt);
    const base = process.env.CONVEX_SITE_URL ?? "";
    return { token, url: `${base}/ical/appointment/${args.appointmentId}.ics?token=${token}` };
  },
});

/**
 * Internal query used by the HTTP route to load the appointment data after
 * verifying the token. Does not require an authenticated session.
 */
export const getAppointmentForIcal = internalQuery({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) return null;
    const org = await ctx.db.get(appointment.orgId);
    const orgService = appointment.orgServiceId
      ? await ctx.db.get(appointment.orgServiceId)
      : null;
    const service = orgService ? await ctx.db.get(orgService.serviceId) : null;

    return {
      appointment,
      org,
      serviceName:
        service?.name
          ? typeof service.name === "object"
            ? service.name.fr
            : service.name
          : null,
    };
  },
});

/**
 * Internal query: verify the caller is the appointment attendee and return
 * the info needed to issue a LiveKit join token.
 */
export const getAppointmentForJoinToken = internalQuery({
  args: {
    appointmentId: v.id("appointments"),
    authSubject: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_authId", (q: any) => q.eq("authId", args.authSubject))
      .unique();
    if (!user) return null;

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) return null;
    const profile = await ctx.db.get(appointment.attendeeProfileId);
    if (!profile) return null;
    if (String(profile.userId) !== String(user._id)) return null;

    return {
      appointmentId: appointment._id,
      attendeeUserId: profile.userId,
      attendeeName: user.name ?? "Participant",
      date: appointment.date,
      time: appointment.time,
      endTime: appointment.endTime,
      mode: appointment.mode,
      status: appointment.status,
      livekitRoomName: appointment.livekitRoomName,
    };
  },
});

