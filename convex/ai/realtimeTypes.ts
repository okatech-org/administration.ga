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
