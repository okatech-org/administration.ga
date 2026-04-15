/**
 * SmartSuggestionsRow — rangée horizontale de quick-buttons contextuels.
 *
 * Plan Intelligence iAsted × Sprint 6 — Phase δ.
 *
 * Rendu sous le composer (ou dans l'empty state) de iChat. Les suggestions
 * varient selon la page courante (citizen : "Renouveler passeport", "Prendre
 * RDV" ; agent : "Stats du jour", "Demandes urgentes", etc.).
 *
 * Le consumer passe `suggestions[]` déjà résolues selon son contexte — ce
 * composant est 100% presentational, respecte DS v3 et `prefers-reduced-motion`.
 */

"use client";

import { type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@workspace/ui/lib/utils";
import { useReducedMotion } from "../../hooks/use-reduced-motion";

export interface SmartSuggestion {
	/** Identifiant stable (utile pour tests et analytics). */
	id: string;
	/** Texte affiché dans le bouton. */
	label: string;
	/** Icône optionnelle (Lucide déjà instanciée). */
	icon?: ReactNode;
	/** Callback au clic. */
	onClick: () => void;
}

export interface SmartSuggestionsRowProps {
	suggestions: SmartSuggestion[];
	/** Titre optionnel (ex : "Suggestions") affiché au-dessus. */
	title?: string;
	/** Masquer totalement le composant si liste vide. Défaut : true. */
	hideWhenEmpty?: boolean;
	/** Nombre max de suggestions rendues (tri / troncature côté consumer). */
	maxVisible?: number;
	className?: string;
}

export function SmartSuggestionsRow({
	suggestions,
	title,
	hideWhenEmpty = true,
	maxVisible = 3,
	className,
}: SmartSuggestionsRowProps) {
	const reduced = useReducedMotion();
	const visible = suggestions.slice(0, maxVisible);

	if (hideWhenEmpty && visible.length === 0) return null;

	return (
		<div
			className={cn(
				"flex flex-col gap-1.5 border-t border-border/50 bg-card px-3 py-2",
				className,
			)}
			role="region"
			aria-label={title ?? "Suggestions"}
		>
			{title && (
				<div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
					<Sparkles className="h-3 w-3" />
					{title}
				</div>
			)}
			<div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
				{visible.map((s, idx) => (
					<motion.button
						key={s.id}
						type="button"
						onClick={s.onClick}
						initial={reduced ? false : { opacity: 0, y: 4 }}
						animate={reduced ? undefined : { opacity: 1, y: 0 }}
						transition={reduced ? undefined : { delay: idx * 0.05, duration: 0.15 }}
						className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-emerald-500/15 active:scale-[0.97]"
					>
						{s.icon && <span className="flex items-center [&>svg]:h-3 [&>svg]:w-3">{s.icon}</span>}
						<span className="whitespace-nowrap">{s.label}</span>
					</motion.button>
				))}
			</div>
		</div>
	);
}
