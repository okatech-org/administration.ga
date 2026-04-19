/**
 * User AI Preferences — CRUD + resolution hierarchique.
 *
 * Hierarchie de resolution d'une config capability :
 *   1. Kill switch global (env AI_ASSISTANT_GLOBAL_KILL_SWITCH) — checke ailleurs
 *   2. Module `ai_assistant` active sur l'org ?
 *   3. aiCapabilityConfig (org) — enabled, autoApplyAllowed, maxSensitivity, modelOverride
 *   4. userAIPreferences (user) — enabled, autoApply, sensitivity, channels
 *
 * Regle d'or : un user ne peut JAMAIS elever au-dela de la config org.
 */

import { v } from "convex/values";
import {
  query,
  mutation,
  internalQuery,
} from "../_generated/server";
import { requireAuth, getMembership } from "../lib/auth";
import { assertCanDoTask, canDoTask } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";
import { sensitivityValidator, channelValidator } from "../schemas/userAIPreferences";
import { CAPABILITY_CODES, CAPABILITY_REGISTRY, type CapabilityCode } from "./capabilityRegistry";
import type { Doc, Id } from "../_generated/dataModel";
import type { TaskCodeValue } from "../lib/taskCodes";

// ═══════════════════════════════════════════════════════════════
// RESOLUTION D'UNE CONFIG EFFECTIVE
// ═══════════════════════════════════════════════════════════════

export interface ResolvedCapabilityConfig {
  enabled: boolean;
  autoApplyAllowed: boolean;
  autoApplyRequested: boolean;
  autoApply: boolean; // autoApplyAllowed AND autoApplyRequested
  sensitivity: "low" | "medium" | "high";
  channels: Array<"toast" | "inline" | "activity" | "email">;
  model: string;
  budgetMicroCents?: number;
  blockedReason?: string;
}

/**
 * Resout la config effective pour (org, user, capability).
 * Retourne `enabled: false` + `blockedReason` si desactive a un niveau.
 *
 * Appelee en runtime par proactiveAgent.runCapability avant chaque execution.
 */
