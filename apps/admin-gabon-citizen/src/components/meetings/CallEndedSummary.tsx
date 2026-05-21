"use client";

import { Calendar, FileText, Mail, Sparkles, Star } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CallEndedSummaryProps {
	correspondentName: string;
	correspondentRole?: string;
	durationLabel?: string;
	transferredTo?: { name: string; role?: string };
	summary?: string;
	highlights?: Array<
		| { kind: "appointment"; label: string }
		| { kind: "documents"; label: string }
		| { kind: "email"; label: string }
	>;
	onViewSummary?: () => void;
	onClose: () => void;
	/** Compact = panneau desktop ; sinon = mobile fullscreen. */
	variant?: "fullscreen" | "panel";
}

const HIGHLIGHT_ICON = {
	appointment: Calendar,
	documents: FileText,
	email: Mail,
} as const;

/**
 * CallEndedSummary — écran post-appel avec résumé IA + rating étoiles.
 *
 * Sprint 1 : UI seule, le rating n'est pas persisté (TODO mutation Convex).
 */
export function CallEndedSummary({
	correspondentName,
	correspondentRole,
	durationLabel,
	transferredTo,
	summary,
	highlights = [],
	onViewSummary,
	onClose,
	variant = "fullscreen",
}: CallEndedSummaryProps) {
	const { t } = useTranslation();
	const [rating, setRating] = useState<number | null>(null);

	const isPanel = variant === "panel";

	return (
		<div
			className={cn(
				"flex flex-col bg-background text-foreground overflow-hidden",
				isPanel ? "h-full" : "h-full w-full",
			)}
		>
			{/* En-tête */}
			<div className={cn("px-5 pt-5", isPanel ? "pb-3" : "pb-2 pt-14")}>
				<div className="flex items-center gap-2 text-success text-[13px] font-semibold">
					<span className="h-2 w-2 rounded-full bg-success" />
					{t("citizenCall.ended", "Appel terminé")}
					{durationLabel && (
						<span className="font-mono tabular-nums">· {durationLabel}</span>
					)}
				</div>
				<h1 className="mt-2 text-[22px] font-semibold tracking-[-0.01em]">
					{t("citizenCall.with", "Avec")} {correspondentName}
				</h1>
				{(correspondentRole || transferredTo) && (
					<p className="mt-0.5 text-[13px] text-muted-foreground">
						{correspondentRole}
						{transferredTo && (
							<>
								{correspondentRole && " → "}
								{transferredTo.name}
								{transferredTo.role && ` · ${transferredTo.role}`}
							</>
						)}
					</p>
				)}
			</div>

			{/* Résumé + Rating */}
			<div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
				<div className="rounded-2xl border bg-card p-4">
					<div className="flex items-center gap-2 text-primary text-[11px] uppercase tracking-[0.12em] font-semibold mb-2.5">
						<Sparkles className="h-3.5 w-3.5" />
						{t("citizenCall.summary", "Résumé de l'appel")}
					</div>
					{summary ? (
						<p className="text-sm leading-[1.55] text-foreground/90 mb-2.5">
							{summary}
						</p>
					) : (
						<p className="text-sm leading-[1.55] text-muted-foreground italic mb-2.5">
							{t(
								"citizenCall.noSummary",
								"Aucun résumé disponible pour cet appel.",
							)}
						</p>
					)}

					{highlights.length > 0 && (
						<div className="rounded-xl bg-secondary/60 p-3 space-y-2">
							{highlights.map((h, i) => {
								const Icon = HIGHLIGHT_ICON[h.kind];
								return (
									<div
										key={i}
										className="flex items-start gap-2.5 text-[13px]"
									>
										<Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
										<span className="text-foreground/90">{h.label}</span>
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* Rating */}
				<div className="rounded-2xl border bg-card p-4">
					<p className="text-[13px] font-semibold mb-2">
						{t("citizenCall.howWasIt", "Comment s'est passé l'appel ?")}
					</p>
					<div className="grid grid-cols-5 gap-1.5">
						{[1, 2, 3, 4, 5].map((i) => (
							<button
								key={i}
								type="button"
								onClick={() => setRating(i)}
								className={cn(
									"h-10 rounded-lg flex items-center justify-center transition-colors",
									"hover:bg-secondary",
									rating !== null && i <= rating
										? "text-warning"
										: "text-muted-foreground",
								)}
								aria-label={t("citizenCall.rating", "Note {{n}} sur 5", { n: i })}
							>
								<Star
									className="h-5 w-5"
									fill={rating !== null && i <= rating ? "currentColor" : "none"}
								/>
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Footer */}
			<div className="px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 flex gap-2.5 shrink-0">
				{onViewSummary && (
					<Button variant="outline" className="flex-1 h-11" onClick={onViewSummary}>
						{t("citizenCall.viewSummary", "Voir le résumé")}
					</Button>
				)}
				<Button className="flex-1 h-11" onClick={onClose}>
					{t("common.done", "Terminer")}
				</Button>
			</div>
		</div>
	);
}
