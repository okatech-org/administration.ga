/**
 * Agent Presence Store — heartbeat UI + cleanup.
 *
 * L'UI pousse toutes les 1-5s le contexte courant :
 *   { route, entityType, entityId, focusedField, currentAction }
 *
 * Le backend peut ensuite interroger "qui regarde quoi" pour pousser
 * des suggestions proactives pertinentes en quasi temps-reel.
 *
 * Les rows sont supprimees via cron si > 5 min sans heartbeat.
 */

import { v } from "convex/values";
import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { requireAuth, getMembership } from "../lib/auth";
import { error, ErrorCode } from "../lib/errors";
import type { Doc } from "../_generated/dataModel";

const HEARTBEAT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const heartbeat = mutation({
  args: {
    orgId: v.id("orgs"),
    route: v.string(),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    focusedField: v.optional(v.string()),
    currentAction: v.optional(v.string()),
    clientType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const membership = await getMembership(ctx, user._id, args.orgId);
    if (!membership) throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);

    const existing = await ctx.db
      .query("aiAgentPresence")
      .withIndex("by_membership", (q) => q.eq("membershipId", membership._id))
      .unique();

    const patch = {
      membershipId: membership._id,
      userId: user._id,
      orgId: args.orgId,
      route: args.route,
      entityType: args.entityType,
      entityId: args.entityId,
      focusedField: args.focusedField,
      currentAction: args.currentAction,
      clientType: args.clientType,
      lastHeartbeatAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return await ctx.db.insert("aiAgentPresence", patch);
  },
});

/** Efface la presence de l'utilisateur (a l'onbeforeunload cote UI). */
export const clearMyPresence = mutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, { orgId }) => {
    const user = await requireAuth(ctx);
    const membership = await getMembership(ctx, user._id, orgId);
    if (!membership) return;

    const existing = await ctx.db
      .query("aiAgentPresence")
      .withIndex("by_membership", (q) => q.eq("membershipId", membership._id))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});

/** Query interne : liste les presences pour un type/ID d'entite. */
export const getPresenceForEntityInternal = internalQuery({
  args: {
    orgId: v.id("orgs"),
    entityType: v.string(),
    entityId: v.string(),
  },
  handler: async (ctx, { orgId, entityType, entityId }) => {
    const cutoff = Date.now() - HEARTBEAT_TTL_MS;
    const rows = await ctx.db
      .query("aiAgentPresence")
      .withIndex("by_org_entity", (q) =>
        q.eq("orgId", orgId).eq("entityType", entityType).eq("entityId", entityId),
      )
      .collect();
    return rows.filter((r) => r.lastHeartbeatAt >= cutoff);
  },
});

/** Query interne : un membership a-t-il un heartbeat recent ? */
export const getPresenceForMembershipInternal = internalQuery({
  args: { membershipId: v.id("memberships") },
  handler: async (ctx, { membershipId }): Promise<Doc<"aiAgentPresence"> | null> => {
    const row = await ctx.db
      .query("aiAgentPresence")
      .withIndex("by_membership", (q) => q.eq("membershipId", membershipId))
      .unique();
    if (!row) return null;
    const cutoff = Date.now() - HEARTBEAT_TTL_MS;
    if (row.lastHeartbeatAt < cutoff) return null;
    return row;
  },
});

/** Cron : purge les presences obsoletes (> 5 min). */
export const cleanupStalePresencesInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - HEARTBEAT_TTL_MS;
    const stale = await ctx.db
      .query("aiAgentPresence")
      .withIndex("by_heartbeat", (q) => q.lt("lastHeartbeatAt", cutoff))
      .collect();

    let deleted = 0;
    for (const row of stale) {
      await ctx.db.delete(row._id);
      deleted++;
    }
    return { deleted };
  },
});
