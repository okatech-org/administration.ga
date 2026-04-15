"use client";

/**
 * iAgenda — Backoffice (SuperAdmin)
 *
 * Même architecture UX que agent-web et citizen-web :
 * sidebar calendar, tabs, date blocks, stats.
 * Avec org-selector pour superviser différentes organisations.
 */

import { api } from "@convex/_generated/api";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	Calendar,
	ChevronLeft,
	ChevronRight,
	Clock,
	Globe,
	List,
	Loader2,
	MapPin,
	Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrgSelector } from "@/hooks/use-org-selector";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";


// ─── Types ─────────────────────────────────────────────────────
interface AgendaEvent {
	id: string;
	title: string;
	type: string;
	date: string;
	time: string;
	endTime?: string;
	location: string;
	attendees: string[];
	description: string;
	source: "diplomatic" | "appointment";
	status?: string;
}

// ─── Status & Type Config (identique agent-web) ────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; dotColor: string }> = {
	confirmed: { label: "Confirmé", color: "bg-green-500/10 text-green-600 border-green-500/20", dotColor: "bg-green-500" },
	completed: { label: "Complété", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", dotColor: "bg-blue-500" },
	cancelled: { label: "Annulé", color: "bg-red-500/10 text-red-600 border-red-500/20", dotColor: "bg-red-500" },
	no_show: { label: "Absent", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", dotColor: "bg-amber-500" },
	rescheduled: { label: "Reprogrammé", color: "bg-purple-500/10 text-purple-600 border-purple-500/20", dotColor: "bg-purple-500" },
	active: { label: "Actif", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", dotColor: "bg-emerald-500" },
	draft: { label: "Brouillon", color: "bg-gray-500/10 text-gray-600 border-gray-500/20", dotColor: "bg-gray-500" },
};

const EVENT_TYPE_STYLE: Record<string, { label: string; dotColor: string }> = {
	diplomacy: { label: "Diplomatique", dotColor: "bg-emerald-500" },
	cultural: { label: "Culturel", dotColor: "bg-purple-500" },
	community: { label: "Communauté", dotColor: "bg-blue-500" },
	celebration: { label: "Célébration", dotColor: "bg-amber-500" },
	sport: { label: "Sport", dotColor: "bg-cyan-500" },
	charity: { label: "Solidarité", dotColor: "bg-rose-500" },
	appointment: { label: "RDV Consulaire", dotColor: "bg-indigo-500" },
};

function getMonday(d: Date) {
	const day = d.getDay();
	return day === 0 ? 6 : day - 1;
}

// ─── Main Page ────────────────────────────────────────────────
export default function IAgendaPage() {
	const [activeTab, setActiveTab] = useState("calendar");
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const { activeOrgId, OrgSelector } = useOrgSelector();

	// ── Données Convex (mêmes queries que agent-web) ──
	const { data: rawCommunityEventsResult, isPending: eventsLoading } = useAuthenticatedConvexQuery(
		api.functions.communityEvents.listAll,
		{ paginationOpts: { numItems: 200, cursor: null } },
	);
	const rawCommunityEvents = rawCommunityEventsResult?.page ?? [];
	const { data: rawAppointments = [], isPending: appointmentsLoading } = useAuthenticatedConvexQuery(
		api.functions.slots.listAppointmentsByOrg,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);
	const isPending = eventsLoading || appointmentsLoading;

	// ── Fusionner (même logique que agent-web) ──
	const allEvents: AgendaEvent[] = useMemo(() => {
		const diplomatic: AgendaEvent[] = (rawCommunityEvents as any[]).map((e) => ({
			id: e._id,
			title: e.title ?? "Événement",
			type: e.category ?? "diplomacy",
			date: e.date ? new Date(e.date).toISOString().split("T")[0] : new Date(e._creationTime).toISOString().split("T")[0],
			time: "09:00",
			location: e.location ?? "",
			attendees: [],
			description: e.description ?? "",
			source: "diplomatic" as const,
			status: e.status ?? "active",
		}));
		const appointments: AgendaEvent[] = (rawAppointments as any[]).map((a) => ({
			id: a._id,
			title: a.service?.name?.fr ?? a.service?.name ?? "Rendez-vous consulaire",
			type: "appointment",
			date: a.date ?? "",
			time: a.time ?? "09:00",
			endTime: a.endTime,
			location: "",
			attendees: a.attendee ? [`${a.attendee.firstName ?? ""} ${a.attendee.lastName ?? ""}`] : [],
			description: a.attendee?.email ?? "",
			source: "appointment" as const,
			status: a.status ?? "confirmed",
		}));
		return [...diplomatic, ...appointments].sort((a, b) =>
			`${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`),
		);
	}, [rawCommunityEvents, rawAppointments]);

	const today = new Date().toISOString().split("T")[0];
	const upcomingEvents = allEvents.filter((e) => e.date >= today && e.status !== "cancelled");
	const pastEvents = allEvents.filter((e) => e.date < today || e.status === "cancelled");

	const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;
	const monthEvents = allEvents.filter((e) => e.date.startsWith(monthStr) && e.status !== "cancelled");
	const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
	const firstDay = getMonday(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));

	const isToday = (day: number) => {
		const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
		return dateStr === today;
	};
	const getEventsForDay = (day: number) => {
		const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
		return monthEvents.filter((e) => e.date === dateStr);
	};

	const thisMonth = allEvents.filter((e) => e.date.startsWith(monthStr)).length;
	const todayCount = allEvents.filter((e) => e.date === today).length;

	return (
		<div className="flex flex-1 flex-col gap-4 p-3 md:p-4 h-full overflow-y-auto">
			{/* ── Header ── */}
			<PageHeader
				icon={<Calendar className="h-5 w-5" />}
				iconBgClass="bg-indigo-500/10"
				title="iAgenda"
				subtitle="Supervision des agendas diplomatiques"
				actions={
					<div className="flex items-center gap-2">
						<OrgSelector />
						{todayCount > 0 && (
							<Badge variant="outline" className="text-xs gap-1">
								<Clock className="h-3 w-3" /> {todayCount} aujourd'hui
							</Badge>
						)}
						<Badge variant="secondary" className="text-xs">{thisMonth} ce mois</Badge>
					</div>
				}
			/>

			{/* ── Tabs (même structure que agent-web) ── */}
			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="calendar" className="gap-2">
						<Calendar className="h-4 w-4" /> Calendrier
					</TabsTrigger>
					<TabsTrigger value="events" className="gap-2">
						<List className="h-4 w-4" /> Événements
						{upcomingEvents.length > 0 && (
							<Badge variant="secondary" className="text-[10px] h-4 px-1 ml-1">{upcomingEvents.length}</Badge>
						)}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="calendar">
					{isPending ? (
						<div className="flex items-center justify-center py-20">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					) : (
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
							<div className="lg:col-span-2 space-y-2">
								<h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
									<Calendar className="h-3.5 w-3.5" /> Événements à venir
								</h3>
								{upcomingEvents.length === 0 ? (
									<FlatCard><div className="p-3 lg:p-4 flex flex-col items-center justify-center py-12 text-center">
										<Calendar className="h-10 w-10 text-muted-foreground/30 mb-3" />
										<p className="text-sm text-muted-foreground">Aucun événement planifié</p>
									</div></FlatCard>
								) : (
									<ScrollArea className="h-[calc(100vh-340px)]">
										<div className="space-y-2 pr-2">
											{upcomingEvents.slice(0, 10).map((ev) => (
												<EventCard key={ev.id} event={ev} />
											))}
										</div>
									</ScrollArea>
								)}
							</div>

							{/* Sidebar */}
							<div className="space-y-4">
								<FlatCard><div className="p-3 lg:p-4 space-y-4">
									<div className="flex items-center justify-between">
										<Button size="icon" variant="ghost" className="h-8 w-8"
											onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
										><ChevronLeft className="h-4 w-4" /></Button>
										<h4 className="text-sm font-semibold capitalize">{format(currentMonth, "MMMM yyyy", { locale: fr })}</h4>
										<Button size="icon" variant="ghost" className="h-8 w-8"
											onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
										><ChevronRight className="h-4 w-4" /></Button>
									</div>
									<div className="grid grid-cols-7 gap-1 text-center">
										{["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
											<div key={`${d}-${i}`} className="h-6 text-[10px] font-semibold text-muted-foreground flex items-center justify-center">{d}</div>
										))}
										{Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} className="h-7" />)}
										{Array.from({ length: daysInMonth }).map((_, i) => {
											const day = i + 1;
											const dayEvents = getEventsForDay(day);
											const isTodayDay = isToday(day);
											return (
												<div key={day} className={cn(
													"h-7 text-xs font-medium rounded-md flex flex-col items-center justify-center relative",
													isTodayDay ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted/50",
												)}>
													{day}
													{dayEvents.length > 0 && (
														<div className="absolute bottom-0 flex gap-0.5">
															{dayEvents.slice(0, 3).map((ev, j) => {
																const style = EVENT_TYPE_STYLE[ev.type] ?? EVENT_TYPE_STYLE.diplomacy;
																return <div key={j} className={cn("h-1 w-1 rounded-full", style.dotColor)} />;
															})}
														</div>
													)}
												</div>
											);
										})}
									</div>
								</div></FlatCard>

								<FlatCard><div className="p-3 lg:p-4">
									<h4 className="text-xs font-semibold text-muted-foreground mb-2">Statuts</h4>
									<div className="space-y-1">
										{Object.entries(STATUS_CONFIG).slice(0, 5).map(([key, { label, dotColor }]) => (
											<div key={key} className="flex items-center gap-2 text-xs">
												<div className={cn("h-2 w-2 rounded-full", dotColor)} />
												<span>{label}</span>
											</div>
										))}
									</div>
								</div></FlatCard>

								<FlatCard><div className="p-3 lg:p-4">
									<h4 className="text-xs font-semibold text-muted-foreground mb-2">Résumé</h4>
									<div className="space-y-1.5 text-sm">
										<div className="flex justify-between"><span className="text-muted-foreground">À venir</span><span className="font-semibold">{upcomingEvents.length}</span></div>
										<div className="flex justify-between"><span className="text-muted-foreground">Ce mois</span><span className="font-semibold">{thisMonth}</span></div>
										<div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold">{allEvents.length}</span></div>
									</div>
								</div></FlatCard>
							</div>
						</div>
					)}
				</TabsContent>

				<TabsContent value="events">
					<div className="space-y-6 mt-4">
						{upcomingEvents.length > 0 && (
							<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
								<h3 className="text-sm font-semibold text-muted-foreground mb-3">À venir ({upcomingEvents.length})</h3>
								<div className="space-y-2">{upcomingEvents.map((ev) => <EventCard key={ev.id} event={ev} />)}</div>
							</motion.div>
						)}
						{pastEvents.length > 0 && (
							<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
								<h3 className="text-sm font-semibold text-muted-foreground mb-3">Passés ({pastEvents.length})</h3>
								<div className="space-y-2 opacity-60">{pastEvents.map((ev) => <EventCard key={ev.id} event={ev} />)}</div>
							</motion.div>
						)}
						{allEvents.length === 0 && !isPending && (
							<div className="text-center py-16 text-muted-foreground text-sm">Aucun événement</div>
						)}
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}

