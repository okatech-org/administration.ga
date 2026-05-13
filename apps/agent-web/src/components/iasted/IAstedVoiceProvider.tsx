/**
 * IAstedVoiceProvider — Wrapper qui publie le voiceController iAsted dans
 * le Context React du package `@workspace/iasted`.
 *
 * Doit être monté SOUS `<OrgProvider>` (interne à `AppShell`) car
 * `useIAstedHost` dépend de `useOrg()`. Pour cette raison, on l'injecte
 * via le slot `wrapWithAIPresence` de `AppShell` qui wrappe `shellBody`
 * (lequel est rendu après `<OrgProvider>` dans `DashboardLayout`).
 *
 * Le `<IAstedWindow>` consomme le context via `useIAstedVoiceController()`.
 */

"use client";

import { useEffect, type ReactNode } from "react";
import { IAstedVoiceContext } from "@workspace/iasted";
import { useIAstedHost } from "./use-iasted-host";

export function IAstedVoiceProvider({ children }: { children: ReactNode }) {
	const controller = useIAstedHost();

	// Raccourci clavier global pour activer/désactiver la conversation
	// vocale : Cmd+Shift+V (mac) ou Ctrl+Shift+V (Windows / Linux).
	// On évite de capturer la combinaison si l'utilisateur a le focus
	// dans un champ texte/textarea/contenteditable (saisie utilisateur
	// prioritaire — il pourrait taper un V majuscule).
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
