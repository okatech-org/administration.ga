"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Network, Loader2, Building2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { Badge } from "@workspace/ui/components/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
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

const PHASES = [
	{ value: "all", label: "Toutes phases" },
	{ value: "targeting", label: "Ciblage" },
	{ value: "strategy", label: "Stratégie" },
	{ value: "outreach", label: "Approche" },
	{ value: "reporting", label: "Reporting" },
	{ value: "project", label: "Projet" },
];

export default function NetworkDiplomaticPipelinePage() {
	const { t } = useTranslation();
	const { activeOrgId } = useOrg();
	const [orgFilter, setOrgFilter] = useState<string>("all");
	const [phaseFilter, setPhaseFilter] = useState<string>("all");

	const filters = useMemo(
		() => ({
			childOrgId: orgFilter !== "all" ? (orgFilter as Id<"orgs">) : undefined,
			pipelinePhase: phaseFilter !== "all" ? phaseFilter : undefined,
		}),
		[orgFilter, phaseFilter],
	);

	const { data, isPending } = useAuthenticatedConvexQuery(
		api.functions.ministry.getMinistryDiplomaticPipeline,
		activeOrgId ? { ministryId: activeOrgId, filters } : "skip",
	);

	const { data: children } = useAuthenticatedConvexQuery(
		api.functions.orgs.listChildren,
		activeOrgId ? { parentOrgId: activeOrgId } : "skip",
	);

	const childOrgs = (children ?? []) as Array<{ _id: Id<"orgs">; name: string }>;
	const nameByOrg = useMemo(
		() => new Map(childOrgs.map((o) => [o._id as string, o.name])),
		[childOrgs],
	);

	return (
		<div className="flex flex-1 flex-col gap-4 p-3 md:p-4 max-w-6xl mx-auto w-full">
			<PageHeader
				icon={<Network className="h-5 w-5" />}
				title="Pipeline diplomatique réseau"
				subtitle="Vue consolidée des cibles, plans et projets de coopération du réseau."
			/>

			<div className="flex flex-wrap items-center gap-3">
				<Select value={orgFilter} onValueChange={setOrgFilter}>
					<SelectTrigger className="w-64">
						<SelectValue placeholder="Organisme" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Tous les organismes</SelectItem>
						{childOrgs.map((o) => (
							<SelectItem key={o._id} value={o._id}>
								{o.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={phaseFilter} onValueChange={setPhaseFilter}>
					<SelectTrigger className="w-48">
						<SelectValue placeholder="Phase" />
					</SelectTrigger>
					<SelectContent>
						{PHASES.map((p) => (
							<SelectItem key={p.value} value={p.value}>
								{p.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{isPending ? (
				<div className="flex items-center justify-center py-12 text-muted-foreground">
					<Loader2 className="h-5 w-5 animate-spin mr-2" />
					Chargement du pipeline réseau…
				</div>
			) : !data || data.targets.length === 0 ? (
				<FlatCard className="p-8 text-center text-sm text-muted-foreground">
					<Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
					Aucune cible identifiée pour les organismes rattachés.
				</FlatCard>
			) : (
				<FlatCard>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Cible</TableHead>
								<TableHead>Organisme</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>Phase</TableHead>
								<TableHead>Priorité</TableHead>
								<TableHead>Statut</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.targets.map((target: any) => (
								<TableRow key={target._id}>
									<TableCell className="font-medium">{target.name}</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{nameByOrg.get(target.orgId as string) ?? "—"}
									</TableCell>
									<TableCell>
										<Badge variant="outline" className="text-xs">
											{target.type}
										</Badge>
									</TableCell>
									<TableCell className="text-xs">
										{target.pipelinePhase ?? "—"}
									</TableCell>
									<TableCell>
										<Badge variant="secondary" className="text-xs capitalize">
											{target.priority}
										</Badge>
									</TableCell>
									<TableCell className="text-xs">{target.status}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</FlatCard>
			)}

			{data && (
				<div className="flex gap-3 text-sm text-muted-foreground">
					<span>
						<strong className="text-foreground">{data.targets.length}</strong> cibles
					</span>
					<span>
						<strong className="text-foreground">{data.plans.length}</strong> plans
					</span>
					<span>
						<strong className="text-foreground">{data.projects.length}</strong> projets
					</span>
				</div>
			)}
		</div>
	);
}
