/**
 * voice-config — Sélection du provider vocal actif.
 *
 * Priorité de résolution (du plus prioritaire au moins) :
 *   1. Variable d'environnement `NEXT_PUBLIC_VOICE_PROVIDER`
 *   2. (futur) préférence utilisateur stockée en Convex
 *   3. Défaut hardcodé : OpenAI Realtime (canon iAsted)
 *
 * iAsted est canoniquement adossé à OpenAI Realtime sur consulat.ga /
 * diplomate.ga / admin.consulat.ga — le dispatcher Gemini reste accessible
 * via `NEXT_PUBLIC_VOICE_PROVIDER=gemini-live` mais ne doit jamais devenir
 * le défaut sans décision produit explicite (cf. feedback memory).
 */

import type { VoiceProviderId } from "@workspace/iasted";

const DEFAULT_PROVIDER: VoiceProviderId = "openai-realtime";

export function getVoiceProviderId(): VoiceProviderId {
	const fromEnv = process.env.NEXT_PUBLIC_VOICE_PROVIDER;
	if (fromEnv === "openai-realtime" || fromEnv === "gemini-live") {
		return fromEnv;
	}
	return DEFAULT_PROVIDER;
}
