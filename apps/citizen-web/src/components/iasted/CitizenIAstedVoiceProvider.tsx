/**
 * CitizenIAstedVoiceProvider — Publie le voiceController iAsted citoyen dans
 * le Context React du package `@workspace/iasted` + ajoute le raccourci
 * clavier Cmd+Shift+V pour activer/désactiver la voix.
 *
 * Miroir de `apps/agent-web/src/components/iasted/IAstedVoiceProvider.tsx`.
 * Doit être monté sous le provider d'authentification Convex.
 */

"use client";

import { useEffect, type ReactNode } from "react";
import { IAstedVoiceContext } from "@workspace/iasted";
import { useCitizenVoiceHost } from "./use-citizen-voice-host";

export function CitizenIAstedVoiceProvider({ children }: { children: ReactNode }) {
	const controller = useCitizenVoiceHost();

	useEffect(() => {
		const handler = (event: KeyboardEvent) => {
			const isShortcut =
				(event.metaKey || event.ctrlKey) &&
				event.shiftKey &&
				(event.key === "V" || event.key === "v");
			if (!isShortcut) return;
			const target = event.target as HTMLElement | null;
			const tag = target?.tagName;
			if (
				tag === "INPUT" ||
				tag === "TEXTAREA" ||
				(target && (target as HTMLElement).isContentEditable)
			) {
				return;
			}
			event.preventDefault();
			if (controller.isConnected) {
				void controller.deactivateVoice();
			} else {
				void controller.activateVoice();
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [controller]);

	return (
		<IAstedVoiceContext.Provider value={controller}>
			{children}
		</IAstedVoiceContext.Provider>
	);
}
