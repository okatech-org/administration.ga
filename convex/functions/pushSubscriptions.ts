/**
 * Push Subscriptions — Sprint 6
 *
 * Mutations pour que l'agent-web enregistre / supprime un PushSubscription
 * Web Push dans Convex. L'envoi effectif se fait via
 * `convex/actions/push.ts` (Node runtime — web-push lib).
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { authMutation, authQuery } from "../lib/customFunctions";

/**
 * Enregistre un abonnement push pour l'utilisateur connecté.
 * Idempotent : si l'endpoint existe déjà, met à jour `lastUsed`.
 */
export const subscribe = authMutation({
  args: {
    endpoint: v.string(),
    keys: v.object({
      p256dh: v.string(),
      auth: v.string(),
    }),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        userId: ctx.user._id, // ré-associe au user courant
        keys: args.keys,
        userAgent: args.userAgent,
        lastUsed: now,
        failureCount: 0,
      });
      return { subscriptionId: existing._id, alreadyExisted: true };
    }

    const subscriptionId = await ctx.db.insert("pushSubscriptions", {
      userId: ctx.user._id,
      endpoint: args.endpoint,
      keys: args.keys,
      userAgent: args.userAgent,
      createdAt: now,
      lastUsed: now,
      failureCount: 0,
    });
    return { subscriptionId, alreadyExisted: false };
  },
});

/**
 * Supprime un abonnement par endpoint (clé naturelle unique).
 */
export const unsubscribe = authMutation({
  args: {
    endpoint: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();
    if (!existing) return { deleted: false };
    if (existing.userId !== ctx.user._id) return { deleted: false };
    await ctx.db.delete(existing._id);
    return { deleted: true };
  },
});

/**
 * Liste les abonnements de l'utilisateur courant.
 */
export const listMySubscriptions = authQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .collect();
  },
});

// ============================================================================
// INTERNAL helpers — appelés par actions/push.ts
// ============================================================================

/** Retourne toutes les souscriptions d'un user (pour envoi push côté Node). */
export const getSubscriptionsForUserInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const markSubscriptionUsedInternal = internalMutation({
  args: { subscriptionId: v.id("pushSubscriptions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subscriptionId, { lastUsed: Date.now() });
  },
});

export const deleteSubscriptionInternal = internalMutation({
  args: { subscriptionId: v.id("pushSubscriptions") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.subscriptionId);
  },
});

const MAX_FAILURES_BEFORE_DELETE = 5;

export const incrementSubscriptionFailureInternal = internalMutation({
  args: { subscriptionId: v.id("pushSubscriptions") },
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.subscriptionId);
    if (!sub) return;
    const nextFailure = (sub.failureCount ?? 0) + 1;
    if (nextFailure >= MAX_FAILURES_BEFORE_DELETE) {
      await ctx.db.delete(args.subscriptionId);
    } else {
      await ctx.db.patch(args.subscriptionId, { failureCount: nextFailure });
    }
  },
});
