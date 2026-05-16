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
	RealtimeVoice,
	RealtimeVoiceTool,
	VoiceState,
} from "./use-realtime-voice-types";

// ─────────────────────────────────────────────────────────────
// AudioRecorder — encapsule getUserMedia + ScriptProcessor PCM
// ─────────────────────────────────────────────────────────────

class AudioRecorder {
	private stream: MediaStream | null = null;
	private audioContext: AudioContext | null = null;
	private processor: ScriptProcessorNode | null = null;
	private source: MediaStreamAudioSourceNode | null = null;

	async start() {
		this.stream = await navigator.mediaDevices.getUserMedia({
			audio: {
				sampleRate: 24000,
				channelCount: 1,
				echoCancellation: true,
				noiseSuppression: true,
				autoGainControl: true,
			},
		});

		this.audioContext = new AudioContext({ sampleRate: 24000 });
		this.source = this.audioContext.createMediaStreamSource(this.stream);
		this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
		this.source.connect(this.processor);
		this.processor.connect(this.audioContext.destination);
	}

	getStream(): MediaStream | null {
		return this.stream;
	}

	stop() {
		this.source?.disconnect();
		this.source = null;
		this.processor?.disconnect();
		this.processor = null;
		this.stream?.getTracks().forEach((track) => track.stop());
		this.stream = null;
		void this.audioContext?.close();
		this.audioContext = null;
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

// OpenAI Realtime GA :
//   - endpoint client SDP exchange : `POST /v1/realtime?model=...`
//   - modèle : `gpt-realtime` (remplace `gpt-4o-realtime-preview-*` déprécié).
// Note historique : `/v1/realtime/calls` est l'API SIP/PSTN (Calls API),
// distincte du flux WebRTC navigateur — ce dernier reste sur `/v1/realtime`.
const OPENAI_REALTIME_BASE_URL = "https://api.openai.com/v1/realtime";
const DEFAULT_MODEL = "gpt-realtime";
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
		},
		[applyPlaybackRate],
	);

	// ── Audio level analysis ────────────────────────────────────
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
		const tick = () => {
			if (!analyserRef.current) return;
			analyserRef.current.getByteFrequencyData(buffer);
			let sum = 0;
			for (let i = 0; i < buffer.length; i++) sum += buffer[i] ?? 0;
			const avg = sum / buffer.length;
			const normalized = Math.max(0, (avg - 10) / 100);
			setAudioLevel((prev) => prev * 0.8 + normalized * 0.2);
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

	// ── Compose + envoie `session.update` à OpenAI Realtime ────
	// Concatène le bloc de contexte page (si présent) au systemPrompt de base
	// et utilise les tools courants. No-op si le DataChannel n'est pas ouvert.
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
					voice: session.voice,
					instructions,
					tool_choice: "auto",
					tools,
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
					break;

				case "input_audio_buffer.speech_stopped":
					setVoiceState("thinking");
					playCue("thinking");
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
					}
					break;
				}

				case "response.audio_transcript.delta":
					currentTranscriptRef.current += data.delta ?? "";
					break;

				case "response.audio_transcript.done": {
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

				case "response.audio.delta":
					setVoiceState((prev) => (prev === "speaking" ? prev : "speaking"));
					break;

				case "response.audio.done":
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
		[cleanup, playCue],
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

			try {
				// 1. RTCPeerConnection
				const pc = new RTCPeerConnection();
				pcRef.current = pc;

				// 2. Audio distant
				// L'élément doit être attaché au DOM ET play() doit être appelé
				// explicitement : un <audio> détaché avec srcObject MediaStream
				// + autoplay n'est PAS fiable (Safari ne joue jamais ; Chrome
				// dépend de la fraîcheur du user-activation après les await).
				if (!audioElRef.current) {
					const el = document.createElement("audio");
					el.autoplay = true;
					// iOS Safari : property + attribute pour autoriser la lecture
					// inline sans bascule fullscreen.
					el.playsInline = true;
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

				// 3. Audio local (microphone)
				recorderRef.current = new AudioRecorder();
				await recorderRef.current.start();
				const stream = recorderRef.current.getStream();
				if (!stream) throw new Error("Stream microphone introuvable");
				const localTrack = stream.getTracks()[0];
				if (!localTrack) throw new Error("Aucune piste audio locale");
				pc.addTrack(localTrack);
				startAudioAnalysis(stream);

				// 4. DataChannel
				const dc = pc.createDataChannel("oai-events");
				dcRef.current = dc;
				dc.addEventListener("message", handleDataChannelMessage);

				dc.addEventListener("open", () => {
					// Configurer la session : voix, instructions (avec contexte page
					// si déjà défini), tools. Toute mise à jour ultérieure
					// (navigation, changement de tools) passe par `updateSession`.
					if (!sessionInitRef.current) return;
					sendSessionUpdate();

					if (autoGreet) {
						setTimeout(() => {
							if (dc.readyState === "open") {
								dc.send(
									JSON.stringify({
										type: "response.create",
										response: {
											modalities: ["text", "audio"],
											instructions:
												"Saluez immédiatement l'utilisateur de manière brève, professionnelle et adaptée au ton diplomatique.",
										},
									}),
								);
							}
						}, 800);
					}
				});

				// 5. Création de l'offre SDP
				const offer = await pc.createOffer();
				await pc.setLocalDescription(offer);

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
		};
	}, [cleanup]);

	const clearMessages = useCallback(() => setMessages([]), []);

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
