"use client";

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/dashboard-v2/icon";
import { TONE_VAR, type Tone } from "./mock-data";

export { Icon };

// ── TabSwitcher ────────────────────────────────────────────────────
export type TabDef = {
	id: string;
	label: string;
	icon: string;
	badge?: string | number;
};

export function TabSwitcher({
	tabs,
	value,
	onChange,
}: {
	tabs: TabDef[];
	value: string;
	onChange: (id: string) => void;
}) {
	return (
		<div className="v2-tabs disable-scrollbars">
			{tabs.map((t) => {
				const active = value === t.id;
				return (
					<button
						key={t.id}
						type="button"
						onClick={() => onChange(t.id)}
						className={`v2-tab ${active ? "is-active" : ""}`}
					>
						<Icon name={t.icon} size={16} />
						<span>{t.label}</span>
						{t.badge !== undefined && <span className="v2-tab-badge">{t.badge}</span>}
					</button>
				);
			})}
		</div>
	);
}

// ── KPI card ───────────────────────────────────────────────────────
export function KpiCard({
	label,
	value,
	hint,
	icon,
	tone = "info",
	delta,
}: {
	label: string;
	value: string | number;
	hint?: ReactNode;
	icon: string;
	tone?: Tone;
	delta?: string;
}) {
	const t = TONE_VAR[tone];
	return (
		<div className="kpi-card">
			<div className="row items-start justify-between">
				<div className="kpi-icon" style={{ background: t.tint, color: t.color }}>
					<Icon name={icon} size={16} />
				</div>
				{delta && (
					<span className="pill pill-mono" style={{ background: "var(--surface-3)" }}>
						<Icon name="TrendingUp" size={12} /> {delta}
					</span>
				)}
			</div>
			<div className="uppercase" style={{ marginTop: 14 }}>{label}</div>
			<div className="kpi-value">{value}</div>
			{hint && <div className="text-xs text-muted" style={{ marginTop: 4, lineHeight: 1.45 }}>{hint}</div>}
		</div>
	);
}

// ── HBar / StackedBar / LevelLegend ────────────────────────────────
export function HBar({
	label,
	value,
	max,
	tone = "info",
	rightLabel,
	sub,
}: {
	label: ReactNode;
	value: number;
	max: number;
	tone?: Tone;
	rightLabel?: ReactNode;
	sub?: ReactNode;
}) {
	const pct = Math.max(2, Math.round((value / max) * 100));
	const t = TONE_VAR[tone];
	return (
		<div>
			<div className="row items-center justify-between" style={{ marginBottom: 5, gap: 8 }}>
				<div className="truncate" style={{ fontSize: 12.5, color: "var(--text)", minWidth: 0 }}>
					{label}
				</div>
				<div className="text-mono text-xs" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
					{rightLabel ?? value}
				</div>
			</div>
			<div style={{ height: 8, background: "var(--surface-3)", borderRadius: 100, overflow: "hidden" }}>
				<div style={{ width: `${pct}%`, height: "100%", background: t.color, borderRadius: 100 }} />
			</div>
			{sub && <div className="text-xs text-muted" style={{ marginTop: 4 }}>{sub}</div>}
		</div>
	);
}

export function StackedBar({
	label,
	segments,
	max,
}: {
	label: ReactNode;
	segments: Array<{ label: string; value: number; tone: Tone }>;
	max: number;
}) {
	const total = segments.reduce((s, x) => s + x.value, 0);
	return (
		<div>
			<div className="row items-center justify-between" style={{ marginBottom: 5 }}>
				<div className="truncate" style={{ fontSize: 12.5 }}>{label}</div>
				<div className="text-mono text-xs text-muted">{total}</div>
			</div>
			<div
				style={{
					display: "flex", height: 10,
					background: "var(--surface-3)", borderRadius: 100,
					overflow: "hidden",
					width: `${Math.max(8, (total / max) * 100)}%`,
					minWidth: 24,
				}}
			>
				{segments.map((s, i) => {
					if (s.value === 0) return null;
					const w = (s.value / total) * 100;
					return (
						<div
							key={i}
							title={`${s.label}: ${s.value}`}
							style={{
								width: `${w}%`,
								background: TONE_VAR[s.tone].color,
								borderRight: i < segments.length - 1 ? "1px solid var(--surface)" : "none",
							}}
						/>
					);
				})}
			</div>
		</div>
	);
}

export function LevelLegend() {
	const { t } = useTranslation();
	const items: Array<{ key: string; tone: Tone }> = [
		{ key: "beginner", tone: "muted" },
		{ key: "intermediate", tone: "info" },
		{ key: "advanced", tone: "success" },
		{ key: "expert", tone: "purple" },
	];
	return (
		<div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
			{items.map((it) => (
				<div key={it.key} className="row items-center" style={{ gap: 6 }}>
					<span style={{ width: 9, height: 9, borderRadius: 2, background: TONE_VAR[it.tone].color }} />
					<span className="text-xs text-muted">{t(`superadmin.skills.levels.${it.key}`)}</span>
				</div>
			))}
		</div>
	);
}

