import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { backofficeQuery, superadminQuery, superadminMutation, backofficeMutation } from "../lib/customFunctions";
import { error, ErrorCode } from "../lib/errors";
import { getEffectiveRole } from "../lib/auth";
import { UserRole } from "../lib/constants";
import { components } from "../_generated/api";
import {
  globalCounts,
  requestsByOrg,
  requestsGlobal,
  orgsGlobal,
  servicesGlobal,
  associationsGlobal,
  companiesGlobal,
} from "../lib/aggregates";

// Role hierarchy rank (higher = more privileged)
const ROLE_RANK: Record<string, number> = {
  [UserRole.User]: 0,
  [UserRole.Admin]: 1,
  [UserRole.AdminSystem]: 2,
  [UserRole.SuperAdmin]: 3,
};

// Helper to enrich user with profile + membership data
async function enrichUser(ctx: any, user: any) {
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q: any) => q.eq("userId", user._id))
    .unique();

  // Fetch all memberships for this user (prefix match on userId)
  const allMemberships = await ctx.db
    .query("memberships")
    .withIndex("by_user_org", (q: any) => q.eq("userId", user._id))
    .collect();
  const activeMemberships = allMemberships.filter((m: any) => !m.deletedAt);

  // Enrich first membership with org + position info
  let membershipInfo = null;
  if (activeMemberships.length > 0) {
    const m = activeMemberships[0];
    const org = await ctx.db.get(m.orgId);
    let positionTitle = null;
    if (m.positionId) {
      const position = await ctx.db.get(m.positionId);
      // position.title is LocalizedString { fr, en } — resolve to string
      if (position?.title) {
        positionTitle = typeof position.title === "string"
          ? position.title
          : position.title.fr || position.title.en || null;
      }
    }
    membershipInfo = {
      orgName: org?.name ?? "—",
      orgSlug: org?.slug,
      positionTitle,
      totalMemberships: activeMemberships.length,
    };
  }

  return {
    ...user,
    role: getEffectiveRole(user),
    phone: profile?.contacts?.phone,
    nationality: profile?.identity?.nationality,
    residenceCountry: profile?.addresses?.residence?.country,
    createdAt: user._creationTime,
    isVerified: !!user.authId,
    profileId: profile?._id,
    hasMembership: activeMemberships.length > 0,
    membershipInfo,
  };
}

/**
 * List all users with enriched data (paginated)
 */
export const listUsers = backofficeQuery({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const paginatedResult = await ctx.db
      .query("users")
      .order("desc")
      .paginate(args.paginationOpts);

    // Enrich with profile data for the current page only
    const enrichedPage = await Promise.all(
      paginatedResult.page.map((user) => enrichUser(ctx, user)),
    );

    return {
      ...paginatedResult,
      page: enrichedPage,
    };
  },
});

/**
 * Fetch users in chunks (paginated), returning enriched data.
 * Used by Super Admin dashboard for progressive loading of all users.
 */
export const listAllUsersChunk = backofficeQuery({
  args: {
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    // 1) Fetch paginated users (300 per chunk keeps profile/membership reads well below 4096 limit)
    const paginated = await ctx.db
      .query("users")
      .order("desc")
      .paginate({ cursor: args.cursor, numItems: 300 });

    // 2) Fetch active memberships globally for this execution to save N queries
    const allMemberships = await ctx.db.query("memberships").collect();
    const activeMemberships = allMemberships.filter((m) => !m.deletedAt);
    
    // Group memberships by user
    const membershipsByUserId = new Map<string, any[]>();
    for (const m of activeMemberships) {
      if (!membershipsByUserId.has(m.userId)) membershipsByUserId.set(m.userId, []);
      membershipsByUserId.get(m.userId)!.push(m);
    }

    // Prepare global maps for orgs and positions to avoid N+1 inside map
    const orgIds = new Set<string>();
    const posIds = new Set<string>();
    for (const m of activeMemberships) {
      orgIds.add(m.orgId);
      if (m.positionId) posIds.add(m.positionId);
    }
    const [allOrgs, allPositions] = await Promise.all([
      Promise.all(Array.from(orgIds).map(id => ctx.db.get(id as any))),
      Promise.all(Array.from(posIds).map(id => ctx.db.get(id as any))),
    ]);
    const orgsMap = new Map((allOrgs.filter(Boolean) as any[]).map(o => [o._id, o]));
    const posMap = new Map((allPositions.filter(Boolean) as any[]).map(p => [p._id, p]));

    const enrichedPage = await Promise.all(
      paginated.page.map(async (user) => {
        // Fetch profile explicitly (1 read per user)
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q: any) => q.eq("userId", user._id))
          .unique();

        const userMemberships = membershipsByUserId.get(user._id) || [];
        
        let membershipInfo = null;
        if (userMemberships.length > 0) {
          const m = userMemberships[0];
          const org = orgsMap.get(m.orgId);
          let positionTitle = null;
          if (m.positionId) {
            const position = posMap.get(m.positionId);
            if (position?.title) {
              positionTitle = typeof position.title === "string"
                ? position.title
                : position.title.fr || position.title.en || null;
            }
          }
          membershipInfo = {
            orgName: org?.name ?? "—",
            orgSlug: org?.slug,
            orgCountry: org?.country,
            positionTitle,
            totalMemberships: userMemberships.length,
          };
        }

        return {
          ...user,
          role: getEffectiveRole(user),
          phone: profile?.contacts?.phone,
          nationality: profile?.identity?.nationality,
          countryOfResidence: profile?.countryOfResidence,
          residenceCountry: profile?.countryOfResidence || profile?.addresses?.residence?.country || profile?.identity?.nationality || membershipInfo?.orgCountry,
          createdAt: user._creationTime,
          isVerified: !!user.authId,
          profileId: profile?._id,
          hasMembership: userMemberships.length > 0,
          membershipInfo,
          deletedAt: (user as any).deletedAt ?? null,
        };
      })
    );

    return {
      page: enrichedPage,
      isDone: paginated.isDone,
      continueCursor: paginated.continueCursor,
    };
  },
});

