import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FlatCard } from "@/components/design-system/flat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MultiSelect } from "@/components/ui/multi-select";
import {
	Activity,
	AlertTriangle,
	Bug,
	ChevronDown,
	ChevronRight,
	Cloud,
	FileText,
	Globe,
	HardDrive,
	Info,
	Loader2,
	Network,
	RefreshCw,
	Server,
	Terminal,
	Timer,
	Video,
	Wifi,
	XCircle,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────
interface CloudRunData {
	name: string;
	uri: string;
	latestRevision: string;
	isReady: boolean;
	conditions: { type: string; state: string; message: string }[];
	createTime: string;
	updateTime: string;
	ingress: string;
	launchStage: string;
	metrics: {
		requestCount: number | null;
		latencyMs: number | null;
		instanceCount: number | null;
		cpuUtilization: number | null;
		memoryUtilization: number | null;
	};
}

interface VmData {
	name: string;
	status: string;
	machineType: string;
	zone: string;
	externalIp: string;
	creationTimestamp: string;
	lastStartTimestamp: string | null;
	cpuPlatform: string;
	disks: { name: string; sizeGb: string; type: string }[];
	metrics: {
		cpuUtilization: number | null;
		networkInBytes: number | null;
		networkOutBytes: number | null;
		diskReadBytes: number | null;
		uptimeSeconds: number | null;
	};
}

interface InfraData {
	cloudRunServices: CloudRunData[];
	livekitVm: VmData;
	fetchedAt: number;
}

interface LogEntry {
	timestamp: string;
	severity: string;
	resource: string;
	logName: string;
	message: string;
	httpRequest: {
		method: string;
		url: string;
		status: number;
		latency: string;
	} | null;
	insertId: string;
}

// ─── Service color config ────────────────────────────────────
const SERVICE_COLORS: Record<string, { accent: string; bg: string; bar: string }> = {
	"agent-web": { accent: "bg-blue-500", bg: "bg-blue-500/10", bar: "bg-blue-500" },
	"citizen-web": { accent: "bg-emerald-500", bg: "bg-emerald-500/10", bar: "bg-emerald-500" },
	"backoffice-web": { accent: "bg-amber-500", bg: "bg-amber-500/10", bar: "bg-amber-500" },
};

function getServiceColor(name: string) {
	return SERVICE_COLORS[name] ?? { accent: "bg-blue-500", bg: "bg-blue-500/10", bar: "bg-blue-500" };
}

// ─── Helpers ─────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
	if (bytes === null || bytes === undefined) return "—";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024)
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatUptime(seconds: number | null): string {
	if (seconds === null || seconds === undefined) return "—";
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const mins = Math.floor((seconds % 3600) / 60);
	if (days > 0) return `${days}j ${hours}h ${mins}m`;
	if (hours > 0) return `${hours}h ${mins}m`;
	return `${mins}m`;
}

function formatPercent(value: number | null): string {
	if (value === null || value === undefined) return "—";
	return `${(value * 100).toFixed(1)}%`;
}

// ─── Progress Bar with label ─────────────────────────────────
function MetricBar({
	label,
	value,
	color = "bg-blue-500",
}: {
	label: string;
	value: number | null;
	max?: number;
	color?: string;
}) {
	const pct = value !== null ? Math.min(value * 100, 100) : 0;
	const displayValue = value !== null ? formatPercent(value) : "—";

	return (
		<div className="space-y-1.5">
			<div className="flex items-center justify-between text-xs">
				<span className="text-muted-foreground">{label}</span>
				<span className="font-mono font-semibold">{displayValue}</span>
			</div>
			<Progress value={pct} className={`h-2 [&>[data-slot=progress-indicator]]:${color}`} />
		</div>
	);
}

