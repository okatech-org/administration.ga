/**
 * useCitizenIAstedHost — Orchestrateur du mode vocal iAsted pour consulat.ga
 * (espace citoyen / ressortissant).
 *
 * Equivalent fonctionnel de `apps/backoffice-web/.../use-iasted-host.ts` et
 * `apps/agent-web/.../use-iasted-host.ts`, adapte au contexte citoyen :
 *   - surface = "citizen" (cf. RealtimeSurface)
 *   - PAS de orgId — le ressortissant est rattache a un consulat de juridiction
 *     resolu cote backend (call_my_consulate, book_my_appointment_intent)
 *   - MODULE_ROUTES mappes vers /my-space/* (espace consulaire ressortissant)
 *   - UI actions limitees au perimetre citoyen (pas d'edition document, pas de
 *     supervision admin, pas d'audit log, pas de gestion utilisateurs)
 *   - Conserve : screen/camera capture (utile pour scanner passeport / CNI),
 *     form_control (remplissage vocal des formulaires consulaires),
 *     livekit_control (appels au consulat), multi-device handoff
 *
 * Le hook combine :
 *   - `useAction(api.ai.realtimeToken.create)` → token ephemere OpenAI Realtime
 *   - `useAction(api.ai.realtimeToolExecutor.executeRealtimeTool)` → dispatch
 *     securise des tools metier cote serveur
 *   - `useRealtimeVoice` du package iasted pour la connexion WebRTC
 *
 * Le memory utilisateur exige iAsted = OpenAI Realtime canonique sur
 * consulat.ga (jamais de fallback Gemini sans decision produit explicite),
 * d'ou l'usage direct de `useRealtimeVoice` (pas de dispatcher provider-
 * agnostique comme dans agent-web).
 */

"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
	captureCameraAsBase64,
	captureScreenAsBase64,
	getDeviceLabel,
	getOrCreateDeviceId,
	useDeviceHandoffListener,
	useRealtimeVoice,
	useShadowObserver,
	type IAstedVoiceController,
	type RealtimeToolResult,
} from "@workspace/iasted";
import { pageContextStore } from "@workspace/agent-features/stores";
import { api } from "@convex/_generated/api";

// ─────────────────────────────────────────────────────────────
// Mapping modules → routes citizen-web (/my-space/*)
// ─────────────────────────────────────────────────────────────
// Les codes de modules sont ceux annonces par le prompt iAsted (cf.
// moduleListToFR dans convex/ai/iastedRealtimePrompt.ts) et le tool
// `navigate_to_module`. Pour le citoyen, on ne mappe que les modules
// qui ont un equivalent dans l'espace consulaire ressortissant.
const MODULE_ROUTES: Record<string, string> = {
	// Demandes consulaires (passeport, CNI, visa, legalisation, etc.)
	requests: "/my-space/requests",
	consular_affairs: "/my-space/requests",
	// Catalogue de services / depots de demarches
	services: "/my-space/services-demarches",
	demarches: "/my-space/demarches",
	// Agenda personnel + prise de RDV
	calendar: "/my-space/iagenda",
	appointments: "/my-space/appointments",
	// Coffre documentaire personnel + iDocument lecture seule
	documents: "/my-space/idocument",
	vault: "/my-space/vault",
	// Notifications + messagerie (chat avec les agents)
	notifications: "/my-space/notifications",
	messaging: "/my-space/iasted",
	// Profil / parametres ressortissant
	profile: "/my-space/profile",
	settings: "/my-space/settings",
	// Page d'accueil iAsted plein ecran
	iasted: "/my-space/iasted",
};

// ─────────────────────────────────────────────────────────────
// Hook principal
// ─────────────────────────────────────────────────────────────