/**
 * Get single enriched user
 */
export const getUser = backofficeQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    return await enrichUser(ctx, user);
  },
});

/**
 * List all organizations
 */
export const listOrgs = backofficeQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("orgs").take(200);
  },
});

/**
 * List all diplomatic members (corps administratif) with enriched profiles.
 * Returns memberships that have a positionId (= staff, not citizens).
 */
export const listDiplomaticMembers = backofficeQuery({
  args: {},
  handler: async (ctx) => {
    // Récupérer toutes les memberships actives avec un poste
    const allMemberships = await ctx.db
      .query("memberships")
      .collect();

    const activeMemberships = allMemberships.filter(
      (m) => !m.deletedAt && m.positionId,
    );

    // Batch lookup: users, positions, orgs
    const userIds = [...new Set(activeMemberships.map((m) => m.userId))];
    const positionIds = [...new Set(activeMemberships.map((m) => m.positionId!))];
    const orgIds = [...new Set(activeMemberships.map((m) => m.orgId))];

    const [users, positions, orgs] = await Promise.all([
      Promise.all(userIds.map((id) => ctx.db.get(id))),
      Promise.all(positionIds.map((id) => ctx.db.get(id))),
      Promise.all(orgIds.map((id) => ctx.db.get(id))),
    ]);

    const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u!]));
    const positionMap = new Map(positions.filter(Boolean).map((p) => [p!._id, p!]));
    const orgMap = new Map(orgs.filter(Boolean).map((o) => [o!._id, o!]));

    return activeMemberships.map((m) => {
      const user = userMap.get(m.userId);
      const position = m.positionId ? positionMap.get(m.positionId) : null;
      const org = orgMap.get(m.orgId);

      return {
        membershipId: m._id,
        orgId: m.orgId,
        diplomaticProfile: (m as any).diplomaticProfile ?? null,
        isPublicContact: m.isPublicContact,
        user: user
          ? {
              _id: user._id,
              name: user.name,
              email: user.email,
              firstName: (user as any).firstName,
              lastName: (user as any).lastName,
              avatarUrl: (user as any).avatarUrl,
            }
          : null,
        position: position
          ? {
              code: position.code,
              title: position.title,
              grade: position.grade,
              level: position.level,
            }
          : null,
        org: org
          ? {
              _id: org._id,
              name: org.name,
              type: org.type,
              country: org.country,
              slug: org.slug,
            }
          : null,
      };
    }).filter((m) => m.user !== null);
  },
});

/**
 * Get user memberships
 */
export const getUserMemberships = backofficeQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) => q.eq("userId", args.userId))
      .collect();

    const orgIds = memberships.map((m) => m.orgId);

    const orgs = await Promise.all(orgIds.map((id) => ctx.db.get(id)));
    const orgMap = new Map(orgs.filter(Boolean).map((o) => [o!._id, o!]));

    return memberships.map((m) => ({
      ...m,
      org: orgMap.get(m.orgId),
      joinedAt: m._creationTime,
    }));
  },
});

/**
 * Get user audit logs
 */
export const getUserAuditLogs = backofficeQuery({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_actor", (q) => q.eq("actorId", args.userId))
      .order("desc")
      .take(args.limit || 10);

    return events.map((e) => ({
      _id: e._id,
      action: e.type,
      details: JSON.stringify(e.data),
      timestamp: e._creationTime,
    }));
  },
});

