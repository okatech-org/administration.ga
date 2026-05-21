"use client";

import { Phone, PhoneCall, PhoneMissed, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { StatusDot } from "./shared/status-dot";

interface LiveCallsWidgetProps {
	orgId: Id<"orgs">;
}

/**
 * Snapshot live des appels — réactivité native Convex (WebSocket).
 * Affiche queue, appels du jour, manqués, agents en ligne.
 */
export function LiveCallsWidget({ orgId }: LiveCallsWidgetProps) {
	const { t } = useTranslation();

	// La query est dans la liste de contrôle d'accès meetings.supervise —
	// en cas de permission refusée, l'erreur est capturée par le boundary parent.
	const { data: metrics, isPending } = useAuthenticatedConvexQuery(
		api.functions.callCenter.getSupervisionMetrics,
		{ orgId },
	);

	const queueDepth = (metrics as { queueDepth?: number } | undefined)?.queueDepth ?? 0;
	const callsToday = (metrics as { callsToday?: number } | undefined)?.callsToday ?? 0;
	const missedToday = (metrics as { missedToday?: number } | undefined)?.missedToday ?? 0;
	const agentsOnline = (metrics as { agentsOnline?: number } | undefined)?.agentsOnline ?? 0;
	const agentsBusy = (metrics as { agentsBusy?: number } | undefined)?.agentsBusy ?? 0;

	// Statut global : critique si queue > 0 et agents busy, warning si queue mais agents libres
	const liveStatus: "ok" | "warn" | "critical" | "idle" =
		queueDepth === 0
			? agentsOnline > 0
				? "ok"
				: "idle"
			: agentsOnline === 0 || agentsBusy >= agentsOnline
				? "critical"
				: "warn";

	return (
		<FlatCard>
			<div className="p-3 lg:p-4">
				<SectionHeader
					icon={<Phone className="h-4 w-4" />}
					title={t(
						"superadmin.organizations.overview.calls.title",
						"Appels en direct",
					)}
					actions={
						<div className="flex items-center gap-1.5">
							<StatusDot
								status={liveStatus}
								pulse={liveStatus === "critical" || liveStatus === "warn"}
							/>
							<span className="text-[10px] text-muted-foreground uppercase tracking-wider">
								Live
							</span>
						</div>
					}
				/>

				{isPending && !metrics ? (
					<div className="space-y-2">
						<Skeleton className="h-14 w-full" />
						<Skeleton className="h-14 w-full" />
					</div>
				) : (
					<div className="space-y-2">
						<MetricRow
							icon={<PhoneCall className="h-3.5 w-3.5" />}
							label="En file d'attente"
							value={queueDepth}
							accent="#f59e0b"
							critical={queueDepth > 3}
						/>
						<MetricRow
							icon={<Phone className="h-3.5 w-3.5" />}
							label="Aujourd'hui"
							value={callsToday}
							accent="#6366f1"
						/>
						<MetricRow
							icon={<PhoneMissed className="h-3.5 w-3.5" />}
							label="Manqués"
							value={missedToday}
							accent={missedToday > 0 ? "#ef4444" : "#9ca3af"}
						/>
						<MetricRow
							icon={<Users className="h-3.5 w-3.5" />}
							label="Agents en ligne"
							value={`${agentsOnline - agentsBusy}/${agentsOnline}`}
							accent="#10b981"
						/>
					</div>
				)}
			</div>
		</FlatCard>
	);
}

function MetricRow({
	icon,
	label,
	value,
	accent,
	critical,
}: {
	icon: React.ReactNode;
	label: string;
	value: number | string;
	accent: string;
	critical?: boolean;
}) {
	return (
		<div className="flex items-center justify-between gap-3 rounded-lg bg-background/40 px-3 py-2">
			<div className="flex items-center gap-2 min-w-0">
				<div
					className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
					style={{ background: `${accent}18` }}
				>
					<span style={{ color: accent }}>{icon}</span>
				</div>
				<span className="text-xs text-muted-foreground truncate">{label}</span>
			</div>
			<span
				className="text-base font-bold tabular-nums"
				style={critical ? { color: accent } : undefined}
			>
				{value}
			</span>
		</div>
	);
}
