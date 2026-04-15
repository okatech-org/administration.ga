/**
 * IntentConfidenceBadge — badge discret affichant la confiance d'un intent
 * détecté par le parseur iAsted (IntentProcessor côté consumer).
 *
 * Plan Intelligence iAsted × Sprint 6 — Phase δ.
 *
 * Rendu à côté d'un message utilisateur ou d'une action auto-exécutée.
 * Couleurs DS v3 §3.4 :
 * - ≥ 80% : emerald-500/15 (success, action fiable)
 * - 60–79% : amber-500/15 (warning, confirmation souhaitable)
 * - < 60% : rose-500/10 (destructive-ish, pause + confirmation requise)
 */

"use client";

import { Sparkle } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

export interface IntentConfidenceBadgeProps {
	/** Score de confiance entre 0 et 1. */
	confidence: number;
	/** Affichage compact (juste %) ou expanded ("78% confiance"). Défaut compact. */
	variant?: "compact" | "expanded";
	className?: string;
}

export function IntentConfidenceBadge({
	confidence,
	variant = "compact",
	className,
}: IntentConfidenceBadgeProps) {
	const pct = Math.round(Math.max(0, Math.min(1, confidence)) * 100);

	const level: "high" | "medium" | "low" =
		pct >= 80 ? "high" : pct >= 60 ? "medium" : "low";

	const styles: Record<typeof level, string> = {
		high: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
		medium: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
		low: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
	};

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
				styles[level],
				className,
			)}
			role="status"
			aria-label={`Confiance ${pct}%`}
		>
			<Sparkle className="h-2.5 w-2.5" />
			{variant === "expanded" ? `${pct}% confiance` : `${pct}%`}
		</span>
	);
}