export function useCitizenIAstedHost(): IAstedVoiceController {
	const router = useRouter();
	// Cast `api as any` — meme rationale que dans backoffice/agent-web :
	// le codegen Convex peut ne pas refleter ces actions tant que
	// `bunx convex dev` n'a pas tourne sur le deployment cible. A runtime,
	// Convex resout par nom de chemin — l'appel fonctionnera des que les
	// fonctions sont pushees. En attendant, le catch d'activateVoice
	// passe le bouton en mode degrade.
	const createToken = useAction((api as any).ai.realtimeToken.create);
	const executeTool = useAction(
		(api as any).ai.realtimeToolExecutor.executeRealtimeTool,
	);
	const recordSessionEnd = useAction(
		(api as any).ai.realtimeSessions.recordSessionEnd,
	);
	const markOnboarded = useMutation(
		(api as any).ai.voicePreferences.markVoiceOnboarded,
	);
	const writeSessionContext = useMutation(
		(api as any).ai.iastedMemories.writeSessionContext,
	);
	const analyzeImage = useAction((api as any).ai.vision.describeImage);
	const appendConvMessage = useMutation(
		(api as any).ai.iastedConversations.appendMessage,
	);
	const registerDevice = useMutation(
		(api as any).ai.iastedDevicePresence.registerDevice,
	);
	const heartbeatDevice = useMutation(
		(api as any).ai.iastedDevicePresence.heartbeatDevice,
	);
	const requestHandoff = useMutation(
		(api as any).ai.iastedDevicePresence.requestHandoff,
	);
	const completeHandoff = useMutation(
		(api as any).ai.iastedDevicePresence.completeHandoff,
	);
	const myDevices = useQuery(
		(api as any).ai.iastedDevicePresence.listMyDevices,
		{},
	) as
		| Array<{
				deviceId: string;
				label: string;
				state:
					| "idle"
					| "active"
					| "handoff_pending"
					| "handoff_received";
				peerDeviceId?: string;
		  }>
		| undefined;

	const [available, setAvailable] = useState(true);
	const [unavailableReason, setUnavailableReason] = useState<
		string | undefined
	>();
	const hasCheckedRef = useRef(false);

	// Preferences vocales (locale notamment).
	const voicePrefs = useQuery(
		(api as any).ai.voicePreferences.getMyVoicePreferences,
		{},
	);
	const preferredLocale = voicePrefs?.preferredLocale as string | undefined;

	// ── Dispatch des UI actions retournees par les tools serveur ──
	const dispatchUiAction = useCallback(
		(uiAction: { type: string; payload?: Record<string, unknown> }) => {
			switch (uiAction.type) {
				case "navigate": {
					const moduleCode = uiAction.payload?.module as string | undefined;
					const subpath = uiAction.payload?.subpath as string | undefined;
					if (!moduleCode) return;
					const base = MODULE_ROUTES[moduleCode];
					if (!base) {
						toast.warning(`Module inconnu : ${moduleCode}`);
						return;
					}
					const target = subpath ? `${base}/${subpath}` : base;
					router.push(target);
					break;
				}
				case "open_chat":
					window.dispatchEvent(
						new CustomEvent("iasted:open", {
							detail: { tab: "ichat" },
						}),
					);
					break;
				case "close_chat":
					window.dispatchEvent(new CustomEvent("iasted:close"));
					break;
				case "open_app_menu":
					window.dispatchEvent(
						new CustomEvent("iasted:fan-toggle", {
							detail: { open: true },
						}),
					);
					break;
				case "open_iasted_tab": {
					const tab = uiAction.payload?.tab as string | undefined;
					window.dispatchEvent(
						new CustomEvent("iasted:open", {
							detail: { tab: tab ?? "ichat" },
						}),
					);
					break;
				}
				case "control_ui": {
					const action = uiAction.payload?.action as string | undefined;
					if (action === "set_theme_dark") {
						document.documentElement.classList.add("dark");
					} else if (action === "set_theme_light") {
						document.documentElement.classList.remove("dark");
					} else if (action === "toggle_theme") {
						document.documentElement.classList.toggle("dark");
					}
					break;
				}
				case "open_conversation": {
					// Ouvre l'onglet iChat avec le contact pre-selectionne
					// (typiquement un agent du consulat). Meme pattern que
					// backoffice/agent — citizen-web ecoute aussi.
					const targetUserId = uiAction.payload?.targetUserId as
						| string
						| undefined;
					if (targetUserId) {
						window.dispatchEvent(
							new CustomEvent("iasted:select-contact", {
								detail: { userId: targetUserId },
							}),
						);
					}
					window.dispatchEvent(
						new CustomEvent("iasted:open", {
							detail: { tab: "ichat" },
						}),
					);
					break;
				}
				case "open_active_call":
				case "open_meeting_prejoin": {
					// Le citoyen peut etre invite a une visioconference par un
					// agent (rendez-vous distanciel, audition consulaire). Le
					// floating window de citizen-web ecoute le meme event que
					// celui d'agent-web (GlobalOutgoingCallWindow).
					const meetingId = uiAction.payload?.meetingId as
						| string
						| undefined;
					const tab =
						uiAction.type === "open_active_call" ? "icall" : "icall";
					window.dispatchEvent(
						new CustomEvent("iasted:open", {
							detail: { tab, meetingId },
						}),
					);
					break;
				}
				case "livekit_control": {
					// Pilote le LocalParticipant LiveKit pendant un appel actif
					// (mute/unmute, camera, partage d'ecran). Le bridge est monte
					// dans <LiveKitRoom> cote citoyen comme cote agent.
					window.dispatchEvent(
						new CustomEvent("iasted:livekit-control", {
							detail: uiAction.payload,
						}),
					);
					break;
				}
				case "close_active_call_window": {
					window.dispatchEvent(
						new CustomEvent("iasted:close-call-window", {
							detail: uiAction.payload,
						}),
					);
					break;
				}
				case "iasted_document_created": {
					// iAsted vient d'extraire un document (ex. recapitulatif de
					// demande) — la fenetre vocale peut afficher une carte avec
					// actions (Telecharger, Envoyer au consulat).
					window.dispatchEvent(
						new CustomEvent("iasted:document-created", {
							detail: uiAction.payload,
						}),
					);
					break;
				}
				case "request_screen_capture": {
					// Sprint 6 C1 — capture ecran courant + analyse vision.
					// Cote citoyen, utile pour : « explique-moi ce que je vois »,
					// « est-ce que mon formulaire est correctement rempli ? ».
					const focusHint = (uiAction.payload?.focusHint as string) ?? "";
					const detail =
						uiAction.payload?.detail === "high" ? "high" : "low";
					void (async () => {
						try {
							const imageBase64 = await captureScreenAsBase64();
							if (!imageBase64) {
								voice.sendText(
									"[Capture d'ecran annulee par l'utilisateur ou non supportee par ce navigateur.]",
								);
								return;
							}
							const result = (await analyzeImage({
								imageBase64,
								focusHint: focusHint || undefined,
								detail: detail as "high" | "low",
							})) as {
								ok: boolean;
								description?: string;
								error?: string;
							};
							if (result.ok && result.description) {
								voice.sendText(
									`[Description de l'ecran : ${result.description}]`,
								);
							} else {
								voice.sendText(
									`[Echec analyse ecran : ${result.error ?? "erreur inconnue"}]`,
								);
							}
						} catch (err) {
							console.warn("[iAsted] screen capture failed", err);
							voice.sendText(
								"[Capture d'ecran impossible. Reessayez ou decrivez-moi vous-meme ce que vous voyez.]",
							);
						}
					})();
					break;
				}
				case "request_camera_capture": {
					// Sprint 6.5 C3 — capture camera + analyse vision.
					// Cote citoyen, le cas d'usage canonique est le SCAN DE
					// DOCUMENT (passeport, CNI, justificatif) : « iAsted, regarde
					// ce passeport » → l'agent lit le numero, la date d'expiration,
					// le nom, et peut pre-remplir un formulaire.
					const focusHint = (uiAction.payload?.focusHint as string) ?? "";
					const detail =
						uiAction.payload?.detail === "low" ? "low" : "high";
					void (async () => {
						try {
							const imageBase64 = await captureCameraAsBase64();
							if (!imageBase64) {
								voice.sendText(
									"[Capture camera impossible — permission refusee ou pas de camera disponible.]",
								);
								return;
							}
							const result = (await analyzeImage({
								imageBase64,
								focusHint: focusHint || undefined,
								detail: detail as "high" | "low",
							})) as {
								ok: boolean;
								description?: string;
								error?: string;
							};
							if (result.ok && result.description) {
								voice.sendText(
									`[Analyse du document : ${result.description}]`,
								);
							} else {
								voice.sendText(
									`[Echec analyse document : ${result.error ?? "erreur inconnue"}]`,
								);
							}
						} catch (err) {
							console.warn("[iAsted] camera capture failed", err);
							voice.sendText(
								"[Capture camera impossible. Reessayez ou photographiez le document avant.]",
							);
						}
					})();
					break;
				}
				case "request_device_handoff": {
					// Sprint 10 A4 — handoff multi-device (« continue sur mon
					// telephone ») — utile aux ressortissants qui basculent
					// d'un desktop au smartphone pour scanner un document.
					const targetDeviceId = uiAction.payload?.targetDeviceId as
						| string
						| undefined;
					if (!targetDeviceId || !deviceIdRef.current) {
						voice.sendText(
							"[Handoff impossible : device source ou cible inconnu.]",
						);
						break;
					}
					void requestHandoff({
						sourceDeviceId: deviceIdRef.current,
						targetDeviceId,
					})
						.then(() => {
							setTimeout(() => voice.disconnect(), 1200);
						})
						.catch((err: any) => {
							voice.sendText(
								`[Handoff echoue : ${err?.message ?? "erreur"}]`,
							);
						});
					break;
				}
				case "form_control": {
					// Remplissage vocal des formulaires consulaires (demande de
					// passeport, signalement de presence, inscription consulaire).
					const payload = uiAction.payload as {
						action?: "fill" | "clear" | "submit" | "read_state";
						fieldId?: string;
						formId?: string;
						value?: unknown;
					};
					if (!payload?.action) break;
					void pageContextStore
						.applyFormFieldAction({
							action: payload.action,
							fieldId: payload.fieldId,
							formId: payload.formId,
							value: payload.value,
						})
						.catch((err) => {
							console.warn("[iAsted] form_control failed", err);
						});
					break;
				}
				case "set_accessibility_mode": {
					const enabled = !!uiAction.payload?.enabled;
					try {
						window.localStorage?.setItem(
							"iasted.accessibility_mode",
							enabled ? "true" : "false",
						);
					} catch {
						/* localStorage indisponible — ignore */
					}
					toast.info(
						enabled
							? "Mode accessibilite active. Reconnexion a la session…"
							: "Mode accessibilite desactive.",
					);
					break;
				}
				case "noop":
					break;
				default:
					break;
			}
		},
		[router],
	);

	// Lecture du mode accessibilite — local storage cote client.
	const accessibilityMode =
		typeof window !== "undefined" &&
		window.localStorage?.getItem("iasted.accessibility_mode") === "true";

	const voice = useRealtimeVoice({
		surface: "citizen",
		accessibilityMode,
		onSessionEnd: useCallback(
			async (metrics: {
				externalSessionId: string;
				durationSeconds: number;
				toolCallCount: number;
				endReason?: string;
			}) => {
				try {
					await recordSessionEnd(metrics);
				} catch (err) {
					console.warn("[iAsted] recordSessionEnd failed", err);
				}
				// Marque l'onboarding termine apres usage reel (> 5s ou >= 1 tool).
				if (
					metrics.durationSeconds > 5 ||
					metrics.toolCallCount > 0
				) {
					try {
						await markOnboarded();
					} catch (err) {
						console.warn("[iAsted] markOnboarded failed", err);
					}
				}
				// Trace minimaliste pour personnaliser la prochaine salutation.
				if (
					metrics.durationSeconds > 30 ||
					metrics.toolCallCount > 0
				) {
					try {
						const dateLabel = new Date().toLocaleString("fr-FR", {
							dateStyle: "short",
							timeStyle: "short",
						});
						await writeSessionContext({
							content: `Derniere session vocale le ${dateLabel} (${
								metrics.toolCallCount
							} action${metrics.toolCallCount > 1 ? "s" : ""}, ${Math.round(
								metrics.durationSeconds,
							)}s).`,
						});
					} catch (err) {
						console.warn(
							"[iAsted] writeSessionContext failed",
							err,
						);
					}
				}
			},
			[recordSessionEnd, markOnboarded, writeSessionContext],
		),
		onToolCall: useCallback(
			async (
				name: string,
				args: Record<string, unknown>,
			): Promise<RealtimeToolResult> => {
				const result = (await executeTool({
					toolName: name,
					toolArgs: args,
					// Cote citoyen, pas d'orgId obligatoire — le backend resout
					// le consulat de juridiction depuis le profil ressortissant
					// pour les tools concernes (call_my_consulate, etc.).
					surface: "citizen",
				})) as RealtimeToolResult;

				if (result.uiAction) {
					dispatchUiAction(result.uiAction);
					if (result.uiAction.type === "stop_conversation") {
						setTimeout(() => voice.disconnect(), 100);
					}
					if (result.uiAction.type === "control_ui") {
						const action = result.uiAction.payload?.action as
							| string
							| undefined;
						const value = result.uiAction.payload?.value as
							| string
							| undefined;
						if (action === "set_speech_rate" && value) {
							const rate = parseFloat(value);
							if (!Number.isNaN(rate)) voice.setSpeechRate(rate);
						}
					}
				}
				return result;
			},
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[executeTool, dispatchUiAction],
		),
		onError: useCallback((error: Error) => {
			console.warn("[iAsted] voice error:", error.message);
		}, []),
		onNetworkStatusChange: useCallback((online: boolean) => {
			if (online) {
				toast.success("Connexion reseau retablie. iAsted reprend.", {
					id: "iasted-network",
					duration: 3000,
				});
			} else {
				toast.warning(
					"Connexion reseau perdue. iAsted continue mais peut couper.",
					{ id: "iasted-network", duration: 6000 },
				);
			}
		}, []),
	});

	// ── Multi-device presence (utile pour le ressortissant qui passe
	// du desktop au mobile, ex. pour scanner un document). ──
	const deviceIdRef = useRef<string>("");
	useEffect(() => {
		if (typeof window === "undefined") return;
		deviceIdRef.current = getOrCreateDeviceId();
		const label = getDeviceLabel();
		void registerDevice({
			deviceId: deviceIdRef.current,
			label,
			surface: "citizen",
		}).catch(() => undefined);
	}, [registerDevice]);

	useEffect(() => {
		if (!deviceIdRef.current) return;
		const targetState = voice.isConnected ? "active" : "idle";
		const tick = () => {
			void heartbeatDevice({
				deviceId: deviceIdRef.current,
				state: targetState as any,
			}).catch(() => undefined);
		};
		tick();
		const handle = setInterval(tick, 30_000);
		return () => clearInterval(handle);
	}, [voice.isConnected, heartbeatDevice]);

	// ── Shadow observer (Sprint 8 F4) : aide proactive quand
	// le ressortissant patine sur un formulaire (ex. champ adresse
	// obligatoire vide depuis 30 s). ──
	useShadowObserver({
		enabled: voice.isConnected,
		onObservation: (obs) => {
			const human =
				obs.pattern === "focus_stalled"
					? `[Observation : utilisateur en pause sur le champ « ${obs.target ?? "?"} » depuis ${Math.round(
							(obs.durationMs ?? 0) / 1000,
						)}s — peut proposer aide pour remplir.]`
					: obs.pattern === "repeated_click"
						? `[Observation : ${obs.count ?? 0} clics repetes sur « ${obs.target ?? "?"} » — action ne semble pas repondre.]`
						: `[Observation : navigation prolongee sans interaction.]`;
			voice.sendText(human);
		},
	});

	// ── Handoff multi-device : reception cote device cible. ──
	useDeviceHandoffListener({
		devices: myDevices ?? null,
		thisDeviceId: deviceIdRef.current,
		onHandoffReceived: async (sourceLabel, _sourceDeviceId) => {
			toast.info(`Session iAsted transferee depuis ${sourceLabel}.`, {
				duration: 4000,
			});
			try {
				await activateVoice();
				await completeHandoff({ thisDeviceId: deviceIdRef.current });
			} catch (err) {
				console.warn("[iAsted] handoff reception failed", err);
			}
		},
	});

	// ── Persistance vocal ↔ texte : upsert chaque nouveau message
	// dans iastedConversations pour reprise dans iChat + continuite
	// < 1 h dans la prochaine session vocale. ──
	const lastUpsertedCountRef = useRef(0);
	useEffect(() => {
		const total = voice.messages.length;
		if (total < lastUpsertedCountRef.current) {
			lastUpsertedCountRef.current = total;
			return;
		}
		if (total === lastUpsertedCountRef.current) return;
		const newOnes = voice.messages.slice(lastUpsertedCountRef.current);
		lastUpsertedCountRef.current = total;
		for (const m of newOnes) {
			void appendConvMessage({
				role: m.role,
				content: m.content,
				mode: "voice",
				surface: "citizen",
				// Pas d'orgId — le ressortissant n'est rattache a aucune org
				// dans le sens admin du terme.
			}).catch((err) => {
				console.warn("[iAsted] appendConvMessage failed", err);
			});
		}
	}, [voice.messages, appendConvMessage]);

	// ── Pre-warm session (Phase 4 — UX latence). ──
	const prefetchedSessionRef = useRef<{
		session: Awaited<ReturnType<typeof createToken>>;
		fetchedAt: number;
	} | null>(null);
	const prefetchInFlightRef = useRef<Promise<unknown> | null>(null);
	const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const isPrefetchUsable = useCallback(() => {
		const p = prefetchedSessionRef.current;
		if (!p) return null;
		if (Date.now() - p.fetchedAt > 50_000) {
			prefetchedSessionRef.current = null;
			return null;
		}
		return p.session.available ? p.session : null;
	}, []);

	const activateVoice = useCallback(async () => {
		if (!available) {
			toast.warning(
				unavailableReason === "NOT_CONFIGURED"
					? "Mode vocal indisponible — cle OpenAI non configuree."
					: "Mode vocal indisponible.",
			);
			return;
		}
		if (voice.isConnected || voice.isConnecting) {
			void voice.disconnect();
			return;
		}

		const connectingToast = toast.loading("Connexion a iAsted…");

		try {
			let session = isPrefetchUsable();
			if (session) {
				prefetchedSessionRef.current = null;
			} else {
				if (prefetchInFlightRef.current) {
					await prefetchInFlightRef.current.catch(() => undefined);
					session = isPrefetchUsable();
					if (session) prefetchedSessionRef.current = null;
				}
				if (!session) {
					session = await createToken({
						surface: "citizen",
						locale: preferredLocale,
					});
				}
			}
			if (!session.available || !session.ephemeralKey) {
				const reason = session.error ?? "UNKNOWN";
				setAvailable(false);
				setUnavailableReason(reason);
				hasCheckedRef.current = true;
				const message =
					reason === "NOT_CONFIGURED"
						? "Mode vocal indisponible — cle OpenAI non configuree."
						: reason === "OPENAI_BETA_DISABLED"
							? "Mode vocal indisponible — la Beta OpenAI Realtime est desactivee sur cette cle. Migrez le compte vers la GA API."
							: `Mode vocal indisponible (${reason}).`;
				toast.warning(message, { id: connectingToast });
				return;
			}
			await voice.connect({
				ephemeralKey: session.ephemeralKey,
				sessionId: session.sessionId ?? "",
				model: session.model,
				systemPrompt: session.systemPrompt ?? "",
				tools: session.tools ?? [],
				voice: session.voice ?? "ash",
				expiresAt: session.expiresAt,
			});
			toast.success("iAsted vous ecoute", { id: connectingToast });

			// Quota OpenAI — toast informatif si pres du plafond mensuel.
			const ql = (session as any).quotaLevel as
				| "approaching"
				| "warning"
				| "exceeded"
				| null
				| undefined;
			if (ql === "exceeded") {
				toast.error(
					"Quota OpenAI depasse pour ce mois — sessions vocales en mode degrade.",
					{ duration: 8000 },
				);
			} else if (ql === "warning") {
				toast.warning(
					"Quota OpenAI a 90 % du budget mensuel. L'agent peut etre brievement indisponible.",
					{ duration: 6000 },
				);
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Erreur inconnue";
			if (message.startsWith("RATE_LIMITED:")) {
				toast.warning(message.replace("RATE_LIMITED:", ""), {
					id: connectingToast,
				});
			} else if (message === "INSUFFICIENT_PERMISSIONS") {
				toast.warning(
					"Vous n'avez pas la permission d'utiliser le mode vocal.",
					{ id: connectingToast },
				);
			} else if (
				message.includes("Permission denied") ||
				message.includes("NotAllowedError")
			) {
				toast.error(
					"Acces microphone refuse. Autorisez l'acces au microphone dans les parametres du navigateur.",
					{ id: connectingToast, duration: 8000 },
				);
			} else {
				toast.error(`Echec de connexion : ${message}`, {
					id: connectingToast,
				});
			}
		}
	}, [
		available,
		unavailableReason,
		voice,
		createToken,
		preferredLocale,
		isPrefetchUsable,
	]);

	const prewarmSession = useCallback(() => {
		if (!available || voice.isConnected || voice.isConnecting) return;
		void voice.prewarmMedia();
		if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
		prefetchTimerRef.current = setTimeout(() => {
			prefetchTimerRef.current = null;
			if (
				!available ||
				voice.isConnected ||
				voice.isConnecting ||
				prefetchInFlightRef.current ||
				isPrefetchUsable()
			) {
				return;
			}
			const inflight = createToken({
				surface: "citizen",
				locale: preferredLocale,
			})
				.then((session) => {
					prefetchedSessionRef.current = {
						session,
						fetchedAt: Date.now(),
					};
				})
				.catch(() => {
					/* echec silencieux du pre-fetch */
				})
				.finally(() => {
					if (prefetchInFlightRef.current === inflight) {
						prefetchInFlightRef.current = null;
					}
				});
			prefetchInFlightRef.current = inflight;
		}, 250);
	}, [available, voice, createToken, preferredLocale, isPrefetchUsable]);

	const cancelPrewarmSession = useCallback(() => {
		if (prefetchTimerRef.current) {
			clearTimeout(prefetchTimerRef.current);
			prefetchTimerRef.current = null;
		}
		voice.cancelPrewarm();
	}, [voice]);

	// Reconnexion automatique sur changement de locale en cours de session.
	const lastLocaleRef = useRef<string | undefined>(preferredLocale);
	useEffect(() => {
		if (lastLocaleRef.current === preferredLocale) return;
		const previous = lastLocaleRef.current;
		lastLocaleRef.current = preferredLocale;
		if (previous !== undefined && voice.isConnected) {
			void (async () => {
				await voice.disconnect();
				await activateVoice();
			})();
		}
	}, [preferredLocale, voice, activateVoice]);

	const deactivateVoice = useCallback(() => {
		void voice.disconnect();
	}, [voice]);

	return useMemo<IAstedVoiceController>(
		() => ({
			providerId: "openai-realtime",
			providerLabel: "OpenAI Realtime",
			capabilities: {
				pageContextUpdate: true,
				toolCalling: true,
				voiceSelection: true,
				speechRateControl: true,
				realTimeTranscription: true,
			},
			available,
			unavailableReason,
			voiceState: voice.voiceState,
			audioLevel: voice.audioLevel,
			isConnected: voice.isConnected,
			activateVoice,
			deactivateVoice,
			messages: voice.messages,
			clearMessages: voice.clearMessages,
			setSpeechRate: voice.setSpeechRate,
			updatePageContext: (text: string) =>
				voice.updateSession({ pageContext: text }),
			prewarmSession,
			cancelPrewarm: cancelPrewarmSession,
			pendingConfirmation: null,
		}),
		[
			available,
			unavailableReason,
			voice.voiceState,
			voice.audioLevel,
			voice.isConnected,
			activateVoice,
			deactivateVoice,
			voice.messages,
			voice.clearMessages,
			voice.setSpeechRate,
			voice.updateSession,
			prewarmSession,
			cancelPrewarmSession,
		],
	);
}