// ─── Event Card (identique agent-web) ─────────────────────────
function EventCard({ event }: { event: AgendaEvent }) {
	const statusInfo = STATUS_CONFIG[event.status ?? "active"] ?? STATUS_CONFIG.active;
	const typeStyle = EVENT_TYPE_STYLE[event.type] ?? EVENT_TYPE_STYLE.diplomacy;

	return (
		<FlatCard className="hover:ring-1 hover:ring-primary/20 transition-colors">
			<div className="p-3">
				<div className="flex items-start gap-3">
					<div className="shrink-0 text-center bg-primary/10 rounded-lg p-2 min-w-[52px]">
						<span className="text-lg font-bold text-primary block leading-none">
							{event.date ? format(new Date(event.date + "T00:00:00"), "dd") : "—"}
						</span>
						<span className="text-[10px] font-medium uppercase text-primary/70">
							{event.date ? format(new Date(event.date + "T00:00:00"), "MMM", { locale: fr }) : ""}
						</span>
					</div>
					<div className="flex-1 min-w-0 space-y-1.5">
						<div className="flex items-start justify-between gap-2">
							<p className="text-sm font-medium truncate">{event.title}</p>
							<Badge variant="outline" className={cn("text-[10px] border shrink-0", statusInfo.color)}>{statusInfo.label}</Badge>
						</div>
						<div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
							<span className="flex items-center gap-1"><Clock className="h-3 w-3" />{event.time}{event.endTime ? ` — ${event.endTime}` : ""}</span>
							{event.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.location}</span>}
							{event.attendees.length > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{event.attendees.length}</span>}
						</div>
						<div className="flex items-center gap-1.5">
							<div className={cn("h-2 w-2 rounded-full", typeStyle.dotColor)} />
							<span className="text-[10px] text-muted-foreground">{typeStyle.label}</span>
							{event.source === "diplomatic" && (
								<Badge variant="outline" className="text-[8px] h-3.5 px-1 border-emerald-500/30 text-emerald-600">
									<Globe className="h-2 w-2 mr-0.5" /> Diplomatique
								</Badge>
							)}
						</div>
					</div>
				</div>
			</div>
		</FlatCard>
	);
}
