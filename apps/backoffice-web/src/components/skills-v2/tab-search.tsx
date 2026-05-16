"use client";

import Link from "next/link";
import { useState } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useTranslation } from "react-i18next";
import { useUrlReset, useUrlState } from "@/components/dashboard-v2/use-url-state";
import { SuperAdminCallTrigger } from "@/components/admin/super-admin-call-trigger";
import { downloadCsv } from "./csv";
import { getCountryFlag, getCountryName } from "@/lib/country-utils";
import { TONE_VAR, type Tone } from "./mock-data";
import { Combobox, FilterStrip, Icon, SearchInput } from "./ui";

const ALL = "__all__";

const STATUS_KEYS = [
	"employee",
	"self_employed",
	"entrepreneur",
	"unemployed",
	"retired",
	"student",
	"other",
] as const;
const LEVEL_KEYS = ["beginner", "intermediate", "advanced", "expert"] as const;
const CONTINENT_KEYS = ["europe", "north_america", "africa", "asia", "oceania"] as const;
const CONTINENT_LABELS: Record<string, string> = {
	europe: "Europe",
	north_america: "Amérique du Nord",
	africa: "Afrique",
	asia: "Asie",
	oceania: "Océanie",
};

const CAT_OPTIONS: Array<{ value: string; label: string }> = [
	{ value: "tech", label: "Tech" },
	{ value: "health", label: "Santé" },
	{ value: "education", label: "Éducation" },
	{ value: "public_service", label: "Service public" },
	{ value: "consulting_services", label: "Conseil & Services" },
	{ value: "finance", label: "Finance" },
	{ value: "trades", label: "Métiers manuels" },
	{ value: "legal", label: "Juridique" },
	{ value: "tourism_hospitality", label: "Tourisme & Hôtellerie" },
	{ value: "arts_culture", label: "Arts & Culture" },
	{ value: "transport", label: "Transport" },
	{ value: "industry", label: "Industrie" },
	{ value: "agriculture", label: "Agriculture" },
	{ value: "other", label: "Autre" },
];

const CAT_TONES: Record<string, Tone> = {
	tech: "cyan",
	health: "green",
	education: "info",
	public_service: "purple",
	consulting_services: "muted",
	finance: "teal",
	trades: "warning",
	legal: "purple",
	tourism_hospitality: "cyan",
	arts_culture: "warning",
	transport: "info",
	industry: "muted",
	agriculture: "green",
	other: "muted",
};

const PAGE_SIZE = 10;

