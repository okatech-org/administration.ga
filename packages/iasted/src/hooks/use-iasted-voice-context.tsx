/**
 * IAstedVoiceContext — Context React qui transporte le `IAstedVoiceController`
 * depuis le consumer (apps/agent-web, apps/backoffice-web) jusqu'à
 * `IAstedWindow` et `CircleMenu` à l'intérieur de `AppShell`.
 *
 * Pourquoi un Context ? Parce que le voiceController est construit dans
 * un sous-composant rendu SOUS `<OrgProvider>` (il a besoin de `useOrg()`),
 * alors que `AppShell` RENDU lui-même ce provider. Le seul moyen propre
 * d'injecter le controller dans la descendance sans coupler le package
 * `agent-features` à Convex est de passer par un context publié depuis
 * l'intérieur de la descendance.
 *
 * Pattern d'usage côté consumer :
 *
 *   function VoiceProvider({ children }) {
 *     const controller = useIAstedHost();
 *     return <IAstedVoiceContext.Provider value={controller}>{children}</IAstedVoiceContext.Provider>;
 *   }
 *
 *   <AppShell wrapWithAIPresence={(body) => <VoiceProvider>{body}</VoiceProvider>}>
 *     ...
 *   </AppShell>
 */

"use client";

import { createContext, useContext } from "react";
import type { IAstedVoiceController } from "./use-realtime-voice-types";

export const IAstedVoiceContext = createContext<IAstedVoiceController | null>(null);

/**
 * Hook qui lit le voiceController courant. Retourne `null` si aucun provider
 * n'est monté (le CircleMenu retombe alors sur sa variante 2D classique).
 */
export function useIAstedVoiceController(): IAstedVoiceController | null {
	return useContext(IAstedVoiceContext);
}
