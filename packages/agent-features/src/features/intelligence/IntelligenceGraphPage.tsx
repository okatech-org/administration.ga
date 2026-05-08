"use client";

import { api } from "@convex/_generated/api";
import { Loader2, Network as NetworkIcon, Search } from "lucide-react";
import { useState } from "react";

import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { FlatCard } from "../../components/my-space/flat-card";
import { PageHeader } from "../../components/my-space/page-header";
import { useOrg } from "../../shell/org-provider";

type TargetType = "profile" | "child_profile" | "diplomatic_target" | "agent";

const TYPE_LABELS: Record<TargetType, string> = {
	profile: "Profil",
	child_profile: "Mineur",
	diplomatic_target: "Cible diplo.",
	agent: "Agent",
};

const RELATIONSHIP_LABELS: Record<string, string> = {
	family: "Famille",
	business: "Affaires",
	friendship: "Amitié",
	mentor: "Mentor",
	suspect: "Suspect",
	accomplice: "Complice",
	contact: "Contact",
	other: "Autre",
};

const STRENGTH_COLORS: Record<string, string> = {
	weak: "bg-muted/50 text-muted-foreground",
	medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
	strong: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export default function IntelligenceGraphPage() {
	const { activeOrgId } = useOrg();
	const [rootType, setRootType] = useState<TargetType>("profile");
	const [rootId, setRootId] = useState("");
	const [depth, setDepth] = useState(2);
	const [submitted, setSubmitted] = useState<{
		type: TargetType;
		id: string;
		depth: number;
	} | null>(null);

	const { data: graph, isLoading } = useAuthenticatedConvexQuery(
		api.functions.intelligenceGraph.traverseGraph,
		activeOrgId && submitted
			? {
					orgId: activeOrgId,
					rootType: submitted.type,
					rootId: submitted.id,
					depth: submitted.depth,
				}
			: "skip",
	);

	if (!activeOrgId) return null;

	const handleSearch = () => {
		const id = rootId.trim();
		if (!id) return;
		setSubmitted({ type: rootType, id, depth });
	};

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6">
			<PageHeader
				icon={<NetworkIcon className="size-5" />}
				title="Graphe relationnel"
				subtitle="Exploration multi-sauts du réseau d'une cible (profondeur configurable, max 4)."
			/>

			<FlatCard className="flex flex-wrap items-end gap-3 p-4">
				<div className="flex flex-col gap-1.5">
					<Label>Type</Label>
					<Select
						value={rootType}
						onValueChange={(v) => setRootType(v as TargetType)}
					>
						<SelectTrigger className="w-40">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{Object.entries(TYPE_LABELS).map(([k, label]) => (
								<SelectItem key={k} value={k}>
									{label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="root-id">ID racine</Label>
					<Input
						id="root-id"
						className="w-72 font-mono text-xs"
						placeholder="ex: js7..."
						value={rootId}
						onChange={(e) => setRootId(e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<Label>Profondeur</Label>
					<Select
						value={String(depth)}
						onValueChange={(v) => setDepth(Number(v))}
					>
						<SelectTrigger className="w-24">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{[1, 2, 3, 4].map((d) => (
								<SelectItem key={d} value={String(d)}>
									{d}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<Button onClick={handleSearch} disabled={!rootId.trim()}>
					<Search className="size-4" />
					Explorer
				</Button>
			</FlatCard>

			{submitted && isLoading ? (
				<Skeleton className="h-32 w-full" />
			) : submitted && graph ? (
				<>
					<FlatCard className="flex flex-wrap gap-4 p-4 text-sm">
						<div>
							<span className="text-muted-foreground">Nœuds </span>
							<span className="font-semibold">{graph.nodeCount}</span>
						</div>
						<div>
							<span className="text-muted-foreground">Liens </span>
							<span className="font-semibold">{graph.edgeCount}</span>
						</div>
						<div>
							<span className="text-muted-foreground">Profondeur </span>
							<span className="font-semibold">{graph.depth}</span>
						</div>
						{graph.truncated && (
							<Badge variant="outline" className="text-[10px]">
								Tronqué (200 max)
							</Badge>
						)}
					</FlatCard>

					<div className="grid gap-4 md:grid-cols-2">
						<FlatCard className="flex flex-col gap-2 p-4">
							<div className="text-xs font-semibold text-muted-foreground">
								Nœuds atteints
							</div>
							<div className="flex max-h-96 flex-col gap-1 overflow-auto">
								{graph.nodes.map((n) => (
									<div
										key={`${n.type}-${n.id}`}
										className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-1 text-xs"
									>
										<Badge variant="outline" className="text-[9px]">
											d{n.depth}
										</Badge>
										<Badge variant="outline" className="text-[9px]">
											{TYPE_LABELS[n.type as TargetType] ?? n.type}
										</Badge>
										<span className="truncate font-mono">{n.id}</span>
									</div>
								))}
							</div>
						</FlatCard>

						<FlatCard className="flex flex-col gap-2 p-4">
							<div className="text-xs font-semibold text-muted-foreground">
								Arêtes
							</div>
							<div className="flex max-h-96 flex-col gap-1 overflow-auto">
								{graph.edges.slice(0, 200).map((e) => (
									<div
										key={e.linkId}
										className="flex flex-col gap-0.5 rounded-md border border-border/50 px-2 py-1 text-xs"
									>
										<div className="flex flex-wrap items-center gap-1.5">
											<Badge variant="outline" className="text-[9px]">
												{RELATIONSHIP_LABELS[e.relationship] ??
													e.relationship}
											</Badge>
											{e.strength && (
												<Badge
													variant="outline"
													className={cn(
														"text-[9px]",
														STRENGTH_COLORS[e.strength],
													)}
												>
													{e.strength}
												</Badge>
											)}
											{e.verified && (
												<Badge variant="outline" className="text-[9px]">
													{e.verified}
												</Badge>
											)}
										</div>
										<div className="font-mono truncate text-[10px] text-muted-foreground">
											{e.from.type}#{e.from.id.slice(0, 8)} →{" "}
											{e.to.type}#{e.to.id.slice(0, 8)}
										</div>
									</div>
								))}
							</div>
						</FlatCard>
					</div>
				</>
			) : submitted ? (
				<FlatCard className="py-8 text-center text-sm text-muted-foreground">
					<Loader2 className="mx-auto size-6 animate-spin opacity-50" />
				</FlatCard>
			) : (
				<FlatCard className="py-12 text-center text-sm text-muted-foreground">
					Saisissez l'ID d'une cible pour explorer son réseau.
				</FlatCard>
			)}
		</div>
	);
}
