/**
 * AI Suggestions — queries + mutations (apply / dismiss / expire).
 *
 * Flow :
 *   - Backend (proactiveAgent) cree une row status=pending
 *   - UI s'abonne via getActiveForTarget / getActiveForMembership
 *   - User accepte/rejette → status=accepted/dismissed + row aiActivityLog
 *   - Cron expireSuggestionsInternal marque expired apres expiresAt
 *
 * IMPORTANT :
 *   Les mutations d'apply NE FONT PAS l'action metier elles-memes.
 *   Elles mettent juste a jour le status. L'UI declenche ensuite
 *   la mutation metier ciblee (via proposedAction.mutationPath).
 *   Raison : garder le systeme de permissions metier intouche,
 *   et eviter d'introduire une surface d'injection de mutation.
 */

import { v } from "convex/values";
import {
  query,
  mutation,
  internalMutation,
} from "../_generated/server";
import { internal } from "../_generated/api";
import { requireAuth, getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";
import { proposedActionValidator } from "../schemas/aiSuggestions";
import type { Doc } from "../_generated/dataModel";

const statusValidator = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("dismissed"),
  v.literal("expired"),
  v.literal("auto_applied"),
  v.literal("error"),
);

const priorityValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("urgent"),
);

// ═══════════════════════════════════════════════════════════════
// INTERNAL — creation (appelee par capability handlers)
// ═══════════════════════════════════════════════════════════════

export const createSuggestionInternal = internalMutation({
  args: {
    orgId: v.id("orgs"),
    membershipId: v.id("memberships"),
    userId: v.id("users"),
    capabilityCode: v.string(),
    model: v.string(),
    priority: priorityValidator,
    title: v.string(),
    body: v.string(),
    metadata: v.optional(v.any()),
    targetType: v.string(),
    targetId: v.optional(v.string()),
    targetRoute: v.optional(v.string()),
    proposedActions: v.array(proposedActionValidator),
    /** Duree de vie en ms (default 24h) */
    ttlMs: v.optional(v.number()),
    /** Si true, la suggestion est deja auto-appliquee */
    autoApplied: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + (args.ttlMs ?? 24 * 60 * 60 * 1000);

    const suggestionId = await ctx.db.insert("aiSuggestions", {
      orgId: args.orgId,
      membershipId: args.membershipId,
      userId: args.userId,
      capabilityCode: args.capabilityCode,
      model: args.model,
      priority: args.priority,
      title: args.title,
      body: args.body,
      metadata: args.metadata,
      targetType: args.targetType,
      targetId: args.targetId,
      targetRoute: args.targetRoute,
      proposedActions: args.proposedActions,
      status: args.autoApplied ? "auto_applied" : "pending",
      expiresAt,
      resolvedAt: args.autoApplied ? now : undefined,
      createdAt: now,
    });

    return suggestionId;
  },
});

// ═══════════════════════════════════════════════════════════════
// QUERIES PUBLIQUES
// ═══════════════════════════════════════════════════════════════

