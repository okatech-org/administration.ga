/**
 * Capability: document_analysis
 *
 * Analyse un document joint : expiration, conformite, signatures, coherence.
 */

"use node";

import { callGemini } from "../providers/gemini";
import type { CapabilityHandler } from "./_types";
import { skip } from "./_types";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

const SYSTEM = `Tu es un specialiste de verification documentaire consulaire.
Analyse le document et retourne UNIQUEMENT en JSON :
{
  "issues": [{"severity": "info|warning|error", "message": "..."}],
  "recommendations": ["..."],
  "priority": "low|medium|high|urgent",
  "title": "(court, <=80 chars)",
  "summary": "(<=300 chars)"
}`;

export const run: CapabilityHandler = async (ctx, args) => {
  if (!args.targetId) return skip("no_target_id");

  const doc = await ctx.runQuery(internal.ai.capabilitiesData.getDocumentForAnalysis, {
    documentId: args.targetId as Id<"documents">,
    orgId: args.orgId,
  });
  if (!doc) return skip("document_not_found");

  const prompt = `Document: ${doc.name}
Type MIME: ${doc.type}
Taille: ${doc.size} octets
Date upload: ${new Date(doc.uploadedAt).toISOString()}

Texte extrait (tronque):
${doc.extractedText ?? "(pas de texte extrait)"}

Metadata: ${JSON.stringify(doc.metadata ?? {}).slice(0, 500)}

Sensibilite user: ${args.sensitivity}

Y a-t-il des problemes (expiration, signature manquante, incoherence) ?`;

  const result = await callGemini<{
    issues: Array<{ severity: string; message: string }>;
    recommendations: string[];
    priority: "low" | "medium" | "high" | "urgent";
    title: string;
    summary: string;
  }>(prompt, {
    model: "gemini-2.5-flash",
    systemPrompt: SYSTEM,
    jsonMode: true,
    maxOutputTokens: 1024,
  });

  const out = result.output;
  const hasIssues = out?.issues && out.issues.length > 0;
  if (!hasIssues) {
    return {
      proposed: false,
      skipReason: "no_issues_detected",
      model: result.model,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      costMicroCents: result.costMicroCents,
      latencyMs: result.latencyMs,
    };
  }

  return {
    proposed: true,
    title: out.title ?? "Analyse document : problemes detectes",
    body: out.summary ?? "",
    priority: out.priority,
    metadata: { issues: out.issues, recommendations: out.recommendations },
    proposedActions: [
      {
        label: "Voir le document",
        kind: "navigate",
        mutationArgs: { route: `/documents/${args.targetId}` },
        variant: "primary",
      },
    ],
    targetRoute: `/documents/${args.targetId}`,
    model: result.model,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    costMicroCents: result.costMicroCents,
    latencyMs: result.latencyMs,
  };
};
