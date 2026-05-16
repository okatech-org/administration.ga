"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@convex/_generated/api";
import { Icon } from "@/components/dashboard-v2/icon";
import { ToolbarSlot } from "@/components/dashboard-v2/toolbar-slot";
import { AiSummarySheet } from "@/components/dashboard-v2/ai-summary-sheet";
import { DailyReportSheet } from "@/components/dashboard-v2/daily-report-sheet";
import { FlagIcon } from "@/components/ui/flag-icon";
import {
	useAuthenticatedConvexQuery,
	useAuthenticatedPaginatedQuery,
} from "@/integrations/convex/hooks";

// ════════════════════════════════════════════════════════════════════════════
// Constants & helpers
// ════════════════════════════════════════════════════════════════════════════

type Tone =
	| "info"
	| "success"
	| "warning"
	| "danger"
	| "purple"
	| "cyan"
	| "teal"
	| "green"
	| "muted";

const TONE_VAR: Record<Tone, { color: string; tint: string }> = {
	info: { color: "var(--gabon-blue-v2)", tint: "var(--gabon-blue-v2-tint)" },
	success: { color: "var(--success-v2)", tint: "var(--success-v2-tint)" },
	warning: { color: "var(--warning-v2)", tint: "var(--warning-v2-tint)" },
	danger: { color: "var(--danger-v2)", tint: "var(--danger-v2-tint)" },
	purple: { color: "var(--purple-v2)", tint: "var(--purple-v2-tint)" },
	cyan: { color: "var(--cyan-v2)", tint: "var(--cyan-v2-tint)" },
	teal: { color: "var(--teal-v2)", tint: "var(--teal-v2-tint)" },
	green: { color: "var(--gabon-green-v2)", tint: "var(--gabon-green-v2-tint)" },
	muted: { color: "var(--text-faint)", tint: "var(--surface-3)" },
};

type PeriodId = "total" | "24h" | "7j" | "30j" | "90j" | "year";
const PERIODS: { id: PeriodId; label: string; ms: number }[] = [
	{ id: "total", label: "Total", ms: 0 },
	{ id: "24h", label: "24 h", ms: 24 * 60 * 60 * 1000 },
	{ id: "7j", label: "7 j", ms: 7 * 24 * 60 * 60 * 1000 },
	{ id: "30j", label: "30 j", ms: 30 * 24 * 60 * 60 * 1000 },
	{ id: "90j", label: "90 j", ms: 90 * 24 * 60 * 60 * 1000 },
	{ id: "year", label: "Année", ms: 365 * 24 * 60 * 60 * 1000 },
];

// Noms de pays + drapeaux : on s'appuie sur les clés i18n
// `superadmin.countryCodes.${code}` et le composant `<FlagIcon>` partagé
// (`@/components/ui/flag-icon` → `@workspace/ui/components/flag-icon`).
// Aucune table locale à maintenir.

// Status labels viennent de `fields.requestStatus.options.*` via t()
// (déjà internationalisé dans le projet). On garde uniquement le mapping
// status → tone localement.

const STATUS_TONE: Record<string, Tone> = {
	draft: "muted",
	submitted: "info",
	pending: "warning",
	pending_completion: "warning",
	edited: "purple",
	under_review: "info",
	processing: "cyan",
	in_production: "purple",
	validated: "green",
	appointment_scheduled: "cyan",
	ready_for_pickup: "teal",
	completed: "success",
	cancelled: "muted",
	rejected: "danger",
};

const REG_STATUS_TONE: Record<string, Tone> = {
	requested: "warning",
	active: "success",
	expired: "danger",
	unknown: "muted",
};

function timeAgo(ts: number): string {
	const diff = Date.now() - ts;
	const m = Math.floor(diff / 60000);
	if (m < 1) return "à l'instant";
	if (m < 60) return `il y a ${m} min`;
	const h = Math.floor(m / 60);
	if (h < 24) return `il y a ${h} h`;
	const d = Math.floor(h / 24);
	return `il y a ${d} j`;
}

function fmt(n: number): string {
	return n.toLocaleString("fr-FR");
}

function niceCeil(n: number): number {
	if (n <= 0) return 1;
	const pow = Math.pow(10, Math.floor(Math.log10(n)));
	const norm = n / pow;
	let nice: number;
	if (norm <= 1) nice = 1;
	else if (norm <= 2) nice = 2;
	else if (norm <= 3) nice = 3;
	else if (norm <= 5) nice = 5;
	else if (norm <= 7.5) nice = 7.5;
	else nice = 10;
	return Math.ceil(nice * pow);
}

// ════════════════════════════════════════════════════════════════════════════
// Small UI atoms
// ════════════════════════════════════════════════════════════════════════════

function EmptyState() {
	const { t } = useTranslation();
	return (
		<div
			className="text-sm text-muted ta-center"
			style={{ padding: "32px 0" }}
		>
			{t("superadmin.common.noData", "Aucune donnée disponible")}
		</div>
	);
}

function ToneDot({ tone = "info", size = 8 }: { tone?: Tone; size?: number }) {
	return (
		<span
			style={{
				width: size,
				height: size,
				borderRadius: "50%",
				background: TONE_VAR[tone].color,
				flexShrink: 0,
				display: "inline-block",
			}}
		/>
	);
}

function GabonStripe() {
	return (
		<span style={{ display: "inline-flex", height: 3, width: 36, borderRadius: 100, overflow: "hidden" }}>
			<span style={{ flex: 1, background: "var(--gabon-green-v2)" }} />
			<span style={{ flex: 1, background: "var(--gabon-yellow-v2)" }} />
			<span style={{ flex: 1, background: "var(--gabon-blue-v2)" }} />
		</span>
	);
}

function PeriodFilter({
	value,
	onChange,
}: {
	value: PeriodId;
	onChange: (id: PeriodId) => void;
}) {
	const { t } = useTranslation();
	return (
		<div
			style={{
				display: "inline-flex",
				background: "var(--surface)",
				border: "1px solid var(--border)",
				borderRadius: 100,
				padding: 3,
				gap: 2,
			}}
		>
			{PERIODS.map((p) => {
				const active = p.id === value;
				return (
					<button
						key={p.id}
						type="button"
						onClick={() => onChange(p.id)}
						style={{
							appearance: "none",
							background: active ? "var(--ink-900)" : "transparent",
							// `--ink-900` s'inverse en dark mode (devient beige clair) ; le
							// texte doit s'inverser en miroir → `var(--bg)` (≈ blanc en
							// light, ≈ noir en dark). Hardcoder `#fff` ferait blanc-sur-
							// beige-clair en dark mode.
							color: active ? "var(--bg)" : "var(--text-muted)",
							border: "none",
							borderRadius: 100,
							padding: "6px 14px",
							fontSize: 12,
							fontWeight: 500,
							cursor: "pointer",
							letterSpacing: "-0.005em",
						}}
					>
						{t(`superadmin.dashboard.periods.${p.id}`, p.label)}
					</button>
				);
			})}
		</div>
	);
}

