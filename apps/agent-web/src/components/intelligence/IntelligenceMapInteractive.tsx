"use client";

import { api } from "@convex/_generated/api";
import "mapbox-gl/dist/mapbox-gl.css";
import * as mapboxgl from "mapbox-gl";
import { Globe, Loader2, MapPin } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef } from "react";

import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { FlatCard, PageHeader } from "@workspace/agent-features/components/my-space";
import { useOrg } from "@workspace/agent-features/shell";

import { MAPBOX_CONFIG, getCapitalCoords } from "@/lib/mapbox";

// biome-ignore lint/suspicious/noExplicitAny: mapbox-gl ESM/CJS interop
const mapbox = (mapboxgl as any).default ?? mapboxgl;

interface MapPoint {
	id: string;
	targetType: string;
	targetId: string;
	label: string;
	country?: string;
	coords: [number, number]; // [lng, lat]
	geolocated: boolean;
}

export default function IntelligenceMapInteractive() {
	const { activeOrgId } = useOrg();
	const { theme } = useTheme();
	const containerRef = useRef<HTMLDivElement | null>(null);
	const mapRef = useRef<mapboxgl.Map | null>(null);

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
		if (!containerRef.current || mapRef.current) return;
		if (!MAPBOX_CONFIG.accessToken) return;

		mapbox.accessToken = MAPBOX_CONFIG.accessToken;
		const map = new mapbox.Map({
			container: containerRef.current,
			style: theme === "dark" ? MAPBOX_CONFIG.styleDark : MAPBOX_CONFIG.styleLight,
			center: [10, 20],
			zoom: 1.5,
			projection: "globe",
		});
		mapRef.current = map;
		return () => {
			map.remove();
			mapRef.current = null;
		};
	}, [theme]);

	// Plot points
	useEffect(() => {
		const map = mapRef.current;
		if (!map || points.length === 0) return;

		const onLoad = () => {
			if (map.getSource("intel-points")) {
				(map.getSource("intel-points") as mapboxgl.GeoJSONSource).setData({
					type: "FeatureCollection",
					features: points.map((p) => ({
						type: "Feature",
						geometry: { type: "Point", coordinates: p.coords },
						properties: {
							id: p.id,
							label: p.label,
							targetType: p.targetType,
							targetId: p.targetId,
							geolocated: p.geolocated,
						},
					})),
				});
				return;
			}

			map.addSource("intel-points", {
				type: "geojson",
				data: {
					type: "FeatureCollection",
					features: points.map((p) => ({
						type: "Feature",
						geometry: { type: "Point", coordinates: p.coords },
						properties: {
							id: p.id,
							label: p.label,
							targetType: p.targetType,
							targetId: p.targetId,
							geolocated: p.geolocated,
						},
					})),
				},
				cluster: true,
				clusterMaxZoom: 8,
				clusterRadius: 40,
			});

			map.addLayer({
				id: "clusters",
				type: "circle",
				source: "intel-points",
				filter: ["has", "point_count"],
				paint: {
					"circle-color": [
						"step",
						["get", "point_count"],
						"#fda4af",
						10,
						"#f87171",
						50,
						"#dc2626",
					],
					"circle-radius": [
						"step",
						["get", "point_count"],
						14,
						10,
						20,
						50,
						28,
					],
					"circle-stroke-width": 2,
					"circle-stroke-color": "#fff",
				},
			});

			map.addLayer({
				id: "cluster-count",
				type: "symbol",
				source: "intel-points",
				filter: ["has", "point_count"],
				layout: {
					"text-field": "{point_count_abbreviated}",
					"text-size": 12,
				},
				paint: {
					"text-color": "#fff",
				},
			});

			map.addLayer({
				id: "intel-point",
				type: "circle",
				source: "intel-points",
				filter: ["!", ["has", "point_count"]],
				paint: {
					"circle-radius": 6,
					"circle-color": [
						"case",
						["get", "geolocated"],
						"#e11d48",
						"#fb923c",
					],
					"circle-stroke-width": 2,
					"circle-stroke-color": "#fff",
				},
			});

			map.on("click", "intel-point", (e) => {
				const f = e.features?.[0];
				if (!f) return;
				const props = f.properties as { label: string; targetType: string; targetId: string };
				const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
				new mapbox.Popup({ closeButton: true })
					.setLngLat(coords)
					.setHTML(
						`<div style="font-family:system-ui;font-size:13px">
							<div style="font-weight:600;margin-bottom:4px">${escapeHtml(props.label)}</div>
							<a href="/intelligence/profiles/${props.targetType}/${props.targetId}" style="color:#e11d48">Ouvrir la fiche →</a>
						</div>`,
					)
					.addTo(map);
			});

			map.on("click", "clusters", (e) => {
				const f = map.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
				if (!f) return;
				const clusterId = f.properties?.cluster_id as number;
				const source = map.getSource("intel-points") as mapboxgl.GeoJSONSource;
				source.getClusterExpansionZoom(clusterId, (err, zoom) => {
					if (err) return;
					map.easeTo({
						center: (f.geometry as GeoJSON.Point).coordinates as [number, number],
						zoom: zoom ?? map.getZoom() + 1,
					});
				});
			});

			map.on("mouseenter", "intel-point", () => {
				map.getCanvas().style.cursor = "pointer";
			});
			map.on("mouseleave", "intel-point", () => {
				map.getCanvas().style.cursor = "";
			});
		};

		if (map.loaded()) {
			onLoad();
		} else {
			map.once("load", onLoad);
		}
	}, [points]);

	return (
		<div className="flex flex-1 flex-col gap-4 p-3 md:p-4 max-w-6xl mx-auto w-full">
			<PageHeader
				icon={<Globe className="h-5 w-5 text-rose-500" />}
				title="Carte du renseignement"
				subtitle="Répartition mondiale des profils surveillés et contacts diplomatiques."
			/>

			<FlatCard className="p-0 overflow-hidden">
				<div className="relative">
					<div ref={containerRef} className="w-full h-[600px]" />
					{isPending && (
						<div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
							<Loader2 className="h-5 w-5 animate-spin mr-2" />
							Chargement…
						</div>
					)}
				</div>
				<div className="p-3 border-t border-foreground/5 flex items-center justify-between text-xs text-muted-foreground">
					<div className="flex items-center gap-3">
						<span className="flex items-center gap-1">
							<span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-white" />
							GPS précis
						</span>
						<span className="flex items-center gap-1">
							<span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-400 ring-2 ring-white" />
							Capitale (fallback)
						</span>
					</div>
					<span className="flex items-center gap-1">
						<MapPin className="h-3 w-3" /> {points.length} point
						{points.length > 1 ? "s" : ""}
					</span>
				</div>
			</FlatCard>
		</div>
	);
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}
