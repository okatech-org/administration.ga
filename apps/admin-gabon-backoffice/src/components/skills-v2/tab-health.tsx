"use client";

import { useState } from "react";
import { useAction, usePaginatedQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ClassifyManuallyDialog } from "./classify-manually-dialog";
import { Gauge, Icon, SectionHeader } from "./ui";

const PENDING_PAGE = 6;
const FAILURES_PAGE = 4;
const RUNS_PAGE = 5;

function fmtDate(ts: number) {
	const d = new Date(ts);
	return d.toLocaleString("fr-FR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function fmtDuration(ms: number | undefined) {
	if (!ms) return "—";
	const s = Math.round(ms / 1000);
	if (s < 60) return `${s}s`;
	const m = Math.floor(s / 60);
	const rest = s % 60;
	return `${m}m ${rest}s`;
}

function initialsFrom(name: string) {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.map((n) => n[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();
}

type FailureRow = {
	profileId: Id<"profiles">;
	userId: Id<"users">;
	name: string;
	freeProfession: string;
	category: string | null;
	suggestedSkillsCount: number;
	enrichedAt: number | null;
};

export function TabHealth() {
	const { t } = useTranslation();
	const health = useQuery(api.functions.adminSkills.getDataHealth, {});

	const pending = usePaginatedQuery(
		api.functions.adminSkills.listPendingEnrichment,
		{},
		{ initialNumItems: PENDING_PAGE },
	);
	const failures = usePaginatedQuery(
		api.functions.adminSkills.listAiFailures,
		{},
		{ initialNumItems: FAILURES_PAGE },
	);
	const runs = usePaginatedQuery(
		api.functions.adminSkills.listAiRuns,
		{},
		{ initialNumItems: RUNS_PAGE },
	);

	const runAi = useAction(api.functions.adminSkillsActions.runAiEnrichment);
	const enrichOne = useAction(api.functions.adminSkillsActions.enrichOne);

	const [runningGlobal, setRunningGlobal] = useState(false);
	const [enrichingId, setEnrichingId] = useState<string | null>(null);
	const [classifyTarget, setClassifyTarget] = useState<FailureRow | null>(null);

	const onLaunchGlobal = async () => {
		if (runningGlobal) return;
		setRunningGlobal(true);
		try {
			const r = await runAi({});
			toast.success("Run IA lancé", {
				description: `${r.counts.aiSuccess} profils enrichis, ${r.counts.aiFailed} échecs.`,
			});
		} catch (err) {
			toast.error("Échec du run IA", {
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setRunningGlobal(false);
		}
	};

	const onEnrichOne = async (profileId: Id<"profiles">) => {
		setEnrichingId(profileId);
		try {
			await enrichOne({ profileId });
			toast.success("Profil enrichi");
		} catch (err) {
			toast.error("Échec de l'enrichissement", {
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setEnrichingId(null);
		}
	};

	const healthLoading = health === undefined;

	return (
		<div className="stack stack-4">
			{/* SECTION 1 — Couverture */}
			<div>
				<SectionHeader
					icon="HeartPulse"
					title={t("superadmin.skills.health.coverageTitle")}
					hint={t("superadmin.skills.health.coverageHint")}
					tone="green"
				/>
				<div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, marginTop: 14 }}>
					<Gauge
						value={healthLoading ? 0 : health.gauges.profession.pct}
						tone="info"
						label={t("superadmin.skills.health.gaugeProfession")}
						sub={
							healthLoading
								? "—"
								: t("superadmin.skills.health.gaugeProfessionSub", {
									filled: health.gauges.profession.filled.toLocaleString("fr-FR"),
									total: health.gauges.profession.total.toLocaleString("fr-FR"),
								})
						}
					/>
					<Gauge
						value={healthLoading ? 0 : health.gauges.ai.pct}
						tone="purple"
						label={t("superadmin.skills.health.gaugeAi")}
						sub={
							healthLoading
								? "—"
								: t("superadmin.skills.health.gaugeAiSub", {
									count: health.gauges.ai.eligible.toLocaleString("fr-FR"),
								})
						}
					/>
					<Gauge
						value={healthLoading ? 0 : health.gauges.cv.pct}
						tone="success"
						label={t("superadmin.skills.health.gaugeCv")}
						sub={t("superadmin.skills.health.gaugeCvSub")}
					/>
				</div>
			</div>

			{/* SECTION 2 — Profils non enrichis */}
			<div className="card">
				<div className="card-head">
					<SectionHeader
						icon="Sparkles"
						title={t("superadmin.skills.health.awaitingTitle")}
						hint={t("superadmin.skills.health.awaitingHint")}
						tone="purple"
					/>
					<button
						type="button"
						className="btn btn-sm btn-dark"
						onClick={onLaunchGlobal}
						disabled={runningGlobal}
					>
						{runningGlobal ? <Icon name="Loader" size={14} /> : <Icon name="Sparkles" size={14} />}
						{t("superadmin.skills.actions.launchAiEnrichment")}
					</button>
				</div>
				<div
					className="ai-attente-bg"
					style={{
						padding: "16px 18px",
						borderBottom: "1px solid var(--border)",
					}}
				>
					<div className="row items-center" style={{ gap: 16, flexWrap: "wrap" }}>
						<div
							style={{
								width: 48,
								height: 48,
								borderRadius: 12,
								background: "var(--purple-v2-tint)",
								color: "var(--purple-v2)",
								display: "grid",
								placeItems: "center",
							}}
						>
							<Icon name="Loader" size={24} />
						</div>
						<div style={{ flex: 1, minWidth: 200 }}>
							<div style={{ fontSize: 22, fontWeight: 600, fontFamily: "var(--mono-v2)", letterSpacing: "-0.01em" }}>
								{healthLoading
									? "…"
									: t("superadmin.skills.health.awaitingCount", { count: health.pending })}
							</div>
							<div className="text-sm text-muted">
								{healthLoading
									? "—"
									: t("superadmin.skills.health.awaitingCost", {
										cost: (Math.round(health.pending * 0.012 * 100) / 100).toLocaleString("fr-FR"),
									})}
							</div>
						</div>
						<div className="text-xs text-muted" style={{ maxWidth: 360, lineHeight: 1.45 }}>
							{t("superadmin.skills.health.awaitingScheduleLine1")}
							<br />
							{t("superadmin.skills.health.awaitingScheduleLine2")}
						</div>
					</div>
				</div>

				<div>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1.4fr 1.4fr 1fr 110px 120px",
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
						<div>{t("superadmin.skills.health.colName")}</div>
						<div>{t("superadmin.skills.health.colFreeProfession")}</div>
						<div>{t("superadmin.skills.health.colCountry")}</div>
						<div>{t("superadmin.skills.health.colRegistered")}</div>
						<div className="ta-center">{t("superadmin.skills.health.colAction")}</div>
					</div>
					{pending.status === "LoadingFirstPage" ? (
						<div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
							<Icon name="Loader" size={18} />
						</div>
					) : pending.results.length === 0 ? (
						<div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }} className="text-sm">
							Aucun profil en attente d'enrichissement.
						</div>
					) : (
						pending.results.map((p, i) => (
							<div
								key={p.profileId}
								style={{
									display: "grid",
									gridTemplateColumns: "1.4fr 1.4fr 1fr 110px 120px",
									padding: "12px 18px",
									alignItems: "center",
									gap: 12,
									borderTop: i === 0 ? "none" : "1px solid var(--border-soft)",
									fontSize: 12.5,
								}}
							>
								<div className="row items-center" style={{ gap: 10 }}>
									<div className="avatar sm tone-slate">{initialsFrom(p.name)}</div>
									<span style={{ fontWeight: 500 }}>{p.name}</span>
								</div>
								<div style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
									« {p.freeProfession} »
								</div>
								<div>{p.country ?? "—"}</div>
								<div className="text-mono text-xs text-muted">
									{new Date(p.registeredAt).toLocaleDateString("fr-FR", {
										day: "2-digit",
										month: "short",
										year: "numeric",
									})}
								</div>
								<div className="ta-center">
									<button
										type="button"
										className="btn btn-sm btn-soft"
										style={{ color: "var(--purple-v2)" }}
										onClick={() => onEnrichOne(p.profileId)}
										disabled={enrichingId === p.profileId}
									>
										{enrichingId === p.profileId ? (
											<Icon name="Loader" size={12} />
										) : (
											<Icon name="Sparkles" size={12} />
										)}
										{t("superadmin.skills.actions.enrich")}
									</button>
								</div>
							</div>
						))
					)}
					{(pending.status === "CanLoadMore" || pending.status === "LoadingMore") && (
						<div
							style={{
								padding: "12px 18px",
								background: "var(--surface-2)",
								borderTop: "1px solid var(--border)",
							}}
						>
							<button
								type="button"
								className="btn btn-text btn-sm"
								onClick={() => pending.loadMore(PENDING_PAGE)}
								disabled={pending.status === "LoadingMore"}
							>
								{pending.status === "LoadingMore" ? (
									<Icon name="Loader" size={12} />
								) : (
									<Icon name="ChevronRight" size={12} />
								)}
								Charger {PENDING_PAGE} profils suivants
							</button>
						</div>
					)}
				</div>
			</div>

			{/* SECTION 3 + 4 */}
			<div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
				<div className="card">
					<div className="card-head">
						<SectionHeader
							icon="Ban"
							title={t("superadmin.skills.health.failuresTitle")}
							hint={t("superadmin.skills.health.failuresHint")}
							tone="danger"
						/>
					</div>
					<div>
						{failures.status === "LoadingFirstPage" ? (
							<div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
								<Icon name="Loader" size={18} />
							</div>
						) : failures.results.length === 0 ? (
							<div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }} className="text-sm">
								Aucune erreur d'enrichissement à signaler.
							</div>
						) : (
							failures.results.map((f, i) => (
								<div
									key={f.profileId}
									style={{
										padding: "14px 18px",
										borderTop: i === 0 ? "none" : "1px solid var(--border-soft)",
									}}
								>
									<div className="row items-start justify-between" style={{ gap: 12 }}>
										<div className="flex-1 min-w-0">
											<div style={{ fontSize: 13, fontWeight: 600 }}>{f.name}</div>
											<div className="text-xs text-muted" style={{ fontStyle: "italic", marginTop: 4 }}>
												« {f.freeProfession} »
											</div>
											<div className="row items-center" style={{ gap: 6, marginTop: 8 }}>
												<Icon name="AlertCircle" size={12} color="var(--danger-v2)" />
												<span className="text-xs" style={{ color: "var(--danger-v2)" }}>
													{f.category === "other"
														? "Catégorie « Autre »"
														: f.suggestedSkillsCount === 0
															? "Aucune compétence suggérée"
															: "Faible confiance"}
												</span>
											</div>
										</div>
										<button
											type="button"
											className="btn btn-sm btn-soft"
											onClick={() => setClassifyTarget(f as FailureRow)}
										>
											{t("superadmin.skills.actions.reclassify")}
										</button>
									</div>
								</div>
							))
						)}
						{(failures.status === "CanLoadMore" || failures.status === "LoadingMore") && (
							<div
								style={{
									padding: "12px 18px",
									background: "var(--surface-2)",
									borderTop: "1px solid var(--border)",
								}}
							>
								<button
									type="button"
									className="btn btn-text btn-sm"
									onClick={() => failures.loadMore(FAILURES_PAGE)}
									disabled={failures.status === "LoadingMore"}
								>
									{failures.status === "LoadingMore" ? (
										<Icon name="Loader" size={12} />
									) : (
										<Icon name="ChevronRight" size={12} />
									)}
									Charger {FAILURES_PAGE} erreurs suivantes
								</button>
							</div>
						)}
					</div>
				</div>

				<div className="card">
					<div className="card-head">
						<SectionHeader
							icon="Clock"
							title={t("superadmin.skills.health.runsTitle")}
							hint={t("superadmin.skills.health.runsHint")}
							tone="info"
						/>
					</div>
					<div>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1.4fr 80px 80px 80px 70px",
								padding: "10px 18px",
								alignItems: "center",
								gap: 8,
								background: "var(--surface-2)",
								borderBottom: "1px solid var(--border)",
								fontSize: 10.5,
								fontWeight: 600,
								textTransform: "uppercase",
								letterSpacing: "0.08em",
								color: "var(--text-muted)",
							}}
						>
							<div>{t("superadmin.skills.health.colDate")}</div>
							<div className="ta-center">{t("superadmin.skills.health.colProcessed")}</div>
							<div className="ta-center">{t("superadmin.skills.health.colSuccess")}</div>
							<div className="ta-center">{t("superadmin.skills.health.colFailed")}</div>
							<div className="ta-center">{t("superadmin.skills.health.colDuration")}</div>
						</div>
						{runs.status === "LoadingFirstPage" ? (
							<div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
								<Icon name="Loader" size={18} />
							</div>
						) : runs.results.length === 0 ? (
							<div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }} className="text-sm">
								Aucun run enregistré pour le moment.
							</div>
						) : (
							runs.results.map((r, i) => {
								const successRate =
									r.processed > 0 ? Math.round((r.success / r.processed) * 100) : 0;
								return (
									<div
										key={r._id}
										style={{
											display: "grid",
											gridTemplateColumns: "1.4fr 80px 80px 80px 70px",
											padding: "12px 18px",
											alignItems: "center",
											gap: 8,
											borderTop: i === 0 ? "none" : "1px solid var(--border-soft)",
											fontSize: 12,
										}}
									>
										<div className="row items-center" style={{ gap: 8 }}>
											<span
												style={{
													width: 7,
													height: 7,
													borderRadius: 100,
													background:
														r.status === "running"
															? "var(--warning-v2)"
															: successRate > 90
																? "var(--success-v2)"
																: "var(--warning-v2)",
												}}
											/>
											<span className="text-mono">{fmtDate(r.startedAt)}</span>
										</div>
										<div className="ta-center text-mono" style={{ fontWeight: 600 }}>
											{r.processed}
										</div>
										<div className="ta-center text-mono" style={{ color: "var(--success-v2)" }}>
											{r.success}
										</div>
										<div
											className="ta-center text-mono"
											style={{ color: r.failed > 20 ? "var(--danger-v2)" : "var(--text-muted)" }}
										>
											{r.failed}
										</div>
										<div className="ta-center text-mono text-xs text-muted">
											{fmtDuration(r.durationMs)}
										</div>
									</div>
								);
							})
						)}
						{(runs.status === "CanLoadMore" || runs.status === "LoadingMore") && (
							<div
								style={{
									padding: "12px 18px",
									background: "var(--surface-2)",
									borderTop: "1px solid var(--border)",
								}}
							>
								<button
									type="button"
									className="btn btn-text btn-sm"
									onClick={() => runs.loadMore(RUNS_PAGE)}
									disabled={runs.status === "LoadingMore"}
								>
									{runs.status === "LoadingMore" ? (
										<Icon name="Loader" size={12} />
									) : (
										<Icon name="ChevronRight" size={12} />
									)}
									Charger {RUNS_PAGE} runs précédents
								</button>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Modal : reclassify */}
			{classifyTarget && (
				<ClassifyManuallyDialog
					open={classifyTarget !== null}
					onOpenChange={(open) => {
						if (!open) setClassifyTarget(null);
					}}
					profileId={classifyTarget.profileId}
					profileName={classifyTarget.name}
					freeProfession={classifyTarget.freeProfession}
					currentCategory={classifyTarget.category}
				/>
			)}
		</div>
	);
}
