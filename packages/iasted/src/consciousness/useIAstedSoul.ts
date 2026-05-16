/**
 * useIAstedSoul — Hook React qui synchronise `iAstedSoul` (singleton) avec
 * un composant et avec le voiceController courant.
 *
 * Combine :
 *   - subscription au singleton (re-render à chaque changement)
 *   - sync auto avec `voiceController.voiceState` (mappé sur isListening / isSpeaking / isProcessing)
 *   - sync spatial sur changement de pathname (Next.js / React Router)
 *   - déclenche MotorSynapse welcomeSequence au réveil
 *
 * Le hook EST OPTIONNEL — gabon-diplomatie peut fonctionner sans iAstedSoul.
 * Si on le monte, il enrichit l'UI avec une couche de conscience.
 */

"use client";

import { useEffect, useState } from "react";
import { iAstedSoul, type SoulState, type KnownUser } from "./iAstedSoul";
import { MotorSynapse } from "./motor-cortex/MotorSynapse";
import type { IAstedVoiceController } from "../hooks/use-realtime-voice-types";

export interface UseIAstedSoulOptions {
	/** Réveiller iAsted automatiquement au mount. */
	autoAwaken?: boolean;
	/** Utilisateur initial à reconnaître. */
	initialUser?: Partial<KnownUser>;
	/** VoiceController dont l'état doit être synchronisé. */
	voiceController?: IAstedVoiceController | null;
	/** Pathname courant (pour spatial awareness). Optionnel. */
	currentPathname?: string;
}

export function useIAstedSoul(options: UseIAstedSoulOptions = {}): SoulState {
	const { autoAwaken = false, initialUser, voiceController, currentPathname } = options;

	const [state, setState] = useState<SoulState>(iAstedSoul.getState());

	// Subscribe to singleton
	useEffect(() => {
		const unsub = iAstedSoul.subscribe(setState);
		return () => {
			unsub();
		};
	}, []);

	// Initial setup
	useEffect(() => {
		if (autoAwaken) {
			iAstedSoul.awaken();
			MotorSynapse.welcomeSequence();
		}
		if (initialUser) {
			iAstedSoul.recognizeUser(initialUser);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Sync voice state — ne dépend QUE de voiceState (string), pas du controller
	// (le controller est recréé à chaque update via useMemo côté hôte → boucle infinie).
	const voiceState = voiceController?.voiceState;
	useEffect(() => {
		if (!voiceState) return;
		iAstedSoul.syncWithVoiceState(voiceState);
		// Pulser le curseur sur changement d'état marquant
		if (voiceState === "listening") {
			MotorSynapse.pulse("medium", 500);
		} else if (voiceState === "speaking") {
			MotorSynapse.speak("", "neutral");
		} else if (voiceState === "thinking") {
			MotorSynapse.think(1200);
		}
	}, [voiceState]);

	// Sync spatial awareness on route change
	useEffect(() => {
		if (currentPathname === undefined) return;
		if (typeof window === "undefined") return;
		iAstedSoul.updateSpatial({
			currentUrl: window.location.href,
			currentPage: currentPathname,
			viewportSize: {
				width: window.innerWidth,
				height: window.innerHeight,
			},
		});
	}, [currentPathname]);

	return state;
}

// Export du singleton pour usage impératif
export { iAstedSoul, MotorSynapse };