function SystemHealthPill({ health }: { health?: string }) {
	const { t } = useTranslation();
	const TONE_BY_HEALTH: Record<string, { tone: Tone; key: string }> = {
		HEALTHY: { tone: "success", key: "healthy" },
		DEGRADED: { tone: "warning", key: "degraded" },
		CRITICAL: { tone: "danger", key: "critical" },
	};
	const cfg = TONE_BY_HEALTH[health ?? "HEALTHY"] ?? TONE_BY_HEALTH.HEALTHY!;
	const tv = TONE_VAR[cfg.tone];
	return (
		<span
			className="row items-center"
			style={{
				gap: 8,
				padding: "4px 10px",
				background: tv.tint,
				borderRadius: 100,
			}}
		>
			<span
				style={{
					width: 7,
					height: 7,
					borderRadius: "50%",
					background: tv.color,
					boxShadow: `0 0 0 4px ${tv.tint}`,
				}}
			/>
			<span style={{ fontSize: 12, fontWeight: 600, color: tv.color }}>
				{t(`superadmin.dashboard.systemHealth.${cfg.key}`)}
			</span>
		</span>
	);
}

// ════════════════════════════════════════════════════════════════════════════
// Welcome banner (with dismiss persisted in localStorage)
// ════════════════════════════════════════════════════════════════════════════

function WelcomeBanner({
	totalReps,
	totalUsers,
	urgentPending,
	onDismiss,
	onDailyReport,
	onAiSummary,
}: {
	totalReps: number;
	totalUsers: number;
	urgentPending: number;
	onDismiss: () => void;
	onDailyReport: () => void;
	onAiSummary: () => void;
}) {
	const { t, i18n } = useTranslation();
	const locale = i18n.language?.startsWith("en") ? "en-US" : "fr-FR";
	const now = useMemo(() => new Date(), []);
	const dateLabel = now.toLocaleDateString(locale, {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	});
	const timeLabel = now.toLocaleTimeString(locale, {
		hour: "2-digit",
		minute: "2-digit",
	});
	return (
		<div
			style={{
				position: "relative",
				background:
					"linear-gradient(135deg, #0b4f9c 0%, #073871 60%, #0a5f4c 100%)",
				borderRadius: 16,
				padding: "20px 24px",
				color: "#fff",
				overflow: "hidden",
			}}
		>
			<span
				aria-hidden
				style={{
					position: "absolute",
					right: -40,
					top: -40,
					width: 280,
					height: 280,
					borderRadius: "50%",
					background:
						"radial-gradient(circle, rgba(241,197,49,0.18) 0%, transparent 60%)",
				}}
			/>
			<span
				aria-hidden
				style={{
					position: "absolute",
					right: 0,
					bottom: 0,
					width: 280,
					height: 4,
					background:
						"linear-gradient(to right, var(--gabon-green-v2) 0%, var(--gabon-green-v2) 33%, var(--gabon-yellow-v2) 33%, var(--gabon-yellow-v2) 66%, #5b9bdf 66%, #5b9bdf 100%)",
				}}
			/>
			<div
				className="row items-center justify-between"
				style={{ gap: 16, position: "relative", flexWrap: "wrap" }}
			>
				<div style={{ flex: 1, minWidth: 0 }}>
					<div
						style={{
							fontSize: 10.5,
							textTransform: "uppercase",
							letterSpacing: "0.14em",
							color: "rgba(255,255,255,0.7)",
							fontWeight: 600,
						}}
					>
						{dateLabel} · {timeLabel}
					</div>
					<h1
						style={{
							fontSize: 24,
							fontWeight: 600,
							letterSpacing: "-0.02em",
							marginTop: 6,
							color: "#fff",
						}}
					>
						{t("superadmin.dashboard.hero.greeting")}
						<span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 400 }}>
							{" "}— {t("superadmin.dashboard.hero.subtitle")}
						</span>
					</h1>
					<div
						style={{
							fontSize: 13.5,
							color: "rgba(255,255,255,0.78)",
							marginTop: 6,
							lineHeight: 1.5,
							maxWidth: 720,
						}}
					>
						{t("superadmin.dashboard.hero.summary", {
							reps: fmt(totalReps),
							users: fmt(totalUsers),
						})}
						{urgentPending > 0
							? t("superadmin.dashboard.hero.urgentSuffix", {
									urgent: fmt(urgentPending),
								})
							: ""}
						.
					</div>
				</div>
				<div className="row" style={{ gap: 8, flexShrink: 0 }}>
					<button
						type="button"
						className="btn btn-sm"
						onClick={onDailyReport}
						style={{
							background: "rgba(255,255,255,0.14)",
							color: "#fff",
							border: "1px solid rgba(255,255,255,0.18)",
						}}
					>
						<Icon name="FileText" size={14} />
						{t("superadmin.dashboard.actions.dailyReport")}
					</button>
					<button
						type="button"
						className="btn btn-sm"
						onClick={onAiSummary}
						style={{
							background: "#fff",
							// Fond du hero verrouillé en bleu foncé (gradient hardcodé) →
							// on ne s'appuie pas sur `--gabon-blue-v2` qui devient bleu
							// clair en dark mode et passe blanc-sur-blanc.
							color: "#0b4f9c",
							border: "1px solid #fff",
							fontWeight: 600,
						}}
					>
						<Icon name="Sparkles" size={14} />
						{t("superadmin.dashboard.actions.aiSummary")}
					</button>
					<button
						type="button"
						onClick={onDismiss}
						className="btn btn-icon"
						aria-label={t("superadmin.dashboard.actions.dismiss")}
						style={{
							background: "rgba(255,255,255,0.08)",
							color: "rgba(255,255,255,0.7)",
							border: "1px solid rgba(255,255,255,0.12)",
						}}
					>
						<Icon name="X" size={14} />
					</button>
				</div>
			</div>
		</div>
	);
}

// ════════════════════════════════════════════════════════════════════════════
// KPI card
// ════════════════════════════════════════════════════════════════════════════

type Kpi = {
	id: string;
	label: string;
	value: number | string;
	delta?: string;
	hint: string;
	icon: string;
	tone: Tone;
};

function KpiCard({ k, loading }: { k: Kpi; loading?: boolean }) {
	const tv = TONE_VAR[k.tone];
	return (
		<div className="card card-pad" style={{ position: "relative", overflow: "hidden" }}>
			<span
				aria-hidden
				style={{
					position: "absolute",
					left: 0,
					top: 14,
					bottom: 14,
					width: 3,
					background: tv.color,
					borderRadius: "0 3px 3px 0",
				}}
			/>
			<div
				className="row items-start justify-between"
				style={{ paddingLeft: 6, gap: 8 }}
			>
				<div style={{ flex: 1, minWidth: 0 }}>
					<div className="uppercase" style={{ color: "var(--text-muted)" }}>
						{k.label}
					</div>
					<div
						style={{
							fontSize: 32,
							fontWeight: 600,
							letterSpacing: "-0.025em",
							marginTop: 4,
							fontFamily: "var(--mono-v2)",
							color: "var(--text)",
							lineHeight: 1,
						}}
					>
						{loading ? "—" : typeof k.value === "number" ? fmt(k.value) : k.value}
					</div>
					<div
						className="text-xs text-muted"
						style={{ marginTop: 8, lineHeight: 1.4 }}
					>
						{k.hint}
					</div>
				</div>
				<div
					style={{
						width: 38,
						height: 38,
						borderRadius: 10,
						background: tv.tint,
						color: tv.color,
						display: "grid",
						placeItems: "center",
						flexShrink: 0,
					}}
				>
					<Icon name={k.icon} size={18} />
				</div>
			</div>
			{k.delta && (
				<div style={{ marginTop: 10, paddingLeft: 6 }}>
					<span
						className="pill pill-mono"
						style={{
							background: tv.tint,
							color: tv.color,
							borderColor: "transparent",
						}}
					>
						{k.delta}
					</span>
				</div>
			)}
		</div>
	);
}

