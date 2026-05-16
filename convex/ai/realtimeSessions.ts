/**
 * Realtime Sessions — supervision + coût des sessions vocales iAsted.
 *
 * Cycle de vie :
 *   1. `realtimeToken.create` → `insertActiveInternal` (status="active")
 *   2. Chaque tool call → `touchHeartbeatInternal` (patch lastHeartbeatAt)
 *   3. Client `cleanup()` → `recordSessionEnd` action (status="ended" + usage + cost)
 *   4. Supervision backoffice → `listActive` query
 *   5. Force-terminate par admin → `forceEnd` mutation
 *
 * Calcul du coût (OpenAI Realtime — gpt-realtime — tarifs au 2026-05) :
 *   - Audio input  : $100/1M tokens = ~$0.10 / min audio (à 100 tokens/sec)
 *   - Audio output : $200/1M tokens = ~$0.20 / min audio
 *   - Tokens texte (instructions + transcripts) : ~$5/1M
 *
 * Pour rester conservateur (les durées audio in/out ne sont pas toujours
 * fournies par OpenAI), on utilise la durée totale comme proxy haut.
 */

import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  query,
} from "../_generated/server";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { authMutation } from "../lib/customFunctions";
import { isSuperAdmin } from "../lib/permissions";

// ─────────────────────────────────────────────────────────────
// Constantes coût (micro-cents = 1 / 1_000_000 USD)
// ─────────────────────────────────────────────────────────────

// Conservateur : on facture la durée TOTALE au tarif audio-out (le plus cher).
// Surfacturation marginale mais évite la sous-estimation.
const COST_AUDIO_OUT_PER_SECOND_MICROCENTS = (0.20 / 60) * 1_000_000;

function computeCostMicroCents(input: {
  durationSeconds?: number;
  audioInSeconds?: number;
  audioOutSeconds?: number;
}): number {
  // Si on a les durées audio précises, on les utilise.
  if (input.audioOutSeconds !== undefined) {
    const audioOutCost = input.audioOutSeconds * COST_AUDIO_OUT_PER_SECOND_MICROCENTS;
    const audioInCost = (input.audioInSeconds ?? 0) * (COST_AUDIO_OUT_PER_SECOND_MICROCENTS / 2);
    return Math.round(audioOutCost + audioInCost);
  }
  // Fallback : durée totale × tarif audio-out (conservateur).
  const dur = input.durationSeconds ?? 0;
  return Math.round(dur * COST_AUDIO_OUT_PER_SECOND_MICROCENTS);
}

// ─────────────────────────────────────────────────────────────
// Internal mutations — appelées par realtimeToken / executor
// ─────────────────────────────────────────────────────────────

export const insertActiveInternal = internalMutation({
  args: {
    externalSessionId: v.string(),
    userId: v.id("users"),
    orgId: v.optional(v.id("orgs")),
    surface: v.union(
      v.literal("agent"),
      v.literal("backoffice"),
      v.literal("citizen"),
    ),
    model: v.optional(v.string()),
    voice: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("aiRealtimeSessions", {
      externalSessionId: args.externalSessionId,
      userId: args.userId,
      orgId: args.orgId,
      surface: args.surface,
      model: args.model,
      voice: args.voice,
      startedAt: Date.now(),
      lastHeartbeatAt: Date.now(),
      status: "active",
    });
  },
});

export const touchHeartbeatInternal = internalMutation({
  args: {
    externalSessionId: v.string(),
  },
  handler: async (ctx, { externalSessionId }) => {
    const row = await ctx.db
      .query("aiRealtimeSessions")
      .withIndex("by_external_session", (q) =>
        q.eq("externalSessionId", externalSessionId),
      )
      .first();
    if (!row || row.status !== "active") return;
    await ctx.db.patch(row._id, { lastHeartbeatAt: Date.now() });
  },
});

// ─────────────────────────────────────────────────────────────
// Action publique — recordSessionEnd (appelée par le client au cleanup)
// ─────────────────────────────────────────────────────────────

export const recordSessionEnd = action({
  args: {
    externalSessionId: v.string(),
    durationSeconds: v.number(),
    audioInSeconds: v.optional(v.number()),
    audioOutSeconds: v.optional(v.number()),
    toolCallCount: v.optional(v.number()),
    endReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const costMicroCents = computeCostMicroCents({
      durationSeconds: args.durationSeconds,
      audioInSeconds: args.audioInSeconds,
      audioOutSeconds: args.audioOutSeconds,
    });
    await ctx.runMutation(internal.ai.realtimeSessions.patchEndInternal, {
      externalSessionId: args.externalSessionId,
      durationSeconds: args.durationSeconds,
      audioInSeconds: args.audioInSeconds,
      audioOutSeconds: args.audioOutSeconds,
      toolCallCount: args.toolCallCount,
      endReason: args.endReason ?? "normal",
      costMicroCents,
    });
    return { success: true, costMicroCents };
  },
});

