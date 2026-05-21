import { useEffect, useRef } from "react";

/**
 * useRingtone — plays a looping ringtone while `isRinging` is true.
 * Uses the Web Audio API to generate a pleasant dual-tone ringtone
 * (no external audio file needed).
 */
export function useRingtone(isRinging: boolean) {
	const audioContextRef = useRef<AudioContext | null>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		if (!isRinging) {
			// Clean up when not ringing
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

		// Create audio context
		const audioContext = new AudioContext();
		audioContextRef.current = audioContext;

		const playRingTone = () => {
			if (audioContext.state === "closed") return;

			const now = audioContext.currentTime;
			const gainNode = audioContext.createGain();
			gainNode.connect(audioContext.destination);

			// Ring pattern: two short beeps
			const frequencies = [440, 480]; // Standard phone ring frequencies

			for (let beep = 0; beep < 2; beep++) {
				const startTime = now + beep * 0.25;
				const endTime = startTime + 0.15;

				for (const freq of frequencies) {
					const osc = audioContext.createOscillator();
					osc.type = "sine";
					osc.frequency.setValueAtTime(freq, startTime);
					osc.connect(gainNode);
					osc.start(startTime);
					osc.stop(endTime);
				}

				// Envelope: fade in/out for each beep
				gainNode.gain.setValueAtTime(0, startTime);
				gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
				gainNode.gain.setValueAtTime(0.15, endTime - 0.02);
				gainNode.gain.linearRampToValueAtTime(0, endTime);
			}
		};

		// Play immediately, then repeat every 2 seconds
		playRingTone();
		intervalRef.current = setInterval(playRingTone, 2000);

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
	}, [isRinging]);
}
