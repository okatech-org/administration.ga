import { defineTable } from "convex/server";
import { v } from "convex/values";
import { weeklyScheduleValidator } from "../lib/validators";

/**
 * Table orgIAstedConfig — Configuration du chatbot iAsted par représentation
 *
 * Remplace la persona globale hardcodée par une configuration contextuelle
 * pour chaque ambassade/consulat. Un document par org (cardinalité 1:1).
 *
 * Relations :
 *   - orgId → orgs (représentation concernée)
 *   - persona.avatarStorageId → _storage (avatar custom)
 *   - priorityServices[] → orgServices (services à mettre en avant)
 *   - escalation.handoffTarget.callLineId → callLines (escalade vers ligne d'appel)
 *   - escalation.handoffTarget.membershipIds[] → memberships (escalade vers agents)
 *
 * Patterns d'usage backend :
 *   1. convex/ai/chat.ts charge `getByOrgId(orgId)` au début de chaque conversation
 *   2. `systemPromptSuffix` est concaténé au prompt Gemini système
 *   3. `toolsPolicy` filtre les tools disponibles avant passage à Gemini
 *   4. `availability.mode` bloque ou permet les conversations selon horaires
 *   5. Escalation : détection sentiment + keywords → proposition handoff à l'utilisateur
 */

// ─── Persona ──────────────────────────────────────────────
export const iAstedPersonaValidator = v.object({
  name: v.string(), // ex: "Astedia Madrid"
  avatarStorageId: v.optional(v.id("_storage")),
  tone: v.union(
    v.literal("formel"), // diplomatique, vouvoiement strict
    v.literal("professionnel"), // par défaut
    v.literal("chaleureux"), // accueillant, plus familier
    v.literal("concis"), // réponses courtes
  ),
  signature: v.optional(v.string()),
});

// ─── Tools policy ─────────────────────────────────────────
export const iAstedToolsPolicyValidator = v.object({
  mode: v.union(
    v.literal("whitelist"),
    v.literal("blacklist"),
    v.literal("all"),
  ),
  enabledTools: v.array(v.string()),
  disabledTools: v.array(v.string()),
  citizenOnlyTools: v.array(v.string()),
  agentOnlyTools: v.array(v.string()),
});

// ─── Langues ───────────────────────────────────────────────
export const iAstedLanguagesValidator = v.object({
  supported: v.array(v.string()), // ["fr", "en", "es", "pt", "ar"]
  default: v.string(),
  autoDetect: v.boolean(),
});

// ─── Disponibilité ─────────────────────────────────────────
export const iAstedAvailabilityValidator = v.object({
  mode: v.union(
    v.literal("always"),
    v.literal("business_hours"),
    v.literal("custom_schedule"),
    v.literal("disabled"),
  ),
  customSchedule: v.optional(weeklyScheduleValidator),
  outOfHoursMessage: v.optional(v.string()),
  outOfHoursAction: v.optional(
    v.union(
      v.literal("show_message"),
      v.literal("create_ticket"),
      v.literal("suggest_callback"),
    ),
  ),
});

// ─── Escalation ────────────────────────────────────────────
export const iAstedEscalationValidator = v.object({
  triggerKeywords: v.array(v.string()),
  triggerSentiment: v.union(
    v.literal("negative_only"),
    v.literal("frustrated"),
    v.literal("never"),
  ),
  maxTurnsBeforeSuggestHandoff: v.number(),
  handoffTarget: v.object({
    type: v.union(
      v.literal("call_line"),
      v.literal("membership"),
      v.literal("chat_standard"),
    ),
    callLineId: v.optional(v.id("callLines")),
    membershipIds: v.optional(v.array(v.id("memberships"))),
  }),
  handoffMessage: v.string(),
});

// ─── Mémoire ──────────────────────────────────────────────
export const iAstedMemoryValidator = v.object({
  conversationRetentionDays: v.number(), // 30, 90, 365
  learnFromConversations: v.boolean(),
  shareAnalyticsWithPlatform: v.boolean(),
});

// ─── Quotas ───────────────────────────────────────────────
export const iAstedQuotasValidator = v.object({
  maxMessagesPerCitizenPerDay: v.optional(v.number()),
  maxTokensPerDayTotal: v.optional(v.number()),
  alertAtPercent: v.number(), // 0-100
});

// ─── Problèmes locaux connus (contextualisation) ──────────
export const iAstedLocalIssueValidator = v.object({
  topic: v.string(), // ex: "Grève transport Madrid"
  response: v.string(), // réponse contextuelle
  activeUntil: v.optional(v.number()),
});

export const orgIAstedConfigTable = defineTable({
  orgId: v.id("orgs"),

  // Persona
  persona: iAstedPersonaValidator,

  // Prompt contextualisé
  systemPromptSuffix: v.string(),
  customProcedures: v.optional(v.string()),
  priorityServices: v.optional(v.array(v.id("orgServices"))),
  knownLocalIssues: v.optional(v.array(iAstedLocalIssueValidator)),

  // Tools
  toolsPolicy: iAstedToolsPolicyValidator,

  // Langues
  languages: iAstedLanguagesValidator,

  // Disponibilité
  availability: iAstedAvailabilityValidator,

  // Escalation
  escalation: iAstedEscalationValidator,

  // Mémoire
  memory: iAstedMemoryValidator,

  // Quotas
  quotas: v.optional(iAstedQuotasValidator),

  // Métadonnées
  isActive: v.boolean(),
  updatedAt: v.number(),
  updatedBy: v.optional(v.id("users")),
})
  .index("by_org", ["orgId"])
  .index("by_active", ["isActive"]);
