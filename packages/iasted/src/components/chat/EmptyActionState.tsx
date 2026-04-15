/**
 * EmptyActionState — état vide orienté action.
 *
 * Remplace les empty states passifs ("Aucune conversation") par un slot
 * qui propose 2 à 4 actions concrètes au citoyen (démarrer demande, prendre RDV, etc.).
 *
 * DS v3 §5.5 EmptyState : icône dans boîte `rounded-full bg-muted p-4`, centré.
 */

"use client";

import type { ReactNode } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";

export interface EmptyActionItem {
	/** Identifiant logique (pour analytics / tests). */
	id: string;
	/** Label affiché sur le bouton. */
	label: string;
	/** Description courte (optionnel, rendue sous le label). */
	description?: string;
	/** Icône Lucide (déjà instanciée avec size/className). */
	icon?: ReactNode;
	/** Handler de clic. */
	onClick: () => void;
	/** Variant du bouton (défaut primary pour le 1er item, ghost pour les suivants). */
	variant?: "primary" | "secondary" | "ghost";
}

export interface EmptyActionStateProps {
	/** Icône hero (au-dessus du titre). */
	icon: ReactNode;
	title: string;
	description?: string;
	actions: EmptyActionItem[];
	className?: string;
}

const VARIANT_CLASS: Record<NonNullable<EmptyActionItem["variant"]>, string> = {
	primary:
		"bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97]",
	secondary:
		"bg-foreground/8 dark:bg-foreground/5 text-foreground hover:bg-foreground/12 active:scale-[0.97]",
	ghost:
		"bg-transparent text-foreground hover:bg-foreground/5 active:scale-[0.97]",
};

export function EmptyActionState({
	icon,
	title,
	description,
	actions,
	className,
}: EmptyActionStateProps) {
	return (
		<div
			className={cn(
				"flex h-full flex-col items-center justify-center gap-4 px-6 py-8 text-center",
				className,
			)}
		>
			<div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted p-4 [&>svg]:h-6 [&>svg]:w-6 [&>svg]:text-muted-foreground">
				{icon}
			</div>
			<div className="space-y-1">
				<h3 className="text-sm font-bold text-foreground">{title}</h3>
				{description && (
					<p className="text-xs font-medium text-muted-foreground">{description}</p>
				)}
			</div>
			{actions.length > 0 && (
				<div className="flex w-full max-w-xs flex-col items-stretch gap-2">
					{actions.map((action, idx) => {
						const variant = action.variant ?? (idx === 0 ? "primary" : "ghost");
						return (
							<Button
								key={action.id}
								type="button"
								onClick={action.onClick}
								className={cn(
									"h-9 rounded-lg px-3 text-xs font-medium transition-all",
									VARIANT_CLASS[variant],
								)}
							>
								{action.icon && (
									<span className="mr-2 flex shrink-0 items-center [&>svg]:h-3.5 [&>svg]:w-3.5">
										{action.icon}
									</span>
								)}
								<span className="flex-1 text-center">{action.label}</span>
							</Button>
						);
					})}
				</div>
			)}
		</div>
	);
}
