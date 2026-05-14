import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Newsletter subscriptions — abonnements à l'hebdomadaire diplomatique
 * (formulaire public sur /news).
 *
 * Stockage simple : email + date d'inscription + canal source.
 * Désinscription = `unsubscribedAt` non-null (soft).
 */
export const newsletterSubscriptionsTable = defineTable({
  email: v.string(),
  subscribedAt: v.number(),
  unsubscribedAt: v.optional(v.number()),
  source: v.optional(v.string()), // "news_page", "footer", etc.
  language: v.optional(v.union(v.literal("fr"), v.literal("en"))),
  ipHash: v.optional(v.string()), // hash IP pour anti-abus
})
  .index("by_email", ["email"])
  .index("by_subscribedAt", ["subscribedAt"]);
