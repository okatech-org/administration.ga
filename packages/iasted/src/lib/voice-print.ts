/**
 * voice-print — Extraction de l'empreinte vocale côté browser (Sprint 5.5).
 *
 * Approche pragmatique : pas de lib externe (Resemblyzer = Python ; pas
 * d'équivalent JS mainstream pour les voiceprints). On extrait un vecteur
 * de features spectrales simplifié (énergie par bande de fréquence + zéro
 * crossing rate), suffisant pour un facteur d'authentification additionnel
 * SOFT (ce n'est PAS un remplacement de l'auth primaire).
 *
 * Privacy : aucun audio brut n'est uploadé — seul le vecteur de features
 * (~16-32 floats) est envoyé au serveur, sérialisé en base64.
 *
 * Algorithme :
 *   1. Capture 3 s d'audio via MediaStream existant ou nouveau getUserMedia
 *   2. AudioContext + AnalyserNode (FFT 1024)
 *   3. Échantillonnage à 30 fps pendant 3 s → 90 frames
 *   4. Pour chaque frame : énergie sur 16 bandes log-espacées + ZCR
 *   5. Agrégation : moyenne + variance par bande → 32 features
 *   6. Normalisation L2 puis encodage base64
 *
 * Limites :
 *   - Sensible au micro/bruit ambiant (recommandé : enrollment + verify dans
 *     le même environnement, ou seuil bas + multi-tentatives)
 *   - Pas robuste aux variations vocales fortes (rhume, fatigue)
 *   - Acceptable pour un facteur d'auth soft, NE PAS utiliser comme seule
 *     barrière sur des actions critiques
 */

const SAMPLE_DURATION_MS = 3000;
const SAMPLE_FRAME_INTERVAL_MS = 33; // ~30 fps
const N_BANDS = 16;

/**
 * Capture audio + extrait le vecteur de features.
 *
 * @param sourceStream optionnel — réutilise un stream existant (typiquement
 *   celui de la session vocale iAsted en cours). Si null, lance un nouveau
 *   getUserMedia (popup permission si pas déjà accordée).
 * @returns base64 du Float32Array (32 features). null si erreur.
 */
export async function extractVoicePrint(
	sourceStream?: MediaStream | null,
): Promise<string | null> {
	if (typeof window === "undefined" || typeof AudioContext === "undefined") {
		return null;
	}
	let stream: MediaStream | null = sourceStream ?? null;
	let ownsStream = false;
	if (!stream) {
		try {
			stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					sampleRate: 16000,
					channelCount: 1,
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
				},
			});
			ownsStream = true;
		} catch {
			return null;
		}
	}
	if (!stream) return null;

	const ctx = new AudioContext({ sampleRate: 16000 });
	try {
		const source = ctx.createMediaStreamSource(stream);
		const analyser = ctx.createAnalyser();
		analyser.fftSize = 1024;
		analyser.smoothingTimeConstant = 0.1;
		source.connect(analyser);
		const freqBuffer = new Uint8Array(analyser.frequencyBinCount);
		const timeBuffer = new Uint8Array(analyser.fftSize);

		// Pré-alloue les accumulateurs (bandes × frames).
		const bandPowers: number[][] = Array.from({ length: N_BANDS }, () => []);
		const zcrs: number[] = [];

		// Bandes log-espacées de 80 Hz à 7000 Hz (couvre la voix).
		const minHz = 80;
		const maxHz = 7000;
		const nyquist = ctx.sampleRate / 2;
		const bandEdges: number[] = [];
		for (let i = 0; i <= N_BANDS; i++) {
			const ratio = i / N_BANDS;
			const hz = minHz * Math.pow(maxHz / minHz, ratio);
			bandEdges.push(Math.round((hz / nyquist) * analyser.frequencyBinCount));
		}

		const startTs = performance.now();
		await new Promise<void>((resolve) => {
			const tick = () => {
				const elapsed = performance.now() - startTs;
				if (elapsed >= SAMPLE_DURATION_MS) {
					resolve();
					return;
				}
				analyser.getByteFrequencyData(freqBuffer);
				analyser.getByteTimeDomainData(timeBuffer);
				// Énergie par bande.
				for (let b = 0; b < N_BANDS; b++) {
					const start = bandEdges[b] ?? 0;
					const end = bandEdges[b + 1] ?? freqBuffer.length;
					let sum = 0;
					let count = 0;
					for (let k = start; k < end; k++) {
						sum += (freqBuffer[k] ?? 0) / 255;
						count++;
					}
					(bandPowers[b] ?? []).push(count > 0 ? sum / count : 0);
				}
				// Zero crossing rate.
				let crossings = 0;
				for (let i = 1; i < timeBuffer.length; i++) {
					const a = (timeBuffer[i - 1] ?? 128) - 128;
					const c = (timeBuffer[i] ?? 128) - 128;
					if ((a >= 0 && c < 0) || (a < 0 && c >= 0)) crossings++;
				}
				zcrs.push(crossings / timeBuffer.length);
				setTimeout(tick, SAMPLE_FRAME_INTERVAL_MS);
			};
			tick();
		});

		// Agrégation : moyenne + variance par bande → 32 features (+ moyenne ZCR
		// optionnelle). Pour rester en 32 features cibles, on garde 16 moyennes
		// + 16 variances (ignore le ZCR scalar — son apport est marginal pour
		// le discriminateur cosine).
		const features = new Float32Array(N_BANDS * 2);
		for (let b = 0; b < N_BANDS; b++) {
			const samples = bandPowers[b] ?? [];
			if (samples.length === 0) continue;
			let mean = 0;
			for (const s of samples) mean += s;
			mean /= samples.length;
			let variance = 0;
			for (const s of samples) variance += (s - mean) * (s - mean);
			variance /= samples.length;
			features[b] = mean;
			features[N_BANDS + b] = Math.sqrt(variance);
		}
		// Normalisation L2 (rend la comparaison cosine indépendante du volume).
		let norm = 0;
		for (let i = 0; i < features.length; i++) {
			const f = features[i] ?? 0;
			norm += f * f;
		}
		norm = Math.sqrt(norm);
		if (norm > 0) {
			for (let i = 0; i < features.length; i++) {
				features[i] = (features[i] ?? 0) / norm;
			}
		}

		// Sérialisation base64 (Float32Array → Uint8Array view → base64).
		const bytes = new Uint8Array(features.buffer);
		let binary = "";
		const CHUNK = 0x8000;
		for (let i = 0; i < bytes.length; i += CHUNK) {
			binary += String.fromCharCode(
				...bytes.subarray(i, Math.min(i + CHUNK, bytes.length)),
			);
		}
		return btoa(binary);
	} catch (err) {
		console.warn("[voice-print] extraction failed:", err);
		return null;
	} finally {
		void ctx.close();
		if (ownsStream && stream) {
			stream.getTracks().forEach((t) => t.stop());
		}
	}
}
