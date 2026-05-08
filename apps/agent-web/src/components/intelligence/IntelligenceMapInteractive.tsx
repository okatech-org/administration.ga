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

const KIND_COLOR = "#e11d48";
const KIND_COLOR_FALLBACK = "#fb923c";

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

	const mapContainer = useRef<HTMLDivElement | null>(null);
	const map = useRef<mapboxgl.Map | null>(null);
	const markersRef = useRef<mapboxgl.Marker[]>([]);
	const popupRef = useRef<mapboxgl.Popup | null>(null);
	const [mapReady, setMapReady] = useState(false);

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
	}, [serverPoints]);

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
		});

		return () => {
			markersRef.current.forEach((m) => m.remove());
			markersRef.current = [];
			popupRef.current?.remove();
			map.current?.remove();
			map.current = null;
			setMapReady(false);
		};
	}, [theme]);

	useEffect(() => {
		if (!map.current || !mapReady) return;
		const m = map.current;

		markersRef.current.forEach((mk) => mk.remove());
		markersRef.current = [];

		for (const p of points) {
			const color = p.geolocated ? KIND_COLOR : KIND_COLOR_FALLBACK;

			const el = document.createElement("div");
			el.style.cursor = "pointer";
			el.innerHTML = `
				<div style="position: relative; width: 18px; height: 18px;">
					<div style="position: absolute; inset: 0; border-radius: 9999px; background-color: ${color}; opacity: 0.25; animation: ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></div>
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

	const stats = useMemo(() => {
		const total = points.length;
		const geolocated = points.filter((p) => p.geolocated).length;
		const countries = new Set(points.map((p) => p.country).filter(Boolean)).size;
		return { total, geolocated, countries };
	}, [points]);

	return (
		<div className="flex flex-col gap-4 p-4 lg:p-6 max-w-6xl mx-auto w-full">
			<PageHeader
				icon={<Globe className="h-5 w-5 text-rose-500" />}
				title="Carte du renseignement"
				subtitle="Répartition mondiale des profils surveillés et contacts diplomatiques."
			/>

			<div className="grid grid-cols-3 gap-3">
				<FlatCard className="p-3">
					<p className="text-[11px] text-muted-foreground uppercase tracking-wide">
						Total
					</p>
					<p className="text-xl font-bold tabular-nums">{stats.total}</p>
				</FlatCard>
				<FlatCard className="p-3">
					<p className="text-[11px] text-muted-foreground uppercase tracking-wide">
						GPS précis
					</p>
					<p className="text-xl font-bold tabular-nums">{stats.geolocated}</p>
				</FlatCard>
				<FlatCard className="p-3">
					<p className="text-[11px] text-muted-foreground uppercase tracking-wide">
						Pays
					</p>
					<p className="text-xl font-bold tabular-nums">{stats.countries}</p>
				</FlatCard>
			</div>

			<FlatCard className="p-0 overflow-hidden">
				<div className="relative">
					<div ref={mapContainer} className="w-full" style={{ minHeight: 560 }} />
					{(isPending || !mapReady) && (
						<div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
							<Loader2 className="h-5 w-5 animate-spin mr-2" />
							{isPending ? "Chargement des points…" : "Initialisation carte…"}
						</div>
					)}
					{mapReady && points.length === 0 && !isPending && (
						<div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 pointer-events-none">
							<div className="bg-background/90 backdrop-blur-sm rounded-xl p-4 border border-border/50">
								<MapPin className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
								<p className="text-sm font-medium">Aucun point à afficher</p>
								<p className="text-xs text-muted-foreground mt-1">
									Aucun profil ni contact géolocalisé pour cette org.
								</p>
							</div>
						</div>
					)}
				</div>
				<div className="px-4 py-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
					<div className="flex items-center gap-3">
						<span className="flex items-center gap-1.5">
							<span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-background" />
							GPS précis
						</span>
						<span className="flex items-center gap-1.5">
							<span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-400 ring-2 ring-background" />
							Capitale (fallback)
						</span>
					</div>
					<span className="flex items-center gap-1">
						<MapPin className="h-3 w-3" /> {stats.total} point
						{stats.total > 1 ? "s" : ""}
					</span>
				</div>
			</FlatCard>
		</div>
	);
}
