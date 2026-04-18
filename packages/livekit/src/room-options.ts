/**
 * LiveKit — options partagées pour toutes les rooms d'appel.
 *
 * Raisonnement :
 *  - adaptiveStream : le serveur ajuste automatiquement la qualité vidéo
 *    envoyée à chaque subscriber selon la taille de rendu côté client
 *    (pas de gâchis de bande passante pour un flux affiché en PiP 120×180).
 *  - dynacast : met en pause les couches simulcast qu'aucun subscriber ne
 *    consomme (réduction CPU + bande passante côté publisher).
 *  - videoCaptureDefaults : capture locale en 720p 30 fps. Cible équilibrée
 *    entre qualité perçue et compatibilité webcam / bande passante mobile.
 *  - publishDefaults.videoSimulcastLayers : 3 couches (180p / 360p / 720p)
 *    permettant au SFU LiveKit de servir chaque subscriber au niveau le plus
 *    proche de son viewport, crucial pour les appels multi-participants ou
 *    les bascules PiP ↔ plein écran.
 *  - publishDefaults.videoCodec "vp9" : meilleur bitrate/qualité que VP8,
 *    large support navigateur. Fallback automatique vers VP8/H264 si non
 *    supporté par le client.
 *  - audioCaptureDefaults : toutes les améliorations standards activées
 *    (echoCancellation, noiseSuppression, autoGainControl) — plus une
 *    contrainte `channelCount: 1` (mono, suffisant pour la voix et allège
 *    l'upload) et `sampleRate: 48000` (aligné avec Opus).
 *  - stopLocalTrackOnUnpublish : libère proprement caméra/micro quand on
 *    coupe la publication, évite l'icône "caméra en cours d'utilisation"
 *    résiduel côté navigateur.
 *  - reconnectPolicy : reconnexion agressive avec jitter pour encaisser
 *    les petits glitches réseau (4G → WiFi, VPN switch).
 */

import type { RoomOptions } from "livekit-client";
import { VideoPresets } from "livekit-client";

export const LIVEKIT_CALL_ROOM_OPTIONS: RoomOptions = {
	adaptiveStream: true,
	dynacast: true,
	stopLocalTrackOnUnpublish: true,
	videoCaptureDefaults: {
		resolution: VideoPresets.h720.resolution,
	},
	audioCaptureDefaults: {
		autoGainControl: true,
		echoCancellation: true,
		noiseSuppression: true,
		channelCount: 1,
		sampleRate: 48_000,
	},
	publishDefaults: {
		videoCodec: "vp9",
		videoSimulcastLayers: [
			VideoPresets.h180,
			VideoPresets.h360,
			VideoPresets.h720,
		],
		backupCodec: { codec: "vp8" },
		dtx: true,
		red: true,
		simulcast: true,
		stopMicTrackOnMute: false,
	},
	reconnectPolicy: {
		nextRetryDelayInMs: (context) => {
			if (context.retryCount > 10) return null;
			const base = Math.min(1000 * 2 ** context.retryCount, 15_000);
			return base + Math.random() * 500;
		},
	},
};
