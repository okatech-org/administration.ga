"use client";

import { api } from "@convex/_generated/api";
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import {
	CheckCircle2,
	Clock,
	CreditCard,
	DollarSign,
	Download,
	RefreshCw,
	TrendingUp,
	XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	Area,
	AreaChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
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
import { useOrg } from "../../shell/org-provider";
import { useModuleAccess } from "../../components/shared/access-gate";
import { FlatCard } from "../../components/my-space/flat-card";
import { captureEvent } from "../../lib/analytics";

export default function PaymentsDashboardPage() {
	const { t, i18n } = useTranslation();
	const { activeOrg } = useOrg();
	const { hasMin: hasFinAccess } = useModuleAccess("finance");
	const canManageFinance = hasFinAccess("admin");
	const [dateRange, setDateRange] = useState("30");
	const viewed = useRef(false);

	useEffect(() => {
		if (!viewed.current) {
			viewed.current = true;
			captureEvent("admin_payment_viewed");
		}
	}, []);

	// Fetch payments for this org
	const { data: payments } = useAuthenticatedConvexQuery(
		api.functions.payments.listByOrg,
		activeOrg?._id ? { orgId: activeOrg._id } : "skip",
	);

	// Calculate statistics
	const stats = useMemo(() => {
		if (!payments) return null;

		const now = Date.now();
		const rangeStart = subDays(now, parseInt(dateRange)).getTime();
		const filteredPayments = payments.filter(
			(p) => p._creationTime >= rangeStart,
		);

		const total = filteredPayments.reduce(
			(sum, p) => sum + (p.status === "succeeded" ? p.amount : 0),
			0,
		);
		const pending = filteredPayments.filter(
			(p) => p.status === "pending",
		).length;
		const succeeded = filteredPayments.filter(
			(p) => p.status === "succeeded",
		).length;
		const failed = filteredPayments.filter((p) => p.status === "failed").length;
		const refunded = filteredPayments.filter(
			(p) => p.status === "refunded",
		).length;

		return {
			totalRevenue: total,
			transactionCount: filteredPayments.length,
			successRate:
				filteredPayments.length > 0
					? Math.round((succeeded / filteredPayments.length) * 100)
					: 0,
			byStatus: [
				{ name: "Réussis", value: succeeded, color: "#22c55e" },
				{ name: "En attente", value: pending, color: "#f59e0b" },
				{ name: "Échoués", value: failed, color: "#ef4444" },
				{ name: "Remboursés", value: refunded, color: "#6b7280" },
			],
		};
	}, [payments, dateRange]);

	// Prepare chart data (daily revenue)
	const chartData = useMemo(() => {
		if (!payments) return [];

		const now = new Date();
		const days = parseInt(dateRange);
		const data: { date: string; revenue: number; count: number }[] = [];

		for (let i = days - 1; i >= 0; i--) {
			const day = subDays(now, i);
			const dayStart = startOfDay(day).getTime();
			const dayEnd = endOfDay(day).getTime();

			const dayPayments = payments.filter(
				(p) =>
					p._creationTime >= dayStart &&
					p._creationTime <= dayEnd &&
					p.status === "succeeded",
			);

			data.push({
				date: format(day, "dd MMM", { locale: fr }),
				revenue: dayPayments.reduce((sum, p) => sum + p.amount, 0),
				count: dayPayments.length,
			});
		}

		return data;
	}, [payments, dateRange]);

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat(i18n.language === "fr" ? "fr-FR" : "en-US", {
			style: "currency",
			currency: "EUR",
		}).format(amount);
	};

	const getStatusBadge = (status: string) => {
		const config: Record<
			string,
			{
				label: string;
				variant: "default" | "secondary" | "destructive" | "outline";
				icon: React.ReactNode;
			}
		> = {
			succeeded: {
				label: t("payment.succeeded"),
				variant: "default",
				icon: <CheckCircle2 className="h-3 w-3" />,
			},
			pending: {
				label: t("payment.pending"),
				variant: "secondary",
				icon: <Clock className="h-3 w-3" />,
			},
			failed: {
				label: t("payment.failed"),
				variant: "destructive",
				icon: <XCircle className="h-3 w-3" />,
			},
			refunded: {
				label: t("payment.refunded"),
				variant: "outline",
				icon: <RefreshCw className="h-3 w-3" />,
			},
		};

		const c = config[status] || config.pending;
		return (
			<Badge variant={c.variant} className="flex items-center gap-1">
				{c.icon}
				{c.label}
			</Badge>
		);
	};

	if (!activeOrg) {
		return (
			<div className="flex items-center justify-center h-64">
				<p className="text-muted-foreground">{t("common.selectOrg")}</p>
			</div>
		);
	}

	return (
		<div className="space-y-6 p-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold flex items-center gap-2">
						<CreditCard className="h-6 w-6" />
						{t("payments.title")}
					</h1>
					<p className="text-muted-foreground">{t("payments.subtitle")}</p>
				</div>
				<div className="flex items-center gap-2">
					<Select value={dateRange} onValueChange={setDateRange}>
						<SelectTrigger className="w-40">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="7">{t("payments.last7days")}</SelectItem>
							<SelectItem value="30">{t("payments.last30days")}</SelectItem>
							<SelectItem value="90">{t("payments.last90days")}</SelectItem>
						</SelectContent>
					</Select>
					{canManageFinance && (
						<Button variant="outline" size="icon" className="active:scale-[0.97] transition-transform">
							<Download className="h-4 w-4" />
						</Button>
					)}
				</div>
			</div>

			{/* Stats Cards */}
			{stats && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<FlatCard>
						<div className="p-3 lg:p-4">
							<div className="flex items-center justify-between pb-2">
								<span className="text-sm font-medium text-muted-foreground">
									{t("payments.totalRevenue")}
								</span>
								<DollarSign className="h-4 w-4 text-muted-foreground" />
							</div>
							<div className="text-2xl font-bold">
								{formatCurrency(stats.totalRevenue)}
							</div>
						</div>
					</FlatCard>

					<FlatCard>
						<div className="p-3 lg:p-4">
							<div className="flex items-center justify-between pb-2">
								<span className="text-sm font-medium text-muted-foreground">
									{t("payments.transactions")}
								</span>
								<CreditCard className="h-4 w-4 text-muted-foreground" />
							</div>
							<div className="text-2xl font-bold">{stats.transactionCount}</div>
						</div>
					</FlatCard>

					<FlatCard>
						<div className="p-3 lg:p-4">
							<div className="flex items-center justify-between pb-2">
								<span className="text-sm font-medium text-muted-foreground">
									{t("payments.successRate")}
								</span>
								<TrendingUp className="h-4 w-4 text-muted-foreground" />
							</div>
							<div className="text-2xl font-bold">{stats.successRate}%</div>
						</div>
					</FlatCard>

					<FlatCard>
						<div className="p-3 lg:p-4">
							<div className="flex items-center justify-between pb-2">
								<span className="text-sm font-medium text-muted-foreground">
									{t("payments.avgTransaction")}
								</span>
								<DollarSign className="h-4 w-4 text-muted-foreground" />
							</div>
							<div className="text-2xl font-bold">
								{stats.transactionCount > 0
									? formatCurrency(stats.totalRevenue / stats.transactionCount)
									: formatCurrency(0)}
							</div>
						</div>
					</FlatCard>
				</div>
			)}

			{/* Charts */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Revenue Chart */}
				<FlatCard className="lg:col-span-2">
					<div className="p-3 lg:p-4">
						<div className="mb-2"><h3 className="text-sm font-bold">{t("payments.revenueEvolution")}</h3></div>
						<div className="h-80">
							<ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
								<AreaChart data={chartData}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="date" tick={{ fontSize: 12 }} />
									<YAxis tick={{ fontSize: 12 }} />
									<Tooltip
										formatter={(value) => [
											`${(value as number | undefined)?.toFixed(2) || "0.00"} €`,
											"Revenus",
										]}
									/>
									<Area
										type="monotone"
										dataKey="revenue"
										stroke="#22c55e"
										fill="#22c55e"
										fillOpacity={0.2}
									/>
								</AreaChart>
							</ResponsiveContainer>
						</div>
					</div>
				</FlatCard>

				{/* Status Distribution */}
				<FlatCard>
					<div className="p-3 lg:p-4">
						<div className="mb-2"><h3 className="text-sm font-bold">{t("payments.statusDistribution")}</h3></div>
						<div className="h-48">
							{stats && (
								<ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
									<PieChart>
										<Pie
											data={stats.byStatus.filter((s) => s.value > 0)}
											cx="50%"
											cy="50%"
											innerRadius={40}
											outerRadius={60}
											dataKey="value"
											label={({ name, value }) => `${name}: ${value}`}
										>
											{stats.byStatus.map((entry) => (
												<Cell key={entry.name} fill={entry.color} />
											))}
										</Pie>
										<Tooltip />
									</PieChart>
								</ResponsiveContainer>
							)}
						</div>
						{stats && (
							<div className="mt-4 space-y-2">
								{stats.byStatus.map((item) => (
									<div
										key={item.name}
										className="flex items-center justify-between text-sm"
									>
										<div className="flex items-center gap-2">
											<div
												className="w-3 h-3 rounded-full"
												style={{ backgroundColor: item.color }}
											/>
											<span>{item.name}</span>
										</div>
										<span className="font-medium">{item.value}</span>
									</div>
								))}
							</div>
						)}
					</div>
				</FlatCard>
			</div>

			{/* Transactions Table */}
			<FlatCard>
				<div className="p-3 lg:p-4">
					<div className="mb-2"><h3 className="text-sm font-bold">{t("payments.recentTransactions")}</h3></div>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{t("payments.date")}</TableHead>
								<TableHead>{t("payments.reference")}</TableHead>
								<TableHead>{t("payments.amount")}</TableHead>
								<TableHead>{t("payments.status")}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{payments && payments.length > 0 ? (
								payments.slice(0, 10).map((payment) => (
									<TableRow key={payment._id}>
										<TableCell>
											{format(
												new Date(payment._creationTime),
												"dd/MM/yyyy HH:mm",
												{
													locale: fr,
												},
											)}
										</TableCell>
										<TableCell className="font-mono text-sm">
											{payment.stripePaymentIntentId?.slice(-8) || "N/A"}
										</TableCell>
										<TableCell className="font-medium">
											{formatCurrency(payment.amount)}
										</TableCell>
										<TableCell>{getStatusBadge(payment.status)}</TableCell>
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell colSpan={4} className="text-center py-8">
										<p className="text-muted-foreground">
											{t("payments.noTransactions")}
										</p>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			</FlatCard>
		</div>
	);
}
