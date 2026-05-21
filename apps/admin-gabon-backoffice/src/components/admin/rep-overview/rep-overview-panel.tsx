"use client";

import { useMemo, useState } from "react";
import {
	Activity,
	BarChart3,
	Calendar,
	ClipboardList,
	Clock,
	Users,
	Zap,
} from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { TabSwitcher } from "@/components/design-system/tab-switcher";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { useCurrentAdminRole } from "@/hooks/use-current-admin-role";
import { cn } from "@/lib/utils";

import { ActivityTimeline } from "./activity-timeline";
import { AlertsList } from "./alerts-list";
import { HealthScore } from "./health-score";
import { IdentityBlock } from "./identity-block";
import { LiveCallsWidget } from "./live-calls-widget";
import { PulseKpiCard } from "./pulse-kpi-card";
import { QuickActions } from "./quick-actions";
import { RequestsBreakdown } from "./requests-breakdown";
import { TeamSnapshot } from "./team-snapshot";
import { TodayAppointments } from "./today-appointments";
import { TopServicesList } from "./top-services-list";
import type { OrgAlert, OverviewPeriod } from "./shared/types";

interface RepOverviewPanelProps {
	orgId: Id<"orgs">;
	org: Doc<"orgs">;
}

type SectionKey = "pilotage" | "performance" | "organisation";

const PERIOD_TO_STATS_ARG: Record<OverviewPeriod, "week" | "month" | "year"> = {
	today: "week",
	"7d": "week",
	"30d": "month",
	"90d": "year",
};

const PERIOD_TABS = [
	{ key: "today" as const, label: "Aujourd'hui" },
	{ key: "7d" as const, label: "7 jours" },
	{ key: "30d" as const, label: "30 jours" },
	{ key: "90d" as const, label: "90 jours" },
];

const SECTION_TABS = [
	{ key: "pilotage" as const, label: "Pilotage", icon: Zap },
	{ key: "performance" as const, label: "Performance", icon: BarChart3 },
	{ key: "organisation" as const, label: "Organisation", icon: Activity },
];

/**
 * Panel d'overview d'une représentation — cockpit opérationnel temps réel.
 *
 * Structure :
 * - Hero KPI band (H1-H4) : demandes période, SLA retard, RDV du jour, équipe
 * - TabSwitcher période pour les widgets analytiques
 * - Alertes opérationnelles (W-A)
 * - Pulse demandes + Appels live (W-B + W-C)
 * - RDV aujourd'hui + Top services + Activité (W-D + W-E + W-F)
 * - Équipe + Identité & juridiction (W-G + W-H)
 * - Super-admin : Santé config + Actions rapides (W-I + W-J)
 */
