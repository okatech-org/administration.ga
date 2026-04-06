import { v } from "convex/values";
import { authQuery, authMutation } from "../lib/customFunctions";

// ═══════════════════════════════════════════════════════════════
// User Preferences — notification channels, language, analytics
// ═══════════════════════════════════════════════════════════════

/**
 * Get current user's preferences
 */
export const getMyPreferences = authQuery({
  args: {},
  handler: async (ctx) => {
    return ctx.user.preferences ?? {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      language: "fr" as const,
      shareAnalytics: true,
    };
  },
});

/**
 * Update current user's preferences (partial patch)
 */
export const updateMyPreferences = authMutation({
  args: {
    emailNotifications: v.optional(v.boolean()),
    pushNotifications: v.optional(v.boolean()),
    smsNotifications: v.optional(v.boolean()),
    whatsappNotifications: v.optional(v.boolean()),
    language: v.optional(v.union(v.literal("fr"), v.literal("en"))),
    shareAnalytics: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const current = ctx.user.preferences ?? {};
    await ctx.db.patch(ctx.user._id, {
      preferences: {
        ...current,
        ...args,
      },
      updatedAt: Date.now(),
    });
    return true;
  },
});

// ═══════════════════════════════════════════════════════════════
// Membership Settings — per-org agent notification preferences
// ═══════════════════════════════════════════════════════════════

/**
 * Get current user's membership settings for a given org
 */
export const getMyMembershipSettings = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", ctx.user._id).eq("orgId", args.orgId),
      )
      .first();

    if (!membership || membership.deletedAt) return null;

    return {
      membershipId: membership._id,
      settings: membership.settings ?? {
        notifyOnNewRequest: true,
        notifyOnAssignment: true,
        dailyDigest: false,
      },
    };
  },
});

/**
 * Update current user's membership settings (partial patch)
 * No special permission needed — users can only modify their own.
 */
export const updateMyMembershipSettings = authMutation({
  args: {
    orgId: v.id("orgs"),
    notifyOnNewRequest: v.optional(v.boolean()),
    notifyOnAssignment: v.optional(v.boolean()),
    dailyDigest: v.optional(v.boolean()),
  },
  handler: async (ctx, { orgId, ...settingsUpdate }) => {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", ctx.user._id).eq("orgId", orgId),
      )
      .first();

    if (!membership || membership.deletedAt) {
      throw new Error("Membership not found");
    }

    const current = membership.settings ?? {};
    await ctx.db.patch(membership._id, {
      settings: {
        ...current,
        ...settingsUpdate,
      },
    });
    return true;
  },
});
