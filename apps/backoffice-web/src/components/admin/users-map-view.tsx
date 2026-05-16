"use client";

/**
 * UsersMapView — Carte interactive des utilisateurs (superadmin).
 *
 * Affiche sur une carte Mapbox :
 *  - Profils citoyens adultes (positionnés via addresses.residence.coordinates)
 *  - Profils enfants (héritent des coordonnées du parent)
 *  - Agents du corps diplomatique (positionnés sur la capitale de leur org.country)
 *
 * Données : 1 query agrégée côté serveur (api.functions.admin.listMapPoints)
 * qui applique les filtres (population/genre/âge/continent/pays) avant de
 * renvoyer la liste plate des points. Compteurs des dropdowns via
 * `getMapFacets`. État des filtres dans l'URL via `router.replace`.
 */

import * as mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import i18n from "i18next";
import { Loader2, MapPin, MapPinOff, Shield, Users } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { getLocalizedValue } from "@/lib/i18n-utils";
import { MAPBOX_CONFIG } from "@/config/mapbox";
import { getCapitalCoords } from "@/lib/country-capitals";
import {
	type Continent,
	CONTINENT_META,
	getContinent,
	getCountryFlag,
	getCountryName,
} from "@/lib/country-utils";
import {
	Combobox,
	type ComboboxOption,
} from "@workspace/ui/components/combobox";
import { Button } from "@workspace/ui/components/button";
import { useCurrentAdminRole } from "@/hooks/use-current-admin-role";
import {
	SuperAdminCallTrigger,
	type SuperAdminCallTargetUser,
} from "./super-admin-call-trigger";
import type { ActiveCallMediaType } from "@/components/meetings/active-call-dialog";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────
type PointKind = "citizen_adult" | "citizen_child" | "agent";
type Gender = "male" | "female" | "unknown";
type PopulationFilter = "all" | "citizens" | "agents";
type GenderFilter = "all" | "male" | "female";
type AgeFilter = "all" | "adults" | "children";

interface MapPoint {
	id: string;
	kind: PointKind;
	gender: Gender;
	name: string;
	subtitle?: string;
	coords: [number, number]; // [lng, lat]
	country?: string;
	userId?: string;
}

// ─── URL params ─────────────────────────────────────────────
const P = {
	pop: "pop",
	gender: "gender",
	age: "age",
	continent: "continent",
	country: "country",
} as const;

// ─── Display helpers ───────────────────────────────────────
const KIND_COLORS: Record<PointKind, string> = {
	citizen_adult: "#3b82f6", // blue
	citizen_child: "#f59e0b", // amber
	agent: "#10b981",         // emerald
};

const KIND_LABEL: Record<PointKind, string> = {
	citizen_adult: "Citoyen",
	citizen_child: "Enfant",
	agent: "Agent",
};

const GENDER_GLYPH: Record<Gender, string> = {
	male: "♂",
	female: "♀",
	unknown: "",
};

