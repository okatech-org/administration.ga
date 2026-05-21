"use client";

/**
 * UsersMapView — Carte interactive des utilisateurs (superadmin).
 *
 * Délègue tout le rendu Mapbox (init, source GeoJSON clusterisée, layers,
 * popups, hover, fly-to) au composant partagé `ClusteredMap` du package
 * `@workspace/map`. Ne reste ici que la logique back-office spécifique :
 *
 *  - data fetching Convex (listMapPoints + getMapFacets) avec stable-ref
 *    pour éviter les clignotements pendant le changement de filtre,
 *  - état des filtres dans l'URL via router.replace,
 *  - résolution des coords des agents via la table des capitales front,
 *  - popup HTML maison (avec boutons d'appel audio/vidéo super-admin),
 *  - délégation des clics sur les boutons d'appel injectés en innerHTML
 *    dans le popup,
 *  - barre de filtres + chips "Affichage rapide" + stats overlay.
 */

import "mapbox-gl/dist/mapbox-gl.css";
import "@workspace/map/styles.css";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import i18n from "i18next";
import { MapPin, MapPinOff, Shield, Users } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import {
	ClusteredMap,
	type ClusteredMapFlyTo,
	type ClusteredMapPoint,
} from "@workspace/map/clustered-map";
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

// ─── Types & constants ─────────────────────────────────────
type PointKind = "citizen_adult" | "citizen_child" | "agent";
type Gender = "male" | "female" | "unknown";
type PopulationFilter = "all" | "citizens" | "agents";
type GenderFilter = "all" | "male" | "female";
type AgeFilter = "all" | "adults" | "children";

const KIND_COLORS: Record<PointKind, string> = {
	citizen_adult: "#3b82f6",
	citizen_child: "#f59e0b",
	agent: "#10b981",
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

const P = {
	pop: "pop",
	gender: "gender",
	age: "age",
	continent: "continent",
	country: "country",
} as const;

// ─── Helpers ───────────────────────────────────────────────
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

	// Controlled call trigger — see prior commit history for the rationale.
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

	// ── Data ───────────────────────────────────────────────
	const serverPoints = useQuery(api.functions.admin.listMapPoints, { filters });
	const facets = useQuery(api.functions.admin.getMapFacets, {});

	// Resolve agent capital coords client-side (capital table lives in the
	// front-end). Agents whose country has no known capital are silently
	// skipped. Returns ClusteredMapPoint[] ready for `@workspace/map`.
	const points = useMemo<ClusteredMapPoint[]>(() => {
		if (!serverPoints) return [];
		const resolved: ClusteredMapPoint[] = [];
		for (const p of serverPoints) {
			let coords: [number, number] | null;
			let subtitle = p.subtitle ?? null;
			if (p.kind === "agent") {
				coords = p.country ? getCapitalCoords(p.country) : null;
				if (!coords) continue;
				const positionLabel = p.positionTitle
					? getLocalizedValue(p.positionTitle as any, i18n.language)
					: undefined;
				subtitle = positionLabel || p.orgName || p.subtitle || null;
			} else {
				coords = p.coords;
			}
			resolved.push({
				id: p.id,
				kind: p.kind,
				coords,
				data: {
					name: p.name,
					subtitle,
					gender: normalizeGender(p.gender),
					userId: p.userId ?? null,
					country: p.country ?? null,
				},
			});
		}
		return resolved;
	}, [serverPoints]);

	// Keep the previous set visible while a new query is in flight so the
	// map doesn't briefly empty out on every filter change.
	const lastPointsRef = useRef<ClusteredMapPoint[]>([]);
	if (serverPoints !== undefined) {
		lastPointsRef.current = points;
	}
	const renderedPoints = lastPointsRef.current;

	// ── Setters ──────────────────────────────────────────
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

	// ── Fly-to: continent average → country capital → world ──
	const flyTo = useMemo<ClusteredMapFlyTo | null>(() => {
		if (selectedCountry) {
			const c = getCapitalCoords(selectedCountry);
			return c ? { center: c, zoom: 4 } : null;
		}
		if (activeContinent && renderedPoints.length > 0) {
			const avgLng =
				renderedPoints.reduce((s, p) => s + p.coords[0], 0) /
				renderedPoints.length;
			const avgLat =
				renderedPoints.reduce((s, p) => s + p.coords[1], 0) /
				renderedPoints.length;
			return { center: [avgLng, avgLat], zoom: 2.5 };
		}
		return { center: [20, 20], zoom: 1.6 };
	}, [selectedCountry, activeContinent, renderedPoints]);

	// ── Popup HTML + click delegation for the audio/video buttons ──
	const renderPopup = useCallback(
		(point: ClusteredMapPoint) => {
			const data = (point.data ?? {}) as {
				name?: string;
				subtitle?: string | null;
				gender?: Gender;
				userId?: string | null;
			};
			return buildPopupHtml({
				kind: point.kind as PointKind,
				gender: data.gender ?? "unknown",
				name: data.name ?? "",
				subtitle: data.subtitle ?? null,
				userId: data.userId ?? null,
				isSuperAdmin,
			});
		},
		[isSuperAdmin],
	);

	const onPopupClick = useCallback(
		(e: MouseEvent) => {
			if (!isSuperAdmin) return;
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
		},
		[isSuperAdmin],
	);

	const isDataLoading = serverPoints === undefined;

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

	// ── Dropdown option lists (driven by facets) ──────────
	const POP_ALL = "__all__";

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

			<ClusteredMap
				accessToken={MAPBOX_CONFIG.accessToken}
				styleLight={MAPBOX_CONFIG.styleLight}
				styleDark={MAPBOX_CONFIG.styleDark}
				theme={theme === "dark" ? "dark" : "light"}
				points={renderedPoints}
				kindColors={KIND_COLORS}
				renderPopup={renderPopup}
				onPopupClick={onPopupClick}
				flyTo={flyTo}
				className="relative h-[600px] w-full overflow-hidden rounded-xl border bg-muted/20"
				loading={isDataLoading ? "Chargement…" : false}
				overlay={
					<>
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
						<div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1.5 rounded-lg border bg-background/95 p-3 text-xs shadow-lg backdrop-blur">
							<LegendItem color={KIND_COLORS.citizen_adult} label="Citoyen adulte" />
							<LegendItem color={KIND_COLORS.citizen_child} label="Enfant" />
							<LegendItem color={KIND_COLORS.agent} label="Agent (capitale)" />
						</div>
					</>
				}
			/>

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
					onClick={() =>
						updateParams({ [P.pop]: null, [P.age]: null, [P.gender]: null })
					}
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

// ─── Popup HTML ─────────────────────────────────────────────
function buildPopupHtml({
	kind,
	gender,
	name,
	subtitle,
	userId,
	isSuperAdmin,
}: {
	kind: PointKind;
	gender: Gender;
	name: string;
	subtitle: string | null;
	userId: string | null;
	isSuperAdmin: boolean;
}): string {
	const color = KIND_COLORS[kind] ?? KIND_COLORS.citizen_adult;
	const glyph = GENDER_GLYPH[gender] ?? "";
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