/**
 * Get global stats for dashboard — uses Aggregate for users count.
 * Superadmin-only, called rarely, so lightweight DB scans for other tables are acceptable.
 * Returns enriched data for KPI cards, status chart, recent requests table,
 * PLUS strategic intelligence: deployment progress, performance metrics, security alerts.
 */
export const getStats = backofficeQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    // All counts via aggregates (O(log n) each)
    const [
      totalUsers,
      totalOrgs,
      activeServices,
      totalRequests,
      totalAssociations,
      totalCompanies,
    ] = await Promise.all([
      globalCounts.count(ctx, {}),
      orgsGlobal.count(ctx, {}),
      servicesGlobal.count(ctx, { bounds: { lower: { key: 1, inclusive: true }, upper: { key: 1, inclusive: true } } }),
      requestsGlobal.count(ctx, {}),
      associationsGlobal.count(ctx, {}),
      companiesGlobal.count(ctx, {}),
    ]);

    // Request status breakdown via aggregates
    const statuses = ["draft", "submitted", "pending", "pending_completion", "edited", "under_review", "processing", "in_production", "validated", "appointment_scheduled", "ready_for_pickup", "completed", "cancelled", "rejected"];
    const statusBreakdown: Record<string, number> = {};
    for (const status of statuses) {
      const count = await requestsGlobal.count(ctx, { bounds: { prefix: [status] } });
      if (count > 0) statusBreakdown[status] = count;
    }

    // Registrations + appointments counts — bounded queries (no global aggregate yet)
    const [registrationsDocs, appointmentsDocs] = await Promise.all([
      ctx.db.query("consularRegistrations").take(5000),
      ctx.db.query("appointments").take(5000),
    ]);
    const registrationsCount = registrationsDocs.length;

    // Recent 10 requests (most recent first) — lightweight targeted query
    const sortedRequests = await ctx.db
      .query("requests")
      .order("desc")
      .take(10);

    // Batch-fetch related entities for the recent requests
    const userIds = [...new Set(sortedRequests.map((r) => r.userId))];
    const orgIds = [...new Set(sortedRequests.map((r) => r.orgId))];
    const orgServiceIds = [
      ...new Set(sortedRequests.map((r) => r.orgServiceId)),
    ];

    const [users, orgsForReqs, orgServices] = await Promise.all([
      Promise.all(userIds.map((id) => ctx.db.get(id))),
      Promise.all(orgIds.map((id) => ctx.db.get(id))),
      Promise.all(orgServiceIds.map((id) => ctx.db.get(id))),
    ]);

    const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u!]));
    const orgMap = new Map(
      orgsForReqs.filter(Boolean).map((o) => [o!._id, o!]),
    );
    const orgServiceMap = new Map(
      orgServices.filter(Boolean).map((os) => [os!._id, os!]),
    );

    // Fetch services for the orgServices
    const serviceIds = [
      ...new Set(orgServices.filter(Boolean).map((os) => os!.serviceId)),
    ];
    const services = await Promise.all(serviceIds.map((id) => ctx.db.get(id)));
    const serviceMap = new Map(
      services.filter(Boolean).map((s) => [s!._id, s!]),
    );

    const recentRequests = sortedRequests.map((r) => {
      const user = userMap.get(r.userId);
      const org = orgMap.get(r.orgId);
      const orgService = orgServiceMap.get(r.orgServiceId);
      const service = orgService
        ? serviceMap.get(orgService.serviceId)
        : null;
      return {
        _id: r._id,
        reference: r.reference,
        status: r.status,
        priority: r.priority,
        createdAt: r._creationTime,
        submittedAt: r.submittedAt,
        userName: user?.name ?? "—",
        orgName: org?.name ?? "—",
        serviceName: service?.name ?? "—",
      };
    });

    // Upcoming appointments (future only)
    const upcomingAppointments = appointmentsDocs.filter(
      (a: any) => typeof a.date === "string" && new Date(a.date).getTime() > now,
    ).length;

    // ══════════════════════════════════════════════════════════════════════
    // STRATEGIC INTELLIGENCE — Deployment, Performance, Security
    // ══════════════════════════════════════════════════════════════════════

    // ── 1. Deployment Progress ──────────────────────────────────────────
    const allOrgs = await ctx.db
      .query("orgs")
      .take(500);
    const nonDeletedOrgs = allOrgs.filter((o) => !o.deletedAt);
    const activeOrgs = nonDeletedOrgs.filter((o) => o.isActive);

    // Breakdown by type (all non-deleted orgs for visibility)
    const orgsByType: Record<string, number> = {};
    for (const org of nonDeletedOrgs) {
      orgsByType[org.type] = (orgsByType[org.type] ?? 0) + 1;
    }

    // Breakdown by country (all non-deleted orgs)
    const orgsByCountry: Record<string, { count: number; names: string[] }> = {};
    for (const org of nonDeletedOrgs) {
      if (!orgsByCountry[org.country]) {
        orgsByCountry[org.country] = { count: 0, names: [] };
      }
      orgsByCountry[org.country].count++;
      orgsByCountry[org.country].names.push(org.name);
    }

    // Countries covered via jurisdiction
    const allJurisdictionCountries = new Set<string>();
    for (const org of nonDeletedOrgs) {
      if (org.jurisdictionCountries) {
        for (const c of org.jurisdictionCountries) {
          allJurisdictionCountries.add(c);
        }
      }
    }

    // Orgs with head of mission assigned
    const orgsWithHom = nonDeletedOrgs.filter((o) => o.headOfMission).length;

    // Total staff count
    const totalStaff = nonDeletedOrgs.reduce((sum, o) => sum + (o.staffCount ?? 0), 0);

    // ── 2. Performance Metrics ──────────────────────────────────────────
    const completedCount = statusBreakdown["completed"] ?? 0;
    const cancelledCount = statusBreakdown["cancelled"] ?? 0;
    const rejectedCount = statusBreakdown["rejected"] ?? 0;
    const totalTerminal = completedCount + cancelledCount + rejectedCount;
    const completionRate = totalRequests > 0 ? Math.round((completedCount / totalRequests) * 100) : 0;

    // Urgent/critical requests pending
    const urgentRequests = sortedRequests.filter(
      (r) => (r.priority === "urgent" || r.priority === "critical") &&
        !["completed", "cancelled", "rejected"].includes(r.status)
    ).length;

    // In-progress pipeline counts
    const pipelineCounts = {
      draft: statusBreakdown["draft"] ?? 0,
      submitted: statusBreakdown["submitted"] ?? 0,
      pending: statusBreakdown["pending"] ?? 0,
      underReview: (statusBreakdown["under_review"] ?? 0) + (statusBreakdown["processing"] ?? 0),
      inProduction: statusBreakdown["in_production"] ?? 0,
      validated: statusBreakdown["validated"] ?? 0,
      readyForPickup: (statusBreakdown["ready_for_pickup"] ?? 0) + (statusBreakdown["appointment_scheduled"] ?? 0),
      completed: completedCount,
      cancelled: cancelledCount,
      rejected: rejectedCount,
    };

    // ── 3. Engagement Trends ────────────────────────────────────────────
    // Users created in last 7d/30d (scan recent users)
    const recentUsers = await ctx.db
      .query("users")
      .order("desc")
      .take(500);
    const users7d = recentUsers.filter((u) => u._creationTime >= sevenDaysAgo).length;
    const users30d = recentUsers.filter((u) => u._creationTime >= thirtyDaysAgo).length;

    // Registration breakdown by status
    const registrationsByStatus: Record<string, number> = {};
    for (const reg of registrationsDocs) {
      const s = (reg as any).status ?? "unknown";
      registrationsByStatus[s] = (registrationsByStatus[s] ?? 0) + 1;
    }

    // ── 4. Security Alerts ──────────────────────────────────────────────
    // CRITICAL signals in last 24h
    const criticalSignals = await ctx.db
      .query("signaux")
      .withIndex("by_timestamp", (q) => q.gt("timestamp", twentyFourHoursAgo))
      .order("desc")
      .take(50);
    const criticalAlerts = criticalSignals
      .filter((s) => s.priorite === "CRITICAL")
      .map((s) => ({
        _id: s._id,
        type: s.type,
        source: s.source,
        message: (s.payload as any)?.message ?? s.type,
        timestamp: s.timestamp,
        priorite: s.priorite,
      }));

    // SECURITE actions in last 24h
    const securityActions = await ctx.db
      .query("historiqueActions")
      .withIndex("by_categorie", (q) => q.eq("categorie", "SECURITE").gt("timestamp", twentyFourHoursAgo))
      .order("desc")
      .take(20);
    const securityEvents = securityActions.map((a) => ({
      _id: a._id,
      action: a.action,
      entiteType: a.entiteType,
      userId: a.userId,
      timestamp: a.timestamp,
    }));

    // Untreated signals queue depth
    const untreatedSignals = await ctx.db
      .query("signaux")
      .withIndex("by_non_traite", (q) => q.eq("traite", false))
      .take(200);
    const queueDepth = untreatedSignals.length;

    // System health status
    const systemHealth = queueDepth > 100 ? "CRITICAL" : queueDepth > 50 ? "DEGRADED" : "HEALTHY";

    return {
      users: { total: totalUsers },
      orgs: { total: totalOrgs },
      services: { active: activeServices },
      requests: {
        total: totalRequests,
        statusBreakdown,
      },
      registrations: { total: registrationsCount },
      appointments: { upcoming: upcomingAppointments },
      associations: { total: totalAssociations },
      companies: { total: totalCompanies },
      recentRequests,
      // ── Strategic Intelligence ──
      deployment: {
        activeOrgs: activeOrgs.length,
        totalOrgs: nonDeletedOrgs.length,
        activationRate: nonDeletedOrgs.length > 0 ? Math.round((activeOrgs.length / nonDeletedOrgs.length) * 100) : 0,
        byType: orgsByType,
        byCountry: orgsByCountry,
        countriesCovered: allJurisdictionCountries.size,
        orgsWithHeadOfMission: orgsWithHom,
        totalStaff,
      },
      performance: {
        completionRate,
        urgentPending: urgentRequests,
        pipeline: pipelineCounts,
        totalTerminal,
      },
      engagement: {
        newUsers7d: users7d,
        newUsers30d: users30d,
        registrationsByStatus,
      },
      security: {
        criticalAlerts,
        securityEvents,
        queueDepth,
        systemHealth,
        totalAlerts24h: criticalAlerts.length,
        totalSecurityEvents24h: securityEvents.length,
      },
    };
  },
});

