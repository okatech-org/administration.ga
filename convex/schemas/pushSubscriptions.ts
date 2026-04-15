import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Push Subscriptions — Web Push API subscriptions per user
 *
 * Stores the endpoint + public keys needed to send Web Push notifications.
 * One user may have multiple subscriptions (browser per device).
 */
export const pushSubscriptionsTable = defineTable({
  userId: v.id("users"),
  endpoint: v.string(),
  keys: v.object({
    p256dh: v.string(),
    auth: v.string(),
  }),
  userAgent: v.optional(v.string()),
  createdAt: v.float64(),
  lastUsed: v.optional(v.float64()),
  // Incremented on push delivery failures; pruned after too many misses
  failureCount: v.optional(v.float64()),
})
  .index("by_user", ["userId"])
  .index("by_endpoint", ["endpoint"]);
