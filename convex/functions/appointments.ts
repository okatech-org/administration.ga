import { v } from "convex/values";
import { authQuery } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";

/**
 * Legacy-shaped queries preserved for existing frontend consumers.
 * Mutations were consolidated into `slots.ts` (confirmAppointment, cancelAppointment,
 * completeAppointment, markNoShow) — call those instead.
 */

export const listByUser = authQuery({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .collect();

    if (profiles.length === 0) return [];

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
