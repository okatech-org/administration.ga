import { api } from "@convex/_generated/api";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import {
	Activity,
	ArrowRight,
	BarChart3,
	Calendar,
	CheckCircle2,
	ClipboardList,
	Clock,
	CreditCard,
	Download,
	IdCard,
	Loader2,
	TrendingDown,
	TrendingUp,
	Users,
	Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { toast } from "sonner";
import { useOrg } from "../../hooks/useOrg";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@workspace/ui/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { useAuthenticatedConvexQuery } from "../../hooks/useConvexHooks";

// ─── Chart colors ────────────────────────────────────────────────────────────
const CHART_COLORS = [
	"hsl(var(--chart-1))",
	"hsl(var(--chart-2))",
	"hsl(var(--chart-3))",
	"hsl(var(--chart-4))",
	"hsl(var(--chart-5))",
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

const REGISTRATION_COLORS: Record<string, string> = {
	Requested: "#f59e0b",
	Active: "#22c55e",
	Expired: "#ef4444",
	Cancelled: "#94a3b8",
};

// ─── Tooltip style ───────────────────────────────────────────────────────────
const tooltipStyle = {
	backgroundColor: "hsl(var(--card))",
	border: "1px solid hsl(var(--border))",
	borderRadius: "0.5rem",
	fontSize: "0.75rem",
};

// ─── Main Component ──────────────────────────────────────────────────────────
export function StatisticsPage() {
	const { t, i18n } = useTranslation();
	const { orgId } = useOrg();
	const [period, setPeriod] = useState<"week" | "month" | "year">("month");
	const dateFnsLocale = i18n.language?.startsWith("fr") ? fr : enUS;
	const trendGradId = useId();

	// ─── Data queries ──────────────────────────────────────────────────────
	const { data: stats, isPending: statsLoading } = useAuthenticatedConvexQuery(
		api.functions.statistics.getOrgStats,
		orgId ? { orgId, period } : "skip",
	);

	const { data: agentData } = useAuthenticatedConvexQuery(
		api.functions.statistics.getAgentStats,
		orgId ? { orgId } : "skip",
	);

	const { data: registrations } = useAuthenticatedConvexQuery(
		api.functions.consularRegistrations.listByOrg,
		orgId
			? { orgId, paginationOpts: { numItems: 500, cursor: null } }
			: "skip",
	);

	const { data: payments } = useAuthenticatedConvexQuery(
		api.functions.payments.listByOrg,
		orgId ? { orgId } : "skip",
	);

	// ─── Derived data ─────────────────────────────────────────────────────
	const kpiCards = useMemo(() => {
		if (!stats) return [];
		const regPage = registrations?.page ?? [];
		const activeRegs = regPage.filter((r: any) => r.status === "Active").length;
		const cardsGenerated = regPage.filter((r: any) => r.cardNumber).length;

		const totalRevenue = (payments ?? [])
			.filter((p: any) => p.status === "succeeded")
			.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

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
				title: t("admin.stats.completed"),
				value: stats.statusCounts.completed,
				icon: CheckCircle2,
				color: "text-emerald-600",
				bgColor: "bg-emerald-500/10",
			},
			{
				title: t("admin.stats.pending"),
				value: stats.statusCounts.pending,
				icon: Clock,
				color: "text-amber-600",
				bgColor: "bg-amber-500/10",
			},
			{
				title: t("admin.stats.avgProcessing"),
				value: `${stats.avgProcessingDays}j`,
				icon: TrendingUp,
				color: "text-rose-600",
				bgColor: "bg-rose-500/10",
			},
			{
				title: t("admin.stats.activeRegistrations"),
				value: activeRegs,
				icon: IdCard,
				color: "text-teal-600",
				bgColor: "bg-teal-500/10",
			},
			{
				title: t("admin.stats.cardsGenerated"),
				value: cardsGenerated,
				icon: CreditCard,
				color: "text-violet-600",
				bgColor: "bg-violet-500/10",
			},
			{
				title: t("admin.stats.upcomingAppointments"),
				value: stats.upcomingAppointments,
				icon: Calendar,
				color: "text-indigo-600",
				bgColor: "bg-indigo-500/10",
			},
			{
				title: t("admin.stats.totalRevenue"),
				value: new Intl.NumberFormat(
					i18n.language === "fr" ? "fr-FR" : "en-US",
					{ style: "currency", currency: "EUR", maximumFractionDigits: 0 },
				).format(totalRevenue),
				icon: CreditCard,
				color: "text-green-600",
				bgColor: "bg-green-500/10",
			},
		];
	}, [stats, registrations, payments, t, i18n.language]);

	const trendData = useMemo(() => {
		if (!stats?.trend) return [];
		return stats.trend.map((d) => ({
			...d,
			label: format(new Date(d.date), "dd MMM", { locale: dateFnsLocale }),
		}));
	}, [stats?.trend, dateFnsLocale]);

	const serviceChartData = useMemo(() => {
		if (!stats?.serviceStats) return [];
		return stats.serviceStats.map((s) => ({
			name: s.name.length > 25 ? s.name.substring(0, 22) + "..." : s.name,
			fullName: s.name,
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

	const registrationChartData = useMemo(() => {
		const regPage = registrations?.page ?? [];
		const counts: Record<string, number> = {};
		for (const reg of regPage) {
			const status = (reg as any).status ?? "Unknown";
			counts[status] = (counts[status] || 0) + 1;
		}
		return Object.entries(counts)
			.filter(([, v]) => v > 0)
			.map(([key, value]) => ({
				name: t(`admin.registrationStatus.${key}`, key),
				value,
				fill: REGISTRATION_COLORS[key] || "#94a3b8",
			}));
	}, [registrations, t]);

	// ─── Export handler ─────────────────────────────────────────────────────
	const handleExport = () => {
		if (!stats) return;
		try {
			const exportData = {
				generatedAt: new Date().toISOString(),
				period,
				stats,
				agentPerformance: agentData?.agents,
				registrationBreakdown: registrationChartData,
			};
			const blob = new Blob([JSON.stringify(exportData, null, 2)], {
				type: "application/json",
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `statistics-${format(new Date(), "yyyy-MM-dd")}.json`;
			a.click();
			URL.revokeObjectURL(url);
			toast.success(t("admin.export.success"));
		} catch {
			toast.error(t("admin.export.error"));
		}
	};

	// ─── Loading ────────────────────────────────────────────────────────────
	if (statsLoading && !stats) {
		return (
			<div className="flex items-center justify-center h-64">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6 p-4 lg:p-6 overflow-y-auto">
			{/* ── Header ──────────────────────────────────────────────────── */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2 }}
				className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
			>
				<div>
					<h1 className="text-2xl font-bold flex items-center gap-2">
						<BarChart3 className="h-6 w-6 text-primary" />
						{t("admin.statistics.title")}
					</h1>
					<p className="text-muted-foreground text-sm mt-1">
						{t(
							"admin.statistics.description",
							"Analyses détaillées et indicateurs de performance",
						)}
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
							<SelectItem value="week">{t("admin.period.week")}</SelectItem>
							<SelectItem value="month">{t("admin.period.month")}</SelectItem>
							<SelectItem value="year">{t("admin.period.year")}</SelectItem>
						</SelectContent>
					</Select>

					<Button variant="outline" size="icon" onClick={handleExport}>
						<Download className="h-4 w-4" />
					</Button>
				</div>
			</motion.div>

			{/* ── KPI Cards (8 cards, 4x2) ────────────────────────────────── */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2, delay: 0.05 }}
				className="grid grid-cols-2 md:grid-cols-4 gap-4"
			>
				{kpiCards.map((stat) => (
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

			{/* ── Tabs for detailed views ─────────────────────────────────── */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2, delay: 0.1 }}
			>
				<Tabs defaultValue="requests" className="space-y-4">
					<TabsList>
						<TabsTrigger value="requests" className="gap-1.5">
							<ClipboardList className="h-3.5 w-3.5" />
							{t("admin.statistics.tabs.requests")}
						</TabsTrigger>
						<TabsTrigger value="registrations" className="gap-1.5">
							<IdCard className="h-3.5 w-3.5" />
							{t("admin.statistics.tabs.registrations")}
						</TabsTrigger>
						<TabsTrigger value="agents" className="gap-1.5">
							<Users className="h-3.5 w-3.5" />
							{t("admin.statistics.tabs.agents")}
						</TabsTrigger>
					</TabsList>

					{/* ─── TAB: Requests ──────────────────────────────────────── */}
					<TabsContent value="requests" className="space-y-6">
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							{/* Trend Chart */}
							<Card className="lg:col-span-2">
								<CardHeader className="pb-2">
									<CardTitle className="text-base font-semibold flex items-center gap-2">
										<Activity className="h-4 w-4 text-primary" />
										{t("admin.charts.trend")}
									</CardTitle>
									<CardDescription>
										{t(
											"admin.statistics.trendDesc",
											"Nombre de demandes créées par jour",
										)}
									</CardDescription>
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
															id={trendGradId}
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
														contentStyle={tooltipStyle}
														formatter={(value: any) => [
															value,
															t("admin.charts.requests"),
														]}
													/>
													<Area
														type="monotone"
														dataKey="count"
														stroke="hsl(var(--primary))"
														fill={`url(#${trendGradId})`}
														strokeWidth={2}
													/>
												</AreaChart>
											</ResponsiveContainer>
										) : (
											<div className="flex items-center justify-center h-full text-muted-foreground text-sm">
												{t(
													"admin.charts.noData",
													"Aucune donnée pour cette période",
												)}
											</div>
										)}
									</div>
								</CardContent>
							</Card>

							{/* Status Pie */}
							<Card>
								<CardHeader className="pb-2">
									<CardTitle className="text-base font-semibold flex items-center gap-2">
										<ClipboardList className="h-4 w-4 text-primary" />
										{t("admin.charts.byStatus")}
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="h-48">
										{statusChartData.length > 0 ? (
											<ResponsiveContainer width="100%" height="100%">
												<PieChart>
													<Pie
														data={statusChartData}
														cx="50%"
														cy="50%"
														innerRadius={40}
														outerRadius={68}
														dataKey="value"
														strokeWidth={2}
														stroke="hsl(var(--card))"
													>
														{statusChartData.map((entry) => (
															<Cell key={entry.name} fill={entry.fill} />
														))}
													</Pie>
													<Tooltip contentStyle={tooltipStyle} />
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
													<span className="text-muted-foreground">
														{item.name}
													</span>
												</div>
												<span className="font-medium">{item.value}</span>
											</div>
										))}
									</div>
								</CardContent>
							</Card>
						</div>

						{/* Services breakdown */}
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-base font-semibold flex items-center gap-2">
									<Zap className="h-4 w-4 text-primary" />
									{t("admin.charts.byService")}
								</CardTitle>
								<CardDescription>
									{t(
										"admin.statistics.serviceDesc",
										"Répartition par type de service",
									)}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="h-72">
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
													width={160}
													tick={{ fontSize: 11 }}
													className="fill-muted-foreground"
												/>
												<Tooltip
													contentStyle={tooltipStyle}
													formatter={(
														value: any,
														_name: any,
														props: any,
													) => [
														value,
														props.payload?.fullName ||
															t("admin.charts.requests"),
													]}
												/>
												<Bar dataKey="value" radius={[0, 4, 4, 0]}>
													{serviceChartData.map((entry, index) => (
														<Cell
															key={`svc-${entry.name}`}
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
					</TabsContent>

					{/* ─── TAB: Registrations ─────────────────────────────────── */}
					<TabsContent value="registrations" className="space-y-6">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							{/* Registration Status Pie */}
							<Card>
								<CardHeader className="pb-2">
									<CardTitle className="text-base font-semibold flex items-center gap-2">
										<IdCard className="h-4 w-4 text-primary" />
										{t(
											"admin.statistics.regByStatus",
											"Inscriptions par statut",
										)}
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="h-64">
										{registrationChartData.length > 0 ? (
											<ResponsiveContainer width="100%" height="100%">
												<PieChart>
													<Pie
														data={registrationChartData}
														cx="50%"
														cy="50%"
														innerRadius={50}
														outerRadius={80}
														dataKey="value"
														strokeWidth={2}
														stroke="hsl(var(--card))"
														label={({ name, value }) => `${name}: ${value}`}
													>
														{registrationChartData.map((entry) => (
															<Cell key={entry.name} fill={entry.fill} />
														))}
													</Pie>
													<Tooltip contentStyle={tooltipStyle} />
													<Legend wrapperStyle={{ fontSize: "12px" }} />
												</PieChart>
											</ResponsiveContainer>
										) : (
											<div className="flex items-center justify-center h-full text-muted-foreground text-sm">
												{t(
													"admin.statistics.noRegistrations",
													"Aucune inscription",
												)}
											</div>
										)}
									</div>
								</CardContent>
							</Card>

							{/* Registration Details Table */}
							<Card>
								<CardHeader className="pb-2">
									<div className="flex items-center justify-between">
										<CardTitle className="text-base font-semibold flex items-center gap-2">
											<ClipboardList className="h-4 w-4 text-primary" />
											{t(
												"admin.statistics.regDetails",
												"Détails des inscriptions",
											)}
										</CardTitle>
										<Button variant="ghost" size="sm" className="gap-1">
											{t("common.viewAll")}
											<ArrowRight className="h-3.5 w-3.5" />
										</Button>
									</div>
								</CardHeader>
								<CardContent>
									{(() => {
										const regPage = registrations?.page ?? [];
										const totalRegs = regPage.length;
										const activeRegs = regPage.filter(
											(r: any) => r.status === "Active",
										).length;
										const pendingRegs = regPage.filter(
											(r: any) => r.status === "Requested",
										).length;
										const withCard = regPage.filter(
											(r: any) => r.cardNumber,
										).length;
										const printed = regPage.filter(
											(r: any) => r.printedAt,
										).length;

										const items = [
											{
												label: t(
													"admin.statistics.totalRegistrations",
													"Total inscriptions",
												),
												value: totalRegs,
												color: "text-foreground",
											},
											{
												label: t(
													"admin.statistics.activeRegistrations",
													"Actives",
												),
												value: activeRegs,
												color: "text-emerald-600",
											},
											{
												label: t(
													"admin.statistics.pendingRegistrations",
													"En attente",
												),
												value: pendingRegs,
												color: "text-amber-600",
											},
											{
												label: t(
													"admin.statistics.cardsGenerated",
													"Cartes générées",
												),
												value: withCard,
												color: "text-violet-600",
											},
											{
												label: t(
													"admin.statistics.cardsPrinted",
													"Cartes imprimées",
												),
												value: printed,
												color: "text-blue-600",
											},
											{
												label: t(
													"admin.statistics.cardsPending",
													"En attente d'impression",
												),
												value: withCard - printed,
												color: "text-orange-600",
											},
										];

										return (
											<div className="space-y-4">
												{items.map((item) => (
													<div
														key={item.label}
														className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
													>
														<span className="text-sm text-muted-foreground">
															{item.label}
														</span>
														<span
															className={`text-lg font-semibold ${item.color}`}
														>
															{item.value}
														</span>
													</div>
												))}
											</div>
										);
									})()}
								</CardContent>
							</Card>
						</div>
					</TabsContent>

					{/* ─── TAB: Agents ────────────────────────────────────────── */}
					<TabsContent value="agents" className="space-y-6">
						<Card>
							<CardHeader className="pb-2">
								<div className="flex items-center justify-between">
									<div>
										<CardTitle className="text-base font-semibold flex items-center gap-2">
											<Users className="h-4 w-4 text-primary" />
											{t("admin.agents.title")}
										</CardTitle>
										<CardDescription>
											{t(
												"admin.statistics.agentDesc",
												"Demandes assignées et complétées par agent",
											)}
										</CardDescription>
									</div>
									{agentData && (
										<Badge variant="secondary" className="text-xs">
											{agentData.totalAgents} {t("admin.agents.members")}
										</Badge>
									)}
								</div>
							</CardHeader>
							<CardContent>
								{agentData && agentData.agents.length > 0 ? (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>{t("admin.statistics.agentName")}</TableHead>
												<TableHead>{t("admin.statistics.agentRole")}</TableHead>
												<TableHead className="text-center">
													{t("admin.statistics.agentAssigned")}
												</TableHead>
												<TableHead className="text-center">
													{t("admin.statistics.agentCompleted")}
												</TableHead>
												<TableHead className="text-center">
													{t("admin.statistics.agentCompletionRate")}
												</TableHead>
												<TableHead>
													{t("admin.statistics.agentProgress")}
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{agentData.agents.map((agent) => (
												<TableRow key={agent.userId}>
													<TableCell>
														<div className="flex items-center gap-3">
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
															<span className="font-medium text-sm">
																{agent.name}
															</span>
														</div>
													</TableCell>
													<TableCell>
														<Badge
															variant={
																(agent as any).role === "admin" ? "default" : "secondary"
															}
															className="text-xs"
														>
															{String(t(
																`dashboard.team.roles.${(agent as any).role}`,
																(agent as any).role,
															))}
														</Badge>
													</TableCell>
													<TableCell className="text-center font-medium">
														{agent.assigned}
													</TableCell>
													<TableCell className="text-center font-medium text-emerald-600">
														{agent.completed}
													</TableCell>
													<TableCell className="text-center">
														<Badge
															variant={
																agent.completionRate >= 80
																	? "default"
																	: agent.completionRate >= 50
																		? "secondary"
																		: "destructive"
															}
															className="text-xs"
														>
															{agent.completionRate}%
														</Badge>
													</TableCell>
													<TableCell>
														<div className="w-full max-w-[120px]">
															<div className="h-2 bg-muted rounded-full overflow-hidden">
																<div
																	className="h-full bg-primary rounded-full transition-all duration-500"
																	style={{
																		width: `${Math.min(agent.completionRate, 100)}%`,
																	}}
																/>
															</div>
														</div>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								) : (
									<div className="flex flex-col items-center justify-center py-12 text-center">
										<Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
										<p className="text-sm text-muted-foreground">
											{t(
												"admin.agents.noData",
												"Aucune donnée agent disponible",
											)}
										</p>
									</div>
								)}
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</motion.div>
		</div>
	);
}
