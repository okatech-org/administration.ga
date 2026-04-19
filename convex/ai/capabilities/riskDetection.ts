/**
 * Capability: risk_detection
 *
 * Analyse approfondie via Claude Sonnet 4.6 :
 *   - sanctions internationales
 *   - doublons de dossiers
 *   - incoherences entre documents
 *   - risques de fraude
 */

"use node";

import { callClaude } from "../providers/anthropic";
import type { CapabilityHandler } from "./_types";
import { skip } from "./_types";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

const SYSTEM = `Tu es analyste de risque pour les services consulaires gabonais.
Tu detectes uniquement des signaux a forte probabilite (bruit = desactivation).

Categories de risque :
- fraud : incoherences deliberees, faux documents
- sanctions : correspondance avec sanctions internationales
- duplicate : deja soumis / deja traite
- data_inconsistency : dates/noms/lieux incoherents
- compliance : non-conformite reglementaire claire

Reponds en JSON strict :
{
  "detected": bool,
  "category": "fraud|sanctions|duplicate|data_inconsistency|compliance|none",
  "severity": "low|medium|high|critical",
  "confidence": 0-100,
  "title": "(court)",
  "explanation": "(markdown bref)",
  "recommendedActions": ["..."]
}`;

export const run: CapabilityHandler = async (ctx, args) => {
  if (!args.targetId) return skip("no_target_id");

  let ctxText = "";
  if (args.targetType === "request") {
    const r = await ctx.runQuery(internal.ai.capabilitiesData.getRequestForTriage, {
      requestId: args.targetId as Id<"requests">,
      orgId: args.orgId,
    });
    if (!r) return skip("request_not_found");
    ctxText = `Request statut=${r.status} type=${r.type} docs=${r.documentCount}\nSummary: ${r.summary ?? "(vide)"}`;
  } else if (args.targetType === "document") {
    const d = await ctx.runQuery(internal.ai.capabilitiesData.getDocumentForAnalysis, {
      documentId: args.targetId as Id<"documents">,
      orgId: args.orgId,
    });
    if (!d) return skip("document_not_found");
    ctxText = `Document ${d.name} type=${d.type}\nExtrait:\n${d.extractedText ?? "(pas de texte)"}`;
  } else if (args.targetType === "diplomaticTarget") {
    const t = await ctx.runQuery(internal.ai.capabilitiesData.getDiplomaticTargetForAnalysis, {
      targetId: args.targetId as Id<"diplomaticTargets">,
      orgId: args.orgId,
    });
    if (!t) return skip("target_not_found");
    ctxText = `Cible ${t.name} pays=${t.country} type=${t.type}\nDescription: ${t.description ?? ""}`;
  } else {
    return skip(`unsupported_target_${args.targetType}`);
  }

  const sensitivityInstr =
    args.sensitivity === "low"
      ? "Ne signale que les risques evidents et critiques."
      : args.sensitivity === "high"
      ? "Signale tout signal meme faible mais sois explicite sur la confidence."
      : "Equilibre entre surete et faux positifs.";

  const result = await callClaude<{
    detected: boolean;
    category: string;
    severity: "low" | "medium" | "high" | "critical";
    confidence: number;
    title: string;
    explanation: string;
    recommendedActions: string[];
  }>(`${ctxText}\n\nConsigne de sensibilite : ${sensitivityInstr}`, {
    model: "claude-sonnet-4-6",
    systemPrompt: SYSTEM,
    jsonMode: true,
    maxTokens: 1024,
    temperature: 0.1,
    cacheSystemPrompt: true,
  });

  const out = result.output;
  const confThreshold = args.sensitivity === "low" ? 85 : args.sensitivity === "medium" ? 70 : 55;
  if (!out?.detected || (out.confidence ?? 0) < confThreshold) {
    return {
      proposed: false,
      skipReason: `no_risk_or_low_confidence_${out?.confidence ?? 0}`,
      model: result.model,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      costMicroCents: result.costMicroCents,
      latencyMs: result.latencyMs,
    };
  }

  const priority: "low" | "medium" | "high" | "urgent" =
    out.severity === "critical" ? "urgent" : out.severity === "high" ? "high" : out.severity === "medium" ? "medium" : "low";

  return {
    proposed: true,
    title: out.title ?? `Risque ${out.category} detecte`,
    body: out.explanation + "\n\n" + (out.recommendedActions?.map((a) => `- ${a}`).join("\n") ?? ""),
    priority,
    metadata: { category: out.category, severity: out.severity, confidence: out.confidence },
    model: result.model,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    costMicroCents: result.costMicroCents,
    latencyMs: result.latencyMs,
  };
};