export const resolveCapabilityConfigInternal = internalQuery({
  args: {
    orgId: v.id("orgs"),
    membershipId: v.id("memberships"),
    capabilityCode: v.string(),
  },
  handler: async (ctx, { orgId, membershipId, capabilityCode }): Promise<ResolvedCapabilityConfig> => {
    const capDef = CAPABILITY_REGISTRY[capabilityCode as CapabilityCode];
    if (!capDef) {
      return {
        enabled: false,
        autoApplyAllowed: false,
        autoApplyRequested: false,
        autoApply: false,
        sensitivity: "medium",
        channels: [],
        model: "",
        blockedReason: "unknown_capability",
      };
    }

    // 2. Module ai_assistant active sur l'org ?
    const org = await ctx.db.get(orgId);
    if (!org) {
      return {
        enabled: false,
        autoApplyAllowed: false,
        autoApplyRequested: false,
        autoApply: false,
        sensitivity: "medium",
        channels: [],
        model: capDef.defaultModel,
        blockedReason: "org_not_found",
      };
    }
    if (!org.modules || !org.modules.includes("ai_assistant" as never)) {
      return {
        enabled: false,
        autoApplyAllowed: false,
        autoApplyRequested: false,
        autoApply: false,
        sensitivity: "medium",
        channels: [],
        model: capDef.defaultModel,
        blockedReason: "module_disabled_for_org",
      };
    }

    // 3. aiCapabilityConfig (org) override
    const orgCfg = await ctx.db
      .query("aiCapabilityConfig")
      .withIndex("by_org_capability", (q) =>
        q.eq("orgId", orgId).eq("capabilityCode", capabilityCode),
      )
      .unique();

    if (orgCfg && !orgCfg.enabled) {
      return {
        enabled: false,
        autoApplyAllowed: false,
        autoApplyRequested: false,
        autoApply: false,
        sensitivity: "medium",
        channels: [],
        model: orgCfg.modelOverride ?? capDef.defaultModel,
        blockedReason: "capability_disabled_for_org",
      };
    }

    const maxSensitivity = orgCfg?.maxSensitivity ?? "high";
    const autoApplyAllowed =
      capDef.supportsAutoApply && (orgCfg?.autoApplyAllowed ?? false);
    const model = orgCfg?.modelOverride ?? capDef.defaultModel;
    const budgetMicroCents = orgCfg?.dailyBudgetMicroCents;

    // 4. userAIPreferences (membership)
    const userPrefs = await ctx.db
      .query("userAIPreferences")
      .withIndex("by_membership", (q) => q.eq("membershipId", membershipId))
      .unique();

    if (!userPrefs || !userPrefs.enabled) {
      return {
        enabled: false,
        autoApplyAllowed,
        autoApplyRequested: false,
        autoApply: false,
        sensitivity: "medium",
        channels: [],
        model,
        budgetMicroCents,
        blockedReason: !userPrefs ? "user_has_no_prefs" : "user_disabled_master",
      };
    }

    const userCapPrefs = userPrefs.capabilities[capabilityCode];
    if (!userCapPrefs || !userCapPrefs.enabled) {
      return {
        enabled: false,
        autoApplyAllowed,
        autoApplyRequested: false,
        autoApply: false,
        sensitivity: "medium",
        channels: [],
        model,
        budgetMicroCents,
        blockedReason: "user_capability_disabled",
      };
    }

    // Cap la sensitivity a maxSensitivity
    const sensitivityRank = { low: 1, medium: 2, high: 3 };
    const requested = sensitivityRank[userCapPrefs.sensitivity];
    const cap = sensitivityRank[maxSensitivity];
    const sensitivity = requested <= cap ? userCapPrefs.sensitivity : maxSensitivity;

    const autoApplyRequested = userCapPrefs.autoApply === true;
    const autoApply = autoApplyAllowed && autoApplyRequested;

    return {
      enabled: true,
      autoApplyAllowed,
      autoApplyRequested,
      autoApply,
      sensitivity,
      channels: userCapPrefs.channels,
      model,
      budgetMicroCents,
    };
  },
});

// ═══════════════════════════════════════════════════════════════
// QUERIES PUBLIQUES
// ═══════════════════════════════════════════════════════════════

/** Retourne les prefs user pour le membership actif. */
export const getMyPreferences = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, { orgId }) => {
    const user = await requireAuth(ctx);
    const membership = await getMembership(ctx, user._id, orgId);
    if (!membership) return null;

    const prefs = await ctx.db
      .query("userAIPreferences")
      .withIndex("by_membership", (q) => q.eq("membershipId", membership._id))
      .unique();

    if (!prefs) return null;
    return prefs;
  },
});

// ═══════════════════════════════════════════════════════════════
// MUTATIONS PUBLIQUES — USER
// ═══════════════════════════════════════════════════════════════

const userCapabilityPrefsArg = v.object({
  enabled: v.boolean(),
  autoApply: v.boolean(),
  sensitivity: sensitivityValidator,
  channels: v.array(channelValidator),
});

/**
 * Create ou update les prefs du user courant pour une org.
 * Necessite ai_assistant.configure.
 */
