/**
 * useIAstedHost — Orchestrateur du mode vocal iAsted pour diplomate.ga (agent-web).
 *
 * Construit le `IAstedVoiceController` injecté dans `<AppShell voiceController>`,
 * qui pilote la variante 3D du `<CircleMenu>` et le maintien long pour
 * activer la conversation vocale OpenAI Realtime.
 *
 * Le hook combine :
 *   - `useAction(api.ai.realtimeToken.create)` pour récupérer un token éphémère
 *   - `useAction(api.ai.realtimeToolExecutor.executeRealtimeTool)` pour le dispatch
 *     des tools métier côté serveur
 *   - `useRealtimeVoice` du package iasted pour la connexion WebRTC
 *
 * Tools UI dispatchés localement : `navigate_to_module` (router.push),
 * `control_ui` (theme/speech-rate), `open_chat` / `close_chat` (event bus),
 * `stop_conversation` (deactivate).
 */

"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { useRouter } from "@workspace/routing";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
	captureCameraAsBase64,
	captureScreenAsBase64,
	formatPageContextForVoice,
	getDeviceLabel,
	getOrCreateDeviceId,
	useDeviceHandoffListener,
	useRealtimeVoice,
	useShadowObserver,
	type IAstedVoiceController,
	type RealtimeToolResult,
} from "@workspace/iasted";
import { api } from "@convex/_generated/api";
import { useOrg } from "@workspace/agent-features/shell";
import { pageContextStore, callStore } from "@workspace/agent-features/stores";

// Map module code → route Next.js dans agent-web
const MODULE_ROUTES: Record<string, string> = {
	correspondence: "/diplomatic-affairs/correspondance",
	diplomatic_affairs: "/diplomatic-affairs",
	consular_affairs: "/consular-affairs",
	calendar: "/calendar",
	documents: "/documents",
	messaging: "/icom?tab=ichat",
	team: "/team",
	settings: "/settings",
};

