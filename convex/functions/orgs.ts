import { v } from "convex/values";
import { query } from "../_generated/server";
import { createInvitedUserHelper } from "../lib/users";

// ... existing imports

import { authQuery, authMutation } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";
import { notDeleted } from "../lib/utils";
import { logCortexAction } from "../lib/neocortex";
import { SIGNAL_TYPES, CATEGORIES_ACTION } from "../lib/types";
import {
  RequestStatus,
  orgTypeValidator,
  addressValidator,
  orgSettingsValidator,
  localizedStringValidator,
} from "../lib/validators";
import { taskCodeValidator } from "../lib/taskCodes";
import { moduleCodeValidator } from "../lib/moduleCodes";
import { countryCodeValidator, CountryCode } from "../lib/countryCodeValidator";
import { canDoTask } from "../lib/permissions";
import {
  requestsByOrg,
  membershipsByOrg,
  orgServicesByOrg,
  appointmentsByOrg,
} from "../lib/aggregates";

/**
 * List all active organizations
 */
export const list = query({
  args: {
    type: v.optional(orgTypeValidator),
    country: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let orgs = await ctx.db
      .query("orgs")
      .withIndex("by_active_notDeleted", (q) =>
        q.eq("isActive", true).eq("deletedAt", undefined),
      )
      .take(200);

    // Filter by type/country if provided
    if (args.type) {
      orgs = orgs.filter((org) => org.type === args.type);
    }
    if (args.country) {
      orgs = orgs.filter((org) => org.country === args.country);
    }

    return orgs;
  },
});

/**
 * List organizations by jurisdiction country
 * Returns consulates/embassies whose jurisdiction includes the given country
 */
export const listByJurisdiction = query({
  args: {
    residenceCountry: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all active orgs
    const orgs = await ctx.db
      .query("orgs")
      .withIndex("by_active_notDeleted", (q) =>
        q.eq("isActive", true).eq("deletedAt", undefined),
      )
      .take(200);

    // Filter to consulates/embassies that have this country in their jurisdiction
    const consulateTypes = ["embassy", "consulate", "general_consulate"];

    return orgs.filter((org) => {
      if (!consulateTypes.includes(org.type)) return false;
      if (!org.jurisdictionCountries || org.jurisdictionCountries.length === 0)
        return false;
      return org.jurisdictionCountries.includes(
        args.residenceCountry as CountryCode,
      );
    });
  },
});

/**
 * Get organization by slug
 */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (org?.deletedAt) return null;
    return org;
  },
});

/**
 * Get organization by ID
 */
export const getById = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (org?.deletedAt) return null;
    return org;
  },
});

/**
 * Create a new organization
 */
export const create = authMutation({
  args: {
    name: v.string(),
    slug: v.string(),
    type: orgTypeValidator,
    country: countryCodeValidator,
    timezone: v.string(),
    address: addressValidator,
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    // Positions to create (pre-filled from template, possibly edited)
    positions: v.optional(
      v.array(
        v.object({
          code: v.string(),
          title: localizedStringValidator,
          description: v.optional(localizedStringValidator),
          level: v.number(),
          grade: v.optional(v.string()),
          tasks: v.array(taskCodeValidator),
          isRequired: v.optional(v.boolean()),
        }),
      ),
    ),
    // Template type used for position initialization
    templateType: v.optional(v.string()),
    // Modules activated for this org (from template defaults)
    modules: v.optional(v.array(moduleCodeValidator)),
  },
  handler: async (ctx, args) => {
    // Check slug uniqueness
    const existing = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existing) {
      throw error(ErrorCode.ORG_SLUG_EXISTS);
    }

    const { positions, templateType, modules, ...orgData } = args;

    const orgId = await ctx.db.insert("orgs", {
      ...orgData,
      modules: modules,
      isActive: true,
      updatedAt: Date.now(),
    });

    // Add creator as member (position assigned separately)
    await ctx.db.insert("memberships", {
      orgId,
      userId: ctx.user._id,
    });

    // Create positions from template/edited list
    if (positions && positions.length > 0) {
      const now = Date.now();
      for (const pos of positions) {
        await ctx.db.insert("positions", {
          orgId,
          code: pos.code,
          title: pos.title,
          description: pos.description,
          level: pos.level,
          grade: pos.grade,
          tasks: pos.tasks,
          isRequired: pos.isRequired ?? false,
          isActive: true,
          createdBy: ctx.user._id,
          updatedAt: now,
        });
      }
    }

    await logCortexAction(ctx, {
      action: "CREATE_ORG",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "orgs",
      entiteId: orgId,
      userId: ctx.user._id,
      apres: { name: args.name, slug: args.slug, type: args.type },
      signalType: SIGNAL_TYPES.ORG_CREEE,
    });

    return orgId;
  },
});

