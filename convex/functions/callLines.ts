import { v } from "convex/values";
import { query } from "../_generated/server";
import { authQuery, authMutation, backofficeQuery } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";
import { TaskCode } from "../lib/taskCodes";

// ============================================
// QUERIES
// ============================================

/**
 * List active call lines for an organization (public — for citizens selecting a line).
 * Returns both org and personal lines.
 */
export const listByOrg = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const lines = await ctx.db
      .query("callLines")
      .withIndex("by_org_active", (q) =>
        q.eq("orgId", args.orgId).eq("isActive", true),
      )
      .collect();

    // Sort by priority, then by label
    lines.sort((a, b) => a.priority - b.priority || a.label.localeCompare(b.label));

    return lines;
  },
});

/**
 * List call lines for agent management (requires meetings.manage permission).
 * Includes inactive lines.
 */
export const listForAdmin = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.meetings.manage);

    const lines = await ctx.db
      .query("callLines")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    // Enrich with agent info
    const enriched = await Promise.all(
      lines.map(async (line) => {
        const agents = await Promise.all(
          line.membershipIds.map(async (mId) => {
            const m = await ctx.db.get(mId);
            if (!m || m.deletedAt) return null;
            const user = await ctx.db.get(m.userId);
            if (!user) return null;
            return {
              membershipId: m._id,
              userId: user._id,
              name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Inconnu",
              avatarUrl: user.avatarUrl,
            };
          }),
        );
        return { ...line, agents: agents.filter(Boolean) };
      }),
    );

    enriched.sort((a, b) => a.priority - b.priority);
    return enriched;
  },
});

/**
 * Get a single call line by ID.
 */
export const get = query({
  args: { callLineId: v.id("callLines") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.callLineId);
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Create a new org call line.
 */
export const create = authMutation({
  args: {
    orgId: v.id("orgs"),
    label: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    priority: v.optional(v.number()),
    isDefault: v.optional(v.boolean()),
    membershipIds: v.optional(v.array(v.id("memberships"))),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.meetings.manage);

    // If making this the default, unset any existing default
    if (args.isDefault) {
      const existingDefault = await ctx.db
        .query("callLines")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .filter((q) => q.eq(q.field("isDefault"), true))
        .first();
      if (existingDefault) {
        await ctx.db.patch(existingDefault._id, { isDefault: false });
      }
    }

    // Count existing lines to set priority
    const existingLines = await ctx.db
      .query("callLines")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    return await ctx.db.insert("callLines", {
      type: "org",
      orgId: args.orgId,
      label: args.label,
      description: args.description,
      icon: args.icon,
      color: args.color,
      priority: args.priority ?? existingLines.length + 1,
      isDefault: args.isDefault,
      isActive: true,
      membershipIds: args.membershipIds ?? [],
    });
  },
});

/**
 * Update a call line.
 */
export const update = authMutation({
  args: {
    callLineId: v.id("callLines"),
    label: v.optional(v.string()),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    priority: v.optional(v.number()),
    isDefault: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const line = await ctx.db.get(args.callLineId);
    if (!line) throw error(ErrorCode.NOT_FOUND, "Ligne non trouvée");

    const membership = await getMembership(ctx, ctx.user._id, line.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.meetings.manage);

    // If making default, unset any existing default
    if (args.isDefault) {
      const existingDefault = await ctx.db
        .query("callLines")
        .withIndex("by_org", (q) => q.eq("orgId", line.orgId))
        .filter((q) =>
          q.and(
            q.eq(q.field("isDefault"), true),
            q.neq(q.field("_id"), args.callLineId),
          ),
        )
        .first();
      if (existingDefault) {
        await ctx.db.patch(existingDefault._id, { isDefault: false });
      }
    }

    const { callLineId, ...updates } = args;
    const clean = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined),
    );

    await ctx.db.patch(callLineId, clean);
  },
});

/**
 * Delete a call line (only org lines, not personal).
 */
export const remove = authMutation({
  args: { callLineId: v.id("callLines") },
  handler: async (ctx, args) => {
    const line = await ctx.db.get(args.callLineId);
    if (!line) throw error(ErrorCode.NOT_FOUND, "Ligne non trouvée");

    if (line.type === "personal") {
      throw error(ErrorCode.INVALID_ARGUMENT, "Les lignes personnelles ne peuvent pas être supprimées manuellement");
    }

    const membership = await getMembership(ctx, ctx.user._id, line.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.meetings.manage);

    await ctx.db.delete(args.callLineId);
  },
});

