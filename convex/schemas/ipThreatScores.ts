import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Scores de menace par IP — systeme de defense automatique.
 * Chaque evenement de securite (honeypot, canary, brute-force)
 * incremente le score. Score >= 100 → blocage automatique.
 */
export const ipThreatScoresTable = defineTable({
  ip: v.string(),
  score: v.number(),
  events: v.array(
    v.object({
      type: v.string(),
      timestamp: v.number(),
      metadata: v.optional(v.any()),
    }),
  ),
  blockedUntil: v.optional(v.number()),
  lastUpdated: v.number(),
})
  .index("by_ip", ["ip"])
  .index("by_blocked", ["blockedUntil"]);
