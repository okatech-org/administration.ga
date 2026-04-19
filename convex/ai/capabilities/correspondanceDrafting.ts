/**
 * Capability: correspondance_drafting
 *
 * Brouillon de courrier diplomatique via Claude Sonnet 4.6.
 * Auto-apply possible (admin org + user opt-in).
 */

"use node";

import { callClaude } from "../providers/anthropic";
import type { CapabilityHandler } from "./_types";
import { skip } from "./_types";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

const SYSTEM = `Tu es redacteur de courrier diplomatique pour le Gabon.
Tu respectes strictement les conventions diplomatiques francaises :
- formulations en-tete et cloture formelles
- eviter le "je" personnel, utiliser "la mission" / "le gouvernement"
- pas d'emojis, pas de familiarite

Reponds en JSON strict :
{
  "subject": "(objet du courrier)",
  "body": "(corps en markdown formel)",
  "type": "note_verbale|lettre_officielle|lettre_personnelle|autre",
  "language": "fr|en",
  "confidence": 0-100
}`;

export const run: CapabilityHandler = async (ctx, args) => {
  if (!args.targetId || args.targetType !== "correspondance") {
    return skip("unsupported_target");
  }

  const item = await ctx.runQuery(internal.ai.capabilitiesData.getCorrespondanceForDrafting, {
    correspondanceId: args.targetId as Id<"correspondanceItems">,
    orgId: args.orgId,
  });
  if (!item) return skip("correspondance_not_found");

  const prompt = `Courrier existant (brouillon partiel) :
- Objet: ${item.subject}
- Type: ${item.type}
- Direction: ${item.direction}
- Langue: ${item.language}
- Corps actuel: ${item.body ?? "(vide)"}

Redige la version finale ou completee.`;

  const result = await callClaude<{
    subject: string;
    body: string;
    type: string;
    language: string;
    confidence: number;
  }>(prompt, {
    model: "claude-sonnet-4-6",
    systemPrompt: SYSTEM,
    jsonMode: true,
    maxTokens: 2048,
    temperature: 0.25,
    cacheSystemPrompt: true,
  });

  const out = result.output;
  if (!out?.body || (out.confidence ?? 0) < 60) {
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
    title: `Brouillon propose : ${out.subject}`,
    body: out.body,
    priority: "medium",
    metadata: { type: out.type, language: out.language, confidence: out.confidence },
    proposedActions: [
      {
        label: "Appliquer ce brouillon",
        kind: "update_field",
        mutationPath: "functions/correspondance:updateDraftBody",
        mutationArgs: { correspondanceId: args.targetId, subject: out.subject, body: out.body },
        variant: "primary",
      },
    ],
    targetRoute: `/icorrespondance/${args.targetId}`,
    model: result.model,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    costMicroCents: result.costMicroCents,
    latencyMs: result.latencyMs,
  };
};
