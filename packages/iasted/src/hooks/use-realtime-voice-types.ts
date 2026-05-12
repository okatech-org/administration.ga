/**
 * Types partagés pour le hook `use-realtime-voice` et ses consumers.
 *
 * Extrait dans un fichier dédié pour éviter les imports croisés entre
 * composants UI (IAstedTrigger3D, CircleMenu) et le hook lui-même
 * (qui dépend de `"use client"` côté React).
 */

// ─────────────────────────────────────────────────────────────
// État vocal courant
// ─────────────────────────────────────────────────────────────

export type VoiceState =
	| "idle"
	| "connecting"
	| "listening"
	| "thinking"
	| "processing"
	| "speaking";

// ─────────────────────────────────────────────────────────────
// Message échangé pendant la session vocale
// ─────────────────────────────────────────────────────────────

export interface RealtimeMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: string;
}

// ─────────────────────────────────────────────────────────────
// Tools OpenAI Realtime (format function-calling)
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// Voix supportées par OpenAI Realtime (gpt-4o-realtime)
// ─────────────────────────────────────────────────────────────

export type RealtimeVoice =
	| "alloy"
	| "ash"
	| "ballad"
	| "coral"
	| "echo"
	| "sage"
	| "shimmer"
	| "verse";

// ─────────────────────────────────────────────────────────────
// Session initialisée par le backend (Convex action)
// ─────────────────────────────────────────────────────────────

export interface RealtimeSessionInit {
	/** Token éphémère OpenAI Realtime (expire en ~1 min, étendu via DataChannel). */
	ephemeralKey: string;
	/** ID de session retourné par OpenAI. */
	sessionId: string;
	/** Modèle utilisé (ex : "gpt-4o-realtime-preview-2024-12-17"). */
	model?: string;
	/** Instructions système composées (rôle utilisateur, contexte métier). */
	systemPrompt: string;
	/** Tools exposés (filtrés par permissions). */
	tools: RealtimeVoiceTool[];
	/** Voix par défaut pour la session. */
	voice: RealtimeVoice;
	/** Timestamp d'expiration ISO (info indicative). */
	expiresAt?: string;
}

// ─────────────────────────────────────────────────────────────
// Réponse d'un tool — convention partagée entre frontend et backend
// ─────────────────────────────────────────────────────────────

export interface RealtimeToolResult {
	success: boolean;
	message?: string;
	/** Action UI à dispatcher côté client (navigation, theme, etc.). */
	uiAction?: {
		type: string;
		payload?: Record<string, unknown>;
	};
	/** Données structurées renvoyées au modèle. */
	data?: unknown;
}

// ─────────────────────────────────────────────────────────────
// Callback de tool dispatch (passé au hook)
// ─────────────────────────────────────────────────────────────

export type RealtimeToolHandler = (
	name: string,
	args: Record<string, unknown>,
) => Promise<RealtimeToolResult> | RealtimeToolResult;

// ─────────────────────────────────────────────────────────────
// Voice controller — contrat injecté du consumer (agent-web,
// backoffice-web) vers le package partagé `@workspace/iasted`.
//
// Le consumer construit ce controller côté app (a accès à
// `useAction(api.ai.realtimeToken.create)`) et l'injecte au
// `<CircleMenu>` via `<IAstedWindow voiceController={...}>`.
//
// Le package iasted ne dépend PAS de Convex — il reçoit un
// controller agnostique avec une API minimale.
// ─────────────────────────────────────────────────────────────

export interface IAstedVoiceController {
	/** Indique si le mode vocal est utilisable (OPENAI_API_KEY configurée + permission). */
	available: boolean;
	/** Raison de l'indisponibilité, le cas échéant (`NOT_CONFIGURED`, `INSUFFICIENT_PERMISSIONS`, etc.). */
	unavailableReason?: string;
	/** État vocal courant — pilote les animations du trigger 3D. */
	voiceState: VoiceState;
	/** Niveau audio normalisé [0..1] — module la saturation du trigger 3D. */
	audioLevel: number;
	/** Active la session vocale (long-press du trigger). */
	activateVoice: () => Promise<void> | void;
	/** Termine la session vocale (clic ou commande "stop"). */
	deactivateVoice: () => Promise<void> | void;
	/** True quand la connexion WebRTC est établie. */
	isConnected: boolean;
}

