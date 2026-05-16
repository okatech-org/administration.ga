"use client";

/**
 * IAstedLiveKitBridge — Pont entre l'agent vocal iAsted et le `LocalParticipant`
 * LiveKit du `<LiveKitRoom>` courant.
 *
 * Écoute les CustomEvents `iasted:livekit-control` émis par
 * `useIAstedHost.dispatchUiAction` quand le modèle invoque les tools
 * `toggle_mic_in_call`, `toggle_camera_in_call` ou `toggle_screen_share`.
 *
 * À monter À L'INTÉRIEUR d'un `<LiveKitRoom>` — utilise `useLocalParticipant`.
 *
 * Synchronisation `callStore` :
 *   - set_mic / set_camera mettent à jour le store (cohérence avec
 *     `MicController` du Centre d'Appels) ET appliquent à LiveKit.
 *   - set_screen_share n'a pas d'entrée dans le store ; application directe.
 */

import { useLocalParticipant } from "@livekit/components-react";
import { useEffect } from "react";
import { callStore } from "../../stores/call-store";

type LiveKitControlAction = "set_mic" | "set_camera" | "set_screen_share";

interface LiveKitControlDetail {
	action: LiveKitControlAction;
	enabled?: boolean;
}

export function IAstedLiveKitBridge() {
	const { localParticipant } = useLocalParticipant();

	useEffect(() => {
		if (!localParticipant) return;

		const handler = async (e: Event) => {
			const detail = (e as CustomEvent<LiveKitControlDetail>).detail;
			if (!detail || !detail.action) return;

			const explicit = typeof detail.enabled === "boolean" ? detail.enabled : null;

			try {
				switch (detail.action) {
					case "set_mic": {
						const current = localParticipant.isMicrophoneEnabled;
						const next = explicit ?? !current;
						// Sync store (Centre d'Appels — MicController applique).
						callStore.setMicMuted(!next);
						// Application directe (DirectCallView, MeetingStageView,
						// et autres rooms hors call-store).
						await localParticipant.setMicrophoneEnabled(next);
						break;
					}
					case "set_camera": {
						const current = localParticipant.isCameraEnabled;
						const next = explicit ?? !current;
						callStore.setCameraEnabled(next);
						await localParticipant.setCameraEnabled(next);
						break;
					}
					case "set_screen_share": {
						const current = localParticipant.isScreenShareEnabled;
						const next = explicit ?? !current;
						await localParticipant.setScreenShareEnabled(next);
						break;
					}
				}
			} catch (err) {
				console.warn("[IAstedLiveKitBridge] action failed:", detail.action, err);
			}
		};

		window.addEventListener("iasted:livekit-control", handler);
		return () => window.removeEventListener("iasted:livekit-control", handler);
	}, [localParticipant]);

	return null;
}
