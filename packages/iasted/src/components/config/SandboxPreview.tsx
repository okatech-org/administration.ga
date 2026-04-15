/**
 * SandboxPreview — preview live du chat IA avec la config en cours d'édition.
 *
 * Phase 4 stub : rend un placeholder safe par défaut. Le consumer (backoffice)
 * peut passer un `previewContent` custom (ex : iframe vers un mode dry-run Convex)
 * ou laisser l'empty state.
 *
 * SÉCURITÉ :
 * - Le package N'EXÉCUTE JAMAIS un prompt LLM côté client.
 * - La preview réelle nécessite une action Convex dry-run (responsabilité consumer).
 * - En l'absence de cette action, le panneau reste désactivé avec toast de warning.
 */

"use client";

import { type ReactNode } from "react";
import { AlertTriangle, PlayCircle } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

export interface SandboxPreviewProps {
	/** Contenu live de preview (fourni par consumer, typiquement <iframe /> dry-run). */
	previewContent?: ReactNode;
	/** Indique si la preview est disponible (action Convex dry-run présente). */
	enabled?: boolean;
	/** Message affiché quand `enabled === false`. */
	disabledMessage?: string;
	className?: string;
}

export function SandboxPreview({
	previewContent,
	enabled = true,
	disabledMessage = "Preview non disponible — l'action Convex `iAstedConfig.dryRun` doit être implémentée côté backend.",
	className,
}: SandboxPreviewProps) {
	if (!enabled) {
		return (
			<div
				className={cn(
					"flex items-center gap-3 rounded-xl bg-amber-500/15 dark:bg-amber-500/10 px-4 py-3",
					className,
				)}
				role="status"
			>
				<AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
				<div className="min-w-0 flex-1">
					<p className="text-xs font-bold text-amber-700 dark:text-amber-400">
						Mode preview désactivé
					</p>
					<p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
						{disabledMessage}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className={cn("flex flex-col gap-2", className)}>
			<div className="flex items-center gap-2">
				<PlayCircle className="h-4 w-4 text-primary" />
				<h3 className="text-xs font-bold uppercase tracking-wide text-foreground">
					Preview live
				</h3>
				<span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
					Dry-run
				</span>
			</div>
			<div className="min-h-[240px] overflow-hidden rounded-xl border border-foreground/5 bg-card p-3">
				{previewContent ?? (
					<div className="flex h-full min-h-[200px] items-center justify-center text-center">
						<p className="text-xs font-medium text-muted-foreground">
							Éditez la config pour voir le chat IA mis à jour en temps réel.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