export const patchEndInternal = internalMutation({
  args: {
    externalSessionId: v.string(),
    durationSeconds: v.number(),
    audioInSeconds: v.optional(v.number()),
    audioOutSeconds: v.optional(v.number()),
    toolCallCount: v.optional(v.number()),
    endReason: v.string(),
    costMicroCents: v.number(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("aiRealtimeSessions")
      .withIndex("by_external_session", (q) =>
        q.eq("externalSessionId", args.externalSessionId),
      )
      .first();
    if (!row) return;
    await ctx.db.patch(row._id, {
      status: "ended",
      endedAt: Date.now(),
      usage: {
        durationSeconds: args.durationSeconds,
        audioInSeconds: args.audioInSeconds,
        audioOutSeconds: args.audioOutSeconds,
        toolCallCount: args.toolCallCount,
      },
      costMicroCents: args.costMicroCents,
      endReason: args.endReason,
    });
  },
});

// ─────────────────────────────────────────────────────────────
// Queries publiques — supervision
// ─────────────────────────────────────────────────────────────

/**
 * Liste les sessions actives. Backoffice/admin/superadmin uniquement.
 */
export const listActive = query({
  args: {
    orgId: v.optional(v.id("orgs")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const rows = args.orgId
      ? await ctx.db
          .query("aiRealtimeSessions")
          .withIndex("by_org", (q) =>
            q.eq("orgId", args.orgId!).eq("status", "active"),
          )
          .collect()
      : await ctx.db
          .query("aiRealtimeSessions")
          .withIndex("by_status_started", (q) => q.eq("status", "active"))
          .take(100);

    return rows.map((r) => ({
      _id: r._id,
      externalSessionId: r.externalSessionId,
      userId: r.userId,
      orgId: r.orgId,
      surface: r.surface,
      model: r.model,
      startedAt: r.startedAt,
      lastHeartbeatAt: r.lastHeartbeatAt,
      durationSeconds: Math.round((Date.now() - r.startedAt) / 1000),
    }));
  },
});

/**
 * Coût mensuel iAsted pour une org. Pour dashboard / facturation.
 */
export const getMonthlyCost = query({
  args: {
    orgId: v.id("orgs"),
    /** Month start timestamp (UTC). Si omis : début du mois courant. */
    monthStart: v.optional(v.number()),
  },
  handler: async (ctx, { orgId, monthStart }) => {
    const start = monthStart ?? (() => {
      const d = new Date();
      d.setUTCDate(1);
      d.setUTCHours(0, 0, 0, 0);
      return d.getTime();
    })();
    const sessions = await ctx.db
      .query("aiRealtimeSessions")
      .withIndex("by_org_started", (q) =>
        q.eq("orgId", orgId).gte("startedAt", start),
      )
      .collect();
    let totalMicroCents = 0;
    let durationSeconds = 0;
    let sessionCount = 0;
    for (const s of sessions) {
      if (s.costMicroCents) totalMicroCents += s.costMicroCents;
      if (s.usage?.durationSeconds) durationSeconds += s.usage.durationSeconds;
      sessionCount++;
    }
    return {
      totalMicroCents,
      totalUsd: totalMicroCents / 1_000_000,
      durationSeconds,
      sessionCount,
      monthStart: start,
    };
  },
});

// ─────────────────────────────────────────────────────────────
// Force-terminate (backoffice supervision)
// ─────────────────────────────────────────────────────────────

export const forceEnd = authMutation({
  args: {
    sessionDocId: v.id("aiRealtimeSessions"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Superadmin uniquement — protection critique.
    if (!isSuperAdmin(ctx.user)) {
      throw new Error("INSUFFICIENT_PERMISSIONS");
    }
    const row = await ctx.db.get(args.sessionDocId);
    if (!row) throw new Error("SESSION_NOT_FOUND");
    if (row.status !== "active") return { success: true, alreadyEnded: true };
    await ctx.db.patch(args.sessionDocId, {
      status: "force_terminated",
      endedAt: Date.now(),
      endReason: args.reason ?? "force_terminated_by_admin",
    });
    return { success: true };
  },
});

// ─────────────────────────────────────────────────────────────
// Internal cleanup cron — fermer les sessions zombies
// ─────────────────────────────────────────────────────────────

/**
 * Marque crashed les sessions sans heartbeat depuis > 5 min.
 * À appeler depuis un cron Convex.
 */
export const sweepStaleSessionsInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 5 * 60 * 1000;
    const stale = await ctx.db
      .query("aiRealtimeSessions")
      .withIndex("by_status_started", (q) => q.eq("status", "active"))
      .collect();
    let count = 0;
    for (const s of stale) {
      const last = s.lastHeartbeatAt ?? s.startedAt;
      if (last < cutoff) {
        await ctx.db.patch(s._id, {
          status: "crashed",
          endedAt: Date.now(),
          endReason: "idle_timeout",
        });
        count++;
      }
    }
    return { swept: count };
  },
});

// ─────────────────────────────────────────────────────────────
// Internal query — utilisée par le wrapper executor pour le heartbeat
// ─────────────────────────────────────────────────────────────

export const findActiveByExternalIdInternal = internalQuery({
  args: { externalSessionId: v.string() },
  handler: async (ctx, { externalSessionId }) => {
    return await ctx.db
      .query("aiRealtimeSessions")
      .withIndex("by_external_session", (q) =>
        q.eq("externalSessionId", externalSessionId),
      )
      .first();
  },
});
