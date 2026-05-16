"use client";

/**
 * ClusteredMap — composant Mapbox clusterisé générique.
 *
 * Source de vérité unique pour le pattern « beaucoup de points typés sur
 * une carte du monde ». Extrait de la vue carte du back-office
 * (apps/backoffice-web/src/components/admin/users-map-view.tsx).
 *
 * Caractéristiques :
 *   - Source GeoJSON unique avec `cluster: true` → Mapbox fusionne et
 *     éclate les points nativement (WebGL, pas de DOM par point).
 *   - 3 layers : `*-clusters` (disques colorés par type dominant à
 *     l'intérieur du cluster), `*-cluster-count` (compteur), `*-points`
 *     (cercles individuels colorés par `kind`).
 *   - Clic cluster → `getClusterExpansionZoom` + easeTo (le cluster
 *     éclate au niveau de zoom où Mapbox arrêterait de regrouper).
 *   - Clic point individuel → popup HTML personnalisable via
 *     `renderPopup`. Délégation d'événements sur le contenu du popup via
 *     `onPopupClick` (utile pour des boutons injectés en innerHTML).
 *   - Recentrage automatique sur `flyTo`.
 *   - Change de style à chaque thème (light/dark) en recréant l'instance.
 *
 * Exemple :
 *
 *   <ClusteredMap
 *     accessToken={MAPBOX_TOKEN}
 *     styleLight="mapbox://styles/.../light"
 *     styleDark="mapbox://styles/.../dark"
 *     theme={resolvedTheme}
 *     points={points}
 *     kindColors={{ user: "#3b82f6", event: "#f59e0b" }}
 *     renderPopup={(p) => `<b>${p.data?.name}</b>`}
 *   />
 */

import * as mapboxgl from "mapbox-gl";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ─────────────────────────────────────────────────

export interface ClusteredMapPoint {
	/** Stable ID — used as React key on internal lookups. */
	id: string;
	/** Type bucket. Drives the per-point color and the cluster dominant
	 *  color. Must be a key of `kindColors`. */
	kind: string;
	/** `[longitude, latitude]` — same convention as Mapbox GL. */
	coords: [number, number];
	/** Free-form data passed to `renderPopup` / `onPointClick`. */
	data?: Record<string, unknown>;
}

export interface ClusteredMapFlyTo {
	center: [number, number];
	zoom: number;
}

export interface ClusteredMapProps {
	/** Mapbox GL access token. Use `process.env.NEXT_PUBLIC_MAPBOX_TOKEN`. */
	accessToken: string;

	/** Points to render. Re-renders trigger a single `source.setData` call
	 *  — no marker churn. */
	points: ClusteredMapPoint[];

	/** Map of `kind` → CSS color. Drives point fill AND cluster dominant
	 *  color (whichever kind has the highest count inside the cluster). */
	kindColors: Record<string, string>;

	/** Light theme style URL — always required. */
	styleLight: string;
	/** Dark theme style URL — falls back to `styleLight` if omitted. */
	styleDark?: string;
	/** Active theme. Switching themes destroys and recreates the map. */
	theme?: "light" | "dark";

	/** Initial map center `[lng, lat]`. Default `[20, 0]`. */
	initialCenter?: [number, number];
	/** Initial zoom level. Default `1.5`. */
	initialZoom?: number;
	/** Projection. Default `"globe"`. */
	projection?: "globe" | "mercator" | "naturalEarth" | "equalEarth" | "winkelTripel" | "albers" | "lambertConformalConic" | "equirectangular";

	/** Cluster radius in pixels (Mapbox `clusterRadius`). Default `50`. */
	clusterRadius?: number;
	/** Past this zoom, points are never clustered. Default `12`. */
	clusterMaxZoom?: number;

	/** Build the popup HTML for a clicked point. Return `null`/empty to
	 *  suppress the popup (e.g. when you want a custom `onPointClick`
	 *  handler to take over). */
	renderPopup?: (point: ClusteredMapPoint) => string | null | undefined;
	/** Fired alongside the popup (if any) when an individual point is
	 *  clicked. */
	onPointClick?: (point: ClusteredMapPoint) => void;
	/** Event delegation on the popup content. Use when your popup HTML
	 *  contains action buttons that need to react to clicks (e.g.
	 *  "📞 Audio", "🎥 Vidéo"). The handler is bound to the document
	 *  during the popup's lifetime; if the click hits the popup, you get
	 *  both the event and the closest matching element you queried. */
	onPopupClick?: (event: MouseEvent) => void;

