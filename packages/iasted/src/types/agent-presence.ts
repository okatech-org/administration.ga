/**
 * Types dérivés de convex/schemas/agentPresence.ts.
 *
 * Lecture seule — le package ne modifie JAMAIS le schema Convex.
 * Voir plan : packages/iasted ne fait que consommer les tables existantes.
 *
 * État actuel (commit 2026-04-15) : 4 statuts Convex (online/busy/away/offline)
 * + champs multi-call (currentCallIds[], activeCallId).
 *
 * Notion de « DND » (do-not-disturb) : modélisée côté TypeScript comme un
 * statut virtuel. Si le schema Convex ajoute `dndUntil` plus tard, cette couche
 * de typage restera compatible (voir `AgentStatusExtended`).
 */

// ─────────────────────────────────────────────────────────────
// Statuts Convex (source de vérité : convex/schemas/agentPresence.ts)
// ─────────────────────────────────────────────────────────────

export type AgentStatus = "online" | "busy" | "away" | "offline";

/**
 * Statut étendu utilisé côté UI : ajoute "dnd" dérivé.
 * Un statut "dnd" est rendu quand l'utilisateur a explicitement mis Do-Not-Disturb.
 * Tant que le schema Convex n'a pas de `dndUntil`, le flag est client-side only
 * (stocké dans localStorage / Zustand) et doit être mappé vers "busy" côté Convex
 * pour préserver le routage call-center.
 */
export type AgentStatusExtended = AgentStatus | "dnd";

/**
 * Forme minimale de la ligne `agentPresence` consommée par les primitives UI.
 * Ne dépend PAS des types Convex générés (évite un couplage fort entre package
 * partagé et le runtime Convex de l'app).
 */
export interface AgentPresenceSnapshot {
	userId: string;
	orgId: string;
	status: AgentStatus;
	lastHeartbeat: number;
	lastActivity: number;
	/** Legacy single-call (retrocompat). */
	currentCallId?: string;
	/** Multi-call : tous les slots (actifs + en attente). */
	currentCallIds?: string[];
	/** Slot dont l'audio est actuellement publié. */
	activeCallId?: string;
	clientType?: "agent-web" | "agent-desktop" | string;
	/**
	 * Optionnel — timestamp d'expiration DND. Si présent et > now, UI rend "dnd".
	 * Non supporté actuellement par le schema ; prévoir pour Sprint 7.
	 */
	dndUntil?: number;
}

// ─────────────────────────────────────────────────────────────
// Helpers de dérivation
// ─────────────────────────────────────────────────────────────

/**
 * Dérive le statut étendu (incl. "dnd") depuis un snapshot presence.
 * Retourne "dnd" si `dndUntil > now`, sinon le status Convex tel quel.
 */
export function deriveExtendedStatus(
	snapshot: Pick<AgentPresenceSnapshot, "status" | "dndUntil">,
	now: number = Date.now(),
): AgentStatusExtended {
	if (snapshot.dndUntil !== undefined && snapshot.dndUntil > now) {
		return "dnd";
	}
	return snapshot.status;
}

/**
 * Priorité meetings (Centre d'Appels — Sprint 6).
 * Source : convex/schemas/meetings.ts (champ `priority`).
 */
export type MeetingPriority = "urgent" | "high" | "normal";

/**
 * Raisons de fin de meeting (Sprint 6 + legacy).
 * Source : convex/schemas/meetings.ts (champ `endReason`).
 */
export type MeetingEndReason =
	| "normal"
	| "timeout"
	| "declined"
	| "error"
	| "cancelled"
	| "rejected" // legacy
	| "voicemail_recorded"; // Sprint 6

/**
 * Consent RGPD pour enregistrement (Sprint 6).
 * Source : convex/schemas/meetings.ts (champ `citizenConsent`).
 */
export interface CitizenRecordingConsent {
	recordingAccepted?: boolean;
	recordingAcceptedAt?: number;
	recordingDeclinedAt?: number;
}
