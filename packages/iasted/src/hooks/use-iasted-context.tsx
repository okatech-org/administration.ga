/**
 * useIAstedContext — Context provider unifié pour orgId / userId / surface / role.
 *
 * Les apps montent `<IAstedContextProvider value={{...}}>` au plus haut dans
 * l'arbre des composants iAsted (idéalement juste au-dessus du `WindowShell`).
 *
 * Les composants profonds (CitizenChatPane, AgentStatusSelector, etc.) lisent
 * le contexte via `useIAstedContext()` sans prop drilling.
 */

"use client";

import {
	createContext,
	type ReactNode,
	useContext,
	useMemo,
} from "react";
import type { IAstedContextValue } from "../types/iasted";

const IAstedContext = createContext<IAstedContextValue | null>(null);

export interface IAstedContextProviderProps {
	value: IAstedContextValue;
	children: ReactNode;
}

export function IAstedContextProvider({
	value,
	children,
}: IAstedContextProviderProps): ReactNode {
	// Mémoïsation pour éviter les re-renders des consumers à chaque render parent.
	const memoized = useMemo<IAstedContextValue>(
		() => ({
			orgId: value.orgId,
			userId: value.userId,
			surface: value.surface,
			role: value.role,
			locale: value.locale,
		}),
		[value.orgId, value.userId, value.surface, value.role, value.locale],
	);

	return <IAstedContext.Provider value={memoized}>{children}</IAstedContext.Provider>;
}

export function useIAstedContext(): IAstedContextValue {
	const ctx = useContext(IAstedContext);
	if (ctx === null) {
		throw new Error(
			"useIAstedContext must be used within <IAstedContextProvider>. " +
				"Wrap your iAsted consumers with the provider at the app root.",
		);
	}
	return ctx;
}

/**
 * Variante safe — retourne null si pas de provider (pour composants optionnels).
 */
export function useIAstedContextOptional(): IAstedContextValue | null {
	return useContext(IAstedContext);
}
