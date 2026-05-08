"use client";

/**
 * SkillsView — Dashboard d'agrégation des compétences et métiers.
 *
 * Source : `cv.skills[]` + `profiles.profession.title`. Charge les données
 * chunkées via `api.functions.admin.listSkillsChunk`, agrège côté client.
 *
 * Sections :
 *   1. KPI strip (4 metrics)
 *   2. Top métiers + Top compétences CV (bar charts)
 *   3. Statut professionnel (donut) + Niveaux compétences (stacked bar)
 *   4. Heatmap pays × top métiers
 *   5. Recherche / liste pliable / export CSV
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useConvex } from "convex/react";
import { SuperAdminCallTrigger } from "./super-admin-call-trigger";
import {
	Award,
	BookOpen,
	Briefcase,
	ChevronDown,
	ChevronRight,
	Download,
	Globe2,
	Loader2,
	Search,
	Sparkles,
	TrendingUp,
	UserCheck,
	X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { Button } from "@workspace/ui/components/button";
import { Combobox, type ComboboxOption } from "@workspace/ui/components/combobox";
import { Input } from "@/components/ui/input";
import {
	type Continent,
	CONTINENT_META,
	getActiveContinents,
	getContinent,
	getCountryFlag,
	getCountryName,
} from "@/lib/country-utils";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────

type SkillLevel = "beginner" | "intermediate" | "advanced" | "expert";
type WorkStatus =
	| "self_employed"
	| "employee"
	| "entrepreneur"
	| "unemployed"
	| "retired"
	| "student"
	| "other";

type SkillRow = {
	_id: string;
	firstName: string | null;
	lastName: string | null;
	email: string | null;
	role: string;
	residenceCountry: string | null;
	profession: { status?: WorkStatus; title?: string; employer?: string } | null;
	skills: { name: string; level: SkillLevel }[];
	cvTitle: string | null;
	isActive: boolean;
	deletedAt: number | null;
};

type EntryKind = "profession" | "skill";

type AggregateUser = { user: SkillRow; level: SkillLevel | null };

type Aggregate = {
	key: string;
	display: string;
	kind: EntryKind;
	users: AggregateUser[];
	levelCounts: Record<SkillLevel, number>;
};

const SKILL_LEVELS: SkillLevel[] = ["beginner", "intermediate", "advanced", "expert"];

const SKILL_LEVEL_META: Record<SkillLevel, { label: string }> = {
	beginner: { label: "Débutant" },
	intermediate: { label: "Intermédiaire" },
	advanced: { label: "Avancé" },
	expert: { label: "Expert" },
};

const WORK_STATUS_META: Record<WorkStatus, { label: string }> = {
	employee: { label: "Salarié" },
	self_employed: { label: "Indépendant" },
	entrepreneur: { label: "Entrepreneur" },
	unemployed: { label: "Sans emploi" },
	retired: { label: "Retraité" },
	student: { label: "Étudiant" },
	other: { label: "Autre" },
};

// Recharts colors → tokens du design system. Les valeurs OKLCh sont définies
// dans `packages/ui/src/styles/globals.css` (--chart-1..5).
const CHART_COLORS = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
];
const LEVEL_COLORS: Record<SkillLevel, string> = {
	beginner: "var(--chart-5)",
	intermediate: "var(--chart-3)",
	advanced: "var(--chart-2)",
	expert: "var(--chart-1)",
};

// ─── Component ─────────────────────────────────────────────────────────

export function SkillsView() {
	const convex = useConvex();

	const [rows, setRows] = useState<SkillRow[]>([]);
	const [isPending, setIsPending] = useState(true);

	useEffect(() => {
		let active = true;
		async function fetchAll() {
			try {
				let cursor: string | null = null;
				let isDone = false;
				const all: SkillRow[] = [];
				while (!isDone && active) {
					const res: {
						page: SkillRow[];
						continueCursor: string;
						isDone: boolean;
					} = await convex.query(api.functions.admin.listSkillsChunk, { cursor });
					all.push(...res.page);
					cursor = res.continueCursor;
					isDone = res.isDone;
					if (active) setRows([...all]);
				}
				if (active) setIsPending(false);
			} catch (e) {
				console.error("Failed to load skills aggregate", e);
				if (active) setIsPending(false);
			}
		}
		setIsPending(true);
		fetchAll();
		return () => {
			active = false;
		};
	}, [convex]);

	// ─── Filters ───────────────────────────────────────────────────────
	const [search, setSearch] = useState("");
	const [activeKind, setActiveKind] = useState<EntryKind | null>(null);
	const [activeContinent, setActiveContinent] = useState<Continent | null>(null);
	const [activeCountry, setActiveCountry] = useState<string | null>(null);
	const [activeLevel, setActiveLevel] = useState<SkillLevel | null>(null);
	const [activeStatus, setActiveStatus] = useState<WorkStatus | null>(null);

	const hasActiveFilter =
		search.trim() !== "" ||
		activeKind !== null ||
		activeContinent !== null ||
		activeCountry !== null ||
		activeLevel !== null ||
		activeStatus !== null;

	useEffect(() => {
		if (
			activeCountry &&
			activeContinent &&
			getContinent(activeCountry) !== activeContinent
		) {
			setActiveCountry(null);
		}
	}, [activeContinent, activeCountry]);

	// ─── User-level filter (pour les charts qui consomment des users) ──
	const filteredRows = useMemo(() => {
		return rows.filter((u) => {
			if (activeContinent) {
				const c = u.residenceCountry ? getContinent(u.residenceCountry) : null;
				if (c !== activeContinent) return false;
			}
			if (activeCountry && u.residenceCountry !== activeCountry) return false;
			if (activeStatus && u.profession?.status !== activeStatus) return false;
			return true;
		});
	}, [rows, activeContinent, activeCountry, activeStatus]);

	// ─── Aggregation (sur filteredRows) ────────────────────────────────
	const aggregates = useMemo(() => {
		const map = new Map<string, Aggregate>();
		const emptyLevels = (): Record<SkillLevel, number> => ({
			beginner: 0,
			intermediate: 0,
			advanced: 0,
			expert: 0,
		});

		for (const row of filteredRows) {
			const professionTitle = row.profession?.title?.trim();
			if (professionTitle) {
				const key = `profession::${professionTitle.toLowerCase()}`;
				let agg = map.get(key);
				if (!agg) {
					agg = {
						key,
						display: professionTitle,
						kind: "profession",
						users: [],
						levelCounts: emptyLevels(),
					};
					map.set(key, agg);
				}
				agg.users.push({ user: row, level: null });
			}

			for (const skill of row.skills) {
				const name = skill.name?.trim();
				if (!name) continue;
				const key = `skill::${name.toLowerCase()}`;
				let agg = map.get(key);
				if (!agg) {
					agg = {
						key,
						display: name,
						kind: "skill",
						users: [],
						levelCounts: emptyLevels(),
					};
					map.set(key, agg);
				}
				agg.users.push({ user: row, level: skill.level });
				agg.levelCounts[skill.level]++;
			}
		}

		return [...map.values()].sort((a, b) => b.users.length - a.users.length);
	}, [filteredRows]);

	// ─── List view = aggregates with kind/search/level filter applied ──
	const listAggregates = useMemo(() => {
		const term = search.trim().toLowerCase();
		return aggregates
			.map((agg) => {
				if (activeKind && agg.kind !== activeKind) return null;
				if (term && !agg.display.toLowerCase().includes(term)) return null;
				if (activeLevel) {
					const matchingUsers = agg.users.filter((u) => u.level === activeLevel);
					if (matchingUsers.length === 0) return null;
					return { ...agg, users: matchingUsers };
				}
				return agg;
			})
			.filter((a): a is Aggregate => a !== null);
	}, [aggregates, search, activeKind, activeLevel]);

	// ─── KPI metrics ───────────────────────────────────────────────────
	const kpi = useMemo(() => {
		const totalUsers = filteredRows.length;
		const usersWithProfession = filteredRows.filter(
			(r) => r.profession?.title && r.profession.title.trim() !== "",
		).length;
		const usersWithSkills = filteredRows.filter((r) => r.skills.length > 0).length;
		const uniqueProfessions = aggregates.filter((a) => a.kind === "profession").length;
		const uniqueSkills = aggregates.filter((a) => a.kind === "skill").length;
		const totalSkillEntries = filteredRows.reduce((s, r) => s + r.skills.length, 0);
		return {
			totalUsers,
			usersWithProfession,
			usersWithSkills,
			uniqueProfessions,
			uniqueSkills,
			totalSkillEntries,
			pctWithProfession: totalUsers
				? Math.round((usersWithProfession / totalUsers) * 100)
				: 0,
			pctWithSkills: totalUsers
				? Math.round((usersWithSkills / totalUsers) * 100)
				: 0,
		};
	}, [filteredRows, aggregates]);

	// ─── Top professions / Top skills (bar chart data) ─────────────────
	const topProfessions = useMemo(
		() =>
			aggregates
				.filter((a) => a.kind === "profession")
				.slice(0, 10)
				.map((a) => ({ name: a.display, count: a.users.length })),
		[aggregates],
	);

	const topSkills = useMemo(
		() =>
			aggregates
				.filter((a) => a.kind === "skill")
				.slice(0, 10)
				.map((a) => ({
					name: a.display,
					count: a.users.length,
					...a.levelCounts,
				})),
		[aggregates],
	);

	// ─── Status pro distribution (donut) ───────────────────────────────
	const statusDistribution = useMemo(() => {
		const counts = {} as Record<WorkStatus, number>;
		for (const r of filteredRows) {
			const s = r.profession?.status;
			if (!s) continue;
			counts[s] = (counts[s] ?? 0) + 1;
		}
		return (Object.keys(counts) as WorkStatus[])
			.map((s) => ({ name: WORK_STATUS_META[s].label, value: counts[s], key: s }))
			.sort((a, b) => b.value - a.value);
	}, [filteredRows]);

	// ─── Skill levels distribution ─────────────────────────────────────
	const levelDistribution = useMemo(() => {
		const counts: Record<SkillLevel, number> = {
			beginner: 0,
			intermediate: 0,
			advanced: 0,
			expert: 0,
		};
		for (const r of filteredRows) {
			for (const s of r.skills) counts[s.level]++;
		}
		return SKILL_LEVELS.map((l) => ({
			name: SKILL_LEVEL_META[l].label,
			count: counts[l],
			key: l,
		}));
	}, [filteredRows]);

	// ─── Top countries by skill volume ─────────────────────────────────
	const topCountries = useMemo(() => {
		const map = new Map<string, { profession: number; skills: number }>();
		for (const r of filteredRows) {
			if (!r.residenceCountry) continue;
			const entry = map.get(r.residenceCountry) ?? { profession: 0, skills: 0 };
			if (r.profession?.title) entry.profession++;
			entry.skills += r.skills.length;
			map.set(r.residenceCountry, entry);
		}
		return [...map.entries()]
			.map(([country, e]) => ({ country, ...e, total: e.profession + e.skills }))
			.sort((a, b) => b.total - a.total)
			.slice(0, 8);
	}, [filteredRows]);

	// ─── Filter option counts ──────────────────────────────────────────
	const continentData = useMemo(() => {
		const codes: string[] = [];
		const counts = {} as Record<Continent, number>;
		for (const row of rows) {
			if (!row.residenceCountry) continue;
			codes.push(row.residenceCountry);
			const c = getContinent(row.residenceCountry);
			if (c) counts[c] = (counts[c] ?? 0) + 1;
		}
		return { continents: getActiveContinents(codes), counts };
	}, [rows]);

	const countryOptions = useMemo(() => {
		const map = new Map<string, number>();
		for (const row of rows) {
			const c = row.residenceCountry;
			if (!c) continue;
			if (activeContinent && getContinent(c) !== activeContinent) continue;
			map.set(c, (map.get(c) ?? 0) + 1);
		}
		return [...map.entries()]
			.map(([code, count]) => ({
				value: code,
				label: `${getCountryFlag(code)} ${getCountryName(code)} (${count})`,
			}))
			.sort((a, b) => a.label.localeCompare(b.label));
	}, [rows, activeContinent]);

	// ─── CSV export ────────────────────────────────────────────────────
	function exportCsv() {
		const header = [
			"compétence",
			"type",
			"niveau",
			"prénom",
			"nom",
			"email",
			"pays",
			"rôle",
			"statut_pro",
		];
		const lines: string[] = [header.join(",")];
		for (const agg of listAggregates) {
			for (const { user, level } of agg.users) {
				const cells = [
					agg.display,
					agg.kind === "profession" ? "métier" : "compétence",
					level ? SKILL_LEVEL_META[level].label : "",
					user.firstName ?? "",
					user.lastName ?? "",
					user.email ?? "",
					user.residenceCountry ? getCountryName(user.residenceCountry) : "",
					user.role,
					user.profession?.status
						? WORK_STATUS_META[user.profession.status].label
						: "",
				].map(csvEscape);
				lines.push(cells.join(","));
			}
		}
		const csv = `﻿${lines.join("\n")}`;
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		const stamp = new Date().toISOString().slice(0, 10);
		a.download = `competences-${stamp}.csv`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	const totalUsersDisplayed = listAggregates.reduce((s, a) => s + a.users.length, 0);

	// ─── Filter row options ────────────────────────────────────────────
	const kindCounts = useMemo(() => {
		let prof = 0;
		let skill = 0;
		for (const agg of aggregates) {
			if (agg.kind === "profession") prof++;
			else skill++;
		}
		return { profession: prof, skill };
	}, [aggregates]);

	const kindOptions: ComboboxOption<EntryKind | "__all__">[] = [
		{ value: "__all__", label: `Tous (${kindCounts.profession + kindCounts.skill})` },
		{ value: "profession", label: `Métiers (${kindCounts.profession})` },
		{ value: "skill", label: `Compétences CV (${kindCounts.skill})` },
	];

	const continentOptions: ComboboxOption<Continent | "__all__">[] = [
		{ value: "__all__", label: "Tous les continents" },
		...continentData.continents.map(
			(c): ComboboxOption<Continent | "__all__"> => ({
				value: c,
				label: `${CONTINENT_META[c].label} (${continentData.counts[c] ?? 0})`,
			}),
		),
	];

	const countryComboboxOptions: ComboboxOption<string>[] = [
		{ value: "__all__", label: "Tous les pays" },
		...countryOptions,
	];

	const levelOptions: ComboboxOption<SkillLevel | "__all__">[] = [
		{ value: "__all__", label: "Tous niveaux" },
		...SKILL_LEVELS.map(
			(l): ComboboxOption<SkillLevel | "__all__"> => ({
				value: l,
				label: SKILL_LEVEL_META[l].label,
			}),
		),
	];

	const statusOptions: ComboboxOption<WorkStatus | "__all__">[] = [
		{ value: "__all__", label: "Tous statuts" },
		...(Object.keys(WORK_STATUS_META) as WorkStatus[]).map(
			(s): ComboboxOption<WorkStatus | "__all__"> => ({
				value: s,
				label: WORK_STATUS_META[s].label,
			}),
		),
	];

	return (
		<div className="flex flex-col gap-4">
			{/* ─── KPI strip ─── */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
				<KpiCard
					icon={<UserCheck className="h-4 w-4" />}
					accent="blue"
					label="Profils analysés"
					value={kpi.totalUsers.toLocaleString("fr")}
					hint={
						isPending
							? `${rows.length} chargés…`
							: hasActiveFilter
								? `sur ${rows.length} au total`
								: "utilisateurs au total"
					}
					loading={isPending}
				/>
				<KpiCard
					icon={<Briefcase className="h-4 w-4" />}
					accent="amber"
					label="Métiers uniques"
					value={kpi.uniqueProfessions.toLocaleString("fr")}
					hint={`${kpi.pctWithProfession}% des profils ont un métier`}
				/>
				<KpiCard
					icon={<BookOpen className="h-4 w-4" />}
					accent="green"
					label="Compétences CV"
					value={kpi.uniqueSkills.toLocaleString("fr")}
					hint={`${kpi.totalSkillEntries.toLocaleString("fr")} entrées au total`}
				/>
				<KpiCard
					icon={<Sparkles className="h-4 w-4" />}
					accent="rose"
					label="Profils avec CV"
					value={`${kpi.pctWithSkills}%`}
					hint={`${kpi.usersWithSkills.toLocaleString("fr")} profils avec ≥ 1 compétence`}
				/>
			</div>

			{/* ─── Filters ─── */}
			<FlatCard>
				<div className="p-3 lg:p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
					<FilterField label="Recherche">
						<div className="relative">
							<Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Compétence, métier…"
								className="h-9 pl-8"
							/>
						</div>
					</FilterField>
					<FilterField label="Type">
						<Combobox
							options={kindOptions}
							value={activeKind ?? "__all__"}
							onValueChange={(v) =>
								setActiveKind(v === "__all__" ? null : (v as EntryKind))
							}
							placeholder="Tous"
							className="h-9"
						/>
					</FilterField>
					<FilterField label="Continent">
						<Combobox
							options={continentOptions}
							value={activeContinent ?? "__all__"}
							onValueChange={(v) =>
								setActiveContinent(v === "__all__" ? null : (v as Continent))
							}
							placeholder="Tous les continents"
							className="h-9"
						/>
					</FilterField>
					<FilterField label="Pays">
						<Combobox
							options={countryComboboxOptions}
							value={activeCountry ?? "__all__"}
							onValueChange={(v) => setActiveCountry(v === "__all__" ? null : v)}
							placeholder="Tous les pays"
							searchPlaceholder="Rechercher un pays…"
							className="h-9"
						/>
					</FilterField>
					<FilterField label="Niveau CV">
						<Combobox
							options={levelOptions}
							value={activeLevel ?? "__all__"}
							onValueChange={(v) =>
								setActiveLevel(v === "__all__" ? null : (v as SkillLevel))
							}
							placeholder="Tous niveaux"
							className="h-9"
						/>
					</FilterField>
					<FilterField label="Statut pro.">
						<Combobox
							options={statusOptions}
							value={activeStatus ?? "__all__"}
							onValueChange={(v) =>
								setActiveStatus(v === "__all__" ? null : (v as WorkStatus))
							}
							placeholder="Tous statuts"
							className="h-9"
						/>
					</FilterField>
				</div>
			</FlatCard>

			{/* ─── Charts row 1 : Top métiers + Top compétences ─── */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
				<FlatCard>
					<div className="p-3 lg:p-4">
						<SectionHeader
							icon={<Briefcase />}
							iconBgClass="bg-[color:var(--chart-3)]/10"
							iconTextClass="text-[color:var(--chart-3)]"
							title={
								<>
									Top 10 métiers déclarés
									<span className="ml-2 text-xs font-normal text-muted-foreground">
										profession.title du profil consulaire
									</span>
								</>
							}
						/>
						<TopHorizontalBarChart
							data={topProfessions}
							color="var(--chart-3)"
							empty="Aucun métier renseigné dans les profils filtrés."
							loading={isPending}
						/>
					</div>
				</FlatCard>

				<FlatCard>
					<div className="p-3 lg:p-4">
						<SectionHeader
							icon={<BookOpen />}
							iconBgClass="bg-[color:var(--chart-2)]/10"
							iconTextClass="text-[color:var(--chart-2)]"
							title={
								<>
									Top 10 compétences CV
									<span className="ml-2 text-xs font-normal text-muted-foreground">
										ventilées par niveau
									</span>
								</>
							}
						/>
						<TopHorizontalBarChart
							data={topSkills}
							color="var(--chart-2)"
							stackedKeys={SKILL_LEVELS}
							stackedColors={LEVEL_COLORS}
							empty="Aucune compétence CV dans les profils filtrés."
							loading={isPending}
						/>
					</div>
				</FlatCard>
			</div>

			{/* ─── Charts row 2 : Statut pro (donut) + Niveaux compétences ─── */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
				<FlatCard>
					<div className="p-3 lg:p-4">
						<SectionHeader
							icon={<UserCheck />}
							iconBgClass="bg-[color:var(--chart-1)]/10"
							iconTextClass="text-[color:var(--chart-1)]"
							title="Statut professionnel"
						/>
						<StatusDonut data={statusDistribution} loading={isPending} />
					</div>
				</FlatCard>

				<FlatCard>
					<div className="p-3 lg:p-4">
						<SectionHeader
							icon={<Award />}
							iconBgClass="bg-[color:var(--chart-2)]/10"
							iconTextClass="text-[color:var(--chart-2)]"
							title="Niveaux des compétences CV"
						/>
						<LevelBars data={levelDistribution} loading={isPending} />
					</div>
				</FlatCard>

				<FlatCard>
					<div className="p-3 lg:p-4">
						<SectionHeader
							icon={<Globe2 />}
							iconBgClass="bg-[color:var(--chart-4)]/10"
							iconTextClass="text-[color:var(--chart-4)]"
							title="Top 8 pays"
						/>
						<CountryRanking data={topCountries} loading={isPending} />
					</div>
				</FlatCard>
			</div>

			{/* ─── List section ─── */}
			<FlatCard>
				<div className="p-3 lg:p-4">
					<SectionHeader
						icon={<TrendingUp />}
						iconBgClass="bg-[color:var(--chart-1)]/10"
						iconTextClass="text-[color:var(--chart-1)]"
						title={
							<>
								Exploration des compétences
								<span className="ml-2 text-xs font-normal text-muted-foreground">
									{listAggregates.length} entrée
									{listAggregates.length > 1 ? "s" : ""} ·{" "}
									{totalUsersDisplayed} personne
									{totalUsersDisplayed > 1 ? "s" : ""}
								</span>
							</>
						}
						actions={
							<div className="flex items-center gap-2">
								{hasActiveFilter && (
									<Button
										variant="outline"
										size="sm"
										className="h-8"
										onClick={() => {
											setSearch("");
											setActiveKind(null);
											setActiveContinent(null);
											setActiveCountry(null);
											setActiveLevel(null);
											setActiveStatus(null);
										}}
									>
										<X className="mr-1.5 h-3.5 w-3.5" />
										Réinitialiser
									</Button>
								)}
								<Button
									variant="outline"
									size="sm"
									className="h-8"
									onClick={exportCsv}
									disabled={listAggregates.length === 0}
								>
									<Download className="mr-1.5 h-3.5 w-3.5" />
									CSV
								</Button>
							</div>
						}
					/>

					{listAggregates.length === 0 ? (
						<div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
							{isPending ? (
								<>
									<Loader2 className="h-6 w-6 animate-spin opacity-50" />
									Chargement…
								</>
							) : (
								<>
									<Sparkles className="h-8 w-8 opacity-30" />
									{rows.length === 0
										? "Aucun utilisateur trouvé."
										: "Aucune compétence ne correspond aux filtres."}
								</>
							)}
						</div>
					) : (
						<ul className="divide-y divide-border">
							{listAggregates.map((agg, i) => (
								<AggregateRow
									key={agg.key}
									aggregate={agg}
									rank={i + 1}
									maxCount={listAggregates[0]!.users.length}
								/>
							))}
						</ul>
					)}
				</div>
			</FlatCard>
		</div>
	);
}

