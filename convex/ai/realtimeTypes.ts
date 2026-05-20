/**
 * Types partagés pour l'agent vocal Realtime côté Convex.
 *
 * Évite les imports croisés entre `realtimeToken.ts`, `realtimeTools.ts`,
 * et `realtimeToolExecutor.ts`.
 *
 * Note : ces types DOIVENT rester cohérents avec ceux exportés par
 * `packages/iasted/src/hooks/use-realtime-voice-types.ts` côté client.
 */

export interface RealtimeVoiceTool {
	type: "function";
	name: string;
	description: string;
	parameters?: {
		type: "object";
		properties: Record<string, unknown>;
		required?: string[];
	};
}

export type RealtimeVoice =
	| "alloy"
	| "ash"
	| "ballad"
	| "coral"
	| "echo"
	| "sage"
	| "shimmer"
	| "verse";

export type RealtimeSurface = "agent" | "backoffice" | "citizen";

export interface RealtimeSessionResponse {
	available: boolean;
	error?: string;
	ephemeralKey?: string;
	sessionId?: string;
	model?: string;
	systemPrompt?: string;
	tools?: RealtimeVoiceTool[];
	voice?: RealtimeVoice;
	expiresAt?: string;
	/**
	 * Locale BCP-47 effectivement appliquée (peut différer de l'arg envoyé
	 * si le code reçu n'était pas supporté → fallback fr-FR côté serveur).
	 * Permet au client d'afficher la langue effective et de la persister.
	 */
	locale?: string;
	/**
	 * Sprint 5 — G1 : status du quota OpenAI mensuel global.
	 * Permet au client d'afficher un toast informatif ou un mode dégradé.
	 *   - `null` : conso < 70 % du budget — RAS.
	 *   - `"approaching"` : 70–90 % — toast info bénin.
	 *   - `"warning"` : 90–100 % — toast warning + suggestion de modération.
	 *   - `"exceeded"` : > 100 % — toast d'alerte critique (mais session
	 *     toujours autorisée — décision admin de bloquer ou pas).
	 */
	quotaLevel?: "approaching" | "warning" | "exceeded" | null;
	/** Ratio conso/budget pour debug (0..N). Sprint 5 — G1. */
	quotaRatio?: number;
}

export interface RealtimeToolResult {
	success: boolean;
	message?: string;
	uiAction?: {
		type: string;
		payload?: Record<string, unknown>;
	};
	data?: unknown;
}
