"use client";

import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";
import type { HealthCheck } from "./shared/types";

interface HealthScoreProps {
	orgId: Id<"orgs">;
}

/**
 * W-I — Score de santé pondéré (0-100) + checklist. Réservé super-admin.
 */
export function HealthScore({ orgId }: HealthScoreProps) {
	const { t } = useTranslation();

	const { data, isPending } = useAuthenticatedConvexQuery(
		api.functions.orgOverview.getHealthScore,
		{ orgId },
	);

	const score = (data as { score?: number } | undefined)?.score ?? 0;
	const checks = (data as { checks?: HealthCheck[] } | undefined)?.checks ?? [];

	const accent =
		score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
	const label =
		score >= 80 ? "Opérationnel" : score >= 50 ? "À améliorer" : "Critique";

	// Géométrie du cercle progressif SVG
	const size = 80;
	const strokeWidth = 8;
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const offset = circumference - (score / 100) * circumference;

	return (
		<FlatCard>
			<div className="p-3 lg:p-4">
				<SectionHeader
					icon={<ShieldCheck className="h-4 w-4" />}
					iconBgClass="bg-indigo-500/10"
					iconTextClass="text-indigo-600 dark:text-indigo-400"
					title={t(
						"superadmin.organizations.overview.health.title",
						"Santé de la configuration",
					)}
				/>

				{isPending ? (
					<div className="flex items-center gap-4">
						<Skeleton className="h-20 w-20 rounded-full" />
						<div className="flex-1 space-y-2">
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-3/4" />
						</div>
					</div>
				) : (
					<div className="flex flex-col sm:flex-row items-center gap-4">
						{/* Score circulaire */}
						<div className="relative shrink-0">
							<svg width={size} height={size} className="-rotate-90">
								<circle
									cx={size / 2}
									cy={size / 2}
									r={radius}
									fill="none"
									stroke="currentColor"
									strokeOpacity={0.12}
									strokeWidth={strokeWidth}
								/>
								<circle
									cx={size / 2}
									cy={size / 2}
									r={radius}
									fill="none"
									stroke={accent}
									strokeWidth={strokeWidth}
									strokeDasharray={circumference}
									strokeDashoffset={offset}
									strokeLinecap="round"
									className="transition-all duration-500"
								/>
							</svg>
							<div className="absolute inset-0 flex flex-col items-center justify-center">
								<span
									className="text-2xl font-bold tabular-nums"
									style={{ color: accent }}
								>
									{score}
								</span>
								<span className="text-[9px] text-muted-foreground uppercase tracking-wider -mt-1">
									{label}
								</span>
							</div>
						</div>

						{/* Checklist */}
						<ul className="flex-1 space-y-1 w-full">
							{checks.map((check) => (
								<li
									key={check.key}
									className={cn(
										"flex items-center gap-2 text-xs",
										check.passed
											? "text-foreground"
											: "text-muted-foreground",
									)}
								>
									{check.passed ? (
										<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
									) : (
										<XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
									)}
									<span className="truncate">{check.label}</span>
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
		</FlatCard>
	);
}
