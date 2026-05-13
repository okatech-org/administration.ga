/**
 * voice-config — Sélection du provider vocal actif.
 *
 * Priorité de résolution (du plus prioritaire au moins) :
 *   1. Variable d'environnement `NEXT_PUBLIC_VOICE_PROVIDER`
 *   2. (futur) préférence utilisateur stockée en Convex
 *   3. Défaut hardcodé : Gemini Live (stable en production aujourd'hui)
 *
 * La valeur est calculée côté client à chaque mount du provider. Pour
 * basculer entre providers en runtime sans rebuild, il faudra une étape
 * supplémentaire (event listener sur la préférence utilisateur).
 */

import type { VoiceProviderId } from "@workspace/iasted";

const DEFAULT_PROVIDER: VoiceProviderId = "gemini-live";

export function getVoiceProviderId(): VoiceProviderId {
	const fromEnv = process.env.NEXT_PUBLIC_VOICE_PROVIDER;
	if (fromEnv === "openai-realtime" || fromEnv === "gemini-live") {
		return fromEnv;
	}
	return DEFAULT_PROVIDER;
}
