/**
 * LLM Router — etape 2 du pipeline Decider.
 *
 * Prend un evenement brut (nouvelle row dans requests, document upload, etc.)
 * et decide :
 *   1. Skip (evenement non pertinent pour IA) — 70% des cas attendus
 *   2. Route vers capability code + priority + reason
 *
 * Utilise Gemini Flash (rapide + pas cher). Sortie JSON strict.
 * Timeout 5s, cout attendu ~30 micro-cents par appel.
 */

"use node";

import { callGemini } from "./providers/gemini";
import { CAPABILITY_CODES, CAPABILITY_REGISTRY } from "./capabilityRegistry";

export interface RouterInput {
  eventType: string; // "request.statusChanged", "document.uploaded", etc.
  entityType: string;
  entitySummary: string; // Petit texte descriptif (1-3 lignes), PII deja masquee
  contextHints?: string[]; // Ex: ["statut: UnderReview", "idle: 52h"]
}

export type RouterDecision =
  | { skip: true; reason: string }
  | {
      skip: false;
      capabilityCode: string;
      priority: "low" | "medium" | "high" | "urgent";
      reason: string;
    };

const SYSTEM_PROMPT = `Tu es le router IA pour l'agent consulaire de Gabon Diplomatie.
Pour chaque evenement systeme, tu decides s'il merite une intervention IA proactive.
Reponds UNIQUEMENT en JSON strict, pas de markdown.

Capabilities disponibles (code → quand les utiliser) :
- request_triage         : demande ouverte depuis longtemps, statut incoherent
- document_analysis      : piece jointe a verifier (expiration, conformite)
- document_drafting      : brouillon de document officiel necessaire
- auto_summary           : fil/dossier long, un resume aide l'agent
- next_step_suggestion   : workflow bloque sans action claire
- risk_detection         : sanctions, doublons, incoherences critiques
- proactive_notifications: notif intelligente a pousser
- voice_assist           : contexte vocal pertinent (appel imminent)
- bulk_actions_helper    : selection multiple complexe en cours
- correspondance_drafting: brouillon courrier diplomatique necessaire
- meeting_prep           : reunion imminente, briefing utile
- compliance_check       : action sensible, verif reglementaire necessaire

Format de reponse :
{
  "skip": false,
  "capabilityCode": "request_triage",
  "priority": "medium",
  "reason": "demande UnderReview depuis 52h, proposer triage"
}
OU
{
  "skip": true,
  "reason": "evenement trop anodin"
}

Priorites :
- urgent : action temps-reel necessaire (ex: visa urgent, risque critique)
- high   : < 1h idealement
- medium : < 4h
- low    : informatif, peut attendre

Tu es CONSERVATEUR : en cas de doute, skip=true. Il vaut mieux rater une
suggestion que d'en pousser une non pertinente (bruit = desactivation).`;

export async function routeEvent(input: RouterInput): Promise<RouterDecision> {
  const userPrompt = `Evenement : ${input.eventType}
Type d'entite : ${input.entityType}

Contexte : ${input.contextHints?.join(" | ") ?? "(aucun)"}

Description :
${input.entitySummary}

Route cet evenement ou skip.`;

  const result = await callGemini<RouterDecision>(userPrompt, {
    model: "gemini-2.5-flash",
    systemPrompt: SYSTEM_PROMPT,
    jsonMode: true,
    maxOutputTokens: 256,
    temperature: 0.1,
    timeoutMs: 8_000,
  });

  const decision = result.output;

  if (!decision || typeof decision !== "object") {
    return { skip: true, reason: "router_invalid_output" };
  }

  if (decision.skip) {
    return { skip: true, reason: decision.reason ?? "skip_no_reason" };
  }

  if (
    !decision.capabilityCode ||
    !CAPABILITY_CODES.includes(decision.capabilityCode as (typeof CAPABILITY_CODES)[number])
  ) {
    return { skip: true, reason: "router_unknown_capability" };
  }

  const capDef = CAPABILITY_REGISTRY[decision.capabilityCode as keyof typeof CAPABILITY_REGISTRY];
  if (!capDef.targetTypes.includes(input.entityType)) {
    return { skip: true, reason: "router_capability_targettype_mismatch" };
  }

  return {
    skip: false,
    capabilityCode: decision.capabilityCode,
    priority: decision.priority ?? "medium",
    reason: decision.reason ?? "routed",
  };
}
