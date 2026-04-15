import { v } from "convex/values";
import { authQuery, authMutation } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { logCortexAction } from "../lib/neocortex";
import { SIGNAL_TYPES, CATEGORIES_ACTION } from "../lib/types";
import {
  chatbotEscalationValidator,
  callcenterEscalationValidator,
} from "../schemas/orgEscalationPolicy";

/**
 * orgEscalationPolicy — CRUD pour la politique d'escalation unifiée
 * Phase D3
 */

/**
 * Récupère la politique d'escalation d'une org (ou null si pas encore configurée).
 */
export const getByOrgId = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "settings.view");

    const policy = await ctx.db
      .query("orgEscalationPolicy")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    return policy;
  },
});

/**
 * Crée ou met à jour la politique d'escalation d'une org.
 */
export const upsert = authMutation({
  args: {
    orgId: v.id("orgs"),
    chatbot: chatbotEscalationValidator,
    callcenter: callcenterEscalationValidator,
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage");

    const existing = await ctx.db
      .query("orgEscalationPolicy")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    const payload = {
      orgId: args.orgId,
      chatbot: args.chatbot,
      callcenter: args.callcenter,
      updatedAt: Date.now(),
      updatedBy: ctx.user._id,
    };

    let policyId;
    if (existing) {
      await ctx.db.patch(existing._id, payload);
      policyId = existing._id;
    } else {
      policyId = await ctx.db.insert("orgEscalationPolicy", payload);
    }

    await logCortexAction(ctx, {
      action: "UPSERT_ESCALATION_POLICY",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "orgEscalationPolicy",
      entiteId: policyId,
      userId: ctx.user._id,
      apres: { orgId: args.orgId },
      signalType: SIGNAL_TYPES.ORG_MODIFIEE,
    });

    return policyId;
  },
});

/**
 * Initialise une politique par défaut depuis les configs existantes iAsted/callLines.
 * Appelé une fois pour migrer une org vers le nouveau système unifié.
 */
export const initializeFromExisting = authMutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage");

    // Déjà existe ? Skip
    const existing = await ctx.db
      .query("orgEscalationPolicy")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
    if (existing) return existing._id;

    // Lire iAstedConfig existant pour le bloc chatbot
    const iAsted = await ctx.db
      .query("orgIAstedConfig")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    const chatbot = iAsted?.escalation
      ? {
          triggerKeywords: iAsted.escalation.triggerKeywords ?? [],
          triggerSentiment: (iAsted.escalation.triggerSentiment ??
            "negative_only") as "never" | "negative_only" | "frustrated",
          maxTurnsBeforeSuggestHandoff:
            iAsted.escalation.maxTurnsBeforeSuggestHandoff ?? 8,
          target: {
            type: iAsted.escalation.handoffTarget.type as
              | "call_line"
              | "membership"
              | "chat_standard",
            callLineId: iAsted.escalation.handoffTarget.callLineId,
            membershipIds: iAsted.escalation.handoffTarget.membershipIds,
          },
          handoffMessage:
            iAsted.escalation.handoffMessage ??
            "Je vous propose de parler à un de nos agents.",
        }
      : {
          triggerKeywords: ["urgence", "plainte"],
          triggerSentiment: "negative_only" as const,
          maxTurnsBeforeSuggestHandoff: 8,
          target: { type: "chat_standard" as const },
          handoffMessage:
            "Je vous propose de parler directement avec un de nos agents.",
        };

    // Lire la première callLine org pour le bloc callcenter
    const defaultCallLine = await ctx.db
      .query("callLines")
      .withIndex("by_org_active", (q) =>
        q.eq("orgId", args.orgId).eq("isActive", true),
      )
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();

    const callcenter = {
      fallbackLineId: defaultCallLine?._id,
      strategy: "broadcast" as const,
      ringTimeoutBeforeFallback: 60,
      finalAction: "callback_request" as const,
    };

    const policyId = await ctx.db.insert("orgEscalationPolicy", {
      orgId: args.orgId,
      chatbot,
      callcenter,
      updatedAt: Date.now(),
      updatedBy: ctx.user._id,
    });

    return policyId;
  },
});