/** Suggestions actives pour le membership courant (feed inline / panel). */
export const getActiveForMembership = query({
  args: {
    orgId: v.id("orgs"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { orgId, limit }) => {
    const user = await requireAuth(ctx);
    const membership = await getMembership(ctx, user._id, orgId);
    if (!membership) return [];

    return await ctx.db
      .query("aiSuggestions")
      .withIndex("by_membership_status", (q) =>
        q.eq("membershipId", membership._id).eq("status", "pending"),
      )
      .order("desc")
      .take(limit ?? 20);
  },
});

/** Suggestions attachees a une entite specifique (bordure "<InlineAISuggestion/>"). */
export const getActiveForTarget = query({
  args: {
    orgId: v.id("orgs"),
    targetType: v.string(),
    targetId: v.string(),
  },
  handler: async (ctx, { orgId, targetType, targetId }) => {
    const user = await requireAuth(ctx);
    const membership = await getMembership(ctx, user._id, orgId);
    if (!membership) return [];

    return await ctx.db
      .query("aiSuggestions")
      .withIndex("by_membership_target", (q) =>
        q
          .eq("membershipId", membership._id)
          .eq("targetType", targetType)
          .eq("targetId", targetId),
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
  },
});

/** Derniere suggestion auto-appliquee pour l'user — pour toaster "Undo". */
export const getRecentAutoApplied = query({
  args: {
    orgId: v.id("orgs"),
    sinceTimestamp: v.number(),
  },
  handler: async (ctx, { orgId, sinceTimestamp }) => {
    const user = await requireAuth(ctx);
    const membership = await getMembership(ctx, user._id, orgId);
    if (!membership) return [];

    const rows = await ctx.db
      .query("aiSuggestions")
      .withIndex("by_membership_status", (q) =>
        q.eq("membershipId", membership._id).eq("status", "auto_applied"),
      )
      .collect();
    return rows.filter((r) => (r.resolvedAt ?? r.createdAt) >= sinceTimestamp);
  },
});

// ═══════════════════════════════════════════════════════════════
// MUTATIONS — user acceptance / dismiss
// ═══════════════════════════════════════════════════════════════

export const markAccepted = mutation({
  args: {
    suggestionId: v.id("aiSuggestions"),
    resolvedActionIndex: v.optional(v.number()),
  },
  handler: async (ctx, { suggestionId, resolvedActionIndex }) => {
    const user = await requireAuth(ctx);
    const suggestion = await ctx.db.get(suggestionId);
    if (!suggestion) throw error(ErrorCode.NOT_FOUND);

    if (suggestion.userId !== user._id) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    const membership = await ctx.db.get(suggestion.membershipId);
    await assertCanDoTask(ctx, user, membership, "ai_assistant.apply");

    if (suggestion.status !== "pending") return;

    const now = Date.now();
    await ctx.db.patch(suggestionId, {
      status: "accepted",
      resolvedAt: now,
      resolvedActionIndex,
    });

    await ctx.runMutation(internal.ai.activityLog.appendLogInternal, {
      orgId: suggestion.orgId,
      membershipId: suggestion.membershipId,
      userId: suggestion.userId,
      suggestionId,
      capabilityCode: suggestion.capabilityCode,
      action: "accepted",
      model: suggestion.model,
      metadata: { resolvedActionIndex },
    });
  },
});

export const markDismissed = mutation({
  args: {
    suggestionId: v.id("aiSuggestions"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { suggestionId, reason }) => {
    const user = await requireAuth(ctx);
    const suggestion = await ctx.db.get(suggestionId);
    if (!suggestion) throw error(ErrorCode.NOT_FOUND);
    if (suggestion.userId !== user._id) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    const membership = await ctx.db.get(suggestion.membershipId);
    await assertCanDoTask(ctx, user, membership, "ai_assistant.dismiss");

    if (suggestion.status !== "pending") return;

    const now = Date.now();
    await ctx.db.patch(suggestionId, {
      status: "dismissed",
      resolvedAt: now,
    });

    await ctx.runMutation(internal.ai.activityLog.appendLogInternal, {
      orgId: suggestion.orgId,
      membershipId: suggestion.membershipId,
      userId: suggestion.userId,
      suggestionId,
      capabilityCode: suggestion.capabilityCode,
      action: "dismissed",
      model: suggestion.model,
      metadata: { reason },
    });
  },
});

export const markUndone = mutation({
  args: { suggestionId: v.id("aiSuggestions") },
  handler: async (ctx, { suggestionId }) => {
    const user = await requireAuth(ctx);
    const suggestion = await ctx.db.get(suggestionId);
    if (!suggestion) throw error(ErrorCode.NOT_FOUND);
    if (suggestion.userId !== user._id) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    if (suggestion.status !== "auto_applied") return;

    await ctx.db.patch(suggestionId, { status: "dismissed" });

    await ctx.runMutation(internal.ai.activityLog.appendLogInternal, {
      orgId: suggestion.orgId,
      membershipId: suggestion.membershipId,
      userId: suggestion.userId,
      suggestionId,
      capabilityCode: suggestion.capabilityCode,
      action: "undone",
      model: suggestion.model,
    });
  },
});

// ═══════════════════════════════════════════════════════════════
// CRON — expiration automatique
// ═══════════════════════════════════════════════════════════════

export const expireSuggestionsInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("aiSuggestions")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    let count = 0;
    for (const s of expired) {
      await ctx.db.patch(s._id, {
        status: "expired",
        resolvedAt: now,
      });
      await ctx.db.insert("aiActivityLog", {
        orgId: s.orgId,
        membershipId: s.membershipId,
        userId: s.userId,
        suggestionId: s._id,
        capabilityCode: s.capabilityCode,
        action: "expired",
        model: s.model,
        timestamp: now,
      });
      count++;
    }
    return { expired: count };
  },
});
