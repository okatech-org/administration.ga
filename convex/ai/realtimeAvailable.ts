/**
 * realtimeAvailable — Query légère pour exposer l'état du mode vocal Realtime.
 *
 * Utilisée par l'UI pour afficher / masquer / griser le bouton iAsted 3D
 * avant même de tenter une connexion (UX : ne pas faire échouer le long-press
 * pour rien si OPENAI_API_KEY n'est pas configurée).
 *
 * Note : on N'EXPOSE PAS si la clé est valide ou non — seulement si elle
 * est définie. Une clé invalide donnera une erreur côté `realtimeToken.create`.
 */

// Runtime Convex V8 isolate (pas besoin de Node) — process.env y est dispo.

import { action } from "../_generated/server";

export const status = action({
	args: {},
	handler: async () => {
		const configured = Boolean(process.env.OPENAI_API_KEY);
		return {
			available: configured,
			reason: configured ? undefined : "NOT_CONFIGURED",
		};
	},
});
