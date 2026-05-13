/**
 * useGeminiVoiceHost — Adaptateur Gemini Live → `IAstedVoiceController`.
 *
 * Wrappe `useAdminVoiceChat` (qui parle au backend Gemini Live via
 * WebSocket) et produit le contrat canonique consommé par toute l'UI
 * vocale (CircleMenu, VoiceFloatingTranscription, raccourci clavier, etc.).
 *
 * À monter au niveau du `<IAstedVoiceProvider>` (au-dessus de l'AppShell)
 * pour que la session WebSocket survive à la fermeture de la fenêtre iAsted.
 *
 * Capabilities Gemini :
 *   - pageContextUpdate : false (l'API Gemini Live ne supporte pas la
 *     mise à jour du systemInstruction en cours de session)
 *   - toolCalling : true (function calling natif)
 *   - voiceSelection : false (la voix est configurée à l'init, pas
 *     modifiable à chaud côté client)
 *   - speechRateControl : false
 *   - realTimeTranscription : false (le hook actuel ne stocke pas les
 *     transcripts texte — TODO : capturer `inputTranscription` /
 *     `outputTranscription` Gemini)
 */

"use client";

import { useMemo } from "react";
import type {
	IAstedVoiceController,
	RealtimeMessage,
	VoicePendingConfirmation,
} from "@workspace/iasted";
import { useRawGeminiVoiceStrict } from "@workspace/agent-features/components/iasted-host";

export function useGeminiVoiceHost(): IAstedVoiceController {
	// Lit l'instance singleton de `useAdminVoiceChat` publiée par
	// `<RawGeminiVoiceProvider>`. Garantit qu'il n'y a qu'une seule
	// session WebSocket Gemini quel que soit le nombre d'observateurs.
	const voice = useRawGeminiVoiceStrict();

	// Gemini Live ne pousse pas de transcripts texte structurés à
	// `useAdminVoiceChat` aujourd'hui. On expose un tableau vide pour
	// l'instant — la fenêtre flottante de transcription affichera
	// uniquement l'indicateur d'état (parle / écoute).
	const messages: RealtimeMessage[] = useMemo(() => [], []);

	// Mappe la confirmation Gemini brute vers le contrat canonique. La
	// présence de cet objet déclenche l'affichage de la carte de
	// confirmation dans `VoiceTab` (et autres consommateurs).
	const pendingConfirmation: VoicePendingConfirmation | null = useMemo(
		() =>
			voice.pendingConfirmation
				? {
					description: voice.pendingConfirmation.description,
					toolName: voice.pendingConfirmation.toolName,
					confirm: voice.confirmPending,
					reject: voice.rejectPending,
					isConfirming: voice.isConfirming,
				}
				: null,
		[
			voice.pendingConfirmation,
			voice.confirmPending,
			voice.rejectPending,
			voice.isConfirming,
		],
	);

	return useMemo<IAstedVoiceController>(
		() => ({
			providerId: "gemini-live",
			providerLabel: "Gemini Live",
			capabilities: {
				// Push mid-session via clientContent + préfixe interprété par
				// le prompt système (cf. useAdminVoiceChat.updatePageContext).
				pageContextUpdate: true,
				toolCalling: true,
				voiceSelection: false,
				speechRateControl: false,
				realTimeTranscription: false,
			},
			available: voice.isAvailable,
			unavailableReason: voice.isAvailable
				? undefined
				: voice.error ?? "Mode vocal indisponible",
			voiceState: voice.state,
			// Gemini ne remonte pas de niveau audio normalisé via le hook
			// actuel : on laisse 0 (le trigger reste en pulse passif).
			audioLevel: 0,
			isConnected: voice.state !== "idle" && voice.state !== "error",
			activateVoice: voice.startVoice,
			deactivateVoice: voice.stopVoice,
			messages,
			clearMessages: () => {
				/* no-op : pas de buffer de messages côté Gemini */
			},
			pendingConfirmation,
			updatePageContext: voice.updatePageContext,
		}),
		[
			voice.isAvailable,
			voice.error,
			voice.state,
			voice.startVoice,
			voice.stopVoice,
			voice.updatePageContext,
			messages,
			pendingConfirmation,
		],
	);
}
