"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTranslation } from "react-i18next";
import { getCountryFlag, getCountryName } from "@/lib/country-utils";
import { TONE_VAR, type Tone } from "./mock-data";
import {
	Donut,
	HBar,
	Icon,
	KpiCard,
	LevelLegend,
	SectionHeader,
	StackedBar,
} from "./ui";

const PRO_STATUS_TONE: Record<string, Tone> = {
	employee: "info",
	self_employed: "cyan",
	entrepreneur: "purple",
	student: "teal",
	unemployed: "warning",
	retired: "green",
	other: "muted",
};

const LEVEL_TONE: Record<string, Tone> = {
	beginner: "muted",
	intermediate: "info",
	advanced: "success",
	expert: "purple",
};

const CATEGORY_LABELS: Record<string, string> = {
	tech: "Tech",
	health: "Santé",
	education: "Éducation",
	agriculture: "Agriculture",
	finance: "Finance",
	trades: "Métiers manuels",
	public_service: "Service public",
	arts_culture: "Arts & Culture",
	transport: "Transport",
	tourism_hospitality: "Tourisme & Hôtellerie",
	consulting_services: "Conseil & Services",
	legal: "Juridique",
	industry: "Industrie",
	other: "Autre",
};

function fr(n: number) {
	return n.toLocaleString("fr-FR");
}

