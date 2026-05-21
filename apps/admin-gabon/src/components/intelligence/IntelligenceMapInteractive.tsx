"use client";

/**
 * IntelligenceMapInteractive — Carte du module Renseignement souverain.
 *
 * Délègue le rendu Mapbox au composant partagé `<ClusteredMap>` de
 * `@workspace/map` (source GeoJSON clusterisée + 3 layers WebGL). Cette
 * vue ne contient plus que la logique métier intelligence :
 *
 *  - data fetching Convex (intelligence.getMapData) + résolution des
 *    capitales en fallback pour les points sans GPS,
 *  - filtres locaux (type, genre, géolocalisation, continent, pays) +
 *    stats overlay,
 *  - popup HTML maison avec lien vers la fiche cible.
 */

import { api } from "@convex/_generated/api";
import "mapbox-gl/dist/mapbox-gl.css";
import "@workspace/map/styles.css";
import {
	Baby,
	Building2,
	Globe,
	MapPin,
	MapPinOff,
	Target,
	UserCircle,
	Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { PageHeader } from "@workspace/agent-features/components/my-space";
import { useOrg } from "@workspace/agent-features/shell";
import {
	ClusteredMap,
	type ClusteredMapFlyTo,
	type ClusteredMapPoint,
} from "@workspace/map/clustered-map";
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

interface IntelPointData {
	label: string;
	country?: string;
	geoSource: GeoSource;
	gender: Gender;
	targetType: string;
	targetId: string;
}

const KIND_COLORS: Record<TargetKind, string> = {
	profile: "#e11d48",          // rose
	child_profile: "#f59e0b",    // amber
	diplomatic_target: "#0ea5e9", // sky
	agent: "#10b981",            // emerald
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

	// Build the unfiltered point list. Points without GPS fall back to the
	// org country's capital coords; that distinction is preserved as
	// `geoSource` in the per-point `data` payload.
	const allPoints = useMemo<ClusteredMapPoint[]>(() => {
		if (!serverPoints) return [];
		const out: ClusteredMapPoint[] = [];
		for (const p of serverPoints) {
			const kind = p.targetType as TargetKind;
			const gender = normalizeGender((p as { gender?: string | null }).gender);
			const baseData: IntelPointData = {
				label: p.label || "(sans nom)",
				country: p.country,
				geoSource: "gps",
				gender,
				targetType: p.targetType,
				targetId: p.targetId,
			};
			if (p.lat !== undefined && p.lng !== undefined) {
				out.push({
					id: `${p.targetType}:${p.targetId}`,
					kind,
					coords: [p.lng, p.lat],
					data: baseData as unknown as Record<string, unknown>,
				});
				continue;
			}
			const cap = getCapitalCoords(p.country);
			if (cap) {
				out.push({
					id: `${p.targetType}:${p.targetId}`,
					kind,
					coords: cap,
					data: { ...baseData, geoSource: "fallback" } as unknown as Record<string, unknown>,
				});
			}
		}
		return out;
	}, [serverPoints]);

	const continents = useMemo<Continent[]>(() => {
		const codes = allPoints
			.map((p) => (p.data as unknown as IntelPointData).country)
			.filter(Boolean) as string[];
		return getActiveContinents(codes);
	}, [allPoints]);

	const countryOptions = useMemo(() => {
		const m = new Map<string, { code: string; label: string; count: number }>();
		for (const p of allPoints) {
			const country = (p.data as unknown as IntelPointData).country;
			if (!country) continue;
			if (activeContinent && getContinent(country) !== activeContinent)
				continue;
			if (!m.has(country)) {
				m.set(country, {
					code: country,
					label: `${getCountryFlag(country)} ${getCountryName(country)}`,
					count: 0,
				});
			}
			m.get(country)!.count += 1;
		}
		return [...m.values()].sort((a, b) => a.label.localeCompare(b.label));
	}, [allPoints, activeContinent]);

	useEffect(() => setSelectedCountry(null), [activeContinent]);

	const filteredPoints = useMemo<ClusteredMapPoint[]>(() => {
		return allPoints.filter((p) => {
			const data = p.data as unknown as IntelPointData;
			if (kindFilter !== "all" && p.kind !== kindFilter) return false;
			if (geoFilter !== "all" && data.geoSource !== geoFilter) return false;
			if (genderFilter !== "all" && data.gender !== genderFilter) return false;
			if (activeContinent) {
				if (!data.country || getContinent(data.country) !== activeContinent)
					return false;
			}
			if (selectedCountry && data.country !== selectedCountry) return false;
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
		const withGps = filteredPoints.filter(
			(p) => (p.data as unknown as IntelPointData).geoSource === "gps",
		).length;
		const fallback = total - withGps;
		const countries = new Set(
			filteredPoints
				.map((p) => (p.data as unknown as IntelPointData).country)
				.filter(Boolean),
		).size;
		return { total, withGps, fallback, countries };
	}, [filteredPoints]);

	// ── flyTo (continent average / country capital / world) ──
	const flyTo = useMemo<ClusteredMapFlyTo | null>(() => {
		if (selectedCountry) {
			const c = getCapitalCoords(selectedCountry);
			return c ? { center: c, zoom: 4 } : null;
		}
		if (activeContinent && filteredPoints.length > 0) {
			const avgLng =
				filteredPoints.reduce((s, p) => s + p.coords[0], 0) /
				filteredPoints.length;
			const avgLat =
				filteredPoints.reduce((s, p) => s + p.coords[1], 0) /
				filteredPoints.length;
			return { center: [avgLng, avgLat], zoom: 2.5 };
		}
		return { center: [10, 20], zoom: 1.6 };
	}, [selectedCountry, activeContinent, filteredPoints]);

	const renderPopup = useCallback((point: ClusteredMapPoint) => {
		const data = point.data as unknown as IntelPointData;
		const kind = point.kind as TargetKind;
		const color = KIND_COLORS[kind];
		const fallbackTag =
			data.geoSource === "fallback" ? " &middot; capitale" : "";
		const genderTag =
			data.gender !== "unknown" ? ` &middot; ${GENDER_GLYPH[data.gender]}` : "";
		return `<div style="font-family: system-ui, -apple-system, sans-serif; min-width: 240px; background-color: #020617; border: 1px solid #1e293b; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); overflow: hidden;">
			<div style="padding: 10px 14px; border-bottom: 1px solid #1e293b;">
				<span style="display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #ffffff; background-color: ${color}; padding: 2px 8px; border-radius: 9999px;">${KIND_LABEL[kind]}${genderTag}${fallbackTag}</span>
			</div>
			<div style="padding: 12px 14px;">
				<div style="font-weight: 600; font-size: 14px; color: #f8fafc; margin-bottom: 4px; line-height: 1.3;">${escapeHtml(data.label)}</div>
				${data.country ? `<div style="font-size: 11px; color: #94a3b8; margin-bottom: 10px;">${escapeHtml(getCountryName(data.country))}</div>` : ""}
				<a href="/agence/profiles/${escapeHtml(data.targetType)}/${escapeHtml(data.targetId)}" style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; color: ${color}; text-decoration: none; padding-top: 4px;">Voir la fiche &rarr;</a>
			</div>
		</div>`;
	}, []);

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

	// ── Dropdown options ──
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
			label: `GPS précis (${allPoints.filter((p) => (p.data as unknown as IntelPointData).geoSource === "gps").length})`,
		},
		{
			value: "fallback",
			label: `Capitale (${allPoints.filter((p) => (p.data as unknown as IntelPointData).geoSource === "fallback").length})`,
		},
	];

	const genderDropdownOptions: ComboboxOption[] = [
		{ value: ALL, label: `Tous (${allPoints.length})` },
		{
			value: "male",
			label: `♂ Hommes (${allPoints.filter((p) => (p.data as unknown as IntelPointData).gender === "male").length})`,
		},
		{
			value: "female",
			label: `♀ Femmes (${allPoints.filter((p) => (p.data as unknown as IntelPointData).gender === "female").length})`,
		},
	];

	const continentDropdownOptions: ComboboxOption[] = [
		{ value: ALL, label: "Tous les continents" },
		...continents.map((c) => ({
			value: c,
			label: `${CONTINENT_META[c].label} (${
				allPoints.filter(
					(p) =>
						(p.data as unknown as IntelPointData).country &&
						getContinent((p.data as unknown as IntelPointData).country!) === c,
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

			<ClusteredMap
				accessToken={MAPBOX_CONFIG.accessToken}
				styleLight={MAPBOX_CONFIG.styleLight}
				styleDark={MAPBOX_CONFIG.styleDark}
				theme={theme === "dark" ? "dark" : "light"}
				points={filteredPoints}
				kindColors={KIND_COLORS}
				renderPopup={renderPopup}
				flyTo={flyTo}
				initialCenter={[10, 20]}
				initialZoom={1.5}
				className="relative h-[600px] w-full overflow-hidden rounded-xl border bg-muted/20"
				loading={isPending ? "Chargement…" : false}
				overlay={
					<>
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

						{filteredPoints.length === 0 && !isPending && (
							<div className="absolute left-1/2 top-16 z-10 -translate-x-1/2 rounded-lg border bg-background/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
								<p className="font-medium">
									{hasActiveFilter
										? "Aucun point ne correspond aux filtres."
										: "Aucune cible sur cet organisme."}
								</p>
							</div>
						)}

						<div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1.5 rounded-lg border bg-background/95 p-3 text-xs shadow-lg backdrop-blur">
							<LegendItem color={KIND_COLORS.profile} label="Profil citoyen" />
							<LegendItem color={KIND_COLORS.child_profile} label="Mineur" />
							<LegendItem
								color={KIND_COLORS.diplomatic_target}
								label="Cible diplomatique"
							/>
							<LegendItem color={KIND_COLORS.agent} label="Agent" />
						</div>
					</>
				}
			/>

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
