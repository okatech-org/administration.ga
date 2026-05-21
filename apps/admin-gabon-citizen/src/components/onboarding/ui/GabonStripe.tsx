import { cn } from "@/lib/utils";

/**
 * Bande décorative drapeau gabonais (vert / jaune / bleu).
 * Exception colorée documentée (le reste du design system est achromatique).
 * Variants :
 * - `horizontal` (par défaut) : trois bandes côte à côte, à utiliser en `stripe-top`
 *   d'une Card pour la signature visuelle d'inscription consulaire.
 * - `compact` : 3 px de haut, pour les en-têtes de cartes.
 */
export function GabonStripe({
	className,
	variant = "horizontal",
}: {
	className?: string;
	variant?: "horizontal" | "compact";
}) {
	if (variant === "compact") {
		return (
			<div
				aria-hidden="true"
				className={cn("flex h-[3px] w-full overflow-hidden", className)}
			>
				<span className="flex-1 bg-gabon-green" />
				<span className="flex-1 bg-gabon-yellow" />
				<span className="flex-1 bg-gabon-blue" />
			</div>
		);
	}
	return (
		<div
			aria-hidden="true"
			className={cn("flex h-1.5 w-16 overflow-hidden rounded-full", className)}
		>
			<span className="flex-1 bg-gabon-green" />
			<span className="flex-1 bg-gabon-yellow" />
			<span className="flex-1 bg-gabon-blue" />
		</div>
	);
}
