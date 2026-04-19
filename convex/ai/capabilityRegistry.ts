/**
 * Capability Registry — metadonnees statiques des 12 capabilites IA.
 *
 * Pour chaque capability :
 *   - code                 : identifiant stable (idem ModuleCode.ai_assistant.capabilities)
 *   - defaultModel         : modele LLM par defaut ("gemini-2.5-flash" ou "claude-sonnet-4-6")
 *   - provider             : "gemini" | "anthropic"
 *   - requiredTask         : task code metier requis pour executer (ex: "requests.process")
 *                            — ai_assistant.view est TOUJOURS requis en plus (check fait dans runCapability)
 *   - budgetMicroCents     : cout maximum par appel (si depasse => blocked)
 *   - timeoutMs            : timeout par appel (default provider: 30s gemini, 45s claude)
 *   - supportsAutoApply    : true si la capability peut s'executer sans validation (opt-in admin+user)
 *   - targetTypes          : types d'entites que la capability observe/traite
 *   - description          : fr explique le role (UI backoffice)
 *   - canBeTriggeredBy     : sources d'appel autorisees ("trigger" | "cron" | "presence" | "manual")
 *   - fallbackModel        : modele de repli si le principal echoue (optionnel)
 *
 * Cette config est la reference UNIQUE — `aiCapabilityConfig` (table) permet
 * a une org d'override defaultModel et budget, mais pas les contraintes
 * structurelles (requiredTask, targetTypes).
 */

import type { GeminiModel } from "./providers/gemini";
import type { AnthropicModel } from "./providers/anthropic";

export type CapabilityCode =
  | "request_triage"
  | "document_analysis"
  | "document_drafting"
  | "auto_summary"
  | "next_step_suggestion"
  | "risk_detection"
  | "proactive_notifications"
  | "voice_assist"
  | "bulk_actions_helper"
  | "correspondance_drafting"
  | "meeting_prep"
  | "compliance_check";

export type CapabilityProvider = "gemini" | "anthropic";

export type CapabilityTriggerSource = "trigger" | "cron" | "presence" | "manual";

export interface CapabilityDefinition {
  code: CapabilityCode;
  provider: CapabilityProvider;
  defaultModel: GeminiModel | AnthropicModel;
  fallbackModel?: GeminiModel | AnthropicModel;
  requiredTask: string;
  budgetMicroCents: number;
  timeoutMs: number;
  supportsAutoApply: boolean;
  targetTypes: string[];
  canBeTriggeredBy: CapabilityTriggerSource[];
  description: { fr: string; en: string };
}

/**
 * 1 micro-cent = 10^-6 cent = 10^-8 USD
 * 100_000 micro-cents = 0.1 cent = 0.001 USD
 * 1_000_000 micro-cents = 1 cent = 0.01 USD
 */
