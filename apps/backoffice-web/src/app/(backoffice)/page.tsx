"use client";

import { api } from "@convex/_generated/api";
import Link from "next/link";
import { Component, type ErrorInfo, type ReactNode } from "react";
import {
	Activity,
	ArrowRight,
	BarChart3,
	Building2,
	CalendarCheck,
	CheckCircle2,
	ClipboardList,
	FileText,
	Gauge,
	Globe,
	Handshake,
	Landmark,
	MapPin,
	Plus,
	Settings,
	ShieldAlert,
	TrendingUp,
	User,
	UserCheck,
	Users,
	XCircle,
	AlertTriangle,
	Shield,
	ShieldCheck,
	Lock,
	Eye,
	Server,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	Pie,
	PieChart,
	RadialBar,
	RadialBarChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { PageHeader } from "@/components/design-system/page-header";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	useAuthenticatedConvexQuery,
	useAuthenticatedPaginatedQuery,
} from "@/integrations/convex/hooks";
import { getLocalizedValue } from "@/lib/i18n-utils";
import { NeocortexMonitoringWidget } from "@/components/dashboard/superadmin/NeocortexMonitoringWidget";

// ─── Colors ─────────────────────────────────────────────────────────────────
const CHART_COLORS = [
	"#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
	"#f43f5e", "#ef4444", "#f97316", "#eab308", "#22c55e",
	"#14b8a6", "#06b6d4", "#3b82f6", "#2563eb",
];

const STATUS_COLORS: Record<string, { fill: string; bg: string; bgLight: string; text: string }> = {
	draft:                 { fill: "#94a3b8", bg: "bg-slate-400",   bgLight: "bg-slate-400/10",   text: "text-slate-400" },
	pending:               { fill: "#f59e0b", bg: "bg-amber-500",   bgLight: "bg-amber-500/10",   text: "text-amber-500" },
	pending_completion:    { fill: "#fb923c", bg: "bg-orange-400",  bgLight: "bg-orange-400/10",  text: "text-orange-400" },
	edited:                { fill: "#a78bfa", bg: "bg-violet-400",  bgLight: "bg-violet-400/10",  text: "text-violet-400" },
	submitted:             { fill: "#3b82f6", bg: "bg-blue-500",    bgLight: "bg-blue-500/10",    text: "text-blue-500" },
	under_review:          { fill: "#6366f1", bg: "bg-indigo-500",  bgLight: "bg-indigo-500/10",  text: "text-indigo-500" },
	in_production:         { fill: "#8b5cf6", bg: "bg-violet-500",  bgLight: "bg-violet-500/10",  text: "text-violet-500" },
	validated:             { fill: "#10b981", bg: "bg-emerald-500", bgLight: "bg-emerald-500/10", text: "text-emerald-500" },
	rejected:              { fill: "#ef4444", bg: "bg-red-500",     bgLight: "bg-red-500/10",     text: "text-red-500" },
	appointment_scheduled: { fill: "#06b6d4", bg: "bg-cyan-500",    bgLight: "bg-cyan-500/10",    text: "text-cyan-500" },
	ready_for_pickup:      { fill: "#14b8a6", bg: "bg-teal-500",    bgLight: "bg-teal-500/10",    text: "text-teal-500" },
	completed:             { fill: "#22c55e", bg: "bg-green-500",   bgLight: "bg-green-500/10",   text: "text-green-500" },
	cancelled:             { fill: "#64748b", bg: "bg-slate-500",   bgLight: "bg-slate-500/10",   text: "text-slate-500" },
	processing:            { fill: "#6366f1", bg: "bg-indigo-500",  bgLight: "bg-indigo-500/10",  text: "text-indigo-500" },
};
const DEFAULT_STATUS_COLOR = STATUS_COLORS.draft;
const STATUS_LABELS: Record<string, { fr: string; en: string }> = {
	draft: { fr: "Brouillon", en: "Draft" },
	pending: { fr: "En attente", en: "Pending" },
	pending_completion: { fr: "Compléments", en: "Completion" },
	edited: { fr: "Modifié", en: "Edited" },
	submitted: { fr: "Soumis", en: "Submitted" },
	under_review: { fr: "Examen", en: "Review" },
	in_production: { fr: "Production", en: "Production" },
	validated: { fr: "Validé", en: "Validated" },
	rejected: { fr: "Rejeté", en: "Rejected" },
	appointment_scheduled: { fr: "RDV", en: "Appointment" },
	ready_for_pickup: { fr: "Prêt", en: "Ready" },
	completed: { fr: "Terminé", en: "Completed" },
	cancelled: { fr: "Annulé", en: "Cancelled" },
	processing: { fr: "Traitement", en: "Processing" },
};

const ORG_TYPE_LABELS: Record<string, string> = {
	embassy: "Ambassade",
	high_representation: "Haute Représentation",
	general_consulate: "Consulat Général",
	high_commission: "Haut-Commissariat",
	permanent_mission: "Mission Permanente",
	third_party: "Partenaire Tiers",
	consulate: "Consulat",
	honorary_consulate: "Consulat Honoraire",
};

