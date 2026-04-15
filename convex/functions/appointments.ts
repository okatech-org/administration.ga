import { v } from "convex/values";
import { authQuery, authMutation } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";
import { AppointmentStatus } from "../schemas/appointments";
import { logCortexAction } from "../lib/neocortex";
import { SIGNAL_TYPES, CATEGORIES_ACTION } from "../lib/types";

/**
 * List appointments for current user (citizen dashboard).
 * Queries the real appointments table via their profile.
 */
export const listByUser = authQuery({
  args: {},
  handler: async (ctx) => {
    // Get the user's profiles
    const profiles = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .collect();

    if (profiles.length === 0) return [];

    // Get appointments for all profiles
    const allAppointments = await Promise.all(
      profiles.map((profile) =>
        ctx.db
          .query("appointments")
          .withIndex("by_attendee", (q) =>
            q.eq("attendeeProfileId", profile._id),
          )
          .collect(),
      ),
    );

    const appointments = allAppointments.flat();

    // Enrich with service and org info
    return Promise.all(
      appointments.map(async (apt) => {
        const [org, orgService] = await Promise.all([
          ctx.db.get(apt.orgId),
          apt.orgServiceId ? ctx.db.get(apt.orgServiceId) : null,
        ]);
        const service = orgService
          ? await ctx.db.get(orgService.serviceId)
          : null;

        return {
          _id: apt._id,
          date: apt.date,
          time: apt.time,
          endTime: apt.endTime,
          status: apt.status,
          appointmentType: apt.appointmentType,
          notes: apt.notes || "",
          service: service
            ? { name: typeof service.name === "object" ? service.name.fr : service.name }
            : null,
          org: org ? { name: org.name, _id: org._id, address: org.address } : null,
          requestId: apt.requestId,
        };
      }),
    );
  },
});

/**
 * List appointments for an organization (admin dashboard).
 * Queries the real appointments table.
 */
export const listByOrg = authQuery({
  args: {
    orgId: v.id("orgs"),
    date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "appointments.view");

    let appointments;
    if (args.date) {
      appointments = await ctx.db
        .query("appointments")
        .withIndex("by_org_date", (q) =>
          q.eq("orgId", args.orgId).eq("date", args.date!),
        )
        .collect();
    } else {
      appointments = await ctx.db
        .query("appointments")
        .withIndex("by_org_date", (q) => q.eq("orgId", args.orgId))
        .take(200);
    }

    // Enrich with user info
    return Promise.all(
      appointments.map(async (apt) => {
        const profile = await ctx.db.get(apt.attendeeProfileId);
        const user = profile ? await ctx.db.get(profile.userId) : null;

        return {
          _id: apt._id,
          date: apt.date,
          time: apt.time,
          endTime: apt.endTime,
          status: apt.status,
          appointmentType: apt.appointmentType,
          notes: apt.notes,
          requestId: apt.requestId,
          user: user
            ? {
                firstName: user.firstName || user.name?.split(" ")[0],
                lastName:
                  user.lastName || user.name?.split(" ").slice(1).join(" "),
                email: user.email,
                avatarUrl: user.avatarUrl,
              }
            : null,
        };
      }),
    );
  },
});

/**
 * Get appointment by ID
 */
export const getById = authQuery({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) return null;

    const membership = await getMembership(
      ctx,
      ctx.user._id,
      appointment.orgId,
    );
    await assertCanDoTask(ctx, ctx.user, membership, "appointments.view");

    const [profile, org, orgService] = await Promise.all([
      ctx.db.get(appointment.attendeeProfileId),
      ctx.db.get(appointment.orgId),
      appointment.orgServiceId
        ? ctx.db.get(appointment.orgServiceId)
        : null,
    ]);
    const user = profile ? await ctx.db.get(profile.userId) : null;
    const service = orgService
      ? await ctx.db.get(orgService.serviceId)
      : null;

    return {
      ...appointment,
      user: user
        ? {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            avatarUrl: user.avatarUrl,
          }
        : null,
      service: service
        ? { name: typeof service.name === "object" ? service.name.fr : service.name }
        : null,
      org,
    };
  },
});

/**
 * Confirm an appointment
 */
export const confirm = authMutation({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw error(ErrorCode.REQUEST_NOT_FOUND);
    const membership = await getMembership(
      ctx,
      ctx.user._id,
      appointment.orgId,
    );
    await assertCanDoTask(ctx, ctx.user, membership, "appointments.manage");

    await ctx.db.patch(args.appointmentId, {
      status: AppointmentStatus.Confirmed,
      confirmedAt: Date.now(),
    });

    // NEOCORTEX: Signal RDV confirmé
    await logCortexAction(ctx, {
      action: "CONFIRM_APPOINTMENT",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "appointments",
      entiteId: args.appointmentId,
      userId: ctx.user._id,
      apres: { status: "confirmed" },
      signalType: SIGNAL_TYPES.RDV_CONFIRME,
    });

    return true;
  },
});

/**
 * Cancel an appointment
 */
export const cancel = authMutation({
  args: {
    appointmentId: v.id("appointments"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw error(ErrorCode.REQUEST_NOT_FOUND);
    const membership = await getMembership(
      ctx,
      ctx.user._id,
      appointment.orgId,
    );
    await assertCanDoTask(ctx, ctx.user, membership, "appointments.manage");

    await ctx.db.patch(args.appointmentId, {
      status: AppointmentStatus.Cancelled,
      cancelledAt: Date.now(),
      cancellationReason: args.reason,
    });

    // NEOCORTEX: Signal RDV annulé
    await logCortexAction(ctx, {
      action: "CANCEL_APPOINTMENT",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "appointments",
      entiteId: args.appointmentId,
      userId: ctx.user._id,
      apres: { status: "cancelled" },
      signalType: SIGNAL_TYPES.RDV_ANNULE,
    });

    return true;
  },
});

/**
 * Mark appointment as completed
 */
export const complete = authMutation({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw error(ErrorCode.REQUEST_NOT_FOUND);
    const membership = await getMembership(
      ctx,
      ctx.user._id,
      appointment.orgId,
    );
    await assertCanDoTask(ctx, ctx.user, membership, "appointments.manage");

    await ctx.db.patch(args.appointmentId, {
      status: AppointmentStatus.Completed,
      completedAt: Date.now(),
    });

    // NEOCORTEX: Signal RDV complété
    await logCortexAction(ctx, {
      action: "COMPLETE_APPOINTMENT",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "appointments",
      entiteId: args.appointmentId,
      userId: ctx.user._id,
      apres: { status: "completed" },
      signalType: SIGNAL_TYPES.RDV_COMPLETE,
    });

    return true;
  },
});

/**
 * Mark appointment as no-show
 */
export const markNoShow = authMutation({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw error(ErrorCode.REQUEST_NOT_FOUND);
    const membership = await getMembership(
      ctx,
      ctx.user._id,
      appointment.orgId,
    );
    await assertCanDoTask(ctx, ctx.user, membership, "appointments.manage");

    await ctx.db.patch(args.appointmentId, {
      status: AppointmentStatus.NoShow,
    });

    // NEOCORTEX: Signal no-show
    await logCortexAction(ctx, {
      action: "MARK_NO_SHOW",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "appointments",
      entiteId: args.appointmentId,
      userId: ctx.user._id,
      apres: { status: "no_show" },
      signalType: SIGNAL_TYPES.RDV_NO_SHOW,
      priorite: "HIGH",
    });

    return true;
  },
});
