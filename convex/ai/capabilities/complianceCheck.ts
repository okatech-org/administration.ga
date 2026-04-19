/**
 * Capability: compliance_check
 *
 * Verification reglementaire via Claude Sonnet 4.6.
 */

"use node";

import { callClaude } from "../providers/anthropic";
import type { CapabilityHandler } from "./_types";
import { skip } from "./_types";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

const SYSTEM = `Tu es expert conformite reglementaire consulaire.
Verifie si l'action ou le document respecte les normes :
- Lois gabonaises applicables
- Conventions diplomatiques (Vienne 1961/1963)
- Protection des donnees
- Procedures internes

Reponds en JSON :
{
  "compliant": bool,
  "issues": [{"rule": "...", "severity": "info|warning|error", "message": "..."}],
  "recommendation": "(texte bref)",
  "title": "(court)"
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
    ctxText = `Demande statut=${r.status}, type=${r.type}, resume=${r.summary}`;
  } else if (args.targetType === "document") {
    const d = await ctx.runQuery(internal.ai.capabilitiesData.getDocumentForAnalysis, {
      documentId: args.targetId as Id<"documents">,
      orgId: args.orgId,
    });
    if (!d) return skip("document_not_found");
    ctxText = `Document ${d.name}\nExtrait: ${d.extractedText}`;
  } else if (args.targetType === "correspondance") {
    const c = await ctx.runQuery(internal.ai.capabilitiesData.getCorrespondanceForDrafting, {
      correspondanceId: args.targetId as Id<"correspondanceItems">,
      orgId: args.orgId,
    });
    if (!c) return skip("correspondance_not_found");
    ctxText = `Courrier objet=${c.subject} type=${c.type}\nCorps: ${c.body}`;
  } else {
    return skip(`unsupported_target_${args.targetType}`);
  }

  const result = await callClaude<{
    compliant: boolean;
    issues: Array<{ rule: string; severity: string; message: string }>;
    recommendation: string;
    title: string;
  }>(ctxText, {
    model: "claude-sonnet-4-6",
    systemPrompt: SYSTEM,
    jsonMode: true,
    maxTokens: 1024,
    temperature: 0.1,
    cacheSystemPrompt: true,
  });

  const out = result.output;
  if (out?.compliant !== false || !out.issues?.length) {
    return {
      proposed: false,
      skipReason: "compliant_or_no_issues",
      model: result.model,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      costMicroCents: result.costMicroCents,
      latencyMs: result.latencyMs,
    };
  }

  const hasError = out.issues.some((i) => i.severity === "error");
  const priority: "low" | "medium" | "high" = hasError ? "high" : "medium";

  return {
    proposed: true,
    title: out.title ?? "Verification conformite : problemes detectes",
    body: out.recommendation + "\n\n" + out.issues.map((i) => `- [${i.severity}] ${i.rule}: ${i.message}`).join("\n"),
    priority,
    metadata: { issues: out.issues },
    model: result.model,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    costMicroCents: result.costMicroCents,
    latencyMs: result.latencyMs,
  };
};
