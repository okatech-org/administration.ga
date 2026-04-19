/**
 * Dispatcher IA — glue entre triggers/crons et le proactiveAgent.
 *
 * Role :
 *   1. Reception d'un evenement (trigger, cron, heartbeat)
 *   2. Rule-based filtering (cheap) — skip si non pertinent
 *   3. LLM router (Gemini Flash, ~30 micro-cents) — decide la capability
 *   4. Delegue a proactiveAgent.runCapability
 *
 * Les triggers Convex (mutations) n'executent pas directement de LLM :
 *   ils schedulent `dispatchEvent` via `ctx.scheduler.runAfter(0, ...)`
 */

"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { routeEvent, type RouterInput } from "./proactiveRouter";

export const dispatchEvent = internalAction({
  args: {
    orgId: v.id("orgs"),
    membershipId: v.id("memberships"),
    userId: v.id("users"),
    eventType: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    entitySummary: v.string(),
    contextHints: v.optional(v.array(v.string())),
    /** Si present : shortcut — skip le routeur et appelle direct cette capability */
    overrideCapabilityCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Kill switch global
    if (process.env.AI_ASSISTANT_GLOBAL_KILL_SWITCH === "true") {
      return { skipped: true, reason: "global_kill_switch" };
    }

    let capabilityCode = args.overrideCapabilityCode;
    let priority: "low" | "medium" | "high" | "urgent" = "medium";
    let routerReason = "override";

    if (!capabilityCode) {
      const routerInput: RouterInput = {
        eventType: args.eventType,
        entityType: args.entityType,
        entitySummary: args.entitySummary,
        contextHints: args.contextHints,
      };

      const decision = await routeEvent(routerInput);
      if (decision.skip) {
        return { skipped: true, reason: decision.reason };
      }
      capabilityCode = decision.capabilityCode;
      priority = decision.priority;
      routerReason = decision.reason;
    }

    // Enchaine sur runCapability
    await ctx.runAction(internal.ai.proactiveAgent.runCapability, {
      orgId: args.orgId,
      membershipId: args.membershipId,
      userId: args.userId,
      capabilityCode: capabilityCode!,
      targetType: args.entityType,
      targetId: args.entityId,
      source: `${args.eventType}|${routerReason}`,
    });

    return { dispatched: true, capabilityCode, priority };
  },
});
