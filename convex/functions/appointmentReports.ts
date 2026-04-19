import { v } from "convex/values";
import { backofficeQuery } from "../lib/customFunctions";

/**
 * Global appointment stats across all orgs (or filtered by orgId).
 * Returns volume, status breakdown, no-show rate, reschedule rate for a date range.
 * Backoffice-only.
 */
export const getGlobalStats = backofficeQuery({
  args: {
    orgId: v.optional(v.id("orgs")),
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    // For MVP we scan by date (indexed per-org). Cross-org uses a full filter scan
    // capped at 5000 rows — acceptable for reporting on <5k rows/month.
    let appointments: any[] = [];
    if (args.orgId) {
      appointments = await ctx.db
        .query("appointments")
        .withIndex("by_org_date", (q) =>
          q
            .eq("orgId", args.orgId as any)
            .gte("date", args.startDate)
            .lte("date", args.endDate),
        )
        .take(5000);
    } else {
      appointments = await ctx.db
        .query("appointments")
        .filter((q) =>
          q.and(
            q.gte(q.field("date"), args.startDate),
            q.lte(q.field("date"), args.endDate),
          ),
        )
        .take(5000);
    }

    const total = appointments.length;
    const statusCounts: Record<string, number> = {};
    let rescheduledCount = 0;
    for (const a of appointments) {
      statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;
      if ((a.rescheduleCount ?? 0) > 0) rescheduledCount += 1;
    }
    const noShow = statusCounts["no_show"] ?? 0;
    const completed = statusCounts["completed"] ?? 0;
    const cancelled = statusCounts["cancelled"] ?? 0;
    const confirmed = statusCounts["confirmed"] ?? 0;
    const pending = statusCounts["pending"] ?? 0;

    // Daily series
    const byDate: Record<string, number> = {};
    for (const a of appointments) {
      byDate[a.date] = (byDate[a.date] ?? 0) + 1;
    }
    const series = Object.entries(byDate)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, count]) => ({ date, count }));

    const attended = completed;
    const totalForNoShowRate = completed + noShow;
    const noShowRate =
      totalForNoShowRate > 0 ? noShow / totalForNoShowRate : 0;
    const rescheduleRate = total > 0 ? rescheduledCount / total : 0;

    return {
      total,
      statusCounts: {
        pending,
        confirmed,
        completed,
        cancelled,
        noShow,
        rescheduled: statusCounts["rescheduled"] ?? 0,
      },
      noShowRate,
      rescheduleRate,
      attended,
      series,
    };
  },
});

/**
 * Paginated cross-org appointments for the backoffice supervision list.
 */
export const listAll = backofficeQuery({
  args: {
    orgId: v.optional(v.id("orgs")),
    status: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 100, 500);
    let rows: any[];
    if (args.orgId) {
      rows = await ctx.db
        .query("appointments")
        .withIndex("by_org_date", (q) => {
          const base = q.eq("orgId", args.orgId as any);
          if (args.startDate && args.endDate) {
            return base.gte("date", args.startDate).lte("date", args.endDate);
          }
          if (args.startDate) return base.gte("date", args.startDate);
          return base;
        })
        .order("desc")
        .take(limit);
    } else {
      rows = await ctx.db.query("appointments").order("desc").take(limit);
    }
    if (args.status) {
      rows = rows.filter((r) => r.status === args.status);
    }

    // Enrich with org + attendee
    const enriched = await Promise.all(
      rows.map(async (r) => {
        const org = (await ctx.db.get(r.orgId)) as any;
        const profile = (await ctx.db.get(r.attendeeProfileId)) as any;
        const user = profile ? ((await ctx.db.get(profile.userId)) as any) : null;
        return {
          ...r,
          orgName: org?.name ?? "—",
          attendeeName: user?.name ?? "—",
          attendeeEmail: user?.email ?? "—",
        };
      }),
    );
    return enriched;
  },
});
