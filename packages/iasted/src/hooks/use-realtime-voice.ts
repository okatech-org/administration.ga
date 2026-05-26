/**
 * useRealtimeVoice — Hook WebRTC pour conversation vocale OpenAI Realtime API.
 *
 * Port adapté de `presidence.ga/src/hooks/useRealtimeVoiceWebRTC.tsx`.
 * Découplé du backend : le hook reçoit `ephemeralKey` déjà émis par une
 * Convex action (cf. `convex/ai/realtimeToken.ts`).
 *
 * Responsabilités :
 * - Capture audio locale (PCM 24kHz mono via `getUserMedia`)
 * - Analyse de volume live (AnalyserNode) → expose `audioLevel`
 * - Connexion `RTCPeerConnection` + `RTCDataChannel` vers OpenAI Realtime
 * - Parsing des événements (transcripts, voice states, function calls)
 * - Dispatch des tool calls via callback `onToolCall`
 * - Cleanup robuste à la déconnexion / démontage
 * - Reconnexion exponentielle sur échec ICE
 *
 * Le hook ne gère AUCUNE logique métier — il est complètement agnostique
 * du contexte applicatif (citizen / agent / backoffice).
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
	RealtimeMessage,
	RealtimeSessionInit,
	RealtimeToolHandler,
	RealtimeToolResult,
	RealtimeVoiceTool,
	VoiceState,
} from "./use-realtime-voice-types";

// ─────────────────────────────────────────────────────────────
// Télémétrie latence — non bloquante, no-op si PostHog absent
// ─────────────────────────────────────────────────────────────

// Surface consommatrice du hook. Permet de tagger les events de latence
// par surface pour distinguer les distributions p50/p95 par profil de
// prompt (citizen / agent / backoffice ont des prompts de tailles très
// différentes, donc des TTFT distincts).
type IAstedSurface = "agent" | "backoffice" | "citizen";

// Shape minimal de window.posthog — évite d'introduire une dépendance dure
// sur posthog-js dans le package partagé. Si PostHog n'est pas initialisé
// dans l'app consommatrice, les capture sont silencieusement ignorés.
interface PostHogCaptureLike {
	capture: (event: string, properties?: Record<string, unknown>) => void;
}

function getPostHog(): PostHogCaptureLike | null {
	if (typeof window === "undefined") return null;
	const ph = (window as unknown as { posthog?: PostHogCaptureLike }).posthog;
	return ph && typeof ph.capture === "function" ? ph : null;
}

function captureMetric(event: string, properties: Record<string, unknown>): void {
	try {
		getPostHog()?.capture(event, properties);
	} catch {
		// Télémétrie ne doit JAMAIS casser la session vocale.
	}
}

// Calcule la durée entre deux marks. Renvoie null si une mark est absente
// (cas d'erreur ou de session interrompue).
function durationBetween(from: string, to: string): number | null {
	try {
		const entries = performance.getEntriesByName(from, "mark");
		const toEntries = performance.getEntriesByName(to, "mark");
		const fromTs = entries[entries.length - 1]?.startTime;
		const toTs = toEntries[toEntries.length - 1]?.startTime;
		if (fromTs === undefined || toTs === undefined) return null;
		return Math.max(0, Math.round(toTs - fromTs));
	} catch {
		return null;
	}
}

// Préfixe unique par instance pour éviter les collisions entre sessions
// simultanées (rare mais possible en dev avec StrictMode + multi-tab).
function makeMarkPrefix(): string {
	return `iasted.${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Date.now()}`;
}

// ─────────────────────────────────────────────────────────────
// AudioRecorder — encapsule getUserMedia + ScriptProcessor PCM
// ─────────────────────────────────────────────────────────────

// Contraintes audio canoniques OpenAI Realtime : PCM mono 24 kHz avec
// pré-traitement navigateur (AEC + noise suppression + AGC). Extrait pour
// pouvoir être réutilisé par `prewarmMedia()` ET `AudioRecorder.start()`.
const MIC_CONSTRAINTS: MediaStreamConstraints = {
	audio: {
		sampleRate: 24000,
		channelCount: 1,
		echoCancellation: true,
		noiseSuppression: true,
		autoGainControl: true,
	},
};

class AudioRecorder {
	private stream: MediaStream | null = null;

	async start(prewarmedStream?: MediaStream | null) {
		// Optimisation latence (Phase 1) : le ScriptProcessorNode + AudioContext
		// précédemment instanciés ici étaient *dead code* — aucun `onaudioprocess`
		// n'était défini, mais le node était connecté à `destination`, ce qui :
		//   1) consommait du CPU permanent (4096 samples × 24 kHz),
		//   2) ajoutait ~85 ms de buffer dans la chaîne audio,
		//   3) faisait remonter de la latence sur le main thread (ScriptProcessor
		//      est exécuté dans le thread JS — deprecated au profit d'AudioWorklet).
		// Le micro est routé vers OpenAI via `pc.addTrack(stream.getTracks()[0])`
		// dans `connect()`, ce qui suffit. L'analyse de volume (audioLevel pour
		// l'animation de la sphère) est faite séparément via `startAudioAnalysis`
		// qui crée son propre AnalyserNode léger.
		// Optimisation latence (Phase 4) : si un stream a été pré-warmé via
		// `prewarmMedia()` au hover de la sphère, on le réutilise au lieu de
		// re-appeler `getUserMedia()` (gain 100–2000 ms sur la 1ʳᵉ demande).
		if (prewarmedStream && prewarmedStream.getTracks().some((t) => t.readyState === "live")) {
			this.stream = prewarmedStream;
			return;
		}
		this.stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
	}

	getStream(): MediaStream | null {
		return this.stream;
	}

	stop() {
		this.stream?.getTracks().forEach((track) => track.stop());
		this.stream = null;
	}
}

/**
 * Pré-warm la capture micro côté browser SANS déclencher de prompt de
 * permission. À appeler au survol/focus de la sphère iAsted pour amortir le
 * coût de `getUserMedia()` (100–2000 ms sur la 1ʳᵉ demande, ~10 ms ensuite).
 *
 * Comportement :
 *   - Si l'utilisateur n'a JAMAIS accordé la permission micro à cette origine,
 *     renvoie `null` (ne déclenche PAS de prompt — ce serait intrusif).
 *   - Si la permission est `granted`, alloue un `MediaStream` léger via
 *     `getUserMedia(MIC_CONSTRAINTS)` et le retourne. Le caller doit le
 *     passer à `connect()` (via `useRealtimeVoice` qui le gère en interne).
 *   - Si la permission est `prompt` (état initial sur certains navigateurs)
 *     ou `denied`, renvoie `null`.
 *
 * Le stream pré-warmé doit être libéré (`stream.getTracks().forEach(t => t.stop())`)
 * s'il n'est pas consommé dans les ~30 s, sinon le badge "micro actif" du
 * navigateur reste affiché et alarme l'utilisateur.
 */