export function useIAstedHost(): IAstedVoiceController {
	const router = useRouter();
	const { activeOrgId } = useOrg();
	// Cast `api as any` : le codegen Convex (`convex/_generated/api.d.ts`)
	// ne reflète pas encore les actions `realtimeToken` / `realtimeToolExecutor`
	// tant que `bunx convex dev` n'a pas été exécuté avec un deployment actif.
	// À runtime, Convex résout par nom — l'appel fonctionnera dès que les
	// fonctions seront pushées. En attendant, l'erreur est interceptée par le
	// catch d'`activateVoice` qui passe le bouton en mode dégradé.
	const createToken = useAction((api as any).ai.realtimeToken.create);
	const executeTool = useAction((api as any).ai.realtimeToolExecutor.executeRealtimeTool);
	const recordSessionEnd = useAction(
		(api as any).ai.realtimeSessions.recordSessionEnd,
	);
	// Sprint 2 — E1 : flip du flag d'onboarding après 1ʳᵉ session vocale.
	const markOnboarded = useMutation(
		(api as any).ai.voicePreferences.markVoiceOnboarded,
	);
	// Sprint 3 — A1 : écriture d'un context de fin de session pour personnaliser
	// la salutation lors de la prochaine session vocale.
	const writeSessionContext = useMutation(
		(api as any).ai.iastedMemories.writeSessionContext,
	);
	// Sprint 6 — C1 : analyse d'image via OpenAI Vision (tool capture_screen_region).
	const analyzeImage = useAction((api as any).ai.vision.describeImage);
	// Sprint 7 — persistance vocal ↔ texte (upsert messages dans iastedConversations).
	const appendConvMessage = useMutation(
		(api as any).ai.iastedConversations.appendMessage,
	);
	// Sprint 10 — A4 : presence multi-device.
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
				state: "idle" | "active" | "handoff_pending" | "handoff_received";
				peerDeviceId?: string;
		  }>
		| undefined;

	const [available, setAvailable] = useState(true);
	const [unavailableReason, setUnavailableReason] = useState<string | undefined>();
	const hasCheckedRef = useRef(false);

	// Préférences vocales (locale notamment). Lecture passive — quand
	// l'utilisateur change la langue dans Réglages, on force une reconnexion
	// pour appliquer le nouveau bloc « LANGUE DE LA SESSION » + Whisper.
	const voicePrefs = useQuery((api as any).ai.voicePreferences.getMyVoicePreferences, {});
	const preferredLocale = voicePrefs?.preferredLocale as string | undefined;

	// Dispatch des UI actions retournées par les tools serveur
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
					window.dispatchEvent(new CustomEvent("iasted:open", { detail: { tab: "ichat" } }));
					break;
				case "close_chat":
					window.dispatchEvent(new CustomEvent("iasted:close"));
					break;
				case "control_ui": {
					const action = uiAction.payload?.action as string | undefined;
					if (action === "set_theme_dark") {
						document.documentElement.classList.add("dark");
					} else if (action === "set_theme_light") {
						document.documentElement.classList.remove("dark");
					} else if (action === "toggle_theme") {
						document.documentElement.classList.toggle("dark");
					}
					// set_speech_rate : géré par le hook via voice.setSpeechRate (cf. plus bas)
					break;
				}
				case "execute_page_action": {
					// Action déclarée par la page courante via `usePageContext` +
					// `useRegisterPageAction`. On exécute le handler enregistré
					// dans `pageContextStore`. Le modèle est supposé avoir obtenu
					// l'accord verbal de l'utilisateur pour les actions marquées
					// `requiresConfirmation` (cf. prompt iAsted).
					const actionId = uiAction.payload?.actionId as string | undefined;
					const params = uiAction.payload?.params as
						| Record<string, unknown>
						| undefined;
					if (!actionId) {
						toast.warning("Action vocale sans identifiant.");
						return;
					}
					const handler = pageContextStore.getActionHandler(actionId);
					if (!handler) {
						toast.warning(`Action « ${actionId} » introuvable sur la page courante.`);
						return;
					}
					// Fire-and-forget : on n'attend pas la résolution pour ne pas bloquer
					// le DataChannel ; les erreurs sont signalées par un toast.
					void handler(params).catch((err) => {
						const message = err instanceof Error ? err.message : "Erreur";
						toast.error(`Action « ${actionId} » : ${message}`);
					});
					break;
				}
				case "open_app_menu": {
					window.dispatchEvent(
						new CustomEvent("iasted:fan-toggle", { detail: { open: true } }),
					);
					break;
				}
				case "open_iasted_tab": {
					const tab = uiAction.payload?.tab as string | undefined;
					window.dispatchEvent(
						new CustomEvent("iasted:open", { detail: { tab: tab ?? "ichat" } }),
					);
					break;
				}
				case "livekit_control": {
					window.dispatchEvent(
						new CustomEvent("iasted:livekit-control", {
							detail: uiAction.payload,
						}),
					);
					break;
				}
				case "close_active_call_window": {
					// Bug 7 (Ronde 2) : fermeture explicite côté client après
					// hangup/cancel/decline vocal. Voir le détail dans
					// `apps/backoffice-web/src/components/ai/use-iasted-host.ts`.
					window.dispatchEvent(
						new CustomEvent("iasted:close-call-window", {
							detail: uiAction.payload,
						}),
					);
					break;
				}
				case "request_screen_capture": {
					// Sprint 6 — C1 : capture d'écran via getDisplayMedia natif,
					// envoi à OpenAI Vision via action Convex, injection du résultat
					// dans la session vocale pour réaction naturelle de l'agent.
					const focusHint = (uiAction.payload?.focusHint as string) ?? "";
					const detail =
						uiAction.payload?.detail === "high" ? "high" : "low";
					void (async () => {
						try {
							const imageBase64 = await captureScreenAsBase64();
							if (!imageBase64) {
								voice.sendText(
									"[Capture d'écran annulée par l'utilisateur ou non supportée par ce navigateur.]",
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
									`[Description de l'écran : ${result.description}]`,
								);
							} else {
								voice.sendText(
									`[Échec analyse écran : ${result.error ?? "erreur inconnue"}]`,
								);
							}
						} catch (err) {
							console.warn("[iAsted] screen capture failed", err);
							voice.sendText(
								"[Capture d'écran impossible. Réessayez ou décrivez-moi vous-même ce que vous voyez.]",
							);
						}
					})();
					break;
				}
				case "editor_insert_text": {
					// Sprint 9 — Co-édition document live.
					const text = (uiAction.payload?.text as string) ?? "";
					const editor = pageContextStore.getDocumentEditor();
					if (!editor) {
						voice.sendText(
							"[Aucun éditeur de document actif — ouvrez un document pour utiliser ce tool.]",
						);
					} else if (text) {
						try {
							editor.insertText(text);
						} catch (err) {
							console.warn("[iAsted] editor.insertText failed", err);
							voice.sendText("[Insertion échouée — éditeur non réactif.]");
						}
					}
					break;
				}
				case "editor_append_paragraph": {
					const text = (uiAction.payload?.text as string) ?? "";
					const editor = pageContextStore.getDocumentEditor();
					if (!editor) {
						voice.sendText("[Aucun éditeur de document actif.]");
					} else if (text) {
						try {
							editor.appendParagraph(text);
						} catch (err) {
							console.warn("[iAsted] editor.appendParagraph failed", err);
						}
					}
					break;
				}
				case "editor_replace_selection": {
					const text = (uiAction.payload?.text as string) ?? "";
					const editor = pageContextStore.getDocumentEditor();
					if (!editor) {
						voice.sendText(
							"[Aucun éditeur actif — impossible de remplacer la sélection.]",
						);
					} else if (text) {
						try {
							editor.replaceSelection(text);
						} catch (err) {
							console.warn(
								"[iAsted] editor.replaceSelection failed",
								err,
							);
						}
					}
					break;
				}
				case "editor_read_state": {
					const editor = pageContextStore.getDocumentEditor();
					if (!editor) {
						voice.sendText("[Aucun éditeur de document actif à lire.]");
					} else {
						try {
							const st = editor.getState();
							const title = st.title ? `Titre : ${st.title}\n` : "";
							const selection = st.selectionText
								? `Sélection : ${st.selectionText.slice(0, 500)}\n`
								: "";
							const body = st.plainText.slice(0, 3000);
							const more =
								st.plainText.length > 3000 ? "\n[…document tronqué]" : "";
							voice.sendText(
								`[État de l'éditeur :\n${title}${selection}Contenu :\n${body}${more}]`,
							);
						} catch (err) {
							console.warn("[iAsted] editor.getState failed", err);
							voice.sendText("[Lecture de l'éditeur impossible.]");
						}
					}
					break;
				}
				case "request_device_handoff": {
					// Sprint 10 — A4 : transfère la session vers un autre device.
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
								`[Handoff échoué : ${err?.message ?? "erreur"}]`,
							);
						});
					break;
				}
				case "request_camera_capture": {
					// Sprint 6.5 — C3 : capture caméra → vision API → injection.
					const focusHint = (uiAction.payload?.focusHint as string) ?? "";
					const detail =
						uiAction.payload?.detail === "low" ? "low" : "high";
					void (async () => {
						try {
							const imageBase64 = await captureCameraAsBase64();
							if (!imageBase64) {
								voice.sendText(
									"[Capture caméra impossible — permission refusée ou pas de caméra disponible.]",
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
									`[Description de l'image caméra : ${result.description}]`,
								);
							} else {
								voice.sendText(
									`[Échec analyse caméra : ${result.error ?? "erreur inconnue"}]`,
								);
							}
						} catch (err) {
							console.warn("[iAsted] camera capture failed", err);
							voice.sendText(
								"[Caméra inaccessible. Vérifiez les permissions et réessayez.]",
							);
						}
					})();
					break;
				}
				case "open_active_call": {
					// Bug 9 (Ronde 2) : déclenche la MÊME fenêtre que le clic
					// manuel sur <CallButton>. Voir le détail dans
					// `apps/backoffice-web/src/components/ai/use-iasted-host.ts`.
					// Avant ce fix, agent-web n'avait AUCUN case et le uiAction
					// tombait dans le default silencieux.
					const meetingId = uiAction.payload?.meetingId as string | undefined;
					const targetUserId = uiAction.payload?.targetUserId as
						| string
						| undefined;
					const mediaType =
						(uiAction.payload?.mediaType as "audio" | "video" | undefined) ??
						"video";
					if (meetingId) {
						callStore.openOutgoingCall({
							meetingId: meetingId as any,
							participantUserId: (targetUserId ?? "") as any,
							mediaType,
							startedAt: Date.now(),
						});
					}
					break;
				}
				case "open_meeting_prejoin": {
					// Bug 5 fix (unification vocal/manuel) : on n'envoie PLUS
					// l'utilisateur vers une page séparée `/icom?tab=imeeting`.
					// À la place, on ouvre la fenêtre flottante iAsted sur le
					// tab imeeting avec auto-join. Résultat : MÊME UI que le
					// clic manuel "Démarrer" dans le wizard "Nouvelle réunion".
					const meetingId = uiAction.payload?.meetingId as string | undefined;
					if (meetingId) {
						window.dispatchEvent(
							new CustomEvent("iasted:open", {
								detail: { tab: "imeeting", meetingId },
							}),
						);
					}
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
						/* ignore */
					}
					toast.info(
						enabled
							? "Mode accessibilité activé. La prochaine session utilisera ce mode."
							: "Mode accessibilité désactivé.",
					);
					break;
				}
				case "form_control": {
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
				case "noop":
					break;
				case "draft_correspondence_intent":
				case "generate_document_intent":
				case "escalation_intent":
				case "user_management_intent":
					// Ces intents sont informatifs — l'utilisateur doit finaliser dans l'UI.
					// On pourrait ouvrir un panneau de confirmation ici si nécessaire.
					break;
				case "iasted_document_created": {
					// iAsted vient de générer un document (PDF officiel) et l'a archivé
					// dans iDocument › « iAsted Documents ». Émet un event écouté par
					// la fenêtre vocale pour afficher la carte d'action.
					window.dispatchEvent(
						new CustomEvent("iasted:document-created", { detail: uiAction.payload }),
					);
					break;
				}
				default:
					// Tool UI non reconnu — silencieux, le modèle a déjà la confirmation textuelle.
					break;
			}
		},
		[router],
	);

	// Lecture du mode accessibilité — local storage côté client.
	const accessibilityMode =
		typeof window !== "undefined" &&
		window.localStorage?.getItem("iasted.accessibility_mode") === "true";

	const voice = useRealtimeVoice({
		surface: "agent",
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
				// Sprint 2 — E1 : marque l'onboarding terminé si session utilisée.
				if (metrics.durationSeconds > 5 || metrics.toolCallCount > 0) {
					try {
						await markOnboarded();
					} catch (err) {
						console.warn("[iAsted] markOnboarded failed", err);
					}
				}
				// Sprint 3 — A1 : trace minimaliste de la session pour la
				// salutation contextualisée du prochain login.
				if (metrics.durationSeconds > 30 || metrics.toolCallCount > 0) {
					try {
						const dateLabel = new Date().toLocaleString("fr-FR", {
							dateStyle: "short",
							timeStyle: "short",
						});
						await writeSessionContext({
							content: `Dernière session vocale le ${dateLabel} (${metrics.toolCallCount} action${metrics.toolCallCount > 1 ? "s" : ""}, ${Math.round(metrics.durationSeconds)}s).`,
						});
					} catch (err) {
						console.warn("[iAsted] writeSessionContext failed", err);
					}
				}
			},
			[recordSessionEnd, markOnboarded, writeSessionContext],
		),
		onToolCall: useCallback(
			async (name: string, args: Record<string, unknown>): Promise<RealtimeToolResult> => {
				// Sprint 5.5 wiring — Auto-injection du voiceprint pour les
				// tools destructifs (suspend_user / assign_role_to_user).
				// Backend skip si pas enrollé ; sinon exige verification.
				const DESTRUCTIVE_TOOLS = new Set([
					"suspend_user",
					"assign_role_to_user",
				]);
				let finalArgs = args;
				if (DESTRUCTIVE_TOOLS.has(name) && !args.voicePrintB64) {
					try {
						const vp = await voice.captureVoicePrint();
						if (vp) finalArgs = { ...args, voicePrintB64: vp };
					} catch (err) {
						console.warn("[iAsted] voiceprint capture failed", err);
					}
				}
				// Délégation au backend pour re-vérifier les permissions + exécuter
				const result = (await executeTool({
					toolName: name,
					toolArgs: finalArgs,
					orgId: activeOrgId ?? undefined,
					surface: "agent",
				})) as RealtimeToolResult;

				// Dispatch local des UI actions retournées
				if (result.uiAction) {
					dispatchUiAction(result.uiAction);
					// Gestion spéciale stop_conversation : le hook intercepte déjà,
					// mais on peut renforcer côté client.
					if (result.uiAction.type === "stop_conversation") {
						setTimeout(() => voice.disconnect(), 100);
					}
					// Gestion spéciale change_voice : on ne reconnecte pas pour cette
					// itération (OpenAI permet de changer via session.update mais le
					// flux est complexe — on documente comme limitation connue).
					if (result.uiAction.type === "control_ui") {
						const action = result.uiAction.payload?.action as string | undefined;
						const value = result.uiAction.payload?.value as string | undefined;
						if (action === "set_speech_rate" && value) {
							const rate = parseFloat(value);
							if (!Number.isNaN(rate)) voice.setSpeechRate(rate);
						}
					}
				}

				return result;
			},
			// `voice` est référencé pour pouvoir appeler `disconnect`/`setSpeechRate` ;
			// les méthodes sont stables grâce à `useCallback` interne du hook.
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[executeTool, activeOrgId, dispatchUiAction],
		),
		onError: useCallback((error: Error) => {
			// Loggué seulement — `activateVoice` re-catch et affiche un toast
			// contextuel (gestion micro, rate limit, etc.). Éviter le double toast.
			console.warn("[iAsted] voice error:", error.message);
		}, []),
		// Sprint 5 — G3 : toast info quand le réseau coupe/revient pendant
		// une session vocale active.
		onNetworkStatusChange: useCallback((online: boolean) => {
			if (online) {
				toast.success("Connexion réseau rétablie. iAsted reprend.", {
					id: "iasted-network",
					duration: 3000,
				});
			} else {
				toast.warning(
					"Connexion réseau perdue. iAsted continue mais peut couper.",
					{ id: "iasted-network", duration: 6000 },
				);
			}
		}, []),
	});

	// Sprint 10 — A4 : presence multi-device.
	const deviceIdRef = useRef<string>("");
	useEffect(() => {
		if (typeof window === "undefined") return;
		deviceIdRef.current = getOrCreateDeviceId();
		const label = getDeviceLabel();
		void registerDevice({
			deviceId: deviceIdRef.current,
			label,
			surface: "agent",
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

	// Sprint 8 wiring — F4 : mode shadow (agent-web).
	useShadowObserver({
		enabled: voice.isConnected,
		onObservation: (obs) => {
			const human =
				obs.pattern === "focus_stalled"
					? `[Observation : utilisateur en pause sur « ${obs.target ?? "?"} » depuis ${Math.round((obs.durationMs ?? 0) / 1000)}s.]`
					: obs.pattern === "repeated_click"
						? `[Observation : ${obs.count ?? 0} clics répétés sur « ${obs.target ?? "?"} ».]`
						: `[Observation : navigation prolongée.]`;
			voice.sendText(human);
		},
	});

	// Sprint 10 wiring — A4 : détection handoff reçu (agent-web).
	useDeviceHandoffListener({
		devices: myDevices ?? null,
		thisDeviceId: deviceIdRef.current,
		onHandoffReceived: async (sourceLabel, _sourceDeviceId) => {
			toast.info(`Session iAsted transférée depuis ${sourceLabel}.`, {
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

	// Sprint 7 — Persistance vocal ↔ texte : observe la liste de messages
	// vocaux et upsert chaque nouveau message dans iastedConversations.
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
				surface: "agent",
				orgId: activeOrgId ?? undefined,
			}).catch((err) => {
				console.warn("[iAsted] appendConvMessage failed", err);
			});
		}
	}, [voice.messages, appendConvMessage, activeOrgId]);

	// L'observation du `pageContextStore` et le push dynamique vers la
	// session vocale sont désormais centralisés dans `IAstedVoiceProvider`
	// (agnostique du provider). Ici, on expose simplement la méthode
	// canonique `updatePageContext` via le controller retourné — c'est le
	// provider qui décide quand l'appeler en fonction des changements du
	// store et de la capability du provider courant.

	// ── Pré-warm session (Phase 4 — UX latence) ────────────────
	// Cache d'une session pré-fetchée au hover prolongé. Voir backoffice-web/
	// use-iasted-host.ts pour la stratégie détaillée. Token éphémère expire
	// à ~60 s, on jette le cache après 50 s pour garder une marge de connect().
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
					? "Mode vocal indisponible — clé OpenAI non configurée."
					: "Mode vocal indisponible.",
			);
			return;
		}
		if (voice.isConnected || voice.isConnecting) {
			// Déjà actif — déconnecte (toggle)
			void voice.disconnect();
			return;
		}

		const connectingToast = toast.loading("Connexion à iAsted…");

		try {
			// Optimisation latence (Phase 4) : utiliser le cache de pré-fetch
			// si dispo, sinon attendre un éventuel pré-fetch en vol.
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
						surface: "agent",
						orgId: activeOrgId ?? undefined,
						locale: preferredLocale,
					});
				}
			}
			if (!session.available || !session.ephemeralKey) {
				const reason = session.error ?? "UNKNOWN";
				setAvailable(false);
				setUnavailableReason(reason);
				hasCheckedRef.current = true;
				toast.warning(
					reason === "NOT_CONFIGURED"
						? "Mode vocal indisponible — clé OpenAI non configurée."
						: `Mode vocal indisponible (${reason}).`,
					{ id: connectingToast },
				);
				return;
			}
			// Pré-charge le contexte page+shell courant avant l'ouverture du
			// DataChannel : la première `session.update` envoyée à l'ouverture
			// du DC inclura déjà ce bloc, évitant une fenêtre sans contexte.
			voice.updateSession({
				pageContext: formatPageContextForVoice({
					page: pageContextStore.getSnapshot(),
					shell: pageContextStore.getShellSnapshot(),
				}),
			});
			await voice.connect({
				ephemeralKey: session.ephemeralKey,
				sessionId: session.sessionId ?? "",
				model: session.model,
				systemPrompt: session.systemPrompt ?? "",
				tools: session.tools ?? [],
				voice: session.voice ?? "ash",
				expiresAt: session.expiresAt,
			});
			toast.success("iAsted vous écoute", { id: connectingToast });
			// Sprint 5 — G1 : alerte quota OpenAI mensuel.
			const ql = (session as any).quotaLevel as
				| "approaching"
				| "warning"
				| "exceeded"
				| null
				| undefined;
			if (ql === "exceeded") {
				toast.error(
					"Quota OpenAI dépassé pour ce mois — sessions vocales en mode dégradé.",
					{ duration: 8000 },
				);
			} else if (ql === "warning") {
				toast.warning(
					"Quota OpenAI à 90 % du budget mensuel.",
					{ duration: 6000 },
				);
			} else if (ql === "approaching") {
				toast.info(
					"Quota OpenAI à 70 % du budget mensuel.",
					{ duration: 4000 },
				);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : "Erreur inconnue";
			if (message.startsWith("RATE_LIMITED:")) {
				toast.warning(message.replace("RATE_LIMITED:", ""), { id: connectingToast });
			} else if (message === "INSUFFICIENT_PERMISSIONS") {
				toast.warning("Vous n'avez pas la permission d'utiliser le mode vocal.", { id: connectingToast });
			} else if (message.includes("Permission denied") || message.includes("NotAllowedError")) {
				toast.error(
					"Accès microphone refusé. Autorisez l'accès au microphone dans les paramètres du navigateur.",
					{ id: connectingToast, duration: 8000 },
				);
			} else {
				toast.error(`Échec de connexion : ${message}`, { id: connectingToast });
			}
		}
	}, [available, unavailableReason, voice, createToken, activeOrgId, preferredLocale, isPrefetchUsable]);

	// prewarmSession / cancelPrewarm exposés au CircleMenu (Phase 4)
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
				surface: "agent",
				orgId: activeOrgId ?? undefined,
				locale: preferredLocale,
			})
				.then((session) => {
					prefetchedSessionRef.current = { session, fetchedAt: Date.now() };
				})
				.catch(() => {
					/* échec silencieux du pré-fetch */
				})
				.finally(() => {
					if (prefetchInFlightRef.current === inflight) {
						prefetchInFlightRef.current = null;
					}
				});
			prefetchInFlightRef.current = inflight;
		}, 250); // Bug 11 Ronde 2 : 500 → 250 ms (intention forte plus précoce, surcoût $ accepté)
	}, [available, voice, createToken, activeOrgId, preferredLocale, isPrefetchUsable]);

	const cancelPrewarmSession = useCallback(() => {
		if (prefetchTimerRef.current) {
			clearTimeout(prefetchTimerRef.current);
			prefetchTimerRef.current = null;
		}
		voice.cancelPrewarm();
	}, [voice]);

	// Reconnexion automatique sur changement de locale en cours de session.
	// La voix Whisper et le greeting d'ouverture sont scellés à la session,
	// donc un session.update à chaud ne suffit pas — on ferme et rouvre.
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
			// Confirmation par la voix (décision UX) : pas de carte modale.
			// L'IA demande oralement, l'utilisateur répond, l'IA exécute.
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
