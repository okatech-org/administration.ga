import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Push subscriptions — Sprint 6.
 *
 * Stocke les abonnements Web Push (PushSubscription JSON) des agents.
 * Un même user peut avoir plusieurs endpoints (desktop + mobile + tablette).
 *
 * Lifecycle :
 *  - Subscribe : navigator.pushManager.subscribe → envoi des clés à Convex.
 *  - Unsubscribe : mutation supprime la row.
 *  - Envoi push 404/410 : on delete automatiquement (endpoint expiré).
 *  - failureCount >= 5 : on delete après backoff (canal mort).
 */
export const pushSubscriptionsTable = defineTable({
  userId: v.id("users"),
  endpoint: v.string(),
  keys: v.object({
    p256dh: v.string(),
    auth: v.string(),
  }),
  userAgent: v.optional(v.string()),
  createdAt: v.number(),
  lastUsed: v.optional(v.number()),
  failureCount: v.optional(v.number()),
})
  .index("by_user", ["userId"])
  .index("by_endpoint", ["endpoint"]);