import { query } from "../_generated/server";
export const getStatsDev = query({
  args: {},
  handler: async (ctx) => {
    return {
      users: await globalCounts.count(ctx, {})
    };
  }
});

/**
 * Get global audit logs (paginated)
 */
export const getAuditLogs = backofficeQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const paginatedResult = await ctx.db
      .query("events")
      .order("desc")
      .paginate(args.paginationOpts);

    // Provide user details for each event on the current page
    const enrichedPage = await Promise.all(
      paginatedResult.page.map(async (e) => {
        let user = null;
        if (e.actorId) {
          user = await ctx.db.get(e.actorId);
        }
        return {
          _id: e._id,
          action: e.type,
          details: JSON.stringify(e.data),
          timestamp: e._creationTime,
          createdAt: e._creationTime,
          _creationTime: e._creationTime,
          userId: e.actorId,
          targetType: e.targetType,
          targetId: e.targetId,
          user:
            user ?
              {
                _id: user._id,
                email: user.email || "",
                firstName: user.name.split(" ")[0],
                lastName: user.name.split(" ").slice(1).join(" ") || "",
              }
            : null,
        };
      }),
    );

    return {
      ...paginatedResult,
      page: enrichedPage,
    };
  },
});

/**
 * Update user role (global/admin)
 * Accessible by SuperAdmin and AdminSystem via backofficeMutation.
 * Rules:
 * - Cannot change own role
 * - Cannot assign super_admin (it's unique)
 * - Cannot change SuperAdmin's role
 * - AdminSystem cannot promote above their own level
 */