/**
 * Update organization details
 */
export const update = authMutation({
  args: {
    orgId: v.id("orgs"),
    name: v.optional(v.string()),
    address: v.optional(addressValidator),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    description: v.optional(v.string()),
    timezone: v.optional(v.string()),
    settings: v.optional(orgSettingsValidator),
    logoUrl: v.optional(v.string()),
    jurisdictionCountries: v.optional(v.array(countryCodeValidator)),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage");

    const { orgId, ...updates } = args;

    // Filter out undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined),
    );

    await ctx.db.patch(orgId, {
      ...cleanUpdates,
      updatedAt: Date.now(),
    });

    await logCortexAction(ctx, {
      action: "UPDATE_ORG",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "orgs",
      entiteId: orgId,
      userId: ctx.user._id,
      apres: cleanUpdates,
      signalType: SIGNAL_TYPES.ORG_MODIFIEE,
    });

    return orgId;
  },
});

/**
 * Get organization members
 */
export const getMembers = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_org_deletedAt", (q) => q.eq("orgId", args.orgId).eq("deletedAt", undefined))
      .collect();

    const activeMembers = memberships;

    // Batch fetch users
    const userIds = [...new Set(activeMembers.map((m) => m.userId))];
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u!]));

    // Batch fetch positions
    const positionIds = [
      ...new Set(activeMembers.map((m) => m.positionId).filter((id) => id !== undefined)),
    ] as NonNullable<typeof activeMembers[0]["positionId"]>[];
    const positions = await Promise.all(
      positionIds.map((id) => ctx.db.get(id)),
    );
    const positionMap = new Map(
      positions.filter(Boolean).map((p) => [p!._id, p!]),
    );

    return activeMembers
      .map((membership) => {
        const user = userMap.get(membership.userId);
        if (!user) return null;
        const positionTitle = membership.positionId
          ? (positionMap.get(membership.positionId) as any)?.title
          : undefined;

        return {
          ...user,
          membershipId: membership._id,
          positionId: membership.positionId,
          positionTitle,
          joinedAt: membership._creationTime,
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
  },
});

/**
 * List diplomatic members of a specific org with enriched profiles.
 * Used by team page (chef de mission view) and backoffice org detail.
 * Requires team.view permission.
 */
export const listOrgDiplomaticMembers = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const callerMembership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, callerMembership, "team.view");

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    const activeMembers = memberships.filter((m) => !m.deletedAt && m.positionId);

    const enriched = await Promise.all(
      activeMembers.map(async (m) => {
        const [user, position] = await Promise.all([
          ctx.db.get(m.userId),
          m.positionId ? ctx.db.get(m.positionId) : null,
        ]);

        return {
          membershipId: m._id,
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
                _id: position._id,
                code: position.code,
                title: position.title,
                grade: position.grade,
                level: position.level,
              }
            : null,
        };
      }),
    );

    return enriched.filter((m) => m.user !== null);
  },
});

/**
 * Get org chart data: positions with occupants + unassigned members.
 * Used by the team/org chart page.
 */
