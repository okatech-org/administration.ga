/**
 * Capability: request_triage
 *
 * Analyse une demande ouverte et propose :
 *   - un statut a appliquer (si evident)
 *   - un commentaire de triage pour l'agent
 *   - une priorisation
 *
 * Utilise Gemini Flash (rapide, pas cher).
 */

"use node";

import { callGemini } from "../providers/gemini";
import type { CapabilityHandler } from "./_types";
import { skip } from "./_types";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

const SYSTEM = `Tu es un agent de triage consulaire expert. Analyse la demande et propose :
1. Un statut si tu vois un blocage evident (UnderReview, Approved, RequestingCorrection, OnHold)
2. Un commentaire court (<= 150 caracteres) pour l'agent
3. Une priorite (low|medium|high|urgent)

Reponds uniquement en JSON strict :
{
  "shouldAct": boolean,
  "recommendedStatus": "UnderReview|Approved|RequestingCorrection|OnHold" | null,
  "comment": "...",
  "priority": "low|medium|high|urgent",
  "reasoning": "..."
}

shouldAct=false si la demande est en cours normalement sans anomalie.`;

export const run: CapabilityHandler = async (ctx, args) => {
  if (!args.targetId) return skip("no_target_id");

  const request = await ctx.runQuery(internal.ai.capabilitiesData.getRequestForTriage, {
    requestId: args.targetId as Id<"requests">,
    orgId: args.orgId,
  });
  if (!request) return skip("request_not_found");

  const ageHours = Math.round((Date.now() - request.createdAt) / 3_600_000);
  const prompt = `Demande #${request._id}
Type: ${request.type ?? "?"}
Statut: ${request.status}
Age: ${ageHours}h
Agent assigne: ${request.assignedTo ? "oui" : "non"}
Documents joints: ${request.documentCount}

Description (anonymisee): ${request.summary ?? "(vide)"}

Sensibilite user: ${args.sensitivity} (low = conservateur, high = agressif)

Y a-t-il une action de triage evidente ?`;

  const result = await callGemini<{
    shouldAct: boolean;
    recommendedStatus: string | null;
    comment: string;
    priority: "low" | "medium" | "high" | "urgent";
    reasoning: string;
  }>(prompt, {
    model: "gemini-2.5-flash",
    systemPrompt: SYSTEM,
    jsonMode: true,
    maxOutputTokens: 512,
    temperature: 0.2,
  });

  const out = result.output;

  if (!out?.shouldAct) {
    return {
      proposed: false,
      skipReason: out?.reasoning ?? "llm_no_action",
      model: result.model,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      costMicroCents: result.costMicroCents,
      latencyMs: result.latencyMs,
    };
  }

  const actions = [];
  if (out.recommendedStatus) {
    actions.push({
      label: `Appliquer statut: ${out.recommendedStatus}`,
      kind: "update_status" as const,
      mutationPath: "functions/requests:updateStatus",
      mutationArgs: { requestId: args.targetId, status: out.recommendedStatus },
      variant: "primary" as const,
    });
  }
  if (out.comment) {
    actions.push({
      label: "Ajouter ce commentaire",
      kind: "add_comment" as const,
      mutationPath: "functions/agentNotes:createNote",
      mutationArgs: { requestId: args.targetId, text: out.comment },
      variant: "secondary" as const,
    });
  }

  return {
    proposed: true,
    title: `Triage propose (demande ${ageHours}h)`,
    body: out.reasoning,
    priority: out.priority,
    proposedActions: actions,
    targetRoute: `/requests/${args.targetId}`,
    metadata: { recommendedStatus: out.recommendedStatus, comment: out.comment },
    model: result.model,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    costMicroCents: result.costMicroCents,
    latencyMs: result.latencyMs,
  };
};
