/**
 * PriorityBadge — badge priorité meeting (Sprint 6).
 *
 * Source de vérité : convex/schemas/meetings.ts (champ `priority`).
 * Couleurs DS v3 §3.4 — accents sémantiques :
 * - urgent → rose-500 (destructive)
 * - high   → amber-500 (warning)
 * - normal → muted (neutre, pas affiché par défaut)
 */

"use client";

import { cn } from "@workspace/ui/lib/utils";
import type { MeetingPriority } from "../../types/agent-presence";

export interface PriorityBadgeProps {
	priority: MeetingPriority;
	/** Masquer le badge pour la priorité "normal" (défaut : true). */
	hideNormal?: boolean;
	className?: string;
}

const STYLES: Record<MeetingPriority, string> = {
	urgent:
		"bg-rose-500/10 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
	high:
		"bg-amber-500/35 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
	normal:
		"bg-muted text-muted-foreground",
};

const LABELS: Record<MeetingPriority, string> = {
	urgent: "Urgent",
	high: "Priorité",
	normal: "Normal",
};

export function PriorityBadge({
	priority,
	hideNormal = true,
	className,
}: PriorityBadgeProps) {
	if (priority === "normal" && hideNormal) return null;

	return (
		<span
			className={cn(
				// Micro badge DS v3 §5.9
				"inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide",
				STYLES[priority],
				className,
			)}
			role="status"
		>
			{LABELS[priority]}
		</span>
	);
}