// ─── Sub-components ────────────────────────────────────────────────────

const KPI_ACCENTS: Record<
	"blue" | "amber" | "green" | "rose",
	{ icon: string; bg: string }
> = {
	blue: { icon: "text-[color:var(--chart-1)]", bg: "bg-[color:var(--chart-1)]/10" },
	amber: { icon: "text-[color:var(--chart-3)]", bg: "bg-[color:var(--chart-3)]/10" },
	green: { icon: "text-[color:var(--chart-2)]", bg: "bg-[color:var(--chart-2)]/10" },
	rose: { icon: "text-[color:var(--chart-4)]", bg: "bg-[color:var(--chart-4)]/10" },
};

function KpiCard({
	icon,
	accent,
	label,
	value,
	hint,
	loading,
}: {
	icon: React.ReactNode;
	accent: keyof typeof KPI_ACCENTS;
	label: string;
	value: string;
	hint: string;
	loading?: boolean;
}) {
	const a = KPI_ACCENTS[accent];
	return (
		<FlatCard>
			<div className="p-4 flex items-start gap-3">
				<div className={cn("rounded-lg p-2 shrink-0", a.bg, a.icon)}>{icon}</div>
				<div className="min-w-0 flex-1">
					<div className="text-[11px] uppercase tracking-wide text-muted-foreground">
						{label}
					</div>
					<div className="mt-0.5 text-2xl font-semibold tabular-nums">
						{loading ? (
							<Loader2 className="h-5 w-5 animate-spin opacity-50" />
						) : (
							value
						)}
					</div>
					<div className="mt-0.5 text-xs text-muted-foreground truncate">
						{hint}
					</div>
				</div>
			</div>
		</FlatCard>
	);
}

