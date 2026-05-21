"use client";

import Link from "next/link";
import { ClipboardList, Clock, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Id } from "@convex/_generated/dataModel";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { OverviewPeriod } from "./shared/types";

interface StatusCounts {
	draft: number;
	pending: number;
	processing: number;
	completed: number;
	cancelled: number;
}

interface RequestsBreakdownProps {
	orgId: Id<"orgs">;
	statusCounts?: StatusCounts;
	avgProcessingDays?: number;
	completedThisPeriod?: number;
	totalInPeriod?: number;
	period: OverviewPeriod;
	loading?: boolean;
}

const STATUS_CONFIG: Array<{
	key: keyof StatusCounts;
	label: string;
	color: string;
}> = [
	{ key: "draft", label: "Brouillons", color: "#9ca3af" },
	{ key: "pending", label: "En attente", color: "#f59e0b" },
	{ key: "processing", label: "En traitement", color: "#6366f1" },
	{ key: "completed", label: "Terminées", color: "#10b981" },
	{ key: "cancelled", label: "Annulées", color: "#ef4444" },
];

const PERIOD_LABELS: Record<OverviewPeriod, string> = {
	today: "aujourd'hui",
	"7d": "sur 7 jours",
	"30d": "sur 30 jours",
	"90d": "sur 90 jours",
};

/**
 * Répartition des demandes par statut — barre proportionnelle + KPI secondaires.
 */
export function RequestsBreakdown({
	orgId,
	statusCounts,
	avgProcessingDays,
	completedThisPeriod,
	totalInPeriod,
	period,
	loading,
}: RequestsBreakdownProps) {
	const { t } = useTranslation();

	if (loading || !statusCounts) {
		return (
			<FlatCard>
				<div className="p-3 lg:p-4 space-y-3">
					<Skeleton className="h-4 w-40" />
					<Skeleton className="h-2 w-full" />
					<div className="grid grid-cols-5 gap-2">
						{[1, 2, 3, 4, 5].map((i) => (
							<Skeleton key={i} className="h-12" />
						))}
					</div>
				</div>
			</FlatCard>
		);
	}

	const total = STATUS_CONFIG.reduce(
		(sum, { key }) => sum + statusCounts[key],
		0,
	);

	return (
		<FlatCard>
			<div className="p-3 lg:p-4">
				<SectionHeader
					icon={<ClipboardList className="h-4 w-4" />}
					title={t(
						"superadmin.organizations.overview.requests.title",
						"Pulse des demandes",
					)}
					actions={
						<Link
							href={`/reps/${orgId}?tab=requests`}
							className="text-xs text-muted-foreground hover:text-foreground"
						>
							Voir tout →
						</Link>
					}
				/>

				{/* Barre proportionnelle */}
				<div className="flex h-2 w-full overflow-hidden rounded-full bg-muted mb-3">
					{total === 0 ? (
						<div className="h-full w-full bg-muted" />
					) : (
						STATUS_CONFIG.map(({ key, color }) => {
							const count = statusCounts[key];
							const pct = (count / total) * 100;
							if (pct === 0) return null;
							return (
								<div
									key={key}
									style={{ width: `${pct}%`, background: color }}
									title={`${key}: ${count}`}
								/>
							);
						})
					)}
				</div>

				{/* Légende */}
				<div className="grid grid-cols-5 gap-2 mb-4">
					{STATUS_CONFIG.map(({ key, label, color }) => {
						const count = statusCounts[key];
						const pct = total > 0 ? Math.round((count / total) * 100) : 0;
						return (
							<div
								key={key}
								className="flex flex-col items-start gap-0.5 rounded-md p-1.5 hover:bg-muted/30 transition-colors"
							>
								<span className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
									<span
										className="h-1.5 w-1.5 rounded-full shrink-0"
										style={{ background: color }}
									/>
									{label}
								</span>
								<span className="text-base font-bold tabular-nums leading-tight">
									{count}
								</span>
								<span className="text-[10px] text-muted-foreground tabular-nums">
									{pct}%
								</span>
							</div>
						);
					})}
				</div>

				{/* KPI secondaires */}
				<div
					className={cn(
						"grid grid-cols-2 gap-3 pt-3 border-t border-border/40",
					)}
				>
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
							<Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
						</div>
						<div>
							<p className="text-[10px] text-muted-foreground uppercase tracking-wider">
								Temps moyen
							</p>
							<p className="text-sm font-bold tabular-nums">
								{avgProcessingDays ?? 0} j
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
							<CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
						</div>
						<div>
							<p className="text-[10px] text-muted-foreground uppercase tracking-wider">
								Terminées {PERIOD_LABELS[period]}
							</p>
							<p className="text-sm font-bold tabular-nums">
								{completedThisPeriod ?? 0}
								{typeof totalInPeriod === "number" && totalInPeriod > 0 && (
									<span className="text-xs font-normal text-muted-foreground ml-1">
										/ {totalInPeriod}
									</span>
								)}
							</p>
						</div>
					</div>
				</div>
			</div>
		</FlatCard>
	);
}
