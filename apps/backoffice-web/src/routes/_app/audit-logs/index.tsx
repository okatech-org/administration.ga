import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuthenticatedPaginatedQuery } from "@/integrations/convex/hooks";
import { api } from "@convex/_generated/api";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "@/components/admin/audit-logs-columns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Download,
	Loader2,
	ScrollText,
	Shield,
	ShieldAlert,
	User,
	Building2,
	FileText,
	Activity,
} from "lucide-react";

export const Route = createFileRoute("/_app/audit-logs/")({
	component: AuditLogsPage,
});

// ─── Helpers ─────────────────────────────────────────────────────
const ACTION_GROUPS: Record<string, { label: string; icon: React.ElementType; color: string; bgLight: string }> = {
	user: { label: "Utilisateurs", icon: User, color: "text-blue-500", bgLight: "bg-blue-500/10" },
	org: { label: "Représentations", icon: Building2, color: "text-amber-500", bgLight: "bg-amber-500/10" },
	service: { label: "Services", icon: FileText, color: "text-emerald-500", bgLight: "bg-emerald-500/10" },
	request: { label: "Demandes", icon: Activity, color: "text-indigo-500", bgLight: "bg-indigo-500/10" },
	security: { label: "Sécurité", icon: ShieldAlert, color: "text-red-500", bgLight: "bg-red-500/10" },
};

function getActionGroup(action: string): keyof typeof ACTION_GROUPS {
	if (action.includes("user") || action.includes("role")) return "user";
	if (action.includes("org")) return "org";
	if (action.includes("service")) return "service";
	if (action.includes("request")) return "request";
	return "security";
}

