"use client";

import { api } from "@convex/_generated/api";
import { BarChart3, Loader2, Building2, Users, Clock, Calendar } from "lucide-react";
import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@workspace/ui/components/table";
import { FlatCard } from "../../components/my-space/flat-card";
import { PageHeader } from "../../components/my-space/page-header";
import { useOrg } from "../../shell/org-provider";

function KpiCard({
	label,
	value,
	icon: Icon,
}: {
	label: string;
	value: number;
	icon: React.ElementType;
}) {
	return (
		<FlatCard className="p-4">
			<div className="flex items-center gap-3">
				<div className="rounded-md bg-[#EBE6DC] dark:bg-[#383633] p-2">
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

export default function NetworkIntelligencePage() {
	const { activeOrgId } = useOrg();

	const { data, isPending } = useAuthenticatedConvexQuery(
		api.functions.ministry.getMinistryStats,
		activeOrgId ? { ministryId: activeOrgId } : "skip",
	);

	return (
		<div className="flex flex-1 flex-col gap-4 p-3 md:p-4 max-w-6xl mx-auto w-full">
			<PageHeader
				icon={<BarChart3 className="h-5 w-5" />}
				title="Intelligence réseau"
				subtitle="Tableau de bord exécutif consolidé du réseau diplomatique."
			/>

			{isPending ? (
				<div className="flex items-center justify-center py-12 text-muted-foreground">
					<Loader2 className="h-5 w-5 animate-spin mr-2" />
					Chargement des indicateurs réseau…
				</div>
			) : !data ? (
				<FlatCard className="p-8 text-center text-sm text-muted-foreground">
					<Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
					Aucune donnée disponible.
				</FlatCard>
			) : (
				<>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
						<KpiCard label="Agents" value={data.totals.memberCount} icon={Users} />
						<KpiCard label="Demandes en attente" value={data.totals.pendingRequests} icon={Clock} />
						<KpiCard label="Services actifs" value={data.totals.activeServices} icon={Building2} />
						<KpiCard label="RDV à venir" value={data.totals.upcomingAppointments} icon={Calendar} />
					</div>

					<FlatCard>
						<div className="p-3 border-b border-foreground/5">
							<h2 className="text-sm font-semibold">Répartition par organisme</h2>
						</div>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Organisme</TableHead>
									<TableHead>Type</TableHead>
									<TableHead className="text-right">Agents</TableHead>
									<TableHead className="text-right">Demandes en attente</TableHead>
									<TableHead className="text-right">Services actifs</TableHead>
									<TableHead className="text-right">RDV à venir</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.breakdown.map((row: any) => (
									<TableRow key={row.orgId as string}>
										<TableCell className="font-medium">{row.orgName}</TableCell>
										<TableCell className="text-xs text-muted-foreground">
											{row.orgType}
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{row.memberCount}
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{row.pendingRequests}
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{row.activeServices}
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{row.upcomingAppointments}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</FlatCard>

					{data.breakdown.length === 0 && (
						<p className="text-sm text-muted-foreground text-center py-4">
							Aucun organisme rattaché à ce ministère pour l'instant.
						</p>
					)}
				</>
			)}
		</div>
	);
}
