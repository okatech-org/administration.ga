"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check } from "lucide-react";
import type { OnboardingStepDef } from "./lib/onboardingFlow";

/**
 * Sidebar de navigation desktop (variant `split`).
 *
 * Conforme à la maquette :
 * - Lien "Changer de profil" en haut, en text-button
 * - Titre du parcours en uppercase + tracking
 * - Liste numérotée des étapes : pastille 26×26 (numéro ou ✓ pour done),
 *   ligne courante en `bg-gabon-blue-tint` + texte bleu gras
 * - Barre de progression globale en bas + "Étape X sur Y"
 */
export function DesktopStepsSidebar({
	steps,
	currentIndex,
	onJump,
	profileTitle,
	onChangeProfile,
}: {
	steps: OnboardingStepDef[];
	currentIndex: number;
	onJump?: (index: number) => void;
	profileTitle: string;
	onChangeProfile?: () => void;
}) {
	const total = steps.length;
	const progress = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;

	return (
		<aside className="sticky top-6 hidden flex-col gap-4 self-start lg:flex">
			{onChangeProfile && (
				<Button
					type="button"
					variant="link"
					size="sm"
					className="-ml-1 h-auto justify-start p-0 text-muted-foreground hover:text-foreground"
					onClick={onChangeProfile}
				>
					<ArrowLeft className="mr-1 size-3.5" />
					Changer de profil
				</Button>
			)}

			<p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
				{profileTitle}
			</p>

			<ol className="flex flex-col gap-1">
				{steps.map((s, i) => {
					const done = i < currentIndex;
					const cur = i === currentIndex;
					const clickable = (done || cur) && Boolean(onJump);
					return (
						<li key={s.key}>
							<button
								type="button"
								onClick={() => clickable && onJump?.(i)}
								disabled={!clickable}
								className={cn(
									"flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-sm transition-colors",
									cur && "bg-gabon-blue-tint font-semibold text-gabon-blue",
									done && !cur && "text-foreground hover:bg-muted/60",
									!done && !cur && "text-muted-foreground/70",
									clickable && "cursor-pointer",
									!clickable && "cursor-default",
								)}
							>
								<span
									className={cn(
										"flex size-[26px] shrink-0 items-center justify-center rounded-full border-[1.5px] text-xs font-semibold",
										done && "border-gabon-blue bg-gabon-blue text-white",
										cur &&
											"border-gabon-blue bg-card text-gabon-blue",
										!done &&
											!cur &&
											"border-border bg-muted/40 text-muted-foreground",
									)}
								>
									{done ? (
										<Check className="size-3" strokeWidth={3} />
									) : (
										i + 1
									)}
								</span>
								<span className="truncate">{s.label}</span>
							</button>
						</li>
					);
				})}
			</ol>

			<div className="mt-2 flex flex-col gap-2 border-t border-border pt-4">
				<p className="text-xs text-muted-foreground">Progression globale</p>
				<div className="h-1 w-full overflow-hidden rounded-full bg-muted">
					<div
						className="h-full bg-gabon-blue transition-[width] duration-300 ease-out"
						style={{ width: `${progress}%` }}
					/>
				</div>
				<p className="text-xs text-muted-foreground">
					Étape {currentIndex + 1} sur {total}
				</p>
			</div>
		</aside>
	);
}