function AuditLogsPage() {
	const { t, i18n } = useTranslation();
	const [actionFilter, setActionFilter] = useState<string | null>(null);

	const {
		results: logs,
		status: paginationStatus,
		loadMore,
		isLoading,
	} = useAuthenticatedPaginatedQuery(
		api.functions.admin.getAuditLogs,
		{},
		{ initialNumItems: 50 },
	);

	// ─── Compute stats ─────────────────────────────────
	const parsedLogs = useMemo(() => {
		return (
			logs?.map((log: any) => ({
				...log,
				userId: (log.userId as string) || "",
				details: typeof log.details === "string" ? JSON.parse(log.details) : log.details,
			})) ?? []
		);
	}, [logs]);

	const stats = useMemo(() => {
		const total = parsedLogs.length;
		const groups: Record<string, number> = {};
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		let todayCount = 0;

		for (const log of parsedLogs) {
			const group = getActionGroup(log.action);
			groups[group] = (groups[group] ?? 0) + 1;
			if (log.createdAt >= today.getTime()) todayCount++;
		}

		return { total, groups, todayCount };
	}, [parsedLogs]);

	const filteredLogs = useMemo(() => {
		if (!actionFilter) return parsedLogs;
		return parsedLogs.filter((log: any) => getActionGroup(log.action) === actionFilter);
	}, [parsedLogs, actionFilter]);

	// ─── Export CSV ──────────────────────────────────────
	const handleExport = () => {
		const header = "Date,User,Action,Target Type,Target ID\n";
		const rows = parsedLogs.map((log: any) => {
			const date = new Date(log.createdAt).toLocaleString(i18n.language);
			const user = log.user ? `${log.user.firstName ?? ""} ${log.user.lastName ?? ""}`.trim() || log.user.email : "—";
			return `"${date}","${user}","${log.action}","${log.targetType ?? ""}","${log.targetId ?? ""}"`;
		});
		const csv = header + rows.join("\n");
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="flex flex-1 flex-col gap-6 p-4 pt-6 md:p-6">
			{/* ── Header ──────────────────── */}
			<div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">
						{t("superadmin.auditLogs.title")}
					</h1>
					<p className="text-muted-foreground">
						{t("superadmin.auditLogs.description")}
					</p>
				</div>
				<Button variant="outline" size="sm" onClick={handleExport} disabled={parsedLogs.length === 0}>
					<Download className="mr-2 h-4 w-4" />
					Exporter CSV
				</Button>
			</div>

			{/* ── KPI Cards ───────────────── */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Card className="relative overflow-hidden">
					<div className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-indigo-500" />
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Total événements
						</CardTitle>
						<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10">
							<ScrollText className="h-4 w-4 text-indigo-500" />
						</div>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<Skeleton className="h-8 w-20" />
						) : (
							<div className="text-3xl font-bold tracking-tight">{stats.total}</div>
						)}
						<p className="mt-1 text-xs text-muted-foreground">Chargés sur cette session</p>
					</CardContent>
				</Card>

				<Card className="relative overflow-hidden">
					<div className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-emerald-500" />
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Aujourd'hui
						</CardTitle>
						<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
							<Activity className="h-4 w-4 text-emerald-500" />
						</div>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<Skeleton className="h-8 w-20" />
						) : (
							<div className="text-3xl font-bold tracking-tight">{stats.todayCount}</div>
						)}
						<p className="mt-1 text-xs text-muted-foreground">Événements aujourd'hui</p>
					</CardContent>
				</Card>

				<Card className="relative overflow-hidden">
					<div className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-blue-500" />
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Utilisateurs
						</CardTitle>
						<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
							<User className="h-4 w-4 text-blue-500" />
						</div>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<Skeleton className="h-8 w-20" />
						) : (
							<div className="text-3xl font-bold tracking-tight">{stats.groups.user ?? 0}</div>
						)}
						<p className="mt-1 text-xs text-muted-foreground">Actions sur les comptes</p>
					</CardContent>
				</Card>

				<Card className="relative overflow-hidden">
					<div className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-red-500" />
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Sécurité
						</CardTitle>
						<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
							<Shield className="h-4 w-4 text-red-500" />
						</div>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<Skeleton className="h-8 w-20" />
						) : (
							<div className="text-3xl font-bold tracking-tight">{stats.groups.security ?? 0}</div>
						)}
						<p className="mt-1 text-xs text-muted-foreground">Événements de sécurité</p>
					</CardContent>
				</Card>
			</div>

			{/* ── Action Group Filters ─────── */}
			<div className="flex flex-wrap gap-2">
				<Button
					variant={actionFilter === null ? "default" : "outline"}
					size="sm"
					onClick={() => setActionFilter(null)}
				>
					Tous
					<Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">
						{stats.total}
					</Badge>
				</Button>
				{Object.entries(ACTION_GROUPS).map(([key, { label, icon: Icon, color, bgLight }]) => {
					const count = stats.groups[key] ?? 0;
					if (count === 0 && actionFilter !== key) return null;
					return (
						<Button
							key={key}
							variant={actionFilter === key ? "default" : "outline"}
							size="sm"
							onClick={() => setActionFilter(actionFilter === key ? null : key)}
						>
							<Icon className={`mr-1.5 h-3.5 w-3.5 ${actionFilter === key ? "" : color}`} />
							{label}
							<Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">
								{count}
							</Badge>
						</Button>
					);
				})}
			</div>

			{/* ── DataTable ───────────────── */}
			<DataTable
				columns={columns}
				data={filteredLogs}
				searchKey="action"
				searchPlaceholder={t("superadmin.auditLogs.filters.searchPlaceholder")}
				isLoading={isLoading && parsedLogs.length === 0}
			/>

			{/* ── Load More ───────────────── */}
			{paginationStatus === "CanLoadMore" && (
				<div className="flex justify-center">
					<Button variant="outline" onClick={() => loadMore(50)}>
						Charger plus
					</Button>
				</div>
			)}
			{paginationStatus === "LoadingMore" && (
				<div className="flex justify-center">
					<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
				</div>
			)}
		</div>
	);
}
