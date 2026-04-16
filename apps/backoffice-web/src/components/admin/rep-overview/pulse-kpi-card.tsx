import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { FlatCard } from "@/components/design-system/flat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DeltaBadge } from "./shared/delta-badge";
import { Sparkline } from "./shared/sparkline";

interface PulseKpiCardProps {
	icon: LucideIcon;
	label: string;
	value: number | string;
	accent: string;
	/** Petite note secondaire sous la valeur (ex : « Prochain à 14h30 »). */
	footnote?: string;
	/** Variation vs période précédente en pourcentage. */
	delta?: number;
	/** Si vrai, une variation positive est rose (ex : SLA en retard). */
	invertDeltaColors?: boolean;
	/** Série pour la sparkline (7 points typiques). */
	sparklineData?: number[];
	/** Lien de navigation déclenché au click. */
	cta?: string;
	/** Si vrai, la carte pulse visuellement (signal critique). */
	pulseWhenNonZero?: boolean;
	loading?: boolean;
}

/**
 * KPI enrichi — remplace le KpiCard statique : valeur + delta + sparkline +
 * accent bar sur la gauche + optional pulse ring.
 * Cohérent Design System v3.0 "Slate Trust & Authority".
 */
export function PulseKpiCard({
	icon: Icon,
	label,
	value,
	accent,
	footnote,
	delta,
	invertDeltaColors,
	sparklineData,
	cta,
	pulseWhenNonZero,
	loading,
}: PulseKpiCardProps) {
	const hasValue =
		typeof value === "number" ? value > 0 : Boolean(value && value !== "0");
	const shouldPulse = pulseWhenNonZero && hasValue;

	const content = (
		<FlatCard
			className={cn(
				"relative overflow-hidden transition-all",
				cta && "hover:bg-secondary/80 cursor-pointer",
			)}
		>
			<div
				className={cn(
					"absolute left-0 top-0 h-full w-1 rounded-l-xl",
					shouldPulse && "animate-pulse",
				)}
				style={{ background: accent }}
			/>
			<div className="p-4 pl-5">
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0 flex-1">
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
							{label}
						</p>
						{loading ? (
							<Skeleton className="h-8 w-16 mt-1" />
						) : (
							<p className="text-2xl font-bold tracking-tight mt-0.5 tabular-nums">
								{value}
							</p>
						)}
						{footnote && !loading && (
							<p className="text-[11px] text-muted-foreground mt-0.5 truncate">
								{footnote}
							</p>
						)}
					</div>
					<div
						className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
						style={{ background: `${accent}18` }}
					>
						<Icon className="h-5 w-5" style={{ color: accent }} />
					</div>
				</div>

				{(typeof delta === "number" || sparklineData?.length) && !loading && (
					<div className="mt-2 flex items-center justify-between gap-2">
						{typeof delta === "number" ? (
							<DeltaBadge value={delta} invertColors={invertDeltaColors} />
						) : (
							<span />
						)}
						{sparklineData && sparklineData.length > 1 && (
							<Sparkline data={sparklineData} color={accent} width={72} height={20} />
						)}
					</div>
				)}
			</div>
		</FlatCard>
	);

	if (cta) {
		return (
			<Link href={cta} className="block">
				{content}
			</Link>
		);
	}
	return content;
}
