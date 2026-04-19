/**
 * Capability: document_drafting
 *
 * Genere un brouillon de document officiel via Claude Sonnet 4.6.
 * Auto-apply possible si admin org + user l'autorisent.
 */

"use node";

import { callClaude } from "../providers/anthropic";
import type { CapabilityHandler } from "./_types";
import { skip } from "./_types";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

const SYSTEM = `Tu es un redacteur consulaire officiel pour le Gabon.
Redige UNIQUEMENT en JSON avec ce schema :
{
  "title": "(titre court du document)",
  "body": "(corps du document en markdown, ton formel, sans salutations familieres)",
  "documentType": "attestation|certificat|lettre|autre",
  "confidence": 0-100
}
Respecte la formalite diplomatique francaise. Pas d'emojis.`;

export const run: CapabilityHandler = async (ctx, args) => {
  if (!args.targetId) return skip("no_target_id");

  // Le target peut etre une request (qui requires un doc), ou un document existant a reviser.
  const request =
    args.targetType === "request"
      ? await ctx.runQuery(internal.ai.capabilitiesData.getRequestForTriage, {
          requestId: args.targetId as Id<"requests">,
          orgId: args.orgId,
        })
      : null;

  const context = request
    ? `Demande: type=${request.type ?? "?"}, statut=${request.status}, resume=${request.summary ?? "(vide)"}`
    : `Cible: ${args.targetType} id=${args.targetId}`;

  const prompt = `Contexte : ${context}

Redige un brouillon officiel adapte. Reste factuel.`;

  const result = await callClaude<{
    title: string;
    body: string;
    documentType: string;
    confidence: number;
  }>(prompt, {
    model: "claude-sonnet-4-6",
    systemPrompt: SYSTEM,
    jsonMode: true,
    maxTokens: 2048,
    temperature: 0.3,
    cacheSystemPrompt: true,
  });

  const out = result.output;
  if (!out?.body || (out.confidence ?? 0) < 50) {
    return {
      proposed: false,
      skipReason: `low_confidence_${out?.confidence ?? 0}`,
      model: result.model,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      costMicroCents: result.costMicroCents,
      latencyMs: result.latencyMs,
    };
  }

  return {
    proposed: true,
    title: `Brouillon propose : ${out.title}`,
    body: out.body,
    priority: "medium",
    metadata: { documentType: out.documentType, confidence: out.confidence },
    proposedActions: [
      {
        label: "Creer ce document",
        kind: "create_document",
        mutationPath: "functions/generatedDocuments:createFromDraft",
        mutationArgs: {
          title: out.title,
          body: out.body,
          requestId: args.targetType === "request" ? args.targetId : undefined,
        },
        variant: "primary",
      },
    ],
    targetRoute:
      args.targetType === "request" ? `/requests/${args.targetId}` : undefined,
    model: result.model,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    costMicroCents: result.costMicroCents,
    latencyMs: result.latencyMs,
  };
};
