/**
 * PostCallNoteDrawer — drawer bottom-sheet affiché après la fin d'un appel
 * pour que l'agent documente la conversation (action items + sentiment).
 *
 * Plan Intelligence iAsted × Sprint 6 — Phase ζ (post-call intelligence).
 *
 * Data-source-agnostic : la persistance est assurée par le consumer via
 * `onSave(content, actionItems, sentiment)`. Phase ζ ne génère PAS de
 * draft automatique LLM — l'agent démarre sur un textarea vide.
 * (Extension future : brancher sur une action Convex dry-run Gemini.)
 */

"use client";

import { type ReactNode, useState } from "react";
import { CheckCircle2, Frown, Meh, Smile, Sparkles } from "lucide-react";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@workspace/ui/components/sheet";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

export type CallSentiment = "satisfied" | "neutral" | "frustrated" | "angry";

export interface PostCallNoteDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** ID du meeting pour affichage / debug. */
	meetingLabel?: string;
	/** Contenu initial (si reprise d'une note précédente). */
	initialContent?: string;
	initialActionItems?: string[];
	initialSentiment?: CallSentiment;
	/** Callback de sauvegarde. */
	onSave: (payload: {
		content: string;
		actionItems: string[];
		sentiment?: CallSentiment;
	}) => Promise<unknown>;
	/** Slot optionnel pour afficher un résumé auto-généré au-dessus du textarea. */
	autoDraftSlot?: ReactNode;
	className?: string;
}

const SENTIMENT_OPTIONS: Array<{ value: CallSentiment; label: string; icon: ReactNode; colorClass: string }> = [
	{ value: "satisfied", label: "Satisfait", icon: <Smile className="h-4 w-4" />, colorClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
	{ value: "neutral", label: "Neutre", icon: <Meh className="h-4 w-4" />, colorClass: "bg-muted text-muted-foreground" },
	{ value: "frustrated", label: "Frustré", icon: <Frown className="h-4 w-4" />, colorClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
	{ value: "angry", label: "Colère", icon: <Frown className="h-4 w-4" />, colorClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
];

export function PostCallNoteDrawer({
	open,
	onOpenChange,
	meetingLabel,
	initialContent = "",
	initialActionItems = [],
	initialSentiment,
	onSave,
	autoDraftSlot,
	className,
}: PostCallNoteDrawerProps) {
	const [content, setContent] = useState<string>(initialContent);
	const [actionItemsInput, setActionItemsInput] = useState<string>(
		initialActionItems.join("\n"),
	);
	const [sentiment, setSentiment] = useState<CallSentiment | undefined>(initialSentiment);
	const [saving, setSaving] = useState<boolean>(false);

	const handleSave = async () => {
		setSaving(true);
		try {
			const items = actionItemsInput
				.split("\n")
				.map((l) => l.trim())
				.filter(Boolean);
			await onSave({ content, actionItems: items, sentiment });
			onOpenChange(false);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="bottom"
				className={cn(
					"flex max-h-[80dvh] flex-col gap-0 bg-card p-0",
					className,
				)}
			>
				<SheetHeader className="shrink-0 border-b border-border/50 px-4 py-3">
					<div className="flex items-center gap-2">
						<Sparkles className="h-4 w-4 text-primary" />
						<SheetTitle className="text-sm font-bold">Notes post-appel</SheetTitle>
					</div>
					<SheetDescription className="text-[10px] text-muted-foreground">
						{meetingLabel ?? "Documentez cette conversation avant de passer à la suivante."}
					</SheetDescription>
				</SheetHeader>

				<div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
					{autoDraftSlot && <div>{autoDraftSlot}</div>}

					<div className="space-y-1.5">
						<label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
							Résumé
						</label>
						<textarea
							value={content}
							onChange={(e) => setContent(e.target.value)}
							placeholder="Résumé de la conversation (3–4 lignes)"
							rows={4}
							className="w-full resize-none rounded-lg border border-border/50 bg-background px-3 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
						/>
					</div>

					<div className="space-y-1.5">
						<label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
							Actions à suivre (une par ligne)
						</label>
						<textarea
							value={actionItemsInput}
							onChange={(e) => setActionItemsInput(e.target.value)}
							placeholder="Renvoyer le formulaire…\nProgrammer un RDV le lundi…"
							rows={3}
							className="w-full resize-none rounded-lg border border-border/50 bg-background px-3 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
						/>
					</div>

					<div className="space-y-1.5">
						<label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
							Ressenti citoyen
						</label>
						<div className="flex flex-wrap gap-1.5">
							{SENTIMENT_OPTIONS.map((opt) => {
								const active = sentiment === opt.value;
								return (
									<button
										key={opt.value}
										type="button"
										onClick={() => setSentiment(opt.value)}
										className={cn(
											"flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors active:scale-[0.97]",
											active
												? opt.colorClass
												: "bg-muted/30 text-muted-foreground hover:bg-muted/60",
										)}
									>
										{opt.icon}
										{opt.label}
									</button>
								);
							})}
						</div>
					</div>
				</div>

				<div className="shrink-0 border-t border-border/50 p-3 flex items-center justify-end gap-2">
					<Button
						variant="ghost"
						onClick={() => onOpenChange(false)}
						className="h-9 text-xs"
					>
						Plus tard
					</Button>
					<Button
						type="button"
						onClick={handleSave}
						disabled={saving || content.trim().length === 0}
						className="h-9 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.97]"
					>
						<CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
						{saving ? "Enregistrement…" : "Enregistrer"}
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}
