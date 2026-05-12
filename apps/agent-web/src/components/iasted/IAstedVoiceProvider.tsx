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

import type { ReactNode } from "react";
import { IAstedVoiceContext } from "@workspace/iasted";
import { useIAstedHost } from "./use-iasted-host";

export function IAstedVoiceProvider({ children }: { children: ReactNode }) {
	const controller = useIAstedHost();
	return (
		<IAstedVoiceContext.Provider value={controller}>
			{children}
		</IAstedVoiceContext.Provider>
	);
}
