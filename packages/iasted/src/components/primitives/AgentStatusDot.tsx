/**
 * AgentStatusDot — badge coloré reflétant le statut presence d'un agent.
 *
 * Consomme `AgentStatusExtended` (online/busy/away/offline/dnd).
 * Couleurs DS v3 §3.4 — accents sémantiques uniquement :
 * - online   → green-500
 * - busy     → amber-500
 * - away     → muted (gris)
 * - offline  → muted (gris foncé)
 * - dnd      → rose-500
 */

"use client";

import { cn } from "@workspace/ui/lib/utils";
import {
	type AgentPresenceSnapshot,
	type AgentStatusExtended,
	deriveExtendedStatus,
} from "../../types/agent-presence";

export interface AgentStatusDotProps {
	/** Soit le statut direct, soit un snapshot complet (pour DND dérivé). */
	status?: AgentStatusExtended;
	presence?: Pick<AgentPresenceSnapshot, "status" | "dndUntil">;
	/** Taille en pixels (défaut 8). */
	size?: 6 | 8 | 10 | 12;
	/** Bordure blanche pour afficher sur avatar sombre. */
	withBorder?: boolean;
	className?: string;
	/** Titre accessible. */
	title?: string;
}

const STATUS_CLASS: Record<AgentStatusExtended, string> = {
	online: "bg-green-500",
	busy: "bg-amber-500",
	away: "bg-muted-foreground/40",
	offline: "bg-muted-foreground/25",
	dnd: "bg-rose-500",
};

const STATUS_LABEL: Record<AgentStatusExtended, string> = {
	online: "En ligne",
	busy: "Occupé",
	away: "Absent",
	offline: "Hors ligne",
	dnd: "Ne pas déranger",
};

const SIZE_CLASS: Record<6 | 8 | 10 | 12, string> = {
	6: "h-1.5 w-1.5",
	8: "h-2 w-2",
	10: "h-2.5 w-2.5",
	12: "h-3 w-3",
};

export function AgentStatusDot({
	status,
	presence,
	size = 8,
	withBorder = false,
	className,
	title,
}: AgentStatusDotProps) {
	const resolvedStatus: AgentStatusExtended =
		status ??
		(presence ? deriveExtendedStatus(presence) : "offline");

	return (
		<span
			className={cn(
				"inline-block rounded-full",
				SIZE_CLASS[size],
				STATUS_CLASS[resolvedStatus],
				withBorder && "border-2 border-card",
				className,
			)}
			title={title ?? STATUS_LABEL[resolvedStatus]}
			aria-label={title ?? STATUS_LABEL[resolvedStatus]}
			role="status"
		/>
	);
}
