/**
 * WindowHeader — en-tête unifié de la fenêtre iAsted.
 *
 * **Modèle de référence : citizen-web original** (`bg-emerald-500/10` icon box,
 * icône `text-emerald-600 dark:text-emerald-400`). Le vert émeraude est la
 * signature visuelle iAsted — identique au trigger CircleMenu.
 *
 * Boutons de contrôle (aligné citizen original) :
 * - `onExpand` → icône `Maximize2` (2 flèches diagonales), masqué sur mobile
 *   car la fenêtre compacte occupe déjà 85dvh sur petit écran.
 * - `onClose` → icône `Minus` (réduire la fenêtre, pattern "bottom sheet").
 *
 * Typographie conforme DS v3 §4 :
 * - Titre : `text-sm font-bold leading-tight text-foreground`
 * - Sous-titre : `text-[10px] text-muted-foreground leading-tight`
 */

"use client";

import type { ReactNode } from "react";
import { Maximize2, Minus } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

export interface WindowHeaderProps {
	/** Icône header (par défaut Bot / ShieldCheck côté consumer). */
	icon: ReactNode;
	/** Titre principal (ex : "iAsted"). */
	title: string;
	/** Sous-titre optionnel (ex : nom de l'organisation / "Assistant Consulaire"). */
	subtitle?: string;
	/** Actions custom à droite du header (ex : OrgSelector, AgentStatusDot). */
	rightSlot?: ReactNode;
	/** Handler d'expansion vers page fullscreen (Maximize2, desktop uniquement). */
	onExpand?: () => void;
	/** Handler de réduction/fermeture (Minus, mobile + desktop). */
	onClose?: () => void;
	/** Alias legacy pour `onClose` (compat ascendante). */
	onMinimize?: () => void;
	className?: string;
}

export function WindowHeader({
	icon,
	title,
	subtitle,
	rightSlot,
	onExpand,
	onClose,
	onMinimize,
	className,
}: WindowHeaderProps) {
	// onMinimize alias legacy → mappé vers onClose
	const handleClose = onClose ?? onMinimize;

	return (
		<header
			className={cn(
				// Surface S1 + séparateur bas (aligné citizen-web original)
				"flex items-center justify-between gap-3 border-b border-border/50 bg-card px-4 py-3 shrink-0",
				className,
			)}
		>
			<div className="flex items-center gap-3 min-w-0">
				{/* Icône dans cercle emerald-500/10 — signature visuelle iAsted */}
				<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
					<span className="flex h-5 w-5 items-center justify-center text-emerald-600 dark:text-emerald-400 [&>svg]:h-5 [&>svg]:w-5">
						{icon}
					</span>
				</div>

				<div className="min-w-0">
					<h2 className="truncate text-sm font-bold leading-tight text-foreground">
						{title}
					</h2>
					{subtitle && (
						<p className="truncate text-[10px] leading-tight text-muted-foreground">
							{subtitle}
						</p>
					)}
				</div>
			</div>

			<div className="flex items-center gap-1 shrink-0">
				{rightSlot}
				{onExpand && (
					<button
						type="button"
						onClick={onExpand}
						title="Plein écran"
						className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-[0.97]"
						aria-label="Passer en plein écran"
					>
						<Maximize2 className="h-4 w-4" />
					</button>
				)}
				{handleClose && (
					<button
						type="button"
						onClick={handleClose}
						title="Réduire"
						className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-[0.97]"
						aria-label="Réduire"
					>
						<Minus className="h-4 w-4" />
					</button>
				)}
			</div>
		</header>
	);
}
