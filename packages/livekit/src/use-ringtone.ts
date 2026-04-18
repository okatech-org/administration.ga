import { useEffect, useRef } from "react";

/**
 * Profils de sonnerie.
 * - "standard" : tonalité téléphonique classique 440/480 Hz, cadence 2s
 * - "urgent"   : tonalité plus aiguë 660/720 Hz, cadence 1.2s pour signaler
 *                visuellement et auditivement l'urgence d'un appel prioritaire
 */
export type RingtoneVariant = "standard" | "urgent";

const PROFILES: Record<
	RingtoneVariant,
	{ freqs: [number, number]; cadenceMs: number; gain: number }
> = {
	standard: { freqs: [440, 480], cadenceMs: 2000, gain: 0.15 },
	urgent: { freqs: [660, 720], cadenceMs: 1200, gain: 0.2 },
};

/**
 * useRingtone — joue une sonnerie en boucle tant que `isRinging === true`.
 * Utilise Web Audio API pour générer le dual-tone téléphonique classique, pas
 * d'asset à servir.
 *
 * @param isRinging - indique si la sonnerie doit jouer
 * @param variant   - "standard" (défaut) ou "urgent" (plus aigu + cadence plus rapide)
 */
export function useRingtone(
	isRinging: boolean,
	variant: RingtoneVariant = "standard",
) {
	const audioContextRef = useRef<AudioContext | null>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		if (!isRinging) {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
			if (audioContextRef.current) {
				audioContextRef.current.close();
				audioContextRef.current = null;
			}
			return;
		}

		const profile = PROFILES[variant];
		const audioContext = new AudioContext();
		audioContextRef.current = audioContext;

		const playRingTone = () => {
			if (audioContext.state === "closed") return;

			const now = audioContext.currentTime;
			const gainNode = audioContext.createGain();
			gainNode.connect(audioContext.destination);

			for (let beep = 0; beep < 2; beep++) {
				const startTime = now + beep * 0.25;
				const endTime = startTime + 0.15;

				for (const freq of profile.freqs) {
					const osc = audioContext.createOscillator();
					osc.type = "sine";
					osc.frequency.setValueAtTime(freq, startTime);
					osc.connect(gainNode);
					osc.start(startTime);
					osc.stop(endTime);
				}

				// Envelope fade in/out pour chaque bip
				gainNode.gain.setValueAtTime(0, startTime);
				gainNode.gain.linearRampToValueAtTime(profile.gain, startTime + 0.02);
				gainNode.gain.setValueAtTime(profile.gain, endTime - 0.02);
				gainNode.gain.linearRampToValueAtTime(0, endTime);
			}
		};

		playRingTone();
		intervalRef.current = setInterval(playRingTone, profile.cadenceMs);

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
			if (
				audioContextRef.current &&
				audioContextRef.current.state !== "closed"
			) {
				audioContextRef.current.close();
				audioContextRef.current = null;
			}
		};
	}, [isRinging, variant]);
}