const COUNTRY_NAMES: Record<string, string> = {
	ES: "Espagne", FR: "France", US: "États-Unis", GB: "Royaume-Uni",
	DE: "Allemagne", IT: "Italie", BE: "Belgique", MA: "Maroc",
	SN: "Sénégal", CM: "Cameroun", CG: "Congo", CD: "RD Congo",
	CI: "Côte d'Ivoire", GA: "Gabon", CN: "Chine", JP: "Japon",
	BR: "Brésil", CA: "Canada", SA: "Arabie Saoudite", AE: "Émirats",
	ZA: "Afrique du Sud", GQ: "Guinée Équat.", NG: "Nigeria",
	EG: "Égypte", RU: "Russie", IN: "Inde", TR: "Turquie",
	TG: "Togo", BJ: "Bénin", GH: "Ghana", KE: "Kenya",
};

// ─── Shared tooltip style ──────────────────────────────────────────────────
const tooltipStyle = {
	contentStyle: {
		background: "hsl(var(--popover))",
		border: "1px solid hsl(var(--border))",
		borderRadius: "8px",
		boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
		color: "hsl(var(--popover-foreground))",
		fontSize: "12px",
	},
};

// ─── KPI Card ──────────────────────────────────────────────────────────────
function KpiCard({
	icon: Icon, label, value, sub, trend, accentBg, accentBgLight, accentText, loading,
}: {
	icon: React.ElementType; label: string; value: number | string; sub: string;
	trend?: { value: string; positive?: boolean };
	accentBg: string; accentBgLight: string; accentText: string; loading?: boolean;
}) {
	return (
		<FlatCard className="relative overflow-hidden">
			<div className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${accentBg}`} />
			<div className="p-3 lg:p-4">
				<div className="flex flex-row items-center justify-between pb-2">
					<span className="text-sm font-medium text-muted-foreground">{label}</span>
					<div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentBgLight}`}>
						<Icon className={`h-4 w-4 ${accentText}`} />
					</div>
				</div>
				{loading ? <Skeleton className="h-8 w-20" /> : (
					<div className="flex items-end gap-2">
						<div className="text-3xl font-bold tracking-tight">{value}</div>
						{trend && (
							<span className={`text-xs font-medium pb-1 ${trend.positive ? "text-emerald-500" : "text-muted-foreground"}`}>
								{trend.value}
							</span>
						)}
					</div>
				)}
				<p className="mt-1 text-xs text-muted-foreground">{sub}</p>
			</div>
		</FlatCard>
	);
}