// ─── Status Badge ────────────────────────────────────────────
function StatusBadge({
	status,
	isReady,
}: {
	status: string;
	isReady?: boolean;
}) {
	const ready = isReady ?? status === "RUNNING";
	return (
		<div className="flex items-center gap-2">
			<div className="relative flex h-3 w-3">
				<span
					className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${ready ? "bg-green-400 animate-ping" : "bg-red-400 animate-ping"}`}
				/>
				<span
					className={`relative inline-flex h-3 w-3 rounded-full ${ready ? "bg-green-500" : "bg-red-500"}`}
				/>
			</div>
			<Badge
				variant="outline"
				className={
					ready
						? "text-green-700 border-green-300 bg-green-50 dark:bg-green-900/20 dark:text-green-300"
						: "text-red-700 border-red-300 bg-red-50 dark:bg-red-900/20 dark:text-red-300"
				}
			>
				{status}
			</Badge>
		</div>
	);
}

// ─── Severity helpers ────────────────────────────────────────
const SEVERITY_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
	ERROR: { icon: XCircle, color: "text-red-600 dark:text-red-400", bgColor: "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800" },
	CRITICAL: { icon: XCircle, color: "text-red-600 dark:text-red-400", bgColor: "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800" },
	WARNING: { icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800" },
	INFO: { icon: Info, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800" },
	DEBUG: { icon: Bug, color: "text-gray-600 dark:text-gray-400", bgColor: "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700" },
	DEFAULT: { icon: FileText, color: "text-gray-500", bgColor: "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700" },
};

function SeverityBadge({ severity }: { severity: string }) {
	const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.DEFAULT;
	const Icon = config.icon;
	return (
		<Badge variant="outline" className={`text-[10px] gap-1 ${config.color} ${config.bgColor}`}>
			<Icon className="h-3 w-3" />
			{severity}
		</Badge>
	);
}

// ─── Log Row ─────────────────────────────────────────────────
function LogRow({ entry }: { entry: LogEntry }) {
	const [expanded, setExpanded] = useState(false);
	const ts = new Date(entry.timestamp);
	const timeStr = ts.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
	const dateStr = ts.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });

	return (
		<div
			className={`border-b border-border/30 last:border-0 transition-colors hover:bg-muted/30 ${
				entry.severity === "ERROR" || entry.severity === "CRITICAL" ? "bg-red-50/30 dark:bg-red-900/5" : ""
			}`}
		>
		<button
			type="button"
			className="w-full flex items-start gap-3 py-3 px-3 text-left"
			onClick={() => setExpanded(!expanded)}
		>
				<div className="shrink-0 pt-0.5">
					{expanded ? (
						<ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
					) : (
						<ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
					)}
				</div>
			<span className="text-[11px] sm:text-[10px] font-mono text-muted-foreground tabular-nums shrink-0 pt-0.5 w-[85px]">
					{dateStr} {timeStr}
				</span>
				<SeverityBadge severity={entry.severity} />
				<Badge variant="outline" className="text-[10px] shrink-0">
					{entry.resource}
				</Badge>
				<span className="text-xs font-mono truncate min-w-0 flex-1 pt-0.5">
					{entry.message}
				</span>
			</button>
			{expanded && (
				<div className="pl-10 pr-3 pb-3 space-y-2">
					<div className="rounded-md bg-muted/60 p-3 font-mono text-xs whitespace-pre-wrap break-all max-h-[200px] overflow-y-auto">
						{entry.message}
					</div>
					{entry.httpRequest && (
						<div className="flex items-center gap-3 text-xs text-muted-foreground">
							<Badge variant="outline" className="text-[10px]">
								{entry.httpRequest.method} {entry.httpRequest.status}
							</Badge>
							<span className="font-mono truncate">{entry.httpRequest.url}</span>
							{entry.httpRequest.latency && (
								<span className="shrink-0">{entry.httpRequest.latency}</span>
							)}
						</div>
					)}
					<div className="flex items-center gap-4 text-[10px] text-muted-foreground">
						<span>Log: {entry.logName}</span>
						<span>ID: {entry.insertId}</span>
					</div>
				</div>
			)}
		</div>
	);
}

// ─── Logs Panel ──────────────────────────────────────────────
type LogServiceFilter = "all" | "cloud_run" | "agent-web" | "citizen-web" | "backoffice-web" | "livekit_vm";

function LogsPanel() {
	const { t } = useTranslation();
	const fetchLogs = useAction(api.actions.gcpMonitoring.fetchLogs);
	const [logs, setLogs] = useState<LogEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [service, setService] = useState<LogServiceFilter>("all");
	const [severity, setSeverity] = useState<string | undefined>(undefined);

	const loadLogs = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const result = await fetchLogs({ service, severity, pageSize: 50 });
			setLogs((result as any).entries || []);
		} catch (err: any) {
			setError(err.message || t("monitoring.logs.loadingError"));
		} finally {
			setLoading(false);
		}
	}, [fetchLogs, service, severity, t]);

	useEffect(() => {
		loadLogs();
	}, [loadLogs]);

	return (
		<FlatCard>
			<div className="p-3 lg:p-4">
				<div className="flex items-center justify-between mb-3">
					<div className="flex items-center gap-2.5 text-lg font-semibold">
						<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
							<Terminal className="h-5 w-5 text-emerald-500" />
						</div>
						{t("monitoring.logs.title")}
						{!loading && (
							<Badge variant="outline" className="text-xs font-normal">
								{logs.length} {t("monitoring.logs.entries")}
							</Badge>
						)}
					</div>
					<div className="flex items-center gap-2">
						<MultiSelect
							type="single"
							selected={service}
							onChange={(v: string) => setService(v as LogServiceFilter)}
							placeholder={t("monitoring.logs.service.all")}
							searchPlaceholder={t("common.search")}
							className="h-10 md:h-8 w-[180px] text-xs"
							options={[
								{ value: "all", label: t("monitoring.logs.service.all") },
								{ value: "cloud_run", label: t("monitoring.logs.service.cloudRun") },
								{ value: "agent-web", label: t("monitoring.logs.service.agentWeb") },
								{ value: "citizen-web", label: t("monitoring.logs.service.citizenWeb") },
								{ value: "backoffice-web", label: t("monitoring.logs.service.backofficeWeb") },
								{ value: "livekit_vm", label: t("monitoring.logs.service.livekitVm") },
							]}
						/>
						<MultiSelect
							type="single"
							selected={severity ?? "_all"}
							onChange={(v: string) => setSeverity(v === "_all" ? undefined : v)}
							placeholder={t("monitoring.logs.severity.all")}
							searchPlaceholder={t("common.search")}
							className="h-10 md:h-8 w-[130px] text-xs"
							options={[
								{ value: "_all", label: t("monitoring.logs.severity.all") },
								{ value: "ERROR", label: t("monitoring.logs.severity.error") },
								{ value: "WARNING", label: t("monitoring.logs.severity.warning") },
								{ value: "INFO", label: t("monitoring.logs.severity.info") },
								{ value: "DEBUG", label: t("monitoring.logs.severity.debug") },
							]}
						/>
						<Button variant="outline" size="sm" onClick={loadLogs} disabled={loading} className="h-10 md:h-8 gap-1.5">
							<RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
						</Button>
					</div>
				</div>
				<p className="text-xs text-muted-foreground mb-3">
					{t("monitoring.logs.description")}
				</p>
				{loading ? (
					<div className="flex items-center justify-center py-12">
						<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						<span className="ml-3 text-sm text-muted-foreground">{t("monitoring.logs.loading")}</span>
					</div>
				) : error ? (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<XCircle className="mb-3 h-8 w-8 text-red-500/50" />
						<p className="text-sm text-red-600 dark:text-red-400">{error}</p>
						<Button variant="outline" size="sm" className="mt-3" onClick={loadLogs}>
							{t("monitoring.retry")}
						</Button>
					</div>
				) : logs.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<Terminal className="mb-2 h-8 w-8 text-muted-foreground/40" />
						<p className="text-sm text-muted-foreground">{t("monitoring.logs.noResults")}</p>
					</div>
				) : (
					<ScrollArea className="h-[60vh] md:h-[500px]">
						<div className="rounded-lg border border-border/60">
							{logs.map((entry) => (
								<LogRow key={entry.insertId} entry={entry} />
							))}
						</div>
					</ScrollArea>
				)}
			</div>
		</FlatCard>
	);
}

// ─── Cloud Run Service Card ──────────────────────────────────
function CloudRunCard({ service, t }: { service: CloudRunData; t: (key: string) => string }) {
	const colors = getServiceColor(service.name);

	return (
		<FlatCard className="relative overflow-hidden">
			<div className={`absolute left-0 top-0 h-full w-1.5 rounded-l-xl ${colors.accent}`} />
			<div className="p-3 lg:p-4 space-y-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2 text-base font-semibold">
						<div className={`flex h-8 w-8 items-center justify-center rounded-lg ${colors.bg}`}>
							<Cloud className={`h-4 w-4 ${colors.accent.replace("bg-", "text-")}`} />
						</div>
						{service.name}
					</div>
					<StatusBadge
						status={service.isReady ? t("monitoring.cloudRun.ready") : t("monitoring.cloudRun.notReady")}
						isReady={service.isReady}
					/>
				</div>
				{service.uri && (
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<Globe className="h-3.5 w-3.5" />
						<a
							href={service.uri}
							target="_blank"
							rel="noreferrer"
							className="text-blue-500 hover:underline truncate"
						>
							{service.uri.replace("https://", "")}
						</a>
					</div>
				)}
				{/* Info row */}
				<div className="grid grid-cols-2 gap-2">
					<div className="rounded-lg bg-muted/50 p-2.5 space-y-0.5">
						<p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
							{t("monitoring.cloudRun.revision")}
						</p>
						<p className="text-xs font-mono font-medium truncate">
							{service.latestRevision}
						</p>
					</div>
					<div className="rounded-lg bg-muted/50 p-2.5 space-y-0.5">
						<p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
							{t("monitoring.cloudRun.instances")}
						</p>
						<p className="text-xs font-mono font-medium">
							{service.metrics.instanceCount !== null
								? Math.round(service.metrics.instanceCount)
								: "—"}
						</p>
					</div>
				</div>

				{/* Metrics */}
				<div className="space-y-2.5">
					<MetricBar
						label={t("monitoring.cloudRun.cpu")}
						value={service.metrics.cpuUtilization}
						color={colors.bar}
					/>
					<MetricBar
						label={t("monitoring.cloudRun.memory")}
						value={service.metrics.memoryUtilization}
						color={colors.bar}
					/>
				</div>

				{/* Stats row */}
				<div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t border-border/50">
					{service.metrics.requestCount !== null && (
						<span className="flex items-center gap-1">
							<Activity className="h-3 w-3" />
							{Math.round(service.metrics.requestCount)} {t("monitoring.cloudRun.requests")}
						</span>
					)}
					{service.metrics.latencyMs !== null && (
						<span className="flex items-center gap-1">
							<Timer className="h-3 w-3" />
							{Math.round(service.metrics.latencyMs)}ms
						</span>
					)}
				</div>
			</div>
		</FlatCard>
	);
}

// ─── Exported Component ──────────────────────────────────────
export function InfrastructureMonitoring() {
	const { t } = useTranslation();
	const fetchHealth = useAction(api.actions.gcpMonitoring.fetchInfrastructureHealth);
	const [data, setData] = useState<InfraData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [refreshing, setRefreshing] = useState(false);

	const timeAgo = useCallback((timestamp: number) => {
		const diff = Date.now() - timestamp;
		const seconds = Math.floor(diff / 1000);
		if (seconds < 60) return t("monitoring.timeAgo.seconds", { count: seconds });
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return t("monitoring.timeAgo.minutes", { count: minutes });
		const hours = Math.floor(minutes / 60);
		return t("monitoring.timeAgo.hours", { count: hours });
	}, [t]);

	const loadData = useCallback(async (isRefresh = false) => {
		try {
			if (isRefresh) setRefreshing(true);
			else setLoading(true);
			setError(null);
			const result = await fetchHealth();
			setData(result as InfraData);
		} catch (err: any) {
			setError(err.message || t("monitoring.loadingError"));
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, [fetchHealth, t]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	if (loading) {
		return (
			<div className="space-y-6 pt-4">
				<div className="grid gap-4 md:grid-cols-3">
					<Skeleton className="h-[300px] rounded-xl" />
					<Skeleton className="h-[300px] rounded-xl" />
					<Skeleton className="h-[300px] rounded-xl" />
				</div>
				<Skeleton className="h-[300px] rounded-xl" />
			</div>
		);
	}

	if (error) {
		return (
			<FlatCard className="border border-red-500/50 mt-4">
				<div className="flex flex-col items-center justify-center py-12 text-center p-3 lg:p-4">
					<Activity className="mb-3 h-10 w-10 text-red-500/60" />
					<p className="text-sm font-medium text-red-600 dark:text-red-400">
						{error}
					</p>
					<Button
						variant="outline"
						size="sm"
						className="mt-4"
						onClick={() => loadData()}
					>
						{t("monitoring.retry")}
					</Button>
				</div>
			</FlatCard>
		);
	}

	if (!data) return null;

	return (
		<div className="space-y-6 pt-4">
			{/* ── Header with refresh ─────────────── */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<Timer className="h-3.5 w-3.5" />
					{t("monitoring.lastUpdate")}{timeAgo(data.fetchedAt)}
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => loadData(true)}
					disabled={refreshing}
					className="gap-2"
				>
					<RefreshCw
						className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
					/>
					{t("monitoring.refresh")}
				</Button>
			</div>

			{/* ── Cloud Run Service Cards ──────────── */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{data.cloudRunServices.map((service) => (
					<CloudRunCard key={service.name} service={service} t={t} />
				))}
			</div>

			{/* ── LiveKit VM Card ──────────────────── */}
			<FlatCard className="relative overflow-hidden">
				<div className="absolute left-0 top-0 h-full w-1.5 rounded-l-xl bg-purple-500" />
				<div className="p-3 lg:p-4 space-y-4">
					<div>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2.5 text-lg font-semibold">
								<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
									<Video className="h-5 w-5 text-purple-500" />
								</div>
								{t("monitoring.livekit.title")}
							</div>
							<StatusBadge status={data.livekitVm.status} />
						</div>
						<div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
							<Server className="h-3.5 w-3.5" />
							<span className="font-mono">
								{data.livekitVm.name}
							</span>
							<span>&#8226;</span>
							<span>{data.livekitVm.machineType}</span>
							<span>&#8226;</span>
							<span>{data.livekitVm.zone}</span>
						</div>
					</div>
					{/* Info row */}
					<div className="grid grid-cols-3 gap-3">
						<div className="rounded-lg bg-muted/50 p-3 space-y-1">
							<p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
								{t("monitoring.livekit.externalIp")}
							</p>
							<p className="text-xs font-mono font-medium">
								{data.livekitVm.externalIp}
							</p>
						</div>
						<div className="rounded-lg bg-muted/50 p-3 space-y-1">
							<p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
								{t("monitoring.livekit.cpu")}
							</p>
							<p className="text-xs font-mono font-medium">
								{data.livekitVm.cpuPlatform || "—"}
							</p>
						</div>
						<div className="rounded-lg bg-muted/50 p-3 space-y-1">
							<p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
								{t("monitoring.livekit.uptime")}
							</p>
							<p className="text-xs font-mono font-medium">
								{formatUptime(data.livekitVm.metrics.uptimeSeconds)}
							</p>
						</div>
					</div>

					{/* Metrics */}
					<div className="space-y-3">
						<MetricBar
							label={t("monitoring.livekit.cpu")}
							value={data.livekitVm.metrics.cpuUtilization}
							color="bg-purple-500"
						/>
					</div>

					{/* Network stats */}
					<div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border/50">
						<span className="flex items-center gap-1.5">
							<Wifi className="h-3 w-3" />
							↓ {formatBytes(data.livekitVm.metrics.networkInBytes)}
						</span>
						<span className="flex items-center gap-1.5">
							<Network className="h-3 w-3" />
							↑ {formatBytes(data.livekitVm.metrics.networkOutBytes)}
						</span>
						{data.livekitVm.metrics.diskReadBytes !== null && (
							<span className="flex items-center gap-1.5">
								<HardDrive className="h-3 w-3" />
								{formatBytes(data.livekitVm.metrics.diskReadBytes)} {t("monitoring.livekit.disk")}
							</span>
						)}
					</div>

					{/* Disks */}
					{data.livekitVm.disks.length > 0 && (
						<div className="pt-2 border-t border-border/50">
							<p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
								{t("monitoring.livekit.disks")}
							</p>
							<div className="flex flex-wrap gap-2">
								{data.livekitVm.disks.map((disk) => (
									<Badge
										key={disk.name}
										variant="outline"
										className="font-mono text-[10px]"
									>
										<HardDrive className="h-3 w-3 mr-1" />
										{disk.name} ({disk.sizeGb}GB)
									</Badge>
								))}
							</div>
						</div>
					)}
				</div>
			</FlatCard>

			{/* ── Logs Panel ────────────────────────── */}
			<LogsPanel />
		</div>
	);
}