export const updateUserRole = backofficeMutation({
  args: {
    userId: v.id("users"),
    role: v.union(
      v.literal(UserRole.User),
      v.literal(UserRole.Admin),
      v.literal(UserRole.AdminSystem),
    ),
  },
  handler: async (ctx, args) => {
    // Prevent changing own role
    if (ctx.user._id === args.userId) {
      throw error(ErrorCode.CANNOT_REMOVE_SELF);
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw error(ErrorCode.USER_NOT_FOUND);

    // Cannot change SuperAdmin's role
    if (targetUser.isSuperadmin || targetUser.role === UserRole.SuperAdmin) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    // AdminSystem cannot promote to admin_system (only SuperAdmin can)
    const callerRole = getEffectiveRole(ctx.user);
    const callerRank = ROLE_RANK[callerRole] ?? 0;
    const targetRank = ROLE_RANK[args.role] ?? 0;
    if (targetRank >= callerRank) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    const { userId, role } = args;
    await ctx.db.patch(userId, { role, isSuperadmin: false });
    return true;
  },
});

/**
 * Disable user
 * Back-office users can disable users they outrank.
 */
export const disableUser = backofficeMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    if (ctx.user._id === args.userId) {
      throw error(ErrorCode.CANNOT_REMOVE_SELF);
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw error(ErrorCode.USER_NOT_FOUND);

    // Cannot disable SuperAdmin
    if (targetUser.isSuperadmin || targetUser.role === UserRole.SuperAdmin) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    // Caller must outrank target
    const callerRank = ROLE_RANK[getEffectiveRole(ctx.user)] ?? 0;
    const targetRank = ROLE_RANK[getEffectiveRole(targetUser)] ?? 0;
    if (targetRank >= callerRank) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    await ctx.db.patch(args.userId, { isActive: false } as any);
  },
});

/**
 * Enable user
 * Back-office users can enable users they outrank.
 */
