/**
 * Capability: voice_assist
 *
 * Stub V1 — voice_assist est porte par l'existant convex/ai/voice.ts.
 * Ce handler est enregistre pour que le registry soit complet ;
 * l'integration effective avec le VoiceChatOverlay viendra dans
 * une iteration ulterieure.
 */

"use node";

import type { CapabilityHandler } from "./_types";
import { skip } from "./_types";

export const run: CapabilityHandler = async () => {
  return skip("voice_assist_stub_v1");
};