function escapeHtml(s: string | null | undefined): string {
	if (s == null) return "";
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function normalizeGender(g?: string | null): Gender {
	if (g === "male" || g === "female") return g;
	return "unknown";
}

// ─── Component ─────────────────────────────────────────────
export function UsersMapView() {
	const { theme } = useTheme();
	const { isSuperAdmin } = useCurrentAdminRole();
	const router = useRouter();
	const searchParams = useSearchParams();
	const mapContainer = useRef<HTMLDivElement>(null);
	const map = useRef<mapboxgl.Map | null>(null);
	const popupRef = useRef<mapboxgl.Popup | null>(null);
	const [mapReady, setMapReady] = useState(false);

	// Controlled call trigger — see original component for the rationale.
	const [pendingCallTarget, setPendingCallTarget] = useState<{
		user: SuperAdminCallTargetUser;
		mediaType: ActiveCallMediaType;
		nonce: number;
	} | null>(null);
	const callNonceRef = useRef(0);

	// ── URL is the source of truth for every filter. ──
	const populationFilter =
		(searchParams.get(P.pop) as PopulationFilter | null) ?? "all";
	const genderFilter =
		(searchParams.get(P.gender) as GenderFilter | null) ?? "all";
	const ageFilter = (searchParams.get(P.age) as AgeFilter | null) ?? "all";
	const activeContinent =
		(searchParams.get(P.continent) as Continent | null) ?? null;
	const selectedCountry = searchParams.get(P.country) ?? null;

	const updateParams = useCallback(
		(updates: Record<string, string | null>) => {
			const params = new URLSearchParams(searchParams.toString());
			for (const [k, v] of Object.entries(updates)) {
				if (v === null || v === "" || v === "all") params.delete(k);
				else params.set(k, v);
			}
			const qs = params.toString();
			router.replace(qs ? `/users?${qs}` : "/users", { scroll: false });
		},
		[router, searchParams],
	);

	// Filter payload sent to the server. Stable identity so the Convex query
	// doesn't churn on unrelated renders.
	const filters = useMemo(
		() => ({
			population: populationFilter,
			gender: genderFilter,
			age: ageFilter,
			continent: activeContinent ?? undefined,
			country: selectedCountry ?? undefined,
		}),
		[populationFilter, genderFilter, ageFilter, activeContinent, selectedCountry],
	);

	// ── Data: 1 filtered list + 1 facets query. The server applies every
	// filter before sending, so the payload shrinks with the selection. ──
	const serverPoints = useQuery(api.functions.admin.listMapPoints, { filters });
	const facets = useQuery(api.functions.admin.getMapFacets, {});

	// Resolve agent capital coords client-side (capital table lives in the
	// front-end so we don't duplicate it in Convex). Agents whose country has
	// no known capital are silently skipped.
	const points = useMemo<MapPoint[]>(() => {
		if (!serverPoints) return [];
		const resolved: MapPoint[] = [];
		for (const p of serverPoints) {
			if (p.kind === "agent") {
				const cap = p.country ? getCapitalCoords(p.country) : null;
				if (!cap) continue;
				const positionLabel = p.positionTitle
					? getLocalizedValue(p.positionTitle as any, i18n.language)
					: undefined;
				resolved.push({
					id: p.id,
					kind: p.kind,
					gender: normalizeGender(p.gender),
					name: p.name,
					subtitle: positionLabel || p.orgName || p.subtitle || undefined,
					coords: cap,
					country: p.country ?? undefined,
					userId: p.userId ?? undefined,
				});
			} else {
				resolved.push({
					id: p.id,
					kind: p.kind,
					gender: normalizeGender(p.gender),
					name: p.name,
					subtitle: p.subtitle ?? undefined,
					coords: p.coords,
					country: p.country ?? undefined,
					userId: p.userId ?? undefined,
				});
			}
		}
		return resolved;
	}, [serverPoints]);

	// Keep the previous set visible while a new query is in flight so the
	// map doesn't briefly empty out on every filter change.
	const lastPointsRef = useRef<MapPoint[]>([]);
	if (serverPoints !== undefined) {
		lastPointsRef.current = points;
	}
	const renderedPoints = lastPointsRef.current;

	// ── Setters (write through URL). Country resets if it falls outside
	// the newly selected continent — same UX as the Comptes view. ──
	const setPopulation = (v: PopulationFilter) =>
		updateParams({ [P.pop]: v });
	const setGender = (v: GenderFilter) => updateParams({ [P.gender]: v });
	const setAge = (v: AgeFilter) => updateParams({ [P.age]: v });
	const setContinent = (v: Continent | null) => {
		const updates: Record<string, string | null> = { [P.continent]: v };
		if (selectedCountry && v && getContinent(selectedCountry) !== v) {
			updates[P.country] = null;
		}
		updateParams(updates);
	};
	const setCountry = (v: string | null) => updateParams({ [P.country]: v });

	const hasActiveFilter =
		populationFilter !== "all" ||
		genderFilter !== "all" ||
		ageFilter !== "all" ||
		activeContinent !== null ||
		selectedCountry !== null;

	const resetFilters = () => {
		const params = new URLSearchParams();
		const view = searchParams.get("view");
		if (view) params.set("view", view);
		router.replace(`/users?${params.toString()}`, { scroll: false });
	};

	// ── Initialize map (mirrors apps/citizen-web/src/components/home/WorldMapSection.tsx) ──
	useEffect(() => {
		if (!mapContainer.current) return;
		if (map.current) return;
		if (!MAPBOX_CONFIG.accessToken) return;

		const isDark = theme === "dark";
		const style = isDark ? MAPBOX_CONFIG.styleDark : MAPBOX_CONFIG.styleLight;

		map.current = new mapboxgl.Map({
			container: mapContainer.current,
			style,
			center: [20, 0],
			zoom: 1.5,
			projection: "globe" as any,
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
			popupRef.current?.remove();
			map.current?.remove();
			map.current = null;
			setMapReady(false);
		};
	}, [theme]);

	// ── Clustered GeoJSON source + 3 layers ──
	// One DOM marker per point becomes ONE source: Mapbox handles fusion
	// natively via `cluster: true`. Layers:
	//   - `users-clusters`        : circle per cluster, sized by count
	//   - `users-cluster-count`   : numeric label on top of each cluster
	//   - `users-unclustered`     : circle per individual point (kind-colored)
	// See https://docs.mapbox.com/mapbox-gl-js/example/cluster/ for the
	// canonical pattern this implementation follows.
	const SOURCE_ID = "users-map-source";
	const LAYER_CLUSTERS = "users-clusters";
	const LAYER_CLUSTER_COUNT = "users-cluster-count";
	const LAYER_UNCLUSTERED = "users-unclustered";

	const sourceReadyRef = useRef(false);

	// Set up source + layers + click handlers once the map style is loaded.
	// On theme change the map is destroyed and recreated, so `mapReady`
	// flips back to false and this effect re-runs cleanly.
	useEffect(() => {
		if (!map.current || !mapReady) return;
		const m = map.current;

		if (m.getSource(SOURCE_ID)) return; // already set up after a hot-reload

		m.addSource(SOURCE_ID, {
			type: "geojson",
			data: { type: "FeatureCollection", features: [] },
			cluster: true,
			clusterMaxZoom: 12,
			clusterRadius: 50,
			// Aggregate each kind so we can color the cluster by what's
			// dominant inside. Mapbox sums the right-hand expression across
			// every feature in the cluster — see
			// https://docs.mapbox.com/style-spec/reference/sources/#cluster-properties
			clusterProperties: {
				adults: [
					"+",
					["case", ["==", ["get", "kind"], "citizen_adult"], 1, 0],
				],
				children: [
					"+",
					["case", ["==", ["get", "kind"], "citizen_child"], 1, 0],
				],
				agents: [
					"+",
					["case", ["==", ["get", "kind"], "agent"], 1, 0],
				],
			},
		});

		m.addLayer({
			id: LAYER_CLUSTERS,
			type: "circle",
			source: SOURCE_ID,
			filter: ["has", "point_count"],
			paint: {
				// Color by dominant kind inside the cluster: whichever of
				// adults / children / agents has the highest count wins. The
				// `["max", a, b, c]` expression returns the largest of the
				// three aggregated counts, then a chain of equality cases
				// resolves to the matching KIND_COLORS entry.
				"circle-color": [
					"case",
					[
						"==",
						["get", "agents"],
						["max", ["get", "adults"], ["get", "children"], ["get", "agents"]],
					],
					KIND_COLORS.agent,
					[
						"==",
						["get", "children"],
						["max", ["get", "adults"], ["get", "children"], ["get", "agents"]],
					],
					KIND_COLORS.citizen_child,
					KIND_COLORS.citizen_adult,
				],
				// Size steps with point_count (10 → 50 → 200+).
				"circle-radius": [
					"step",
					["get", "point_count"],
					14, 10,
					18, 50,
					24,
				],
				"circle-opacity": 0.75,
				"circle-stroke-color": "rgba(255, 255, 255, 0.7)",
				"circle-stroke-width": 1.5,
			},
		});

		m.addLayer({
			id: LAYER_CLUSTER_COUNT,
			type: "symbol",
			source: SOURCE_ID,
			filter: ["has", "point_count"],
			layout: {
				"text-field": ["get", "point_count_abbreviated"],
				"text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
				"text-size": 12,
			},
			paint: { "text-color": "#ffffff" },
		});

		m.addLayer({
			id: LAYER_UNCLUSTERED,
			type: "circle",
			source: SOURCE_ID,
			filter: ["!", ["has", "point_count"]],
			paint: {
				"circle-color": ["get", "color"],
				"circle-radius": 6,
				"circle-stroke-color": "rgba(255, 255, 255, 0.85)",
				"circle-stroke-width": 1,
				"circle-opacity": 0.85,
			},
		});

		// Cluster click → zoom in to the level where the cluster expands.
		const onClusterClick = (e: mapboxgl.MapMouseEvent & { features?: any[] }) => {
			const features = m.queryRenderedFeatures(e.point, {
				layers: [LAYER_CLUSTERS],
			});
			const clusterId = features[0]?.properties?.cluster_id;
			const source = m.getSource(SOURCE_ID) as any;
			if (clusterId == null || !source?.getClusterExpansionZoom) return;
			source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
				if (err) return;
				m.easeTo({
					center: (features[0].geometry as any).coordinates,
					zoom,
				});
			});
		};

		// Unclustered point click → build & open the existing rich popup.
		const onPointClick = (e: mapboxgl.MapMouseEvent & { features?: any[] }) => {
			const f = e.features?.[0];
			if (!f) return;
			const props = f.properties as Record<string, string>;
			const coords = (f.geometry as any).coordinates.slice() as [number, number];
			const popup = new mapboxgl.Popup({
				offset: 12,
				closeButton: true,
				className: "users-map-popup",
			})
				.setLngLat(coords)
				.setHTML(buildPopupHtml(props, isSuperAdmin))
				.addTo(m);
			popupRef.current = popup;
		};

		const onClusterEnter = () => (m.getCanvas().style.cursor = "pointer");
		const onClusterLeave = () => (m.getCanvas().style.cursor = "");

		m.on("click", LAYER_CLUSTERS, onClusterClick);
		m.on("click", LAYER_UNCLUSTERED, onPointClick);
		m.on("mouseenter", LAYER_CLUSTERS, onClusterEnter);
		m.on("mouseleave", LAYER_CLUSTERS, onClusterLeave);
		m.on("mouseenter", LAYER_UNCLUSTERED, onClusterEnter);
		m.on("mouseleave", LAYER_UNCLUSTERED, onClusterLeave);

		sourceReadyRef.current = true;

		return () => {
			sourceReadyRef.current = false;
			try {
				m.off("click", LAYER_CLUSTERS, onClusterClick);
				m.off("click", LAYER_UNCLUSTERED, onPointClick);
				m.off("mouseenter", LAYER_CLUSTERS, onClusterEnter);
				m.off("mouseleave", LAYER_CLUSTERS, onClusterLeave);
				m.off("mouseenter", LAYER_UNCLUSTERED, onClusterEnter);
				m.off("mouseleave", LAYER_UNCLUSTERED, onClusterLeave);
				if (m.getLayer(LAYER_CLUSTER_COUNT)) m.removeLayer(LAYER_CLUSTER_COUNT);
				if (m.getLayer(LAYER_CLUSTERS)) m.removeLayer(LAYER_CLUSTERS);
				if (m.getLayer(LAYER_UNCLUSTERED)) m.removeLayer(LAYER_UNCLUSTERED);
				if (m.getSource(SOURCE_ID)) m.removeSource(SOURCE_ID);
			} catch {
				// Map already torn down on theme change — nothing to clean.
			}
		};
	}, [mapReady, isSuperAdmin]);

	// Push the current point set to the source whenever it changes. The
	// effect above guarantees the source exists before this runs (gated on
	// `sourceReadyRef`).
	useEffect(() => {
		if (!map.current || !mapReady || !sourceReadyRef.current) return;
		const source = map.current.getSource(SOURCE_ID) as any;
		if (!source?.setData) return;
		source.setData({
			type: "FeatureCollection",
			features: renderedPoints.map((p) => ({
				type: "Feature",
				geometry: { type: "Point", coordinates: p.coords },
				properties: {
					id: p.id,
					kind: p.kind,
					gender: p.gender,
					color: KIND_COLORS[p.kind],
					name: p.name,
					subtitle: p.subtitle ?? "",
					country: p.country ?? "",
					userId: p.userId ?? "",
				},
			})),
		});
	}, [mapReady, renderedPoints]);

	// Event delegation : capture les clics sur les boutons d'appel injectés
	// dans les popups Mapbox (rendus en innerHTML).
	useEffect(() => {
		if (!isSuperAdmin) return;
		const handler = (e: MouseEvent) => {
			const target = e.target as HTMLElement | null;
			const btn = target?.closest<HTMLElement>("[data-call-action]");
			if (!btn) return;
			const action = btn.getAttribute("data-call-action");
			const userId = btn.getAttribute("data-user-id");
			const name = btn.getAttribute("data-call-name") ?? "";
			if (!userId || (action !== "audio" && action !== "video")) return;
			e.preventDefault();
			e.stopPropagation();
			callNonceRef.current += 1;
			setPendingCallTarget({
				user: {
					_id: userId as Id<"users">,
					firstName: name,
					lastName: null,
					email: null,
				},
				mediaType: action,
				nonce: callNonceRef.current,
			});
		};
		document.addEventListener("click", handler, true);
		return () => document.removeEventListener("click", handler, true);
	}, [isSuperAdmin]);

	// ── Recenter on country selection ──
	useEffect(() => {
		if (!map.current || !mapReady) return;
		if (selectedCountry) {
			const c = getCapitalCoords(selectedCountry);
			if (c) map.current.flyTo({ center: c, zoom: 4 });
		} else if (activeContinent && renderedPoints.length > 0) {
			const avgLng =
				renderedPoints.reduce((s, p) => s + p.coords[0], 0) /
				renderedPoints.length;
			const avgLat =
				renderedPoints.reduce((s, p) => s + p.coords[1], 0) /
				renderedPoints.length;
			map.current.flyTo({ center: [avgLng, avgLat], zoom: 2.5 });
		} else {
			map.current.flyTo({ center: [20, 20], zoom: 1.6 });
		}
	}, [selectedCountry, activeContinent, mapReady, renderedPoints]);

	const isDataLoading = serverPoints === undefined;

	// ── Render ──
	if (!MAPBOX_CONFIG.accessToken) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
				<MapPinOff className="h-10 w-10 text-muted-foreground" />
				<h2 className="text-lg font-semibold">Carte indisponible</h2>
				<p className="max-w-md text-sm text-muted-foreground">
					La variable d&apos;environnement{" "}
					<code className="rounded bg-muted px-1.5 py-0.5 text-xs">
						NEXT_PUBLIC_MAPBOX_TOKEN
					</code>{" "}
					n&apos;est pas configurée pour le backoffice.
				</p>
			</div>
		);
	}

	const POP_ALL = "__all__";

	// Continent codes that have at least one point — sorted by display order.
	const activeContinents: Continent[] = facets
		? (Object.keys(facets.continents) as Continent[]).sort(
				(a, b) =>
					(CONTINENT_META[a]?.order ?? 99) - (CONTINENT_META[b]?.order ?? 99),
			)
		: [];

	const countryOptionsFromFacets = facets
		? Object.entries(facets.countries)
				.filter(([code]) =>
					activeContinent ? getContinent(code) === activeContinent : true,
				)
				.map(([code, count]) => ({
					code,
					label: `${getCountryFlag(code)} ${getCountryName(code)}`,
					count,
				}))
				.sort((a, b) => a.label.localeCompare(b.label))
		: [];

	const populationDropdownOptions: ComboboxOption[] = [
		{ value: POP_ALL, label: `Tous (${facets?.total ?? 0})` },
		{
			value: "citizens",
			label: `Citoyens (${facets?.populations.citizens ?? 0})`,
		},
		{ value: "agents", label: `Agents (${facets?.populations.agents ?? 0})` },
	];

	const genderDropdownOptions: ComboboxOption[] = [
		{ value: POP_ALL, label: `Tous (${facets?.total ?? 0})` },
		{ value: "male", label: `♂ Hommes (${facets?.genders.male ?? 0})` },
		{ value: "female", label: `♀ Femmes (${facets?.genders.female ?? 0})` },
	];

	const ageDropdownOptions: ComboboxOption[] = [
		{ value: POP_ALL, label: `Tous (${facets?.total ?? 0})` },
		{ value: "adults", label: `Adultes (${facets?.ages.adults ?? 0})` },
		{ value: "children", label: `Enfants (${facets?.ages.children ?? 0})` },
	];

	const continentDropdownOptions: ComboboxOption[] = [
		{ value: POP_ALL, label: "Tous les continents" },
		...activeContinents.map((c) => ({
			value: c,
			label: `${CONTINENT_META[c].label} (${facets?.continents[c] ?? 0})`,
		})),
	];

	const countryDropdownOptions: ComboboxOption[] = [
		{ value: POP_ALL, label: "Tous les pays" },
		...countryOptionsFromFacets.map((opt) => ({
			value: opt.code,
			label: `${opt.label} (${opt.count})`,
		})),
	];

	const stats = {
		total: renderedPoints.length,
		citizens: renderedPoints.filter((p) => p.kind !== "agent").length,
		agents: renderedPoints.filter((p) => p.kind === "agent").length,
		withoutGps: facets?.withoutGps ?? 0,
	};

	return (
		<div className="flex flex-1 flex-col gap-3 p-4 pt-4">
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
				<MapFilterField label="Population">
					<Combobox
						options={populationDropdownOptions}
						value={populationFilter === "all" ? POP_ALL : populationFilter}
						onValueChange={(v) =>
							setPopulation(v === POP_ALL ? "all" : (v as PopulationFilter))
						}
						placeholder="Population"
						searchPlaceholder="Filtrer…"
						emptyText="—"
						className="h-9"
					/>
				</MapFilterField>

				<MapFilterField label="Genre">
					<Combobox
						options={genderDropdownOptions}
						value={genderFilter === "all" ? POP_ALL : genderFilter}
						onValueChange={(v) =>
							setGender(v === POP_ALL ? "all" : (v as GenderFilter))
						}
						placeholder="Genre"
						searchPlaceholder="Filtrer…"
						emptyText="—"
						className="h-9"
					/>
				</MapFilterField>

				<MapFilterField label="Âge">
					<Combobox
						options={ageDropdownOptions}
						value={ageFilter === "all" ? POP_ALL : ageFilter}
						onValueChange={(v) =>
							setAge(v === POP_ALL ? "all" : (v as AgeFilter))
						}
						placeholder="Âge"
						searchPlaceholder="Filtrer…"
						emptyText="—"
						className="h-9"
					/>
				</MapFilterField>

				<MapFilterField label="Continent">
					<Combobox
						options={continentDropdownOptions}
						value={activeContinent ?? POP_ALL}
						onValueChange={(v) =>
							setContinent(v === POP_ALL ? null : (v as Continent))
						}
						placeholder="Tous les continents"
						searchPlaceholder="Filtrer…"
						emptyText="Aucun continent."
						className="h-9"
					/>
				</MapFilterField>

				<MapFilterField label="Pays">
					<Combobox
						options={countryDropdownOptions}
						value={selectedCountry ?? POP_ALL}
						onValueChange={(v) => setCountry(v === POP_ALL ? null : v)}
						placeholder="Tous les pays"
						searchPlaceholder="Rechercher un pays…"
						emptyText="Aucun pays."
						className="h-9"
					/>
				</MapFilterField>

				<MapFilterField label=" ">
					<Button
						variant="outline"
						size="sm"
						className="h-9 w-full font-normal"
						disabled={!hasActiveFilter}
						onClick={resetFilters}
					>
						Réinitialiser
					</Button>
				</MapFilterField>
			</div>

			{/* Strip the Mapbox default popup chrome so our custom dark wrapper
			    isn't framed by a white box. Scoped via the `users-map-popup`
			    className we pass to `new mapboxgl.Popup({ className })`. */}
			<style
				dangerouslySetInnerHTML={{
					__html: `
						.mapboxgl-popup.users-map-popup .mapboxgl-popup-content {
							background: transparent !important;
							padding: 0 !important;
							box-shadow: none !important;
							border-radius: 12px;
						}
						.mapboxgl-popup.users-map-popup .mapboxgl-popup-tip {
							border-top-color: #020617 !important;
							border-bottom-color: #020617 !important;
						}
						.mapboxgl-popup.users-map-popup .mapboxgl-popup-close-button {
							color: #94a3b8;
							font-size: 18px;
							padding: 4px 8px;
							right: 4px;
							top: 4px;
						}
						.mapboxgl-popup.users-map-popup .mapboxgl-popup-close-button:hover {
							color: #f8fafc;
							background: transparent;
						}
					`,
				}}
			/>
			<div className="relative h-[600px] w-full overflow-hidden rounded-xl border bg-muted/20">
				<div ref={mapContainer} className="absolute inset-0 h-full w-full" />

				<div className="absolute right-4 top-4 z-10 flex flex-wrap items-center gap-1.5 rounded-lg border bg-background/95 px-2 py-1.5 text-xs shadow-lg backdrop-blur">
					<StatChip icon={MapPin} label="affichés" value={stats.total} />
					<StatChip icon={Users} label="citoyens" value={stats.citizens} />
					<StatChip icon={Shield} label="agents" value={stats.agents} />
					{stats.withoutGps > 0 && (
						<StatChip
							icon={MapPinOff}
							label="sans GPS"
							value={stats.withoutGps}
							tone="warning"
						/>
					)}
				</div>

				{isDataLoading && (
					<div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-lg border bg-background/95 px-3 py-1.5 text-xs shadow-lg backdrop-blur">
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
						<span>Chargement…</span>
					</div>
				)}

				<div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1.5 rounded-lg border bg-background/95 p-3 text-xs shadow-lg backdrop-blur">
					<LegendItem color={KIND_COLORS.citizen_adult} label="Citoyen adulte" />
					<LegendItem color={KIND_COLORS.citizen_child} label="Enfant" />
					<LegendItem color={KIND_COLORS.agent} label="Agent (capitale)" />
				</div>
			</div>

			{/* Affichage rapide chips — synchros avec les dropdowns ci-dessus. */}
			<div className="flex flex-wrap items-center gap-2">
				<span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mr-1">
					Affichage rapide
				</span>
				<KindChip
					active={
						populationFilter === "all" &&
						ageFilter === "all" &&
						genderFilter === "all"
					}
					color="text-foreground"
					icon={MapPin}
					label="Tous"
					count={facets?.total ?? 0}
					onClick={() => updateParams({ [P.pop]: null, [P.age]: null, [P.gender]: null })}
				/>
				<KindChip
					active={populationFilter === "citizens" && ageFilter === "adults"}
					color={KIND_COLORS.citizen_adult}
					icon={Users}
					label="Citoyen adulte"
					count={facets?.ages.adults ?? 0}
					onClick={() => {
						const isActive =
							populationFilter === "citizens" && ageFilter === "adults";
						updateParams({
							[P.pop]: isActive ? null : "citizens",
							[P.age]: isActive ? null : "adults",
						});
					}}
				/>
				<KindChip
					active={ageFilter === "children"}
					color={KIND_COLORS.citizen_child}
					icon={MapPinOff}
					label="Mineur"
					count={facets?.ages.children ?? 0}
					onClick={() => {
						const isActive = ageFilter === "children";
						updateParams({
							[P.pop]: isActive ? null : "citizens",
							[P.age]: isActive ? null : "children",
						});
					}}
				/>
				<KindChip
					active={populationFilter === "agents"}
					color={KIND_COLORS.agent}
					icon={Shield}
					label="Agent"
					count={facets?.populations.agents ?? 0}
					onClick={() => {
						const isActive = populationFilter === "agents";
						updateParams({
							[P.pop]: isActive ? null : "agents",
							[P.age]: null,
						});
					}}
				/>
			</div>

			{pendingCallTarget && (
				<SuperAdminCallTrigger
					key={pendingCallTarget.user._id}
					targetUser={pendingCallTarget.user}
					variant="controlled"
					programmaticTrigger={{
						mediaType: pendingCallTarget.mediaType,
						nonce: pendingCallTarget.nonce,
					}}
				/>
			)}
		</div>
	);
}

