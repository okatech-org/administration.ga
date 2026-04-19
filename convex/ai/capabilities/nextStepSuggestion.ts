/**
 * Capability: next_step_suggestion
 *
 * Propose la prochaine action pertinente sur un workflow multi-etapes.
 */

"use node";

import { callGemini } from "../providers/gemini";
import type { CapabilityHandler } from "./_types";
import { skip } from "./_types";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

const SYSTEM = `Tu suggeres la prochaine etape sur un workflow consulaire.
Reponds en JSON :
{"shouldAct": bool, "actionLabel": "...", "rationale": "...", "priority": "low|medium|high|urgent"}`;

export const run: CapabilityHandler = async (ctx, args) => {
  if (!args.targetId) return skip("no_target_id");

  let context = "";
  if (args.targetType === "request") {
    const r = await ctx.runQuery(internal.ai.capabilitiesData.getRequestForTriage, {
      requestId: args.targetId as Id<"requests">,
      orgId: args.orgId,
    });
    if (!r) return skip("request_not_found");
    context = `Demande statut=${r.status}, age=${Math.round((Date.now() - r.createdAt) / 3_600_000)}h, documents=${r.documentCount}`;
  } else if (args.targetType === "dossierProcedure") {
    const d = await ctx.runQuery(internal.ai.capabilitiesData.getDossierProcedureForNextStep, {
      dossierId: args.targetId as Id<"dossierProcedures">,
      orgId: args.orgId,
    });
    if (!d) return skip("dossier_not_found");
    context = `Dossier ${d.typeDemarche ?? ""}, statut=${d.statut ?? "?"}, transitions recentes=${d.recentTransitions.length}`;
  } else if (args.targetType === "diplomaticTarget") {
    const t = await ctx.runQuery(internal.ai.capabilitiesData.getDiplomaticTargetForAnalysis, {
      targetId: args.targetId as Id<"diplomaticTargets">,
      orgId: args.orgId,
    });
    if (!t) return skip("target_not_found");
    context = `Cible ${t.name} phase=${t.pipelinePhase ?? "?"}, statut=${t.status}`;
  } else {
    return skip(`unsupported_target_${args.targetType}`);
  }

  const result = await callGemini<{
    shouldAct: boolean;
    actionLabel: string;
    rationale: string;
    priority: "low" | "medium" | "high" | "urgent";
  }>(context, {
    model: "gemini-2.5-flash",
    systemPrompt: SYSTEM,
    jsonMode: true,
    maxOutputTokens: 256,
    temperature: 0.2,
  });

  const out = result.output;
  if (!out?.shouldAct) {
    return {
      proposed: false,
      skipReason: out?.rationale ?? "no_next_step",
      model: result.model,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      costMicroCents: result.costMicroCents,
      latencyMs: result.latencyMs,
    };
  }

  return {
    proposed: true,
    title: out.actionLabel,
    body: out.rationale,
    priority: out.priority,
    model: result.model,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    costMicroCents: result.costMicroCents,
    latencyMs: result.latencyMs,
  };
};