export const enableUser = backofficeMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw error(ErrorCode.USER_NOT_FOUND);

    // Caller must outrank target
    const callerRank = ROLE_RANK[getEffectiveRole(ctx.user)] ?? 0;
    const targetRank = ROLE_RANK[getEffectiveRole(targetUser)] ?? 0;
    if (targetRank >= callerRank) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    await ctx.db.patch(args.userId, { isActive: true, deletedAt: undefined } as any);
  },
});

/**
 * Soft-delete user (move to trash)
 * Back-office users can trash users they outrank.
 */
export const softDeleteUser = backofficeMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    if (ctx.user._id === args.userId) {
      throw error(ErrorCode.CANNOT_REMOVE_SELF);
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw error(ErrorCode.USER_NOT_FOUND);

    // Cannot trash SuperAdmin
    if (targetUser.isSuperadmin || targetUser.role === UserRole.SuperAdmin) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    // Caller must outrank target
    const callerRank = ROLE_RANK[getEffectiveRole(ctx.user)] ?? 0;
    const targetRank = ROLE_RANK[getEffectiveRole(targetUser)] ?? 0;
    if (targetRank >= callerRank) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    await ctx.db.patch(args.userId, {
      isActive: false,
      deletedAt: Date.now(),
    } as any);
  },
});

/**
 * Restore user from trash
 * Back-office users can restore users they outrank.
 */
export const restoreUser = backofficeMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw error(ErrorCode.USER_NOT_FOUND);

    // Caller must outrank target
    const callerRank = ROLE_RANK[getEffectiveRole(ctx.user)] ?? 0;
    const targetRank = ROLE_RANK[getEffectiveRole(targetUser)] ?? 0;
    if (targetRank >= callerRank) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    await ctx.db.patch(args.userId, {
      isActive: true,
      deletedAt: undefined,
    } as any);
  },
});

// ─── Helpers for user data collection ────────────────────────
// Collect all entity IDs linked to a user for preview or deletion.

async function collectUserEntities(ctx: any, userId: any) {
  // 1. Profile & child profiles
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .unique();

  const childProfiles = await ctx.db
    .query("childProfiles")
    .withIndex("by_author", (q: any) => q.eq("authorUserId", userId))
    .collect();

  // 2. Requests
  const requests = await ctx.db
    .query("requests")
    .withIndex("by_user_status", (q: any) => q.eq("userId", userId))
    .collect();
  const requestIds = requests.map((r: any) => r._id);

  // 3. Documents — owned by user, profile, or child profiles
  const ownerIds = [
    userId,
    ...(profile ? [profile._id] : []),
    ...childProfiles.map((cp: any) => cp._id),
  ];
  const allDocuments = [];
  for (const ownerId of ownerIds) {
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_owner", (q: any) => q.eq("ownerId", ownerId))
      .collect();
    allDocuments.push(...docs);
  }
  // Also collect documents referenced in requests (may have different ownerId)
  const requestDocIds = new Set<string>();
  for (const req of requests) {
    for (const docId of req.documents ?? []) {
      requestDocIds.add(docId);
    }
  }
  // Fetch request-referenced docs not already collected
  const existingDocIds = new Set(allDocuments.map((d: any) => d._id));
  for (const docId of requestDocIds) {
    if (!existingDocIds.has(docId)) {
      const doc = await ctx.db.get(docId);
      if (doc) allDocuments.push(doc);
    }
  }

  // 4. Events related to user's requests
  const events = [];
  for (const rid of requestIds) {
    const evts = await ctx.db
      .query("events")
      .withIndex("by_target", (q: any) =>
        q.eq("targetType", "request").eq("targetId", rid as unknown as string),
      )
      .collect();
    events.push(...evts);
  }

  // 5. Agent notes on user's requests
  const agentNotes = [];
  for (const rid of requestIds) {
    const notes = await ctx.db
      .query("agentNotes")
      .withIndex("by_request", (q: any) => q.eq("requestId", rid))
      .collect();
    agentNotes.push(...notes);
  }

  // 6. Simple userId-linked tables
  const collectByUser = async (table: string, indexName: string, field: string) => {
    try {
      return await ctx.db
        .query(table)
        .withIndex(indexName, (q: any) => q.eq(field, userId))
        .collect();
    } catch {
      // If index doesn't exist, fall back to filter
      return await ctx.db
        .query(table)
        .filter((q: any) => q.eq(q.field(field), userId))
        .collect();
    }
  };

  const memberships = await collectByUser("memberships", "by_user_org", "userId");
  const notifications = await collectByUser("notifications", "by_user", "userId");
  const payments = await collectByUser("payments", "by_user", "userId");
  const meetings = await collectByUser("meetings", "by_createdBy", "createdBy");
  const cv = await collectByUser("cv", "by_user", "userId");
  const digitalMail = await collectByUser("digitalMail", "by_user", "userId");
  const deliveryPackages = await collectByUser("deliveryPackages", "by_user", "userId");
  const associationMembers = await collectByUser("associationMembers", "by_user", "userId");
  const associationClaims = await collectByUser("associationClaims", "by_user", "userId");
  const companyMembers = await collectByUser("companyMembers", "by_user", "userId");
  const conversations = await collectByUser("conversations", "by_user", "userId");
  const callLines = await collectByUser("callLines", "by_user", "userId");
  const tickets = await collectByUser("tickets", "by_user", "userId");
  const messages = await collectByUser("messages", "by_sender", "senderId");

  return {
    profile,
    childProfiles,
    requests,
    documents: allDocuments,
    events,
    agentNotes,
    memberships,
    notifications,
    payments,
    meetings,
    cv,
    digitalMail,
    deliveryPackages,
    associationMembers,
    associationClaims,
    companyMembers,
    conversations,
    callLines,
    tickets,
    messages,
  };
}