// ─── Sub-components ────────────────────────────────────────
function StatChip({
	icon: Icon,
	label,
	value,
	tone = "default",
}: {
	icon: React.ElementType;
	label: string;
	value: number;
	tone?: "default" | "warning";
}) {
	return (
		<div
			className={cn(
				"flex items-center gap-1 rounded px-1.5 py-0.5",
				tone === "warning"
					? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
					: "",
			)}
		>
			<Icon className="h-3 w-3 text-muted-foreground" />
			<span className="font-semibold">{value}</span>
			<span className="text-muted-foreground">{label}</span>
		</div>
	);
}

function MapFilterField({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</span>
			{children}
		</div>
	);
}

function LegendItem({ color, label }: { color: string; label: string }) {
	return (
		<div className="flex items-center gap-2">
			<span
				className="inline-block h-3 w-3 rounded-full ring-2 ring-background"
				style={{ backgroundColor: color }}
			/>
			<span>{label}</span>
		</div>
	);
}

function KindChip({
	active,
	color,
	icon: Icon,
	label,
	count,
	onClick,
}: {
	active: boolean;
	color: string;
	icon: React.ElementType;
	label: string;
	count: number;
	onClick: () => void;
}) {
	const isHex = color.startsWith("#");
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-[0.97]",
				active
					? "border-foreground/40 bg-foreground/[0.08] text-foreground shadow-sm"
					: "border-border/60 bg-background hover:border-foreground/30 hover:bg-muted/40 text-muted-foreground",
			)}
		>
			<span
				className="inline-flex items-center justify-center rounded-full p-0.5"
				style={isHex ? { color } : undefined}
			>
				<Icon className="h-3 w-3" />
			</span>
			<span className={isHex ? "" : color}>{label}</span>
			<span
				className={cn(
					"inline-flex h-4 min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
					active
						? "bg-foreground/20 text-foreground"
						: "bg-muted text-muted-foreground",
				)}
			>
				{count}
			</span>
		</button>
	);
}


