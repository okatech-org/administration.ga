/**
 * Proactive Agent Orchestrator — coeur du pipeline.
 *
 * Point d'entree unique pour toute execution de capability.
 * Garantit en SEQUENCE :
 *   1. Kill switch global
 *   2. Module ai_assistant active pour l'org
 *   3. Config capability resolue (org + user) => autorise ?
 *   4. Permission metier de base (ex: requests.process)
 *   5. Permission ai_assistant.view
 *   6. Rate limit
 *   7. Budget quotidien org non depasse
 *   8. Execute le handler
 *   9. Append audit log
 *   10. Insert suggestion (ou auto-apply si flag)
 *
 * Tout passage a l'etape suivante est conditionne au succes de la precedente.
 * Chaque echec produit une entree audit log (action: blocked/rate_limited/budget_exceeded/errored).
 */

"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { rateLimiter } from "./rateLimiter";
import { CAPABILITY_REGISTRY, type CapabilityCode } from "./capabilityRegistry";
import type { CapabilityHandler, CapabilityHandlerResult } from "./capabilities/_types";

// Import des capability handlers
import * as requestTriage from "./capabilities/requestTriage";
import * as documentAnalysis from "./capabilities/documentAnalysis";
import * as documentDrafting from "./capabilities/documentDrafting";
import * as autoSummary from "./capabilities/autoSummary";
import * as nextStepSuggestion from "./capabilities/nextStepSuggestion";
import * as riskDetection from "./capabilities/riskDetection";
import * as proactiveNotifications from "./capabilities/proactiveNotifications";
import * as voiceAssist from "./capabilities/voiceAssist";
import * as bulkActionsHelper from "./capabilities/bulkActionsHelper";
import * as correspondanceDrafting from "./capabilities/correspondanceDrafting";
import * as meetingPrep from "./capabilities/meetingPrep";
import * as complianceCheck from "./capabilities/complianceCheck";

type RunCapabilityResult =
  | { status: "blocked"; reason?: string }
  | { status: "rate_limited"; retryAfterMs?: number }
  | { status: "budget_exceeded" }
  | { status: "errored"; error: string }
  | { status: "skipped"; reason?: string }
  | { status: "proposed"; suggestionId: Id<"aiSuggestions">; autoApplied: boolean };

const HANDLERS: Record<CapabilityCode, CapabilityHandler> = {
  request_triage: requestTriage.run,
  document_analysis: documentAnalysis.run,
  document_drafting: documentDrafting.run,
  auto_summary: autoSummary.run,
  next_step_suggestion: nextStepSuggestion.run,
  risk_detection: riskDetection.run,
  proactive_notifications: proactiveNotifications.run,
  voice_assist: voiceAssist.run,
  bulk_actions_helper: bulkActionsHelper.run,
  correspondance_drafting: correspondanceDrafting.run,
  meeting_prep: meetingPrep.run,
  compliance_check: complianceCheck.run,
};

// ═══════════════════════════════════════════════════════════════
// ACTION PRINCIPALE — runCapability
// ═══════════════════════════════════════════════════════════════