/**
 * Preview what will be deleted when permanently deleting a user.
 * Returns counts for each entity type so the admin can confirm.
 */
export const getUserDeletionPreview = backofficeQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.userId);
    if (!target) throw error(ErrorCode.NOT_FOUND);

    const entities = await collectUserEntities(ctx, args.userId);

    const counts: Record<string, number> = {
      profile: entities.profile ? 1 : 0,
      childProfiles: entities.childProfiles.length,
      requests: entities.requests.length,
      documents: entities.documents.length,
      events: entities.events.length,
      agentNotes: entities.agentNotes.length,
      memberships: entities.memberships.length,
      notifications: entities.notifications.length,
      payments: entities.payments.length,
      meetings: entities.meetings.length,
      cv: entities.cv.length,
      digitalMail: entities.digitalMail.length,
      deliveryPackages: entities.deliveryPackages.length,
      associationMembers: entities.associationMembers.length,
      associationClaims: entities.associationClaims.length,
      companyMembers: entities.companyMembers.length,
      conversations: entities.conversations.length,
      callLines: entities.callLines.length,
      tickets: entities.tickets.length,
      messages: entities.messages.length,
    };

    const totalItems = Object.values(counts).reduce((a, b) => a + b, 0);

    // Count storage files that will be cleaned up
    let storageFileCount = 0;
    for (const doc of entities.documents) {
      storageFileCount += doc.files?.length ?? 0;
    }

    return { counts, totalItems, storageFileCount, userName: target.name || target.email };
  },
});

/**
 * Permanently delete user and ALL associated data.
 * Back-office users can permanently delete users they outrank.
 * Cascade deletes: profile, child profiles, requests, documents (+ storage),
 * events, agent notes, memberships, payments, notifications, meetings, cv,
 * digital mail, delivery packages, association/company members, conversations,
 * call lines, tickets, messages.
 */