export async function prewarmMedia(): Promise<MediaStream | null> {
	try {
		if (typeof navigator === "undefined" || !navigator.mediaDevices) return null;
		// Si l'API Permissions est dispo (Chrome, Edge, Firefox récent), on
		// teste l'état avant tout — évite tout prompt non sollicité.
		if (navigator.permissions && navigator.permissions.query) {
			try {
				const status = await navigator.permissions.query({
					name: "microphone" as PermissionName,
				});
				if (status.state !== "granted") return null;
			} catch {
				// Permissions API n'accepte pas "microphone" dans certains
				// navigateurs (Safari) — on retombe sur le no-op silencieux
				// plutôt que de risquer un prompt intrusif.
				return null;
			}
		} else {
			// Pas d'API Permissions : ne pas tenter le pré-warm (Safari).
			return null;
		}
		return await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
	} catch {
		return null;
	}
}

// ─────────────────────────────────────────────────────────────
// API publique
// ─────────────────────────────────────────────────────────────

export interface UseRealtimeVoiceOptions {
	/** Handler invoqué quand le modèle appelle un tool. Doit retourner le résultat à renvoyer. */
	onToolCall?: RealtimeToolHandler;
	/** Vitesse de lecture audio par défaut (0.5 à 2.0). Défaut : 1.0. */
	defaultSpeechRate?: number;
	/** Active la salutation initiale automatique de l'agent. Défaut : true. */
	autoGreet?: boolean;
	/** Callback appelé quand la connexion est établie. */
	onConnected?: () => void;
	/** Callback appelé en cas d'erreur de connexion. */
	onError?: (error: Error) => void;
	/**
	 * Surface consommatrice (citizen / agent / backoffice). Utilisée pour tagger
	 * les events de télémétrie de latence — chaque surface a son propre profil
	 * de prompt et donc son baseline TTFT distinct. Omis = events sans tag.
	 */
	surface?: IAstedSurface;
	/**
	 * Mode accessibilité — session persistante + cues audio non-vocaux.
	 * Quand `true`, des bips signalent les transitions d'état au-delà de la
	 * voix synthétisée (utile pour les utilisateurs malvoyants ou avec
	 * troubles cognitifs auditifs).
	 */
	accessibilityMode?: boolean;
	/**
	 * Callback invoqué à la fermeture de la session (cleanup) avec les
	 * métriques d'usage. Le consumer (host hook) le branche sur l'action
	 * Convex `ai.realtimeSessions.recordSessionEnd` pour le tracking coût.
	 */
	onSessionEnd?: (metrics: {
		externalSessionId: string;
		durationSeconds: number;
		toolCallCount: number;
		endReason?: string;
	}) => void | Promise<void>;
	/**
	 * Sprint 5 — G3 : callback invoqué lors d'un changement d'état réseau
	 * pendant une session active. `online=false` au moment où le navigateur
	 * détecte une coupure, `online=true` à la reconnexion. Le consumer
	 * affiche typiquement un toast info/warning. Pas appelé en dehors d'une
	 * session active (pas de bruit hors usage iAsted).
	 */
	onNetworkStatusChange?: (online: boolean) => void;
}

export interface UseRealtimeVoiceResult {
	voiceState: VoiceState;
	audioLevel: number;
	messages: RealtimeMessage[];
	isConnected: boolean;
	isConnecting: boolean;
	speechRate: number;
	setSpeechRate: (rate: number) => void;
	connect: (init: RealtimeSessionInit) => Promise<void>;
	disconnect: () => Promise<void>;
	clearMessages: () => void;
	/** Envoie un message texte à l'agent (commande locale, sans audio). */
	sendText: (text: string) => void;
	/**
	 * Pré-warm la capture micro (Phase 4 — UX). À appeler au survol/focus de
	 * la sphère iAsted pour amortir le coût de `getUserMedia()` (100–2000 ms).
	 * No-op silencieux si la permission micro n'est pas déjà `granted`.
	 * Le stream pré-warmé est réutilisé par le prochain `connect()`.
	 */
	prewarmMedia: () => Promise<void>;
	/**
	 * Annule un pré-warm en cours (Phase 4). À appeler au `mouseleave` de la
	 * sphère iAsted si l'utilisateur n'a pas cliqué. Libère le stream pour
	 * faire disparaître l'indicateur "micro actif" du navigateur.
	 */
	cancelPrewarm: () => void;
	/**
	 * Sprint 5.5 wiring — Capture un voiceprint instantané depuis le stream
	 * audio courant de la session vocale active (3 s d'extraction). Utilisé
	 * par les hosts pour auto-injecter `voicePrintB64` dans les args des
	 * tools destructifs (suspend_user, assign_role_to_user). Retourne `null`
	 * si aucune session active ou si l'extraction échoue.
	 */
	captureVoicePrint: () => Promise<string | null>;
	/**
	 * Met à jour la session OpenAI en cours via `session.update` :
	 * - `pageContext` : bloc texte concaténé au `systemPrompt` de base
	 *   (utilisé pour transmettre le contexte de la page courante au
	 *   modèle pendant que la session est active). `null` efface le bloc.
	 * - `tools` : remplace la liste de tools de base (rarement nécessaire ;
	 *   par défaut, la session conserve les tools fournis à `connect`).
	 *
	 * No-op si la connexion n'est pas encore ouverte — la valeur est
	 * mémorisée et appliquée à la prochaine ouverture du DataChannel.
	 */
	updateSession: (input: {
		pageContext?: string | null;
		tools?: RealtimeVoiceTool[];
	}) => void;
}

// ─────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────

