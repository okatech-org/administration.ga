/**
 * Types du CircleMenu partagé.
 *
 * Extraits de apps/citizen-web/src/components/ui/circle-menu.tsx (bit-exact).
 * Étendus en 2026-05 pour supporter le trigger 3D organique (iAsted vocal).
 */

import type { ReactNode } from "react";
import type { VoiceState } from "../../hooks/use-realtime-voice-types";

export interface CircleMenuItemConfig {
	label: string;
	icon: ReactNode;
	href?: string;
	onClick?: () => void;
	/** Classe Tailwind de fond (ex : "bg-rose-500", "bg-gabon-blue"). */
	className?: string;
}

export interface CircleMenuProps {
	items: CircleMenuItemConfig[];
	/** Icône du trigger central. */
	openIcon?: ReactNode;
	/** Classe Tailwind du trigger (défaut : "bg-foreground"). */
	triggerClassName?: string;
	/** Classe Tailwind par défaut des items (override par item.className). */
	itemClassName?: string;
	/** Auto-open au mount (utile pour dashboard-first). */
	defaultOpen?: boolean;
	/** Callback après la séquence close complète. */
	onCloseComplete?: () => void;
	/** Callback quand le trigger est cliqué alors que le menu est ouvert. */
	onTriggerClick?: () => void;

	// ─── Mode 3D organique (iAsted vocal) ──────────────────────

	/**
	 * Variante du trigger :
	 * - `"default"` (défaut) : disque coloré classique avec icône
	 * - `"3d-organic"` : bouton 3D animé (heartbeat, voice-listening, voice-speaking)
	 */
	triggerVariant?: "default" | "3d-organic";
	/**
	 * État vocal courant — pilote les animations du trigger 3D.
	 * Ignoré si `triggerVariant === "default"`.
	 */
	voiceState?: VoiceState;
	/**
	 * Niveau audio normalisé [0..1] — module la saturation/brightness du trigger 3D.
	 * Ignoré si `triggerVariant === "default"`.
	 */
	audioLevel?: number;
	/**
	 * Callback déclenché sur maintien long du trigger (≥ `longPressDelayMs`).
	 * Utilisé pour activer le mode vocal en mode `3d-organic`.
	 */
	onLongPress?: () => void;
	/**
	 * Seuil de détection du long-press en millisecondes. Défaut : 350.
	 */
	longPressDelayMs?: number;
	/**
	 * Indique si le mode vocal est indisponible (ex : OPENAI_API_KEY absente,
	 * permission refusée). Le trigger 3D s'affiche en mode désactivé.
	 */
	voiceDisabled?: boolean;
}
