/**
 * Capability: proactive_notifications
 *
 * Decide du canal optimal pour une notification (rule-based, pas de LLM).
 * Garde la porte ouverte a un routing LLM futur si sensitivity=high.
 */

"use node";

import type { CapabilityHandler } from "./_types";
import { skip } from "./_types";

export const run: CapabilityHandler = async (_ctx, args) => {
  if (!args.targetId) return skip("no_target_id");

  // Rule-based pour V1 : pas de LLM, cout = 0.
  // Logique : si targetType=request et priorite implicite (passee via metadata future),
  // pousse via canal adequat.
  //
  // Pour ce V1 le handler retourne juste un skip — le router LLM ou les
  // triggers inline feront le vrai travail. Garder cette capability
  // enregistree permet d'accumuler des stats.

  return {
    proposed: false,
    skipReason: "v1_rule_based_placeholder",
    model: "none",
    tokensIn: 0,
    tokensOut: 0,
    costMicroCents: 0,
    latencyMs: 0,
  };
};
