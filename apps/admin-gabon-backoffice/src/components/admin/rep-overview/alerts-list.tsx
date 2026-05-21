"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertRow } from "./shared/alert-row";
import type { OrgAlert } from "./shared/types";

interface AlertsListProps {
	alerts?: OrgAlert[];
	loading?: boolean;
}

/**
 * W-A — Panneau d'alertes opérationnelles. Trie par sévérité (critical > warning > info).
 */
export function AlertsList({ alerts, loading }: AlertsListProps) {
	const { t } = useTranslation();

	const sorted = [...(alerts ?? [])].sort((a, b) => {
		const order = { critical: 0, warning: 1, info: 2 } as const;
		return order[a.severity] - order[b.severity];
	});

	const criticalCount = sorted.filter((a) => a.severity === "critical").length;

	return (
		<FlatCard>
			<div className="p-3 lg:p-4">
				<SectionHeader
					icon={<AlertCircle className="h-4 w-4" />}
					iconBgClass={
						criticalCount > 0 ? "bg-rose-500/10" : "bg-amber-500/10"
					}
					iconTextClass={
						criticalCount > 0
							? "text-rose-600 dark:text-rose-400"
							: "text-amber-600 dark:text-amber-400"
					}
					title={t(
						"superadmin.organizations.overview.alerts.title",
						"Actions recommandées",
					)}
					actions={
						sorted.length > 0 && (
							<span className="text-[10px] text-muted-foreground uppercase tracking-wider tabular-nums">
								{sorted.length} à traiter
							</span>
						)
					}
				/>

				{loading ? (
					<div className="space-y-2">
						<Skeleton className="h-11 w-full" />
						<Skeleton className="h-11 w-full" />
						<Skeleton className="h-11 w-full" />
					</div>
				) : sorted.length === 0 ? (
					<div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
						<CheckCircle2 className="h-5 w-5 text-emerald-500" />
						<p className="text-sm">Aucune alerte — tout est à jour.</p>
					</div>
				) : (
					<div className="grid gap-2 md:grid-cols-2">
						{sorted.map((alert) => (
							<AlertRow key={alert.type} alert={alert} />
						))}
					</div>
				)}
			</div>
		</FlatCard>
	);
}
