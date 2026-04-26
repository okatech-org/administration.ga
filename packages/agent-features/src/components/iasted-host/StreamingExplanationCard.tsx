"use client";

/**
 * StreamingExplanationCard — démonstration UX du streaming Phase 3.
 *
 * Petite carte affichée en sous-header iAsted. Bouton « Explique cette
 * page en simple » → utilise useStreamingChat pour générer une explication
 * progressive (Gemini streaming) à partir du pageContext courant.
 *
 * Utilité concrète :
 *  - Latence perçue divisée car le texte apparaît mot par mot
 *  - Pas d'actions / tools — juste de la pédagogie sur ce qui est affiché
 *  - L'utilisateur voit la valeur du streaming sans toucher au flow chat
 *    principal (qui reste request/response avec tools)
 */

import { Sparkles, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { SafeMarkdown } from "@workspace/chat/safe-markdown";
import { cn } from "@workspace/ui/lib/utils";
import { usePageContextSnapshot } from "../../stores/page-context-store";
import { useStreamingChat } from "./useStreamingChat";

interface Props {
	className?: string;
}

export function StreamingExplanationCard({ className }: Props) {
	const snapshot = usePageContextSnapshot();
	const [open, setOpen] = useState(false);
	const { text, isStreaming, error, start, reset } = useStreamingChat();

	const onExplain = async () => {
		setOpen(true);
		const ctx = snapshot
			? `Contexte de l'écran courant :\n- Module: ${snapshot.module}\n- Titre: ${snapshot.title}\n- Résumé: ${snapshot.summary}\n${snapshot.visibleEntities.length > 0 ? `- ${snapshot.visibleEntities.length} éléments visibles\n` : ""}`
			: "L'utilisateur n'a pas encore navigué sur une page contextualisée.";
		await start(
			`En 3-5 phrases, explique simplement ce que voit l'agent à l'écran et ce qu'il peut y faire.\n\n${ctx}`,
		);
	};

	const onClose = () => {
		setOpen(false);
		reset();
	};

	if (!open) {
		return (
			<div className={cn("px-3 py-2", className)}>
				<button
					type="button"
					onClick={onExplain}
					disabled={!snapshot}
					className="w-full flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 hover:bg-muted/60 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 text-xs text-muted-foreground transition-colors"
				>
					<Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
					<span className="truncate">
						{snapshot
							? "Explique cette page en simple"
							: "Aucun contexte de page disponible"}
					</span>
				</button>
			</div>
		);
	}

	return (
		<div className={cn("px-3 py-2", className)}>
			<div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
				<div className="flex items-center gap-2">
					<Sparkles className="h-3.5 w-3.5 text-primary" />
					<span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
						{isStreaming ? "Génération en cours…" : "Explication"}
					</span>
					<Button
						size="icon"
						variant="ghost"
						className="ml-auto h-5 w-5"
						onClick={onClose}
						aria-label="Fermer"
					>
						<X className="h-3 w-3" />
					</Button>
				</div>
				{error ? (
					<p className="text-xs text-destructive">{error}</p>
				) : (
					<div className="text-xs leading-relaxed text-foreground/90 max-h-40 overflow-y-auto">
						<SafeMarkdown>{text || "…"}</SafeMarkdown>
					</div>
				)}
			</div>
		</div>
	);
}
