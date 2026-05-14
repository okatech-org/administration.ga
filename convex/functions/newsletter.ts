import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Inscription publique à la newsletter (« hebdomadaire diplomatique »).
 * Idempotent : ré-abonne si désinscrit, sinon retourne `{ alreadySubscribed: true }`.
 */
export const subscribe = mutation({
  args: {
    email: v.string(),
    source: v.optional(v.string()),
    language: v.optional(v.union(v.literal("fr"), v.literal("en"))),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      throw new Error("INVALID_EMAIL");
    }

    const existing = await ctx.db
      .query("newsletterSubscriptions")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    const now = Date.now();

    if (existing) {
      if (existing.unsubscribedAt) {
        // Réactivation
        await ctx.db.patch(existing._id, {
          subscribedAt: now,
          unsubscribedAt: undefined,
          source: args.source ?? existing.source,
          language: args.language ?? existing.language,
        });
        return { reactivated: true, alreadySubscribed: false };
      }
      return { reactivated: false, alreadySubscribed: true };
    }

    await ctx.db.insert("newsletterSubscriptions", {
      email,
      subscribedAt: now,
      source: args.source ?? "news_page",
      language: args.language,
    });

    return { reactivated: false, alreadySubscribed: false };
  },
});

/**
 * Total d'abonnés actifs — utilisé pour la statistique publique.
 */
export const activeCount = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("newsletterSubscriptions").collect();
    return all.filter((s) => !s.unsubscribedAt).length;
  },
});
