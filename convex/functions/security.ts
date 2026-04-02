import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { backofficeQuery } from "../lib/customFunctions";
import { requireAuth } from "../lib/auth";
import { isSuperAdmin } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";

// ═══════════════════════════════════════════════════════════════
// SECURITY POLICIES
// ═══════════════════════════════════════════════════════════════

/**
 * List all security policies for an organization.
 * Protected: requires back-office access (SuperAdmin, AdminSystem, or Admin).
 */
export const listPolicies = backofficeQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, { orgId }) => {
    const policies = await ctx.db
      .query("securityPolicies")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    return policies.filter((p: any) => p.isActive && !p.deletedAt);
  },
});

/**
 * Get a single security policy.
 * Protected: requires back-office access.
 */
export const getPolicy = backofficeQuery({
  args: { id: v.id("securityPolicies") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Create or update a security policy
 */
export const upsertPolicy = mutation({
  args: {
    orgId: v.id("orgs"),
    name: v.string(),
    // Authentication
    mfaRequired: v.optional(v.boolean()),
    mfaMethod: v.optional(v.union(v.literal("totp"), v.literal("sms"), v.literal("email"))),
    // Password policy
    passwordMinLength: v.optional(v.number()),
    passwordRequireUppercase: v.optional(v.boolean()),
    passwordRequireNumbers: v.optional(v.boolean()),
    passwordRequireSpecial: v.optional(v.boolean()),
    passwordExpirationDays: v.optional(v.number()),
    passwordHistoryCount: v.optional(v.number()),
    // Sessions
    sessionMaxDurationMinutes: v.optional(v.number()),
    sessionIdleTimeoutMinutes: v.optional(v.number()),
    maxConcurrentSessions: v.optional(v.number()),
    // IP restrictions
    ipWhitelist: v.optional(v.array(v.string())),
    ipBlacklist: v.optional(v.array(v.string())),
    // Lockout
    maxLoginAttempts: v.optional(v.number()),
    lockoutDurationMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    if (!isSuperAdmin(user)) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    const now = Date.now();
    const { orgId, name, ...policyFields } = args;

    // Check for existing policy with same name
    const existing = await ctx.db
      .query("securityPolicies")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const match = existing.find(
      (p: any) => p.name === name && p.isActive && !p.deletedAt,
    );

    if (match) {
      await ctx.db.patch(match._id, {
        ...policyFields,
        updatedAt: now,
      });
      return match._id;
    }

    return await ctx.db.insert("securityPolicies", {
      orgId,
      name,
      ...policyFields,
      isActive: true,
      createdBy: user._id,
      updatedAt: now,
    });
  },
});

/**
 * Remove a security policy (soft delete)
 */
export const removePolicy = mutation({
  args: { id: v.id("securityPolicies") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    if (!isSuperAdmin(user)) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw error(ErrorCode.POLICY_NOT_FOUND);
    }

    await ctx.db.patch(args.id, {
      isActive: false,
      deletedAt: Date.now(),
    });

    return true;
  },
});

// ═══════════════════════════════════════════════════════════════
// MAINTENANCE CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/**
 * Get maintenance config (global — single record)
 */
export const getMaintenanceConfig = query({
  args: {},
  handler: async (ctx) => {
    // maintenanceConfig has no org index — it's a global single record
    const configs = await ctx.db.query("maintenanceConfig").take(10);
    return configs[0] ?? null;
  },
});

/**
 * Toggle maintenance mode
 */
export const toggleMaintenanceMode = mutation({
  args: {
    isEnabled: v.boolean(),
    maintenanceMessage: v.optional(v.string()),
    maintenanceEndEstimate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    if (!isSuperAdmin(user)) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    const now = Date.now();

    const configs = await ctx.db.query("maintenanceConfig").take(10);
    const existing = configs[0];

    if (existing) {
      await ctx.db.patch(existing._id, {
        isMaintenanceMode: args.isEnabled,
        maintenanceMessage: args.maintenanceMessage,
        maintenanceEndEstimate: args.maintenanceEndEstimate,
        ...(args.isEnabled ? { maintenanceStartedAt: now, startedBy: user._id } : {}),
        updatedAt: now,
        updatedBy: user._id,
      });
      return existing._id;
    }

    return await ctx.db.insert("maintenanceConfig", {
      isMaintenanceMode: args.isEnabled,
      maintenanceMessage: args.maintenanceMessage,
      maintenanceEndEstimate: args.maintenanceEndEstimate,
      ...(args.isEnabled ? { maintenanceStartedAt: now, startedBy: user._id } : {}),
      updatedAt: now,
      updatedBy: user._id,
    });
  },
});

/**
 * Update scheduled tasks config
 */
export const updateScheduledTasks = mutation({
  args: {
    scheduledTasks: v.array(
      v.object({
        key: v.string(),
        label: v.string(),
        schedule: v.string(),
        isEnabled: v.boolean(),
        lastRun: v.optional(v.number()),
        nextRun: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    if (!isSuperAdmin(user)) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    const now = Date.now();

    const configs = await ctx.db.query("maintenanceConfig").take(10);
    const existing = configs[0];

    if (existing) {
      await ctx.db.patch(existing._id, {
        scheduledTasks: args.scheduledTasks,
        updatedAt: now,
        updatedBy: user._id,
      });
      return existing._id;
    }

    return await ctx.db.insert("maintenanceConfig", {
      isMaintenanceMode: false,
      scheduledTasks: args.scheduledTasks,
      updatedAt: now,
      updatedBy: user._id,
    });
  },
});
