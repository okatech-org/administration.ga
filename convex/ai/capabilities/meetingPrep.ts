/**
 * Capability: meeting_prep
 *
 * Genere un briefing avant une reunion.
 */

"use node";

import { callGemini } from "../providers/gemini";
import type { CapabilityHandler } from "./_types";
import { skip } from "./_types";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

const SYSTEM = `Tu prepares des briefings de reunion pour agents consulaires.
Format JSON :
{"title": "...", "briefing": "(markdown: objectifs/historique/points-cles/risques)", "agenda": ["..."], "priority": "low|medium|high"}`;

export const run: CapabilityHandler = async (ctx, args) => {
  if (!args.targetId || args.targetType !== "meeting") {
    return skip("unsupported_target");
  }

  const m = await ctx.runQuery(internal.ai.capabilitiesData.getMeetingForPrep, {
    meetingId: args.targetId as Id<"meetings">,
    orgId: args.orgId,
  });
  if (!m) return skip("meeting_not_found");

  if (!m.scheduledAt) return skip("meeting_not_scheduled");

  const hoursUntil = (m.scheduledAt - Date.now()) / 3_600_000;
  if (hoursUntil < 0 || hoursUntil > 48) {
    return skip(`outside_briefing_window_${Math.round(hoursUntil)}h`);
  }

  const prompt = `Reunion : ${m.title}
Date: ${new Date(m.scheduledAt).toISOString()} (dans ${hoursUntil.toFixed(1)}h)
Description: ${m.description ?? ""}
Participants: ${JSON.stringify(m.participants)}

Prepare un briefing operationnel.`;

  const result = await callGemini<{
    title: string;
    briefing: string;
    agenda: string[];
    priority: "low" | "medium" | "high";
  }>(prompt, {
    model: "gemini-2.5-flash",
    systemPrompt: SYSTEM,
    jsonMode: true,
    maxOutputTokens: 1024,
  });

  const out = result.output;
  if (!out?.briefing) {
    return {
      proposed: false,
      skipReason: "empty_briefing",
      model: result.model,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      costMicroCents: result.costMicroCents,
      latencyMs: result.latencyMs,
    };
  }

  return {
    proposed: true,
    title: out.title ?? `Briefing : ${m.title}`,
    body: out.briefing + (out.agenda?.length ? "\n\n**Ordre du jour propose :**\n" + out.agenda.map((a, i) => `${i + 1}. ${a}`).join("\n") : ""),
    priority: out.priority ?? (hoursUntil < 4 ? "high" : "medium"),
    metadata: { agenda: out.agenda, scheduledAt: m.scheduledAt },
    targetRoute: `/meetings/${args.targetId}`,
    model: result.model,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    costMicroCents: result.costMicroCents,
    latencyMs: result.latencyMs,
  };
};