export function TabOverview() {
	const { t } = useTranslation();
	const kpis = useQuery(api.functions.adminSkills.getKpis, {});
	const overview = useQuery(api.functions.adminSkills.getOverview, {});

	const loading = kpis === undefined || overview === undefined;

	const levelLabel = (id: string) =>
		t(`superadmin.skills.levels.${id}`, { defaultValue: id });
	const statusLabel = (id: string) =>
		t(`superadmin.skills.workStatus.${id}`, { defaultValue: id });

	return (
		<div className="stack stack-4">
			{/* KPI strip */}
			<div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 }}>
				<KpiCard
					label={t("superadmin.skills.kpi.profilesAnalyzed")}
					value={loading ? "…" : fr(kpis.totalProfiles)}
					hint={
						loading
							? "—"
							: t("superadmin.skills.kpi.profilesAnalyzedHint", {
								count: fr(kpis.profilesWithProfession),
							})
					}
					icon="Users"
					tone="info"
				/>
				<KpiCard
					label={t("superadmin.skills.kpi.uniqueProfessions")}
					value={loading ? "…" : fr(kpis.uniqueProfessions)}
					hint={
						loading
							? "—"
							: t("superadmin.skills.kpi.uniqueProfessionsHint", {
								pct:
									kpis.totalProfiles > 0
										? Math.round((kpis.profilesWithProfession / kpis.totalProfiles) * 100)
										: 0,
							})
					}
					icon="Briefcase"
					tone="teal"
				/>
				<KpiCard
					label={t("superadmin.skills.kpi.uniqueSkills")}
					value={loading ? "…" : fr(kpis.uniqueSkills)}
					hint={
						loading
							? "—"
							: t("superadmin.skills.kpi.uniqueSkillsHint", { count: fr(kpis.totalSkillEntries) })
					}
					icon="Award"
					tone="green"
				/>
				<KpiCard
					label={t("superadmin.skills.kpi.aiCoverage")}
					value={loading ? "…" : `${kpis.aiCoveragePct} %`}
					hint={
						loading
							? "—"
							: t("superadmin.skills.kpi.aiCoverageHint", { count: fr(kpis.aiEnrichedCount) })
					}
					icon="Sparkles"
					tone="purple"
				/>
			</div>

			{/* Row 1 */}
			<div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
				<div className="card">
					<div className="card-head">
						<SectionHeader
							icon="Briefcase"
							title={t("superadmin.skills.overview.topProfessions")}
							hint={t("superadmin.skills.overview.topProfessionsHint")}
							tone="teal"
						/>
					</div>
					<div style={{ padding: "14px 18px 18px" }}>
						{loading ? (
							<SkeletonRows />
						) : overview.topProfessions.length === 0 ? (
							<EmptyHint icon="Briefcase">Aucun métier renseigné pour le moment.</EmptyHint>
						) : (
							<div className="stack stack-3">
								{(() => {
									const max = Math.max(...overview.topProfessions.map((p) => p.count));
									return overview.topProfessions.map((p, i) => (
										<HBar
											key={p.title}
											label={
												<span>
													<span style={{ color: "var(--text-faint)", fontFamily: "var(--mono-v2)", marginRight: 8 }}>
														#{(i + 1).toString().padStart(2, "0")}
													</span>
													{p.title}{" "}
													{p.category && (
														<span style={{ color: "var(--text-faint)" }}>
															· {CATEGORY_LABELS[p.category] ?? p.category}
														</span>
													)}
												</span>
											}
											value={p.count}
											max={max}
											tone="info"
											rightLabel={
												<span className="text-mono">
													<b style={{ color: "var(--text)" }}>{p.count}</b>{" "}
													{t("superadmin.skills.overview.profilesCountSuffix")}
												</span>
											}
										/>
									));
								})()}
							</div>
						)}
					</div>
				</div>

				<div className="card">
					<div className="card-head">
						<SectionHeader
							icon="Award"
							title={t("superadmin.skills.overview.topSkills")}
							hint={t("superadmin.skills.overview.topSkillsHint")}
							tone="green"
						/>
						<LevelLegend />
					</div>
					<div style={{ padding: "14px 18px 18px" }}>
						{loading ? (
							<SkeletonRows />
						) : overview.topSkills.length === 0 ? (
							<EmptyHint icon="Award">Aucune compétence déclarée pour le moment.</EmptyHint>
						) : (
							<div className="stack stack-3">
								{(() => {
									const max = Math.max(...overview.topSkills.map((s) => s.total));
									return overview.topSkills.map((s, i) => (
										<StackedBar
											key={s.skill}
											label={
												<span>
													<span style={{ color: "var(--text-faint)", fontFamily: "var(--mono-v2)", marginRight: 8 }}>
														#{(i + 1).toString().padStart(2, "0")}
													</span>
													{s.skill}
												</span>
											}
											segments={[
												{ label: levelLabel("beginner"), tone: "muted", value: s.byLevel.beginner },
												{ label: levelLabel("intermediate"), tone: "info", value: s.byLevel.intermediate },
												{ label: levelLabel("advanced"), tone: "success", value: s.byLevel.advanced },
												{ label: levelLabel("expert"), tone: "purple", value: s.byLevel.expert },
											]}
											max={max}
										/>
									));
								})()}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Row 2 */}
			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: 14 }}>
				<div className="card">
					<div className="card-head">
						<SectionHeader
							icon="User"
							title={t("superadmin.skills.overview.professionalStatus")}
							tone="purple"
						/>
					</div>
					<div style={{ padding: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
						{loading ? (
							<div style={{ width: 180, height: 180, borderRadius: 100, background: "var(--surface-3)" }} />
						) : (
							<>
								<Donut
									data={overview.proStatus.map((s) => ({
										tone: PRO_STATUS_TONE[s.status] ?? "muted",
										count: s.count,
										label: statusLabel(s.status),
									}))}
									centerValue={fr(overview.proStatus.reduce((s, x) => s + x.count, 0))}
									centerLabel={t("superadmin.skills.overview.profiles")}
								/>
								<div style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
									{overview.proStatus.map((p) => {
										const tone = PRO_STATUS_TONE[p.status] ?? "muted";
										return (
											<div key={p.status} className="row items-center" style={{ gap: 8, fontSize: 11.5 }}>
												<span
													style={{
														width: 9, height: 9, borderRadius: 2,
														background: TONE_VAR[tone].color, flexShrink: 0,
													}}
												/>
												<span className="flex-1 min-w-0 truncate">{statusLabel(p.status)}</span>
												<span className="text-mono text-xs" style={{ color: "var(--text-muted)" }}>{fr(p.count)}</span>
											</div>
										);
									})}
								</div>
							</>
						)}
					</div>
				</div>

				<div className="card">
					<div className="card-head">
						<SectionHeader
							icon="Activity"
							title={t("superadmin.skills.overview.skillLevels")}
							hint={t("superadmin.skills.overview.skillLevelsHint")}
							tone="info"
						/>
					</div>
					<div style={{ padding: 18 }}>
						{loading ? (
							<SkeletonRows />
						) : (() => {
							const total = overview.levelDistribution.reduce((s, x) => s + x.count, 0);
							return (
								<>
									<div className="stack stack-4">
										{overview.levelDistribution.map((l) => {
											const tone = LEVEL_TONE[l.level] ?? "muted";
											const pct = total > 0 ? Math.round((l.count / total) * 100) : 0;
											return (
												<div key={l.level}>
													<div className="row items-center justify-between" style={{ marginBottom: 6 }}>
														<div className="row items-center" style={{ gap: 8 }}>
															<span style={{ width: 10, height: 10, borderRadius: 3, background: TONE_VAR[tone].color }} />
															<span style={{ fontSize: 13, fontWeight: 500 }}>{levelLabel(l.level)}</span>
														</div>
														<div className="text-mono text-xs" style={{ color: "var(--text-muted)" }}>
															{fr(l.count)} · <b style={{ color: "var(--text)" }}>{pct} %</b>
														</div>
													</div>
													<div style={{ height: 10, background: "var(--surface-3)", borderRadius: 100, overflow: "hidden" }}>
														<div style={{ width: `${pct}%`, height: "100%", background: TONE_VAR[tone].color, borderRadius: 100 }} />
													</div>
												</div>
											);
										})}
									</div>
									<div className="divider" style={{ margin: "18px 0 14px" }} />
									<div className="row items-center justify-between text-xs text-muted">
										<span>{t("superadmin.skills.overview.totalDeclarations")}</span>
										<span className="text-mono" style={{ color: "var(--text)", fontWeight: 600 }}>
											{fr(total)}
										</span>
									</div>
								</>
							);
						})()}
					</div>
				</div>

				<div className="card">
					<div className="card-head">
						<SectionHeader
							icon="Globe2"
							title={t("superadmin.skills.overview.topCountries")}
							hint={t("superadmin.skills.overview.topCountriesHint")}
							tone="cyan"
						/>
					</div>
					<div style={{ padding: "12px 18px 18px" }}>
						{loading ? (
							<SkeletonRows />
						) : overview.topCountries.length === 0 ? (
							<EmptyHint icon="Globe2">Aucun pays renseigné pour le moment.</EmptyHint>
						) : (
							<div className="stack stack-3">
								{(() => {
									const max = Math.max(...overview.topCountries.map((c) => c.count));
									return overview.topCountries.map((c, i) => (
										<div key={c.iso} className="row items-center" style={{ gap: 10 }}>
											<span style={{ fontFamily: "var(--mono-v2)", fontSize: 10.5, color: "var(--text-faint)", width: 22 }}>
												#{(i + 1).toString().padStart(2, "0")}
											</span>
											<span style={{ fontSize: 16, lineHeight: 1 }}>{getCountryFlag(c.iso)}</span>
											<div className="flex-1 min-w-0">
												<div style={{ fontSize: 12.5, fontWeight: 500 }}>{getCountryName(c.iso)}</div>
												<div style={{ height: 4, background: "var(--surface-3)", borderRadius: 100, marginTop: 4, overflow: "hidden" }}>
													<div
														style={{
															width: `${(c.count / max) * 100}%`,
															height: "100%",
															background: "var(--gabon-blue-v2)",
															borderRadius: 100,
														}}
													/>
												</div>
											</div>
											<div className="text-mono text-xs" style={{ color: "var(--text-muted)", minWidth: 50, textAlign: "right" }}>
												<b style={{ color: "var(--text)" }}>{fr(c.count)}</b>
											</div>
										</div>
									));
								})()}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

// ─── Skeleton / Empty ─────────────────────────────────────────────
function SkeletonRows() {
	return (
		<div className="stack stack-3">
			{Array.from({ length: 5 }).map((_, i) => (
				<div key={i} style={{ height: 22, borderRadius: 4, background: "var(--surface-3)", opacity: 0.6 }} />
			))}
		</div>
	);
}

function EmptyHint({ icon, children }: { icon: string; children: React.ReactNode }) {
	return (
		<div className="ta-center" style={{ padding: "32px 12px", color: "var(--text-muted)" }}>
			<Icon name={icon} size={28} color="var(--text-faint)" />
			<div className="text-sm" style={{ marginTop: 10 }}>{children}</div>
		</div>
	);
}