/**
 * Add an agent to an org call line.
 */
export const addAgent = authMutation({
  args: {
    callLineId: v.id("callLines"),
    membershipId: v.id("memberships"),
  },
  handler: async (ctx, args) => {
    const line = await ctx.db.get(args.callLineId);
    if (!line) throw error(ErrorCode.NOT_FOUND, "Ligne non trouvée");

    const membership = await getMembership(ctx, ctx.user._id, line.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.meetings.manage);

    // Validate the target membership belongs to the same org
    const targetMembership = await ctx.db.get(args.membershipId);
    if (!targetMembership || targetMembership.orgId !== line.orgId || targetMembership.deletedAt) {
      throw error(ErrorCode.INVALID_ARGUMENT, "Membre invalide");
    }

    // Don't add duplicates
    if (line.membershipIds.includes(args.membershipId)) return;

    await ctx.db.patch(args.callLineId, {
      membershipIds: [...line.membershipIds, args.membershipId],
    });
  },
});

/**
 * Remove an agent from an org call line.
 */
export const removeAgent = authMutation({
  args: {
    callLineId: v.id("callLines"),
    membershipId: v.id("memberships"),
  },
  handler: async (ctx, args) => {
    const line = await ctx.db.get(args.callLineId);
    if (!line) throw error(ErrorCode.NOT_FOUND, "Ligne non trouvée");

    const membership = await getMembership(ctx, ctx.user._id, line.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.meetings.manage);

    await ctx.db.patch(args.callLineId, {
      membershipIds: line.membershipIds.filter((id) => id !== args.membershipId),
    });
  },
});

/**
 * Replace the entire membershipIds array for a call line in one operation.
 */
export const updateAgents = authMutation({
  args: {
    callLineId: v.id("callLines"),
    membershipIds: v.array(v.id("memberships")),
  },
  handler: async (ctx, args) => {
    const line = await ctx.db.get(args.callLineId);
    if (!line) throw error(ErrorCode.NOT_FOUND, "Ligne non trouvée");

    const membership = await getMembership(ctx, ctx.user._id, line.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.meetings.manage);

    // Validate all memberships belong to the same org
    for (const mId of args.membershipIds) {
      const m = await ctx.db.get(mId);
      if (!m || m.orgId !== line.orgId || m.deletedAt) {
        throw error(ErrorCode.INVALID_ARGUMENT, "Membre invalide ou supprimé");
      }
    }

    await ctx.db.patch(args.callLineId, {
      membershipIds: args.membershipIds,
    });
  },
});

// ============================================
// BACKOFFICE QUERIES (SuperAdmin / AdminSystem)
// ============================================

/**
 * List call lines for superadmin — no membership required.
 */
export const listForSuperAdmin = backofficeQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const lines = await ctx.db
      .query("callLines")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    const enriched = await Promise.all(
      lines.map(async (line) => {
        const agents = await Promise.all(
          line.membershipIds.map(async (mId) => {
            const m = await ctx.db.get(mId);
            if (!m || m.deletedAt) return null;
            const user = await ctx.db.get(m.userId);
            if (!user) return null;
            return {
              membershipId: m._id,
              userId: user._id,
              name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Inconnu",
              avatarUrl: user.avatarUrl,
            };
          }),
        );
        return { ...line, agents: agents.filter(Boolean) };
      }),
    );

    enriched.sort((a, b) => a.priority - b.priority);
    return enriched;
  },
});

/**
 * Call statistics for an organization (backoffice KPI).
 */
export const callStats = backofficeQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    // Count call lines
    const lines = await ctx.db
      .query("callLines")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    // Count calls (meetings with type=call)
    const calls = await ctx.db
      .query("meetings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    const callOnly = calls.filter((m) => m.type === "call");
    const totalCalls = callOnly.length;
    const activeCalls = callOnly.filter(
      (m) =>
        m.status === "active" &&
        (!m.callStatus || ["initiating", "ringing", "connected", "on_hold"].includes(m.callStatus)),
    ).length;
    const missedCalls = callOnly.filter((m) => m.callStatus === "missed").length;

    // Online agents
    const presenceRecords = await ctx.db
      .query("agentPresence")
      .withIndex("by_org_and_status", (q) =>
        q.eq("orgId", args.orgId).eq("status", "online"),
      )
      .collect();

    return {
      totalCalls,
      activeCalls,
      missedCalls,
      totalLines: lines.length,
      activeLines: lines.filter((l) => l.isActive).length,
      onlineAgents: presenceRecords.length,
    };
  },
});