export const CAPABILITY_REGISTRY: Record<CapabilityCode, CapabilityDefinition> = {
  // ─── Gemini Flash : taches rapides, classification, routing ──────────────
  request_triage: {
    code: "request_triage",
    provider: "gemini",
    defaultModel: "gemini-2.5-flash",
    requiredTask: "requests.process",
    budgetMicroCents: 500_000,
    timeoutMs: 20_000,
    supportsAutoApply: false,
    targetTypes: ["request"],
    canBeTriggeredBy: ["trigger", "cron", "presence"],
    description: {
      fr: "Analyse les demandes ouvertes et propose un statut, commentaire ou assignation pertinente",
      en: "Analyzes open requests and proposes a relevant status, comment, or assignment",
    },
  },
  document_analysis: {
    code: "document_analysis",
    provider: "gemini",
    defaultModel: "gemini-2.5-flash",
    requiredTask: "documents.read",
    budgetMicroCents: 800_000,
    timeoutMs: 30_000,
    supportsAutoApply: false,
    targetTypes: ["document", "request"],
    canBeTriggeredBy: ["trigger", "presence"],
    description: {
      fr: "Verifie les pieces jointes (expiration, conformite, signatures, coherence)",
      en: "Verifies attachments (expiration, conformity, signatures, consistency)",
    },
  },
  auto_summary: {
    code: "auto_summary",
    provider: "gemini",
    defaultModel: "gemini-2.5-flash",
    requiredTask: "requests.read",
    budgetMicroCents: 400_000,
    timeoutMs: 20_000,
    supportsAutoApply: false,
    targetTypes: ["request", "dossierProcedure", "correspondance", "diplomaticTarget"],
    canBeTriggeredBy: ["presence", "manual"],
    description: {
      fr: "Resume automatiquement un long fil/dossier/projet pour gagner du temps",
      en: "Automatically summarizes long threads/folders/projects to save time",
    },
  },
  next_step_suggestion: {
    code: "next_step_suggestion",
    provider: "gemini",
    defaultModel: "gemini-2.5-flash",
    requiredTask: "requests.process",
    budgetMicroCents: 400_000,
    timeoutMs: 15_000,
    supportsAutoApply: false,
    targetTypes: ["request", "dossierProcedure", "diplomaticTarget"],
    canBeTriggeredBy: ["presence", "trigger"],
    description: {
      fr: "Propose la prochaine action pertinente dans un workflow multi-etapes",
      en: "Suggests the next relevant action in a multi-step workflow",
    },
  },
  proactive_notifications: {
    code: "proactive_notifications",
    provider: "gemini",
    defaultModel: "gemini-2.5-flash",
    requiredTask: "ai_assistant.view",
    budgetMicroCents: 200_000,
    timeoutMs: 10_000,
    supportsAutoApply: true,
    targetTypes: ["notification", "request", "appointment"],
    canBeTriggeredBy: ["trigger", "cron"],
    description: {
      fr: "Pousse des notifications intelligentes multi-canal (priorite, canal, timing)",
      en: "Pushes smart multi-channel notifications (priority, channel, timing)",
    },
  },
  voice_assist: {
    code: "voice_assist",
    provider: "gemini",
    defaultModel: "gemini-2.5-flash",
    requiredTask: "ai_assistant.view",
    budgetMicroCents: 800_000,
    timeoutMs: 30_000,
    supportsAutoApply: false,
    targetTypes: ["call", "meeting", "request"],
    canBeTriggeredBy: ["presence", "manual"],
    description: {
      fr: "Assistant vocal proactif (briefing avant appel, transcription intelligente)",
      en: "Proactive voice assistant (pre-call briefing, smart transcription)",
    },
  },
  bulk_actions_helper: {
    code: "bulk_actions_helper",
    provider: "gemini",
    defaultModel: "gemini-2.5-flash",
    requiredTask: "requests.process",
    budgetMicroCents: 300_000,
    timeoutMs: 15_000,
    supportsAutoApply: false,
    targetTypes: ["request", "document", "correspondance"],
    canBeTriggeredBy: ["presence", "manual"],
    description: {
      fr: "Assiste les selections multiples : propose grouper, exclure, prioriser",
      en: "Assists multi-selection: suggests grouping, excluding, prioritizing",
    },
  },
  meeting_prep: {
    code: "meeting_prep",
    provider: "gemini",
    defaultModel: "gemini-2.5-flash",
    requiredTask: "meetings.read",
    budgetMicroCents: 600_000,
    timeoutMs: 25_000,
    supportsAutoApply: false,
    targetTypes: ["meeting", "appointment", "diplomaticTarget"],
    canBeTriggeredBy: ["trigger", "cron", "presence"],
    description: {
      fr: "Prepare une reunion : briefing, ordre du jour, historique participants",
      en: "Prepares a meeting: briefing, agenda, participant history",
    },
  },

  // ─── Claude Sonnet 4.6 : redaction diplomatique, compliance, risque ─────
  document_drafting: {
    code: "document_drafting",
    provider: "anthropic",
    defaultModel: "claude-sonnet-4-6",
    fallbackModel: "gemini-2.5-flash",
    requiredTask: "documents.create",
    budgetMicroCents: 3_000_000,
    timeoutMs: 60_000,
    supportsAutoApply: true,
    targetTypes: ["document", "request"],
    canBeTriggeredBy: ["presence", "manual"],
    description: {
      fr: "Genere des brouillons de documents officiels (attestations, courriers consulaires)",
      en: "Generates official document drafts (certificates, consular letters)",
    },
  },
  risk_detection: {
    code: "risk_detection",
    provider: "anthropic",
    defaultModel: "claude-sonnet-4-6",
    fallbackModel: "gemini-2.5-flash",
    requiredTask: "requests.process",
    budgetMicroCents: 2_000_000,
    timeoutMs: 45_000,
    supportsAutoApply: false,
    targetTypes: ["request", "document", "profile", "diplomaticTarget"],
    canBeTriggeredBy: ["trigger", "presence"],
    description: {
      fr: "Alerte sur incoherences, sanctions internationales, doublons, risques de fraude",
      en: "Alerts on inconsistencies, international sanctions, duplicates, fraud risks",
    },
  },
  correspondance_drafting: {
    code: "correspondance_drafting",
    provider: "anthropic",
    defaultModel: "claude-sonnet-4-6",
    fallbackModel: "gemini-2.5-flash",
    requiredTask: "correspondance.create",
    budgetMicroCents: 3_000_000,
    timeoutMs: 60_000,
    supportsAutoApply: true,
    targetTypes: ["correspondance"],
    canBeTriggeredBy: ["presence", "manual"],
    description: {
      fr: "Brouillons de courriers diplomatiques (notes verbales, lettres officielles)",
      en: "Diplomatic correspondence drafts (verbal notes, official letters)",
    },
  },
  compliance_check: {
    code: "compliance_check",
    provider: "anthropic",
    defaultModel: "claude-sonnet-4-6",
    requiredTask: "ai_assistant.apply",
    budgetMicroCents: 2_500_000,
    timeoutMs: 45_000,
    supportsAutoApply: false,
    targetTypes: ["request", "document", "correspondance", "diplomaticTarget"],
    canBeTriggeredBy: ["trigger", "presence", "manual"],
    description: {
      fr: "Verifie la conformite reglementaire avant toute action sensible",
      en: "Verifies regulatory compliance before any sensitive action",
    },
  },
};

/** Liste stable de tous les codes — ordre d'affichage UI. */
export const CAPABILITY_CODES: CapabilityCode[] = [
  "request_triage",
  "document_analysis",
  "document_drafting",
  "auto_summary",
  "next_step_suggestion",
  "risk_detection",
  "proactive_notifications",
  "voice_assist",
  "bulk_actions_helper",
  "correspondance_drafting",
  "meeting_prep",
  "compliance_check",
];

/** Retourne la definition d'une capability, ou undefined si code inconnu. */
export function getCapability(code: string): CapabilityDefinition | undefined {
  return CAPABILITY_REGISTRY[code as CapabilityCode];
}

/** Liste des capabilities qui peuvent se declencher depuis une source donnee. */
export function getCapabilitiesForTriggerSource(
  source: CapabilityTriggerSource,
): CapabilityDefinition[] {
  return Object.values(CAPABILITY_REGISTRY).filter((cap) =>
    cap.canBeTriggeredBy.includes(source),
  );
}

/** Liste des capabilities qui peuvent cibler un type d'entite donne. */
export function getCapabilitiesForTargetType(targetType: string): CapabilityDefinition[] {
  return Object.values(CAPABILITY_REGISTRY).filter((cap) =>
    cap.targetTypes.includes(targetType),
  );
}