export const upsertMyPreferences = mutation({
  args: {
    orgId: v.id("orgs"),
    enabled: v.boolean(),
    capabilities: v.record(v.string(), userCapabilityPrefsArg),
    quietHours: v.optional(
      v.object({
        from: v.string(),
        to: v.string(),
        timezone: v.optional(v.string()),
      }),
    ),
    dailyQuota: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const membership = await getMembership(ctx, user._id, args.orgId);
    if (!membership) throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    await assertCanDoTask(ctx, user, membership, "ai_assistant.configure");

    // Filtre capabilities : garde uniquement les codes connus
    const sanitized: typeof args.capabilities = {};
    for (const code of CAPABILITY_CODES) {
      if (args.capabilities[code]) {
        sanitized[code] = args.capabilities[code];
      }
    }

    const existing = await ctx.db
      .query("userAIPreferences")
      .withIndex("by_membership", (q) => q.eq("membershipId", membership._id))
      .unique();

    const patch = {
      membershipId: membership._id,
      userId: user._id,
      orgId: args.orgId,
      enabled: args.enabled,
      capabilities: sanitized,
      quietHours: args.quietHours,
      dailyQuota: args.dailyQuota,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return await ctx.db.insert("userAIPreferences", patch);
  },
});

// ═══════════════════════════════════════════════════════════════
// MUTATIONS PUBLIQUES — ORG ADMIN
// ═══════════════════════════════════════════════════════════════

export const upsertCapabilityConfig = mutation({
  args: {
    orgId: v.id("orgs"),
    capabilityCode: v.string(),
    enabled: v.boolean(),
    autoApplyAllowed: v.boolean(),
    maxSensitivity: sensitivityValidator,
    modelOverride: v.optional(v.string()),
    dailyBudgetMicroCents: v.optional(v.number()),
    allowedPositionIds: v.optional(v.array(v.id("positions"))),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const membership = await getMembership(ctx, user._id, args.orgId);
    await assertCanDoTask(ctx, user, membership, "ai_assistant.admin");

    if (!CAPABILITY_REGISTRY[args.capabilityCode as CapabilityCode]) {
      throw error(ErrorCode.INVALID_ARGUMENT, `Capability inconnue: ${args.capabilityCode}`);
    }

    const capDef = CAPABILITY_REGISTRY[args.capabilityCode as CapabilityCode];
    const autoApplyAllowed =
      capDef.supportsAutoApply && args.autoApplyAllowed;

    const existing = await ctx.db
      .query("aiCapabilityConfig")
      .withIndex("by_org_capability", (q) =>
        q.eq("orgId", args.orgId).eq("capabilityCode", args.capabilityCode),
      )
      .unique();

    const patch = {
      orgId: args.orgId,
      capabilityCode: args.capabilityCode,
      enabled: args.enabled,
      autoApplyAllowed,
      maxSensitivity: args.maxSensitivity,
      modelOverride: args.modelOverride,
      dailyBudgetMicroCents: args.dailyBudgetMicroCents,
      allowedPositionIds: args.allowedPositionIds,
      updatedAt: Date.now(),
      updatedBy: user._id,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return await ctx.db.insert("aiCapabilityConfig", patch);
  },
});

// ═══════════════════════════════════════════════════════════════
// INTERNAL — verification permission depuis une action
// ═══════════════════════════════════════════════════════════════

/** Appelee depuis proactiveAgent (action) pour verifier assertCanDoTask. */
export const checkPermissionInternal = internalQuery({
  args: {
    userId: v.id("users"),
    membershipId: v.id("memberships"),
    requiredTask: v.string(),
  },
  handler: async (ctx, { userId, membershipId, requiredTask }): Promise<boolean> => {
    const user = await ctx.db.get(userId);
    if (!user) return false;
    const membership = await ctx.db.get(membershipId);
    if (!membership) return false;
    return await canDoTask(ctx, user, membership, requiredTask as TaskCodeValue);
  },
});

export const getOrgCapabilityConfigs = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, { orgId }) => {
    const user = await requireAuth(ctx);
    const membership = await getMembership(ctx, user._id, orgId);
    // ai_assistant.configure suffit pour VOIR la config (audit des users aussi OK)
    const canView = await canDoTask(ctx, user, membership, "ai_assistant.configure");
    const canAudit = await canDoTask(ctx, user, membership, "ai_assistant.audit");
    if (!canView && !canAudit) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    return await ctx.db
      .query("aiCapabilityConfig")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
  },
});
