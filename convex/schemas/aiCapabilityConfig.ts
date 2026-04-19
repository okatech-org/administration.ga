/**
 * AI Capability Config Schema (par org)
 *
 * Configuration org-level de chaque capability IA :
 *   - Activation par capability (defaut: false)
 *   - Auto-apply autorise par cette org (defaut: false)
 *   - Sensibilite max permise aux users
 *   - Modele LLM force (override registry)
 *   - Budget quotidien en cents
 *
 * Configurable via le backoffice (org-ai-assistant-tab.tsx).
 *
 * Une row par (orgId, capabilityCode).
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";
import { sensitivityValidator } from "./userAIPreferences";

export const aiCapabilityConfigTable = defineTable({
  orgId: v.id("orgs"),

  /** Code de la capability (ex: "request_triage", "compliance_check") */
  capabilityCode: v.string(),

  /** Capability activee pour cette org */
  enabled: v.boolean(),

  /** Auto-apply autorise (les users peuvent l'activer dans leurs prefs) */
  autoApplyAllowed: v.boolean(),

  /** Sensibilite max qu'un user peut choisir (cap) */
  maxSensitivity: sensitivityValidator,

  /** Override du modele LLM par defaut du registry */
  modelOverride: v.optional(v.string()),

  /**
   * Budget quotidien max en micro-cents (1$ = 1 000 000 micro-cents).
   * Au-dela de ce seuil, la capability est auto-bloquee jusqu'au
   * lendemain UTC. Cumul calcule depuis aiActivityLog.
   */
  dailyBudgetMicroCents: v.optional(v.number()),

  /** Roles autorises (vide = tous ceux qui ont la permission) */
  allowedPositionIds: v.optional(v.array(v.id("positions"))),

  updatedAt: v.number(),
  updatedBy: v.optional(v.id("users")),
})
  .index("by_org", ["orgId"])
  .index("by_org_capability", ["orgId", "capabilityCode"])
  .index("by_org_enabled", ["orgId", "enabled"]);