export function RepOverviewPanel({ orgId, org }: RepOverviewPanelProps) {
	const { isSuperAdmin } = useCurrentAdminRole();
	const [period, setPeriod] = useState<OverviewPeriod>("7d");
	const [section, setSection] = useState<SectionKey>("pilotage");

	// ─── Queries (parallèles via Convex WebSocket) ─────────────────────
	const { data: stats, isPending: isStatsLoading } = useAuthenticatedConvexQuery(
		api.functions.statistics.getOrgStats,
		{ orgId, period: PERIOD_TO_STATS_ARG[period] },
	);

	const { data: alertsData, isPending: isAlertsLoading } =
		useAuthenticatedConvexQuery(api.functions.orgOverview.getOrgAlerts, {
			orgId,
		});

	const { data: appointmentsToday } = useAuthenticatedConvexQuery(
		api.functions.appointments.listByOrg,
		{ orgId, date: new Date().toISOString().split("T")[0] },
	);

	const { data: members } = useAuthenticatedConvexQuery(
		api.functions.orgs.getMembers,
		{ orgId },
	);
	const { data: orgChart } = useAuthenticatedConvexQuery(
		api.functions.orgs.getOrgChart,
		{ orgId },
	);

	const { data: detailedOrg } = useAuthenticatedConvexQuery(
		api.functions.orgs.getDetailedById,
		{ orgId },
	);

	// ─── Dérivations pour le Hero ──────────────────────────────────────
	const slaBreachCount =
		(alertsData as { counts?: { slaBreach?: number } } | undefined)?.counts
			?.slaBreach ?? 0;
	const upcomingAppointments = (appointmentsToday as
		| Array<{ status: string; time?: string }>
		| undefined
	) ?? [];

	const nextAppointment = useMemo(() => {
		const now = new Date();
		const nowHm = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
		const upcoming = upcomingAppointments
			.filter((a) => a.status !== "cancelled" && a.status !== "completed")
			.filter((a) => (a.time ?? "00:00") >= nowHm)
			.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
		return upcoming[0];
	}, [upcomingAppointments]);

	const todayCount = upcomingAppointments.filter(
		(a) => a.status !== "cancelled",
	).length;

	const totalMembers = Array.isArray(members) ? members.length : 0;
	const totalPositions =
		(orgChart as { totalPositions?: number } | undefined)?.totalPositions ?? 0;
	const filledPositions =
		(orgChart as { filledPositions?: number } | undefined)?.filledPositions ?? 0;

	const requestsCurrent =
		(stats as { currentPeriodRequests?: number } | undefined)
			?.currentPeriodRequests ?? 0;
	const requestsDelta =
		(stats as { growthPercentage?: number } | undefined)?.growthPercentage ?? 0;
	const sparklineData = useMemo(() => {
		const trend =
			(stats as { trend?: Array<{ date: string; count: number }> } | undefined)
				?.trend ?? [];
		return trend.slice(-7).map((p) => p.count);
	}, [stats]);

	const headOfMissionName = (detailedOrg as
		| { _derived?: { headOfMissionName?: string | null } }
		| undefined
	)?._derived?.headOfMissionName ?? null;

	const alerts = (alertsData as { alerts?: OrgAlert[] } | undefined)?.alerts ?? [];

	const periodLabel =
		period === "today"
			? "Aujourd'hui"
			: period === "7d"
				? "7 jours"
				: period === "30d"
					? "30 jours"
					: "90 jours";

	return (
		<div className="space-y-4 animate-fade-in-up">
			{/* ── Hero KPI band ─────────────────────────────────────── */}
			<div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
				<PulseKpiCard
					icon={ClipboardList}
					label={`Demandes · ${periodLabel}`}
					value={requestsCurrent}
					accent="#6366f1"
					delta={requestsDelta}
					sparklineData={sparklineData.length > 1 ? sparklineData : undefined}
					cta={`/reps/${orgId}?tab=requests`}
					loading={isStatsLoading}
				/>
				<PulseKpiCard
					icon={Clock}
					label="SLA en retard"
					value={slaBreachCount}
					accent="#ef4444"
					pulseWhenNonZero
					cta={`/reps/${orgId}?tab=requests&filter=overdue`}
					loading={isAlertsLoading}
				/>
				<PulseKpiCard
					icon={Calendar}
					label="RDV du jour"
					value={todayCount}
					footnote={
						nextAppointment?.time
							? `Prochain à ${nextAppointment.time}`
							: todayCount === 0
								? "Aucun RDV"
								: undefined
					}
					accent="#f59e0b"
				/>
				<PulseKpiCard
					icon={Users}
					label="Équipe active"
					value={`${filledPositions}/${totalPositions}`}
					footnote={`${totalMembers} agent${totalMembers > 1 ? "s" : ""}`}
					accent="#10b981"
					cta={`/reps/${orgId}?tab=agents`}
				/>
			</div>

			{/* ── Barre navigation : sections à gauche · période à droite ── */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="inline-flex">
					<TabSwitcher
						tabs={SECTION_TABS.map((t) => ({
							key: t.key,
							label: t.label,
							icon: t.icon,
						}))}
						activeTab={section}
						onTabChange={(k) => setSection(k as SectionKey)}
					/>
				</div>
				<div className="inline-flex">
					<TabSwitcher
						tabs={PERIOD_TABS.map((t) => ({ key: t.key, label: t.label }))}
						activeTab={period}
						onTabChange={(k) => setPeriod(k as OverviewPeriod)}
					/>
				</div>
			</div>

			{/* ── Contenu par section — une vue sans scroll ─────────── */}
			{section === "pilotage" && (
				<div className="space-y-3 animate-fade-in-up">
					<AlertsList alerts={alerts} loading={isAlertsLoading} />
					<div className={cn("grid gap-3", "md:grid-cols-12")}>
						<div className="md:col-span-8">
							<RequestsBreakdown
								orgId={orgId}
								statusCounts={
									(stats as
										| {
												statusCounts?: {
													draft: number;
													pending: number;
													processing: number;
													completed: number;
													cancelled: number;
												};
										  }
										| undefined
									)?.statusCounts
								}
								avgProcessingDays={
									(stats as { avgProcessingDays?: number } | undefined)
										?.avgProcessingDays
								}
								completedThisPeriod={
									(stats as { completedThisPeriod?: number } | undefined)
										?.completedThisPeriod
								}
								totalInPeriod={requestsCurrent}
								period={period}
								loading={isStatsLoading}
							/>
						</div>
						<div className="md:col-span-4 grid gap-3">
							<LiveCallsWidget orgId={orgId} />
							<TodayAppointments orgId={orgId} />
						</div>
					</div>
				</div>
			)}

			{section === "performance" && (
				<div className="space-y-3 animate-fade-in-up">
					<div className="grid gap-3 md:grid-cols-2">
						<TopServicesList
							orgId={orgId}
							serviceStats={
								(stats as
									| { serviceStats?: Array<{ serviceId: string; name: string; count: number }> }
									| undefined
								)?.serviceStats
							}
							loading={isStatsLoading}
						/>
						<ActivityTimeline orgId={orgId} />
					</div>
				</div>
			)}

			{section === "organisation" && (
				<div className="space-y-3 animate-fade-in-up">
					<div className="grid gap-3 md:grid-cols-12">
						<div className="md:col-span-4">
							<TeamSnapshot orgId={orgId} />
						</div>
						<div className="md:col-span-8">
							<IdentityBlock org={org} headOfMissionName={headOfMissionName} />
						</div>
					</div>
					{isSuperAdmin && (
						<div className="grid gap-3 md:grid-cols-2">
							<HealthScore orgId={orgId} />
							<QuickActions orgId={orgId} orgSlug={org.slug} />
						</div>
					)}
				</div>
			)}
		</div>
	);
}
