"use client";

import Link from "next/link";
import { FileStack } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Id } from "@convex/_generated/dataModel";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { Skeleton } from "@/components/ui/skeleton";

interface ServiceStat {
	serviceId: string;
	name: string;
	count: number;
}

interface TopServicesListProps {
	orgId: Id<"orgs">;
	serviceStats?: ServiceStat[];
	loading?: boolean;
}

const ACCENTS = ["#6366f1", "#10b981", "#f59e0b", "#3b82f6", "#ef4444"];

/**
 * Top 5 services demandés — barres proportionnelles horizontales.
 */
export function TopServicesList({
	orgId,
	serviceStats,
	loading,
}: TopServicesListProps) {
	const { t } = useTranslation();
	const top = (serviceStats ?? []).slice(0, 5);
	const max = top.reduce((m, s) => Math.max(m, s.count), 0);

	return (
		<FlatCard>
			<div className="p-3 lg:p-4">
				<SectionHeader
					icon={<FileStack className="h-4 w-4" />}
					title={t(
						"superadmin.organizations.overview.topServices.title",
						"Top services",
					)}
					actions={
						<Link
							href={`/reps/${orgId}?tab=services`}
							className="text-xs text-muted-foreground hover:text-foreground"
						>
							Voir tout →
						</Link>
					}
				/>

				{loading ? (
					<div className="space-y-2">
						{[1, 2, 3, 4, 5].map((i) => (
							<Skeleton key={i} className="h-7 w-full" />
						))}
					</div>
				) : top.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
						<FileStack className="h-8 w-8 mb-2 opacity-30" />
						<p className="text-xs">Aucune donnée sur la période</p>
					</div>
				) : (
					<ul className="space-y-2.5">
						{top.map((s, idx) => {
							const pct = max > 0 ? (s.count / max) * 100 : 0;
							const accent = ACCENTS[idx] ?? "#6366f1";
							return (
								<li key={s.serviceId} className="space-y-1">
									<div className="flex items-center justify-between gap-2 text-xs">
										<span className="truncate font-medium">{s.name}</span>
										<span className="tabular-nums text-muted-foreground shrink-0">
											{s.count}
										</span>
									</div>
									<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
										<div
											className="h-full rounded-full transition-all"
											style={{ width: `${pct}%`, background: accent }}
										/>
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</div>
		</FlatCard>
	);
}
