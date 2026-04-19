import { v } from "convex/values";
import { authQuery, authMutation } from "../lib/customFunctions";
import { internalMutation } from "../_generated/server";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";
import { WaitlistStatus } from "../schemas/appointmentWaitlist";
import { appointmentTypeValidator } from "../schemas/appointments";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

const OFFER_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Citizen joins the waitlist for a specific org+service. Duplicates (same
 * active entry) are rejected.
 */
export const joinWaitlist = authMutation({
  args: {
    orgId: v.id("orgs"),
    orgServiceId: v.id("orgServices"),
    appointmentType: v.optional(appointmentTypeValidator),
    earliestDate: v.string(),
    latestDate: v.string(),
    requestId: v.optional(v.id("requests")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();
    if (!profile) throw error(ErrorCode.NOT_FOUND);

    if (args.earliestDate > args.latestDate) {
      throw error(ErrorCode.INVALID_ARGUMENT);
    }

    // Deny duplicates while still active
    const existing = await ctx.db
      .query("appointmentWaitlist")
      .withIndex("by_attendee_status", (q) =>
        q.eq("attendeeProfileId", profile._id).eq("status", WaitlistStatus.Waiting),
      )
      .collect();
    const dupe = existing.find(
      (e) =>
        String(e.orgId) === String(args.orgId) &&
        String(e.orgServiceId) === String(args.orgServiceId),
    );
    if (dupe) return dupe._id;

    const id = await ctx.db.insert("appointmentWaitlist", {
      orgId: args.orgId,
      orgServiceId: args.orgServiceId,
      attendeeProfileId: profile._id,
      appointmentType: args.appointmentType,
      earliestDate: args.earliestDate,
      latestDate: args.latestDate,
      status: WaitlistStatus.Waiting,
      joinedAt: Date.now(),
      requestId: args.requestId,
      notes: args.notes,
    });
    return id;
  },
});

/**
 * Citizen leaves the waitlist (or cancels their pending offer).
 */
export const leaveWaitlist = authMutation({
  args: { entryId: v.id("appointmentWaitlist") },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) throw error(ErrorCode.NOT_FOUND);

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();
    const isOwner = profile && String(entry.attendeeProfileId) === String(profile._id);
    if (!isOwner) {
      const membership = await getMembership(ctx, ctx.user._id, entry.orgId);
      await assertCanDoTask(ctx, ctx.user, membership, "appointments.manage");
    }

    if (
      entry.status === WaitlistStatus.Claimed ||
      entry.status === WaitlistStatus.Expired ||
      entry.status === WaitlistStatus.Cancelled
    ) {
      return args.entryId;
    }

    await ctx.db.patch(args.entryId, {
      status: WaitlistStatus.Cancelled,
      cancelledAt: Date.now(),
    });
    return args.entryId;
  },
});

/**
 * Citizen: list my waitlist entries.
 */
export const listMyWaitlist = authQuery({
  args: {},
  handler: async (ctx) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();
    if (!profile) return [];

    const rows = await ctx.db
      .query("appointmentWaitlist")
      .withIndex("by_attendee_status", (q) => q.eq("attendeeProfileId", profile._id))
      .order("desc")
      .take(50);

    return Promise.all(
      rows.map(async (r) => {
        const org = (await ctx.db.get(r.orgId)) as any;
        const orgService = (await ctx.db.get(r.orgServiceId)) as any;
        const service = orgService
          ? ((await ctx.db.get(orgService.serviceId)) as any)
          : null;
        return {
          ...r,
          orgName: org?.name ?? "—",
          serviceName:
            service?.name && typeof service.name === "object"
              ? service.name.fr ?? service.name.en
              : service?.name ?? "—",
        };
      }),
    );
  },
});

/**
 * Agent: list the waitlist for an org, optionally filtered by service.
 * Requires `appointments.view` permission.
 */