// ════════════════════════════════════════════════════════════════════════════
// Section header (compact, with optional actions)
// ════════════════════════════════════════════════════════════════════════════

function CardHead({
	icon,
	title,
	hint,
	tone = "info",
	actions,
}: {
	icon: string;
	title: string;
	hint?: string;
	tone?: Tone;
	actions?: React.ReactNode;
}) {
	const tv = TONE_VAR[tone];
	return (
		<div className="card-head">
			<div className="row items-center" style={{ gap: 10, minWidth: 0 }}>
				<span
					style={{
						width: 30,
						height: 30,
						borderRadius: 8,
						background: tv.tint,
						color: tv.color,
						display: "grid",
						placeItems: "center",
						flexShrink: 0,
					}}
				>
					<Icon name={icon} size={15} />
				</span>
				<div style={{ minWidth: 0 }}>
					<div
						style={{
							fontSize: 13.5,
							fontWeight: 600,
							color: "var(--text)",
							letterSpacing: "-0.005em",
							lineHeight: 1.2,
						}}
					>
						{title}
					</div>
					{hint && (
						<div className="text-xs text-muted" style={{ marginTop: 1 }}>
							{hint}
						</div>
					)}
				</div>
			</div>
			{actions && (
				<div className="row items-center" style={{ gap: 8 }}>
					{actions}
				</div>
			)}
		</div>
	);
}

// ════════════════════════════════════════════════════════════════════════════
// Charts (custom CSS/SVG, no recharts dep)
// ════════════════════════════════════════════════════════════════════════════

type BarDatum = { id: string; label: string; count: number; tone: Tone };

function HBarChart({
	data,
	labelWidth = 104,
	height = 18,
	ticks = 4,
}: {
	data: BarDatum[];
	labelWidth?: number;
	height?: number;
	ticks?: number;
}) {
	if (!data.length) {
		return <EmptyState />;
	}
	const max = Math.max(...data.map((d) => d.count));
	const niceMax = niceCeil(max);
	const step = niceMax / ticks;
	const tickValues = Array.from({ length: ticks + 1 }, (_, i) =>
		Math.round(step * i),
	);
	return (
		<div style={{ position: "relative" }}>
			<div className="stack" style={{ gap: 14 }}>
				{data.map((d) => {
					const pct = (d.count / niceMax) * 100;
					const tv = TONE_VAR[d.tone];
					return (
						<div
							key={d.id}
							className="row items-center"
							style={{ gap: 12 }}
						>
							<div
								style={{
									width: labelWidth,
									flexShrink: 0,
									fontSize: 12.5,
									color: "var(--text)",
									textAlign: "right",
									fontWeight: 500,
								}}
							>
								{d.label}
							</div>
							<div
								style={{
									flex: 1,
									position: "relative",
									height,
									background: "transparent",
								}}
							>
								{tickValues.slice(1, -1).map((tv, i) => (
									<span
										key={i}
										aria-hidden
										style={{
											position: "absolute",
											top: -2,
											bottom: -2,
											left: `${(tv / niceMax) * 100}%`,
											width: 1,
											background: "var(--border-soft)",
										}}
									/>
								))}
								<div
									style={{
										width: `${Math.max(1.5, pct)}%`,
										height: "100%",
										background: tv.color,
										borderRadius: 6,
										position: "relative",
										overflow: "hidden",
										boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.06)",
									}}
								>
									<span
										aria-hidden
										style={{
											position: "absolute",
											inset: 0,
											background:
												"linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 60%)",
										}}
									/>
								</div>
							</div>
							<div
								className="text-mono text-xs"
								style={{
									color: "var(--text)",
									fontWeight: 600,
									minWidth: 48,
									textAlign: "right",
								}}
							>
								{fmt(d.count)}
							</div>
						</div>
					);
				})}
			</div>
			<div
				style={{
					marginTop: 10,
					paddingLeft: labelWidth + 12,
					paddingRight: 60,
					position: "relative",
					height: 14,
				}}
			>
				{tickValues.map((tv, i) => (
					<div
						key={i}
						style={{
							position: "absolute",
							left: `${(tv / niceMax) * 100}%`,
							transform: "translateX(-50%)",
							fontFamily: "var(--mono-v2)",
							fontSize: 10.5,
							color: "var(--text-faint)",
						}}
					>
						{tv}
					</div>
				))}
			</div>
		</div>
	);
}

