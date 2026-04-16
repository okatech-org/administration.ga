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
					"mx-auto flex h-auto max-h-[90dvh] w-full max-w-2xl flex-col gap-0 rounded-t-2xl bg-card p-0 shadow-2xl",
					className,
				)}
			>
				<SheetHeader className="shrink-0 border-b border-border/50 px-6 pb-4 pt-5">
					<div className="flex items-center gap-2.5">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
							<Sparkles className="h-4 w-4 text-primary" />
						</div>
						<div className="flex min-w-0 flex-col">
							<SheetTitle className="text-base font-bold">
								Notes post-appel
							</SheetTitle>
							<SheetDescription className="text-xs text-muted-foreground">
								{meetingLabel ??
									"Documentez cette conversation avant de passer à la suivante."}
							</SheetDescription>
						</div>
					</div>
				</SheetHeader>

				<div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
					{autoDraftSlot && <div>{autoDraftSlot}</div>}

					<div className="space-y-2">
						<label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
							Résumé
						</label>
						<textarea
							value={content}
							onChange={(e) => setContent(e.target.value)}
							placeholder="Résumé de la conversation (3–4 lignes)"
							rows={4}
							className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
						/>
					</div>

					<div className="space-y-2">
						<label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
							Actions à suivre
							<span className="ml-1.5 font-normal normal-case tracking-normal text-muted-foreground/60">
								(une par ligne)
							</span>
						</label>
						<textarea
							value={actionItemsInput}
							onChange={(e) => setActionItemsInput(e.target.value)}
							placeholder={"Renvoyer le formulaire…\nProgrammer un RDV le lundi…"}
							rows={3}
							className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
						/>
					</div>

					<div className="space-y-2">
						<label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
							Ressenti citoyen
						</label>
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
							{SENTIMENT_OPTIONS.map((opt) => {
								const active = sentiment === opt.value;
								return (
									<button
										key={opt.value}
										type="button"
										onClick={() => setSentiment(opt.value)}
										className={cn(
											"flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-medium transition-all active:scale-[0.97]",
											active
												? cn("border-transparent", opt.colorClass)
												: "border-border bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground",
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

				<div className="flex shrink-0 items-center justify-end gap-2 border-t border-border/50 px-6 py-4">
					<Button
						variant="ghost"
						onClick={() => onOpenChange(false)}
						className="h-10 px-4 text-sm"
					>
						Plus tard
					</Button>
					<Button
						type="button"
						onClick={handleSave}
						disabled={saving || content.trim().length === 0}
						className="h-10 gap-1.5 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:scale-[0.98]"
					>
						<CheckCircle2 className="h-4 w-4" />
						{saving ? "Enregistrement…" : "Enregistrer"}
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}