// ─── Popup HTML ─────────────────────────────────────────────
// Builds the dark popup shown on click of an unclustered point. Mirrors the
// previous per-marker template — same chrome, same call buttons, same
// design — but reads from the feature properties dictionary instead of the
// in-memory `MapPoint`. The wrapper opens its own opaque background so the
// content is readable on top of the dark globe (same pattern as
// apps/citizen-web/src/components/home/WorldMapSection.tsx:174).
function buildPopupHtml(
	props: Record<string, string>,
	isSuperAdmin: boolean,
): string {
	const kind = (props.kind || "citizen_adult") as PointKind;
	const gender = (props.gender || "unknown") as Gender;
	const color = KIND_COLORS[kind] ?? KIND_COLORS.citizen_adult;
	const glyph = GENDER_GLYPH[gender] ?? "";
	const name = props.name || "";
	const subtitle = props.subtitle || "";
	const userId = props.userId || "";
	const detailUrl = userId ? `/users/${userId}` : null;
	const callButtonsHtml =
		isSuperAdmin && userId
			? `<div style="display: flex; gap: 6px; padding-top: 8px; margin-top: 8px; border-top: 1px solid #1e293b;">
					<button type="button" data-call-action="audio" data-user-id="${escapeHtml(userId)}" data-call-name="${escapeHtml(name)}" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 4px; font-size: 11px; font-weight: 500; color: #10b981; background-color: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 6px; padding: 5px 8px; cursor: pointer;">📞 Audio</button>
					<button type="button" data-call-action="video" data-user-id="${escapeHtml(userId)}" data-call-name="${escapeHtml(name)}" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 4px; font-size: 11px; font-weight: 500; color: #3b82f6; background-color: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.3); border-radius: 6px; padding: 5px 8px; cursor: pointer;">🎥 Vidéo</button>
				</div>`
			: "";
	return `<div style="font-family: system-ui, -apple-system, sans-serif; min-width: 240px; background-color: #020617; border: 1px solid #1e293b; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); overflow: hidden;">
		<div style="padding: 10px 14px; border-bottom: 1px solid #1e293b;">
			<span style="display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #ffffff; background-color: ${color}; padding: 2px 8px; border-radius: 9999px;">${KIND_LABEL[kind]}${gender !== "unknown" ? ` &middot; ${glyph}` : ""}</span>
		</div>
		<div style="padding: 12px 14px;">
			<div style="font-weight: 600; font-size: 14px; color: #f8fafc; margin-bottom: 4px; line-height: 1.3;">${escapeHtml(name)}</div>
			${subtitle ? `<div style="font-size: 11px; color: #94a3b8; margin-bottom: 10px;">${escapeHtml(subtitle)}</div>` : ""}
			${detailUrl ? `<a href="${detailUrl}" style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; color: ${color}; text-decoration: none; padding-top: 4px;">Voir la fiche &rarr;</a>` : ""}
			${callButtonsHtml}
		</div>
	</div>`;
}
