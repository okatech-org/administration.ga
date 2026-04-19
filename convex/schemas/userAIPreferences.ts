/**
 * User AI Preferences Schema
 *
 * Preferences personnelles par membership pour l'agent IA proactif.
 * Une row par (userId, membershipId) — un user actif dans plusieurs orgs
 * peut avoir des preferences distinctes par org.
 *
 * Hierarchie de resolution :
 *   1. Kill switch global (env AI_ASSISTANT_GLOBAL_KILL_SWITCH)
 *   2. Module ai_assistant active sur l'org ?
 *   3. aiCapabilityConfig (org override : enabled, autoApplyAllowed, maxSensitivity)
 *   4. userAIPreferences (cette table : enabled, autoApply, sensitivity, channels)
 *
 * L'admin org peut toujours abaisser un parametre user, mais un user
 * ne peut pas elever au-dessus de la config org.
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const sensitivityValidator = v.union(
  v.literal("low"),    // L'IA n'intervient que sur les cas tres clairs
  v.literal("medium"), // Equilibre suggestions vs bruit (defaut)
  v.literal("high"),   // L'IA propose plus, accepte plus d'incertitude
);

export const channelValidator = v.union(
  v.literal("toast"),    // sonner notification
  v.literal("inline"),   // Badge contextuel dans formulaire/tableau
  v.literal("activity"), // Visible uniquement dans le feed
  v.literal("email"),    // Email Resend
);

/** Configuration par capability dans les preferences user */
export const userCapabilityPrefsValidator = v.object({
  enabled: v.boolean(),
  /** L'IA peut appliquer cette action sans validation manuelle (opt-in) */
  autoApply: v.boolean(),
  sensitivity: sensitivityValidator,
  channels: v.array(channelValidator),
});

export const userAIPreferencesTable = defineTable({
  membershipId: v.id("memberships"),
  userId: v.id("users"),
  orgId: v.id("orgs"),

  /** Master switch : si false, aucune IA proactive pour ce user dans cette org */
  enabled: v.boolean(),

  /**
   * Preferences par capability code.
   * Cle = capabilityCode (ex: "request_triage")
   * Valeur = userCapabilityPrefsValidator
   */
  capabilities: v.record(v.string(), userCapabilityPrefsValidator),

  /** Heures silencieuses (HH:MM-HH:MM, fuseau de l'org) */
  quietHours: v.optional(v.object({
    from: v.string(),
    to: v.string(),
    timezone: v.optional(v.string()),
  })),

  /** Quota max de suggestions par jour (au-dela : auto-skip) */
  dailyQuota: v.optional(v.number()),

  updatedAt: v.number(),
})
  .index("by_membership", ["membershipId"])
  .index("by_user", ["userId"])
  .index("by_org", ["orgId"]);
