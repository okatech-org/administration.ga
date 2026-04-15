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
    // Legacy scalaire — rétrocompat pour les clients non migrés
    currentCallId: v.optional(v.id("meetings")),
    // Centre d'Appels multi-lignes (Sprint 2+) : tous les slots rejoints
    currentCallIds: v.optional(v.array(v.id("meetings"))),
    // Slot dont l'audio est actuellement publié (0 ou 1)
    activeCallId: v.optional(v.id("meetings")),
    clientType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    // Priorité : activeCallId (multi-call) puis currentCallId (legacy).
    const effectiveActive = args.activeCallId ?? args.currentCallId;
    const effectiveIds =
      args.currentCallIds ??
      (args.currentCallId ? [args.currentCallId] : undefined);
    const status = effectiveActive ? ("busy" as const) : ("online" as const);

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
        currentCallId: effectiveActive,
        currentCallIds: effectiveIds,
        activeCallId: args.activeCallId,
        clientType: args.clientType,
      });
    } else {
      await ctx.db.insert("agentPresence", {
        userId: ctx.user._id,
        orgId: args.orgId,
        status,
        lastHeartbeat: now,
        lastActivity: now,
        currentCallId: effectiveActive,
        currentCallIds: effectiveIds,
        activeCallId: args.activeCallId,
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
          currentCallIds: [],
          activeCallId: undefined,
        });
      }
    }
  },
});

/**
 * Retourne la row presence de l'agent courant pour une org donnée.
 *
 * Utilisé par `IAstedSettingsTab` (Plan Phase β) pour alimenter le
 * `<AgentStatusSelector>` avec le snapshot à jour et détecter le DND actif.
 */
export const getMine = authQuery({
  args: {
    orgId: v.id("orgs"),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("agentPresence")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", ctx.user._id).eq("orgId", args.orgId),
      )
      .unique();
    return row ?? null;
  },
});

/**
 * Active/désactive le mode Do-Not-Disturb pour l'agent courant.
 *
 * Plan Intelligence iAsted × Sprint 6 — Phase β.
 *
 * - `expiresAt: number` → DND actif jusqu'à ce timestamp (ms UNIX).
 * - `expiresAt: null` → clear DND immédiatement.
 *
 * Les stratégies de routing `callCenter.resolveEligibleMemberships` (Phase β)
 * consultent `dndUntil` et excluent l'agent tant qu'il est > Date.now().
 */
export const setDnd = authMutation({
  args: {
    orgId: v.id("orgs"),
    expiresAt: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("agentPresence")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", ctx.user._id).eq("orgId", args.orgId),
      )
      .unique();

    const now = Date.now();
    const dndUntil = args.expiresAt === null ? undefined : args.expiresAt;

    if (existing) {
      await ctx.db.patch(existing._id, { dndUntil, lastActivity: now });
    } else {
      // Crée une row presence minimale si l'agent n'a encore jamais heartbeaté.
      await ctx.db.insert("agentPresence", {
        userId: ctx.user._id,
        orgId: args.orgId,
        status: "online",
        lastHeartbeat: now,
        lastActivity: now,
        dndUntil,
      });
    }
    return { dndUntil };
  },
});

/**
 * Helper pur — détermine si un agent est disponible pour un nouveau routage.
 *
 * Critères :
 * - Heartbeat frais (< 90s)
 * - Status !== "offline"
 * - DND non actif (dndUntil absent OU expiré)
 *
 * Utilisé par `callCenter.resolveEligibleMemberships` (stratégies `least_busy`
 * et `priority_order`) et par toute logique de routing métier. Reste stable
 * vis-à-vis du schema multi-call existant.
 */
export function isAvailable(
  presence: {
    status: "online" | "busy" | "away" | "offline";
    lastHeartbeat: number;
    dndUntil?: number;
  },
  now: number = Date.now(),
  freshnessMs: number = 90_000,
): boolean {
  if (presence.status === "offline") return false;
  if (now - presence.lastHeartbeat > freshnessMs) return false;
  if (presence.dndUntil !== undefined && presence.dndUntil > now) return false;
  return true;
}

/**
 * Backfill one-shot — migre les docs agentPresence existants vers le schéma
 * multi-call (currentCallIds[] + activeCallId).
 *
 * Idempotent : saute les rows déjà migrées. À exécuter une fois depuis le
 * dashboard Convex après le déploiement du schéma étendu.
 * (Les nouvelles rows sont déjà correctement formées par le heartbeat.)
 */
export const backfillMultiCallFields = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("agentPresence").take(1000);
    let migrated = 0;
    for (const p of rows) {
      if (p.currentCallIds !== undefined) continue; // déjà migré
      await ctx.db.patch(p._id, {
        currentCallIds: p.currentCallId ? [p.currentCallId] : [],
        activeCallId: p.currentCallId ?? undefined,
      });
      migrated += 1;
    }
    return { migrated, total: rows.length };
  },
});
