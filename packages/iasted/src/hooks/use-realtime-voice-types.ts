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
	| "speaking"
	| "error";

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

/**
 * Identifiant du provider vocal sous-jacent. L'UI consomme uniquement
 * `IAstedVoiceController` (interface canonique) — le providerId sert à
 * afficher d'éventuels indicateurs et à gérer les features exclusives.
 */
export type VoiceProviderId = "openai-realtime" | "gemini-live";

/**
 * Capabilities exposées par un provider donné. L'UI lit ces flags pour
 * gater les features non universellement supportées (changement de voix,
 * push de contexte page, etc.). Toute capability absente est considérée
 * comme `false`.
 */
export interface VoiceCapabilities {
	/** Mise à jour des instructions système en cours de session (page context push). */
	pageContextUpdate: boolean;
	/** Function calling natif côté provider. */
	toolCalling: boolean;
	/** Changement de voix à chaud. */
	voiceSelection: boolean;
	/** Contrôle de vitesse de parole. */
	speechRateControl: boolean;
	/** Émet la transcription en streaming (sinon `messages` reste vide). */
	realTimeTranscription: boolean;
}

export interface IAstedVoiceController {
	/** Identifiant technique du provider (purement informatif côté UI). */
	providerId: VoiceProviderId;
	/** Libellé humain (« OpenAI Realtime », « Gemini Live »…) pour debug/UI. */
	providerLabel: string;
	/** Features supportées par le provider courant. */
	capabilities: VoiceCapabilities;

	/** Indique si le mode vocal est utilisable (clé configurée + permission). */
	available: boolean;
	/** Raison de l'indisponibilité, le cas échéant. */
	unavailableReason?: string;
	/** État vocal courant — pilote les animations du trigger 3D. */
	voiceState: VoiceState;
	/** Niveau audio normalisé [0..1]. */
	audioLevel: number;
	/** Active la session vocale (long-press du trigger). */
	activateVoice: () => Promise<void> | void;
	/** Termine la session vocale (clic ou commande "stop"). */
	deactivateVoice: () => Promise<void> | void;
	/** True quand la connexion (WebRTC / WebSocket) est établie. */
	isConnected: boolean;
	/** Transcription temps-réel (peut être vide si le provider ne la streame pas). */
	messages: RealtimeMessage[];
	/** Vide la transcription (utile à la déconnexion ou via UI). */
	clearMessages: () => void;

	// ── Optionnelles (no-op silencieux si capability == false) ──
	/** Change la voix de l'assistant. */
	setVoice?: (voiceId: string) => void;
	/** Change la vitesse de lecture (0.5..2.0). */
	setSpeechRate?: (rate: number) => void;
	/** Pousse un bloc texte concaténé au prompt système (page context). */
	updatePageContext?: (text: string) => void;

	/**
	 * Demande de confirmation utilisateur en cours, le cas échéant.
	 *
	 * Certains providers (Gemini Live) renvoient les appels d'outils
	 * mutatifs avec une étape explicite de confirmation côté UI : le
	 * provider attend l'accord avant d'exécuter. D'autres (OpenAI Realtime)
	 * gèrent la confirmation par le langage naturel (l'IA demande
	 * oralement, l'utilisateur répond, l'IA appelle ensuite).
	 *
	 * `undefined` = pas de confirmation en attente.
	 */
	pendingConfirmation?: VoicePendingConfirmation | null;
}

/** Demande de confirmation pour une action vocale (Gemini Live). */
export interface VoicePendingConfirmation {
	/** Description humaine de l'action à confirmer. */
	description: string;
	/** Identifiant technique de l'outil (optionnel, pour debug/log). */
	toolName?: string;
	/** Confirme et exécute. */
	confirm: () => Promise<void> | void;
	/** Rejette l'action. */
	reject: () => void;
	/** Indique qu'une confirmation est en cours (pour désactiver les boutons). */
	isConfirming?: boolean;
}