	/** Optional camera target. When this object identity changes the map
	 *  flies to the new coordinates. Pass `null` to recenter on the
	 *  initial view. */
	flyTo?: ClusteredMapFlyTo | null;

	/** Optional className for the wrapper div. */
	className?: string;
	/** Loading flag — toggles a small spinner overlay (label = string
	 *  passed). Set to `false` to hide. */
	loading?: boolean | string;
	/** Optional set of React children rendered ABOVE the map (overlay
	 *  layer). Use absolute positioning inside. */
	overlay?: React.ReactNode;
}

// Internal layer IDs are namespaced with a counter to allow multiple
// `ClusteredMap` instances on the same page (rare but possible — keeps
// `m.addSource(...)` calls collision-free).
let _instanceCount = 0;

const DEFAULT_FALLBACK_COLOR = "#3b82f6";

// ─── Helpers ───────────────────────────────────────────────

/**
 * Build a Mapbox expression that returns the color of the dominant kind
 * inside a cluster. The expression assumes `clusterProperties` populated
 * one `_count_<kind>` aggregate per kind.
 */
function buildDominantColorExpr(
	kindColors: Record<string, string>,
): any[] {
	const kinds = Object.keys(kindColors);
	if (kinds.length === 0) return ["literal", DEFAULT_FALLBACK_COLOR];

	const countGetters = kinds.map((k) => ["get", `_count_${k}`]);
	const maxExpr: any[] = ["max", ...countGetters];

	const caseExpr: any[] = ["case"];
	// All-but-last get a comparison branch; the last is the fallback.
	for (let i = 0; i < kinds.length - 1; i++) {
		const k = kinds[i]!;
		caseExpr.push(["==", ["get", `_count_${k}`], maxExpr], kindColors[k] ?? DEFAULT_FALLBACK_COLOR);
	}
	const last = kinds[kinds.length - 1]!;
	caseExpr.push(kindColors[last] ?? DEFAULT_FALLBACK_COLOR);
	return caseExpr;
}

/**
 * Build the `clusterProperties` expression set: one accumulator per
 * kind that counts how many features of that kind fell into the cluster.
 */
function buildClusterProperties(
	kindColors: Record<string, string>,
): Record<string, any> {
	const out: Record<string, any> = {};
	for (const kind of Object.keys(kindColors)) {
		out[`_count_${kind}`] = [
			"+",
			["case", ["==", ["get", "kind"], kind], 1, 0],
		];
	}
	return out;
}

// ─── Component ─────────────────────────────────────────────

