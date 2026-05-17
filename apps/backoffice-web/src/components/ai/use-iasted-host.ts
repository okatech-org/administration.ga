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

import { useAction } from "convex/react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
	useRealtimeVoice,
	type IAstedVoiceController,
	type RealtimeToolResult,
} from "@workspace/iasted";
import { pageContextStore } from "@workspace/agent-features/stores";
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

	const [available, setAvailable] = useState(true);
	const [unavailableReason, setUnavailableReason] = useState<string | undefined>();
	const hasCheckedRef = useRef(false);

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
					// Bascule sur l'onglet iAppel pour afficher la modale active call.
					window.dispatchEvent(
						new CustomEvent("iasted:open", { detail: { tab: "icall" } }),
					);
					break;
				}
				case "open_meeting_prejoin": {
					// Bascule sur l'onglet iRéunion ET transporte le meetingId pour
					// que BackofficeMeetingTab puisse auto-join (in-call direct).
					// Le payload voyage dans le detail de l'event `iasted:open` pour
					// éviter une race entre l'ouverture du tab et la lecture du meetingId
					// (le tab n'est monté qu'à l'activation — un event séparé serait perdu).
					const meetingId = uiAction.payload?.meetingId as string | undefined;
					window.dispatchEvent(
						new CustomEvent("iasted:open", {
							detail: { tab: "imeeting", meetingId },
						}),
					);
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
			},
			[recordSessionEnd],
		),
		onToolCall: useCallback(
			async (name: string, args: Record<string, unknown>): Promise<RealtimeToolResult> => {
				const result = (await executeTool({
					toolName: name,
					toolArgs: args,
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
	});

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
			const session = await createToken({
				surface: "backoffice",
				orgId: orgId as any,
			});
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
	}, [available, unavailableReason, voice, createToken, orgId]);

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
		],
	);
}
