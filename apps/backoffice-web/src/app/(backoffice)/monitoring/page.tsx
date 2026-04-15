"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import {
	Activity,
	BarChart3,
	Brain,
	CheckCircle2,
	Clock,
	History,
	Server,
	Shield,
	TrendingUp,
	Waves,
	Zap,
} from "lucide-react";
import { InfrastructureMonitoring } from "@/components/dashboard/superadmin/InfrastructureMonitoring";


// ─── Status indicator ────────────────────────────────────────────
function StatusIndicator({ status }: { status: string }) {
	const isHealthy = status === "HEALTHY";
	return (
		<div className="flex items-center gap-2">
			<div className={`relative flex h-3 w-3 ${isHealthy ? "" : "animate-pulse"}`}>
				<span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isHealthy ? "bg-green-400 animate-ping" : "bg-red-400 animate-ping"}`} />
				<span className={`relative inline-flex h-3 w-3 rounded-full ${isHealthy ? "bg-green-500" : "bg-red-500"}`} />
			</div>
			<span className={`text-sm font-semibold ${isHealthy ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
				{status}
			</span>
		</div>
	);
}

// ─── Metric Card ─────────────────────────────────────────────────
function MetricCard({
	icon: Icon,
	label,
	value,
	sub,
	accentColor,
	loading,
}: {
	icon: React.ElementType;
	label: string;
	value: string | number;
	sub: string;
	accentColor: string;
	loading?: boolean;
}) {
	const colorMap: Record<string, { bg: string; bgLight: string; text: string; border: string }> = {
		green: { bg: "bg-green-500", bgLight: "bg-green-500/10", text: "text-green-500", border: "border-green-500/30" },
		blue: { bg: "bg-blue-500", bgLight: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/30" },
		purple: { bg: "bg-purple-500", bgLight: "bg-purple-500/10", text: "text-purple-500", border: "border-purple-500/30" },
		amber: { bg: "bg-amber-500", bgLight: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/30" },
		red: { bg: "bg-red-500", bgLight: "bg-red-500/10", text: "text-red-500", border: "border-red-500/30" },
		indigo: { bg: "bg-indigo-500", bgLight: "bg-indigo-500/10", text: "text-indigo-500", border: "border-indigo-500/30" },
	};
	const colors = colorMap[accentColor] ?? colorMap.blue;

	return (
		<FlatCard className="relative overflow-hidden min-w-0">
			<div className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${colors.bg}`} />
			<div className="p-3 lg:p-4">
				<div className="flex flex-row items-center justify-between gap-2 pb-2">
					<span className="text-xs font-medium text-muted-foreground truncate min-w-0">
						{label}
					</span>
					<div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colors.bgLight}`}>
						<Icon className={`h-4 w-4 ${colors.text}`} />
					</div>
				</div>
				{loading ? (
					<Skeleton className="h-7 w-20" />
				) : (
					<div className="text-2xl font-bold tracking-tight truncate">{value}</div>
				)}
				<p className="mt-1 text-[11px] text-muted-foreground truncate">{sub}</p>
			</div>
		</FlatCard>
	);
}

// ─── Action Category dot ─────────────────────────────────────────
function CategoryDot({ category }: { category: string }) {
	const colors: Record<string, string> = {
		METIER: "bg-blue-500",
		UTILISATEUR: "bg-green-500",
		SECURITE: "bg-red-500",
		SYSTEME: "bg-purple-500",
	};
	return <span className={`h-2 w-2 rounded-full shrink-0 ${colors[category] ?? "bg-gray-400"}`} />;
}

// ─── Progress Bar (dynamic width requires inline style) ──────────
function ProgressBar({ pct, color = "bg-yellow-500/80" }: { pct: number; color?: string }) {
	return (
		<div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
			{/* eslint-disable-next-line react/forbid-dom-props */}
			<div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
		</div>
	);
}

// ─── NEOCORTEX Content (extracted from original page) ────────────
function NeocortexContent() {
	const data = useQuery(api.monitoring.getDashboardData);
	const loading = !data;

	return (
		<div className="space-y-6">
			{/* ── KPI Cards ───────────────────────── */}
			<div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
				<MetricCard
					icon={Shield}
					label="État global"
					value={data?.sante.status ?? "—"}
					sub={`File: ${data?.sante.queueCount ?? 0} signaux`}
					accentColor={data?.sante.status === "DEGRADED" ? "red" : "green"}
					loading={loading}
				/>
				<MetricCard
					icon={TrendingUp}
					label="Activité 24h"
					value={data?.totalSignaux24h ?? 0}
					sub={`${data?.totalActions24h ?? 0} actions tracées`}
					accentColor="blue"
					loading={loading}
				/>
				<MetricCard
					icon={History}
					label="Hippocampe"
					value={data?.actionsRecentes.length ?? 0}
					sub={`Dern.: ${data?.actionsRecentes[0]?.action ?? "Aucune"}`}
					accentColor="purple"
					loading={loading}
				/>
				<MetricCard
					icon={Waves}
					label="Plasticité"
					value={`${data?.poidsAdaptatifs.length ?? 0} poids`}
					sub="α = 0.15 (lissage)"
					accentColor="amber"
					loading={loading}
				/>
			</div>

			{/* ── Detail Row ──────────────────────── */}
			<div className="grid gap-4 lg:grid-cols-2">
				{/* Top Signal Types */}
				<FlatCard>
					<div className="p-3 lg:p-4">
						<div className="mb-3">
							<p className="flex items-center gap-2 text-base font-semibold">
								<Zap className="h-4 w-4 text-yellow-500" />
								Top signaux (24h)
							</p>
							<p className="text-sm text-muted-foreground">Types de signaux les plus émis ces dernières 24 heures</p>
						</div>
						{loading ? (
							<div className="space-y-3">
								{[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
							</div>
						) : data.topSignalTypes && data.topSignalTypes.length > 0 ? (
							<div className="space-y-2">
								{data.topSignalTypes.map((st: { type: string; count: number }) => {
									const maxCount = data.topSignalTypes[0]?.count ?? 1;
									const pct = Math.round((st.count / maxCount) * 100);
									return (
										<div key={st.type} className="space-y-1">
											<div className="flex items-center justify-between text-sm">
												<span className="font-mono text-xs truncate max-w-[250px]">
													{st.type}
												</span>
												<span className="font-semibold tabular-nums ml-2">{st.count}</span>
											</div>
											<ProgressBar pct={pct} color="bg-yellow-500/80" />
										</div>
									);
								})}
							</div>
						) : (
							<div className="flex flex-col items-center justify-center py-8 text-center">
								<Zap className="mb-2 h-8 w-8 text-muted-foreground/40" />
								<p className="text-sm text-muted-foreground">Aucun signal dans les dernières 24h</p>
							</div>
						)}
					</div>
				</FlatCard>

				{/* Actions par catégorie */}
				<FlatCard>
					<div className="p-3 lg:p-4">
						<div className="mb-3">
							<p className="flex items-center gap-2 text-base font-semibold">
								<BarChart3 className="h-4 w-4 text-blue-500" />
								Actions par catégorie (24h)
							</p>
							<p className="text-sm text-muted-foreground">Répartition des actions enregistrées par l'hippocampe</p>
						</div>
						{loading ? (
							<div className="space-y-3">
								{[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
							</div>
						) : data.actionCounts && Object.keys(data.actionCounts).length > 0 ? (
							<div className="space-y-3">
								{Object.entries(data.actionCounts as Record<string, number>)
									.sort(([, a], [, b]) => b - a)
									.map(([cat, count]) => {
										const total = data.totalActions24h || 1;
										const pct = Math.round((count / total) * 100);
										return (
											<div key={cat} className="space-y-1">
												<div className="flex items-center justify-between text-sm">
													<span className="flex items-center gap-2">
														<CategoryDot category={cat} />
														<span className="font-medium">{cat}</span>
														<Badge variant="outline" className="text-[9px] h-4 px-1">{pct}%</Badge>
													</span>
													<span className="font-semibold tabular-nums">{count}</span>
												</div>
												<ProgressBar pct={pct} color="bg-blue-500/60" />
											</div>
										);
									})}
							</div>
						) : (
							<div className="flex flex-col items-center justify-center py-8 text-center">
								<BarChart3 className="mb-2 h-8 w-8 text-muted-foreground/40" />
								<p className="text-sm text-muted-foreground">Aucune action tracée dans les dernières 24h</p>
							</div>
						)}
					</div>
				</FlatCard>
			</div>

			{/* ── Recent Actions Log ──────────────── */}
			<FlatCard>
				<div className="p-3 lg:p-4">
					<div className="mb-3">
						<p className="flex items-center gap-2 text-base font-semibold">
							<Activity className="h-4 w-4 text-purple-500" />
							Dernières actions (Hippocampe)
						</p>
						<p className="text-sm text-muted-foreground">Journal temps réel des actions tracées par le système nerveux</p>
					</div>
					{loading ? (
						<div className="space-y-2">
							{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
						</div>
					) : data.actionsRecentes.length > 0 ? (
						<div className="space-y-1 max-h-[400px] overflow-y-auto">
							{data.actionsRecentes.map((action: { _id: string; action: string; categorie: string; entiteType: string; timestamp: number }) => (
								<div
									key={action._id}
									className="flex items-center justify-between text-sm py-2 px-2 rounded-md transition-colors hover:bg-muted/40 border-b border-border/50 last:border-0"
								>
									<div className="flex items-center gap-3 min-w-0">
										<Badge
											variant="outline"
											className={`text-[10px] shrink-0 ${
												action.categorie === "METIER"
													? "text-blue-700 border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300"
													: action.categorie === "SECURITE"
														? "text-red-700 border-red-300 bg-red-50 dark:bg-red-900/20 dark:text-red-300"
														: action.categorie === "UTILISATEUR"
															? "text-green-700 border-green-300 bg-green-50 dark:bg-green-900/20 dark:text-green-300"
															: "text-gray-700 border-gray-300 bg-gray-50 dark:bg-gray-800 dark:text-gray-300"
											}`}
										>
											{action.categorie}
										</Badge>
										<span className="font-mono text-xs truncate">{action.action}</span>
									</div>
									<div className="flex items-center gap-3 shrink-0 ml-2">
										<code className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded">
											{action.entiteType}
										</code>
										<span className="text-[10px] text-muted-foreground tabular-nums">
											{new Date(action.timestamp).toLocaleTimeString()}
										</span>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<CheckCircle2 className="mb-2 h-8 w-8 text-muted-foreground/40" />
							<p className="text-sm text-muted-foreground">Aucune action récente</p>
						</div>
					)}
				</div>
			</FlatCard>

			{/* ── Signaux en attente ──────────────── */}
			{data && data.signauxEnAttente.length > 0 && (
				<FlatCard>
					<div className="p-3 lg:p-4">
						<div className="mb-3">
							<p className="flex items-center gap-2 text-base font-semibold">
								<Clock className="h-4 w-4 text-amber-500" />
								Signaux en attente
								<Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-500/10">
									{data.signauxEnAttente.length}
								</Badge>
							</p>
							<p className="text-sm text-muted-foreground">Signaux non encore traités dans la queue du système limbique</p>
						</div>
						<div className="space-y-1 max-h-[300px] overflow-y-auto">
							{data.signauxEnAttente.slice(0, 20).map((sig: { _id: string; type: string; source: string; timestamp: number; priorite: string }) => (
								<div
									key={sig._id}
									className="flex items-center justify-between text-sm py-2 px-2 rounded-md hover:bg-muted/40 border-b border-border/50 last:border-0"
								>
									<div className="flex items-center gap-3 min-w-0">
										<Badge
											variant="outline"
											className={`text-[10px] shrink-0 ${
												sig.priorite === "CRITICAL"
													? "text-red-700 border-red-300 bg-red-50 dark:bg-red-900/20 dark:text-red-300"
													: sig.priorite === "HIGH"
														? "text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300"
														: "text-blue-700 border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300"
											}`}
										>
											{sig.priorite}
										</Badge>
										<span className="font-mono text-xs truncate">{sig.type}</span>
									</div>
									<div className="flex items-center gap-3 shrink-0 ml-2">
										<code className="text-[10px] text-muted-foreground">{sig.source}</code>
										<span className="text-[10px] text-muted-foreground tabular-nums">
											{new Date(sig.timestamp).toLocaleTimeString()}
										</span>
									</div>
								</div>
							))}
						</div>
					</div>
				</FlatCard>
			)}
		</div>
	);
}



// ─── Main Page ───────────────────────────────────────────────────
export default function MonitoringPage() {
	const { t } = useTranslation();
	const data = useQuery(api.monitoring.getDashboardData);

	return (
		<div className="flex flex-1 flex-col gap-4 p-3 md:p-4">
			{/* ── Header ──────────────────────────── */}
			<PageHeader
				icon={<Activity className="h-5 w-5" />}
				title={t("monitoring.title")}
				subtitle={t("monitoring.description")}
				actions={data && <StatusIndicator status={data.sante.status} />}
			/>

			{/* ── Tabs ────────────────────────────── */}
			<Tabs defaultValue="neocortex">
				<TabsList>
					<TabsTrigger value="neocortex" className="gap-2">
						<Brain className="h-4 w-4" />
						{t("monitoring.tabs.neocortex")}
					</TabsTrigger>
					<TabsTrigger value="infrastructure" className="gap-2">
						<Server className="h-4 w-4" />
						{t("monitoring.tabs.infrastructure")}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="neocortex">
					<NeocortexContent />
				</TabsContent>

				<TabsContent value="infrastructure">
					<InfrastructureMonitoring />
				</TabsContent>
			</Tabs>
		</div>
	);
}
