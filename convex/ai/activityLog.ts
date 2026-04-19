/**
 * AI Activity Log — append-only audit & coût.
 *
 * CRITIQUE : aucune mutation publique ici. Seul `appendLogInternal`
 * (internalMutation) peut inserer, appelee depuis `proactiveAgent.ts`,
 * des capability handlers, et les mutations d'application de suggestions.
 *
 * Queries publiques :
 *   - getActivityForMembership(membershipId, range) — feed user
 *   - getActivityForOrg(orgId, range) — backoffice audit
 *   - getDailyCostForOrg(orgId, date) — controle de budget
 */

import { v } from "convex/values";
import {
  internalMutation,
  query,
  internalQuery,
} from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { getMembership } from "../lib/auth";
import { error, ErrorCode } from "../lib/errors";

const actionValidator = v.union(
  v.literal("proposed"),
  v.literal("accepted"),
  v.literal("dismissed"),
  v.literal("auto_applied"),
  v.literal("expired"),
  v.literal("undone"),
  v.literal("errored"),
  v.literal("rate_limited"),
  v.literal("budget_exceeded"),
  v.literal("blocked"),
);

export const appendLogInternal = internalMutation({
  args: {
    orgId: v.id("orgs"),
    membershipId: v.optional(v.id("memberships")),
    userId: v.optional(v.id("users")),
    suggestionId: v.optional(v.id("aiSuggestions")),
    capabilityCode: v.string(),
    action: actionValidator,
    model: v.optional(v.string()),
    latencyMs: v.optional(v.number()),
    tokensIn: v.optional(v.number()),
    tokensOut: v.optional(v.number()),
    costMicroCents: v.optional(v.number()),
    error: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("aiActivityLog", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

/** Somme des couts pour une org sur un jour UTC (depuis minuit UTC). */
export const getDailyCostForOrgInternal = internalQuery({
  args: {
    orgId: v.id("orgs"),
    /** Timestamp representant le jour. Si omis : maintenant. */
    atTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, { orgId, atTimestamp }) => {
    const now = atTimestamp ?? Date.now();
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const rows = await ctx.db
      .query("aiActivityLog")
      .withIndex("by_org_timestamp", (q) =>
        q.eq("orgId", orgId).gte("timestamp", startOfDay.getTime()),
      )
      .collect();

    let totalMicroCents = 0;
    let callsCount = 0;
    for (const row of rows) {
      if (row.costMicroCents) totalMicroCents += row.costMicroCents;
      callsCount++;
    }
    return { totalMicroCents, callsCount };
  },
});

/** Activity feed pour un membership (pagine par timestamp desc). */
export const getActivityForMembership = query({
  args: {
    limit: v.optional(v.number()),
    sinceTimestamp: v.optional(v.number()),
    capabilityCode: v.optional(v.string()),
    action: v.optional(actionValidator),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw error(ErrorCode.NOT_AUTHENTICATED);

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user_org_deletedAt", (q) => q.eq("userId", user._id))
      .collect();

    if (memberships.length === 0) return [];

    const activeMembership = memberships.find((m) => !m.deletedAt);
    if (!activeMembership) return [];

    await assertCanDoTask(ctx, user, activeMembership, "ai_assistant.audit");

    const since = args.sinceTimestamp ?? 0;
    const limit = args.limit ?? 50;

    const rows = await ctx.db
      .query("aiActivityLog")
      .withIndex("by_membership_timestamp", (q) =>
        q.eq("membershipId", activeMembership._id).gte("timestamp", since),
      )
      .order("desc")
      .take(limit);

    return rows.filter((r) => {
      if (args.capabilityCode && r.capabilityCode !== args.capabilityCode) return false;
      if (args.action && r.action !== args.action) return false;
      return true;
    });
  },
});

/** Activity feed pour un orgId — necessite ai_assistant.admin */
export const getActivityForOrg = query({
  args: {
    orgId: v.id("orgs"),
    limit: v.optional(v.number()),
    sinceTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, { orgId, limit, sinceTimestamp }) => {
    const user = await requireAuth(ctx);
    const membership = await getMembership(ctx, user._id, orgId);
    await assertCanDoTask(ctx, user, membership, "ai_assistant.admin");

    const since = sinceTimestamp ?? 0;
    return await ctx.db
      .query("aiActivityLog")
      .withIndex("by_org_timestamp", (q) =>
        q.eq("orgId", orgId).gte("timestamp", since),
      )
      .order("desc")
      .take(limit ?? 100);
  },
});
