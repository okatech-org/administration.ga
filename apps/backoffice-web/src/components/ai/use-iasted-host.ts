/**
 * useIAstedHost (backoffice) — Orchestrateur du mode vocal iAsted pour
 * admin.consulat.ga.
 *
 * Équivalent du hook agent-web, avec :
 *   - surface = "backoffice"
 *   - garde-fou admin/superadmin côté backend (`realtimeToken.create` re-check)
 *   - mappage des modules métier vers les routes backoffice
 *
 * Le bouton 3D du `<CircleMenu>` n'est rendu que si `BackofficeIAstedWindow`
 * est monté (cf. `backoffice-layout.tsx`). On suppose que cette window n'est
 * accessible qu'aux rôles autorisés (citoyens redirigés en amont).
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
import { pageContextStore, callStore, useCallStore } from "@workspace/agent-features/stores";
import { api } from "@convex/_generated/api";

// Map module code → route Next.js dans backoffice-web
const MODULE_ROUTES: Record<string, string> = {
	correspondence: "/icorrespondance",
	diplomatic_affairs: "/affaires-diplomatiques",
	consular_affairs: "/affaires-consulaires",
	calendar: "/iagenda",
	documents: "/idocument",
	messaging: "/icom?tab=ichat",
	team: "/profiles",
	users: "/users",
	orgs: "/orgs",
	settings: "/settings",
	monitoring: "/monitoring",
	audit_logs: "/audit-logs",
};

export interface UseIAstedHostOptions {
	orgId?: string;
}

export function useIAstedHost({ orgId }: UseIAstedHostOptions = {}): IAstedVoiceController {
	const router = useRouter();
	// Cast `api as any` : voir la note dans agent-web/.../use-iasted-host.ts
	// — codegen Convex pas encore régénéré pour ces actions, l'appel runtime
	// fonctionnera dès `bunx convex dev` actif.
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
	// Sprint 6 — C1 : analyse d'image via OpenAI Vision pour le tool
	// `capture_screen_region`. Action Node — exécution serveur.
	const analyzeImage = useAction((api as any).ai.vision.describeImage);
	// Sprint 7 — persistance vocal ↔ texte : chaque tour est upserté
	// dans `iastedConversations` pour permettre reprise dans iChat et
	// la continuité < 1 h dans la prochaine session vocale.
	const appendConvMessage = useMutation(
		(api as any).ai.iastedConversations.appendMessage,
	);
	// Sprint 10 — A4 : presence multi-device (register/heartbeat/handoff).
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
					break;
				}
				// ─── UI actions de la Phase 1 (Mode God — orchestration) ───
				case "open_active_call": {
					// Bug 9 (Ronde 2) : déclenche la MÊME fenêtre que le clic
					// manuel sur <CallButton>. Le slice global du store est
					// consommé par <GlobalOutgoingCallWindow> (monté dans le
					// backoffice-layout) qui rend <OutgoingCallDialog>.
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
					// Bug 5 fix v2 (Ronde 3) : déclenche le `<FloatingMeetingWindow>`
					// monté dans backoffice-layout pour qu'il affiche la réunion
					// en MODAL PLEIN ÉCRAN (même UI que côté agent-web :
					// MeetingStageView avec contrôles Micro/Caméra/Partager/etc.).
					// L'event `iasted:join-meeting` est écouté par
					// FloatingMeetingWindow qui appelle directement `joinMeeting()`
					// du `activeMeetingStore`. Plus de tab compact iAsted pour
					// les réunions actives.
					const meetingId = uiAction.payload?.meetingId as string | undefined;
					if (meetingId) {
						window.dispatchEvent(
							new CustomEvent("iasted:join-meeting", {
								detail: { meetingId },
							}),
						);
					}
					break;
				}
				case "open_conversation": {
					// Ouvre l'onglet iChat avec le contact présélectionné.
					const targetUserId = uiAction.payload?.targetUserId as string | undefined;
					if (targetUserId) {
						window.dispatchEvent(
							new CustomEvent("iasted:select-contact", {
								detail: { userId: targetUserId },
							}),
						);
					}
					window.dispatchEvent(
						new CustomEvent("iasted:open", { detail: { tab: "ichat" } }),
					);
					break;
				}
				case "open_app_menu": {
					// Ouvre l'éventail CircleMenu (consommé par CircleMenu via useEffect listener).
					window.dispatchEvent(
						new CustomEvent("iasted:fan-toggle", { detail: { open: true } }),
					);
					break;
				}
				case "iasted_document_created": {
					// iAsted vient de générer un document (PDF officiel) et l'a archivé
					// dans iDocument › « iAsted Documents ». La fenêtre vocale écoute
					// cet event pour afficher une carte avec actions (Télécharger,
					// Ouvrir dans iDocument, Envoyer via iCorrespondance).
					window.dispatchEvent(
						new CustomEvent("iasted:document-created", { detail: uiAction.payload }),
					);
					break;
				}
				case "open_iasted_tab": {
					// Ouvre la fenêtre flottante sur un onglet précis.
					const tab = uiAction.payload?.tab as string | undefined;
					window.dispatchEvent(
						new CustomEvent("iasted:open", { detail: { tab: tab ?? "ichat" } }),
					);
					break;
				}
				case "livekit_control": {
					// Pilote le LocalParticipant LiveKit via le bridge monté
					// dans `<LiveKitRoom>` (cf. IAstedLiveKitBridge).
					window.dispatchEvent(
						new CustomEvent("iasted:livekit-control", {
							detail: uiAction.payload,
						}),
					);
					break;
				}
				case "close_active_call_window": {
					// Bug 7 (Ronde 2) : signal explicite pour fermer toute fenêtre
					// d'appel/réunion active après un hangup/cancel/decline vocal.
					// Les composants concernés (DirectCallView wrapper, MeetingStageView
					// wrapper, IAstedCallTab, floating-meeting-window, global-call-alert
					// Dialog, call-button Dialog) écoutent `iasted:close-call-window`.
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
					// dans la session vocale pour que l'agent réagisse naturellement.
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
					// Sprint 9 — Co-édition : pousse du texte au curseur de
					// l'éditeur actif (TipTap ou équivalent).
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
						voice.sendText(
							"[Aucun éditeur de document actif.]",
						);
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
						voice.sendText(
							"[Aucun éditeur de document actif à lire.]",
						);
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
							// Source : ferme la session vocale après un court délai
							// pour laisser l'annonce (« Je vous retrouve sur X »)
							// se terminer.
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
					// Même architecture que C1, helper `captureCameraAsBase64`.
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
				case "set_accessibility_mode": {
					const enabled = !!uiAction.payload?.enabled;
					try {
						window.localStorage?.setItem(
							"iasted.accessibility_mode",
							enabled ? "true" : "false",
						);
					} catch {
						/* localStorage indisponible — ignorer */
					}
					toast.info(
						enabled
							? "Mode accessibilité activé. Reconnexion à la session…"
							: "Mode accessibilité désactivé.",
					);
					// La reprise effective demande une re-création du hook ;
					// pour cette itération, la prochaine connexion utilisera le mode.
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
					// Fire-and-forget : le résultat textuel n'est pas remonté au
					// modèle ici (le tool result l'est déjà côté serveur).
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
				default:
					break;
			}
		},
		[router],
	);

	// Lecture du mode accessibilité — local storage côté client.
	// Peut être togglé via le tool `set_accessibility_mode`.
	const accessibilityMode =
		typeof window !== "undefined" &&
		window.localStorage?.getItem("iasted.accessibility_mode") === "true";

	const voice = useRealtimeVoice({
		surface: "backoffice",
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
				// Sprint 2 — E1 : marque l'onboarding terminé si la session a
				// vraiment été utilisée (> 5s ou ≥ 1 tool call). Évite que
				// l'utilisateur rate l'onboarding s'il ouvre/ferme par accident.
				if (metrics.durationSeconds > 5 || metrics.toolCallCount > 0) {
					try {
						await markOnboarded();
					} catch (err) {
						console.warn("[iAsted] markOnboarded failed", err);
					}
				}
				// Sprint 3 — A1 : trace minimaliste de la session pour la
				// salutation contextualisée du prochain login. À enrichir
				// ultérieurement avec un LLM summary basé sur le transcript.
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
				// tools destructifs. Le backend (verifyVoicePrintForDestructive)
				// skip si l'utilisateur n'a pas enrollé d'empreinte ; sinon
				// exige et vérifie. L'extraction prend ~3 s mais ne s'exécute
				// QUE pour `suspend_user` / `assign_role_to_user`.
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
				const result = (await executeTool({
					toolName: name,
					toolArgs: finalArgs,
					orgId: orgId as any,
					surface: "backoffice",
				})) as RealtimeToolResult;

				if (result.uiAction) {
					dispatchUiAction(result.uiAction);
					if (result.uiAction.type === "stop_conversation") {
						setTimeout(() => voice.disconnect(), 100);
					}
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
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[executeTool, orgId, dispatchUiAction],
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
	// Register au mount + heartbeat 30s tant que session active.
	const deviceIdRef = useRef<string>("");
	useEffect(() => {
		if (typeof window === "undefined") return;
		deviceIdRef.current = getOrCreateDeviceId();
		const label = getDeviceLabel();
		// Register initial (idle state) — la session vocale active passe à
		// "active" via heartbeat ci-dessous quand voice.isConnected = true.
		void registerDevice({
			deviceId: deviceIdRef.current,
			label,
			surface: "backoffice",
		}).catch(() => undefined);
	}, [registerDevice]);
	useEffect(() => {
		if (!deviceIdRef.current) return;
		// Heartbeat toutes les 30s tant que session vocale active.
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

	// Sprint 8 wiring — F4 : mode shadow (observe patterns d'interaction
	// uniquement pendant une session vocale active, cooldown 30 s).
	useShadowObserver({
		enabled: voice.isConnected,
		onObservation: (obs) => {
			const human =
				obs.pattern === "focus_stalled"
					? `[Observation : utilisateur en pause sur le champ « ${obs.target ?? "?"} » depuis ${Math.round((obs.durationMs ?? 0) / 1000)}s — peut proposer aide pour remplir.]`
					: obs.pattern === "repeated_click"
						? `[Observation : ${obs.count ?? 0} clics répétés sur « ${obs.target ?? "?"} » — action ne semble pas répondre.]`
						: `[Observation : navigation prolongée sans interaction.]`;
			voice.sendText(human);
		},
	});

	// Sprint 10 wiring — A4 : détection du handoff reçu sur ce device.
	// Quand un autre device demande un handoff vers nous, on démarre la
	// session vocale automatiquement et on confirme via `completeHandoff`.
	useDeviceHandoffListener({
		devices: myDevices ?? null,
		thisDeviceId: deviceIdRef.current,
		onHandoffReceived: async (sourceLabel, _sourceDeviceId) => {
			toast.info(`Session iAsted transférée depuis ${sourceLabel}.`, {
				duration: 4000,
			});
			// Note : `activateVoice` est défini plus bas ; via closure il
			// sera accessible au moment où le callback s'exécute.
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
	// Approche basée sur la longueur (la liste ne fait que croître durant une
	// session, sauf clearMessages). Si la longueur recule (reset), on remet
	// le compteur à 0.
	const lastUpsertedCountRef = useRef(0);
	useEffect(() => {
		const total = voice.messages.length;
		if (total < lastUpsertedCountRef.current) {
			// reset (clearMessages, disconnect/reconnect)
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
				surface: "backoffice",
				orgId: orgId as any,
			}).catch((err) => {
				console.warn("[iAsted] appendConvMessage failed", err);
			});
		}
	}, [voice.messages, appendConvMessage, orgId]);

	// ── Pré-warm session (Phase 4 — UX latence) ────────────────
	// Cache d'une session pré-fetchée au hover prolongé : si l'utilisateur
	// clique, on l'utilise directement (gain ~600–1500 ms sur le boot).
	// Note coût : chaque pré-fetch consomme une session OpenAI (~$0.001).
	// On limite l'impact via :
	//   - Délai de 500 ms avant le pré-fetch (intention forte)
	//   - 1 seul pré-fetch en vol à la fois
	//   - Auto-expiration après 50 s (token éphémère expire à 60 s)
	const prefetchedSessionRef = useRef<{
		session: Awaited<ReturnType<typeof createToken>>;
		fetchedAt: number;
	} | null>(null);
	const prefetchInFlightRef = useRef<Promise<unknown> | null>(null);
	const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const isPrefetchUsable = useCallback(() => {
		const p = prefetchedSessionRef.current;
		if (!p) return null;
		// Le token éphémère OpenAI expire à ~60 s. On garde une marge de 10 s
		// pour le temps de connect() (SDP + DC). Au-delà, on jette le cache.
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
			void voice.disconnect();
			return;
		}

		// Toast "Connexion..." pour feedback immédiat (l'établissement WebRTC
		// + handshake OpenAI peut prendre 1–3s).
		const connectingToast = toast.loading("Connexion à iAsted…");

		try {
			// Optimisation latence (Phase 4) : utiliser la session pré-fetchée
			// si dispo (consommée une seule fois — on la retire du cache).
			let session = isPrefetchUsable();
			if (session) {
				prefetchedSessionRef.current = null;
			} else {
				// Attendre un pré-fetch en cours plutôt que de relancer.
				if (prefetchInFlightRef.current) {
					await prefetchInFlightRef.current.catch(() => undefined);
					session = isPrefetchUsable();
					if (session) prefetchedSessionRef.current = null;
				}
				if (!session) {
					session = await createToken({
						surface: "backoffice",
						orgId: orgId as any,
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
						? "Mode vocal indisponible — clé OpenAI non configurée."
						: reason === "OPENAI_BETA_DISABLED"
						? "Mode vocal indisponible — la Beta OpenAI Realtime est désactivée sur cette clé OpenAI. Migrez le compte vers la GA API dans le dashboard OpenAI."
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
			toast.success("iAsted vous écoute", { id: connectingToast });
			// Sprint 5 — G1 : alerte non bloquante si le quota OpenAI est élevé.
			const ql = (session as any).quotaLevel as
				| "approaching"
				| "warning"
				| "exceeded"
				| null
				| undefined;
			if (ql === "exceeded") {
				toast.error(
					"Quota OpenAI dépassé pour ce mois — sessions vocales en mode dégradé. Contactez un administrateur.",
					{ duration: 8000 },
				);
			} else if (ql === "warning") {
				toast.warning(
					"Quota OpenAI à 90 % du budget mensuel. Modérez l'usage vocal cette semaine.",
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
	}, [available, unavailableReason, voice, createToken, orgId, preferredLocale, isPrefetchUsable]);

	// ── prewarmSession + cancelPrewarm exposés au CircleMenu ───
	const prewarmSession = useCallback(() => {
		if (!available || voice.isConnected || voice.isConnecting) return;
		// 1. Pré-warmer le micro immédiatement (no-op si permission pas granted).
		void voice.prewarmMedia();
		// 2. Programmer le pré-fetch du token après 500 ms (intention forte).
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
				surface: "backoffice",
				orgId: orgId as any,
				locale: preferredLocale,
			})
				.then((session) => {
					prefetchedSessionRef.current = { session, fetchedAt: Date.now() };
				})
				.catch(() => {
					// Échec silencieux du pré-fetch — `activateVoice` retombera
					// sur le flux normal de createToken.
				})
				.finally(() => {
					if (prefetchInFlightRef.current === inflight) {
						prefetchInFlightRef.current = null;
					}
				});
			prefetchInFlightRef.current = inflight;
		}, 250); // Bug 11 Ronde 2 : 500 → 250 ms (intention forte plus précoce, surcoût $ accepté)
	}, [available, voice, createToken, orgId, preferredLocale, isPrefetchUsable]);

	const cancelPrewarmSession = useCallback(() => {
		if (prefetchTimerRef.current) {
			clearTimeout(prefetchTimerRef.current);
			prefetchTimerRef.current = null;
		}
		// Le pré-fetch en vol n'est pas annulable (Convex action), on le laisse
		// finir et son résultat sera mis en cache pour activateVoice. Le cache
		// expire seul après 50 s s'il n'est jamais consommé.
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
		// On ne reconnecte que si une session est déjà active — sinon la
		// nouvelle locale sera prise en compte au prochain `activateVoice`.
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
