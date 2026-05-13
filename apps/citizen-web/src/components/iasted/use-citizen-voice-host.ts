/**
 * useCitizenVoiceHost — Orchestrateur vocal iAsted côté citoyen.
 *
 * Miroir de `apps/agent-web/src/components/iasted/use-iasted-host.ts` avec
 * `surface: "citizen"` :
 *  - récupère un token éphémère via `api.ai.realtimeToken.create`
 *  - connecte `useRealtimeVoice` (WebRTC OpenAI Realtime)
 *  - dispatche les tools UI retournés par le backend (navigation, page actions)
 *  - synchronise le contexte page+shell vers la session (mêmes hooks que l'agent
 *    une fois que les pages citoyen déclareront `usePageContext`)
 *
 * Le citoyen n'a aucun business tool exposé (cf. realtimeTools.ts), donc le
 * dispatch UI couvre l'intégralité des actions possibles.
 */

"use client";

import { useAction } from "convex/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
	formatPageContextForVoice,
	useRealtimeVoice,
	type IAstedVoiceController,
	type RealtimeToolResult,
} from "@workspace/iasted";
import { api } from "@convex/_generated/api";

// Routes citoyen connues — miroir du `MODULE_ROUTES` agent mais ciblé sur
// l'espace utilisateur citoyen (/my-space/...). Les modules absents sont
// signalés par un toast plutôt qu'une navigation silencieuse.
const MODULE_ROUTES: Record<string, string> = {
	dashboard: "/my-space",
	requests: "/my-space/requests",
	appointments: "/my-space/appointments",
	documents: "/my-space/documents",
	profile: "/my-space/profile",
	messaging: "/my-space/messaging",
	settings: "/my-space/settings",
};

export function useCitizenVoiceHost(): IAstedVoiceController {
	const router = useRouter();
	const createToken = useAction((api as any).ai.realtimeToken.create);
	const executeTool = useAction(
		(api as any).ai.realtimeToolExecutor.executeRealtimeTool,
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
					router.push(subpath ? `${base}/${subpath}` : base);
					break;
				}
				case "open_chat":
					window.dispatchEvent(
						new CustomEvent("iasted:open", { detail: { tab: "ichat" } }),
					);
					break;
				case "close_chat":
					window.dispatchEvent(new CustomEvent("iasted:close"));
					break;
				case "control_ui": {
					const action = uiAction.payload?.action as string | undefined;
					if (action === "set_theme_dark")
						document.documentElement.classList.add("dark");
					else if (action === "set_theme_light")
						document.documentElement.classList.remove("dark");
					else if (action === "toggle_theme")
						document.documentElement.classList.toggle("dark");
					break;
				}
				case "execute_page_action": {
					// `pageContextStore` (agent-features) n'est pas exposé côté
					// citizen-web. Tant que les pages citoyennes ne déclarent pas
					// de contexte page, l'action est ignorée avec un message.
					const actionId = uiAction.payload?.actionId as string | undefined;
					toast.info(
						actionId
							? `L'action « ${actionId} » n'est pas encore disponible ici.`
							: "Action ignorée (page non instrumentée).",
					);
					break;
				}
				case "stop_conversation":
				default:
					break;
			}
		},
		[router],
	);

	const voice = useRealtimeVoice({
		onToolCall: useCallback(
			async (
				name: string,
				args: Record<string, unknown>,
			): Promise<RealtimeToolResult> => {
				const result = (await executeTool({
					toolName: name,
					toolArgs: args,
					surface: "citizen",
				})) as RealtimeToolResult;
				if (result.uiAction) {
					dispatchUiAction(result.uiAction);
					if (result.uiAction.type === "stop_conversation") {
						setTimeout(() => voice.disconnect(), 100);
					}
				}
				return result;
				// eslint-disable-next-line react-hooks/exhaustive-deps
			},
			[executeTool, dispatchUiAction],
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
			void voice.disconnect();
			return;
		}
		try {
			const session = await createToken({ surface: "citizen" });
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
			// Pré-charge un contexte page vide — les pages citoyennes ne
			// déclarent pas (encore) de contexte via `usePageContext`. À
			// activer dans une itération suivante quand le store sera
			// extrait en package partagé.
			voice.updateSession({
				pageContext: formatPageContextForVoice(null),
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
			toast.success("iAsted vous écoute");
		} catch (error) {
			const message = error instanceof Error ? error.message : "Erreur inconnue";
			if (message.startsWith("RATE_LIMITED:")) {
				toast.warning(message.replace("RATE_LIMITED:", ""));
			} else {
				toast.error(`Échec de connexion : ${message}`);
			}
		}
	}, [available, unavailableReason, voice, createToken]);

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
			messages: voice.messages,
			clearMessages: voice.clearMessages,
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
		],
	);
}
