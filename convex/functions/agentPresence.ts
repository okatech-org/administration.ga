import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { authMutation, authQuery } from "../lib/customFunctions";

/**
 * Agent sends a heartbeat to keep their presence alive.
 * Called every 30s from agent-web / agent-desktop.
 * Upserts the agentPresence row for (userId, orgId).
 */
export const heartbeat = authMutation({
  args: {
    orgId: v.id("orgs"),
    currentCallId: v.optional(v.id("meetings")),
    clientType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const status = args.currentCallId ? "busy" as const : "online" as const;

    // Upsert: find existing row or create new
    const existing = await ctx.db
      .query("agentPresence")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", ctx.user._id).eq("orgId", args.orgId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status,
        lastHeartbeat: now,
        lastActivity: now,
        currentCallId: args.currentCallId,
        clientType: args.clientType,
      });
    } else {
      await ctx.db.insert("agentPresence", {
        userId: ctx.user._id,
        orgId: args.orgId,
        status,
        lastHeartbeat: now,
        lastActivity: now,
        currentCallId: args.currentCallId,
        clientType: args.clientType,
      });
    }
  },
});

/**
 * Agent explicitly goes offline (called on beforeunload / tab close).
 */
export const setOffline = authMutation({
  args: {
    orgId: v.id("orgs"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("agentPresence")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", ctx.user._id).eq("orgId", args.orgId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "offline",
        currentCallId: undefined,
      });
    }
  },
});

/**
 * List online agents for an organization.
 * Returns agents with status !== "offline".
 */
export const listOnlineAgents = authQuery({
  args: {
    orgId: v.id("orgs"),
  },
  handler: async (ctx, args) => {
    // Get online agents
    const online = await ctx.db
      .query("agentPresence")
      .withIndex("by_org_and_status", (q) =>
        q.eq("orgId", args.orgId).eq("status", "online"),
      )
      .take(100);

    // Get busy agents
    const busy = await ctx.db
      .query("agentPresence")
      .withIndex("by_org_and_status", (q) =>
        q.eq("orgId", args.orgId).eq("status", "busy"),
      )
      .take(100);

    // Get away agents
    const away = await ctx.db
      .query("agentPresence")
      .withIndex("by_org_and_status", (q) =>
        q.eq("orgId", args.orgId).eq("status", "away"),
      )
      .take(100);

    return {
      online,
      busy,
      away,
      totalAvailable: online.length + busy.length + away.length,
    };
  },
});

/**
 * Get the count of available agents for an org (for citizen-facing UI).
 * Public query — no org membership required.
 */
export const countAvailableAgents = authQuery({
  args: {
    orgId: v.id("orgs"),
  },
  handler: async (ctx, args) => {
    const online = await ctx.db
      .query("agentPresence")
      .withIndex("by_org_and_status", (q) =>
        q.eq("orgId", args.orgId).eq("status", "online"),
      )
      .take(100);

    return online.length;
  },
});

// ============================================
// INTERNAL: Presence cleanup (called by cron)
// ============================================

/** Agents with no heartbeat for 90s are considered offline. */
const HEARTBEAT_TIMEOUT_MS = 90_000;

/**
 * Cron job: mark agents as offline if their heartbeat is stale.
 * Scans all presence rows — fine at moderate scale (< 1000 agents).
 */
export const cleanupStalePresence = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - HEARTBEAT_TIMEOUT_MS;

    const allPresence = await ctx.db
      .query("agentPresence")
      .take(500);

    for (const p of allPresence) {
      if (p.status !== "offline" && p.lastHeartbeat < cutoff) {
        await ctx.db.patch(p._id, {
          status: "offline",
          currentCallId: undefined,
        });
      }
    }
  },
});
