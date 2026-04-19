/**
 * Capability: auto_summary
 *
 * Produit un resume d'un fil/dossier/entite longue.
 */

"use node";

import { callGemini } from "../providers/gemini";
import type { CapabilityHandler } from "./_types";
import { skip } from "./_types";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

const SYSTEM = `Tu produis des resumes operationnels courts (120-250 mots) pour agents consulaires.
Structure : contexte | etat | prochaines actions. Ton factuel, pas de fioritures.

Retourne UNIQUEMENT en JSON :
{"title": "...", "summary": "...", "keyPoints": ["..."], "priority": "low|medium|high|urgent"}`;

export const run: CapabilityHandler = async (ctx, args) => {
  if (!args.targetId) return skip("no_target_id");

  let context = "";
  if (args.targetType === "request") {
    const r = await ctx.runQuery(internal.ai.capabilitiesData.getRequestForTriage, {
      requestId: args.targetId as Id<"requests">,
      orgId: args.orgId,
    });
    if (!r) return skip("request_not_found");
    context = `Demande: statut=${r.status}, type=${r.type}, age=${Math.round((Date.now() - r.createdAt) / 3_600_000)}h. Resume: ${r.summary ?? "(vide)"}`;
  } else if (args.targetType === "dossierProcedure") {
    const d = await ctx.runQuery(internal.ai.capabilitiesData.getDossierProcedureForNextStep, {
      dossierId: args.targetId as Id<"dossierProcedures">,
      orgId: args.orgId,
    });
    if (!d) return skip("dossier_not_found");
    context = `Dossier ${d.typeDemarche ?? ""} statut=${d.statut ?? "?"}, etape=${d.currentStep ?? "?"}, transitions recentes=${d.recentTransitions.length}`;
  } else if (args.targetType === "diplomaticTarget") {
    const t = await ctx.runQuery(internal.ai.capabilitiesData.getDiplomaticTargetForAnalysis, {
      targetId: args.targetId as Id<"diplomaticTargets">,
      orgId: args.orgId,
    });
    if (!t) return skip("target_not_found");
    context = `Cible diplomatique ${t.name} (${t.type}) pays=${t.country}, statut=${t.status}, phase=${t.pipelinePhase ?? "?"}\nDescription: ${t.description ?? ""}`;
  } else {
    return skip(`unsupported_target_type_${args.targetType}`);
  }

  const result = await callGemini<{
    title: string;
    summary: string;
    keyPoints: string[];
    priority: "low" | "medium" | "high" | "urgent";
  }>(`${context}\n\nResume pour un agent qui vient de prendre le sujet.`, {
    model: "gemini-2.5-flash",
    systemPrompt: SYSTEM,
    jsonMode: true,
    maxOutputTokens: 1024,
  });

  const out = result.output;
  if (!out?.summary) {
    return {
      proposed: false,
      skipReason: "llm_empty_output",
      model: result.model,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      costMicroCents: result.costMicroCents,
      latencyMs: result.latencyMs,
    };
  }

  return {
    proposed: true,
    title: out.title ?? "Resume automatique",
    body: out.summary + (out.keyPoints?.length ? "\n\n" + out.keyPoints.map((p) => `- ${p}`).join("\n") : ""),
    priority: out.priority ?? "low",
    metadata: { keyPoints: out.keyPoints },
    model: result.model,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    costMicroCents: result.costMicroCents,
    latencyMs: result.latencyMs,
  };
};