export const listOrgWaitlist = authQuery({
  args: {
    orgId: v.id("orgs"),
    orgServiceId: v.optional(v.id("orgServices")),
    status: v.optional(
      v.union(
        v.literal(WaitlistStatus.Waiting),
        v.literal(WaitlistStatus.Offered),
        v.literal(WaitlistStatus.Claimed),
        v.literal(WaitlistStatus.Expired),
        v.literal(WaitlistStatus.Cancelled),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "appointments.view");

    let rows: any[];
    if (args.orgServiceId) {
      const q = ctx.db
        .query("appointmentWaitlist")
        .withIndex("by_org_service_status", (ix) => {
          const base = ix
            .eq("orgId", args.orgId)
            .eq("orgServiceId", args.orgServiceId as Id<"orgServices">);
          return args.status ? base.eq("status", args.status) : base;
        });
      rows = await q.order("asc").take(500);
    } else {
      rows = await ctx.db
        .query("appointmentWaitlist")
        .filter((q) => q.eq(q.field("orgId"), args.orgId))
        .take(500);
      if (args.status) rows = rows.filter((r) => r.status === args.status);
    }

    return Promise.all(
      rows.map(async (r) => {
        const profile = (await ctx.db.get(r.attendeeProfileId)) as any;
        const user = profile ? ((await ctx.db.get(profile.userId)) as any) : null;
        const orgService = (await ctx.db.get(r.orgServiceId)) as any;
        const service = orgService
          ? ((await ctx.db.get(orgService.serviceId)) as any)
          : null;
        return {
          ...r,
          attendeeName: user?.name ?? "—",
          attendeeEmail: user?.email ?? "—",
          serviceName:
            service?.name && typeof service.name === "object"
              ? service.name.fr ?? service.name.en
              : service?.name ?? "—",
        };
      }),
    );
  },
});

/**
 * Internal — called after an appointment is cancelled. Finds the oldest
 * `waiting` entry whose date window covers the freed appointment date, and
 * promotes it to `offered` with an expiry window. Best-effort : returns
 * silently if no match.
 *
 * Note : this does NOT auto-book. It creates a named offer the citizen must
 * claim via `claimWaitlistOffer`. This avoids double-booking if the freed
 * slot is concurrently re-booked.
 */
export const offerSlotToWaitlist = internalMutation({
  args: {
    orgId: v.id("orgs"),
    orgServiceId: v.id("orgServices"),
    date: v.string(),
    freedAppointmentId: v.optional(v.id("appointments")),
  },
  handler: async (ctx, args) => {
    const candidates = await ctx.db
      .query("appointmentWaitlist")
      .withIndex("by_org_service_status", (ix) =>
        ix
          .eq("orgId", args.orgId)
          .eq("orgServiceId", args.orgServiceId)
          .eq("status", WaitlistStatus.Waiting),
      )
      .collect();

    // FIFO : oldest joinedAt first; only those whose window covers date.
    const eligible = candidates
      .filter(
        (c) => c.earliestDate <= args.date && args.date <= c.latestDate,
      )
      .sort((a, b) => a.joinedAt - b.joinedAt);

    if (eligible.length === 0) return null;

    const winner = eligible[0];
    await ctx.db.patch(winner._id, {
      status: WaitlistStatus.Offered,
      offeredAt: Date.now(),
      offerExpiresAt: Date.now() + OFFER_TTL_MS,
      offeredAppointmentId: args.freedAppointmentId,
    });
    return winner._id;
  },
});

/**
 * Cron — expire offers past their TTL and promote next in line.
 */
export const expireOffers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("appointmentWaitlist")
      .withIndex("by_status_offerExpiresAt", (q) =>
        q.eq("status", WaitlistStatus.Offered).lte("offerExpiresAt", now),
      )
      .take(100);

    for (const entry of expired) {
      await ctx.db.patch(entry._id, {
        status: WaitlistStatus.Expired,
        expiredAt: now,
      });
      // Promote next in line for this (org, service), covering approximate date
      // The freed appointment date is lost at expiry : we use today as a fallback
      // so the next waiting entry whose window covers today gets offered.
      const today = new Date().toISOString().split("T")[0];
      await ctx.scheduler.runAfter(0, internal.functions.appointmentWaitlist.offerSlotToWaitlist, {
        orgId: entry.orgId,
        orgServiceId: entry.orgServiceId,
        date: today,
      });
    }
    return expired.length;
  },
});
