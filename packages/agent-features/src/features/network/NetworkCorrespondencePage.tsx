"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Mailbox, Loader2, Building2 } from "lucide-react";
import { useMemo, useState } from "react";
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

const STATUSES = [
	{ value: "all", label: "Tous statuts" },
	{ value: "draft", label: "Brouillon" },
	{ value: "pending", label: "En attente" },
	{ value: "approved", label: "Approuvé" },
	{ value: "sent", label: "Envoyé" },
	{ value: "received", label: "Reçu" },
	{ value: "archived", label: "Archivé" },
];

export default function NetworkCorrespondencePage() {
	const { activeOrgId } = useOrg();
	const [orgFilter, setOrgFilter] = useState<string>("all");
	const [statusFilter, setStatusFilter] = useState<string>("all");

	const filters = useMemo(
		() => ({
			childOrgId: orgFilter !== "all" ? (orgFilter as Id<"orgs">) : undefined,
			status: statusFilter !== "all" ? statusFilter : undefined,
		}),
		[orgFilter, statusFilter],
	);

	const { data, isPending } = useAuthenticatedConvexQuery(
		api.functions.ministry.getMinistryCorrespondence,
		activeOrgId ? { ministryId: activeOrgId, filters, limit: 200 } : "skip",
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
				icon={<Mailbox className="h-5 w-5" />}
				title="Correspondance réseau"
				subtitle="Courriers du réseau diplomatique en lecture seule."
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
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-48">
						<SelectValue placeholder="Statut" />
					</SelectTrigger>
					<SelectContent>
						{STATUSES.map((s) => (
							<SelectItem key={s.value} value={s.value}>
								{s.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{isPending ? (
				<div className="flex items-center justify-center py-12 text-muted-foreground">
					<Loader2 className="h-5 w-5 animate-spin mr-2" />
					Chargement des courriers du réseau…
				</div>
			) : !data || data.items.length === 0 ? (
				<FlatCard className="p-8 text-center text-sm text-muted-foreground">
					<Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
					Aucun courrier dans le réseau pour ces filtres.
				</FlatCard>
			) : (
				<FlatCard>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Référence</TableHead>
								<TableHead>Organisme</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>Sujet</TableHead>
								<TableHead>Statut</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.items.map((item: any) => (
								<TableRow key={item._id}>
									<TableCell className="font-mono text-xs">
										{item.reference ?? item.referenceCode ?? "—"}
									</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{nameByOrg.get(item.orgId as string) ?? "—"}
									</TableCell>
									<TableCell>
										<Badge variant="outline" className="text-xs">
											{item.typeCode ?? item.type ?? "—"}
										</Badge>
									</TableCell>
									<TableCell className="max-w-[280px] truncate">
										{item.subject ?? item.title ?? "—"}
									</TableCell>
									<TableCell>
										<Badge variant="secondary" className="text-xs capitalize">
											{item.status}
										</Badge>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</FlatCard>
			)}

			{data && (
				<p className="text-sm text-muted-foreground">
					<strong className="text-foreground">{data.items.length}</strong>{" "}
					courriers · vue lecture seule
				</p>
			)}
		</div>
	);
}
