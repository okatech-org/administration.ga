"use client";

/**
 * UsersMapView — Carte interactive des utilisateurs (superadmin).
 *
 * Affiche sur une carte Mapbox :
 *  - Profils citoyens adultes (positionnés via addresses.residence.coordinates)
 *  - Profils enfants (héritent des coordonnées du parent)
 *  - Agents du corps diplomatique (positionnés sur la capitale de leur org.country)
 *
 * Filtres : population (citoyens/agents), genre (H/F), âge (adultes/enfants),
 *           continent, pays.
 */

import * as mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { api } from "@convex/_generated/api";
import { useAction } from "convex/react";
import i18n from "i18next";
import { Baby, Loader2, MapPin, MapPinOff, Shield, Sparkles, Users } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { getLocalizedValue } from "@/lib/i18n-utils";
import { MAPBOX_CONFIG } from "@/config/mapbox";
import { getCapitalCoords } from "@/lib/country-capitals";
import {
	type Continent,
	getActiveContinents,
	getContinent,
	getContinentEmoji,
	getContinentLabel,
	getCountryFlag,
	getCountryName,
} from "@/lib/country-utils";
import {
	useAuthenticatedConvexQuery,
	useAuthenticatedPaginatedQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────
type PointKind = "citizen_adult" | "citizen_child" | "agent";
type Gender = "male" | "female" | "unknown";

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

// ─── Helpers ───────────────────────────────────────────────
const ADULT_AGE_MS = 18 * 365.25 * 24 * 60 * 60 * 1000;

function isMinor(birthDate?: number | null): boolean {
	if (!birthDate) return false;
	return Date.now() - birthDate < ADULT_AGE_MS;
}

function normalizeGender(g?: string | null): Gender {
	if (g === "male" || g === "female") return g;
	return "unknown";
}

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

// ─── Component ─────────────────────────────────────────────
export function UsersMapView() {
	const { theme } = useTheme();
	const mapContainer = useRef<HTMLDivElement>(null);
	const map = useRef<mapboxgl.Map | null>(null);
	const markersRef = useRef<mapboxgl.Marker[]>([]);
	const popupRef = useRef<mapboxgl.Popup | null>(null);
	const [mapReady, setMapReady] = useState(false);

	// Filters
	const [populationFilter, setPopulationFilter] = useState<"all" | "citizens" | "agents">("all");
	const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">("all");
	const [ageFilter, setAgeFilter] = useState<"all" | "adults" | "children">("all");
	const [activeContinent, setActiveContinent] = useState<Continent | null>(null);
	const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

	// Data
	const {
		results: profiles,
		status: profilesStatus,
		loadMore,
	} = useAuthenticatedPaginatedQuery(
		api.functions.profiles.searchProfiles,
		{ searchTerm: "" },
		{ initialNumItems: 200 },
	);

	const { data: childProfiles = [] } = useAuthenticatedConvexQuery(
		api.functions.admin.listChildProfilesForMap,
		{},
	);

	const { data: agents = [] } = useAuthenticatedConvexQuery(
		api.functions.admin.listDiplomaticMembers,
		{},
	);

	useEffect(() => {
		if (profilesStatus === "CanLoadMore") loadMore(200);
	}, [profilesStatus, loadMore]);

	// Backfill geocoding state
	const backfillAction = useAction(api.functions.admin.backfillProfileCoordinates);
	const [backfill, setBackfill] = useState<{
		running: boolean;
		scanned: number;
		updated: number;
		failed: number;
	}>({ running: false, scanned: 0, updated: 0, failed: 0 });

	const runBackfill = async () => {
		if (backfill.running) return;
		setBackfill({ running: true, scanned: 0, updated: 0, failed: 0 });
		const toastId = toast.loading("Géocodage des adresses…");
		let cursor: string | null = null;
		let totals = { scanned: 0, updated: 0, failed: 0 };
		try {
			let isDone = false;
			let safety = 0;
			while (!isDone && safety++ < 200) {
				const res = await backfillAction({ cursor, pageSize: 200 });
				totals = {
					scanned: totals.scanned + res.scanned,
					updated: totals.updated + res.updated,
					failed: totals.failed + res.failed,
				};
				cursor = res.continueCursor;
				isDone = res.isDone;
				setBackfill({ running: !isDone, ...totals });
				toast.loading(
					`Géocodage… ${totals.updated} mis à jour / ${totals.scanned} traités`,
					{ id: toastId },
				);
			}
			toast.success(
				`Backfill terminé : ${totals.updated} adresses géocodées, ${totals.failed} échecs.`,
				{ id: toastId },
			);
		} catch (e) {
			toast.error(`Échec du backfill : ${(e as Error).message}`, { id: toastId });
		} finally {
			setBackfill((b) => ({ ...b, running: false }));
		}
	};

	// ── Build raw point list (before filters) ──
	const allPoints = useMemo<MapPoint[]>(() => {
		const points: MapPoint[] = [];

		for (const p of profiles as any[]) {
			const coords =
				p.addresses?.residence?.coordinates ??
				p.addresses?.homeland?.coordinates ??
				null;
			if (!coords?.lat || !coords?.lng) continue;
			const minor = isMinor(p.identity?.birthDate);
			points.push({
				id: `profile_${p._id}`,
				kind: minor ? "citizen_child" : "citizen_adult",
				gender: normalizeGender(p.identity?.gender),
				name:
					`${p.identity?.firstName ?? ""} ${p.identity?.lastName ?? ""}`.trim() ||
					(p.user?.name ?? "Profil"),
				subtitle: p.user?.email,
				coords: [coords.lng, coords.lat],
				country: p.countryOfResidence ?? p.addresses?.residence?.country,
				userId: p.userId,
			});
		}

		for (const c of childProfiles as any[]) {
			if (!c.coordinates?.lat || !c.coordinates?.lng) continue;
			points.push({
				id: `child_${c._id}`,
				kind: "citizen_child",
				gender: normalizeGender(c.gender),
				name: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Enfant",
				subtitle: c.countryOfResidence ? getCountryName(c.countryOfResidence) : undefined,
				coords: [c.coordinates.lng, c.coordinates.lat],
				country: c.countryOfResidence,
				userId: c.authorUserId,
			});
		}

		for (const a of agents as any[]) {
			const country = a.org?.country;
			if (!country) continue;
			const capital = getCapitalCoords(country);
			if (!capital) continue;
			const fullName =
				`${a.user?.firstName ?? ""} ${a.user?.lastName ?? ""}`.trim();
			// position.title is a LocalizedString ({fr,en}); resolve it before display.
			const positionLabel = a.position?.title
				? getLocalizedValue(a.position.title, i18n.language)
				: undefined;
			points.push({
				id: `agent_${a.membershipId}`,
				kind: "agent",
				gender: normalizeGender(a.diplomaticProfile?.gender ?? a.user?.gender),
				name: fullName || a.user?.name || "Agent",
				subtitle: positionLabel || a.org?.name || undefined,
				coords: capital,
				country,
				userId: a.user?._id,
			});
		}

		return points;
	}, [profiles, childProfiles, agents]);

	const continents = useMemo<Continent[]>(() => {
		const codes = allPoints.map((p) => p.country).filter(Boolean) as string[];
		return getActiveContinents(codes);
	}, [allPoints]);

	const countryOptions = useMemo(() => {
		const map = new Map<string, { code: string; label: string; count: number }>();
		for (const p of allPoints) {
			if (!p.country) continue;
			if (activeContinent && getContinent(p.country) !== activeContinent) continue;
			if (!map.has(p.country)) {
				map.set(p.country, {
					code: p.country,
					label: `${getCountryFlag(p.country)} ${getCountryName(p.country)}`,
					count: 0,
				});
			}
			map.get(p.country)!.count++;
		}
		return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
	}, [allPoints, activeContinent]);

	useEffect(() => setSelectedCountry(null), [activeContinent]);

	const filteredPoints = useMemo<MapPoint[]>(() => {
		return allPoints.filter((p) => {
			if (populationFilter === "citizens" && p.kind === "agent") return false;
			if (populationFilter === "agents" && p.kind !== "agent") return false;
			if (genderFilter !== "all" && p.gender !== genderFilter) return false;
			if (ageFilter === "adults" && p.kind === "citizen_child") return false;
			if (ageFilter === "children" && p.kind !== "citizen_child") return false;
			if (activeContinent) {
				if (!p.country || getContinent(p.country) !== activeContinent) return false;
			}
			if (selectedCountry && p.country !== selectedCountry) return false;
			return true;
		});
	}, [allPoints, populationFilter, genderFilter, ageFilter, activeContinent, selectedCountry]);

	const stats = useMemo(() => {
		const filtered = filteredPoints;
		const profilesWithoutGps =
			(profiles as any[]).filter(
				(p) =>
					!(p.addresses?.residence?.coordinates?.lat) &&
					!(p.addresses?.homeland?.coordinates?.lat),
			).length +
			(childProfiles as any[]).filter((c) => !c.coordinates?.lat).length;

		return {
			total: filtered.length,
			citizens: filtered.filter((p) => p.kind !== "agent").length,
			agents: filtered.filter((p) => p.kind === "agent").length,
			withoutGps: profilesWithoutGps,
		};
	}, [filteredPoints, profiles, childProfiles]);

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
			markersRef.current.forEach((m) => m.remove());
			markersRef.current = [];
			popupRef.current?.remove();
			map.current?.remove();
			map.current = null;
			setMapReady(false);
		};
	}, [theme]);

	// ── Refresh markers when data or filters change ──
	useEffect(() => {
		if (!map.current || !mapReady) return;
		const m = map.current;

		markersRef.current.forEach((mk) => mk.remove());
		markersRef.current = [];

		for (const point of filteredPoints) {
			const color = KIND_COLORS[point.kind];
			const glyph = GENDER_GLYPH[point.gender];

			const el = document.createElement("div");
			el.className = "users-map-marker";
			el.style.cursor = "pointer";
			el.innerHTML = `
				<div style="position: relative; width: 28px; height: 28px;">
					<div style="position: absolute; inset: 0; border-radius: 9999px; background-color: ${color}; opacity: 0.25; animation: ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></div>
					<div style="position: relative; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 9999px; background-color: ${color}; color: #ffffff; font-weight: 700; font-size: 13px; border: 2px solid #ffffff; box-shadow: 0 4px 8px rgba(0,0,0,0.3);">${glyph}</div>
				</div>
			`;

			const detailUrl = point.userId ? `/users/${point.userId}` : null;
			// Wrapper has its own opaque background (slate-950) + border so the
			// popup is readable on top of the dark Mapbox globe — same pattern
			// as apps/citizen-web/src/components/home/WorldMapSection.tsx:174.
			const popup = new mapboxgl.Popup({
				offset: 18,
				closeButton: true,
				className: "users-map-popup",
			}).setHTML(
				`<div style="font-family: system-ui, -apple-system, sans-serif; min-width: 240px; background-color: #020617; border: 1px solid #1e293b; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); overflow: hidden;">
					<div style="padding: 10px 14px; border-bottom: 1px solid #1e293b;">
						<span style="display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #ffffff; background-color: ${color}; padding: 2px 8px; border-radius: 9999px;">${KIND_LABEL[point.kind]}${point.gender !== "unknown" ? ` &middot; ${glyph}` : ""}</span>
					</div>
					<div style="padding: 12px 14px;">
						<div style="font-weight: 600; font-size: 14px; color: #f8fafc; margin-bottom: 4px; line-height: 1.3;">${escapeHtml(point.name)}</div>
						${point.subtitle ? `<div style="font-size: 11px; color: #94a3b8; margin-bottom: 10px;">${escapeHtml(point.subtitle)}</div>` : ""}
						${detailUrl ? `<a href="${detailUrl}" style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; color: ${color}; text-decoration: none; padding-top: 4px;">Voir la fiche &rarr;</a>` : ""}
					</div>
				</div>`,
			);

			const marker = new mapboxgl.Marker({ element: el })
				.setLngLat(point.coords)
				.setPopup(popup)
				.addTo(m);

			markersRef.current.push(marker);
		}
	}, [mapReady, filteredPoints]);

	// ── Recenter on country selection ──
	useEffect(() => {
		if (!map.current || !mapReady) return;
		if (selectedCountry) {
			const c = getCapitalCoords(selectedCountry);
			if (c) map.current.flyTo({ center: c, zoom: 4 });
		} else if (activeContinent && filteredPoints.length > 0) {
			const avgLng = filteredPoints.reduce((s, p) => s + p.coords[0], 0) / filteredPoints.length;
			const avgLat = filteredPoints.reduce((s, p) => s + p.coords[1], 0) / filteredPoints.length;
			map.current.flyTo({ center: [avgLng, avgLat], zoom: 2.5 });
		} else {
			map.current.flyTo({ center: [20, 20], zoom: 1.6 });
		}
	}, [selectedCountry, activeContinent, mapReady, filteredPoints]);

	const isDataLoading =
		profilesStatus === "LoadingFirstPage" || profilesStatus === "LoadingMore";

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

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-6">
			{/* Header + stats */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Carte des utilisateurs</h1>
					<p className="text-muted-foreground">
						Vision géographique globale : citoyens, enfants et agents diplomatiques.
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-2">
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
					{stats.withoutGps > 0 && (
						<button
							type="button"
							onClick={runBackfill}
							disabled={backfill.running}
							className={cn(
								"flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors",
								"hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60",
							)}
							title="Géocode toutes les adresses sans GPS via Google Geocoding"
						>
							{backfill.running ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : (
								<Sparkles className="h-3.5 w-3.5" />
							)}
							<span>
								{backfill.running
									? `Géocodage… ${backfill.updated}/${backfill.scanned}`
									: "Géocoder les adresses"}
							</span>
						</button>
					)}
				</div>
			</div>

			{/* Filter chips */}
			<div className="flex flex-col gap-2">
				<div className="flex flex-wrap gap-2">
					<FilterGroup label="Population">
						<Chip active={populationFilter === "all"} onClick={() => setPopulationFilter("all")}>Tous</Chip>
						<Chip active={populationFilter === "citizens"} onClick={() => setPopulationFilter("citizens")}>
							<Users className="h-3.5 w-3.5" /> Citoyens
						</Chip>
						<Chip active={populationFilter === "agents"} onClick={() => setPopulationFilter("agents")}>
							<Shield className="h-3.5 w-3.5" /> Agents
						</Chip>
					</FilterGroup>

					<FilterGroup label="Genre">
						<Chip active={genderFilter === "all"} onClick={() => setGenderFilter("all")}>Tous</Chip>
						<Chip active={genderFilter === "male"} onClick={() => setGenderFilter("male")}>♂ Hommes</Chip>
						<Chip active={genderFilter === "female"} onClick={() => setGenderFilter("female")}>♀ Femmes</Chip>
					</FilterGroup>

					<FilterGroup label="Âge">
						<Chip active={ageFilter === "all"} onClick={() => setAgeFilter("all")}>Tous</Chip>
						<Chip active={ageFilter === "adults"} onClick={() => setAgeFilter("adults")}>Adultes</Chip>
						<Chip active={ageFilter === "children"} onClick={() => setAgeFilter("children")}>
							<Baby className="h-3.5 w-3.5" /> Enfants
						</Chip>
					</FilterGroup>
				</div>

				{continents.length > 0 && (
					<div className="flex flex-wrap gap-1.5 rounded-xl bg-muted/50 p-1">
						<button
							type="button"
							onClick={() => setActiveContinent(null)}
							className={cn(
								"flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
								activeContinent === null
									? "bg-background text-foreground"
									: "text-muted-foreground hover:bg-background/50 hover:text-foreground",
							)}
						>
							<span>Tous continents</span>
						</button>
						{continents.map((continent) => (
							<button
								key={continent}
								type="button"
								onClick={() => setActiveContinent(continent)}
								className={cn(
									"flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
									activeContinent === continent
										? "bg-background text-foreground"
										: "text-muted-foreground hover:bg-background/50 hover:text-foreground",
								)}
							>
								<span>{getContinentEmoji(continent)}</span>
								<span className="hidden sm:inline">{getContinentLabel(continent)}</span>
							</button>
						))}
					</div>
				)}

				{countryOptions.length > 0 && (
					<div className="flex flex-wrap gap-1 px-1">
						<button
							type="button"
							onClick={() => setSelectedCountry(null)}
							className={cn(
								"flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
								!selectedCountry
									? "border border-primary/20 bg-primary/10 text-primary"
									: "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
							)}
						>
							Tous les pays
						</button>
						{countryOptions.map((opt) => (
							<button
								key={opt.code}
								type="button"
								onClick={() => setSelectedCountry(opt.code)}
								className={cn(
									"flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
									selectedCountry === opt.code
										? "border border-primary/20 bg-primary/10 text-primary"
										: "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
								)}
							>
								<span>{opt.label}</span>
								<span className="ml-0.5 text-[10px] opacity-70">{opt.count}</span>
							</button>
						))}
					</div>
				)}
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
			{/* Map — fixed height container, same pattern as
			    apps/citizen-web/src/components/home/WorldMapSection.tsx:357 */}
			<div className="relative h-[600px] w-full overflow-hidden rounded-xl border bg-muted/20">
				<div ref={mapContainer} className="absolute inset-0 h-full w-full" />

				{isDataLoading && (
					<div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-lg border bg-background/95 px-3 py-1.5 text-xs shadow-lg backdrop-blur">
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
				"flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm",
				tone === "warning"
					? "border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
					: "bg-muted/50",
			)}
		>
			<Icon className="h-3.5 w-3.5 text-muted-foreground" />
			<span className="font-medium">{value}</span>
			<span className="text-muted-foreground">{label}</span>
		</div>
	);
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex items-center gap-1.5">
			<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</span>
			<div className="flex items-center gap-1 rounded-lg bg-muted/40 p-0.5">{children}</div>
		</div>
	);
}

function Chip({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
				active
					? "bg-background text-foreground shadow-sm"
					: "text-muted-foreground hover:text-foreground",
			)}
		>
			{children}
		</button>
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
