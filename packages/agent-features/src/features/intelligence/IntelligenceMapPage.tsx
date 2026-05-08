"use client";

import { api } from "@convex/_generated/api";
import { Globe, Loader2, MapPin } from "lucide-react";
import { useMemo } from "react";

import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";

import { FlatCard } from "../../components/my-space/flat-card";
import { PageHeader } from "../../components/my-space/page-header";
import { useOrg } from "../../shell/org-provider";

/**
 * Vue cartographique du module Renseignement.
 *
 * Première itération : agrégat textuel par pays (sans Mapbox).
 * Le rendu Mapbox sera branché en seconde itération une fois
 * `NEXT_PUBLIC_MAPBOX_TOKEN` configuré sur agent-web.
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
		<div className="flex flex-1 flex-col gap-4 p-3 md:p-4 max-w-6xl mx-auto w-full">
			<PageHeader
				icon={<Globe className="h-5 w-5 text-rose-500" />}
				title="Carte du renseignement"
				subtitle="Répartition mondiale des profils surveillés et contacts diplomatiques."
			/>

			<FlatCard className="p-3 text-xs border-l-4 border-l-amber-500 text-muted-foreground">
				<p className="font-medium text-foreground mb-1">
					Vue tabulaire — itération initiale
				</p>
				La carte interactive Mapbox sera disponible une fois{" "}
				<code className="bg-muted px-1 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code>{" "}
				configuré et la migration de geocoding exécutée. En attendant : agrégat
				par pays ci-dessous.
			</FlatCard>

			{isPending ? (
				<div className="flex items-center justify-center py-12 text-muted-foreground">
					<Loader2 className="h-5 w-5 animate-spin mr-2" />
					Chargement…
				</div>
			) : (
				<>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
						<FlatCard className="p-4">
							<p className="text-xs text-muted-foreground uppercase tracking-wide">
								Total points
							</p>
							<p className="text-2xl font-bold tabular-nums">{totals.total}</p>
						</FlatCard>
						<FlatCard className="p-4">
							<p className="text-xs text-muted-foreground uppercase tracking-wide">
								Géolocalisés (GPS)
							</p>
							<p className="text-2xl font-bold tabular-nums">
								{totals.geolocated}
							</p>
						</FlatCard>
						<FlatCard className="p-4">
							<p className="text-xs text-muted-foreground uppercase tracking-wide">
								Pays distincts
							</p>
							<p className="text-2xl font-bold tabular-nums">{grouped.length}</p>
						</FlatCard>
					</div>

					<FlatCard>
						<div className="p-3 border-b border-foreground/5">
							<h2 className="text-sm font-semibold flex items-center gap-2">
								<MapPin className="h-4 w-4" /> Répartition par pays
							</h2>
						</div>
						<div className="divide-y divide-foreground/5">
							{grouped.map((g) => (
								<div
									key={g.country}
									className="flex items-center justify-between p-3"
								>
									<div className="min-w-0">
										<p className="text-sm font-medium">{g.country}</p>
										<p className="text-xs text-muted-foreground truncate">
											{g.labels.join(" · ")}
											{g.geolocated + g.countryOnly > g.labels.length && " …"}
										</p>
									</div>
									<div className="flex items-center gap-2 text-xs shrink-0">
										<span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
											{g.geolocated} GPS
										</span>
										{g.countryOnly > 0 && (
											<span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
												{g.countryOnly} pays seul
											</span>
										)}
									</div>
								</div>
							))}
							{grouped.length === 0 && (
								<p className="p-6 text-center text-sm text-muted-foreground">
									Aucun point à afficher.
								</p>
							)}
						</div>
					</FlatCard>
				</>
			)}
		</div>
	);
}
