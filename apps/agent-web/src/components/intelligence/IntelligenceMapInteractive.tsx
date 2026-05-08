"use client";

/**
 * IntelligenceMapInteractive — Carte du module Renseignement souverain.
 *
 * Calque sur `apps/backoffice-web/src/components/admin/users-map-view.tsx` :
 * filtres alignés (Combobox primitive), stats overlay top-right, légende
 * bottom-left, popup avec wrapper opaque + chrome Mapbox neutralisé via
 * scoped CSS.
 *
 * Source de données : `intelligence.getMapData` — retourne profils citoyens
 * (avec coords) + cibles diplomatiques (sans coords, fallback capitale).
 */

import { api } from "@convex/_generated/api";
import "mapbox-gl/dist/mapbox-gl.css";
import * as mapboxgl from "mapbox-gl";
import {
	Baby,
	Building2,
	Globe,
	Loader2,
	MapPin,
	MapPinOff,
	Target,
	UserCircle,
	Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { PageHeader } from "@workspace/agent-features/components/my-space";
import { useOrg } from "@workspace/agent-features/shell";
import { Button } from "@workspace/ui/components/button";
import {
	Combobox,
	type ComboboxOption,
} from "@workspace/ui/components/combobox";
import { cn } from "@workspace/ui/lib/utils";

import { MAPBOX_CONFIG, getCapitalCoords } from "@/lib/mapbox";
import {
	type Continent,
	CONTINENT_META,
	getActiveContinents,
	getContinent,
	getCountryFlag,
	getCountryName,
} from "@/lib/country-utils";

// ─── Types ─────────────────────────────────────────────────
type TargetKind = "profile" | "child_profile" | "diplomatic_target" | "agent";
type GeoSource = "gps" | "fallback";
type Gender = "male" | "female" | "unknown";

interface MapPoint {
	id: string;
	kind: TargetKind;
	geoSource: GeoSource;
	gender: Gender;
	label: string;
	country?: string;
	coords: [number, number];
	targetType: string;
	targetId: string;
}

const KIND_COLORS: Record<TargetKind, string> = {
	profile: "#e11d48", // rose
	child_profile: "#f59e0b", // amber
	diplomatic_target: "#0ea5e9", // sky
	agent: "#10b981", // emerald
};

const KIND_LABEL: Record<TargetKind, string> = {
	profile: "Profil citoyen",
	child_profile: "Mineur",
	diplomatic_target: "Cible diplomatique",
	agent: "Agent",
};

const KIND_ICON: Record<TargetKind, React.ElementType> = {
	profile: Users,
	child_profile: Baby,
	diplomatic_target: Building2,
	agent: UserCircle,
};

const GENDER_GLYPH: Record<Gender, string> = {
	male: "♂",
	female: "♀",
	unknown: "",
};

function normalizeGender(g?: string | null): Gender {
	if (g === "male" || g === "female") return g;
	return "unknown";
}

function escapeHtml(s: string | null | undefined): string {
	if (s == null) return "";
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

// ─── Component ─────────────────────────────────────────────
export default function IntelligenceMapInteractive() {
	const { activeOrgId } = useOrg();
	const { theme } = useTheme();

	const mapContainer = useRef<HTMLDivElement>(null);
	const map = useRef<mapboxgl.Map | null>(null);
	const markersRef = useRef<mapboxgl.Marker[]>([]);
	const [mapReady, setMapReady] = useState(false);

	// Filtres
	const [kindFilter, setKindFilter] = useState<"all" | TargetKind>("all");
	const [geoFilter, setGeoFilter] = useState<"all" | GeoSource>("all");
	const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">(
		"all",
	);
	const [activeContinent, setActiveContinent] = useState<Continent | null>(
		null,
	);
	const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

	const { data: serverPoints, isPending } = useAuthenticatedConvexQuery(
		api.functions.intelligence.getMapData,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	// ── Build raw point list (avant filtres) ──
	const allPoints = useMemo<MapPoint[]>(() => {
		if (!serverPoints) return [];
		const out: MapPoint[] = [];
		for (const p of serverPoints) {
			const kind = p.targetType as TargetKind;
			const gender = normalizeGender(
				(p as { gender?: string | null }).gender,
			);
			if (p.lat !== undefined && p.lng !== undefined) {
				out.push({
					id: `${p.targetType}:${p.targetId}`,
					kind,
					geoSource: "gps",
					gender,
					label: p.label || "(sans nom)",
					country: p.country,
					coords: [p.lng, p.lat],
					targetType: p.targetType,
					targetId: p.targetId,
				});
				continue;
			}
			const cap = getCapitalCoords(p.country);
			if (cap) {
				out.push({
					id: `${p.targetType}:${p.targetId}`,
					kind,
					geoSource: "fallback",
					gender,
					label: p.label || "(sans nom)",
					country: p.country,
					coords: cap,
					targetType: p.targetType,
					targetId: p.targetId,
				});
			}
		}
		return out;
	}, [serverPoints]);

	const continents = useMemo<Continent[]>(() => {
		const codes = allPoints.map((p) => p.country).filter(Boolean) as string[];
		return getActiveContinents(codes);
	}, [allPoints]);

	const countryOptions = useMemo(() => {
		const m = new Map<string, { code: string; label: string; count: number }>();
		for (const p of allPoints) {
			if (!p.country) continue;
			if (activeContinent && getContinent(p.country) !== activeContinent)
				continue;
			if (!m.has(p.country)) {
				m.set(p.country, {
					code: p.country,
					label: `${getCountryFlag(p.country)} ${getCountryName(p.country)}`,
					count: 0,
				});
			}
			m.get(p.country)!.count += 1;
		}
		return [...m.values()].sort((a, b) => a.label.localeCompare(b.label));
	}, [allPoints, activeContinent]);

	// Reset country quand on change de continent
	useEffect(() => setSelectedCountry(null), [activeContinent]);

	const filteredPoints = useMemo<MapPoint[]>(() => {
		return allPoints.filter((p) => {
			if (kindFilter !== "all" && p.kind !== kindFilter) return false;
			if (geoFilter !== "all" && p.geoSource !== geoFilter) return false;
			if (genderFilter !== "all" && p.gender !== genderFilter) return false;
			if (activeContinent) {
				if (!p.country || getContinent(p.country) !== activeContinent)
					return false;
			}
			if (selectedCountry && p.country !== selectedCountry) return false;
			return true;
		});
	}, [
		allPoints,
		kindFilter,
		geoFilter,
		genderFilter,
		activeContinent,
		selectedCountry,
	]);

	const stats = useMemo(() => {
		const total = filteredPoints.length;
		const withGps = filteredPoints.filter((p) => p.geoSource === "gps").length;
		const fallback = total - withGps;
		const countries = new Set(
			filteredPoints.map((p) => p.country).filter(Boolean),
		).size;
		return { total, withGps, fallback, countries };
	}, [filteredPoints]);

	// ── Initialisation Mapbox ──
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

	// ── Markers + popups (calque users-map-view) ──
	useEffect(() => {
		if (!map.current || !mapReady) return;
		const m = map.current;

		markersRef.current.forEach((mk) => mk.remove());
		markersRef.current = [];

		for (const point of filteredPoints) {
			const color = KIND_COLORS[point.kind];

			const el = document.createElement("div");
			el.className = "intel-map-marker";
			el.style.cursor = "pointer";
			el.innerHTML = `
				<div style="position: relative; width: 22px; height: 22px;">
					<div style="position: absolute; inset: 0; border-radius: 9999px; background-color: ${color}; opacity: 0.25; animation: ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></div>
					<div style="position: relative; display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 9999px; background-color: ${color}; border: 2px solid #ffffff; box-shadow: 0 4px 8px rgba(0,0,0,0.3); ${point.geoSource === "fallback" ? "opacity: 0.7;" : ""}"></div>
				</div>
			`;

			// Wrapper opaque (slate-950) sur fond transparent du popup Mapbox.
			// Même pattern que users-map-view : le chrome Mapbox est neutralisé
			// via le className `intel-map-popup` + le <style> scoped plus bas.
			const popup = new mapboxgl.Popup({
				offset: 18,
				closeButton: true,
				className: "intel-map-popup",
			}).setHTML(
				`<div style="font-family: system-ui, -apple-system, sans-serif; min-width: 240px; background-color: #020617; border: 1px solid #1e293b; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); overflow: hidden;">
					<div style="padding: 10px 14px; border-bottom: 1px solid #1e293b;">
						<span style="display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #ffffff; background-color: ${color}; padding: 2px 8px; border-radius: 9999px;">${KIND_LABEL[point.kind]}${point.gender !== "unknown" ? ` &middot; ${GENDER_GLYPH[point.gender]}` : ""}${point.geoSource === "fallback" ? " &middot; capitale" : ""}</span>
					</div>
					<div style="padding: 12px 14px;">
						<div style="font-weight: 600; font-size: 14px; color: #f8fafc; margin-bottom: 4px; line-height: 1.3;">${escapeHtml(point.label)}</div>
						${point.country ? `<div style="font-size: 11px; color: #94a3b8; margin-bottom: 10px;">${escapeHtml(getCountryName(point.country))}</div>` : ""}
						<a href="/agence/profiles/${escapeHtml(point.targetType)}/${escapeHtml(point.targetId)}" style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; color: ${color}; text-decoration: none; padding-top: 4px;">Voir la fiche &rarr;</a>
					</div>
				</div>`,
			);

			const marker = new mapboxgl.Marker({ element: el })
				.setLngLat(point.coords)
				.setPopup(popup)
				.addTo(m);

			markersRef.current.push(marker);
		}
	}, [filteredPoints, mapReady]);

	// ── Recentrage sur sélection ──
	useEffect(() => {
		if (!map.current || !mapReady) return;
		if (selectedCountry) {
			const c = getCapitalCoords(selectedCountry);
			if (c) map.current.flyTo({ center: c, zoom: 4 });
		} else if (activeContinent && filteredPoints.length > 0) {
			const avgLng =
				filteredPoints.reduce((s, p) => s + p.coords[0], 0) /
				filteredPoints.length;
			const avgLat =
				filteredPoints.reduce((s, p) => s + p.coords[1], 0) /
				filteredPoints.length;
			map.current.flyTo({ center: [avgLng, avgLat], zoom: 2.5 });
		} else {
			map.current.flyTo({ center: [10, 20], zoom: 1.6 });
		}
	}, [selectedCountry, activeContinent, mapReady, filteredPoints]);

	// ── Pas de token ──
	if (!MAPBOX_CONFIG.accessToken) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
				<MapPinOff className="h-10 w-10 text-muted-foreground" />
				<h2 className="text-lg font-semibold">Carte indisponible</h2>
				<p className="max-w-md text-sm text-muted-foreground">
					La variable d&apos;environnement{" "}
					<code className="rounded bg-muted px-1.5 py-0.5 text-xs">
						NEXT_PUBLIC_MAPBOX_TOKEN
					</code>{" "}
					n&apos;est pas configurée pour agent-web.
				</p>
			</div>
		);
	}

	// ── Options dropdown ──
	const ALL = "__all__";

	const kindDropdownOptions: ComboboxOption[] = [
		{ value: ALL, label: `Toutes (${allPoints.length})` },
		...(["profile", "child_profile", "diplomatic_target", "agent"] as const).map(
			(k) => ({
				value: k,
				label: `${KIND_LABEL[k]} (${allPoints.filter((p) => p.kind === k).length})`,
			}),
		),
	];

	const geoDropdownOptions: ComboboxOption[] = [
		{ value: ALL, label: `Toutes (${allPoints.length})` },
		{
			value: "gps",
			label: `GPS précis (${allPoints.filter((p) => p.geoSource === "gps").length})`,
		},
		{
			value: "fallback",
			label: `Capitale (${allPoints.filter((p) => p.geoSource === "fallback").length})`,
		},
	];

	const genderDropdownOptions: ComboboxOption[] = [
		{ value: ALL, label: `Tous (${allPoints.length})` },
		{
			value: "male",
			label: `♂ Hommes (${allPoints.filter((p) => p.gender === "male").length})`,
		},
		{
			value: "female",
			label: `♀ Femmes (${allPoints.filter((p) => p.gender === "female").length})`,
		},
	];

	const continentDropdownOptions: ComboboxOption[] = [
		{ value: ALL, label: "Tous les continents" },
		...continents.map((c) => ({
			value: c,
			label: `${CONTINENT_META[c].label} (${
				allPoints.filter(
					(p) => p.country && getContinent(p.country) === c,
				).length
			})`,
		})),
	];

	const countryDropdownOptions: ComboboxOption[] = [
		{ value: ALL, label: "Tous les pays" },
		...countryOptions.map((opt) => ({
			value: opt.code,
			label: `${opt.label} (${opt.count})`,
		})),
	];

	const hasActiveFilter =
		kindFilter !== "all" ||
		geoFilter !== "all" ||
		genderFilter !== "all" ||
		activeContinent !== null ||
		selectedCountry !== null;

	const resetFilters = () => {
		setKindFilter("all");
		setGeoFilter("all");
		setGenderFilter("all");
		setActiveContinent(null);
		setSelectedCountry(null);
	};

	return (
		<div className="flex flex-col gap-6 p-4 lg:p-6 overflow-y-auto citizen-scrollbar">
			<PageHeader
				icon={<Globe className="h-5 w-5 text-rose-500" />}
				title="Carte du renseignement"
				subtitle="Répartition mondiale des profils surveillés, mineurs, contacts diplomatiques et agents."
			/>

			{/* Filter row */}
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
				<MapFilterField label="Type">
					<Combobox
						options={kindDropdownOptions}
						value={kindFilter === "all" ? ALL : kindFilter}
						onValueChange={(v) =>
							setKindFilter(v === ALL ? "all" : (v as TargetKind))
						}
						placeholder="Type"
						searchPlaceholder="Filtrer…"
						emptyText="—"
						className="h-9"
					/>
				</MapFilterField>

				<MapFilterField label="Genre">
					<Combobox
						options={genderDropdownOptions}
						value={genderFilter === "all" ? ALL : genderFilter}
						onValueChange={(v) =>
							setGenderFilter(v === ALL ? "all" : (v as "male" | "female"))
						}
						placeholder="Genre"
						searchPlaceholder="Filtrer…"
						emptyText="—"
						className="h-9"
					/>
				</MapFilterField>

				<MapFilterField label="Géolocalisation">
					<Combobox
						options={geoDropdownOptions}
						value={geoFilter === "all" ? ALL : geoFilter}
						onValueChange={(v) =>
							setGeoFilter(v === ALL ? "all" : (v as GeoSource))
						}
						placeholder="Géoloc."
						searchPlaceholder="Filtrer…"
						emptyText="—"
						className="h-9"
					/>
				</MapFilterField>

				<MapFilterField label="Continent">
					<Combobox
						options={continentDropdownOptions}
						value={activeContinent ?? ALL}
						onValueChange={(v) =>
							setActiveContinent(v === ALL ? null : (v as Continent))
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
						value={selectedCountry ?? ALL}
						onValueChange={(v) =>
							setSelectedCountry(v === ALL ? null : v)
						}
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

			{/* Scoped CSS — neutralise le chrome Mapbox pour que notre wrapper
			    opaque ne soit pas encadré par une bulle blanche par défaut. */}
			<style
				dangerouslySetInnerHTML={{
					__html: `
						.mapboxgl-popup.intel-map-popup .mapboxgl-popup-content {
							background: transparent !important;
							padding: 0 !important;
							box-shadow: none !important;
							border-radius: 12px;
						}
						.mapboxgl-popup.intel-map-popup .mapboxgl-popup-tip {
							border-top-color: #020617 !important;
							border-bottom-color: #020617 !important;
						}
						.mapboxgl-popup.intel-map-popup .mapboxgl-popup-close-button {
							color: #94a3b8;
							font-size: 18px;
							padding: 4px 8px;
							right: 4px;
							top: 4px;
						}
						.mapboxgl-popup.intel-map-popup .mapboxgl-popup-close-button:hover {
							color: #f8fafc;
							background: transparent;
						}
					`,
				}}
			/>

			{/* Carte */}
			<div className="relative h-[600px] w-full overflow-hidden rounded-xl border bg-muted/20">
				<div ref={mapContainer} className="absolute inset-0 h-full w-full" />

				{/* Stats overlay top-right */}
				<div className="absolute right-4 top-4 z-10 flex flex-wrap items-center gap-1.5 rounded-lg border bg-background/95 px-2 py-1.5 text-xs shadow-lg backdrop-blur">
					<StatChip icon={MapPin} label="affichés" value={stats.total} />
					<StatChip icon={Target} label="GPS" value={stats.withGps} />
					{stats.fallback > 0 && (
						<StatChip
							icon={MapPinOff}
							label="capitale"
							value={stats.fallback}
							tone="warning"
						/>
					)}
					<StatChip icon={Globe} label="pays" value={stats.countries} />
				</div>

				{(isPending || !mapReady) && (
					<div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-lg border bg-background/95 px-3 py-1.5 text-xs shadow-lg backdrop-blur">
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
						<span>{isPending ? "Chargement…" : "Initialisation…"}</span>
					</div>
				)}

				{mapReady && filteredPoints.length === 0 && !isPending && (
					<div className="absolute left-1/2 top-16 z-10 -translate-x-1/2 rounded-lg border bg-background/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
						<p className="font-medium">
							{hasActiveFilter
								? "Aucun point ne correspond aux filtres."
								: "Aucune cible sur cet organisme."}
						</p>
					</div>
				)}

				{/* Légende bottom-left */}
				<div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1.5 rounded-lg border bg-background/95 p-3 text-xs shadow-lg backdrop-blur">
					<LegendItem color={KIND_COLORS.profile} label="Profil citoyen" />
					<LegendItem color={KIND_COLORS.child_profile} label="Mineur" />
					<LegendItem
						color={KIND_COLORS.diplomatic_target}
						label="Cible diplomatique"
					/>
					<LegendItem color={KIND_COLORS.agent} label="Agent" />
				</div>
			</div>

			{/* Chips toggle type — affichage rapide d'une catégorie. Cliquer
			    deux fois sur la même chip réactive « Tous ». */}
			<div className="flex flex-wrap items-center gap-2">
				<span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mr-1">
					Affichage rapide
				</span>
				<KindChip
					active={kindFilter === "all"}
					color="text-foreground"
					icon={Target}
					label="Tous"
					count={allPoints.length}
					onClick={() => setKindFilter("all")}
				/>
				{(["profile", "child_profile", "diplomatic_target", "agent"] as const).map(
					(k) => (
						<KindChip
							key={k}
							active={kindFilter === k}
							color={KIND_COLORS[k]}
							icon={KIND_ICON[k]}
							label={KIND_LABEL[k]}
							count={allPoints.filter((p) => p.kind === k).length}
							onClick={() => setKindFilter(kindFilter === k ? "all" : k)}
						/>
					),
				)}
			</div>
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
				className={cn(
					"inline-flex items-center justify-center rounded-full p-0.5",
					active ? "ring-2 ring-offset-1 ring-offset-background" : "",
				)}
				style={isHex ? { color, ...(active ? { boxShadow: `0 0 0 2px ${color}` } : {}) } : undefined}
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