export function TabSearch() {
	const { t } = useTranslation();
	const [q, setQ] = useUrlState<string>("q", "");
	const [catVal, setCatVal] = useUrlState<string>("category", ALL);
	const [skillVal, setSkillVal] = useUrlState<string>("skill", ALL);
	const [levelVal, setLevelVal] = useUrlState<string>("level", ALL);
	const [contVal, setContVal] = useUrlState<string>("cont", ALL);
	const [paysVal, setPaysVal] = useUrlState<string>("country", ALL);
	const [statusVal, setStatusVal] = useUrlState<string>("status", ALL);
	const resetUrl = useUrlReset();

	const activeCount =
		(q ? 1 : 0) +
		(catVal !== ALL ? 1 : 0) +
		(skillVal !== ALL ? 1 : 0) +
		(levelVal !== ALL ? 1 : 0) +
		(contVal !== ALL ? 1 : 0) +
		(paysVal !== ALL ? 1 : 0) +
		(statusVal !== ALL ? 1 : 0);

	const reset = () =>
		resetUrl(["q", "category", "skill", "level", "cont", "country", "status"]);

	// Pas de fetch tant qu'aucun filtre n'est précisé — éviter d'afficher
	// la diaspora entière par défaut. Le user doit cibler.
	const hasAnyFilter = activeCount > 0;
	const { results, status, loadMore } = usePaginatedQuery(
		api.functions.adminSkills.searchProfiles,
		hasAnyFilter
			? {
				filters: {
					search: q || undefined,
					category: catVal !== ALL ? catVal : undefined,
					skill: skillVal !== ALL ? skillVal : undefined,
					level: levelVal !== ALL ? levelVal : undefined,
					country: paysVal !== ALL ? paysVal : undefined,
					continent: contVal !== ALL ? contVal : undefined,
					workStatus: statusVal !== ALL ? statusVal : undefined,
				},
			}
			: "skip",
		{ initialNumItems: PAGE_SIZE },
	);

	// Combobox skill alimenté par le catalogue (top 200 par déclarations).
	const catalog = useQuery(api.functions.adminSkills.getSkillCatalog, {
		paginationOpts: { numItems: 200, cursor: null },
		sort: "declared",
	});
	const skillOptions = catalog
		? catalog.page.map((s) => ({ value: s.skillName, label: s.skillName }))
		: [];

	const loadingFirst = status === "LoadingFirstPage";
	const canLoadMore = status === "CanLoadMore";
	const loadingMore = status === "LoadingMore";

	const onExport = () => {
		downloadCsv(
			"talents-recherche",
			[
				"nom",
				"prenom",
				"email",
				"pays",
				"statut_pro",
				"metier",
				"categorie",
				"competences_declarees",
				"suggestions_ia",
			],
			results.map((p) => [
				p.lastName ?? "",
				p.firstName ?? "",
				p.email ?? "",
				p.country ? getCountryName(p.country) : "",
				p.workStatus ?? "",
				p.profession ?? "",
				p.category ?? "",
				p.declared.map((d) => `${d.name} (${d.level})`).join(" · "),
				p.aiSuggestedCount,
			]),
		);
	};

	return (
		<div className="stack stack-4">
			<div className="v2-sticky-filters">
				<FilterStrip activeCount={activeCount} onReset={reset}>
					<SearchInput
						value={q}
						onChange={setQ}
						placeholder={t("superadmin.skills.search.searchPlaceholder")}
						width={260}
					/>
					<Combobox
						icon="Briefcase"
						value={catVal}
						onChange={setCatVal}
						options={[
							{ value: ALL, label: t("superadmin.skills.catalog.allCategories") },
							...CAT_OPTIONS,
						]}
					/>
					<Combobox
						icon="Award"
						value={skillVal}
						onChange={setSkillVal}
						options={[
							{ value: ALL, label: t("superadmin.skills.search.allSkills") },
							...skillOptions,
						]}
					/>
					<Combobox
						icon="Activity"
						value={levelVal}
						onChange={setLevelVal}
						options={[
							{ value: ALL, label: t("superadmin.skills.levels.all") },
							...LEVEL_KEYS.map((k) => ({
								value: k,
								label: t(`superadmin.skills.levels.${k}`),
							})),
						]}
					/>
					<Combobox
						icon="Globe2"
						value={contVal}
						onChange={setContVal}
						options={[
							{ value: ALL, label: t("superadmin.skills.filters.allContinents") },
							...CONTINENT_KEYS.map((k) => ({ value: k, label: CONTINENT_LABELS[k]! })),
						]}
					/>
					<Combobox
						icon="Flag"
						value={paysVal}
						onChange={setPaysVal}
						options={[{ value: ALL, label: t("superadmin.skills.filters.allCountries") }]}
					/>
					<Combobox
						icon="User"
						value={statusVal}
						onChange={setStatusVal}
						options={[
							{ value: ALL, label: t("superadmin.skills.workStatus.all") },
							...STATUS_KEYS.map((k) => ({
								value: k,
								label: t(`superadmin.skills.workStatus.${k}`),
							})),
						]}
					/>
				</FilterStrip>
			</div>

			<div className="row items-center justify-between" style={{ gap: 12, flexWrap: "wrap" }}>
				<div className="row items-center" style={{ gap: 10 }}>
					<h2>
						{!hasAnyFilter
							? "—"
							: loadingFirst
								? "…"
								: results.length.toLocaleString("fr-FR")}{" "}
						<span style={{ color: "var(--text-muted)", fontWeight: 500, fontSize: 13 }}>
							{t("superadmin.skills.search.result", { count: results.length })}
							{hasAnyFilter && canLoadMore ? " +" : ""}
						</span>
					</h2>
					{activeCount > 0 && (
						<span className="pill pill-info">
							{t("superadmin.skills.search.activeFilters", { count: activeCount })}
						</span>
					)}
				</div>
				<div className="row items-center" style={{ gap: 8 }}>
					<button
						type="button"
						className="btn btn-sm btn-soft"
						onClick={onExport}
						disabled={!hasAnyFilter || results.length === 0}
					>
						<Icon name="Download" size={14} />
						{t("superadmin.skills.actions.exportCsv")}
					</button>
				</div>
			</div>

			{!hasAnyFilter ? (
				<div className="card card-pad-lg ta-center" style={{ padding: "60px 24px" }}>
					<Icon name="Search" size={32} color="var(--text-faint)" />
					<div style={{ marginTop: 14, fontSize: 15, fontWeight: 600 }}>
						Précisez votre recherche
					</div>
					<div className="text-sm text-muted" style={{ marginTop: 4, maxWidth: 480, marginInline: "auto" }}>
						La diaspora compte plusieurs milliers de profils — utilisez les filtres
						ci-dessus (compétence, catégorie, pays, niveau…) pour cibler les personnes
						que vous cherchez.
					</div>
				</div>
			) : loadingFirst ? (
				<div className="card card-pad-lg ta-center" style={{ padding: "60px 24px" }}>
					<Icon name="Loader" size={28} color="var(--text-faint)" />
					<div className="text-sm text-muted" style={{ marginTop: 12 }}>
						Recherche en cours…
					</div>
				</div>
			) : results.length === 0 ? (
				<div className="card card-pad-lg ta-center" style={{ padding: "60px 24px" }}>
					<Icon name="Sparkles" size={32} color="var(--text-faint)" />
					<div style={{ marginTop: 14, fontSize: 15, fontWeight: 600 }}>
						{t("superadmin.skills.search.emptyTitle")}
					</div>
					<div className="text-sm text-muted" style={{ marginTop: 4 }}>
						{t("superadmin.skills.search.emptyHint")}
					</div>
					<button type="button" className="btn btn-sm btn-soft" style={{ marginTop: 14 }} onClick={reset}>
						<Icon name="RefreshCcw" size={12} />
						{t("superadmin.skills.search.resetFilters")}
					</button>
				</div>
			) : (
				<div className="stack stack-2">
					{results.map((p) => (
						<ProfileCard key={p.profileId} profile={p} />
					))}

					{(canLoadMore || loadingMore) && (
						<div className="row items-center justify-center" style={{ paddingTop: 8 }}>
							<button
								type="button"
								className="btn btn-sm btn-soft"
								onClick={() => loadMore(PAGE_SIZE)}
								disabled={loadingMore}
							>
								{loadingMore ? (
									<Icon name="Loader" size={14} />
								) : (
									<Icon name="ChevronRight" size={14} />
								)}
								Charger {PAGE_SIZE} profils suivants
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

type Row = {
	profileId: string;
	userId: string;
	firstName: string | null;
	lastName: string | null;
	email: string | null;
	country: string | null;
	workStatus: string | null;
	profession: string | null;
	category: string | null;
	declared: { name: string; level: string }[];
	aiSuggestedCount: number;
};

function initialsOf(first?: string | null, last?: string | null, email?: string | null) {
	const f = (first ?? "")[0] ?? "";
	const l = (last ?? "")[0] ?? "";
	if (f || l) return (f + l).toUpperCase();
	return (email?.[0] ?? "U").toUpperCase();
}

function ProfileCard({ profile: p }: { profile: Row }) {
	const { t } = useTranslation();
	const [callOpen, setCallOpen] = useState<{ mediaType: "audio" | "video"; nonce: number } | null>(
		null,
	);
	const tone = TONE_VAR[CAT_TONES[p.category ?? "other"] ?? "muted"];
	const catLabel = CAT_OPTIONS.find((c) => c.value === p.category)?.label ?? null;
	const initials = initialsOf(p.firstName, p.lastName, p.email);
	const flag = p.country ? getCountryFlag(p.country) : "";
	const countryName = p.country ? getCountryName(p.country) : "—";
	return (
		<div className="card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
			<div className="avatar lg tone-slate">{initials}</div>
			<div className="flex-1 min-w-0">
				<div className="row items-center" style={{ gap: 8, flexWrap: "wrap" }}>
					<div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.005em" }}>
						{p.firstName || p.lastName ? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() : (p.email ?? "—")}
					</div>
				</div>
				{p.profession && (
					<div className="text-sm" style={{ marginTop: 3, color: "var(--text-muted)" }}>
						<span style={{ color: "var(--text)", fontWeight: 500 }}>{p.profession}</span>
						{catLabel && (
							<>
								<span> · </span>
								<span
									style={{
										fontSize: 11,
										padding: "1px 8px",
										borderRadius: 100,
										background: tone.tint,
										color: tone.color,
										fontWeight: 500,
									}}
								>
									{catLabel}
								</span>
							</>
						)}
					</div>
				)}
				<div className="row items-center" style={{ gap: 6, marginTop: 8, flexWrap: "wrap" }}>
					{p.declared.length > 0 && (
						<>
							<span className="row items-center text-xs" style={{ gap: 4, color: "var(--text-muted)", marginRight: 4 }}>
								<span style={{ width: 8, height: 8, borderRadius: 100, background: "var(--text)" }} />
								{t("superadmin.skills.search.declared")}
							</span>
							{p.declared.slice(0, 3).map((d, i) => (
								<span
									key={i}
									className="pill"
									style={{
										background: "var(--surface)",
										borderColor: "var(--border-strong)",
										color: "var(--text)",
										fontSize: 11.5,
									}}
								>
									{d.name}{" "}
									<span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
										· {t(`superadmin.skills.levels.${d.level}`, { defaultValue: d.level })}
									</span>
								</span>
							))}
						</>
					)}
					{p.aiSuggestedCount > 0 && (
						<span className="row items-center text-xs" style={{ gap: 4, color: "var(--text-muted)", marginLeft: 8 }}>
							<span
								style={{
									width: 8,
									height: 8,
									borderRadius: 100,
									border: "2px solid var(--text-muted)",
									boxSizing: "border-box",
								}}
							/>
							{t("superadmin.skills.search.unvalidatedAi", { count: p.aiSuggestedCount })}
						</span>
					)}
				</div>
			</div>
			<div style={{ textAlign: "right", minWidth: 140 }}>
				<div style={{ fontSize: 13, fontWeight: 500 }}>
					{flag} {countryName}
				</div>
				{p.workStatus && (
					<div className="text-xs text-muted" style={{ marginTop: 2 }}>
						{t(`superadmin.skills.workStatus.${p.workStatus}`, { defaultValue: p.workStatus })}
					</div>
				)}
				<div className="row" style={{ gap: 6, marginTop: 10, justifyContent: "flex-end" }}>
					<button
						type="button"
						className="btn btn-sm btn-soft"
						onClick={() =>
							setCallOpen({ mediaType: "audio", nonce: Date.now() })
						}
					>
						<Icon name="Phone" size={12} />
						{t("superadmin.skills.actions.call")}
					</button>
					<Link href={`/users/${p.userId}`} className="btn btn-sm btn-primary">
						{t("superadmin.skills.actions.profile")} <Icon name="ArrowUpRight" size={12} />
					</Link>
				</div>
			</div>
			{/* SuperAdminCallTrigger en variante "controlled" : invisible, déclenche
			    l'appel quand `callOpen` reçoit un nouveau nonce. */}
			<SuperAdminCallTrigger
				targetUser={{
					_id: p.userId as Id<"users">,
					firstName: p.firstName,
					lastName: p.lastName,
					email: p.email,
				}}
				variant="controlled"
				programmaticTrigger={callOpen}
			/>
		</div>
	);
}
