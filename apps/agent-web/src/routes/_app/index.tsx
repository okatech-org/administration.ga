import { api } from "@convex/_generated/api";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	Activity,
	ArrowRight,
	Calendar,
	CheckCircle2,
	Clock,
	ClipboardList,
	Download,
	FileText,
	Loader2,
	Phone,
	Settings,
	TrendingDown,
	TrendingUp,
	Users,
	Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	Area,
	AreaChart,
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
import { toast } from "sonner";
import { useOrg } from "@/components/org/org-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";

export const Route = createFileRoute("/_app/")({ component: AdminDashboard });

// ─── Chart colors ────────────────────────────────────────────────────────────
const CHART_COLORS = [
	"#6366f1",
	"#f59e0b",
	"#10b981",
	"#3b82f6",
	"#ef4444",
	"#8b5cf6",
	"#ec4899",
	"#14b8a6",
	"#f97316",
	"#06b6d4",
];

const STATUS_COLORS: Record<string, string> = {
	draft: "#94a3b8",
	pending: "#f59e0b",
	processing: "#3b82f6",
	completed: "#22c55e",
	cancelled: "#ef4444",
};

// ─── Main Component ──────────────────────────────────────────────────────────
function AdminDashboard() {
	const { t } = useTranslation();
	const { activeOrg, activeOrgId } = useOrg();
	const [period, setPeriod] = useState<"week" | "month" | "year">("month");

	// ─── Data queries ──────────────────────────────────────────────────────
	const { data: stats, isPending: statsLoading } = useAuthenticatedConvexQuery(
		api.functions.statistics.getOrgStats,
		activeOrgId ? { orgId: activeOrgId, period } : "skip",
	);

	const { data: agentData, isPending: agentsLoading } =
		useAuthenticatedConvexQuery(
			api.functions.statistics.getAgentStats,
			activeOrgId ? { orgId: activeOrgId } : "skip",
		);

	// ─── Export handler ────────────────────────────────────────────────────
	const handleExportJSON = async () => {
		if (!activeOrgId) return;
		try {
			const blob = new Blob([JSON.stringify(stats, null, 2)], {
				type: "application/json",
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `dashboard-stats-${format(new Date(), "yyyy-MM-dd")}.json`;
			a.click();
			URL.revokeObjectURL(url);
			toast.success(t("admin.export.success"));
		} catch {
			toast.error(t("admin.export.error"));
		}
	};

	// ─── Derived data ──────────────────────────────────────────────────────
	const statCards = useMemo(() => {
		if (!stats) return [];
		return [
			{
				title: t("admin.stats.totalRequests"),
				value: stats.totalRequests,
				icon: ClipboardList,
				change: stats.growthPercentage,
				color: "text-blue-600",
				bgColor: "bg-blue-500/10",
			},
			{
				title: t("admin.stats.pending"),
				value: stats.statusCounts.pending,
				icon: Clock,
				color: "text-amber-600",
				bgColor: "bg-amber-500/10",
			},
			{
				title: t("admin.stats.processing"),
				value: stats.statusCounts.processing,
				icon: Activity,
				color: "text-indigo-600",
				bgColor: "bg-indigo-500/10",
			},
			{
				title: t("admin.stats.completed"),
				value: stats.statusCounts.completed,
				icon: CheckCircle2,
				color: "text-emerald-600",
				bgColor: "bg-emerald-500/10",
			},
			{
				title: t("admin.stats.avgProcessing"),
				value: `${stats.avgProcessingDays}j`,
				icon: TrendingUp,
				color: "text-rose-600",
				bgColor: "bg-rose-500/10",
			},
			{
				title: t("admin.stats.upcomingAppointments"),
				value: stats.upcomingAppointments,
				icon: Calendar,
				color: "text-violet-600",
				bgColor: "bg-violet-500/10",
			},
		];
	}, [stats, t]);

	const trendData = useMemo(() => {
		if (!stats?.trend) return [];
		return stats.trend.map((d) => ({
			...d,
			label: format(new Date(d.date), "dd MMM", { locale: fr }),
		}));
	}, [stats?.trend]);

	const serviceChartData = useMemo(() => {
		if (!stats?.serviceStats) return [];
		return stats.serviceStats.map((s) => ({
			name: s.name,
			value: s.count,
		}));
	}, [stats?.serviceStats]);

	const statusChartData = useMemo(() => {
		if (!stats?.statusCounts) return [];
		return Object.entries(stats.statusCounts)
			.filter(([, v]) => v > 0)
			.map(([key, value]) => ({
				name: t(`admin.status.${key}`, key),
				value,
				fill: STATUS_COLORS[key] || "#94a3b8",
			}));
	}, [stats?.statusCounts, t]);

	// ─── Loading ───────────────────────────────────────────────────────────
	if (statsLoading && !stats) {
		return (
			<div className="flex items-center justify-center h-64">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	// ─── Quick Actions ─────────────────────────────────────────────────────
	const quickActions = [
		{
			label: t("admin.quickActions.requests"),
			icon: FileText,
			href: "/requests",
		},
		{
			label: t("admin.quickActions.appointments"),
			icon: Calendar,
			href: "/appointments",
		},
		{
			label: t("admin.nav.calls", "Appels"),
			icon: Phone,
			href: "/calls",
		},
		{
			label: t("admin.quickActions.settings"),
			icon: Settings,
			href: "/settings",
		},
	];

	return (
		<div className="flex flex-col gap-6 p-4 lg:p-6 overflow-y-auto">
			{/* ── Header + Controls ────────────────────────────────────────── */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2 }}
				className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
			>
				<div>
					<h1 className="text-2xl font-bold">{activeOrg?.name}</h1>
					<p className="text-muted-foreground text-sm mt-1">
						{t("admin.dashboard.subtitle")}
					</p>
				</div>

				<div className="flex items-center gap-2">
					<Select
						value={period}
						onValueChange={(v) => setPeriod(v as "week" | "month" | "year")}
					>
						<SelectTrigger className="w-36">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="week">
								{t("admin.period.week")}
							</SelectItem>
							<SelectItem value="month">
								{t("admin.period.month")}
							</SelectItem>
							<SelectItem value="year">
								{t("admin.period.year")}
							</SelectItem>
						</SelectContent>
					</Select>

					<Button variant="outline" size="icon" onClick={handleExportJSON}>
						<Download className="h-4 w-4" />
					</Button>
				</div>
			</motion.div>

			{/* ── Quick Stats Grid (6 cards) ───────────────────────────────── */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2, delay: 0.05 }}
				className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
			>
				{statCards.map((stat, i) => (
					<Card
						key={stat.title}
						className="overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
					>
						<CardContent className="p-4">
							<div className="flex items-center justify-between mb-3">
								<div
									className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.bgColor}`}
								>
									<stat.icon className={`h-4 w-4 ${stat.color}`} />
								</div>
								{stat.change !== undefined && (
									<Badge
										variant={stat.change >= 0 ? "default" : "destructive"}
										className="text-[10px] px-1.5 py-0"
									>
										{stat.change >= 0 ? (
											<TrendingUp className="h-3 w-3 mr-0.5" />
										) : (
											<TrendingDown className="h-3 w-3 mr-0.5" />
										)}
										{stat.change > 0 ? "+" : ""}
										{stat.change}%
									</Badge>
								)}
							</div>
							<p className="text-2xl font-bold tracking-tight">{stat.value}</p>
							<p className="text-xs text-muted-foreground mt-1 truncate">
								{stat.title}
							</p>
						</CardContent>
					</Card>
				))}
			</motion.div>

			{/* ── Charts Row ───────────────────────────────────────────────── */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2, delay: 0.1 }}
				className="grid grid-cols-1 lg:grid-cols-3 gap-6"
			>
				{/* Daily Trend — AreaChart */}
				<Card className="lg:col-span-2">
					<CardHeader className="pb-2">
						<CardTitle className="text-base font-semibold flex items-center gap-2">
							<Activity className="h-4 w-4 text-primary" />
							{t("admin.charts.trend")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="h-72">
							{trendData.length > 0 ? (
								<ResponsiveContainer width="100%" height="100%">
									<AreaChart
										data={trendData}
										margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
									>
										<defs>
											<linearGradient
												id="trendGradient"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
												<stop
													offset="5%"
													stopColor="hsl(var(--primary))"
													stopOpacity={0.3}
												/>
												<stop
													offset="95%"
													stopColor="hsl(var(--primary))"
													stopOpacity={0}
												/>
											</linearGradient>
										</defs>
										<CartesianGrid
											strokeDasharray="3 3"
											className="stroke-border"
										/>
										<XAxis
											dataKey="label"
											tick={{ fontSize: 11 }}
											className="fill-muted-foreground"
										/>
										<YAxis
											tick={{ fontSize: 11 }}
											allowDecimals={false}
											className="fill-muted-foreground"
										/>
										<Tooltip
											contentStyle={{
												backgroundColor: "hsl(var(--card))",
												border: "1px solid hsl(var(--border))",
												borderRadius: "0.5rem",
												fontSize: "0.75rem",
											}}
											formatter={(value: number) => [
												value,
												t("admin.charts.requests"),
											]}
										/>
										<Area
											type="monotone"
											dataKey="count"
											stroke="hsl(var(--primary))"
											fill="url(#trendGradient)"
											strokeWidth={2}
										/>
									</AreaChart>
								</ResponsiveContainer>
							) : (
								<div className="flex items-center justify-center h-full text-muted-foreground text-sm">
									{t("admin.charts.noData")}
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Request Status — PieChart */}
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-base font-semibold flex items-center gap-2">
							<ClipboardList className="h-4 w-4 text-primary" />
							{t("admin.charts.byStatus")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="h-44">
							{statusChartData.length > 0 ? (
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={statusChartData}
											cx="50%"
											cy="50%"
											innerRadius={40}
											outerRadius={65}
											dataKey="value"
											strokeWidth={2}
											stroke="hsl(var(--card))"
										>
											{statusChartData.map((entry, index) => (
												<Cell key={`cell-${index}`} fill={entry.fill} />
											))}
										</Pie>
										<Tooltip
											contentStyle={{
												backgroundColor: "hsl(var(--card))",
												border: "1px solid hsl(var(--border))",
												borderRadius: "0.5rem",
												fontSize: "0.75rem",
											}}
										/>
									</PieChart>
								</ResponsiveContainer>
							) : (
								<div className="flex items-center justify-center h-full text-muted-foreground text-sm">
									{t("admin.charts.noData")}
								</div>
							)}
						</div>
						{/* Legend */}
						<div className="mt-3 space-y-1.5">
							{statusChartData.map((item) => (
								<div
									key={item.name}
									className="flex items-center justify-between text-xs"
								>
									<div className="flex items-center gap-2">
										<div
											className="w-2.5 h-2.5 rounded-full"
											style={{ backgroundColor: item.fill }}
										/>
										<span className="text-muted-foreground">{item.name}</span>
									</div>
									<span className="font-medium">{item.value}</span>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</motion.div>

			{/* ── Bottom Row ───────────────────────────────────────────────── */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2, delay: 0.15 }}
				className="grid grid-cols-1 lg:grid-cols-2 gap-6"
			>
				{/* Service Breakdown — Horizontal BarChart */}
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-base font-semibold flex items-center gap-2">
							<Zap className="h-4 w-4 text-primary" />
							{t("admin.charts.byService")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="h-64">
							{serviceChartData.length > 0 ? (
								<ResponsiveContainer width="100%" height="100%">
									<BarChart
										data={serviceChartData}
										layout="vertical"
										margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
									>
										<CartesianGrid
											strokeDasharray="3 3"
											className="stroke-border"
											horizontal={false}
										/>
										<XAxis
											type="number"
											tick={{ fontSize: 11 }}
											allowDecimals={false}
											className="fill-muted-foreground"
										/>
										<YAxis
											type="category"
											dataKey="name"
											width={120}
											tick={{ fontSize: 11 }}
											className="fill-muted-foreground"
										/>
										<Tooltip
											contentStyle={{
												backgroundColor: "hsl(var(--card))",
												border: "1px solid hsl(var(--border))",
												borderRadius: "0.5rem",
												fontSize: "0.75rem",
											}}
											formatter={(value: number) => [
												value,
												t("admin.charts.requests"),
											]}
										/>
										<Bar dataKey="value" radius={[0, 4, 4, 0]}>
											{serviceChartData.map((_, index) => (
												<Cell
													key={`cell-${index}`}
													fill={CHART_COLORS[index % CHART_COLORS.length]}
												/>
											))}
										</Bar>
									</BarChart>
								</ResponsiveContainer>
							) : (
								<div className="flex items-center justify-center h-full text-muted-foreground text-sm">
									{t("admin.charts.noData")}
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Right: Agent Performance + Quick Actions stacked */}
				<div className="flex flex-col gap-6">
					{/* Agent Performance */}
					<Card>
						<CardHeader className="pb-2">
							<div className="flex items-center justify-between">
								<CardTitle className="text-base font-semibold flex items-center gap-2">
									<Users className="h-4 w-4 text-primary" />
									{t("admin.agents.title")}
								</CardTitle>
								{agentData && (
									<Badge variant="secondary" className="text-xs">
										{agentData.totalAgents}{" "}
										{t("admin.agents.members")}
									</Badge>
								)}
							</div>
						</CardHeader>
						<CardContent>
							{agentData && agentData.agents.length > 0 ? (
								<div className="space-y-3">
									{agentData.agents.slice(0, 5).map((agent) => (
										<div key={agent.userId} className="flex items-center gap-3">
											<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
												<span className="text-xs font-medium text-primary">
													{agent.name
														.split(" ")
														.map((n) => n[0])
														.join("")
														.slice(0, 2)
														.toUpperCase()}
												</span>
											</div>
											<div className="flex-1 min-w-0">
												<div className="flex items-center justify-between mb-1">
													<p className="text-sm font-medium truncate">
														{agent.name}
													</p>
													<span className="text-xs text-muted-foreground shrink-0 ml-2">
														{agent.completed}/{agent.assigned}
													</span>
												</div>
												<div className="h-1.5 bg-muted rounded-full overflow-hidden">
													<div
														className="h-full bg-primary rounded-full transition-all duration-500"
														style={{
															width: `${Math.min(agent.completionRate, 100)}%`,
														}}
													/>
												</div>
											</div>
											<span className="text-xs font-medium text-muted-foreground w-10 text-right">
												{agent.completionRate}%
											</span>
										</div>
									))}
								</div>
							) : (
								<p className="text-sm text-muted-foreground text-center py-4">
									{t("admin.agents.noData")}
								</p>
							)}
						</CardContent>
					</Card>

					{/* Quick Actions */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-base font-semibold flex items-center gap-2">
								<Zap className="h-4 w-4 text-primary" />
								{t("admin.quickActions.title")}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-2 gap-2">
								{quickActions.map((action) => (
									<Link
										key={action.href}
										to={action.href}
										className="group flex items-center gap-2 p-2.5 rounded-lg hover:bg-muted/60 transition-colors"
									>
										<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
											<action.icon className="h-4 w-4 text-primary" />
										</div>
										<span className="text-sm font-medium group-hover:text-primary transition-colors truncate">
											{action.label}
										</span>
										<ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0" />
									</Link>
								))}
							</div>
						</CardContent>
					</Card>
				</div>
			</motion.div>
		</div>
	);
}