export function ClusteredMap({
	accessToken,
	points,
	kindColors,
	styleLight,
	styleDark,
	theme = "light",
	initialCenter = [20, 0],
	initialZoom = 1.5,
	projection = "globe",
	clusterRadius = 50,
	clusterMaxZoom = 12,
	renderPopup,
	onPointClick,
	onPopupClick,
	flyTo,
	className,
	loading,
	overlay,
}: ClusteredMapProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<mapboxgl.Map | null>(null);
	const popupRef = useRef<mapboxgl.Popup | null>(null);
	const [mapReady, setMapReady] = useState(false);
	const sourceReadyRef = useRef(false);

	// Stable per-instance IDs — accommodates multiple ClusteredMap
	// instances on the same page.
	const idsRef = useRef<{
		source: string;
		clusters: string;
		clusterCount: string;
		points: string;
	} | null>(null);
	if (!idsRef.current) {
		const n = ++_instanceCount;
		idsRef.current = {
			source: `cm-source-${n}`,
			clusters: `cm-clusters-${n}`,
			clusterCount: `cm-cluster-count-${n}`,
			points: `cm-points-${n}`,
		};
	}
	const ids = idsRef.current;

	// Refs for prop snapshots used inside Mapbox callbacks (which only
	// see the initial closure). Updated on every render so handlers
	// observe the latest values without rebinding listeners.
	const renderPopupRef = useRef(renderPopup);
	const onPointClickRef = useRef(onPointClick);
	renderPopupRef.current = renderPopup;
	onPointClickRef.current = onPointClick;

	// ─── Init map (on mount + theme change) ──────────────────
	useEffect(() => {
		if (!containerRef.current) return;
		if (mapRef.current) return;
		if (!accessToken) return;

		const style = theme === "dark" ? styleDark ?? styleLight : styleLight;
		const map = new mapboxgl.Map({
			container: containerRef.current,
			style,
			center: initialCenter,
			zoom: initialZoom,
			projection: projection as any,
			interactive: true,
			attributionControl: false,
			accessToken,
		});
		mapRef.current = map;

		map.on("style.load", () => {
			const isDark = theme === "dark";
			map.setFog({
				color: isDark ? "rgb(10, 10, 20)" : "rgb(220, 220, 230)",
				"high-color": isDark ? "rgb(20, 20, 40)" : "rgb(180, 180, 200)",
				"horizon-blend": 0.05,
				"star-intensity": isDark ? 0.6 : 0,
			});
			setMapReady(true);
		});

		return () => {
			popupRef.current?.remove();
			popupRef.current = null;
			map.remove();
			mapRef.current = null;
			setMapReady(false);
		};
		// Deliberately exclude initialCenter/initialZoom/projection from deps
		// — they're seed values, not reactive. Changing them after mount
		// would need a separate flyTo prop (which we expose).
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [accessToken, theme, styleLight, styleDark]);

	// ─── Add source + layers + click handlers (once per map) ──
	useEffect(() => {
		const map = mapRef.current;
		if (!map || !mapReady) return;
		if (map.getSource(ids.source)) return;

		map.addSource(ids.source, {
			type: "geojson",
			data: { type: "FeatureCollection", features: [] },
			cluster: true,
			clusterMaxZoom,
			clusterRadius,
			clusterProperties: buildClusterProperties(kindColors),
		});

		map.addLayer({
			id: ids.clusters,
			type: "circle",
			source: ids.source,
			filter: ["has", "point_count"],
			paint: {
				"circle-color": buildDominantColorExpr(kindColors) as any,
				"circle-radius": [
					"step",
					["get", "point_count"],
					14, 10,
					18, 50,
					24,
				] as any,
				"circle-opacity": 0.75,
				"circle-stroke-color": "rgba(255, 255, 255, 0.7)",
				"circle-stroke-width": 1.5,
			},
		});

		map.addLayer({
			id: ids.clusterCount,
			type: "symbol",
			source: ids.source,
			filter: ["has", "point_count"],
			layout: {
				"text-field": ["get", "point_count_abbreviated"],
				"text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
				"text-size": 12,
			},
			paint: { "text-color": "#ffffff" },
		});

		map.addLayer({
			id: ids.points,
			type: "circle",
			source: ids.source,
			filter: ["!", ["has", "point_count"]],
			paint: {
				"circle-color": ["get", "color"],
				"circle-radius": 6,
				"circle-stroke-color": "rgba(255, 255, 255, 0.85)",
				"circle-stroke-width": 1,
				"circle-opacity": 0.85,
			},
		});

		const onClusterClick = (
			e: mapboxgl.MapMouseEvent & { features?: any[] },
		) => {
			const features = map.queryRenderedFeatures(e.point, {
				layers: [ids.clusters],
			});
			const clusterId = features[0]?.properties?.cluster_id;
			const source = map.getSource(ids.source) as any;
			if (clusterId == null || !source?.getClusterExpansionZoom) return;
			source.getClusterExpansionZoom(
				clusterId,
				(err: any, zoom: number) => {
					if (err) return;
					const first = features[0];
					if (!first) return;
					map.easeTo({
						center: (first.geometry as any).coordinates,
						zoom,
					});
				},
			);
		};

		const onIndividualPointClick = (
			e: mapboxgl.MapMouseEvent & { features?: any[] },
		) => {
			const f = e.features?.[0];
			if (!f) return;
			const props = (f.properties ?? {}) as Record<string, any>;
			const coords = (f.geometry as any).coordinates.slice() as [
				number,
				number,
			];

			// Reconstruct a ClusteredMapPoint from the feature for the
			// consumer's callbacks. `data` was JSON-serialized into a string
			// property when written; parse it back here.
			const data: Record<string, unknown> | undefined = props.data
				? safeJsonParse(props.data)
				: undefined;
			const point: ClusteredMapPoint = {
				id: String(props.id ?? ""),
				kind: String(props.kind ?? ""),
				coords,
				data,
			};

			onPointClickRef.current?.(point);

			const html = renderPopupRef.current?.(point);
			if (html) {
				popupRef.current?.remove();
				popupRef.current = new mapboxgl.Popup({
					offset: 12,
					closeButton: true,
					className: "clustered-map-popup",
				})
					.setLngLat(coords)
					.setHTML(html)
					.addTo(map);
			}
		};

		const onEnter = () => (map.getCanvas().style.cursor = "pointer");
		const onLeave = () => (map.getCanvas().style.cursor = "");

		map.on("click", ids.clusters, onClusterClick);
		map.on("click", ids.points, onIndividualPointClick);
		map.on("mouseenter", ids.clusters, onEnter);
		map.on("mouseleave", ids.clusters, onLeave);
		map.on("mouseenter", ids.points, onEnter);
		map.on("mouseleave", ids.points, onLeave);

		sourceReadyRef.current = true;

		return () => {
			sourceReadyRef.current = false;
			try {
				map.off("click", ids.clusters, onClusterClick);
				map.off("click", ids.points, onIndividualPointClick);
				map.off("mouseenter", ids.clusters, onEnter);
				map.off("mouseleave", ids.clusters, onLeave);
				map.off("mouseenter", ids.points, onEnter);
				map.off("mouseleave", ids.points, onLeave);
				if (map.getLayer(ids.clusterCount)) map.removeLayer(ids.clusterCount);
				if (map.getLayer(ids.clusters)) map.removeLayer(ids.clusters);
				if (map.getLayer(ids.points)) map.removeLayer(ids.points);
				if (map.getSource(ids.source)) map.removeSource(ids.source);
			} catch {
				// Map already torn down (theme change) — nothing to clean.
			}
		};
		// kindColors / cluster params can't change without remounting
		// the layers; we treat them as init-time config. To change them,
		// remount the component (e.g. via a `key` prop).
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mapReady]);

	// ─── Push data to source ─────────────────────────────────
	useEffect(() => {
		const map = mapRef.current;
		if (!map || !mapReady || !sourceReadyRef.current) return;
		const source = map.getSource(ids.source) as any;
		if (!source?.setData) return;

		source.setData({
			type: "FeatureCollection",
			features: points.map((p) => ({
				type: "Feature",
				geometry: { type: "Point", coordinates: p.coords },
				properties: {
					id: p.id,
					kind: p.kind,
					color: kindColors[p.kind] ?? DEFAULT_FALLBACK_COLOR,
					// GeoJSON properties are flat strings/numbers — stringify
					// the free-form data so it survives the round-trip and is
					// rebuilt in the click handler.
					data: p.data ? JSON.stringify(p.data) : "",
				},
			})),
		});
	}, [points, mapReady, ids.source, kindColors]);

	// ─── Popup click delegation ──────────────────────────────
	useEffect(() => {
		if (!onPopupClick) return;
		const handler = (e: MouseEvent) => {
			const target = e.target as HTMLElement | null;
			// Only fire when the click is inside a popup belonging to this
			// component instance.
			if (!target?.closest(".clustered-map-popup")) return;
			onPopupClick(e);
		};
		document.addEventListener("click", handler, true);
		return () => document.removeEventListener("click", handler, true);
	}, [onPopupClick]);

	// ─── External camera control ─────────────────────────────
	useEffect(() => {
		const map = mapRef.current;
		if (!map || !mapReady) return;
		if (flyTo) {
			map.flyTo({ center: flyTo.center, zoom: flyTo.zoom });
		}
		// Intentionally only react to flyTo identity changes — let the
		// consumer decide when to re-aim the camera.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [flyTo]);

	return (
		<div className={className} style={{ position: "relative" }}>
			<div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
			{overlay}
			{loading && (
				<div
					style={{
						position: "absolute",
						left: "50%",
						top: 16,
						transform: "translateX(-50%)",
						zIndex: 10,
						fontSize: 12,
						padding: "6px 12px",
						borderRadius: 8,
						background: "rgba(255, 255, 255, 0.95)",
						color: "#0f172a",
						border: "1px solid rgba(0,0,0,0.08)",
						boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
					}}
				>
					{typeof loading === "string" ? loading : "Chargement…"}
				</div>
			)}
		</div>
	);
}

function safeJsonParse(s: string): any {
	try {
		return JSON.parse(s);
	} catch {
		return undefined;
	}
}

// ─── Re-exports for convenience ────────────────────────────
export { mapboxgl };
