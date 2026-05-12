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

import { useAction } from "convex/react";
import { useRouter } from "@workspace/routing";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
	useRealtimeVoice,
	type IAstedVoiceController,
	type RealtimeToolResult,
} from "@workspace/iasted";
import { api } from "@convex/_generated/api";
import { useOrg } from "@workspace/agent-features/shell";

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

	const [available, setAvailable] = useState(true);
	const [unavailableReason, setUnavailableReason] = useState<string | undefined>();
	const hasCheckedRef = useRef(false);

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
				case "draft_correspondence_intent":
				case "generate_document_intent":
				case "escalation_intent":
				case "user_management_intent":
					// Ces intents sont informatifs — l'utilisateur doit finaliser dans l'UI.
					// On pourrait ouvrir un panneau de confirmation ici si nécessaire.
					break;
				default:
					// Tool UI non reconnu — silencieux, le modèle a déjà la confirmation textuelle.
					break;
			}
		},
		[router],
	);

	const voice = useRealtimeVoice({
		onToolCall: useCallback(
			async (name: string, args: Record<string, unknown>): Promise<RealtimeToolResult> => {
				// Délégation au backend pour re-vérifier les permissions + exécuter
				const result = (await executeTool({
					toolName: name,
					toolArgs: args,
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
			toast.error(`iAsted : ${error.message}`);
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
			// Déjà actif — déconnecte (toggle)
			void voice.disconnect();
			return;
		}

		try {
			const session = await createToken({
				surface: "agent",
				orgId: activeOrgId ?? undefined,
			});
			if (!session.available || !session.ephemeralKey) {
				const reason = session.error ?? "UNKNOWN";
				setAvailable(false);
				setUnavailableReason(reason);
				hasCheckedRef.current = true;
				toast.warning(
					reason === "NOT_CONFIGURED"
						? "Mode vocal indisponible — clé OpenAI non configurée."
						: `Mode vocal indisponible (${reason}).`,
				);
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
			toast.success("iAsted vous écoute");
		} catch (error) {
			const message = error instanceof Error ? error.message : "Erreur inconnue";
			if (message.startsWith("RATE_LIMITED:")) {
				toast.warning(message.replace("RATE_LIMITED:", ""));
			} else if (message === "INSUFFICIENT_PERMISSIONS") {
				toast.warning("Vous n'avez pas la permission d'utiliser le mode vocal.");
			} else {
				toast.error(`Échec de connexion : ${message}`);
			}
		}
	}, [available, unavailableReason, voice, createToken, activeOrgId]);

	const deactivateVoice = useCallback(() => {
		void voice.disconnect();
	}, [voice]);

	return useMemo<IAstedVoiceController>(
		() => ({
			available,
			unavailableReason,
			voiceState: voice.voiceState,
			audioLevel: voice.audioLevel,
			isConnected: voice.isConnected,
			activateVoice,
			deactivateVoice,
		}),
		[
			available,
			unavailableReason,
			voice.voiceState,
			voice.audioLevel,
			voice.isConnected,
			activateVoice,
			deactivateVoice,
		],
	);
}
