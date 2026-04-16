import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeltaBadgeProps {
	/** Variation en pourcentage (positif = hausse). */
	value: number;
	/** Si vrai, une variation positive est coloree en rose (cas "SLA en retard +X%"). */
	invertColors?: boolean;
	className?: string;
}

/**
 * Badge de variation — affiche une flèche + pourcentage coloré.
 * Vert si bénéfique, rose si défavorable, gris si neutre.
 */
export function DeltaBadge({
	value,
	invertColors = false,
	className,
}: DeltaBadgeProps) {
	const rounded = Math.round(value);
	const isZero = rounded === 0;
	const isPositive = rounded > 0;

	// "Bénéfique" dépend du contexte :
	// - Demandes traitées : hausse = bénéfique (invertColors = false)
	// - SLA en retard : hausse = défavorable (invertColors = true)
	const isGood = isZero ? null : isPositive !== invertColors;

	const color = isZero
		? "text-muted-foreground bg-muted/50"
		: isGood
			? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
			: "text-rose-700 dark:text-rose-400 bg-rose-500/10";

	const Icon = isZero ? Minus : isPositive ? TrendingUp : TrendingDown;
	const sign = isZero ? "" : isPositive ? "+" : "";

	return (
		<span
			className={cn(
				"inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
				color,
				className,
			)}
		>
			<Icon className="h-3 w-3" />
			{sign}
			{rounded}%
		</span>
	);
}
