"use client";

import { api } from "@convex/_generated/api";
import { AlertTriangle, Eye, Flag, Loader2, ShieldAlert, Target } from "lucide-react";

import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";

import { FlatCard } from "../../components/my-space/flat-card";
import { PageHeader } from "../../components/my-space/page-header";
import { useOrg } from "../../shell/org-provider";

function KpiCard({
	label,
	value,
	icon: Icon,
	tone = "default",
}: {
	label: string;
	value: number;
	icon: React.ElementType;
	tone?: "default" | "warning" | "critical";
}) {
	const toneClasses =
		tone === "critical"
			? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
			: tone === "warning"
			? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
			: "bg-[#EBE6DC] dark:bg-[#383633]";
	return (
		<FlatCard className="p-4">
			<div className="flex items-center gap-3">
				<div className={`rounded-md p-2 ${toneClasses}`}>
					<Icon className="h-4 w-4" />
				</div>
				<div>
					<p className="text-xs text-muted-foreground uppercase tracking-wide">
						{label}
					</p>
					<p className="text-2xl font-bold tabular-nums">{value}</p>
				</div>
			</div>
		</FlatCard>
	);
}

export default function IntelligenceDashboard() {
	const { activeOrgId } = useOrg();

	const { data, isPending } = useAuthenticatedConvexQuery(
		api.functions.intelligence.getDashboardCounts,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	return (
		<div className="flex flex-1 flex-col gap-4 p-3 md:p-4 max-w-6xl mx-auto w-full">
			<PageHeader
				icon={<ShieldAlert className="h-5 w-5 text-rose-500" />}
				title="Renseignement diplomatique"
				subtitle="Profils surveillés, notes confidentielles et signalements actifs."
			/>

			{isPending ? (
				<div className="flex items-center justify-center py-12 text-muted-foreground">
					<Loader2 className="h-5 w-5 animate-spin mr-2" />
					Chargement…
				</div>
			) : !data ? (
				<FlatCard className="p-8 text-center text-sm text-muted-foreground">
					Aucune donnée disponible.
				</FlatCard>
			) : (
				<>
					<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
						<KpiCard
							label="Profils surveillés"
							value={data.watchedTargetsCount}
							icon={Eye}
						/>
						<KpiCard label="Notes totales" value={data.totalNotes} icon={Target} />
						<KpiCard
							label="Notes critiques"
							value={data.criticalNotes}
							icon={AlertTriangle}
							tone="critical"
						/>
						<KpiCard
							label="Notes élevées"
							value={data.highNotes}
							icon={AlertTriangle}
							tone="warning"
						/>
						<KpiCard label="Signalements" value={data.flaggedNotes} icon={Flag} />
						<KpiCard label="Risques" value={data.riskNotes} icon={AlertTriangle} />
					</div>

					<FlatCard className="p-4 text-xs text-muted-foreground">
						<p className="font-medium text-foreground mb-1">Cloisonnement</p>
						Ce module est réservé aux porteurs du preset{" "}
						<code className="text-[11px] bg-muted px-1 rounded">
							intelligence_services
						</code>
						. Les notes attachées ici ne sont pas visibles depuis les autres
						modules (Affaires consulaires, Affaires diplomatiques).
					</FlatCard>
				</>
			)}
		</div>
	);
}