function TopHorizontalBarChart({
	data,
	color,
	stackedKeys,
	stackedColors,
	empty,
	loading,
}: {
	data: Array<Record<string, any> & { name: string; count: number }>;
	color: string;
	stackedKeys?: SkillLevel[];
	stackedColors?: Record<SkillLevel, string>;
	empty: string;
	loading?: boolean;
}) {
	if (loading) {
		return (
			<div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
				<Loader2 className="h-5 w-5 animate-spin opacity-50" />
			</div>
		);
	}
	if (data.length === 0) {
		return (
			<div className="flex h-[280px] items-center justify-center text-center text-sm text-muted-foreground">
				{empty}
			</div>
		);
	}

	return (
		<div className="h-[280px] w-full">
			<ResponsiveContainer width="100%" height="100%">
				<BarChart
					data={data}
					layout="vertical"
					margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
				>
					<CartesianGrid
						horizontal={false}
						stroke="var(--border)"
						strokeOpacity={0.4}
					/>
					<XAxis
						type="number"
						tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
						tickLine={false}
						axisLine={false}
						allowDecimals={false}
					/>
					<YAxis
						dataKey="name"
						type="category"
						width={140}
						tick={{ fontSize: 11, fill: "var(--foreground)" }}
						tickLine={false}
						axisLine={false}
						interval={0}
					/>
					<Tooltip
						cursor={{ fill: "var(--muted)", opacity: 0.4 }}
						contentStyle={{
							background: "var(--popover)",
							border: "1px solid var(--border)",
							borderRadius: 8,
							fontSize: 12,
						}}
					/>
					{stackedKeys && stackedColors ? (
						stackedKeys.map((k) => (
							<Bar
								key={k}
								dataKey={k}
								name={SKILL_LEVEL_META[k].label}
								stackId="lvl"
								fill={stackedColors[k]}
								radius={[0, 0, 0, 0]}
							/>
						))
					) : (
						<Bar dataKey="count" fill={color} radius={[0, 4, 4, 0]} />
					)}
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}

function StatusDonut({
	data,
	loading,
}: {
	data: Array<{ name: string; value: number; key: string }>;
	loading?: boolean;
}) {
	const total = data.reduce((s, d) => s + d.value, 0);
	if (loading) {
		return (
			<div className="flex h-[260px] items-center justify-center">
				<Loader2 className="h-5 w-5 animate-spin opacity-50" />
			</div>
		);
	}
	if (data.length === 0) {
		return (
			<div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
				Aucun statut renseigné.
			</div>
		);
	}
	return (
		<div className="flex flex-col gap-2">
			<div className="h-[180px] w-full relative">
				<ResponsiveContainer width="100%" height="100%">
					<PieChart>
						<Pie
							data={data}
							dataKey="value"
							nameKey="name"
							cx="50%"
							cy="50%"
							innerRadius={48}
							outerRadius={72}
							paddingAngle={2}
							strokeWidth={0}
						>
							{data.map((_, i) => (
								<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
							))}
						</Pie>
						<Tooltip
							contentStyle={{
								background: "var(--popover)",
								border: "1px solid var(--border)",
								borderRadius: 8,
								fontSize: 12,
							}}
						/>
					</PieChart>
				</ResponsiveContainer>
				<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
					<div className="text-2xl font-semibold tabular-nums">
						{total.toLocaleString("fr")}
					</div>
					<div className="text-[10px] uppercase tracking-wide text-muted-foreground">
						profils
					</div>
				</div>
			</div>
			<ul className="space-y-1">
				{data.slice(0, 5).map((d, i) => (
					<li
						key={d.key}
						className="flex items-center gap-2 text-xs"
					>
						<span
							className="h-2 w-2 rounded-sm shrink-0"
							style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
						/>
						<span className="flex-1 truncate">{d.name}</span>
						<span className="tabular-nums text-muted-foreground">
							{d.value} · {Math.round((d.value / total) * 100)}%
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}

function LevelBars({
	data,
	loading,
}: {
	data: Array<{ name: string; count: number; key: SkillLevel }>;
	loading?: boolean;
}) {
	const total = data.reduce((s, d) => s + d.count, 0);
	if (loading) {
		return (
			<div className="flex h-[260px] items-center justify-center">
				<Loader2 className="h-5 w-5 animate-spin opacity-50" />
			</div>
		);
	}
	if (total === 0) {
		return (
			<div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
				Aucune compétence avec niveau renseigné.
			</div>
		);
	}
	return (
		<div className="flex flex-col gap-3 pt-2">
			{data.map((d) => {
				const pct = total ? (d.count / total) * 100 : 0;
				return (
					<div key={d.key} className="space-y-1">
						<div className="flex items-baseline justify-between text-xs">
							<span className="font-medium">{d.name}</span>
							<span className="tabular-nums text-muted-foreground">
								{d.count.toLocaleString("fr")}{" "}
								<span className="opacity-60">· {Math.round(pct)}%</span>
							</span>
						</div>
						<div className="h-2 w-full rounded-full bg-muted overflow-hidden">
							<div
								className="h-full rounded-full transition-all"
								style={{
									width: `${pct}%`,
									background: LEVEL_COLORS[d.key],
								}}
							/>
						</div>
					</div>
				);
			})}
		</div>
	);
}

function CountryRanking({
	data,
	loading,
}: {
	data: Array<{
		country: string;
		profession: number;
		skills: number;
		total: number;
	}>;
	loading?: boolean;
}) {
	if (loading) {
		return (
			<div className="flex h-[260px] items-center justify-center">
				<Loader2 className="h-5 w-5 animate-spin opacity-50" />
			</div>
		);
	}
	if (data.length === 0) {
		return (
			<div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
				Aucun pays renseigné.
			</div>
		);
	}
	const max = data[0]?.total ?? 1;
	return (
		<ul className="space-y-2 pt-1">
			{data.map((d) => {
				const pct = max ? (d.total / max) * 100 : 0;
				return (
					<li key={d.country} className="space-y-0.5">
						<div className="flex items-center gap-2 text-xs">
							<span className="text-base leading-none">
								{getCountryFlag(d.country)}
							</span>
							<span className="flex-1 truncate font-medium">
								{getCountryName(d.country)}
							</span>
							<span className="tabular-nums text-muted-foreground">
								{d.profession}m · {d.skills}c
							</span>
						</div>
						<div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
							<div
								className="h-full rounded-full"
								style={{
									width: `${pct}%`,
									background: "var(--chart-4)",
								}}
							/>
						</div>
					</li>
				);
			})}
		</ul>
	);
}

function AggregateRow({
	aggregate,
	rank,
	maxCount,
}: {
	aggregate: Aggregate;
	rank: number;
	maxCount: number;
}) {
	const [open, setOpen] = useState(false);
	const Icon = aggregate.kind === "profession" ? Briefcase : BookOpen;
	const kindLabel = aggregate.kind === "profession" ? "Métier" : "Compétence";
	const accentColor =
		aggregate.kind === "profession" ? "var(--chart-3)" : "var(--chart-2)";
	const pct = maxCount ? (aggregate.users.length / maxCount) * 100 : 0;

	return (
		<li className="py-2">
			<button
				type="button"
				className="group relative flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/50"
				onClick={() => setOpen((v) => !v)}
				aria-expanded={open}
			>
				{/* Background relative bar */}
				<div
					aria-hidden
					className="pointer-events-none absolute inset-y-1 left-0 rounded-md opacity-[0.08] group-hover:opacity-[0.14] transition-opacity"
					style={{ width: `${pct}%`, background: accentColor }}
				/>

				<span className="relative w-6 text-xs font-semibold tabular-nums text-muted-foreground">
					#{rank}
				</span>

				{open ? (
					<ChevronDown className="relative h-4 w-4 shrink-0 text-muted-foreground" />
				) : (
					<ChevronRight className="relative h-4 w-4 shrink-0 text-muted-foreground" />
				)}
				<Icon
					className="relative h-4 w-4 shrink-0"
					style={{ color: accentColor }}
				/>
				<Badge variant="outline" className="relative h-5 text-[10px] font-normal">
					{kindLabel}
				</Badge>
				<span className="relative flex-1 truncate text-sm font-medium">
					{aggregate.display}
				</span>

				{/* Mini level distribution for skills */}
				{aggregate.kind === "skill" && (
					<div className="relative hidden md:flex items-center gap-0.5">
						{SKILL_LEVELS.map((l) => {
							const c = aggregate.levelCounts[l];
							if (c === 0) return null;
							return (
								<span
									key={l}
									title={`${SKILL_LEVEL_META[l].label}: ${c}`}
									className="h-3 rounded-sm"
									style={{
										width: 6 + Math.min(c, 20),
										background: LEVEL_COLORS[l],
										opacity: 0.85,
									}}
								/>
							);
						})}
					</div>
				)}

				<span className="relative ml-2 text-xs tabular-nums text-muted-foreground">
					<span className="font-semibold text-foreground">
						{aggregate.users.length}
					</span>{" "}
					personne{aggregate.users.length > 1 ? "s" : ""}
				</span>
			</button>

			{open && (
				<ul className="mt-1.5 space-y-1 pl-12">
					{aggregate.users.map(({ user, level }) => (
						<li
							key={`${aggregate.key}-${user._id}`}
							className="flex items-center gap-2 rounded-md px-2 py-1 text-xs"
						>
							<span className="flex-1 truncate">
								{user.firstName || user.lastName
									? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
									: (user.email ?? "—")}
							</span>
							{user.residenceCountry && (
								<span className="shrink-0 text-muted-foreground">
									{getCountryFlag(user.residenceCountry)}{" "}
									{getCountryName(user.residenceCountry)}
								</span>
							)}
							{level && (
								<Badge
									variant="secondary"
									className="h-4 shrink-0 text-[9px] font-normal"
								>
									{SKILL_LEVEL_META[level].label}
								</Badge>
							)}
							{user.profession?.status && (
								<Badge
									variant="outline"
									className="h-4 shrink-0 text-[9px] font-normal"
								>
									{WORK_STATUS_META[user.profession.status].label}
								</Badge>
							)}
							<SuperAdminCallTrigger
								targetUser={{
									_id: user._id as Id<"users">,
									firstName: user.firstName,
									lastName: user.lastName,
									email: user.email,
								}}
								variant="icon-buttons"
							/>
						</li>
					))}
				</ul>
			)}
		</li>
	);
}

function FilterField({
	label,
	className,
	children,
}: {
	label: string;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<div className={cn("flex flex-col gap-1", className)}>
			<span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</span>
			{children}
		</div>
	);
}

// ─── Utils ─────────────────────────────────────────────────────────────

function csvEscape(value: string): string {
	if (value.includes(",") || value.includes('"') || value.includes("\n")) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}