export const permanentlyDeleteUser = backofficeMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    if (ctx.user._id === args.userId) {
      throw error(ErrorCode.CANNOT_REMOVE_SELF);
    }
    const target = await ctx.db.get(args.userId);
    if (!target) throw error(ErrorCode.NOT_FOUND);

    // Cannot delete SuperAdmin
    if (target.isSuperadmin || target.role === UserRole.SuperAdmin) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    // Caller must outrank target
    const callerRank = ROLE_RANK[getEffectiveRole(ctx.user)] ?? 0;
    const targetRank = ROLE_RANK[getEffectiveRole(target)] ?? 0;
    if (targetRank >= callerRank) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    // Collect all linked entities
    const entities = await collectUserEntities(ctx, args.userId);

    // ── Delete in leaf-to-root order ──

    // 1. Events (linked to requests)
    for (const evt of entities.events) {
      await ctx.db.delete(evt._id);
    }

    // 2. Agent notes (linked to requests)
    for (const note of entities.agentNotes) {
      await ctx.db.delete(note._id);
    }

    // 3. Messages
    for (const msg of entities.messages) {
      await ctx.db.delete(msg._id);
    }

    // 4. Documents — delete storage files, then documents
    for (const doc of entities.documents) {
      if (doc.files) {
        for (const file of doc.files) {
          try {
            await ctx.storage.delete(file.storageId);
          } catch {
            // Storage file may already be gone — continue
          }
        }
      }
      await ctx.db.delete(doc._id);
    }

    // 5. Requests
    for (const req of entities.requests) {
      await ctx.db.delete(req._id);
    }

    // 6. Child profiles
    for (const cp of entities.childProfiles) {
      await ctx.db.delete(cp._id);
    }

    // 7. Profile
    if (entities.profile) {
      await ctx.db.delete(entities.profile._id);
    }

    // 8. Memberships
    for (const m of entities.memberships) {
      await ctx.db.delete(m._id);
    }

    // 9. Secondary tables
    const secondaryEntities = [
      ...entities.notifications,
      ...entities.payments,
      ...entities.meetings,
      ...entities.cv,
      ...entities.digitalMail,
      ...entities.deliveryPackages,
      ...entities.associationMembers,
      ...entities.associationClaims,
      ...entities.companyMembers,
      ...entities.conversations,
      ...entities.callLines,
      ...entities.tickets,
    ];
    for (const entity of secondaryEntities) {
      await ctx.db.delete(entity._id);
    }

    // 10. Clean up Better Auth data (user, accounts, sessions, verifications)
    const baUsersResult = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      where: [{ field: "userId", value: args.userId as unknown as string }],
      paginationOpts: { numItems: 10, cursor: null },
    });
    const baUsers = ((baUsersResult as any)?.page ?? baUsersResult ?? []) as any[];

    for (const baUser of baUsers) {
      const baUserId = String(baUser._id ?? baUser.id);

      // Delete all accounts (credential, oauth, etc.)
      await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
        input: {
          model: "account",
          where: [{ field: "userId", value: baUserId }],
        },
        paginationOpts: { numItems: 100, cursor: null },
      } as any);

      // Delete all sessions
      await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
        input: {
          model: "session",
          where: [{ field: "userId", value: baUserId }],
        },
        paginationOpts: { numItems: 100, cursor: null },
      } as any);

      // Delete the Better Auth user record
      await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
        input: {
          model: "user",
          where: [{ field: "_id", value: baUserId }],
        },
      } as any);
    }

    // Delete verifications tied to user's email (OTP codes, password reset tokens, etc.)
    if (target.email) {
      await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
        input: {
          model: "verification",
          where: [{ field: "identifier", value: target.email }],
        },
        paginationOpts: { numItems: 100, cursor: null },
      } as any);
    }

    // 11. Hard delete Convex user
    await ctx.db.delete(args.userId);
  },
});

/**
 * Disable organization
 */
export const disableOrg = superadminMutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    // Check if trying to disable own org? No, superadmin can disable any.
    await ctx.db.patch(args.orgId, { isActive: false });
  },
});

/**
 * Enable organization
 */
export const enableOrg = superadminMutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orgId, { isActive: true });
  },
});

/**
 * Create external user (wrapper for invite flow)
 * Following current architecture where we create a shadow user first.
 */
import { createInvitedUserHelper } from "../lib/users";
export const createExternalUser = superadminMutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
  },
  handler: async (ctx, args) => {
    const name = `${args.firstName} ${args.lastName}`;
    const userId = await createInvitedUserHelper(
      ctx,
      args.email,
      name,
      args.firstName,
      args.lastName,
    );
    return { userId };
  },
});

/**
 * Update allowed modules for a user.
 * Enforces role hierarchy:
 *   - SuperAdmin → can configure anyone except themselves
 *   - AdminSystem → can configure Admin, Corps Admin, Agents (not SuperAdmin or AdminSystem)
 *   - Admin → can configure Corps Admin and Agents only
 */
import { moduleCodeValidator, CORE_MODULE_CODES, ALL_MODULE_CODES, MODULE_REGISTRY, type ModuleCodeValue } from "../lib/moduleCodes";

export const updateUserModules = backofficeMutation({
  args: {
    userId: v.id("users"),
    modules: v.array(moduleCodeValidator),
  },
  handler: async (ctx, args) => {
    // Cannot modify own modules
    if (ctx.user._id === args.userId) {
      throw error(ErrorCode.CANNOT_REMOVE_SELF);
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw error(ErrorCode.USER_NOT_FOUND);

    // Cannot modify SuperAdmin's modules
    if (targetUser.isSuperadmin || targetUser.role === UserRole.SuperAdmin) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    // Role hierarchy check: caller must outrank target
    const callerRole = getEffectiveRole(ctx.user);
    const callerRank = ROLE_RANK[callerRole] ?? 0;
    const targetRole = getEffectiveRole(targetUser);
    const targetRank = ROLE_RANK[targetRole] ?? 0;

    if (targetRank >= callerRank) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    // Use the exact modules the admin selected (no force-include)
    const moduleSet = new Set<string>(args.modules);

    await ctx.db.patch(args.userId, {
      allowedModules: Array.from(moduleSet) as any,
      updatedAt: Date.now(),
    });

    return true;
  },
});

/**
 * Get allowed modules for a user (plus registry metadata for the UI).
 */
export const getUserModules = backofficeQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    return {
      allowedModules: (user as any).allowedModules as ModuleCodeValue[] | undefined,
      allModules: ALL_MODULE_CODES,
      coreModules: CORE_MODULE_CODES,
    };
  },
});
