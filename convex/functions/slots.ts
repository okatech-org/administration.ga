import { v } from "convex/values";
import { authQuery, authMutation } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";
import { getOrgSchedule } from "../lib/orgHelpers";
import { AppointmentStatus, appointmentStatusValidator } from "../schemas/appointments";

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

    const _breakMins = type === "pickup"
      ? (orgService.pickupAppointmentBreakMinutes ?? orgService.appointmentBreakMinutes ?? 0)
      : (orgService.appointmentBreakMinutes ?? 0);

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

    // 8. Create the appointment
    const appointmentId = await ctx.db.insert("appointments", {
      attendeeProfileId: profile._id,
      orgId: args.orgId,
      orgServiceId: args.orgServiceId,
      agentId: selectedAgent as any,
      appointmentType: type,
      date: args.date,
      time: args.startTime,
      endTime,
      durationMinutes: duration,
      status: AppointmentStatus.Confirmed,
      confirmedAt: now,
      requestId: args.requestId,
      notes: args.notes,
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
