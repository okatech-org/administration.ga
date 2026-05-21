"use client";

import { useState } from "react";
import { usePaginatedQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTranslation } from "react-i18next";
import { useUrlBoolean, useUrlState } from "@/components/dashboard-v2/use-url-state";
import { downloadCsv } from "./csv";
import { ReengagementBatchDialog } from "./reengagement-batch-dialog";
import { TONE_VAR, type Tone } from "./mock-data";
import { Combobox, Icon, SearchInput } from "./ui";

const LEVEL_KEYS = ["beginnerShort", "intermediateShort", "advancedShort", "expertShort"] as const;
const LEVEL_TONES: Tone[] = ["muted", "info", "success", "purple"];

const CAT_LABELS: Record<string, string> = {
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

const ALL_CATS = "__all__";
type SortKey = "total" | "declared" | "ai" | "gap";
const PAGE_SIZE = 10;

export function TabCatalog({
	onOpenProfiles,
}: {
	onOpenProfiles?: (skillName: string) => void;
}) {
	const { t } = useTranslation();
	const [query, setQuery] = useUrlState<string>("q", "");
	const [catFilter, setCatFilter] = useUrlState<string>("cat", ALL_CATS);
	const [sort, setSort] = useUrlState<SortKey>("sort", "total");
	const [onlyGaps, setOnlyGaps] = useUrlBoolean("gaps");
	const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
	const [batchTarget, setBatchTarget] = useState<{
		skillName: string;
		estimatedCount: number;
	} | null>(null);

	const openBatch = (skillName: string, estimatedCount: number) =>
		setBatchTarget({ skillName, estimatedCount });

	const onExport = () => {
		downloadCsv(
			"competences-catalogue",
			["rank", "skill", "declared", "ai_suggested", "gap", "beginner", "intermediate", "advanced", "expert"],
			results.map((s, i) => [
				i + 1,
				s.skillName,
				s.declared,
				s.ai,
				s.gap,
				s.byLevel.beginner,
				s.byLevel.intermediate,
				s.byLevel.advanced,
				s.byLevel.expert,
			]),
		);
	};

	const { results, status, loadMore } = usePaginatedQuery(
		api.functions.adminSkills.getSkillCatalog,
		{
			sort,
			onlyGaps,
			search: query || undefined,
		},
		{ initialNumItems: PAGE_SIZE },
	);

	const loading = status === "LoadingFirstPage";
	const canLoadMore = status === "CanLoadMore";
	const loadingMore = status === "LoadingMore";

	// Top gap = première row triée par gap desc (parmi les rows chargées).
	const topGap = (() => {
		if (results.length === 0) return null;
		return [...results].sort((a, b) => b.gap - a.gap)[0];
	})();

	const catOptions = [
		{ value: ALL_CATS, label: t("superadmin.skills.catalog.allCategories") },
		...Object.entries(CAT_LABELS).map(([id, label]) => ({ value: id, label })),
	];

	const sortOptions = [
		{ value: "total", label: t("superadmin.skills.catalog.sortTotal") },
		{ value: "declared", label: t("superadmin.skills.catalog.sortDeclared") },
		{ value: "ai", label: t("superadmin.skills.catalog.sortAi") },
		{ value: "gap", label: t("superadmin.skills.catalog.sortGap") },
	];

	return (
		<div className="stack stack-4">
			{/* Toolbar */}
			<div className="row items-center" style={{ gap: 8, flexWrap: "wrap" }}>
				<SearchInput
					value={query}
					onChange={setQuery}
					placeholder={t("superadmin.skills.catalog.searchPlaceholder")}
					width={280}
				/>
				<Combobox icon="Filter" value={catFilter} onChange={setCatFilter} options={catOptions} />
				<Combobox
					icon="Activity"
					value={sort}
					onChange={(v) => setSort(v as SortKey)}
					options={sortOptions}
				/>
				<button
					type="button"
					onClick={() => setOnlyGaps(!onlyGaps)}
					className={`btn btn-sm ${onlyGaps ? "btn-primary" : "btn-soft"}`}
				>
					<Icon name="AlertTriangle" size={12} />
					{t("superadmin.skills.actions.importantGaps")}
				</button>
				<div className="row items-center" style={{ gap: 6, marginLeft: "auto" }}>
					<span className="text-xs text-muted text-mono">
						{loading ? "…" : `${results.length}${canLoadMore ? "+" : ""}`}
					</span>
					<button
						type="button"
						className="btn btn-sm btn-soft"
						onClick={onExport}
						disabled={loading || results.length === 0}
					>
						<Icon name="Download" size={14} />
						{t("superadmin.skills.actions.exportCsv")}
					</button>
				</div>
			</div>

			{/* Gap alert */}
			{topGap && topGap.gap > 0 && (
				<div className="banner tone-warning">
					<div className="banner-icon">
						<Icon name="AlertTriangle" size={18} />
					</div>
					<div className="banner-body">
						<div className="banner-title">
							{t("superadmin.skills.catalog.gapBannerTitle", { count: topGap.gap, name: topGap.skillName })}
						</div>
						<div className="banner-text">
							{t("superadmin.skills.catalog.gapBannerText", {
								total: topGap.declared + topGap.ai,
								declared: topGap.declared,
							})}
						</div>
					</div>
					<div className="banner-actions">
						<button
							type="button"
							className="btn btn-sm btn-soft"
							onClick={() => onOpenProfiles?.(topGap.skillName)}
						>
							{t("superadmin.skills.actions.viewProfiles")}
						</button>
						<button
							type="button"
							className="btn btn-sm btn-dark"
							onClick={() => openBatch(topGap.skillName, topGap.ai)}
						>
							<Icon name="Send" size={14} />
							{t("superadmin.skills.actions.resend")}
						</button>
					</div>
				</div>
			)}

			{/* Table */}
			<div className="card" style={{ overflow: "hidden" }}>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "48px 1fr 120px 120px 140px 110px",
						padding: "10px 18px",
						alignItems: "center",
						gap: 12,
						background: "var(--surface-2)",
						borderBottom: "1px solid var(--border)",
						fontSize: 10.5,
						fontWeight: 600,
						textTransform: "uppercase",
						letterSpacing: "0.08em",
						color: "var(--text-muted)",
					}}
				>
					<div>#</div>
					<div>{t("superadmin.skills.catalog.colSkill")}</div>
					<div className="ta-center">{t("superadmin.skills.catalog.colDeclared")}</div>
					<div className="ta-center">{t("superadmin.skills.catalog.colAi")}</div>
					<div className="ta-center">{t("superadmin.skills.catalog.colLevels")}</div>
					<div style={{ textAlign: "right" }}>{t("superadmin.skills.catalog.colTotal")}</div>
				</div>

				{loading ? (
					<div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
						<Icon name="Loader" size={20} />
						<div className="text-sm" style={{ marginTop: 8 }}>
							Chargement du catalogue…
						</div>
					</div>
				) : results.length === 0 ? (
					<div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
						<Icon name="BookOpen" size={28} color="var(--text-faint)" />
						<div className="text-sm" style={{ marginTop: 8 }}>
							Aucune compétence ne correspond aux filtres.
						</div>
					</div>
				) : (
					results.map((s, idx) => {
						const expanded = expandedSkill === s.skillName;
						const total = s.declared + s.ai;
						const maxLevel = Math.max(
							s.byLevel.beginner,
							s.byLevel.intermediate,
							s.byLevel.advanced,
							s.byLevel.expert,
						);
						const levels = [
							s.byLevel.beginner,
							s.byLevel.intermediate,
							s.byLevel.advanced,
							s.byLevel.expert,
						];

						return (
							<div key={s._id} style={{ borderTop: idx === 0 ? "none" : "1px solid var(--border-soft)" }}>
								<div
									role="button"
									tabIndex={0}
									onClick={() => setExpandedSkill(expanded ? null : s.skillName)}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											setExpandedSkill(expanded ? null : s.skillName);
										}
									}}
									style={{
										display: "grid",
										gridTemplateColumns: "48px 1fr 120px 120px 140px 110px",
										padding: "14px 18px",
										alignItems: "center",
										gap: 12,
										cursor: "pointer",
									}}
								>
									<div className="text-mono text-xs" style={{ color: "var(--text-faint)" }}>
										#{(idx + 1).toString().padStart(2, "0")}
									</div>
									<div>
										<div className="row items-center" style={{ gap: 8, flexWrap: "wrap" }}>
											<span style={{ fontSize: 13.5, fontWeight: 500 }}>{s.skillName}</span>
											{s.gap >= 50 && (
												<span className="pill pill-warning" style={{ fontSize: 10.5 }}>
													<Icon name="AlertTriangle" size={12} />
													{t("superadmin.skills.catalog.gapBadge", { count: s.gap })}
												</span>
											)}
										</div>
									</div>
									<div className="ta-center">
										<span className="row items-center justify-center" style={{ gap: 6 }}>
											<span style={{ width: 9, height: 9, borderRadius: 100, background: "var(--text)" }} />
											<span className="text-mono" style={{ fontWeight: 600, fontSize: 13 }}>
												{s.declared}
											</span>
										</span>
									</div>
									<div className="ta-center">
										<span className="row items-center justify-center" style={{ gap: 6 }}>
											<span
												style={{
													width: 9,
													height: 9,
													borderRadius: 100,
													border: "2px solid var(--text)",
													boxSizing: "border-box",
												}}
											/>
											<span className="text-mono" style={{ fontWeight: 600, fontSize: 13, color: "var(--text-muted)" }}>
												{s.ai}
											</span>
										</span>
									</div>
									<div>
										<div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 24, justifyContent: "center" }}>
											{levels.map((lv, i) => (
												<div
													key={i}
													title={`${t(`superadmin.skills.levels.${LEVEL_KEYS[i]}`)}: ${lv}`}
													style={{
														width: 18,
														height: `${maxLevel === 0 ? 0 : (lv / maxLevel) * 22 + 2}px`,
														background: TONE_VAR[LEVEL_TONES[i]!].color,
														borderRadius: 2,
														opacity: lv === 0 ? 0.15 : 1,
													}}
												/>
											))}
										</div>
									</div>
									<div className="row items-center justify-end" style={{ gap: 8 }}>
										<span className="text-mono" style={{ fontWeight: 600, fontSize: 14 }}>
											{total}
										</span>
										{expanded ? (
											<Icon name="ChevronUp" size={14} color="var(--text-muted)" />
										) : (
											<Icon name="ChevronRight" size={14} color="var(--text-muted)" />
										)}
									</div>
								</div>

								{expanded && (
									<div
										style={{
											padding: "4px 18px 18px 66px",
											background: "var(--surface-2)",
											borderTop: "1px dashed var(--border-soft)",
										}}
									>
										<div className="row items-center justify-between" style={{ paddingTop: 12, marginBottom: 10 }}>
											<div className="row items-center" style={{ gap: 10 }}>
												<span className="uppercase">{t("superadmin.skills.catalog.expandedTitle")}</span>
												<span className="pill pill-mono">
													{t("superadmin.skills.catalog.personCount", { count: s.declared })}
												</span>
											</div>
											<button
												type="button"
												className="btn btn-sm btn-soft"
												onClick={(e) => {
													e.stopPropagation();
													onOpenProfiles?.(s.skillName);
												}}
											>
												{t("superadmin.skills.actions.viewAllProfiles")} <Icon name="ArrowUpRight" size={12} />
											</button>
										</div>
										{s.gap >= 50 && (
											<div
												style={{
													marginTop: 12,
													padding: 12,
													background: "var(--warning-v2-soft)",
													border: "1px solid var(--warning-v2-tint)",
													borderRadius: 10,
												}}
											>
												<div className="row items-center justify-between" style={{ gap: 12 }}>
													<div className="row items-center" style={{ gap: 10 }}>
														<Icon name="AlertTriangle" size={16} color="var(--warning-v2)" />
														<span style={{ fontSize: 12.5 }}>
															<b>{s.ai}</b>{" "}
															{t("superadmin.skills.catalog.unvalidatedAiTextStart")}{" "}
															<b>{t("superadmin.skills.catalog.unvalidatedAiTextEnd")}</b>.
														</span>
													</div>
													<button
														type="button"
														className="btn btn-sm btn-dark"
														onClick={(e) => {
															e.stopPropagation();
															openBatch(s.skillName, s.ai);
														}}
													>
														<Icon name="Send" size={12} />
														{t("superadmin.skills.actions.resendShort")}
													</button>
												</div>
											</div>
										)}
									</div>
								)}
							</div>
						);
					})
				)}

				{/* Batch reengagement modal */}
				{batchTarget && (
					<ReengagementBatchDialog
						open={batchTarget !== null}
						onOpenChange={(o) => {
							if (!o) setBatchTarget(null);
						}}
						skillName={batchTarget.skillName}
						estimatedCount={batchTarget.estimatedCount}
					/>
				)}

				{/* Pagination footer */}
				{(canLoadMore || loadingMore) && (
					<div
						className="row items-center justify-center"
						style={{
							padding: "12px 18px",
							borderTop: "1px solid var(--border)",
							background: "var(--surface-2)",
						}}
					>
						<button
							type="button"
							className="btn btn-sm btn-soft"
							onClick={() => loadMore(PAGE_SIZE)}
							disabled={loadingMore}
						>
							{loadingMore ? <Icon name="Loader" size={14} /> : <Icon name="ChevronRight" size={14} />}
							Charger les {PAGE_SIZE} suivantes
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
