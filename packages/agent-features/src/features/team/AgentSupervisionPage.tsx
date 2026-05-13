"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	ArrowLeft,
	CalendarClock,
	CheckCircle2,
	ClipboardList,
	Clock,
	Mail,
	Printer,
	UserRound,
} from "lucide-react";
import { Link, useParams } from "@workspace/routing";
import { useTranslation } from "react-i18next";
import {
	useAuthenticatedConvexQuery,
	useAuthenticatedPaginatedQuery,
} from "@workspace/api/hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { QueryError } from "@workspace/ui/components/query-error";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { FlatCard } from "../../components/my-space/flat-card";
import { SectionHeader } from "../../components/my-space/section-header";
import { getLocalizedValue } from "../../lib/i18n-utils";
import {
	usePageContext,
	useRegisterPageAction,
} from "../../hooks/use-page-context";
import type {
	PageAction,
	PageEntity,
} from "../../stores/page-context-store";

function todayISO() {
	return new Date().toISOString().slice(0, 10);
}

function inOneWeekISO() {
	const d = new Date();
	d.setDate(d.getDate() + 7);
	return d.toISOString().slice(0, 10);
}

export function AgentSupervisionPage() {
	const { membershipId: rawId } = useParams() as { membershipId: string };
	const membershipId = rawId as Id<"memberships">;
	const { t, i18n } = useTranslation();
	const lang = i18n.language?.startsWith("fr") ? "fr" : "en";

	const { data: detail, isPending, error } = useAuthenticatedConvexQuery(
		api.functions.management.getAgentSupervisionDetail,
		{ membershipId },
	);

	const { data: appointments } = useAuthenticatedConvexQuery(
		api.functions.slots.listAppointmentsForPrint,
		detail
			? {
					orgId: detail.orgId,
					from: todayISO(),
					to: inOneWeekISO(),
					agentId: membershipId,
				}
			: "skip",
	);

	const requests = useAuthenticatedPaginatedQuery(
		api.functions.management.listAgentRequests,
		{ membershipId },
		{ initialNumItems: 20 },
	);

	// ─── iAsted page context ──────────────────────────────
	const memberFullName = detail
		? `${detail.member.firstName ?? ""} ${detail.member.lastName ?? ""}`.trim()
		: "";
	const pageEntities: PageEntity[] = detail
		? [
			{
				id: membershipId,
				type: "agent-member",
				label: memberFullName || detail.member.email || "Agent",
				data: {
					email: detail.member.email,
					position: getLocalizedValue(detail.member.positionTitle, lang),
					assigned: detail.stats?.assigned,
					completed: detail.stats?.completed,
					completionRate: detail.stats?.completionRate,
				},
			},
		]
		: [];
	const pageActions: PageAction[] = [
		{
			id: "team.view_schedule_print",
			label: "Imprimer le planning hebdomadaire de l'agent",
			description: "Ouvre la vue impression du planning sur 7 jours.",
		},
		{
			id: "team.load_more_requests",
			label: "Charger plus de demandes",
			description:
				"Charge la page suivante de demandes assignées à cet agent.",
		},
		{
			id: "team.back",
			label: "Retour à la liste des agents",
			description: "Navigue vers /team.",
		},
	];
	usePageContext({
		module: "team-supervision",
		title: `Supervision — ${memberFullName || "Agent"}`,
		summary: detail
			? `${memberFullName} · ${detail.stats?.assigned ?? 0} demande(s) assignée(s), ${detail.stats?.completionRate ?? 0}% complétées.`
			: "Chargement…",
		visibleEntities: pageEntities,
		availableActions: pageActions,
		scopedToolNames: [],
	});
	useRegisterPageAction("team.view_schedule_print", async () => {
		window.location.href = `/appointments/print?agentId=${membershipId}&period=week&autoPrint=1`;
		return { success: true };
	});
	useRegisterPageAction("team.load_more_requests", async () => {
		if (requests.status === "CanLoadMore") requests.loadMore(20);
		return { success: true };
	});
	useRegisterPageAction("team.back", async () => {
		window.location.href = "/team";
		return { success: true };
	});

	if (isPending) {
		return (
			<div className="p-6 space-y-6">
				<Skeleton className="h-10 w-64" />
				<Skeleton className="h-32" />
				<div className="grid gap-3 sm:grid-cols-4">
					<Skeleton className="h-24" />
					<Skeleton className="h-24" />
					<Skeleton className="h-24" />
					<Skeleton className="h-24" />
				</div>
				<Skeleton className="h-[400px]" />
			</div>
		);
	}

	if (error) return <QueryError error={error} />;
	if (!detail) return null;

	const { member, stats } = detail;
	const positionLabel = getLocalizedValue(member.positionTitle, lang);
	const groupLabel = getLocalizedValue(member.ministryGroupLabel, lang);
	const initials = member.name
		.split(" ")
		.map((s) => s[0])
		.filter(Boolean)
		.slice(0, 2)
		.join("")
		.toUpperCase();

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			{/* Back nav */}
			<div>
				<Link href="/team?tab=supervision">
					<Button variant="ghost" size="sm" className="gap-2">
						<ArrowLeft className="h-4 w-4" />
						{t("admin.team.supervision.back", "Retour à la supervision")}
					</Button>
				</Link>
			</div>

			{/* Header */}
			<FlatCard>
				<div className="p-4 lg:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
					<Avatar className="h-16 w-16">
						{member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.name} />}
						<AvatarFallback className="text-lg">{initials || "?"}</AvatarFallback>
					</Avatar>
					<div className="flex-1 min-w-0">
						<h1 className="text-2xl font-bold tracking-tight truncate">{member.name}</h1>
						<div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
							{positionLabel && (
								<span className="inline-flex items-center gap-1">
									<UserRound className="h-3.5 w-3.5" />
									{positionLabel}
								</span>
							)}
							{groupLabel && <Badge variant="outline">{groupLabel}</Badge>}
							{member.email && (
								<span className="inline-flex items-center gap-1">
									<Mail className="h-3.5 w-3.5" />
									{member.email}
								</span>
							)}
						</div>
					</div>
					<Link
						href={`/appointments/print?agentId=${membershipId}&period=week&autoPrint=1`}
						target="_blank"
						rel="noopener noreferrer"
					>
						<Button className="gap-2">
							<Printer className="h-4 w-4" />
							{t("admin.team.supervision.printSchedule", "Imprimer le planning")}
						</Button>
					</Link>
				</div>
			</FlatCard>

			{/* KPI cards */}
			<div className="grid gap-3 sm:grid-cols-4">
				<FlatCard>
					<div className="p-3 lg:p-4 flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
							<ClipboardList className="h-5 w-5 text-primary" />
						</div>
						<div>
							<p className="text-2xl font-bold">{stats.assigned}</p>
							<p className="text-xs text-muted-foreground font-medium">
								{t("admin.team.supervision.assigned", "Assignées")}
							</p>
						</div>
					</div>
				</FlatCard>
				<FlatCard>
					<div className="p-3 lg:p-4 flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15">
							<CheckCircle2 className="h-5 w-5 text-emerald-600" />
						</div>
						<div>
							<p className="text-2xl font-bold">{stats.completed}</p>
							<p className="text-xs text-muted-foreground font-medium">
								{t("admin.team.supervision.completed", "Traitées")}
							</p>
						</div>
					</div>
				</FlatCard>
				<FlatCard>
					<div className="p-3 lg:p-4 flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15">
							<Clock className="h-5 w-5 text-amber-600" />
						</div>
						<div>
							<p className="text-2xl font-bold">{stats.completionRate}%</p>
							<p className="text-xs text-muted-foreground font-medium">
								{t("admin.team.supervision.rate", "Taux d'achèvement")}
							</p>
						</div>
					</div>
				</FlatCard>
				<FlatCard>
					<div className="p-3 lg:p-4 flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/15">
							<CalendarClock className="h-5 w-5 text-cyan-600" />
						</div>
						<div>
							<p className="text-2xl font-bold">{appointments?.length ?? 0}</p>
							<p className="text-xs text-muted-foreground font-medium">
								{t("admin.team.supervision.weekRdv", "RDV cette semaine")}
							</p>
						</div>
					</div>
				</FlatCard>
			</div>

			{/* Upcoming appointments */}
			<div>
				<SectionHeader
					icon={<CalendarClock className="h-4 w-4" />}
					title={t("admin.team.supervision.upcomingTitle", "RDV à venir (7 jours)")}
				/>
				<FlatCard>
					{appointments === undefined ? (
						<div className="p-4 space-y-2">
							<Skeleton className="h-8" />
							<Skeleton className="h-8" />
							<Skeleton className="h-8" />
						</div>
					) : appointments.length === 0 ? (
						<div className="p-6 text-center text-sm text-muted-foreground">
							{t("admin.team.supervision.noAppointments", "Aucun rendez-vous prévu cette semaine.")}
						</div>
					) : (
						<ul className="divide-y">
							{appointments.map((apt) => (
								<li key={apt._id} className="p-3 lg:p-4 flex flex-wrap items-center gap-3 text-sm">
									<span className="font-mono text-xs text-muted-foreground tabular-nums w-32">
										{apt.date} · {apt.time}
									</span>
									<span className="font-medium flex-1 min-w-0 truncate">
										{apt.attendee
											? `${apt.attendee.firstName ?? ""} ${apt.attendee.lastName ?? ""}`.trim() ||
												apt.attendee.email ||
												"—"
											: "—"}
									</span>
									{apt.service?.name && (
										<Badge variant="outline" className="text-xs">
											{getLocalizedValue(apt.service.name, lang)}
										</Badge>
									)}
									<Badge variant="secondary" className="text-xs capitalize">
										{apt.status}
									</Badge>
								</li>
							))}
						</ul>
					)}
				</FlatCard>
			</div>

			{/* Requests history */}
			<div>
				<SectionHeader
					icon={<ClipboardList className="h-4 w-4" />}
					title={t("admin.team.supervision.requestsTitle", "Demandes traitées")}
				/>
				<FlatCard>
					{requests.isLoading && requests.results.length === 0 ? (
						<div className="p-4 space-y-2">
							<Skeleton className="h-8" />
							<Skeleton className="h-8" />
							<Skeleton className="h-8" />
						</div>
					) : requests.results.length === 0 ? (
						<div className="p-6 text-center text-sm text-muted-foreground">
							{t("admin.team.supervision.noRequests", "Aucune demande assignée à cet agent.")}
						</div>
					) : (
						<ul className="divide-y">
							{requests.results.map((r) => (
								<li
									key={r._id}
									className="p-3 lg:p-4 flex flex-wrap items-center gap-3 text-sm"
								>
									<span className="font-mono text-xs text-muted-foreground tabular-nums w-32 truncate">
										{r.reference}
									</span>
									<span className="flex-1 min-w-0 truncate">
										{getLocalizedValue(r.serviceName, lang) ?? "—"}
									</span>
									<Badge variant="secondary" className="text-xs capitalize">
										{r.status}
									</Badge>
									<span className="text-xs text-muted-foreground tabular-nums">
										{new Date(r.createdAt).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US")}
									</span>
								</li>
							))}
						</ul>
					)}
					{requests.status === "CanLoadMore" && (
						<div className="p-3 border-t flex justify-center">
							<Button
								variant="outline"
								size="sm"
								onClick={() => requests.loadMore(20)}
							>
								{t("admin.team.supervision.loadMore", "Charger plus")}
							</Button>
						</div>
					)}
				</FlatCard>
			</div>
		</div>
	);
}

export default AgentSupervisionPage;