// ── Donut (SVG hand-rolled) ────────────────────────────────────────
export function Donut({
	data,
	size = 180,
	thickness = 22,
	centerLabel,
	centerValue,
}: {
	data: Array<{ label?: string; count: number; tone: Tone }>;
	size?: number;
	thickness?: number;
	centerLabel?: string;
	centerValue?: string | number;
}) {
	const total = data.reduce((s, x) => s + x.count, 0);
	const r = (size - thickness) / 2;
	const c = 2 * Math.PI * r;
	let offset = 0;

	return (
		<div style={{ position: "relative", width: size, height: size }}>
			<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
				<circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={thickness} />
				{data.map((d, i) => {
					const frac = d.count / total;
					const dash = frac * c;
					const seg = (
						<circle
							key={i}
							cx={size / 2}
							cy={size / 2}
							r={r}
							fill="none"
							stroke={TONE_VAR[d.tone].color}
							strokeWidth={thickness}
							strokeDasharray={`${dash} ${c - dash}`}
							strokeDashoffset={-offset}
						/>
					);
					offset += dash;
					return seg;
				})}
			</svg>
			<div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
				<div>
					<div className="uppercase">{centerLabel || "Total"}</div>
					<div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", fontFamily: "var(--mono-v2)", marginTop: 2 }}>
						{centerValue !== undefined ? centerValue : total.toLocaleString("fr-FR")}
					</div>
				</div>
			</div>
		</div>
	);
}

// ── Semi-circle gauge ──────────────────────────────────────────────
export function Gauge({
	value,
	label,
	sub,
	tone = "info",
}: {
	value: number;
	label: string;
	sub?: ReactNode;
	tone?: Tone;
}) {
	const pct = Math.min(100, Math.max(0, value));
	const r = 56;
	const c = Math.PI * r;
	const fill = (pct / 100) * c;
	return (
		<div className="card card-pad">
			<div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
				<svg width="140" height="78" viewBox="0 0 140 78">
					<path d="M 12 70 A 58 58 0 0 1 128 70" fill="none" stroke="var(--surface-3)" strokeWidth="12" strokeLinecap="round" />
					<path
						d="M 12 70 A 58 58 0 0 1 128 70"
						fill="none"
						stroke={TONE_VAR[tone].color}
						strokeWidth="12"
						strokeLinecap="round"
						strokeDasharray={`${fill} ${c}`}
					/>
				</svg>
				<div style={{ marginTop: -22, fontSize: 28, fontWeight: 600, fontFamily: "var(--mono-v2)", letterSpacing: "-0.02em" }}>
					{pct}
					<span style={{ fontSize: 14, color: "var(--text-muted)" }}>%</span>
				</div>
			</div>
			<div className="ta-center" style={{ marginTop: 8 }}>
				<div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
				{sub && <div className="text-xs text-muted" style={{ marginTop: 2 }}>{sub}</div>}
			</div>
		</div>
	);
}

// ── Combobox (native select wrapped) ───────────────────────────────
export function Combobox({
	icon,
	value,
	options,
	onChange,
	placeholder,
}: {
	icon?: string;
	value: string;
	options: Array<string | { value: string; label: string }>;
	onChange?: (v: string) => void;
	placeholder?: string;
}) {
	return (
		<div className="v2-select" style={{ flex: "1 1 160px" }}>
			{icon && (
				<span className="v2-select-icon" style={{ display: "inline-flex", alignItems: "center" }}>
					<Icon name={icon} size={14} />
				</span>
			)}
			<select value={value} onChange={(e) => onChange?.(e.target.value)}>
				{placeholder && <option value="">{placeholder}</option>}
				{options.map((o) =>
					typeof o === "string" ? (
						<option key={o} value={o}>
							{o}
						</option>
					) : (
						<option key={o.value} value={o.value}>
							{o.label}
						</option>
					),
				)}
			</select>
			<span className="chev">
				<Icon name="ChevronDown" size={12} />
			</span>
		</div>
	);
}

// ── Search input ───────────────────────────────────────────────────
export function SearchInput({
	value,
	onChange,
	placeholder,
	width = 240,
}: {
	value: string;
	onChange: (v: string) => void;
	placeholder?: string;
	width?: number;
}) {
	return (
		<div className="v2-input" style={{ minWidth: width, flex: `1 1 ${width}px` }}>
			<span className="v2-input-icon">
				<Icon name="Search" size={14} />
			</span>
			<input
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
			/>
			{value && (
				<button
					type="button"
					onClick={() => onChange("")}
					style={{ background: "transparent", border: "none", padding: 8, color: "var(--text-muted)", cursor: "pointer" }}
				>
					<Icon name="X" size={12} />
				</button>
			)}
		</div>
	);
}

// ── SectionHeader ──────────────────────────────────────────────────
export function SectionHeader({
	icon,
	title,
	hint,
	action,
	tone = "muted",
}: {
	icon?: string;
	title: ReactNode;
	hint?: ReactNode;
	action?: ReactNode;
	tone?: Tone;
}) {
	const t = TONE_VAR[tone];
	return (
		<div className="row items-center justify-between" style={{ gap: 12 }}>
			<div className="row items-center" style={{ gap: 10 }}>
				{icon && (
					<span
						style={{
							background: t.tint, color: t.color, borderRadius: 8,
							width: 28, height: 28, display: "grid", placeItems: "center",
						}}
					>
						<Icon name={icon} size={14} />
					</span>
				)}
				<div>
					<div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.005em" }}>{title}</div>
					{hint && <div className="text-xs text-muted" style={{ marginTop: 2 }}>{hint}</div>}
				</div>
			</div>
			{action}
		</div>
	);
}

// ── FilterStrip ────────────────────────────────────────────────────
export function FilterStrip({
	children,
	activeCount,
	onReset,
}: {
	children: ReactNode;
	activeCount: number;
	onReset: () => void;
}) {
	return (
		<div className="card" style={{ padding: 12 }}>
			<div className="row items-center" style={{ gap: 8, flexWrap: "wrap" }}>
				{children}
				{activeCount > 0 && (
					<button
						type="button"
						className="btn btn-sm btn-text"
						onClick={onReset}
						style={{ marginLeft: "auto" }}
					>
						<Icon name="X" size={12} />
						Réinitialiser ({activeCount})
					</button>
				)}
			</div>
		</div>
	);
}