export const getOrgChart = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "org.view");

    // 1. Get all positions for this org
    const positions = await ctx.db
      .query("positions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // 2. Get all active memberships for this org
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_org_deletedAt", (q) => q.eq("orgId", args.orgId).eq("deletedAt", undefined))
      .collect();
    const activeMembers = memberships;

    // 3. Batch fetch users
    const userIds = [...new Set(activeMembers.map((m) => m.userId))];
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u!]));

    // Build map of active position IDs to easily check validity
    const activePositionIds = new Set(positions.map((p) => p._id as string));

    // 4. Build a map: positionId → array of membership+user
    const validPositionIds = new Set(positions.map((p) => p._id));
    const positionOccupants = new Map<
      string,
      Array<{ membership: typeof activeMembers[0]; user: NonNullable<typeof users[0]> }>
    >();
    const assignedMembershipIds = new Set<string>();

    for (const m of activeMembers) {
      if (m.positionId && validPositionIds.has(m.positionId as any)) {
        const user = userMap.get(m.userId);
        if (user) {
          const posId = m.positionId as string;
          if (!positionOccupants.has(posId)) {
            positionOccupants.set(posId, []);
          }
          positionOccupants.get(posId)!.push({ membership: m, user });
          assignedMembershipIds.add(m._id as string);
        }
      }
    }

    // 5. Build position list with occupants
    const positionsWithOccupants = positions
      .sort((a, b) => (a.level ?? 99) - (b.level ?? 99))
      .map((pos) => {
        const occupantsData = positionOccupants.get(pos._id as string) || [];
        const occupants = occupantsData.map(occ => ({
          userId: occ.user._id,
          name: occ.user.name,
          firstName: occ.user.firstName,
          lastName: occ.user.lastName,
          email: occ.user.email,
          avatarUrl: occ.user.avatarUrl,
          membershipId: occ.membership._id,
        }));
        return {
          _id: pos._id,
          code: pos.code,
          title: pos.title,
          description: pos.description,
          level: pos.level,
          grade: pos.grade,
          isRequired: pos.isRequired,
          tasks: pos.tasks,
          occupants: occupants,
          // Keep occupant for backwards compatibility temporarily
          occupant: occupants.length > 0 ? occupants[0] : null,
        };
      });

    // 6. Unassigned members (members without a positionId)
    const unassignedMembers = activeMembers
      .filter((m) => !assignedMembershipIds.has(m._id as string))
      .map((m) => {
        const user = userMap.get(m.userId);
        if (!user) return null;
        return {
          userId: user._id,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          avatarUrl: user.avatarUrl,
          membershipId: m._id,
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);

    return {
      positions: positionsWithOccupants,
      unassignedMembers,
      totalPositions: positions.length,
      filledPositions: positionOccupants.size,
      vacantPositions: positions.length - positionOccupants.size,
    };
  },
});

/**
 * Add member to organization
 */
export const addMember = authMutation({
  args: {
    orgId: v.id("orgs"),
    userId: v.id("users"),
    positionId: v.optional(v.id("positions")),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage");

    // Check if already member
    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_user_org_deletedAt", (q) =>
        q.eq("userId", args.userId).eq("orgId", args.orgId).eq("deletedAt", undefined),
      )
      .unique();

    if (existing) {
      throw error(ErrorCode.MEMBER_ALREADY_EXISTS);
    }

    // Validate position belongs to org if provided
    if (args.positionId) {
      const position = await ctx.db.get(args.positionId);
      if (!position || position.orgId !== args.orgId) {
        throw error(ErrorCode.POSITION_NOT_FOUND);
      }

      // Unassign any existing holder ONLY if the position is unique
      if (position.isUnique) {
        const existingHolder = await ctx.db
          .query("memberships")
          .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
          .filter((q) =>
            q.and(
              q.eq(q.field("positionId"), args.positionId),
              q.eq(q.field("deletedAt"), undefined),
            ),
          )
          .first();

        if (existingHolder) {
          await ctx.db.patch(existingHolder._id, { positionId: undefined });
        }
      }
    }

    return await ctx.db.insert("memberships", {
      orgId: args.orgId,
      userId: args.userId,
      positionId: args.positionId,
    });
  },
});

// updateMemberRole — REMOVED: use assignPosition instead (position-based permissions)

/**
 * Assign a position to a member (or remove position assignment)
 */
