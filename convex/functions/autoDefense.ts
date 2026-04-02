/**
 * autoDefense.ts — Systeme de defense automatique contre les cyberattaques.
 *
 * Threat scoring par IP : chaque evenement de securite incremente un score.
 * Score >= 100 → blocage automatique 24h.
 * Score >= 200 → blocage 7 jours.
 * Decay quotidien de -10% pour permettre le deblocage progressif.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";

// ── Impact des evenements de securite sur le score ──
const SCORE_IMPACT: Record<string, number> = {
  HONEYPOT_TRIGGERED: 100,
  CANARY_TRIGGERED: 100,
  AUTH_FAIL_REPEATED: 30,
  RATE_LIMIT_HIT: 20,
  UNKNOWN_PATH: 10,
};

const BLOCK_24H = 24 * 60 * 60 * 1000;
const BLOCK_7D = 7 * 24 * 60 * 60 * 1000;
const MAX_EVENTS = 50; // Garder les 50 derniers evenements par IP

/** Enregistrer un evenement de menace et mettre a jour le score. */
export const recordThreatEvent = internalMutation({
  args: {
    ip: v.string(),
    eventType: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const impact = SCORE_IMPACT[args.eventType] ?? 10;

    // Chercher l'entree existante pour cette IP
    const existing = await ctx.db
      .query("ipThreatScores")
      .withIndex("by_ip", (q) => q.eq("ip", args.ip))
      .first();

    const newEvent = {
      type: args.eventType,
      timestamp: now,
      metadata: args.metadata,
    };

    if (existing) {
      const newScore = existing.score + impact;
      const events = [...existing.events, newEvent].slice(-MAX_EVENTS);

      // Determiner la duree de blocage
      let blockedUntil = existing.blockedUntil;
      if (newScore >= 200) {
        blockedUntil = now + BLOCK_7D;
      } else if (newScore >= 100) {
        blockedUntil = now + BLOCK_24H;
      }

      await ctx.db.patch(existing._id, {
        score: newScore,
        events,
        blockedUntil,
        lastUpdated: now,
      });

      // Alerter NEOCORTEX si blocage
      if (newScore >= 100 && !existing.blockedUntil) {
        await ctx.scheduler.runAfter(0, internal.limbique.emettreSignal, {
          type: "IP_AUTO_BLOCKED",
          source: "AUTODEFENSE",
          entiteType: "ip",
          entiteId: args.ip,
          payload: {
            ip: args.ip,
            score: newScore,
            triggerEvent: args.eventType,
            blockedUntil,
          },
          confiance: 1,
          priorite: "HIGH" as const,
          correlationId: crypto.randomUUID(),
        });
      }

      return { score: newScore, blocked: !!blockedUntil && blockedUntil > now };
    }

    // Nouvelle IP — creer l'entree
    const blockedUntil = impact >= 100 ? now + BLOCK_24H : undefined;

    await ctx.db.insert("ipThreatScores", {
      ip: args.ip,
      score: impact,
      events: [newEvent],
      blockedUntil,
      lastUpdated: now,
    });

    if (impact >= 100) {
      await ctx.scheduler.runAfter(0, internal.limbique.emettreSignal, {
        type: "IP_AUTO_BLOCKED",
        source: "AUTODEFENSE",
        entiteType: "ip",
        entiteId: args.ip,
        payload: { ip: args.ip, score: impact, triggerEvent: args.eventType, blockedUntil },
        confiance: 1,
        priorite: "HIGH" as const,
        correlationId: crypto.randomUUID(),
      });
    }

    return { score: impact, blocked: impact >= 100 };
  },
});

/** Verifier si une IP est bloquee. */
export const isIpBlocked = internalQuery({
  args: { ip: v.string() },
  handler: async (ctx, { ip }) => {
    const entry = await ctx.db
      .query("ipThreatScores")
      .withIndex("by_ip", (q) => q.eq("ip", ip))
      .first();

    if (!entry) return { blocked: false, score: 0 };

    const blocked = !!entry.blockedUntil && entry.blockedUntil > Date.now();
    return { blocked, score: entry.score };
  },
});

/** Decay quotidien des scores (-10% par jour). */
export const decayScores = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allEntries = await ctx.db.query("ipThreatScores").collect();
    let decayed = 0;

    for (const entry of allEntries) {
      const newScore = Math.floor(entry.score * 0.9);
      if (newScore <= 1) {
        // Score negligeable — supprimer l'entree
        await ctx.db.delete(entry._id);
      } else {
        await ctx.db.patch(entry._id, { score: newScore, lastUpdated: Date.now() });
      }
      decayed++;
    }

    return { decayed };
  },
});

/** Nettoyage des blocages expires. */
export const cleanupExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const allEntries = await ctx.db.query("ipThreatScores").collect();
    let cleaned = 0;

    for (const entry of allEntries) {
      if (entry.blockedUntil && entry.blockedUntil < now) {
        await ctx.db.patch(entry._id, { blockedUntil: undefined });
        cleaned++;
      }
    }

    return { cleaned };
  },
});
