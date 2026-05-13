/**
 * RawGeminiVoiceContext — Publie une instance SINGLETON de
 * `useAdminVoiceChat` au niveau de l'`<AppShell>`.
 *
 * Pourquoi : `useAdminVoiceChat` ouvre un WebSocket Gemini Live et gère
 * des refs internes (stream micro, AudioContext, etc.). Si plusieurs
 * composants instanciaient ce hook indépendamment, on aurait plusieurs
 * connexions parallèles et un état décorrélé. Pire : le hook était
 * historiquement instancié dans `IAstedTabHost` vivant à l'intérieur
 * de la fenêtre flottante — fermer la fenêtre tuait la session.
 *
 * Avec ce context :
 *   - `useAdminVoiceChat` est appelé UNE fois dans le provider, monté
 *     au-dessus de l'`AppShell`. La session survit à la fermeture de la
 *     fenêtre.
 *   - Toutes les couches (adaptateur canonique côté app, fenêtre iAsted,
 *     side panel, page fullscreen) lisent depuis ce context.
 *   - `useAdminVoiceChat` n'est plus appelé nulle part ailleurs.
 */

"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useAdminVoiceChat } from "./useAdminVoiceChat";

export type GeminiVoiceState = ReturnType<typeof useAdminVoiceChat>;

const GeminiVoiceContext = createContext<GeminiVoiceState | null>(null);

export function RawGeminiVoiceProvider({ children }: { children: ReactNode }) {
	const voice = useAdminVoiceChat();
	return (
		<GeminiVoiceContext.Provider value={voice}>
			{children}
		</GeminiVoiceContext.Provider>
	);
}

/**
 * Lit l'état Gemini brut depuis le context. Si le provider n'est pas
 * monté (par exemple côté backoffice qui ne fournit pas encore le
 * vocal), retourne `null` au lieu de planter — les consommateurs gèrent
 * le cas d'absence proprement.
 */
export function useRawGeminiVoice(): GeminiVoiceState | null {
	return useContext(GeminiVoiceContext);
}

/**
 * Variante stricte : lève si le provider n'est pas monté. À utiliser
 * uniquement dans les composants où la présence du provider est garantie
 * par construction (intégrations agent-web côté DashboardLayout).
 */
export function useRawGeminiVoiceStrict(): GeminiVoiceState {
	const ctx = useContext(GeminiVoiceContext);
	if (!ctx) {
		throw new Error(
			"useRawGeminiVoiceStrict requires <RawGeminiVoiceProvider> mounted upstream",
		);
	}
	return ctx;
}
