"use node";

/**
 * Push Notifications — Sprint 6
 *
 * Envoi effectif des Web Push via la lib `web-push`.
 * Doit tourner en runtime Node (présence de crypto.webcrypto + require).
 *
 * Env vars requises :
 *  - VAPID_PUBLIC_KEY
 *  - VAPID_PRIVATE_KEY
 *  - VAPID_SUBJECT (ex. "mailto:contact@consulat.ga")
 *
 * Sans env → stub avec warning (permet aux tests E2E de tourner).
 */

import { v } from "convex/values";
import webpush from "web-push";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
};

function hasVapidEnv(): boolean {
  return (
    !!process.env.VAPID_PUBLIC_KEY &&
    !!process.env.VAPID_PRIVATE_KEY &&
    !!process.env.VAPID_SUBJECT
  );
}

function configureVapid(): void {
  if (!hasVapidEnv()) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

/**
 * Envoie une notification push à toutes les souscriptions d'un user.
 * Stub si VAPID absente.
 */
export const sendPushNotification = internalAction({
  args: {
    userId: v.id("users"),
    payload: v.object({
      title: v.string(),
      body: v.string(),
      url: v.optional(v.string()),
      icon: v.optional(v.string()),
      tag: v.optional(v.string()),
    }),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ status: "stub" | "sent"; sent?: number; failed?: number }> => {
    if (!hasVapidEnv()) {
      console.warn("[SPRINT6][STUB] sendPushNotification: VAPID env missing");
      return { status: "stub" };
    }

    configureVapid();

    const subs = await ctx.runQuery(
      internal.functions.pushSubscriptions.getSubscriptionsForUserInternal,
      { userId: args.userId },
    );

    let sent = 0;
    let failed = 0;

    for (const sub of subs) {
      try {
        const pushSub = {
          endpoint: sub.endpoint,
          keys: sub.keys,
        };
        await webpush.sendNotification(
          pushSub,
          JSON.stringify(args.payload satisfies PushPayload),
        );
        sent++;
        await ctx.runMutation(
          internal.functions.pushSubscriptions.markSubscriptionUsedInternal,
          { subscriptionId: sub._id },
        );
      } catch (err: unknown) {
        failed++;
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Endpoint expiré → delete
          await ctx.runMutation(
            internal.functions.pushSubscriptions.deleteSubscriptionInternal,
            { subscriptionId: sub._id },
          );
        } else {
          await ctx.runMutation(
            internal.functions.pushSubscriptions.incrementSubscriptionFailureInternal,
            { subscriptionId: sub._id },
          );
        }
        console.error("[SPRINT6] push send failed:", err);
      }
    }

    return { status: "sent", sent, failed };
  },
});

/**
 * Envoi batch à plusieurs users (ex. tous les superviseurs d'une org).
 */
export const sendPushToMany = internalAction({
  args: {
    userIds: v.array(v.id("users")),
    payload: v.object({
      title: v.string(),
      body: v.string(),
      url: v.optional(v.string()),
      icon: v.optional(v.string()),
      tag: v.optional(v.string()),
    }),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ batchSize: number; sent: number; failed: number }> => {
    let sent = 0;
    let failed = 0;
    for (const userId of args.userIds) {
      const res = await ctx.runAction(
        internal.actions.push.sendPushNotification,
        {
          userId,
          payload: args.payload,
        },
      );
      if (res.status === "sent") {
        sent += res.sent ?? 0;
        failed += res.failed ?? 0;
      }
    }
    return { batchSize: args.userIds.length, sent, failed };
  },
});
