"use client";

import { api } from "@convex/_generated/api";
import { Globe, Loader2, MapPin } from "lucide-react";
import { useMemo } from "react";

import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { FlatCard } from "../../components/my-space/flat-card";
import { PageHeader } from "../../components/my-space/page-header";
import { useOrg } from "../../shell/org-provider";

/**
 * Vue cartographique tabulaire (fallback sans Mapbox).
 * Activée quand `NEXT_PUBLIC_MAPBOX_TOKEN` n'est pas défini.
 */
export default function IntelligenceMapPage() {
	const { activeOrgId } = useOrg();

	const { data: points, isPending } = useAuthenticatedConvexQuery(
		api.functions.intelligence.getMapData,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	const grouped = useMemo(() => {
		if (!points) return [];
		const map = new Map<
			string,
			{
				country: string;
				geolocated: number;
				countryOnly: number;
				labels: string[];
			}
		>();
		for (const p of points) {
			const key = p.country ?? "—";
			const entry = map.get(key) ?? {
				country: key,
				geolocated: 0,
				countryOnly: 0,
				labels: [],
			};
			if (p.lat !== undefined && p.lng !== undefined) entry.geolocated += 1;
			else entry.countryOnly += 1;
			if (entry.labels.length < 4) entry.labels.push(p.label || "(sans nom)");
			map.set(key, entry);
		}
		return Array.from(map.values()).sort(
			(a, b) =>
				b.geolocated + b.countryOnly - (a.geolocated + a.countryOnly),
		);
	}, [points]);

	const totals = useMemo(() => {
		if (!points) return { total: 0, geolocated: 0 };
		return {
			total: points.length,
			geolocated: points.filter(
				(p) => p.lat !== undefined && p.lng !== undefined,
			).length,
		};
	}, [points]);

	return (
		<div className="flex flex-col gap-6 p-4 lg:p-6 overflow-y-auto citizen-scrollbar">
			<PageHeader
				icon={<Globe className="h-5 w-5 text-rose-500" />}
				title="Carte du renseignement"
				subtitle="Répartition mondiale des profils surveillés et contacts diplomatiques."
			/>

			<FlatCard className="p-3 border-l-4 border-l-amber-500/70">
				<p className="text-xs font-medium">Vue tabulaire</p>
				<p className="text-[11px] text-muted-foreground mt-1">
					Configurez{" "}
					<code className="text-[10px] bg-muted/50 px-1 py-0.5 rounded">
						NEXT_PUBLIC_MAPBOX_TOKEN
					</code>{" "}
					dans agent-web pour activer la carte interactive.
				</p>
			</FlatCard>

			<div className="grid grid-cols-3 gap-3">
				{isPending ? (
					<>
						<Skeleton className="h-[72px] rounded-xl" />
						<Skeleton className="h-[72px] rounded-xl" />
						<Skeleton className="h-[72px] rounded-xl" />
					</>
				) : (
					<>
						<FlatCard className="p-4">
							<p className="text-[11px] text-muted-foreground uppercase tracking-wide">
								Total
							</p>
							<p className="text-2xl font-bold tabular-nums">{totals.total}</p>
						</FlatCard>
						<FlatCard className="p-4">
							<p className="text-[11px] text-muted-foreground uppercase tracking-wide">
								GPS précis
							</p>
							<p className="text-2xl font-bold tabular-nums">{totals.geolocated}</p>
						</FlatCard>
						<FlatCard className="p-4">
							<p className="text-[11px] text-muted-foreground uppercase tracking-wide">
								Pays
							</p>
							<p className="text-2xl font-bold tabular-nums">{grouped.length}</p>
						</FlatCard>
					</>
				)}
			</div>

			<FlatCard>
				<div className="flex items-center gap-2.5 rounded-t-xl bg-muted/40 px-4 py-3 border-b border-border/50">
					<div className="rounded-md bg-rose-500/10 p-1.5">
						<MapPin className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
					</div>
					<span className="text-base font-bold flex-1">Répartition par pays</span>
					{grouped.length > 0 && (
						<Badge
							variant="outline"
							className="text-[10px] h-5 px-2 bg-muted/50 text-muted-foreground border-border/50"
						>
							{grouped.length}
						</Badge>
					)}
				</div>

				{isPending ? (
					<div className="p-4 space-y-2">
						<Skeleton className="h-12 w-full rounded-lg" />
						<Skeleton className="h-12 w-full rounded-lg" />
					</div>
				) : grouped.length === 0 ? (
					<p className="p-8 text-center text-sm text-muted-foreground">
						Aucun point à afficher.
					</p>
				) : (
					<div className="divide-y divide-border/30">
						{grouped.map((g) => (
							<div
								key={g.country}
								className="flex items-center justify-between px-4 py-3 gap-3"
							>
								<div className="min-w-0 flex-1">
									<p className="text-sm font-medium">{g.country}</p>
									<p className="text-[11px] text-muted-foreground truncate">
										{g.labels.join(" · ")}
										{g.geolocated + g.countryOnly > g.labels.length && " …"}
									</p>
								</div>
								<div className="flex items-center gap-1.5 shrink-0">
									<Badge
										variant="outline"
										className="text-[10px] h-5 px-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
									>
										{g.geolocated} GPS
									</Badge>
									{g.countryOnly > 0 && (
										<Badge
											variant="outline"
											className="text-[10px] h-5 px-2 bg-muted/50 text-muted-foreground border-border/50"
										>
											{g.countryOnly} pays
										</Badge>
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</FlatCard>
		</div>
	);
}