export const runCapability = internalAction({
  args: {
    orgId: v.id("orgs"),
    membershipId: v.id("memberships"),
    userId: v.id("users"),
    capabilityCode: v.string(),
    targetType: v.string(),
    targetId: v.optional(v.string()),
    /** Raison d'appel (audit) : "trigger:requests.statusChanged", "cron:sweeper", etc. */
    source: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<RunCapabilityResult> => {
    const { orgId, membershipId, userId, capabilityCode } = args;

    // 1. Kill switch global
    if (process.env.AI_ASSISTANT_GLOBAL_KILL_SWITCH === "true") {
      await appendBlocked(ctx, args, "global_kill_switch");
      return { status: "blocked" as const, reason: "global_kill_switch" };
    }

    const capDef = CAPABILITY_REGISTRY[capabilityCode as CapabilityCode];
    if (!capDef) {
      await appendBlocked(ctx, args, "unknown_capability");
      return { status: "blocked" as const, reason: "unknown_capability" };
    }

    // 2 + 3. Config resolue (module org + cap org + user prefs)
    const cfg = await ctx.runQuery(
      internal.ai.preferences.resolveCapabilityConfigInternal,
      { orgId, membershipId, capabilityCode },
    );

    if (!cfg.enabled) {
      await appendBlocked(ctx, args, cfg.blockedReason ?? "disabled");
      return { status: "blocked" as const, reason: cfg.blockedReason };
    }

    // 4. Permission metier de base — assertCanDoTask via query interne
    const permOk = await ctx.runQuery(
      internal.ai.preferences.checkPermissionInternal,
      { userId, membershipId, requiredTask: capDef.requiredTask },
    );
    if (!permOk) {
      await appendBlocked(ctx, args, "missing_business_task");
      return { status: "blocked" as const, reason: "missing_business_task" };
    }

    // 5. Permission ai_assistant.view (socle IA)
    const aiViewOk = await ctx.runQuery(
      internal.ai.preferences.checkPermissionInternal,
      { userId, membershipId, requiredTask: "ai_assistant.view" },
    );
    if (!aiViewOk) {
      await appendBlocked(ctx, args, "missing_ai_assistant_view");
      return { status: "blocked" as const, reason: "missing_ai_assistant_view" };
    }

    // 6. Rate limit (reutilise "aiChat" existant, scope par membership)
    const limitResult = await rateLimiter.limit(ctx, "aiChat", {
      key: membershipId,
    });
    if (!limitResult.ok) {
      await appendLog(ctx, args, {
        action: "rate_limited",
        model: cfg.model,
      });
      return { status: "rate_limited" as const, retryAfterMs: limitResult.retryAfter };
    }

    // 7. Budget quotidien
    if (cfg.budgetMicroCents && cfg.budgetMicroCents > 0) {
      const spent = await ctx.runQuery(
        internal.ai.activityLog.getDailyCostForOrgInternal,
        { orgId },
      );
      if (spent.totalMicroCents >= cfg.budgetMicroCents) {
        await appendLog(ctx, args, {
          action: "budget_exceeded",
          model: cfg.model,
          metadata: { spent: spent.totalMicroCents, limit: cfg.budgetMicroCents },
        });
        return { status: "budget_exceeded" as const };
      }
    }

    // 8. Execute
    const handler = HANDLERS[capabilityCode as CapabilityCode];
    let result: CapabilityHandlerResult;
    try {
      result = await handler(ctx, {
        orgId,
        membershipId,
        userId,
        targetType: args.targetType,
        targetId: args.targetId,
        model: cfg.model,
        sensitivity: cfg.sensitivity,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await appendLog(ctx, args, {
        action: "errored",
        model: cfg.model,
        error: message.slice(0, 500),
      });
      return { status: "errored" as const, error: message };
    }

    // 9 + 10. Log + (eventuellement) creation suggestion
    if (!result.proposed) {
      await appendLog(ctx, args, {
        action: "proposed",
        model: result.model,
        latencyMs: result.latencyMs,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        costMicroCents: result.costMicroCents,
        metadata: { skipped: true, reason: result.skipReason },
      });
      return { status: "skipped" as const, reason: result.skipReason };
    }

    const suggestionId = await ctx.runMutation(
      internal.ai.suggestions.createSuggestionInternal,
      {
        orgId,
        membershipId,
        userId,
        capabilityCode,
        model: result.model,
        priority: result.priority ?? "medium",
        title: result.title ?? "Suggestion IA",
        body: result.body ?? "",
        metadata: result.metadata,
        targetType: args.targetType,
        targetId: args.targetId,
        targetRoute: result.targetRoute,
        proposedActions: result.proposedActions ?? [],
        autoApplied: cfg.autoApply,
      },
    );

    await ctx.runMutation(internal.ai.activityLog.appendLogInternal, {
      orgId,
      membershipId,
      userId,
      suggestionId,
      capabilityCode,
      action: cfg.autoApply ? "auto_applied" : "proposed",
      model: result.model,
      latencyMs: result.latencyMs,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      costMicroCents: result.costMicroCents,
      metadata: { priority: result.priority, source: args.source },
    });

    return {
      status: "proposed" as const,
      suggestionId,
      autoApplied: cfg.autoApply,
    };
  },
});

// ═══════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════

async function appendBlocked(
  ctx: { runMutation: any },
  args: {
    orgId: Id<"orgs">;
    membershipId?: Id<"memberships">;
    userId?: Id<"users">;
    capabilityCode: string;
  },
  reason: string,
) {
  await ctx.runMutation(internal.ai.activityLog.appendLogInternal, {
    orgId: args.orgId,
    membershipId: args.membershipId,
    userId: args.userId,
    capabilityCode: args.capabilityCode,
    action: "blocked",
    metadata: { reason },
  });
}

async function appendLog(
  ctx: { runMutation: any },
  args: {
    orgId: Id<"orgs">;
    membershipId?: Id<"memberships">;
    userId?: Id<"users">;
    capabilityCode: string;
  },
  payload: {
    action:
      | "proposed"
      | "rate_limited"
      | "budget_exceeded"
      | "blocked"
      | "errored"
      | "expired";
    model?: string;
    latencyMs?: number;
    tokensIn?: number;
    tokensOut?: number;
    costMicroCents?: number;
    error?: string;
    metadata?: unknown;
  },
) {
  await ctx.runMutation(internal.ai.activityLog.appendLogInternal, {
    orgId: args.orgId,
    membershipId: args.membershipId,
    userId: args.userId,
    capabilityCode: args.capabilityCode,
    ...payload,
  });
}
