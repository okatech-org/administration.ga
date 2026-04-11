import { useTranslation } from "react-i18next";
import {
	AlertTriangle,
	Shield,
	ShieldAlert,
	ShieldCheck,
	Lock,
	Eye,
	Server,
} from "lucide-react";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { Skeleton } from "@/components/ui/skeleton";

interface SecurityAlert {
	_id: string;
	type: string;
	source: string;
	message: string;
	timestamp: number;
	priorite: string;
}

interface SecurityEvent {
	_id: string;
	action: string;
	entiteType: string;
	userId?: string;
	timestamp: number;
}

interface SecurityData {
	criticalAlerts: SecurityAlert[];
	securityEvents: SecurityEvent[];
	queueDepth: number;
	systemHealth: string;
	totalAlerts24h: number;
	totalSecurityEvents24h: number;
}

function HealthIndicator({ status }: { status: string }) {
	const colorMap: Record<string, { dot: string; bg: string; text: string; label: string }> = {
		HEALTHY: { dot: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", label: "Opérationnel" },
		DEGRADED: { dot: "bg-amber-500", bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", label: "Dégradé" },
		CRITICAL: { dot: "bg-red-500", bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", label: "Critique" },
	};
	const c = colorMap[status] ?? colorMap.HEALTHY;
	return (
		<div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${c.bg}`}>
			<span className={`h-2 w-2 rounded-full ${c.dot} animate-pulse`} />
			<span className={`text-xs font-semibold ${c.text}`}>{c.label}</span>
		</div>
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

export function SecurityAlertsPanel({
	data,
	loading,
}: {
	data?: SecurityData;
	loading: boolean;
}) {
	const { t } = useTranslation();

	if (loading || !data) {
		return (
			<FlatCard>
				<div className="p-3 lg:p-4">
					<Skeleton className="h-5 w-48 mb-3" />
					<div className="space-y-3">
						{[1, 2, 3].map((i) => (
							<Skeleton key={i} className="h-14 w-full" />
						))}
					</div>
				</div>
			</FlatCard>
		);
	}

	const hasCritical = data.criticalAlerts.length > 0;
	const borderClass = hasCritical
		? "border border-red-500/30"
		: data.systemHealth === "DEGRADED"
			? "border-amber-500/30"
			: "border-emerald-500/20";

	return (
		<FlatCard className={borderClass}>
			<div className="p-3 lg:p-4 space-y-4">
				<div>
					<div className="flex items-center justify-between mb-1">
						<SectionHeader
							icon={<ShieldAlert className="h-3.5 w-3.5" />}
							iconBgClass="bg-red-500/10"
							iconTextClass="text-red-500"
							title={t("superadmin.dashboard.security.title", "Securite & Alertes")}
							className="mb-0"
						/>
						<HealthIndicator status={data.systemHealth} />
					</div>
					<p className="text-xs text-muted-foreground">
						{t("superadmin.dashboard.security.description", "Surveillance reseau, cyber-securite et intrusions")}
					</p>
				</div>
				{/* System Status Bar */}
				<div className="grid grid-cols-3 gap-3">
					<div className="flex flex-col items-center gap-1 rounded-lg bg-muted/50 p-3">
						<ShieldCheck className="h-4 w-4 text-muted-foreground" />
						<span className="text-lg font-bold tabular-nums">{data.queueDepth}</span>
						<span className="text-[10px] text-muted-foreground text-center leading-tight">
							Signaux en\nattente
						</span>
					</div>
					<div className="flex flex-col items-center gap-1 rounded-lg bg-muted/50 p-3">
						<AlertTriangle className={`h-4 w-4 ${data.totalAlerts24h > 0 ? "text-red-500" : "text-muted-foreground"}`} />
						<span className={`text-lg font-bold tabular-nums ${data.totalAlerts24h > 0 ? "text-red-500" : ""}`}>
							{data.totalAlerts24h}
						</span>
						<span className="text-[10px] text-muted-foreground text-center leading-tight">
							Alertes 24h
						</span>
					</div>
					<div className="flex flex-col items-center gap-1 rounded-lg bg-muted/50 p-3">
						<Eye className="h-4 w-4 text-muted-foreground" />
						<span className="text-lg font-bold tabular-nums">
							{data.totalSecurityEvents24h}
						</span>
						<span className="text-[10px] text-muted-foreground text-center leading-tight">
							Événements sécu.
						</span>
					</div>
				</div>

				{/* Critical Alerts */}
				{data.criticalAlerts.length > 0 && (
					<div className="space-y-2">
						<h4 className="text-xs font-semibold text-red-500 uppercase tracking-wider flex items-center gap-1.5">
							<span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
							Alertes Critiques
						</h4>
						<div className="space-y-1.5 max-h-[180px] overflow-y-auto">
							{data.criticalAlerts.map((alert) => (
								<div
									key={alert._id}
									className="flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/5 p-2.5"
								>
									<AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
									<div className="min-w-0 flex-1">
										<p className="text-xs font-medium leading-tight truncate">
											{alert.message}
										</p>
										<p className="mt-0.5 text-[10px] text-muted-foreground">
											{alert.source} • {timeAgo(alert.timestamp)}
										</p>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Security Events */}
				{data.securityEvents.length > 0 && (
					<div className="space-y-2">
						<h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
							<Lock className="h-3 w-3" />
							Événements de Sécurité (24h)
						</h4>
						<div className="space-y-1 max-h-[140px] overflow-y-auto">
							{data.securityEvents.map((evt) => (
								<div
									key={evt._id}
									className="flex items-center justify-between rounded-md bg-muted/30 px-2.5 py-1.5 text-xs"
								>
									<div className="flex items-center gap-2 min-w-0">
										<Shield className="h-3 w-3 shrink-0 text-amber-500" />
										<span className="font-mono truncate">{evt.action}</span>
									</div>
									<span className="text-muted-foreground whitespace-nowrap ml-2">
										{timeAgo(evt.timestamp)}
									</span>
								</div>
							))}
						</div>
					</div>
				)}

				{/* No alerts state */}
				{data.criticalAlerts.length === 0 && data.securityEvents.length === 0 && (
					<div className="flex flex-col items-center justify-center py-6 text-center">
						<Server className="mb-2 h-8 w-8 text-emerald-500/40" />
						<p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
							Aucune alerte détectée
						</p>
						<p className="text-xs text-muted-foreground mt-1">
							Tous les systèmes sont opérationnels
						</p>
					</div>
				)}
			</div>
		</FlatCard>
	);
}
