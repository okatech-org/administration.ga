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
import { api } from "@convex/_generated/api";

// Map module code → route Next.js dans backoffice-web
const MODULE_ROUTES: Record<string, string> = {
	correspondence: "/icorrespondance",
	diplomatic_affairs: "/affaires-diplomatiques",
	consular_affairs: "/affaires-consulaires",
	calendar: "/iagenda",
	documents: "/idocument",
	team: "/profiles",
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
				default:
					break;
			}
		},
		[router],
	);

	const voice = useRealtimeVoice({
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
			const session = await createToken({
				surface: "backoffice",
				orgId: orgId as any,
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