// OpenAI Realtime GA (depuis le 12 mai 2026, Beta retirée) :
//   - endpoint client SDP exchange : `POST /v1/realtime/calls?model=...`
//     (l'ancien `/v1/realtime` Beta est retiré ; en GA, l'endpoint WebRTC
//     navigateur partage le chemin `/calls`).
//   - modèle : `gpt-realtime-mini` (Q4 2025) si dispo, sinon fallback côté
//     backend sur `gpt-realtime`. Le modèle effectif est passé par le serveur
//     dans `RealtimeSessionResponse.model` — ce DEFAULT_MODEL n'est qu'un
//     fallback si `init.model` est absent (cas pathologique).
const OPENAI_REALTIME_BASE_URL = "https://api.openai.com/v1/realtime/calls";
const DEFAULT_MODEL = "gpt-realtime-mini";
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_BACKOFF_MS = [1000, 2500, 5000];

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export function useRealtimeVoice({
	onToolCall,
	defaultSpeechRate = 1.0,
	autoGreet = true,
	onConnected,
	onError,
	accessibilityMode = false,
	onSessionEnd,
	surface,
	onNetworkStatusChange,
}: UseRealtimeVoiceOptions = {}): UseRealtimeVoiceResult {
	const [voiceState, setVoiceState] = useState<VoiceState>("idle");
	const [messages, setMessages] = useState<RealtimeMessage[]>([]);
	const [isConnected, setIsConnected] = useState(false);
	const [audioLevel, setAudioLevel] = useState(0);
	const [speechRate, setSpeechRateState] = useState(defaultSpeechRate);

	const pcRef = useRef<RTCPeerConnection | null>(null);
	const dcRef = useRef<RTCDataChannel | null>(null);
	const audioElRef = useRef<HTMLAudioElement | null>(null);
	const cueCtxRef = useRef<AudioContext | null>(null);
	const accessibilityRef = useRef<boolean>(accessibilityMode);
	useEffect(() => {
		accessibilityRef.current = accessibilityMode;
	}, [accessibilityMode]);

	// ── Audio cues non-vocaux (accessibilité) ──
	// Génère un bip simple via WebAudio — pas de fichier asset.
	const playCue = useCallback(
		(kind: "listen" | "thinking" | "executed" | "error") => {
			if (!accessibilityRef.current) return;
			try {
				if (!cueCtxRef.current) {
					cueCtxRef.current = new (window.AudioContext ||
						(window as any).webkitAudioContext)();
				}
				const ctx = cueCtxRef.current;
				const now = ctx.currentTime;
				const beep = (freq: number, durMs: number, delayMs: number = 0) => {
					const osc = ctx.createOscillator();
					const gain = ctx.createGain();
					osc.type = "sine";
					osc.frequency.value = freq;
					osc.connect(gain);
					gain.connect(ctx.destination);
					const start = now + delayMs / 1000;
					const end = start + durMs / 1000;
					gain.gain.setValueAtTime(0, start);
					gain.gain.linearRampToValueAtTime(0.15, start + 0.01);
					gain.gain.linearRampToValueAtTime(0, end);
					osc.start(start);
					osc.stop(end + 0.02);
				};
				switch (kind) {
					case "listen":
						beep(880, 80);
						break;
					case "thinking":
						beep(660, 60);
						break;
					case "executed":
						beep(440, 100);
						break;
					case "error":
						beep(220, 150);
						beep(220, 150, 200);
						break;
				}
				window.dispatchEvent(
					new CustomEvent("iasted:audio-cue", { detail: { kind } }),
				);
			} catch (err) {
				console.warn("[iAsted] audio cue failed:", err);
			}
		},
		[],
	);
	const recorderRef = useRef<AudioRecorder | null>(null);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const analyserContextRef = useRef<AudioContext | null>(null);
	const animationFrameRef = useRef<number | null>(null);
	const currentTranscriptRef = useRef<string>("");
	const sessionInitRef = useRef<RealtimeSessionInit | null>(null);
	// Bloc texte du contexte page concaténé au systemPrompt de base (peut être
	// modifié à chaud via `updateSession({ pageContext })`). Conservé en ref
	// pour être réappliqué automatiquement à chaque réouverture du DataChannel
	// (notamment lors d'une reconnexion ICE).
	const pageContextRef = useRef<string | null>(null);
	const sessionToolsRef = useRef<RealtimeVoiceTool[] | null>(null);
	const speechRateRef = useRef<number>(defaultSpeechRate);
	const isConnectingRef = useRef(false);
	const reconnectAttemptsRef = useRef(0);
	const onToolCallRef = useRef<RealtimeToolHandler | undefined>(onToolCall);
	const onErrorRef = useRef<typeof onError>(onError);
	const onConnectedRef = useRef<typeof onConnected>(onConnected);
	const onSessionEndRef = useRef<typeof onSessionEnd>(onSessionEnd);

	// Compteurs de session pour reporting (coût + audit)
	const sessionStartTsRef = useRef<number | null>(null);
	const toolCallCountRef = useRef<number>(0);
	const externalSessionIdRef = useRef<string | null>(null);

	// Pré-warm micro (Phase 4) — stream alloué au hover de la sphère et
	// réutilisé par `connect()`. Auto-libéré au bout de 30 s si jamais
	// consommé (évite que l'icône "micro actif" du navigateur reste affichée).
	const prewarmedStreamRef = useRef<MediaStream | null>(null);
	const prewarmReleaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// S1.D4 (Ronde 3) — Vitesse parole adaptative au débit utilisateur.
	// Mesure le débit en mots/seconde sur les derniers tours et ajuste
	// `speechRate` de l'agent pour s'aligner naturellement. Désactivé
	// dès que l'utilisateur force manuellement la vitesse via `setSpeechRate`.
	const speechStartedAtRef = useRef<number | null>(null);
	const userPaceWindowRef = useRef<number[]>([]); // mots/sec sur les 5 derniers tours
	const userOverrodeSpeechRateRef = useRef<boolean>(false);

	// Télémétrie latence — un préfixe unique par instance évite les collisions
	// de marks entre sessions simultanées (StrictMode, multi-tab dev).
	const markPrefixRef = useRef<string>(makeMarkPrefix());
	// Marque la fin de parole utilisateur la plus récente — sert à mesurer le
	// délai jusqu'au premier audio.delta retourné par OpenAI.
	const lastSpeechStoppedTsRef = useRef<number | null>(null);
	// Évite d'émettre le boot metric plusieurs fois pour une même session.
	const bootMetricSentRef = useRef<boolean>(false);
	// Numéro de tour incrémenté à chaque speech_stopped pour distinguer les
	// audio.delta du tour courant des résidus du tour précédent.
	const turnCounterRef = useRef<number>(0);
	const turnAudioStartedRef = useRef<number>(0);

	// Maintenir les refs à jour sans déclencher les callbacks dépendants
	useEffect(() => {
		onToolCallRef.current = onToolCall;
	}, [onToolCall]);
	useEffect(() => {
		onErrorRef.current = onError;
	}, [onError]);
	useEffect(() => {
		onConnectedRef.current = onConnected;
	}, [onConnected]);
	useEffect(() => {
		onSessionEndRef.current = onSessionEnd;
	}, [onSessionEnd]);

	// ── Speech rate : appliqué dynamiquement à l'élément audio ──
	const applyPlaybackRate = useCallback((rate: number) => {
		if (audioElRef.current) {
			audioElRef.current.playbackRate = rate;
		}
	}, []);

	const setSpeechRate = useCallback(
		(rate: number) => {
			const clamped = Math.max(0.5, Math.min(2.0, rate));
			speechRateRef.current = clamped;
			setSpeechRateState(clamped);
			applyPlaybackRate(clamped);
			// S1.D4 (Ronde 3) : marque l'override manuel pour désactiver
			// l'adaptation automatique (l'utilisateur a fait un choix).
			userOverrodeSpeechRateRef.current = true;
		},
		[applyPlaybackRate],
	);

	// S1.D4 — Adaptation automatique du débit vocal de l'agent au rythme
	// de l'utilisateur. Fenêtre glissante de 5 mesures (mots/sec), EMA.
	// Mapping :
	//   - débit > 2.8 mots/s (rapide) → agent parle à 1.10×
	//   - débit > 2.0 mots/s (normal+) → 1.05×
	//   - débit > 1.2 mots/s (normal-) → 1.00×
	//   - débit ≤ 1.2 mots/s (lent) → 0.95×
	// N'agit qu'après 2 mesures pour éviter les fluctuations au premier tour.
	const recordUserPace = useCallback(
		(wordCount: number, durationMs: number) => {
			if (userOverrodeSpeechRateRef.current) return;
			if (durationMs < 300 || wordCount < 1) return; // ignore trop court
			const wps = (wordCount * 1000) / durationMs;
			const window = userPaceWindowRef.current;
			window.push(wps);
			if (window.length > 5) window.shift();
			if (window.length < 2) return;
			const avg = window.reduce((a, b) => a + b, 0) / window.length;
			let targetRate: number;
			if (avg > 2.8) targetRate = 1.10;
			else if (avg > 2.0) targetRate = 1.05;
			else if (avg > 1.2) targetRate = 1.0;
			else targetRate = 0.95;
			// Seuil de stabilité : on n'applique que si l'écart est notable.
			if (Math.abs(targetRate - speechRateRef.current) > 0.04) {
				speechRateRef.current = targetRate;
				setSpeechRateState(targetRate);
				applyPlaybackRate(targetRate);
			}
		},
		[applyPlaybackRate],
	);

	// ── Audio level analysis ────────────────────────────────────
	// Optimisation latence (Phase 6) : ne pas re-render React à chaque frame
	// (60 fps × setState = jank visible sur tout le sous-arbre consumer).
	// On garde l'échantillonnage à 60 fps pour la fluidité du calcul lissé
	// (filtre passe-bas exponentiel), mais on ne pousse vers React qu'à 20 fps
	// (50 ms) ET uniquement si l'écart > 0.01 (changement perceptible).
	// L'animation visuelle de la sphère reste fluide grâce au filtre interne.
	const startAudioAnalysis = useCallback((stream: MediaStream) => {
		if (analyserRef.current) return;
		const ctx = new AudioContext();
		analyserContextRef.current = ctx;
		const analyser = ctx.createAnalyser();
		analyser.fftSize = 256;
		const source = ctx.createMediaStreamSource(stream);
		source.connect(analyser);
		analyserRef.current = analyser;

		const buffer = new Uint8Array(analyser.frequencyBinCount);
		// Niveau lissé en interne — pas dans React (évite re-render).
		let smoothed = 0;
		// Dernière valeur poussée à React — pour le delta-check.
		let lastEmitted = 0;
		let lastEmitTs = 0;
		const tick = () => {
			if (!analyserRef.current) return;
			analyserRef.current.getByteFrequencyData(buffer);
			let sum = 0;
			for (let i = 0; i < buffer.length; i++) sum += buffer[i] ?? 0;
			const avg = sum / buffer.length;
			const normalized = Math.max(0, (avg - 10) / 100);
			smoothed = smoothed * 0.8 + normalized * 0.2;
			const now =
				typeof performance !== "undefined" ? performance.now() : Date.now();
			// 20 fps max + delta perceptible (0.01 = 1% du range).
			if (now - lastEmitTs >= 50 && Math.abs(smoothed - lastEmitted) > 0.01) {
				lastEmitted = smoothed;
				lastEmitTs = now;
				setAudioLevel(smoothed);
			}
			animationFrameRef.current = requestAnimationFrame(tick);
		};
		tick();
	}, []);

	const stopAudioAnalysis = useCallback(() => {
		if (animationFrameRef.current) {
			cancelAnimationFrame(animationFrameRef.current);
			animationFrameRef.current = null;
		}
		analyserRef.current = null;
		if (analyserContextRef.current) {
			void analyserContextRef.current.close();
			analyserContextRef.current = null;
		}
		setAudioLevel(0);
	}, []);

	// ── Cleanup complet ─────────────────────────────────────────
	const cleanup = useCallback(() => {
		// Émettre le tracking de fin de session AVANT de tout nettoyer
		// (le sessionId et la durée sont calculés ici).
		const externalSessionId = externalSessionIdRef.current;
		const startTs = sessionStartTsRef.current;
		if (externalSessionId && startTs && onSessionEndRef.current) {
			const durationSeconds = Math.max(0, Math.round((Date.now() - startTs) / 1000));
			const cb = onSessionEndRef.current;
			try {
				void Promise.resolve(
					cb({
						externalSessionId,
						durationSeconds,
						toolCallCount: toolCallCountRef.current,
						endReason: "normal",
					}),
				).catch((err) => {
					console.warn("[iAsted] onSessionEnd reporting failed:", err);
				});
			} catch (err) {
				console.warn("[iAsted] onSessionEnd threw:", err);
			}
		}
		externalSessionIdRef.current = null;
		sessionStartTsRef.current = null;
		toolCallCountRef.current = 0;

		recorderRef.current?.stop();
		recorderRef.current = null;
		dcRef.current?.close();
		dcRef.current = null;
		pcRef.current?.close();
		pcRef.current = null;
		if (audioElRef.current) {
			audioElRef.current.pause();
			audioElRef.current.srcObject = null;
			audioElRef.current.remove();
			audioElRef.current = null;
		}
		stopAudioAnalysis();
		currentTranscriptRef.current = "";
		pageContextRef.current = null;
		sessionToolsRef.current = null;
		setIsConnected(false);
		setVoiceState("idle");
	}, [stopAudioAnalysis]);

	// ── Compose + envoie `session.update` à OpenAI Realtime (shape GA) ────
	// Concatène le bloc de contexte page (si présent) au systemPrompt de base
	// et utilise les tools courants. No-op si le DataChannel n'est pas ouvert.
	// GA : `session.type: "realtime"` requis, `voice` imbriqué dans
	// `audio.output`, `output_modalities` top-level.
	const sendSessionUpdate = useCallback(() => {
		const dc = dcRef.current;
		const session = sessionInitRef.current;
		if (!dc || dc.readyState !== "open" || !session) return;
		const baseInstructions = session.systemPrompt;
		const pageContext = pageContextRef.current;
		const instructions = pageContext
			? `${baseInstructions}\n\n${pageContext}`
			: baseInstructions;
		const tools = sessionToolsRef.current ?? session.tools;
		dc.send(
			JSON.stringify({
				type: "session.update",
				session: {
					type: "realtime",
					instructions,
					tool_choice: "auto",
					tools,
					output_modalities: ["audio"],
					audio: {
						output: { voice: session.voice },
					},
				},
			}),
		);
	}, []);

	const updateSession = useCallback(
		(input: { pageContext?: string | null; tools?: RealtimeVoiceTool[] }) => {
			if (input.pageContext !== undefined) {
				pageContextRef.current = input.pageContext;
			}
			if (input.tools !== undefined) {
				sessionToolsRef.current = input.tools;
			}
			sendSessionUpdate();
		},
		[sendSessionUpdate],
	);

	// ── Parsing DataChannel messages ────────────────────────────
	const handleDataChannelMessage = useCallback(
		async (event: MessageEvent) => {
			let data: any;
			try {
				data = JSON.parse(event.data);
			} catch {
				return;
			}

			switch (data.type) {
				case "session.created":
					setVoiceState("listening");
					playCue("listen");
					break;

				case "input_audio_buffer.speech_started":
					setVoiceState("listening");
					// S1.D4 — marque le début de parole utilisateur pour calcul du débit.
					speechStartedAtRef.current =
						typeof performance !== "undefined" ? performance.now() : Date.now();
					break;

				case "input_audio_buffer.speech_stopped":
					setVoiceState("thinking");
					playCue("thinking");
					// Démarre la mesure du tour de conversation. On enregistre
					// le timestamp au lieu d'une mark pour pouvoir comparer même
					// si la mark n'existe pas (perf API absente).
					lastSpeechStoppedTsRef.current =
						typeof performance !== "undefined" ? performance.now() : Date.now();
					turnCounterRef.current += 1;
					turnAudioStartedRef.current = 0;
					break;

				case "conversation.item.input_audio_transcription.completed": {
					const transcript = data.transcript as string;
					if (transcript) {
						setMessages((prev) => [
							...prev,
							{
								id: crypto.randomUUID(),
								role: "user",
								content: transcript,
								timestamp: new Date().toISOString(),
							},
						]);
						// S1.D4 — calcul du débit utilisateur (mots/sec) sur ce tour.
						// On utilise la durée [speech_started → speech_stopped].
						const startedAt = speechStartedAtRef.current;
						const stoppedAt = lastSpeechStoppedTsRef.current;
						if (startedAt !== null && stoppedAt !== null && stoppedAt > startedAt) {
							const durationMs = stoppedAt - startedAt;
							const words = transcript.trim().split(/\s+/).filter(Boolean).length;
							recordUserPace(words, durationMs);
						}
						speechStartedAtRef.current = null;
					}
					break;
				}

				// GA : `response.audio_transcript.*` renommé en `response.output_audio_transcript.*`.
				// On garde l'ancien nom en case dual pendant la fenêtre de déploiement
				// pour tolérer un éventuel rollback ou un cache CDN.
				case "response.audio_transcript.delta":
				case "response.output_audio_transcript.delta":
					currentTranscriptRef.current += data.delta ?? "";
					break;

				case "response.audio_transcript.done":
				case "response.output_audio_transcript.done": {
					const transcript = (data.transcript ?? currentTranscriptRef.current) as string;
					if (transcript) {
						setMessages((prev) => [
							...prev,
							{
								id: crypto.randomUUID(),
								role: "assistant",
								content: transcript,
								timestamp: new Date().toISOString(),
							},
						]);
					}
					currentTranscriptRef.current = "";
					break;
				}

				// GA : `response.audio.delta` renommé en `response.output_audio.delta`.
				case "response.audio.delta":
				case "response.output_audio.delta": {
					setVoiceState((prev) => (prev === "speaking" ? prev : "speaking"));

					// ── Télémétrie : premier audio reçu ────────────────
					const markPrefix = markPrefixRef.current;

					// 1. Boot metric — un seul envoi par session, sur le tout
					// premier audio.delta. Mesure le clic-utilisateur → 1ʳᵉ syllabe.
					if (!bootMetricSentRef.current) {
						bootMetricSentRef.current = true;
						try {
							performance.mark(`${markPrefix}.first.audio.delta`);
						} catch {
							/* perf API absente */
						}
						captureMetric("iasted_boot_metrics", {
							surface,
							session_id: externalSessionIdRef.current,
							model: sessionInitRef.current?.model,
							voice: sessionInitRef.current?.voice,
							// Durées par étape (ms). null si la mark manque.
							ttf_audio_total_ms: durationBetween(
								`${markPrefix}.connect.start`,
								`${markPrefix}.first.audio.delta`,
							),
							mediastream_ms: durationBetween(
								`${markPrefix}.connect.start`,
								`${markPrefix}.mediastream.ready`,
							),
							sdp_offer_ms: durationBetween(
								`${markPrefix}.mediastream.ready`,
								`${markPrefix}.sdp.offer.created`,
							),
							sdp_exchange_ms: durationBetween(
								`${markPrefix}.sdp.offer.created`,
								`${markPrefix}.sdp.answer.received`,
							),
							dc_open_ms: durationBetween(
								`${markPrefix}.sdp.answer.received`,
								`${markPrefix}.dc.open`,
							),
							ttf_audio_after_dc_ms: durationBetween(
								`${markPrefix}.dc.open`,
								`${markPrefix}.first.audio.delta`,
							),
						});
					}

					// 2. Turn metric — délai entre fin de parole utilisateur et
					// 1ʳᵉ syllabe de la réponse. N'émet qu'une fois par tour
					// (les audio.delta suivants sont des chunks du même tour).
					const speechStoppedAt = lastSpeechStoppedTsRef.current;
					if (speechStoppedAt !== null && turnAudioStartedRef.current === 0) {
						const nowTs =
							typeof performance !== "undefined" ? performance.now() : Date.now();
						const turnLatencyMs = Math.max(0, Math.round(nowTs - speechStoppedAt));
						turnAudioStartedRef.current = nowTs;
						captureMetric("iasted_turn_latency", {
							surface,
							session_id: externalSessionIdRef.current,
							turn_number: turnCounterRef.current,
							latency_ms: turnLatencyMs,
						});
					}
					break;
				}

				// GA : `response.audio.done` renommé en `response.output_audio.done`.
				case "response.audio.done":
				case "response.output_audio.done":
					// Audio chunk terminé ; l'event response.done remettra l'état à "listening"
					break;

				case "response.done":
					setVoiceState("listening");
					break;

				case "response.function_call_arguments.done": {
					const name = data.name as string;
					toolCallCountRef.current += 1;
					let args: Record<string, unknown> = {};
					try {
						args = JSON.parse(data.arguments ?? "{}");
					} catch {
						args = {};
					}

					// Tool spécial : arrêt de la conversation
					if (name === "stop_conversation") {
						setVoiceState("idle");
						setTimeout(() => cleanup(), 1500);
						break;
					}

					let result: RealtimeToolResult = { success: true, message: "Action exécutée" };
					if (onToolCallRef.current) {
						try {
							const executed = await onToolCallRef.current(name, args);
							if (executed && typeof executed === "object") {
								result = executed;
							}
						} catch (err) {
							const message = err instanceof Error ? err.message : "Erreur d'exécution";
							result = { success: false, message };
						}
					}
					playCue(result.success ? "executed" : "error");

					// Renvoyer le résultat au modèle
					dcRef.current?.send(
						JSON.stringify({
							type: "conversation.item.create",
							item: {
								type: "function_call_output",
								call_id: data.call_id,
								output: JSON.stringify(result),
							},
						}),
					);
					dcRef.current?.send(JSON.stringify({ type: "response.create" }));
					break;
				}

				case "error": {
					const message = data.error?.message ?? "Erreur OpenAI Realtime";
					playCue("error");
					onErrorRef.current?.(new Error(message));
					break;
				}
			}
		},
		[cleanup, playCue, recordUserPace],
	);

	// ── Connexion ──────────────────────────────────────────────
	const connect = useCallback(
		async (init: RealtimeSessionInit) => {
			if (pcRef.current || isConnectingRef.current) return;

			isConnectingRef.current = true;
			sessionInitRef.current = init;
			// Track de session pour onSessionEnd (coût + audit)
			externalSessionIdRef.current = init.sessionId || null;
			sessionStartTsRef.current = Date.now();
			toolCallCountRef.current = 0;
			setVoiceState("connecting");

			// ── Télémétrie latence — nouvelle session, reset des marks ──
			markPrefixRef.current = makeMarkPrefix();
			bootMetricSentRef.current = false;
			lastSpeechStoppedTsRef.current = null;
			turnCounterRef.current = 0;
			const markPrefix = markPrefixRef.current;
			try {
				performance.mark(`${markPrefix}.connect.start`);
			} catch {
				/* perf API absente */
			}

			try {
				// 1. RTCPeerConnection
				const pc = new RTCPeerConnection();
				pcRef.current = pc;

				// Optimisation latence (Phase 1) : démarrer getUserMedia ASAP
				// (c'est la seule opération vraiment longue — 100–2000 ms sur la
				// 1ʳᵉ permission). Tout le setup synchrone qui suit (audio element,
				// data channel, ontrack handler) tourne pendant l'attente du mic,
				// au lieu d'être séquentiel après.
				// Optimisation latence (Phase 4) : si un stream a été pré-warmé
				// au hover de la sphère, on le passe au recorder qui l'utilise
				// directement (skip getUserMedia entièrement).
				recorderRef.current = new AudioRecorder();
				const prewarmedStream = prewarmedStreamRef.current;
				if (prewarmedStream) {
					// Transfert de propriété : le recorder le gérera désormais.
					prewarmedStreamRef.current = null;
					if (prewarmReleaseTimerRef.current) {
						clearTimeout(prewarmReleaseTimerRef.current);
						prewarmReleaseTimerRef.current = null;
					}
				}
				const recorderPromise = recorderRef.current.start(prewarmedStream);

				// 2. Audio distant
				// L'élément doit être attaché au DOM ET play() doit être appelé
				// explicitement : un <audio> détaché avec srcObject MediaStream
				// + autoplay n'est PAS fiable (Safari ne joue jamais ; Chrome
				// dépend de la fraîcheur du user-activation après les await).
				if (!audioElRef.current) {
					const el = document.createElement("audio");
					el.autoplay = true;
					// iOS Safari : attribut `playsinline` requis pour autoriser la
					// lecture inline sans bascule fullscreen. La propriété typée
					// `playsInline` n'existe que sur HTMLVideoElement — pour audio
					// on utilise uniquement setAttribute (équivalent fonctionnel).
					el.setAttribute("playsinline", "true");
					// Invisible mais présent dans <body> — requis pour la lecture
					// fiable d'un srcObject MediaStream.
					el.style.position = "fixed";
					el.style.width = "0";
					el.style.height = "0";
					el.style.opacity = "0";
					el.style.pointerEvents = "none";
					document.body.appendChild(el);
					audioElRef.current = el;
				}
				pc.ontrack = (e) => {
					const remoteStream = e.streams[0];
					const el = audioElRef.current;
					if (!el || !remoteStream) return;
					el.srcObject = remoteStream;
					applyPlaybackRate(speechRateRef.current);
					setTimeout(() => applyPlaybackRate(speechRateRef.current), 100);
					// `autoplay` seul ne suffit pas pour un srcObject MediaStream
					// dans tous les navigateurs. Le clic sur la sphère a bénit le
					// document, donc play() doit résoudre ; en cas d'échec on
					// remonte l'erreur via onError pour un toast explicite.
					void el.play().catch((err) => {
						console.warn("[iAsted] audio.play() rejected:", err);
						onErrorRef.current?.(
							new Error(
								"Lecture audio bloquée par le navigateur. Cliquez à nouveau sur la sphère ou autorisez l'autoplay.",
							),
						);
					});
				};

				// 4. DataChannel — créé + listeners enregistrés AVANT l'attente
				// du mic (le DC ne s'ouvrira qu'après setRemoteDescription, mais
				// on enregistre les listeners ASAP pour éviter toute race
				// théorique sur les navigateurs très rapides).
				const dc = pc.createDataChannel("oai-events");
				dcRef.current = dc;
				dc.addEventListener("message", handleDataChannelMessage);
				dc.addEventListener("open", () => {
					try {
						performance.mark(`${markPrefix}.dc.open`);
					} catch {
						/* perf API absente */
					}
					if (!sessionInitRef.current) return;

					// Optimisation latence (Phase 1) : tout est déjà configuré
					// dans le token éphémère côté serveur (voice, instructions,
					// tools, VAD…). On n'envoie un `session.update` à l'ouverture
					// du DC QUE si un pageContext a été appliqué à chaud avant la
					// connexion (cas rare) — sinon c'est un aller-retour réseau
					// inutile qui coûte 50–100 ms sur le boot.
					if (pageContextRef.current || sessionToolsRef.current) {
						sendSessionUpdate();
					}

					if (autoGreet) {
						// Optimisation latence (Phase 1) : envoi immédiat du
						// response.create. L'ancien setTimeout(800) ajoutait 800 ms
						// purs au boot sans bénéfice — OpenAI Realtime traite le
						// response.create dès qu'il arrive après le session.created
						// implicite, qui est déjà acquis à l'ouverture du DC.
						if (dc.readyState === "open") {
							dc.send(
								JSON.stringify({
									type: "response.create",
									response: {
										// GA : `output_modalities` n'accepte QUE `["audio"]`
										// ou `["text"]` (pas la combinaison). Pour le greeting
										// vocal on veut de l'audio. Le texte du transcript est
										// récupéré séparément via `response.audio_transcript.done`.
										output_modalities: ["audio"],
										instructions:
											"Saluez immédiatement l'utilisateur de manière brève, professionnelle et adaptée au ton diplomatique.",
									},
								}),
							);
						}
					}
				});

				// 3. Audio local (microphone) — résolution de la promesse
				// lancée plus haut. Sur 1ʳᵉ permission, c'est ici qu'on attend
				// la décision utilisateur ; les setups synchrones ci-dessus
				// sont déjà tous faits.
				await recorderPromise;
				try {
					performance.mark(`${markPrefix}.mediastream.ready`);
				} catch {
					/* perf API absente */
				}
				const stream = recorderRef.current.getStream();
				if (!stream) throw new Error("Stream microphone introuvable");
				const localTrack = stream.getTracks()[0];
				if (!localTrack) throw new Error("Aucune piste audio locale");
				pc.addTrack(localTrack);
				startAudioAnalysis(stream);

				// 5. Création de l'offre SDP
				const offer = await pc.createOffer();
				await pc.setLocalDescription(offer);
				try {
					performance.mark(`${markPrefix}.sdp.offer.created`);
				} catch {
					/* perf API absente */
				}

				// 6. Échange SDP avec OpenAI Realtime
				const model = init.model ?? DEFAULT_MODEL;
				const sdpResponse = await fetch(`${OPENAI_REALTIME_BASE_URL}?model=${model}`, {
					method: "POST",
					body: offer.sdp,
					headers: {
						Authorization: `Bearer ${init.ephemeralKey}`,
						"Content-Type": "application/sdp",
					},
				});

				if (!sdpResponse.ok) {
					// Log le body complet pour diagnostiquer la cause exacte
					// (model invalide, ephemeral key expiré, SDP malformé, etc.).
					const errorBody = await sdpResponse.text().catch(() => "");
					console.error(
						"[iAsted] OpenAI SDP exchange failed:",
						sdpResponse.status,
						errorBody,
					);
					throw new Error(
						`OpenAI connection failed: ${sdpResponse.status} ${errorBody.slice(0, 300)}`,
					);
				}

				const answer: RTCSessionDescriptionInit = {
					type: "answer",
					sdp: await sdpResponse.text(),
				};
				await pc.setRemoteDescription(answer);
				try {
					performance.mark(`${markPrefix}.sdp.answer.received`);
				} catch {
					/* perf API absente */
				}

				// 7. Surveillance ICE : retry si failed
				pc.oniceconnectionstatechange = () => {
					const state = pc.iceConnectionState;
					if (state === "failed" || state === "disconnected") {
						const attempt = reconnectAttemptsRef.current;
						if (attempt < MAX_RECONNECT_ATTEMPTS && sessionInitRef.current) {
							const delay = RECONNECT_BACKOFF_MS[attempt] ?? 5000;
							reconnectAttemptsRef.current = attempt + 1;
							setTimeout(() => {
								const session = sessionInitRef.current;
								cleanup();
								if (session) void connect(session);
							}, delay);
						} else {
							onErrorRef.current?.(new Error("Connexion perdue après plusieurs tentatives"));
							cleanup();
						}
					} else if (state === "connected") {
						reconnectAttemptsRef.current = 0;
					}
				};

				setIsConnected(true);
				isConnectingRef.current = false;
				onConnectedRef.current?.();
			} catch (error) {
				const err = error instanceof Error ? error : new Error("Échec de connexion");
				onErrorRef.current?.(err);
				cleanup();
				isConnectingRef.current = false;
				// Re-throw pour que les consumers (activateVoice) puissent
				// afficher un message d'erreur précis et nettoyer leur état
				// (ex : dismiss le toast "Connexion…").
				throw err;
			}
		},
		[handleDataChannelMessage, startAudioAnalysis, cleanup, applyPlaybackRate, autoGreet, sendSessionUpdate],
	);

	// ── Déconnexion ────────────────────────────────────────────
	const disconnect = useCallback(async () => {
		cleanup();
		sessionInitRef.current = null;
		reconnectAttemptsRef.current = 0;
		// Laisser un court délai pour le cleanup avant éventuelle reconnexion
		await new Promise((resolve) => setTimeout(resolve, 200));
	}, [cleanup]);

	// ── Pré-warm micro (Phase 4) ───────────────────────────────
	// Hovers répétés = no-op (déjà prêt). Auto-libération après 30 s pour
	// éviter que l'icône "micro actif" du navigateur reste indéfiniment.
	const cancelPrewarmRef = useRef<() => void>(() => {});
	const prewarmMediaFn = useCallback(async () => {
		// Déjà connecté ou en cours : aucun intérêt à pré-warmer.
		if (isConnectingRef.current || pcRef.current) return;
		// Stream déjà pré-warmé et toujours vivant : on prolonge juste le TTL.
		const existing = prewarmedStreamRef.current;
		if (existing && existing.getTracks().some((t) => t.readyState === "live")) {
			if (prewarmReleaseTimerRef.current) clearTimeout(prewarmReleaseTimerRef.current);
			prewarmReleaseTimerRef.current = setTimeout(() => cancelPrewarmRef.current(), 30_000);
			return;
		}
		const stream = await prewarmMedia();
		if (!stream) return; // permission non accordée : no-op silencieux
		// Course-condition : si l'utilisateur a cliqué entre temps et que
		// `connect()` a déjà démarré, on relâche immédiatement.
		if (isConnectingRef.current || pcRef.current) {
			stream.getTracks().forEach((t) => t.stop());
			return;
		}
		prewarmedStreamRef.current = stream;
		if (prewarmReleaseTimerRef.current) clearTimeout(prewarmReleaseTimerRef.current);
		prewarmReleaseTimerRef.current = setTimeout(() => cancelPrewarmRef.current(), 30_000);
	}, []);
	const cancelPrewarmFn = useCallback(() => {
		const s = prewarmedStreamRef.current;
		if (s) {
			s.getTracks().forEach((t) => t.stop());
			prewarmedStreamRef.current = null;
		}
		if (prewarmReleaseTimerRef.current) {
			clearTimeout(prewarmReleaseTimerRef.current);
			prewarmReleaseTimerRef.current = null;
		}
	}, []);
	// Stabilise la ref pour le setTimeout d'auto-libération.
	useEffect(() => {
		cancelPrewarmRef.current = cancelPrewarmFn;
	}, [cancelPrewarmFn]);

	// ── Envoi message texte (commande locale) ───────────────────
	const sendText = useCallback((text: string) => {
		if (dcRef.current?.readyState !== "open") return;
		dcRef.current.send(
			JSON.stringify({
				type: "conversation.item.create",
				item: {
					type: "message",
					role: "user",
					content: [{ type: "input_text", text }],
				},
			}),
		);
		dcRef.current.send(JSON.stringify({ type: "response.create" }));
	}, []);

	// ── Cleanup au démontage ────────────────────────────────────
	useEffect(() => {
		return () => {
			cleanup();
			// Libérer aussi un éventuel stream pré-warmé pour ne pas laisser
			// le badge "micro actif" du navigateur en l'air.
			cancelPrewarmRef.current();
		};
	}, [cleanup]);

	// Sprint 5 — G3 : détection online/offline pendant une session active.
	// Le hook ne décide PAS de couper la session (WebRTC peut survivre à
	// une courte coupure) — il prévient le consumer qui décide quoi faire
	// (toast, indicateur visuel, etc.). Pas d'effet en dehors d'une session.
	const onNetworkStatusChangeRef = useRef(onNetworkStatusChange);
	useEffect(() => {
		onNetworkStatusChangeRef.current = onNetworkStatusChange;
	}, [onNetworkStatusChange]);
	useEffect(() => {
		if (typeof window === "undefined") return;
		const handleOnline = () => {
			if (!isConnected) return; // pas d'event hors session
			onNetworkStatusChangeRef.current?.(true);
		};
		const handleOffline = () => {
			if (!isConnected) return;
			onNetworkStatusChangeRef.current?.(false);
		};
		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);
		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, [isConnected]);

	const clearMessages = useCallback(() => setMessages([]), []);

	// Sprint 5.5 wiring — capture instantanée du voiceprint depuis le stream
	// de la session vocale active. Dynamic import pour éviter les imports
	// circulaires (voice-print importe depuis le même package).
	const captureVoicePrintFn = useCallback(async (): Promise<string | null> => {
		const stream = recorderRef.current?.getStream();
		if (!stream) return null;
		try {
			const mod = await import("../lib/voice-print");
			return await mod.extractVoicePrint(stream);
		} catch (err) {
			console.warn("[iAsted] captureVoicePrint failed:", err);
			return null;
		}
	}, []);

	return {
		voiceState,
		audioLevel,
		messages,
		isConnected,
		isConnecting: voiceState === "connecting",
		speechRate,
		setSpeechRate,
		connect,
		disconnect,
		clearMessages,
		sendText,
		updateSession,
		prewarmMedia: prewarmMediaFn,
		cancelPrewarm: cancelPrewarmFn,
		captureVoicePrint: captureVoicePrintFn,
	};
}

// ─────────────────────────────────────────────────────────────
// Réexports types pour ergonomie (single import)
// ─────────────────────────────────────────────────────────────

export type {
	VoiceState,
	RealtimeMessage,
	RealtimeSessionInit,
	RealtimeVoice,
	RealtimeToolHandler,
	RealtimeToolResult,
} from "./use-realtime-voice-types";