function VBarChart({
	data,
	height = 200,
}: {
	data: BarDatum[];
	height?: number;
}) {
	if (!data.length) {
		return <EmptyState />;
	}
	const max = Math.max(...data.map((d) => d.count));
	const niceMax = niceCeil(max);
	const ticks = 4;
	const tickValues = Array.from({ length: ticks + 1 }, (_, i) =>
		Math.round((niceMax / ticks) * i),
	).reverse();
	return (
		<div style={{ position: "relative", height: height + 50 }}>
			<div className="row" style={{ height, alignItems: "stretch", gap: 0 }}>
				<div style={{ width: 38, flexShrink: 0, position: "relative" }}>
					{tickValues.map((tv, i) => (
						<div
							key={i}
							style={{
								position: "absolute",
								right: 6,
								top: `${(i / ticks) * 100}%`,
								transform: "translateY(-50%)",
								fontFamily: "var(--mono-v2)",
								fontSize: 10.5,
								color: "var(--text-faint)",
							}}
						>
							{tv}
						</div>
					))}
				</div>
				<div style={{ flex: 1, position: "relative" }}>
					{tickValues.map((_tv, i) => (
						<span
							key={i}
							aria-hidden
							style={{
								position: "absolute",
								left: 0,
								right: 0,
								top: `${(i / ticks) * 100}%`,
								height: 1,
								background:
									i === ticks ? "var(--border)" : "var(--border-soft)",
							}}
						/>
					))}
					<div
						style={{
							position: "absolute",
							inset: 0,
							display: "flex",
							alignItems: "flex-end",
							justifyContent: "space-around",
							padding: "0 12px",
						}}
					>
						{data.map((d) => {
							const h = (d.count / niceMax) * 100;
							const tv = TONE_VAR[d.tone];
							return (
								<div
									key={d.id}
									style={{
										flex: 1,
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										gap: 6,
										height: "100%",
										justifyContent: "flex-end",
										maxWidth: 80,
									}}
								>
									<div
										className="text-mono"
										style={{
											fontSize: 11.5,
											fontWeight: 600,
											color: "var(--text)",
										}}
									>
										{fmt(d.count)}
									</div>
									<div
										style={{
											width: "64%",
											height: `${h}%`,
											minHeight: 4,
											background: tv.color,
											borderRadius: "8px 8px 0 0",
											boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.08)",
											position: "relative",
											overflow: "hidden",
										}}
									>
										<span
											aria-hidden
											style={{
												position: "absolute",
												inset: 0,
												background:
													"linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 50%)",
											}}
										/>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>
			<div className="row" style={{ marginTop: 8, gap: 0 }}>
				<div style={{ width: 38, flexShrink: 0 }} />
				<div
					style={{
						flex: 1,
						display: "flex",
						justifyContent: "space-around",
						padding: "0 12px",
					}}
				>
					{data.map((d) => {
						const tv = TONE_VAR[d.tone];
						return (
							<div
								key={d.id}
								style={{
									flex: 1,
									maxWidth: 80,
									textAlign: "center",
									fontSize: 12,
									color: "var(--text)",
									fontWeight: 500,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									gap: 6,
								}}
							>
								<span
									style={{
										width: 8,
										height: 8,
										borderRadius: "50%",
										background: tv.color,
									}}
								/>
								<span>{d.label}</span>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

function HalfGauge({
	pct,
	label,
	sub,
	tone = "success",
}: {
	pct: number;
	label: string;
	sub?: string;
	tone?: Tone;
}) {
	const p = Math.min(100, Math.max(0, pct));
	const r = 88;
	const c = Math.PI * r;
	const fill = (p / 100) * c;
	const color = TONE_VAR[tone].color;
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				gap: 10,
			}}
		>
			<div style={{ position: "relative", width: 220, height: 130 }}>
				<svg width="220" height="130" viewBox="0 0 220 130">
					<defs>
						<linearGradient id="halfgauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
							<stop offset="0%" stopColor={color} stopOpacity="0.55" />
							<stop offset="100%" stopColor={color} stopOpacity="1" />
						</linearGradient>
					</defs>
					<path
						d="M 22 118 A 88 88 0 0 1 198 118"
						fill="none"
						stroke="var(--surface-3)"
						strokeWidth="16"
						strokeLinecap="round"
					/>
					<path
						d="M 22 118 A 88 88 0 0 1 198 118"
						fill="none"
						stroke="url(#halfgauge-grad)"
						strokeWidth="16"
						strokeLinecap="round"
						strokeDasharray={`${fill} ${c}`}
					/>
				</svg>
				<div
					style={{
						position: "absolute",
						left: 0,
						right: 0,
						bottom: 8,
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
					}}
				>
					<div
						style={{
							fontSize: 42,
							fontWeight: 600,
							letterSpacing: "-0.03em",
							fontFamily: "var(--mono-v2)",
							color: "var(--text)",
							lineHeight: 1,
						}}
					>
						{p}
						<span
							style={{
								fontSize: 22,
								color: "var(--text-muted)",
								marginLeft: 2,
							}}
						>
							%
						</span>
					</div>
				</div>
			</div>
			<div style={{ textAlign: "center" }}>
				<div
					style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}
				>
					{label}
				</div>
				{sub && (
					<div className="text-xs text-muted" style={{ marginTop: 2 }}>
						{sub}
					</div>
				)}
			</div>
		</div>
	);
}

type DonutSegment = { id: string; label: string; count: number; tone: Tone };

function Donut({
	data,
	centerValue,
	centerLabel,
	size = 200,
	thickness = 28,
}: {
	data: DonutSegment[];
	centerValue: string;
	centerLabel: string;
	size?: number;
	thickness?: number;
}) {
	const { t } = useTranslation();
	const total = data.reduce((s, d) => s + d.count, 0);
	if (total === 0) {
		return <EmptyState />;
	}
	const r = (size - thickness) / 2;
	const cx = size / 2;
	const cy = size / 2;
	const circumference = 2 * Math.PI * r;
	let offset = 0;
	return (
		<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
			<title>{t("superadmin.dashboard.requestsByStatus")}</title>
			<circle
				cx={cx}
				cy={cy}
				r={r}
				fill="none"
				stroke="var(--surface-3)"
				strokeWidth={thickness}
			/>
			{data.map((d) => {
				const frac = d.count / total;
				const dash = frac * circumference;
				const seg = (
					<circle
						key={d.id}
						cx={cx}
						cy={cy}
						r={r}
						fill="none"
						stroke={TONE_VAR[d.tone].color}
						strokeWidth={thickness}
						strokeDasharray={`${dash} ${circumference - dash}`}
						strokeDashoffset={-offset}
						transform={`rotate(-90 ${cx} ${cy})`}
					/>
				);
				offset += dash;
				return seg;
			})}
			<text
				x={cx}
				y={cy - 4}
				textAnchor="middle"
				style={{
					fontSize: 22,
					fontWeight: 700,
					fontFamily: "var(--mono-v2)",
					fill: "var(--text)",
				}}
			>
				{centerValue}
			</text>
			<text
				x={cx}
				y={cy + 16}
				textAnchor="middle"
				style={{
					fontSize: 11,
					fill: "var(--text-muted)",
					letterSpacing: "0.04em",
				}}
			>
				{centerLabel}
			</text>
		</svg>
	);
}

// ════════════════════════════════════════════════════════════════════════════
// Page
// ════════════════════════════════════════════════════════════════════════════

export default function SuperadminDashboard() {
	const { t } = useTranslation();
	const [period, setPeriod] = useState<PeriodId>("total");
	const [showWelcome, setShowWelcome] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [dailyReportOpen, setDailyReportOpen] = useState(false);
	const [aiSummaryOpen, setAiSummaryOpen] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const dismissed = window.localStorage.getItem("dashboard.welcomeDismissed");
		if (dismissed === "1") setShowWelcome(false);
	}, []);

	const dismissWelcome = () => {
		setShowWelcome(false);
		if (typeof window !== "undefined") {
			window.localStorage.setItem("dashboard.welcomeDismissed", "1");
		}
	};

	// Convex est réactif → les données s'actualisent automatiquement. Le
	// bouton "Rafraîchir" force un rechargement complet pour les cas où une
	// preview-build est figée (CDN/HMR) ou pour donner un signal visuel.
	const refresh = () => {
		setRefreshing(true);
		if (typeof window !== "undefined") {
			window.location.reload();
		}
	};

	const { data: stats, isPending } = useAuthenticatedConvexQuery(
		api.functions.admin.getStats,
		{},
	) as { data: any; isPending: boolean };

	const periodMs = useMemo(
		() => PERIODS.find((p) => p.id === period)?.ms ?? 0,
		[period],
	);

	// "Total" = pas de fenêtre temporelle → on skippe la query delta. Les
	// KPI affichent alors la valeur globale sans pill delta.
	const { data: deltas } = useAuthenticatedConvexQuery(
		api.functions.admin.getStatsDelta,
		period === "total" ? "skip" : { sinceMs: periodMs },
	) as {
		data:
			| {
					usersDelta: number;
					orgsDelta: number;
					requestsDelta: number;
					registrationsDelta: number;
					associationsDelta: number;
					companiesDelta: number;
			  }
			| undefined;
	};

	const { results: auditLogs } = useAuthenticatedPaginatedQuery(
		api.functions.admin.getAuditLogs,
		{},
		{ initialNumItems: 7 },
	);

	const periodLabel = t(
		`superadmin.dashboard.periods.${period}`,
		PERIODS.find((p) => p.id === period)?.label ?? "",
	).toLowerCase();
	const fmtDelta = (n: number) =>
		t("superadmin.dashboard.kpi.delta", { n: fmt(n), period: periodLabel });

	// ── KPI strip ─────────────────────────────────────────────────────────
	const sb = stats?.requests?.statusBreakdown ?? {};
	const totalReqs = stats?.requests?.total ?? 0;
	const urgentPending = stats?.performance?.urgentPending ?? (sb.pending ?? 0);
	const completionRate = stats?.performance?.completionRate ?? 0;
	const completedCount = sb.completed ?? 0;

	const kpis: Kpi[] = [
		{
			id: "ressortissants",
			label: t("superadmin.dashboard.stats.users"),
			value: stats?.users?.total ?? 0,
			delta:
				deltas && typeof deltas.usersDelta === "number"
					? fmtDelta(deltas.usersDelta)
					: undefined,
			hint: t("superadmin.dashboard.kpi.userHint"),
			icon: "Users",
			tone: "info",
		},
		{
			id: "representations",
			label: t("superadmin.dashboard.stats.organizations"),
			value: stats?.deployment?.totalOrgs ?? stats?.orgs?.total ?? 0,
			delta:
				typeof stats?.deployment?.activationRate === "number"
					? t("superadmin.dashboard.kpi.orgRate", {
							rate: stats.deployment.activationRate,
						})
					: undefined,
			hint: t("superadmin.dashboard.kpi.orgHint"),
			icon: "Building2",
			tone: "warning",
		},
		{
			id: "demandes",
			label: t("superadmin.dashboard.stats.requests"),
			value: totalReqs,
			delta:
				deltas && typeof deltas.requestsDelta === "number"
					? fmtDelta(deltas.requestsDelta)
					: undefined,
			hint: t("superadmin.dashboard.kpi.requestsHint", {
				count: urgentPending,
			}),
			icon: "FileText",
			tone: "cyan",
		},
		{
			id: "inscriptions",
			label: t("superadmin.dashboard.stats.registrations"),
			value: stats?.registrations?.total ?? 0,
			delta:
				deltas && typeof deltas.registrationsDelta === "number"
					? fmtDelta(deltas.registrationsDelta)
					: undefined,
			hint: t("superadmin.dashboard.kpi.registrationsHint"),
			icon: "IdCard",
			tone: "green",
		},
		{
			id: "associations",
			label: t("superadmin.dashboard.kpi.associations"),
			value: stats?.associations?.total ?? 0,
			delta:
				deltas && typeof deltas.associationsDelta === "number"
					? fmtDelta(deltas.associationsDelta)
					: t("superadmin.dashboard.kpi.companiesFallback", {
							count: stats?.companies?.total ?? 0,
						}),
			hint: t("superadmin.dashboard.kpi.associationsHint"),
			icon: "Handshake",
			tone: "purple",
		},
	];

	// ── Pipeline (HBar) ──────────────────────────────────────────────────
	const pipelineSrc = stats?.performance?.pipeline ?? {
		draft: sb.draft ?? 0,
		submitted: sb.submitted ?? 0,
		pending:
			(sb.pending ?? 0) +
			(sb.pending_completion ?? 0) +
			(sb.edited ?? 0),
		underReview: (sb.under_review ?? 0) + (sb.processing ?? 0),
		inProduction: sb.in_production ?? 0,
		validated: sb.validated ?? 0,
		readyForPickup:
			(sb.ready_for_pickup ?? 0) + (sb.appointment_scheduled ?? 0),
		completed: completedCount,
		rejected: (sb.rejected ?? 0) + (sb.cancelled ?? 0),
	};
	// Status labels viennent de `fields.requestStatus.options.*` (déjà
	// internationalisé). Mapping local → status convex pour la pipeline.
	const statusLabel = (key: string) =>
		t(`fields.requestStatus.options.${key}`, key);
	const pipelineBars: BarDatum[] = [
		{ id: "draft", label: statusLabel("draft"), count: pipelineSrc.draft ?? 0, tone: "muted" },
		{ id: "submitted", label: statusLabel("submitted"), count: pipelineSrc.submitted ?? 0, tone: "info" },
		{ id: "pending", label: statusLabel("pending"), count: pipelineSrc.pending ?? 0, tone: "warning" },
		{ id: "review", label: statusLabel("under_review"), count: pipelineSrc.underReview ?? 0, tone: "cyan" },
		{ id: "production", label: statusLabel("in_production"), count: pipelineSrc.inProduction ?? 0, tone: "purple" },
		{ id: "validated", label: statusLabel("validated"), count: pipelineSrc.validated ?? 0, tone: "green" },
		{ id: "ready", label: statusLabel("ready_for_pickup"), count: pipelineSrc.readyForPickup ?? 0, tone: "teal" },
		{ id: "completed", label: statusLabel("completed"), count: pipelineSrc.completed ?? 0, tone: "success" },
		{ id: "rejected", label: statusLabel("rejected"), count: pipelineSrc.rejected ?? 0, tone: "danger" },
	].filter((b) => b.count > 0);

	// ── Donut (statuts) ──────────────────────────────────────────────────
	const donutData: DonutSegment[] = Object.entries(sb)
		.filter(([, n]) => (n as number) > 0)
		.map(([status, n]) => ({
			id: status,
			label: statusLabel(status),
			count: n as number,
			tone: STATUS_TONE[status] ?? "muted",
		}))
		.sort((a, b) => b.count - a.count);

	// ── Inscriptions (VBar) ──────────────────────────────────────────────
	const regBy = stats?.engagement?.registrationsByStatus ?? {};
	const regBars: BarDatum[] = Object.entries(regBy)
		.map(([status, n]) => ({
			id: status,
			label: t(`superadmin.dashboard.registrationStatus.${status}`, status),
			count: n as number,
			tone: REG_STATUS_TONE[status] ?? "muted",
		}))
		.filter((b) => b.count > 0);

	// ── Top représentations ──────────────────────────────────────────────
	const byCountry: Record<string, { count: number; names: string[] }> =
		stats?.deployment?.byCountry ?? {};
	const topReps = Object.entries(byCountry)
		.map(([code, info]) => ({ code, ...info }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 6);
	const maxRep = Math.max(1, ...topReps.map((r) => r.count));

	// ── Alertes ──────────────────────────────────────────────────────────
	const criticalAlerts: any[] = stats?.security?.criticalAlerts ?? [];
	const securityEvents: any[] = stats?.security?.securityEvents ?? [];
	const alertItems = [
		...criticalAlerts.slice(0, 3).map((a) => ({
			id: a._id,
			tone: "danger" as Tone,
			icon: "AlertTriangle",
			title: a.message ?? a.type,
			text: `${a.source} · priorité ${a.priorite}`,
			when: timeAgo(a.timestamp),
		})),
		...securityEvents.slice(0, 2).map((e) => ({
			id: e._id,
			tone: "warning" as Tone,
			icon: "ShieldAlert",
			title: e.action,
			text:
				e.entiteType ??
				t("superadmin.dashboard.healthCards.eventsLabel"),
			when: timeAgo(e.timestamp),
		})),
	];

	// ── Système ──────────────────────────────────────────────────────────
	const systemHealth = stats?.security?.systemHealth ?? "HEALTHY";
	const queueDepth = stats?.security?.queueDepth ?? 0;
	const healthCards: { id: string; label: string; value: string; sub: string; tone: Tone }[] = [
		{
			id: "global",
			label: t("superadmin.dashboard.healthCards.globalLabel"),
			value:
				systemHealth === "HEALTHY"
					? t("superadmin.dashboard.healthCards.healthy")
					: systemHealth === "DEGRADED"
						? t("superadmin.dashboard.healthCards.degraded")
						: t("superadmin.dashboard.healthCards.critical"),
			sub: t("superadmin.dashboard.healthCards.globalSub"),
			tone:
				systemHealth === "HEALTHY"
					? "success"
					: systemHealth === "DEGRADED"
						? "warning"
						: "danger",
		},
		{
			id: "queue",
			label: t("superadmin.dashboard.healthCards.queueLabel"),
			value: fmt(queueDepth),
			sub: t("superadmin.dashboard.healthCards.queueSub"),
			tone:
				queueDepth > 100
					? "danger"
					: queueDepth > 50
						? "warning"
						: "success",
		},
		{
			id: "alerts",
			label: t("superadmin.dashboard.healthCards.alertsLabel"),
			value: fmt(stats?.security?.totalAlerts24h ?? 0),
			sub: t("superadmin.dashboard.healthCards.alertsSub"),
			tone:
				(stats?.security?.totalAlerts24h ?? 0) > 0 ? "danger" : "success",
		},
		{
			id: "events",
			label: t("superadmin.dashboard.healthCards.eventsLabel"),
			value: fmt(stats?.security?.totalSecurityEvents24h ?? 0),
			sub: t("superadmin.dashboard.healthCards.eventsSub"),
			tone:
				(stats?.security?.totalSecurityEvents24h ?? 0) > 0
					? "warning"
					: "success",
		},
	];

	// ── Quick actions ────────────────────────────────────────────────────
	const quickActions: { id: string; icon: string; label: string; href: string; tone: Tone }[] = [
		{ id: "new-rep", icon: "Building2", label: t("superadmin.dashboard.quickAccessLinks.newRep"), href: "/reps/new", tone: "info" },
		{ id: "new-user", icon: "UserPlus", label: t("superadmin.dashboard.quickAccessLinks.newAgent"), href: "/users", tone: "purple" },
		{ id: "new-svc", icon: "FileText", label: t("superadmin.dashboard.quickAccessLinks.newService"), href: "/services/new", tone: "teal" },
		{ id: "audit", icon: "BookOpen", label: t("superadmin.dashboard.quickAccessLinks.auditLogs"), href: "/audit-logs", tone: "warning" },
		{ id: "monitor", icon: "Activity", label: t("superadmin.dashboard.quickAccessLinks.monitoring"), href: "/monitoring", tone: "success" },
		{ id: "support", icon: "Bell", label: t("superadmin.dashboard.quickAccessLinks.support"), href: "/support", tone: "danger" },
	];

	return (
		<div className="v2-page">
			<div className="v2-page-body">
				<div className="stack stack-4">
					{showWelcome && (
						<WelcomeBanner
							totalReps={stats?.deployment?.totalOrgs ?? stats?.orgs?.total ?? 0}
							totalUsers={stats?.users?.total ?? 0}
							urgentPending={urgentPending}
							onDismiss={dismissWelcome}
							onDailyReport={() => setDailyReportOpen(true)}
							onAiSummary={() => setAiSummaryOpen(true)}
						/>
					)}

					<DailyReportSheet
						open={dailyReportOpen}
						onOpenChange={setDailyReportOpen}
						stats={stats}
					/>
					<AiSummarySheet
						open={aiSummaryOpen}
						onOpenChange={setAiSummaryOpen}
					/>

					{/* ── Top-bar slot : pill santé + refresh à côté de la cloche ── */}
					<ToolbarSlot>
						<SystemHealthPill health={systemHealth} />
						<button
							type="button"
							className="btn btn-sm btn-soft"
							onClick={refresh}
							disabled={refreshing}
						>
							<Icon
								name={refreshing ? "Loader" : "RefreshCcw"}
								size={14}
							/>
							{refreshing
								? "…"
								: t("superadmin.dashboard.actions.refresh")}
						</button>
					</ToolbarSlot>

					{/* ── Page header (maquette : eyebrow + tricolore / h2 / filtre) ── */}
					<div
						style={{
							display: "flex",
							alignItems: "flex-end",
							justifyContent: "space-between",
							gap: 16,
							flexWrap: "wrap",
						}}
					>
						<div>
							<div className="row items-center" style={{ gap: 10 }}>
								<span
									className="uppercase"
									style={{ color: "var(--text-muted)" }}
								>
									{t("superadmin.dashboard.welcome")}
								</span>
								<GabonStripe />
							</div>
							<h2
								style={{
									fontSize: 18,
									fontWeight: 600,
									letterSpacing: "-0.01em",
									marginTop: 4,
									color: "var(--text)",
								}}
							>
								{t("superadmin.dashboard.kpiSection")}
							</h2>
						</div>
						<PeriodFilter value={period} onChange={setPeriod} />
					</div>

					{/* ── KPI strip (5 cards) ────────────────────────────── */}
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
							gap: 12,
						}}
						className="kpi-grid"
					>
						{kpis.map((k) => (
							<KpiCard key={k.id} k={k} loading={isPending} />
						))}
					</div>

					{/* ── Row 1: Pipeline + Gauge ─────────────────────────── */}
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1.7fr 1fr",
							gap: 14,
						}}
						className="dash-row-1"
					>
						<div className="card">
							<CardHead
								icon="Activity"
								title={t("superadmin.dashboard.sections.pipeline")}
								hint={t("superadmin.dashboard.sections.pipelineHint")}
								tone="info"
								actions={
									<span className="pill pill-mono">
										{pipelineBars.length}
									</span>
								}
							/>
							<div style={{ padding: "18px 22px" }}>
								<HBarChart data={pipelineBars} />
							</div>
						</div>

						<div className="card">
							<CardHead
								icon="Gauge"
								title={t("superadmin.dashboard.sections.performance")}
								hint={t("superadmin.dashboard.sections.performanceHint")}
								tone="success"
							/>
							<div
								style={{
									padding: "24px 18px 22px",
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									gap: 16,
								}}
							>
								<HalfGauge
									pct={completionRate}
									label={t("superadmin.dashboard.sections.resolution")}
									sub={t("superadmin.dashboard.sections.resolutionSub", {
										done: fmt(completedCount),
										total: fmt(totalReqs),
									})}
									tone="success"
								/>
								<div className="divider w-full" />
								<div className="row w-full" style={{ gap: 10 }}>
									<div
										style={{
											flex: 1,
											textAlign: "center",
											padding: "10px 8px",
											background: "var(--surface-2)",
											borderRadius: 10,
										}}
									>
										<div
											className="text-mono"
											style={{
												fontSize: 18,
												fontWeight: 600,
												color: "var(--success-v2)",
											}}
										>
											{fmt(completedCount)}
										</div>
										<div
											className="text-xs text-muted"
											style={{ marginTop: 2 }}
										>
											{t("fields.requestStatus.options.completed")}
										</div>
									</div>
									<div
										style={{
											flex: 1,
											textAlign: "center",
											padding: "10px 8px",
											background: "var(--surface-2)",
											borderRadius: 10,
										}}
									>
										<div
											className="text-mono"
											style={{
												fontSize: 18,
												fontWeight: 600,
												color: "var(--warning-v2)",
											}}
										>
											{fmt(urgentPending)}
										</div>
										<div
											className="text-xs text-muted"
											style={{ marginTop: 2 }}
										>
											{t("fields.requestStatus.options.pending")}
										</div>
									</div>
									<div
										style={{
											flex: 1,
											textAlign: "center",
											padding: "10px 8px",
											background: "var(--surface-2)",
											borderRadius: 10,
										}}
									>
										<div
											className="text-mono"
											style={{
												fontSize: 18,
												fontWeight: 600,
												color: "var(--danger-v2)",
											}}
										>
											{fmt((sb.rejected ?? 0) + (sb.cancelled ?? 0))}
										</div>
										<div
											className="text-xs text-muted"
											style={{ marginTop: 2 }}
										>
											{t("fields.requestStatus.options.rejected")}
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* ── Row 2: Donut + Inscriptions ─────────────────────── */}
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1.2fr 1fr",
							gap: 14,
						}}
						className="dash-row-2"
					>
						<div className="card">
							<CardHead
								icon="FileText"
								title={t("superadmin.dashboard.requestsByStatus")}
								hint={t(
									"superadmin.dashboard.sections.requestsByStatusHint",
									{ count: fmt(totalReqs) },
								)}
								tone="cyan"
							/>
							<div
								style={{
									padding: "18px 22px",
									display: "grid",
									gridTemplateColumns: "200px 1fr",
									gap: 28,
									alignItems: "center",
								}}
								className="donut-row"
							>
								<Donut
									data={donutData}
									centerValue={fmt(totalReqs)}
									centerLabel={t("superadmin.dashboard.stats.requests")}
								/>
								<div
									style={{
										display: "grid",
										gridTemplateColumns: "1fr 1fr",
										gap: 10,
									}}
								>
									{donutData.slice(0, 8).map((d) => (
										<div
											key={d.id}
											className="row items-center"
											style={{ gap: 10, padding: "4px 0" }}
										>
											<ToneDot tone={d.tone} />
											<span
												style={{
													flex: 1,
													fontSize: 12.5,
													color: "var(--text)",
												}}
												className="truncate"
											>
												{d.label}
											</span>
											<span
												className="text-mono text-xs"
												style={{ color: "var(--text)", fontWeight: 600 }}
											>
												{fmt(d.count)}
											</span>
										</div>
									))}
								</div>
							</div>
						</div>

						<div className="card">
							<CardHead
								icon="IdCard"
								title={t("superadmin.dashboard.sections.registrations")}
								hint={t(
									"superadmin.dashboard.sections.registrationsHint",
									{ count: fmt(stats?.registrations?.total ?? 0) },
								)}
								tone="green"
								actions={
									<Link href="/profiles" className="btn btn-text btn-sm">
										{t("superadmin.dashboard.actions.registry")}
										<Icon name="ChevronRight" size={12} />
									</Link>
								}
							/>
							<div style={{ padding: "18px 22px 22px" }}>
								<VBarChart data={regBars} height={180} />
							</div>
						</div>
					</div>

					{/* ── Row 3: Alerts + Top reps + Quick actions ───────── */}
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1.2fr 1.1fr 1fr",
							gap: 14,
						}}
						className="dash-row-3"
					>
						<div className="card">
							<CardHead
								icon="AlertTriangle"
								title={t("superadmin.dashboard.sections.alerts")}
								hint={t("superadmin.dashboard.sections.alertsHint", {
									count: alertItems.length,
								})}
								tone="warning"
								actions={
									<Link href="/monitoring" className="btn btn-text btn-sm">
										{t("superadmin.dashboard.actions.seeAll")}
										<Icon name="ChevronRight" size={12} />
									</Link>
								}
							/>
							<div
								style={{
									padding: "14px 16px",
									display: "flex",
									flexDirection: "column",
									gap: 8,
								}}
							>
								{alertItems.length === 0 ? (
									<div
										className="ta-center text-sm text-muted"
										style={{ padding: "32px 0" }}
									>
										<Icon name="ShieldCheck" size={24} />
										<div style={{ marginTop: 6 }}>
											{t("superadmin.dashboard.sections.noAlerts")}
										</div>
									</div>
								) : (
									alertItems.map((a) => {
										const tv = TONE_VAR[a.tone];
										return (
											<div
												key={a.id}
												className="row items-start"
												style={{
													gap: 12,
													padding: "12px 14px",
													borderRadius: 12,
													background: "var(--surface-2)",
													border: "1px solid var(--border-soft)",
												}}
											>
												<div
													style={{
														width: 32,
														height: 32,
														borderRadius: 9,
														background: tv.tint,
														color: tv.color,
														display: "grid",
														placeItems: "center",
														flexShrink: 0,
													}}
												>
													<Icon name={a.icon} size={16} />
												</div>
												<div style={{ flex: 1, minWidth: 0 }}>
													<div
														className="row items-center justify-between"
														style={{ gap: 8 }}
													>
														<div
															style={{
																fontSize: 13,
																fontWeight: 600,
																color: "var(--text)",
															}}
															className="truncate"
														>
															{a.title}
														</div>
														<span
															className="text-xs text-muted text-mono"
															style={{ flexShrink: 0 }}
														>
															{a.when}
														</span>
													</div>
													<div
														className="text-xs text-muted"
														style={{ marginTop: 3, lineHeight: 1.5 }}
													>
														{a.text}
													</div>
												</div>
											</div>
										);
									})
								)}
							</div>
						</div>

						<div className="card">
							<CardHead
								icon="Building2"
								title={t("superadmin.dashboard.sections.topReps")}
								hint={t("superadmin.dashboard.sections.topRepsHint", {
									active: fmt(stats?.deployment?.activeOrgs ?? 0),
									total: fmt(stats?.deployment?.totalOrgs ?? 0),
								})}
								tone="info"
								actions={
									<Link href="/reps" className="btn btn-text btn-sm">
										{t("superadmin.dashboard.actions.seeAll")}
										<Icon name="ChevronRight" size={12} />
									</Link>
								}
							/>
							<div style={{ padding: "6px 18px 14px" }}>
								{topReps.length === 0 ? (
									<div
										className="ta-center text-sm text-muted"
										style={{ padding: "32px 0" }}
									>
										{t("superadmin.dashboard.sections.noReps")}
									</div>
								) : (
									topReps.map((r) => {
										const pct = (r.count / maxRep) * 100;
										return (
											<div
												key={r.code}
												className="row items-center"
												style={{
													gap: 12,
													padding: "10px 0",
													borderTop: "1px solid var(--border-soft)",
												}}
											>
												<FlagIcon
													countryCode={r.code}
													size={24}
													className="w-6 !h-auto rounded-sm shrink-0"
												/>
												<div style={{ flex: 1, minWidth: 0 }}>
													<div
														className="row items-center"
														style={{ gap: 8 }}
													>
														<span
															style={{
																fontSize: 13,
																fontWeight: 600,
																color: "var(--text)",
															}}
														>
															{t(
																`superadmin.countryCodes.${r.code}`,
																r.code,
															)}
														</span>
														<span className="text-xs text-muted">
															{t("superadmin.dashboard.posts", {
																count: r.count,
																defaultValue: "{{count}} poste",
																defaultValue_other: "{{count}} postes",
															})}
														</span>
													</div>
													<div
														style={{
															height: 5,
															background: "var(--surface-3)",
															borderRadius: 100,
															marginTop: 5,
															overflow: "hidden",
														}}
													>
														<div
															style={{
																width: `${pct}%`,
																height: "100%",
																background: "var(--gabon-blue-v2)",
																borderRadius: 100,
															}}
														/>
													</div>
												</div>
											</div>
										);
									})
								)}
							</div>
						</div>

						<div className="card">
							<CardHead
								icon="Zap"
								title={t("superadmin.dashboard.sections.quickAccess")}
								hint={t("superadmin.dashboard.sections.quickAccessHint")}
								tone="purple"
							/>
							<div
								style={{
									padding: 14,
									display: "flex",
									flexDirection: "column",
									gap: 8,
								}}
							>
								{quickActions.map((a) => {
									const tv = TONE_VAR[a.tone];
									return (
										<Link
											key={a.id}
											href={a.href}
											style={{
												background: "var(--surface)",
												border: "1px solid var(--border)",
												borderRadius: 12,
												padding: "12px 14px",
												display: "flex",
												alignItems: "center",
												gap: 10,
												minHeight: 56,
												textDecoration: "none",
												color: "var(--text)",
											}}
										>
											<span
												style={{
													width: 32,
													height: 32,
													borderRadius: 9,
													background: tv.tint,
													color: tv.color,
													display: "grid",
													placeItems: "center",
													flexShrink: 0,
												}}
											>
												<Icon name={a.icon} size={16} />
											</span>
											<span
												style={{
													flex: 1,
													fontSize: 12.5,
													fontWeight: 500,
												}}
											>
												{a.label}
											</span>
											<Icon name="ChevronRight" size={14} />
										</Link>
									);
								})}
							</div>
						</div>
					</div>

					{/* ── Row 4: Activity + System health ─────────────────── */}
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1.5fr 1fr",
							gap: 14,
						}}
						className="dash-row-4"
					>
						<div className="card">
							<CardHead
								icon="Activity"
								title={t("superadmin.dashboard.recentActivity")}
								hint={t("superadmin.dashboard.sections.activityHint")}
								tone="teal"
								actions={
									<>
										<span
											className="row items-center"
											style={{
												gap: 6,
												fontSize: 11.5,
												color: "var(--text-muted)",
											}}
										>
											<span
												style={{
													width: 6,
													height: 6,
													borderRadius: "50%",
													background: "var(--success-v2)",
												}}
											/>
											{t("superadmin.dashboard.live")}
										</span>
										<Link href="/audit-logs" className="btn btn-text btn-sm">
											{t("superadmin.dashboard.actions.journal")}
											<Icon name="ChevronRight" size={12} />
										</Link>
									</>
								}
							/>
							<div style={{ padding: "4px 18px 18px" }}>
								{!auditLogs?.length ? (
									<div
										className="ta-center text-sm text-muted"
										style={{ padding: "32px 0" }}
									>
										{t("superadmin.dashboard.sections.noActivity")}
									</div>
								) : (
									auditLogs.map((log: any) => {
										const tone: Tone = log.action?.includes("delete")
											? "danger"
											: log.action?.includes("create")
												? "success"
												: log.action?.includes("update")
													? "info"
													: "muted";
										const tv = TONE_VAR[tone];
										const systemLabel = t(
											"superadmin.dashboard.activity.system",
											"Système",
										);
										const userName = log.user
											? `${log.user.firstName ?? ""} ${log.user.lastName ?? ""}`.trim() ||
												systemLabel
											: systemLabel;
										const initials =
											userName
												.split(" ")
												.map((w: string) => w[0])
												.slice(0, 2)
												.join("")
												.toUpperCase() || "SY";
										return (
											<div
												key={log._id}
												className="row items-start"
												style={{
													gap: 12,
													padding: "10px 0",
													borderTop: "1px solid var(--border-soft)",
												}}
											>
												<div
													className="avatar sm"
													// Tint + couleur tonale → contraste OK en clair ET en sombre
													// (les tokens v2 inversent en dark mode, donc `var(--xxx-v2)`
													// devient clair et serait illisible sur fond blanc).
													style={{
														background: tv.tint,
														color: tv.color,
													}}
												>
													{initials}
												</div>
												<div style={{ flex: 1, minWidth: 0 }}>
													<div
														style={{ fontSize: 12.5, lineHeight: 1.4 }}
													>
														<span
															style={{
																fontWeight: 600,
																color: "var(--text)",
															}}
														>
															{userName}
														</span>
														<span style={{ color: "var(--text-muted)" }}>
															{" "}—{" "}
															{t(
																`superadmin.auditLogs.actions.${log.action}`,
																log.action,
															)}
														</span>
													</div>
													<div
														className="text-xs text-muted"
														style={{ marginTop: 2 }}
													>
														{timeAgo(log.timestamp ?? log._creationTime)}
													</div>
												</div>
											</div>
										);
									})
								)}
							</div>
						</div>

						<div className="card">
							<CardHead
								icon="HeartPulse"
								title={t("superadmin.dashboard.sections.health")}
								hint={t("superadmin.dashboard.sections.healthHint")}
								tone="success"
								actions={
									<Link href="/monitoring" className="btn btn-text btn-sm">
										{t("superadmin.dashboard.actions.monitoring")}
										<Icon name="ArrowUpRight" size={12} />
									</Link>
								}
							/>
							<div
								style={{
									padding: 14,
									display: "flex",
									flexDirection: "column",
									gap: 8,
								}}
							>
								{healthCards.map((h) => {
									const tv = TONE_VAR[h.tone];
									return (
										<div
											key={h.id}
											style={{
												padding: "12px 14px",
												borderRadius: 10,
												background: "var(--surface)",
												border: "1px solid var(--border)",
											}}
										>
											<div
												className="row items-center justify-between"
												style={{ gap: 8 }}
											>
												<div
													className="row items-center"
													style={{ gap: 8 }}
												>
													<ToneDot tone={h.tone} />
													<span
														style={{
															fontSize: 12.5,
															fontWeight: 500,
															color: "var(--text)",
														}}
													>
														{h.label}
													</span>
												</div>
												<span
													className="text-mono"
													style={{
														fontSize: 12.5,
														fontWeight: 600,
														color: tv.color,
													}}
												>
													{h.value}
												</span>
											</div>
											<div
												className="text-xs text-muted"
												style={{ marginTop: 4 }}
											>
												{h.sub}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Responsive overrides — collapse multi-column rows on narrow viewports. */}
			<style jsx>{`
				@media (max-width: 1180px) {
					.kpi-grid {
						grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
					}
					.dash-row-1,
					.dash-row-2,
					.dash-row-4 {
						grid-template-columns: 1fr !important;
					}
					.dash-row-3 {
						grid-template-columns: 1fr 1fr !important;
					}
				}
				@media (max-width: 720px) {
					.kpi-grid,
					.dash-row-3 {
						grid-template-columns: 1fr !important;
					}
					.donut-row {
						grid-template-columns: 1fr !important;
					}
				}
			`}</style>
		</div>
	);
}
