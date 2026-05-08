"use client";

import { api } from "@convex/_generated/api";
import "mapbox-gl/dist/mapbox-gl.css";
import * as mapboxgl from "mapbox-gl";
import { Globe, Loader2, MapPin } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { FlatCard, PageHeader } from "@workspace/agent-features/components/my-space";
import { useOrg } from "@workspace/agent-features/shell";
import { Switch } from "@workspace/ui/components/switch";
import { Label } from "@workspace/ui/components/label";

import { MAPBOX_CONFIG, getCapitalCoords } from "@/lib/mapbox";

interface MapPoint {
	id: string;
	targetType: string;
	targetId: string;
	label: string;
	country?: string;
	coords: [number, number];
	geolocated: boolean;
}

const COLOR_GPS = "#e11d48";
const COLOR_FALLBACK = "#fb923c";

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

export default function IntelligenceMapInteractive() {
	const { activeOrgId } = useOrg();
	const { theme } = useTheme();

	const mapContainer = useRef<HTMLDivElement>(null);
	const map = useRef<mapboxgl.Map | null>(null);
	const markersRef = useRef<mapboxgl.Marker[]>([]);
	const [mapReady, setMapReady] = useState(false);
	const [showFallback, setShowFallback] = useState(false);

	const { data: serverPoints, isPending } = useAuthenticatedConvexQuery(
		api.functions.intelligence.getMapData,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	const points = useMemo<MapPoint[]>(() => {
		if (!serverPoints) return [];
		return serverPoints
			.map((p) => {
				if (p.lat !== undefined && p.lng !== undefined) {
					return {
						id: `${p.targetType}:${p.targetId}`,
						targetType: p.targetType,
						targetId: p.targetId,
						label: p.label || "(sans nom)",
						country: p.country,
						coords: [p.lng, p.lat] as [number, number],
						geolocated: true,
					};
				}
				if (!showFallback) return null;
				const cap = getCapitalCoords(p.country);
				if (cap) {
					return {
						id: `${p.targetType}:${p.targetId}`,
						targetType: p.targetType,
						targetId: p.targetId,
						label: p.label || "(sans nom)",
						country: p.country,
						coords: cap,
						geolocated: false,
					};
				}
				return null;
			})
			.filter((p): p is MapPoint => p !== null);
	}, [serverPoints, showFallback]);

	const stats = useMemo(() => {
		if (!serverPoints)
			return { total: 0, geolocated: 0, withoutGps: 0, countries: 0 };
		const geolocated = serverPoints.filter(
			(p) => p.lat !== undefined && p.lng !== undefined,
		).length;
		const countries = new Set(
			serverPoints.map((p) => p.country).filter(Boolean),
		).size;
		return {
			total: serverPoints.length,
			geolocated,
			withoutGps: serverPoints.length - geolocated,
			countries,
		};
	}, [serverPoints]);

	// ── Init map (mirror backoffice users-map-view) ────────────────────────
	useEffect(() => {
		if (!mapContainer.current) return;
		if (map.current) return;
		if (!MAPBOX_CONFIG.accessToken) return;

		const isDark = theme === "dark";
		const style = isDark ? MAPBOX_CONFIG.styleDark : MAPBOX_CONFIG.styleLight;

		map.current = new mapboxgl.Map({
			container: mapContainer.current,
			style,
			center: [10, 20],
			zoom: 1.5,
			projection: "globe" as never,
			interactive: true,
			attributionControl: false,
			accessToken: MAPBOX_CONFIG.accessToken,
		});

		map.current.on("style.load", () => {
			map.current?.setFog({
				color: isDark ? "rgb(10, 10, 20)" : "rgb(220, 220, 230)",
				"high-color": isDark ? "rgb(20, 20, 40)" : "rgb(180, 180, 200)",
				"horizon-blend": 0.05,
				"star-intensity": isDark ? 0.6 : 0,
			});
			setMapReady(true);
			// Force resize after the layout settles
			setTimeout(() => map.current?.resize(), 50);
		});

		return () => {
			markersRef.current.forEach((m) => m.remove());
			markersRef.current = [];
			map.current?.remove();
			map.current = null;
			setMapReady(false);
		};
	}, [theme]);

	// ── Refresh markers ──────────────────────────────────────────────────────
	useEffect(() => {
		if (!map.current || !mapReady) return;
		const m = map.current;

		markersRef.current.forEach((mk) => mk.remove());
		markersRef.current = [];

		for (const p of points) {
			const color = p.geolocated ? COLOR_GPS : COLOR_FALLBACK;

			const el = document.createElement("div");
			el.style.cursor = "pointer";
			el.innerHTML = `
				<div style="position: relative; width: 18px; height: 18px;">
					<div style="position: absolute; inset: 0; border-radius: 9999px; background-color: ${color}; opacity: 0.3; animation: ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></div>
					<div style="position: relative; width: 14px; height: 14px; margin: 2px; border-radius: 9999px; background-color: ${color}; border: 2px solid #ffffff;"></div>
				</div>
			`;

			const popup = new mapboxgl.Popup({ offset: 14, closeButton: false }).setHTML(
				`<div style="font-family: system-ui, sans-serif; min-width: 200px; padding: 4px 6px;">
					<div style="font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: ${color}; margin-bottom: 4px;">${p.geolocated ? "GPS précis" : "Capitale (fallback)"}</div>
					<div style="font-weight: 600; font-size: 13px; margin-bottom: 2px;">${escapeHtml(p.label)}</div>
					${p.country ? `<div style="font-size: 11px; opacity: 0.6;">${escapeHtml(p.country)}</div>` : ""}
					<a href="/intelligence/profiles/${p.targetType}/${p.targetId}" style="display: inline-block; margin-top: 8px; font-size: 11px; color: ${color}; text-decoration: underline;">Voir la fiche →</a>
				</div>`,
			);

			const marker = new mapboxgl.Marker({ element: el })
				.setLngLat(p.coords)
				.setPopup(popup)
				.addTo(m);

			markersRef.current.push(marker);
		}
	}, [points, mapReady]);

	const noToken = !MAPBOX_CONFIG.accessToken;

	return (
		<div className="flex flex-col gap-4 p-4 lg:p-6 max-w-6xl mx-auto w-full">
			<PageHeader
				icon={<Globe className="h-5 w-5 text-rose-500" />}
				title="Carte du renseignement"
				subtitle="Répartition mondiale des profils surveillés et contacts diplomatiques."
			/>

			{/* Stats tiles */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
				<FlatCard className="p-4">
					<p className="text-[11px] text-muted-foreground uppercase tracking-wide">
						Total
					</p>
					<p className="text-2xl font-bold tabular-nums">{stats.total}</p>
				</FlatCard>
				<FlatCard className="p-4">
					<p className="text-[11px] text-muted-foreground uppercase tracking-wide">
						GPS précis
					</p>
					<p className="text-2xl font-bold tabular-nums">{stats.geolocated}</p>
				</FlatCard>
				<FlatCard className="p-4">
					<p className="text-[11px] text-muted-foreground uppercase tracking-wide">
						Sans GPS
					</p>
					<p className="text-2xl font-bold tabular-nums">{stats.withoutGps}</p>
				</FlatCard>
				<FlatCard className="p-4">
					<p className="text-[11px] text-muted-foreground uppercase tracking-wide">
						Pays
					</p>
					<p className="text-2xl font-bold tabular-nums">{stats.countries}</p>
				</FlatCard>
			</div>

			{/* Toggle fallback */}
			{stats.withoutGps > 0 && (
				<FlatCard className="p-3 flex items-center gap-3">
					<Switch
						id="map-fallback"
						checked={showFallback}
						onCheckedChange={setShowFallback}
					/>
					<Label htmlFor="map-fallback" className="text-xs cursor-pointer flex-1">
						Afficher les {stats.withoutGps} profils sans GPS sur la capitale de leur pays
					</Label>
				</FlatCard>
			)}

			{/* Map */}
			<div className="relative h-[600px] w-full overflow-hidden rounded-xl border border-border/50 bg-muted/20">
				<div ref={mapContainer} className="absolute inset-0 h-full w-full" />

				{noToken ? (
					<div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
						<MapPin className="h-8 w-8 text-muted-foreground/40 mb-2" />
						<p className="text-sm font-medium">Carte indisponible</p>
						<p className="text-xs text-muted-foreground mt-1 max-w-md">
							Configurez{" "}
							<code className="text-[10px] bg-muted/60 px-1 py-0.5 rounded">
								NEXT_PUBLIC_MAPBOX_TOKEN
							</code>{" "}
							dans agent-web/.env.local pour activer la carte interactive.
						</p>
					</div>
				) : (
					<>
						{(isPending || !mapReady) && (
							<div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none">
								<Loader2 className="h-5 w-5 animate-spin mr-2" />
								<span className="text-sm text-muted-foreground">
									{isPending ? "Chargement des points…" : "Initialisation carte…"}
								</span>
							</div>
						)}
						{mapReady && points.length === 0 && !isPending && (
							<div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto">
								<div className="bg-background/95 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/50 text-center">
									<p className="text-xs font-medium">
										{stats.withoutGps > 0
											? `Aucun profil géolocalisé. Activez le fallback ou lancez la migration.`
											: "Aucune cible sur cette org."}
									</p>
								</div>
							</div>
						)}
					</>
				)}
			</div>

			{/* Legend */}
			<FlatCard className="p-3 flex items-center justify-between text-xs text-muted-foreground">
				<div className="flex items-center gap-3">
					<span className="flex items-center gap-1.5">
						<span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-background" />
						GPS précis
					</span>
					{showFallback && (
						<span className="flex items-center gap-1.5">
							<span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-400 ring-2 ring-background" />
							Capitale (fallback)
						</span>
					)}
				</div>
				<span className="flex items-center gap-1">
					<MapPin className="h-3 w-3" />
					{points.length} affiché{points.length > 1 ? "s" : ""}
				</span>
			</FlatCard>
		</div>
	);
}