// ─── Status Badge ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
	const { i18n } = useTranslation();
	const lang = i18n.language === "fr" ? "fr" : "en";
	const colors = STATUS_COLORS[status] ?? DEFAULT_STATUS_COLOR;
	const label = STATUS_LABELS[status]?.[lang] ?? status;
	return (
		<span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bgLight} ${colors.text}`}>
			<span className={`h-1.5 w-1.5 rounded-full ${colors.bg}`} />
			{label}
		</span>
	);
}

function timeAgo(ts: number): string {
	const diff = Date.now() - ts;
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "à l'instant";
	if (mins < 60) return `il y a ${mins}m`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `il y a ${hours}h`;
	return `il y a ${Math.floor(hours / 24)}j`;
}

// ═══════════════════════════════════════════════════════════════════════════
// CHART COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

/** Donut chart — Request status distribution */
function RequestStatusDonut({ breakdown }: { breakdown: Record<string, number> }) {
	const { i18n } = useTranslation();
	const lang = i18n.language === "fr" ? "fr" : "en";
	const data = Object.entries(breakdown)
		.map(([status, count]) => ({
			name: STATUS_LABELS[status]?.[lang] ?? status,
			value: count,
			fill: (STATUS_COLORS[status] ?? DEFAULT_STATUS_COLOR).fill,
		}))
		.sort((a, b) => b.value - a.value);
	if (data.length === 0) return <p className="text-sm text-muted-foreground py-8 text-center">Aucune donnée</p>;
	return (
		<div className="flex flex-col gap-4 lg:flex-row lg:items-center">
			<div className="h-56 flex-1 min-w-0">
				<ResponsiveContainer width="100%" height="100%">
					<PieChart>
						<Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" strokeWidth={0}>
							{data.map((e) => <Cell key={e.name} fill={e.fill} />)}
						</Pie>
						<Tooltip {...tooltipStyle} />
					</PieChart>
				</ResponsiveContainer>
			</div>
			<div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs lg:grid-cols-1">
				{data.slice(0, 8).map((item) => (
					<div key={item.name} className="flex items-center gap-2">
						{/* Dynamic color from data — inline style required */}
						{/* eslint-disable-next-line react/forbid-dom-props */}
						<span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: item.fill }} />
						<span className="text-muted-foreground truncate">{item.name}</span>
						<span className="ml-auto font-semibold tabular-nums">{item.value}</span>
					</div>
				))}
			</div>
		</div>
	);
}

/** Horizontal bar chart — Pipeline stages */
function PipelineBarChart({ pipeline, total }: {
	pipeline: Record<string, number>; total: number;
}) {
	const stages = [
		{ key: "draft", label: "Brouillon", count: pipeline.draft ?? 0, color: "#94a3b8" },
		{ key: "submitted", label: "Soumis", count: pipeline.submitted ?? 0, color: "#3b82f6" },
		{ key: "pending", label: "En attente", count: pipeline.pending ?? 0, color: "#f59e0b" },
		{ key: "underReview", label: "En examen", count: pipeline.underReview ?? 0, color: "#6366f1" },
		{ key: "inProduction", label: "Production", count: pipeline.inProduction ?? 0, color: "#8b5cf6" },
		{ key: "validated", label: "Validé", count: pipeline.validated ?? 0, color: "#10b981" },
		{ key: "readyForPickup", label: "Prêt", count: pipeline.readyForPickup ?? 0, color: "#14b8a6" },
		{ key: "completed", label: "Terminé", count: pipeline.completed ?? 0, color: "#22c55e" },
		{ key: "rejected", label: "Rejeté", count: pipeline.rejected ?? 0, color: "#ef4444" },
	].filter((s) => s.count > 0);
	if (stages.length === 0 || total === 0) return null;
	return (
		<div className="h-72">
			<ResponsiveContainer width="100%" height="100%">
				<BarChart data={stages} layout="vertical" margin={{ left: 70, right: 20, top: 5, bottom: 5 }}>
					<CartesianGrid strokeDasharray="3 3" opacity={0.1} horizontal={false} />
					<XAxis type="number" tick={{ fontSize: 11 }} />
					<YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={65} />
					<Tooltip {...tooltipStyle} />
					<Bar dataKey="count" name="Demandes" radius={[0, 4, 4, 0]} barSize={20}>
						{stages.map((s) => <Cell key={s.key} fill={s.color} />)}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}

/** Donut chart — Org types deployment */
function OrgTypeDonut({ byType }: { byType: Record<string, number> }) {
	const data = Object.entries(byType)
		.map(([type, count], i) => ({
			name: ORG_TYPE_LABELS[type] ?? type,
			value: count,
			fill: CHART_COLORS[i % CHART_COLORS.length],
		}))
		.sort((a, b) => b.value - a.value);
	if (data.length === 0) return <p className="text-sm text-muted-foreground py-8 text-center">Aucune organisation</p>;
	return (
		<div className="flex flex-col items-center gap-4">
			<div className="h-52 w-full">
				<ResponsiveContainer width="100%" height="100%">
					<PieChart>
						<Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value" strokeWidth={0}>
							{data.map((e) => <Cell key={e.name} fill={e.fill} />)}
						</Pie>
						<Tooltip {...tooltipStyle} />
					</PieChart>
				</ResponsiveContainer>
			</div>
			<div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs">
				{data.map((item) => (
					<div key={item.name} className="flex items-center gap-1.5">
						{/* Dynamic color from data — inline style required */}
						{/* eslint-disable-next-line react/forbid-dom-props */}
						<span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: item.fill }} />
						<span className="text-muted-foreground">{item.name}</span>
						<span className="font-semibold">{item.value}</span>
					</div>
				))}
			</div>
		</div>
	);
}

/** Bar chart — Representation by country */
function CountryBarChart({ byCountry }: { byCountry: Record<string, { count: number; names: string[] }> }) {
	const data = Object.entries(byCountry)
		.map(([code, info]) => ({
			country: COUNTRY_NAMES[code] ?? code,
			count: info.count,
		}))
		.sort((a, b) => b.count - a.count)
		.slice(0, 10);
	if (data.length === 0) return null;
	return (
		<div className="h-64">
			<ResponsiveContainer width="100%" height="100%">
				<BarChart data={data} margin={{ left: 5, right: 5, top: 5, bottom: 40 }}>
					<CartesianGrid strokeDasharray="3 3" opacity={0.1} />
					<XAxis dataKey="country" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
					<YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
					<Tooltip {...tooltipStyle} />
					<Bar dataKey="count" name="Représentations" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={28}>
						{data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}

/** Radial bar — Performance gauge */
function PerformanceGauge({ completionRate, urgentPending }: { completionRate: number; urgentPending: number }) {
	const data = [
		{ name: "Résolution", value: completionRate, fill: "#22c55e" },
	];
	return (
		<div className="flex flex-col items-center gap-2">
			<div className="h-44 w-44 relative">
				<ResponsiveContainer width="100%" height="100%">
					<RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" data={data} startAngle={180} endAngle={0} barSize={12}>
						<RadialBar background={{ fill: "hsl(var(--muted))" }} dataKey="value" cornerRadius={6} />
					</RadialBarChart>
				</ResponsiveContainer>
				<div className="absolute inset-0 flex flex-col items-center justify-center">
					<span className="text-3xl font-bold">{completionRate}%</span>
					<span className="text-xs text-muted-foreground">Résolution</span>
				</div>
			</div>
			{urgentPending > 0 && (
				<div className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1">
					<AlertTriangle className="h-3.5 w-3.5 text-red-500" />
					<span className="text-xs font-semibold text-red-500">{urgentPending} urgentes en attente</span>
				</div>
			)}
		</div>
	);
}

/** Registrations by status — bar chart */
function RegistrationStatusChart({ byStatus }: { byStatus: Record<string, number> }) {
	const statusColors: Record<string, string> = {
		requested: "#f59e0b", active: "#22c55e", expired: "#ef4444", unknown: "#94a3b8",
	};
	const statusLabels: Record<string, string> = {
		requested: "En attente", active: "Active", expired: "Expirée", unknown: "Autre",
	};
	const data = Object.entries(byStatus)
		.map(([status, count]) => ({
			name: statusLabels[status] ?? status,
			count,
			fill: statusColors[status] ?? "#94a3b8",
		}))
		.sort((a, b) => b.count - a.count);
	if (data.length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">Aucune inscription</p>;
	return (
		<div className="h-48">
			<ResponsiveContainer width="100%" height="100%">
				<BarChart data={data} margin={{ left: 5, right: 5, top: 5, bottom: 5 }}>
					<CartesianGrid strokeDasharray="3 3" opacity={0.1} />
					<XAxis dataKey="name" tick={{ fontSize: 11 }} />
					<YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
					<Tooltip {...tooltipStyle} />
					<Bar dataKey="count" name="Inscriptions" radius={[4, 4, 0, 0]} barSize={36}>
						{data.map((d) => <Cell key={d.name} fill={d.fill} />)}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════════════════
// SECURITY PANEL
// ═══════════════════════════════════════════════════════════════════════════

function SecurityPanel({ data, loading }: { data?: any; loading: boolean }) {
	if (loading || !data) return <FlatCard><div className="p-3 lg:p-4 py-8"><Skeleton className="h-48 w-full" /></div></FlatCard>;
	const hasCritical = data.criticalAlerts?.length > 0;
	const borderClass = hasCritical ? "ring-1 ring-red-500/30" : data.systemHealth === "DEGRADED" ? "ring-1 ring-amber-500/30" : "";
	const healthColors: Record<string, { dot: string; bg: string; text: string; label: string }> = {
		HEALTHY: { dot: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", label: "Opérationnel" },
		DEGRADED: { dot: "bg-amber-500", bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", label: "Dégradé" },
		CRITICAL: { dot: "bg-red-500", bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", label: "Critique" },
	};
	const hc = healthColors[data.systemHealth] ?? healthColors.HEALTHY;
	return (
		<FlatCard className={borderClass}>
			<div className="p-3 lg:p-4">
				<SectionHeader
					icon={<ShieldAlert className="h-3.5 w-3.5" />}
					iconBgClass="bg-red-500/10"
					iconTextClass="text-red-500"
					title="Sécurité & Alertes"
					actions={
						<div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${hc.bg}`}>
							<span className={`h-2 w-2 rounded-full ${hc.dot} animate-pulse`} />
							<span className={`text-xs font-semibold ${hc.text}`}>{hc.label}</span>
						</div>
					}
				/>
				<p className="text-xs text-muted-foreground mb-4">Surveillance réseau, cyber-sécurité et intrusions</p>
				<div className="space-y-4">
				<div className="grid grid-cols-3 gap-3">
					<div className="flex flex-col items-center gap-1 rounded-lg bg-muted/50 p-3">
						<ShieldCheck className="h-4 w-4 text-muted-foreground" />
						<span className="text-lg font-bold tabular-nums">{data.queueDepth ?? 0}</span>
						<span className="text-[10px] text-muted-foreground text-center">Signaux en attente</span>
					</div>
					<div className="flex flex-col items-center gap-1 rounded-lg bg-muted/50 p-3">
						<AlertTriangle className={`h-4 w-4 ${(data.totalAlerts24h ?? 0) > 0 ? "text-red-500" : "text-muted-foreground"}`} />
						<span className={`text-lg font-bold tabular-nums ${(data.totalAlerts24h ?? 0) > 0 ? "text-red-500" : ""}`}>{data.totalAlerts24h ?? 0}</span>
						<span className="text-[10px] text-muted-foreground text-center">Alertes 24h</span>
					</div>
					<div className="flex flex-col items-center gap-1 rounded-lg bg-muted/50 p-3">
						<Eye className="h-4 w-4 text-muted-foreground" />
						<span className="text-lg font-bold tabular-nums">{data.totalSecurityEvents24h ?? 0}</span>
						<span className="text-[10px] text-muted-foreground text-center">Événements sécu.</span>
					</div>
				</div>
				{data.criticalAlerts?.length > 0 && (
					<div className="space-y-2">
						<h4 className="text-xs font-semibold text-red-500 uppercase tracking-wider flex items-center gap-1.5">
							<span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />Alertes Critiques
						</h4>
						<div className="space-y-1.5 max-h-[140px] overflow-y-auto">
							{data.criticalAlerts.map((alert: any) => (
								<div key={alert._id} className="flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/5 p-2.5">
									<AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
									<div className="min-w-0 flex-1">
										<p className="text-xs font-medium leading-tight truncate">{alert.message}</p>
										<p className="mt-0.5 text-[10px] text-muted-foreground">{alert.source} • {timeAgo(alert.timestamp)}</p>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
				{data.securityEvents?.length > 0 && (
					<div className="space-y-2">
						<h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Lock className="h-3 w-3" />Événements Sécurité (24h)</h4>
						<div className="space-y-1 max-h-[120px] overflow-y-auto">
							{data.securityEvents.map((evt: any) => (
								<div key={evt._id} className="flex items-center justify-between rounded-md bg-muted/30 px-2.5 py-1.5 text-xs">
									<div className="flex items-center gap-2 min-w-0"><Shield className="h-3 w-3 shrink-0 text-amber-500" /><span className="font-mono truncate">{evt.action}</span></div>
									<span className="text-muted-foreground whitespace-nowrap ml-2">{timeAgo(evt.timestamp)}</span>
								</div>
							))}
						</div>
					</div>
				)}
				{(data.criticalAlerts?.length ?? 0) === 0 && (data.securityEvents?.length ?? 0) === 0 && (
					<div className="flex flex-col items-center justify-center py-6 text-center">
						<Server className="mb-2 h-8 w-8 text-emerald-500/40" />
						<p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Aucune alerte détectée</p>
						<p className="text-xs text-muted-foreground mt-1">Tous les systèmes sont opérationnels</p>
					</div>
				)}
				</div>
			</div>
		</FlatCard>
	);
}

// ═══════════════════════════════════════════════════════════════════════════
// DEPLOYMENT STATS
// ═══════════════════════════════════════════════════════════════════════════

function DeploymentStats({ data, loading }: { data?: any; loading: boolean }) {
	if (loading || !data) return <FlatCard><div className="p-3 lg:p-4 py-8"><Skeleton className="h-48 w-full" /></div></FlatCard>;
	return (
		<FlatCard>
			<div className="p-3 lg:p-4">
				<SectionHeader
					icon={<Globe className="h-3.5 w-3.5" />}
					iconBgClass="bg-blue-500/10"
					iconTextClass="text-blue-500"
					title="Déploiement Réseau Diplomatique"
				/>
				<p className="text-xs text-muted-foreground mb-4">Couverture géographique et activation des représentations</p>
				<div className="space-y-5">
				{/* Summary */}
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					<div className="flex flex-col gap-1 rounded-lg bg-blue-500/5 border border-blue-500/10 p-3">
						<div className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-blue-500" /><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Actives</span></div>
						<span className="text-2xl font-bold tabular-nums">{data.activeOrgs}</span>
						<span className="text-[10px] text-muted-foreground">/ {data.totalOrgs} total</span>
					</div>
					<div className="flex flex-col gap-1 rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
						<div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-emerald-500" /><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Pays</span></div>
						<span className="text-2xl font-bold tabular-nums">{Object.keys(data.byCountry ?? {}).length}</span>
						<span className="text-[10px] text-muted-foreground">{data.countriesCovered} juridictions</span>
					</div>
					<div className="flex flex-col gap-1 rounded-lg bg-amber-500/5 border border-amber-500/10 p-3">
						<div className="flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5 text-amber-500" /><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Chefs Mission</span></div>
						<span className="text-2xl font-bold tabular-nums">{data.orgsWithHeadOfMission}</span>
						<span className="text-[10px] text-muted-foreground">/ {data.activeOrgs} postes</span>
					</div>
					<div className="flex flex-col gap-1 rounded-lg bg-violet-500/5 border border-violet-500/10 p-3">
						<div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-violet-500" /><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Effectifs</span></div>
						<span className="text-2xl font-bold tabular-nums">{data.totalStaff}</span>
						<span className="text-[10px] text-muted-foreground">agents déclarés</span>
					</div>
				</div>
				{/* Activation Rate */}
				<div className="space-y-2">
					<div className="flex items-center justify-between text-xs">
						<span className="text-muted-foreground">Taux d'activation du réseau</span>
						<span className="font-semibold">{data.activationRate}%</span>
					</div>
					<div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
						{/* Dynamic width requires inline style — no Tailwind alternative for computed percentages */}
						{/* eslint-disable-next-line react/forbid-dom-props */}
						<div className="h-full rounded-full bg-linear-to-r from-blue-500 to-emerald-500 transition-all duration-700" style={{ width: `${data.activationRate}%` }} />
					</div>
				</div>
			</div>
			</div>
		</FlatCard>
	);
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVITY LIST
// ═══════════════════════════════════════════════════════════════════════════

function RecentActivityList() {
	const { t } = useTranslation();
	const { results: logs, isLoading } = useAuthenticatedPaginatedQuery(api.functions.admin.getAuditLogs, {}, { initialNumItems: 6 });
	if (isLoading) return <div className="space-y-3">{[1,2,3,4].map((i) => <div key={i} className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full" /><div className="flex-1 space-y-1"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-24" /></div></div>)}</div>;
	if (!logs?.length) return <div className="flex flex-col items-center justify-center py-8 text-center"><Activity className="mb-2 h-8 w-8 text-muted-foreground/40" /><p className="text-sm text-muted-foreground">{t("superadmin.common.noData")}</p></div>;
	const getIcon = (a: string) => { if (a.includes("user")) return <User className="h-4 w-4" />; if (a.includes("org")) return <Building2 className="h-4 w-4" />; if (a.includes("service")) return <FileText className="h-4 w-4" />; if (a.includes("request")) return <ClipboardList className="h-4 w-4" />; return <Settings className="h-4 w-4" />; };
	const getCls = (a: string) => { if (a.includes("created") || a.includes("submitted")) return { bg: "bg-green-500/8", text: "text-green-500" }; if (a.includes("updated") || a.includes("changed")) return { bg: "bg-blue-500/8", text: "text-blue-500" }; if (a.includes("deleted") || a.includes("disabled")) return { bg: "bg-red-500/8", text: "text-red-500" }; return { bg: "bg-indigo-500/8", text: "text-indigo-500" }; };
	return (
		<div className="space-y-2">
			{logs.map((log) => { const cls = getCls(log.action); return (
				<div key={log._id} className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/40">
					<div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cls.bg}`}><span className={cls.text}>{getIcon(log.action)}</span></div>
					<div className="min-w-0 flex-1"><p className="text-sm font-medium leading-tight">{t(`superadmin.auditLogs.actions.${log.action}`, log.action)}</p><p className="mt-0.5 text-xs text-muted-foreground truncate">{log.user?.firstName} {log.user?.lastName} • {new Date(log.timestamp).toLocaleString()}</p></div>
				</div>
			); })}
		</div>
	);
}

// ─── Widget Error Boundary ──────────────────────────────────────────────────
class WidgetErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean }> {
	state = { hasError: false };
	static getDerivedStateFromError() { return { hasError: true }; }
	componentDidCatch(error: Error, info: ErrorInfo) { console.warn("[WidgetErrorBoundary]", error.message, info.componentStack); }
	render() { if (this.state.hasError) return this.props.fallback ?? null; return this.props.children; }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

export default function SuperadminDashboard() {
	const { t, i18n } = useTranslation();
	const { data: stats, isPending } = useAuthenticatedConvexQuery(api.functions.admin.getStats, {});

	const currentDate = new Date().toLocaleDateString(i18n.language === "fr" ? "fr-FR" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
	const systemHealth = stats?.security?.systemHealth ?? "HEALTHY";
	const healthColor = systemHealth === "CRITICAL" ? "text-red-500" : systemHealth === "DEGRADED" ? "text-amber-500" : "text-emerald-500";
	const healthDot = systemHealth === "CRITICAL" ? "bg-red-500" : systemHealth === "DEGRADED" ? "bg-amber-500" : "bg-emerald-500";

	// Derive pipeline data from statusBreakdown (works even if performance.pipeline is undefined)
	const sb = stats?.requests?.statusBreakdown ?? {};
	const derivedPipeline = stats?.performance?.pipeline ?? {
		draft: sb.draft ?? 0,
		submitted: sb.submitted ?? 0,
		pending: (sb.pending ?? 0) + (sb.pending_completion ?? 0) + (sb.edited ?? 0),
		underReview: (sb.under_review ?? 0) + (sb.processing ?? 0),
		inProduction: sb.in_production ?? 0,
		validated: sb.validated ?? 0,
		readyForPickup: (sb.ready_for_pickup ?? 0) + (sb.appointment_scheduled ?? 0),
		completed: sb.completed ?? 0,
		rejected: (sb.rejected ?? 0) + (sb.cancelled ?? 0),
	};

	// Derive completion rate client-side as fallback
	const totalReqs = stats?.requests?.total ?? 0;
	const completedCount = sb.completed ?? 0;
	const derivedCompletionRate = stats?.performance?.completionRate ?? (totalReqs > 0 ? Math.round((completedCount / totalReqs) * 100) : 0);
	const urgentCount = stats?.performance?.urgentPending ?? (sb.pending ?? 0);
	const terminalCount = stats?.performance?.totalTerminal ?? (completedCount + (sb.cancelled ?? 0) + (sb.rejected ?? 0));

	return (
		<div className="flex flex-1 flex-col gap-4 p-3 md:p-4">
			{/* ── Header ──────────────────────────────────────────── */}
			<PageHeader
				icon={<Landmark className="h-5 w-5" />}
				title={t("superadmin.dashboard.title", "Centre de Commandement")}
				subtitle={
					<span className="flex items-center gap-2">
						{t("superadmin.dashboard.welcome", "Vue stratégique globale")}
						<span className="inline-flex items-center gap-1.5 ml-2">
							<span className={`h-2 w-2 rounded-full ${healthDot} animate-pulse`} />
							<span className={`text-xs font-medium ${healthColor}`}>{systemHealth === "CRITICAL" ? "Alerte" : systemHealth === "DEGRADED" ? "Dégradé" : "Nominal"}</span>
						</span>
					</span>
				}
				actions={<p className="text-sm text-muted-foreground capitalize">{currentDate}</p>}
			/>

			{/* ── KPI Cards (6) ────────────────────────────────────── */}
			<div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 stagger-children">
				<KpiCard icon={Users} label="Ressortissants" value={stats?.users.total ?? 0} sub="Comptes actifs"
					trend={stats?.engagement ? { value: `+${stats.engagement.newUsers30d} / 30j`, positive: (stats.engagement.newUsers30d ?? 0) > 0 } : undefined}
					accentBg="bg-indigo-500" accentBgLight="bg-indigo-500/10" accentText="text-indigo-500" loading={isPending} />
				<KpiCard icon={Building2} label="Représentations" value={stats?.deployment?.totalOrgs ?? stats?.orgs?.total ?? 0} sub={`${stats?.deployment?.activationRate ?? 0}% activées`}
					accentBg="bg-amber-500" accentBgLight="bg-amber-500/10" accentText="text-amber-500" loading={isPending} />
				<KpiCard icon={FileText} label="Demandes" value={totalReqs} sub={`${urgentCount} en attente`}
					accentBg="bg-blue-500" accentBgLight="bg-blue-500/10" accentText="text-blue-500" loading={isPending} />
				<KpiCard icon={CalendarCheck} label="Inscriptions" value={stats?.registrations?.total ?? 0} sub="Registre consulaire"
					accentBg="bg-emerald-500" accentBgLight="bg-emerald-500/10" accentText="text-emerald-500" loading={isPending} />
				<KpiCard icon={Handshake} label="Associations" value={stats?.associations?.total ?? 0} sub={`${stats?.companies?.total ?? 0} entreprises`}
					accentBg="bg-violet-500" accentBgLight="bg-violet-500/10" accentText="text-violet-500" loading={isPending} />
				<KpiCard icon={Gauge} label="Taux de résolution" value={`${derivedCompletionRate}%`} sub={`${terminalCount} terminées`}
					accentBg="bg-teal-500" accentBgLight="bg-teal-500/10" accentText="text-teal-500" loading={isPending} />
			</div>

			{/* ── Row 2: Pipeline + Performance Gauge ──────────────── */}
			<div className="grid gap-4 lg:grid-cols-3 stagger-children">
				<FlatCard className="lg:col-span-2">
					<div className="p-3 lg:p-4">
						<SectionHeader icon={<BarChart3 className="h-3.5 w-3.5" />} iconBgClass="bg-blue-500/10" iconTextClass="text-blue-500" title="Pipeline de traitement" />
						<p className="text-xs text-muted-foreground mb-3">Répartition des demandes par étape du workflow</p>
						{isPending ? <Skeleton className="h-64 w-full" /> : <PipelineBarChart pipeline={derivedPipeline} total={totalReqs} />}
					</div>
				</FlatCard>
				<FlatCard>
					<div className="p-3 lg:p-4">
						<SectionHeader icon={<Gauge className="h-3.5 w-3.5" />} iconBgClass="bg-emerald-500/10" iconTextClass="text-emerald-500" title="Performance globale" />
						<p className="text-xs text-muted-foreground mb-3">Taux de résolution des demandes</p>
						<div className="flex items-center justify-center">
							{isPending ? <Skeleton className="h-44 w-44 rounded-full" /> : <PerformanceGauge completionRate={derivedCompletionRate} urgentPending={urgentCount} />}
						</div>
					</div>
				</FlatCard>
			</div>

			{/* ── Row 3: Donut statuts + Inscriptions bar ─────────── */}
			<div className="grid gap-4 lg:grid-cols-2 stagger-children">
				<FlatCard>
					<div className="p-3 lg:p-4">
						<SectionHeader icon={<TrendingUp className="h-3.5 w-3.5" />} title="Demandes par statut" />
						<p className="text-xs text-muted-foreground mb-3">Répartition circulaire des statuts de traitement</p>
						{isPending ? <Skeleton className="h-56 w-full" /> : <RequestStatusDonut breakdown={stats?.requests.statusBreakdown ?? {}} />}
					</div>
				</FlatCard>
				<FlatCard>
					<div className="p-3 lg:p-4">
						<SectionHeader icon={<CalendarCheck className="h-3.5 w-3.5" />} iconBgClass="bg-emerald-500/10" iconTextClass="text-emerald-500" title="Inscriptions consulaires par statut" />
						<p className="text-xs text-muted-foreground mb-3">État des inscriptions au registre consulaire</p>
						{isPending ? <Skeleton className="h-48 w-full" /> : (() => {
							const regData = stats?.engagement?.registrationsByStatus;
							const regTotal = stats?.registrations?.total ?? 0;
							const hasRegData = regData && Object.keys(regData).length > 0;
							const fallbackReg = hasRegData ? regData : regTotal > 0 ? { active: regTotal } : {};
							return <RegistrationStatusChart byStatus={fallbackReg} />;
						})()}
					</div>
				</FlatCard>
			</div>

			{/* ── Row 4: Déploiement stats + Org type donut ─────── */}
			<WidgetErrorBoundary>
				<DeploymentStats data={stats?.deployment ?? (stats?.orgs ? {
					activeOrgs: 0,
					totalOrgs: stats.orgs.total,
					activationRate: 0,
					byType: {},
					byCountry: {},
					countriesCovered: 0,
					orgsWithHeadOfMission: 0,
					totalStaff: 0,
				} : undefined)} loading={isPending} />
			</WidgetErrorBoundary>

			<div className="grid gap-4 lg:grid-cols-2 stagger-children">
				<FlatCard>
					<div className="p-3 lg:p-4">
						<SectionHeader icon={<Building2 className="h-3.5 w-3.5" />} iconBgClass="bg-indigo-500/10" iconTextClass="text-indigo-500" title="Types de représentation" />
						<p className="text-xs text-muted-foreground mb-3">Répartition par catégorie diplomatique</p>
						{isPending ? <Skeleton className="h-52 w-full" /> : <OrgTypeDonut byType={stats?.deployment?.byType ?? {}} />}
					</div>
				</FlatCard>
				<FlatCard>
					<div className="p-3 lg:p-4">
						<SectionHeader icon={<MapPin className="h-3.5 w-3.5" />} iconBgClass="bg-violet-500/10" iconTextClass="text-violet-500" title="Top pays d'implantation" />
						<p className="text-xs text-muted-foreground mb-3">Représentations par pays (top 10)</p>
						{isPending ? <Skeleton className="h-64 w-full" /> : <CountryBarChart byCountry={stats?.deployment?.byCountry ?? {}} />}
					</div>
				</FlatCard>
			</div>

			{/* ── Row 5: Security + Neocortex ──────────────────── */}
			<div className="grid gap-4 lg:grid-cols-2 stagger-children">
				<WidgetErrorBoundary>
					<SecurityPanel data={stats?.security} loading={isPending} />
				</WidgetErrorBoundary>
				<WidgetErrorBoundary>
					<NeocortexMonitoringWidget />
				</WidgetErrorBoundary>
			</div>

			{/* ── Row 6: Activity + Recent Requests ────────────── */}
			<div className="grid gap-4 lg:grid-cols-7 stagger-children">
				<FlatCard className="lg:col-span-3">
					<div className="p-3 lg:p-4">
						<SectionHeader
							icon={<Activity className="h-3.5 w-3.5" />}
							title={t("superadmin.dashboard.recentActivity")}
							actions={<Button variant="ghost" size="sm" asChild><Link href="/audit-logs"><ArrowRight className="h-4 w-4" /></Link></Button>}
						/>
						<p className="text-xs text-muted-foreground mb-3">{t("superadmin.dashboard.recentActivityDesc")}</p>
						<RecentActivityList />
					</div>
				</FlatCard>
				<FlatCard className="lg:col-span-4">
					<div className="p-3 lg:p-4">
						<SectionHeader
							icon={<ClipboardList className="h-3.5 w-3.5" />}
							title={t("superadmin.dashboard.recentRequests")}
							actions={<Button variant="outline" size="sm" asChild><Link href="/requests">{t("superadmin.dashboard.viewAll")}<ArrowRight className="ml-1 h-4 w-4" /></Link></Button>}
						/>
						<p className="text-xs text-muted-foreground mb-3">Les 10 dernières demandes sur la plateforme</p>
						{isPending ? <div className="space-y-3">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : !stats?.recentRequests?.length ? (
							<div className="flex flex-col items-center justify-center py-8 text-center"><ClipboardList className="mb-2 h-8 w-8 text-muted-foreground/40" /><p className="text-sm text-muted-foreground">Aucune demande</p></div>
						) : (
							<>
								<div className="hidden md:block overflow-x-auto">
									<Table>
										<TableHeader><TableRow>
											<TableHead>Référence</TableHead><TableHead>Utilisateur</TableHead><TableHead>Service</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Date</TableHead>
										</TableRow></TableHeader>
										<TableBody>
											{stats.recentRequests.map((r: any) => (
												<TableRow key={r._id}>
													<TableCell className="font-mono text-xs"><Link href={`/requests/${r._id}`} className="text-primary hover:underline">{r.reference}</Link></TableCell>
													<TableCell><div className="flex items-center gap-2"><Avatar className="h-6 w-6"><AvatarFallback className="text-[10px] bg-primary/10">{r.userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><span className="text-sm truncate max-w-[100px]">{r.userName}</span></div></TableCell>
													<TableCell className="text-sm text-muted-foreground truncate max-w-[120px]">{typeof r.serviceName === "string" ? r.serviceName : getLocalizedValue(r.serviceName, i18n.language)}</TableCell>
													<TableCell><StatusBadge status={r.status} /></TableCell>
													<TableCell className="text-right text-xs text-muted-foreground tabular-nums">{new Date(r.createdAt).toLocaleDateString()}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>

								{/* Mobile Cards View */}
								<div className="md:hidden space-y-3">
									{stats.recentRequests.map((r: any) => (
										<div key={r._id} className="p-3 bg-muted/30 rounded-lg border border-border/50 space-y-2">
											<div className="flex justify-between items-start">
												<Link href={`/requests/${r._id}`} className="text-primary hover:underline font-mono text-xs font-semibold">{r.reference}</Link>
												<StatusBadge status={r.status} />
											</div>
											<div className="flex items-center gap-2">
												<Avatar className="h-6 w-6"><AvatarFallback className="text-[10px] bg-primary/10">{r.userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
												<div className="text-sm font-medium">{r.userName}</div>
											</div>
											<div className="flex justify-between items-center mt-1">
												<div className="text-xs text-muted-foreground truncate max-w-[200px]">{typeof r.serviceName === "string" ? r.serviceName : getLocalizedValue(r.serviceName, i18n.language)}</div>
												<div className="text-[11px] text-muted-foreground tabular-nums">{new Date(r.createdAt).toLocaleDateString()}</div>
											</div>
										</div>
									))}
								</div>
							</>
						)}
					</div>
				</FlatCard>
			</div>

			{/* ── Quick Actions ────────────────────────────────────── */}
			<FlatCard>
				<div className="p-3 lg:p-4">
					<SectionHeader icon={<Settings className="h-3.5 w-3.5" />} title={t("superadmin.dashboard.quickActions")} />
					<p className="text-xs text-muted-foreground mb-3">{t("superadmin.dashboard.quickActionsDesc")}</p>
					<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
						<Button variant="outline" asChild className="justify-start h-10"><Link href="/users"><Users className="mr-2 h-4 w-4" />{t("superadmin.nav.users")}</Link></Button>
						<Button variant="outline" asChild className="justify-start h-10"><Link href="/reps/new"><Plus className="mr-2 h-4 w-4" />{t("superadmin.dashboard.addOrg")}</Link></Button>
						<Button variant="outline" asChild className="justify-start h-10"><Link href="/services"><FileText className="mr-2 h-4 w-4" />{t("superadmin.nav.services")}</Link></Button>
						<Button variant="outline" asChild className="justify-start h-10"><Link href="/audit-logs"><ClipboardList className="mr-2 h-4 w-4" />{t("superadmin.dashboard.viewLogs")}</Link></Button>
					</div>
				</div>
			</FlatCard>
		</div>
	);
}