export const assignMemberPosition = authMutation({
  args: {
    orgId: v.id("orgs"),
    membershipId: v.id("memberships"),
    positionId: v.optional(v.union(v.id("positions"), v.null())),
  },
  handler: async (ctx, args) => {
    const callerMembership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, callerMembership, "settings.manage");

    const membership = await ctx.db.get(args.membershipId);
    if (!membership || membership.orgId !== args.orgId || membership.deletedAt) {
      throw error(ErrorCode.MEMBER_NOT_FOUND);
    }

    // Normaliser null → undefined (retirer la position)
    const positionId = args.positionId ?? undefined;

    // If assigning a position, validate it belongs to this org
    if (positionId) {
      const position = await ctx.db.get(positionId);
      if (!position || position.orgId !== args.orgId) {
        throw new Error("Position not found in this organization");
      }

      // Check if another member already holds this position, ONLY if unique
      if (position.isUnique) {
        const existingHolder = await ctx.db
          .query("memberships")
          .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
          .filter((q) =>
            q.and(
              q.eq(q.field("positionId"), positionId),
              q.eq(q.field("deletedAt"), undefined),
              q.neq(q.field("_id"), args.membershipId),
            ),
          )
          .first();

        if (existingHolder) {
          // Unassign the previous holder
          await ctx.db.patch(existingHolder._id, { positionId: undefined });
        }
      }
    }

    await ctx.db.patch(args.membershipId, { positionId });
    return args.membershipId;
  },
});

/**
 * Remove member from organization
 */
export const removeMember = authMutation({
  args: {
    orgId: v.id("orgs"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const callerMembership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, callerMembership, "settings.manage");

    // Cannot remove self
    if (ctx.user._id === args.userId) {
      throw error(ErrorCode.CANNOT_REMOVE_SELF);
    }

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org_deletedAt", (q) =>
        q.eq("userId", args.userId).eq("orgId", args.orgId).eq("deletedAt", undefined),
      )
      .unique();

    if (!membership) {
      throw error(ErrorCode.MEMBER_NOT_FOUND);
    }

    // Soft delete
    await ctx.db.patch(membership._id, { deletedAt: Date.now() });
    return true;
  },
});

/**
 * Get organization stats — uses Aggregate for O(log n) counts.
 */
export const getStats = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "org.view");

    const ns = args.orgId as string;

    // All counts via Aggregate component — O(log n) each
    const [memberCount, pendingRequests, activeServices, scheduledAppointments] =
      await Promise.all([
        membershipsByOrg.count(ctx, { namespace: ns }),
        requestsByOrg.count(ctx, {
          namespace: ns,
          bounds: { prefix: [RequestStatus.Pending] },
        }),
        orgServicesByOrg.count(ctx, {
          namespace: ns,
          bounds: { eq: 1 }, // isActive = true → sortKey = 1
        }),
        appointmentsByOrg.count(ctx, {
          namespace: ns,
          bounds: { prefix: ["scheduled"] },
        }),
      ]);

    return {
      memberCount,
      pendingRequests,
      activeServices,
      upcomingAppointments: scheduledAppointments,
      updatedAt: Date.now(),
    };
  },
});

/**
 * Check if the current user can manage org settings (admin-level)
 */
export const isUserAdmin = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    if (ctx.user.isSuperadmin) return true;

    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    return await canDoTask(ctx, ctx.user, membership, "settings.manage");
  },
});

/**
 * Get current user's position in the organization
 */
export const getMyPosition = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org_deletedAt", (q) =>
        q.eq("userId", ctx.user._id).eq("orgId", args.orgId).eq("deletedAt", undefined),
      )
      .unique();

    if (!membership?.positionId) return null;

    const position = await ctx.db.get(membership.positionId);
    if (!position || !position.isActive) return null;

    return {
      positionId: position._id,
      code: position.code,
      title: position.title,
      level: position.level,
      grade: position.grade,
    };
  },
});

/**
 * Create a new user account (invite flow)
 */
export const createAccount = authMutation({
  args: {
    orgId: v.id("orgs"),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
  },
  handler: async (ctx, args) => {
    const callerMembership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, callerMembership, "settings.manage");

    const { email, firstName, lastName } = args;
    const name = `${firstName} ${lastName}`;

    // Call helper directly to avoid circular dependency
    const userId = await createInvitedUserHelper(
      ctx,
      email,
      name,
      firstName,
      lastName,
    );

    return { userId };
  },
});
