/**
 * useVoiceProvider — Dispatcher provider-agnostique.
 *
 * Instancie **tous** les adaptateurs côté React (les hooks doivent être
 * appelés inconditionnellement à chaque render) mais expose uniquement
 * celui qui correspond au provider actif. Les adaptateurs inactifs
 * restent en `idle` sans consommer de ressources (pas de WebSocket /
 * WebRTC ouvert tant que `activateVoice` n'est pas appelé).
 *
 * Cette indirection permet à toute l'UI vocale de consommer une
 * interface unique (`IAstedVoiceController`) sans se soucier du
 * provider sous-jacent. Pour basculer Gemini ↔ OpenAI : changer
 * `NEXT_PUBLIC_VOICE_PROVIDER` et rebuilder.
 */

"use client";

import type { IAstedVoiceController } from "@workspace/iasted";
import { useIAstedHost } from "./use-iasted-host";
import { useGeminiVoiceHost } from "./use-gemini-voice-host";
import { getVoiceProviderId } from "./voice-config";

export function useVoiceProvider(): IAstedVoiceController {
	// Les deux hooks sont appelés à chaque render — règles React. Seul le
	// résultat du provider sélectionné est retourné. Le provider non-actif
	// reste en `idle` car son activation se fait par `activateVoice()` qui
	// n'est jamais déclenché sur cette branche.
	const openai = useIAstedHost();
	const gemini = useGeminiVoiceHost();

	const providerId = getVoiceProviderId();
	return providerId === "openai-realtime" ? openai : gemini;
}
