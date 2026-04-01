/**
 * iAgenda — Agenda Diplomatique & Consulaire (Desktop)
 *
 * Calendrier integre avec :
 * - Evenements diplomatiques (communityEvents)
 * - Rendez-vous consulaires (appointments)
 * - Vues calendrier + liste
 */

import { api } from "@convex/_generated/api";
import {
	Calendar,
	ChevronLeft,
	ChevronRight,
	Clock,
	Grid,
	List,
	Loader2,
	MapPin,
	Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useOrg } from "../../hooks/useOrg";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
	useAuthenticatedConvexQuery,
} from "../../hooks/useConvexHooks";
import { usePaginatedQuery } from "convex/react";
import { cn } from "../../lib/utils";

// --- Types --------------------------------------------------------------

interface AgendaEvent {
	id: string;
	title: string;
	type: string;
	date: string; // YYYY-MM-DD
	time: string; // HH:MM
	endTime?: string;
	location: string;
	attendees: string[];
	description: string;
	source: "diplomatic" | "appointment";
	status?: string;
}

// --- Config -------------------------------------------------------------

const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
	// Evenements diplomatiques
	reunion_diplomatique: { label: "Reunion diplomatique", color: "bg-blue-500/15 text-blue-400 border-blue-500/20", dot: "bg-blue-400" },
	conference: { label: "Conference", color: "bg-purple-500/15 text-purple-400 border-purple-500/20", dot: "bg-purple-400" },
	ceremonie: { label: "Ceremonie", color: "bg-red-500/15 text-red-400 border-red-500/20", dot: "bg-red-400" },
	audience: { label: "Audience", color: "bg-green-500/15 text-green-400 border-green-500/20", dot: "bg-green-400" },
	visite_officielle: { label: "Visite officielle", color: "bg-orange-500/15 text-orange-400 border-orange-500/20", dot: "bg-orange-400" },
	reception: { label: "Reception", color: "bg-pink-500/15 text-pink-400 border-pink-500/20", dot: "bg-pink-400" },
	diplomacy: { label: "Diplomatie", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
	celebration: { label: "Celebration", color: "bg-amber-500/15 text-amber-400 border-amber-500/20", dot: "bg-amber-400" },
	culture: { label: "Culture", color: "bg-violet-500/15 text-violet-400 border-violet-500/20", dot: "bg-violet-400" },
	sport: { label: "Sport", color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20", dot: "bg-cyan-400" },
	charity: { label: "Charite", color: "bg-rose-500/15 text-rose-400 border-rose-500/20", dot: "bg-rose-400" },
	// Rendez-vous consulaires
	appointment: { label: "Rendez-vous", color: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20", dot: "bg-indigo-400" },
};

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// --- Helpers ------------------------------------------------------------

function getMonday(date: Date): number {
	const day = date.getDay();
	return day === 0 ? 6 : day - 1; // Convertir Dim=0 -> 6, Lun=1 -> 0
}

function formatDateLocalized(dateStr: string, locale: string): string {
	const d = new Date(dateStr);
	return d.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
}

// --- Component ----------------------------------------------------------

export function IAgendaPage() {
	const { t, i18n } = useTranslation();
	const [currentDate, setCurrentDate] = useState(new Date());
	const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
	const [selectedDate, setSelectedDate] = useState<string | null>(null);
	const { orgId } = useOrg();

	// -- Donnees Convex --
	const { results: rawCommunityEvents, isLoading: eventsLoading } = usePaginatedQuery(
		api.functions.communityEvents.listAll,
		{},
		{ initialNumItems: 200 },
	);

	const { data: rawAppointments = [], isPending: appointmentsLoading } = useAuthenticatedConvexQuery(
		api.functions.slots.listAppointmentsByOrg,
		orgId ? { orgId } : "skip",
	);

	const isPending = eventsLoading || appointmentsLoading;

	// -- Fusionner les deux sources --
	const allEvents: AgendaEvent[] = useMemo(() => {
		const diplomaticEvents: AgendaEvent[] = (rawCommunityEvents as any[]).map((e) => ({
			id: e._id,
			title: e.title ?? t("desktop.iagenda.event", "Evenement"),
			type: e.category ?? "diplomacy",
			date: e.date ? new Date(e.date).toISOString().split("T")[0] : new Date(e._creationTime).toISOString().split("T")[0],
			time: "09:00",
			location: e.location ?? "",
			attendees: [],
			description: e.description ?? "",
			source: "diplomatic" as const,
			status: e.status,
		}));

		const appointmentEvents: AgendaEvent[] = (rawAppointments as any[]).map((a) => ({
			id: a._id,
			title: a.service?.name?.fr ?? a.service?.name ?? t("desktop.iagenda.appointment", "Rendez-vous"),
			type: "appointment",
			date: a.date ?? "",
			time: a.time ?? "09:00",
			endTime: a.endTime,
			location: "",
			attendees: a.attendee ? [`${a.attendee.firstName ?? ""} ${a.attendee.lastName ?? ""}`] : [],
			description: a.attendee?.email ?? "",
			source: "appointment" as const,
			status: a.status,
		}));

		return [...diplomaticEvents, ...appointmentEvents].sort((a, b) => {
			const dateA = `${a.date}T${a.time}`;
			const dateB = `${b.date}T${b.time}`;
			return dateA.localeCompare(dateB);
		});
	}, [rawCommunityEvents, rawAppointments, t]);

	// -- Calendrier --
	const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
	const firstDayOfMonth = getMonday(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
	const monthName = currentDate.toLocaleDateString(i18n.language, { month: "long", year: "numeric" });

	const calendarDays: (number | null)[] = [];
	for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push(null);
	for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

	const getEventsForDay = (day: number) => {
		const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
		return allEvents.filter((e) => e.date === dateStr);
	};

	const today = new Date();
	const isToday = (day: number) =>
		day === today.getDate() &&
		currentDate.getMonth() === today.getMonth() &&
		currentDate.getFullYear() === today.getFullYear();

	// Evenements filtres pour la liste
	const listEvents = selectedDate
		? allEvents.filter((e) => e.date === selectedDate)
		: allEvents.filter((e) => {
			const eventMonth = new Date(e.date).getMonth();
			const eventYear = new Date(e.date).getFullYear();
			return eventMonth === currentDate.getMonth() && eventYear === currentDate.getFullYear();
		});

	// Stats
	const monthEventCount = allEvents.filter((e) => {
		const d = new Date(e.date);
		return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
	}).length;

	const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
	const todayCount = allEvents.filter((e) => e.date === todayStr).length;

	return (
		<div className="flex flex-col gap-4 p-4 lg:p-6 h-full overflow-y-auto">
			{/* Header */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2 }}
				className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
			>
				<div className="flex items-center gap-3">
					<div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
						<Calendar className="h-5 w-5 text-blue-500" />
					</div>
					<div>
						<h1 className="text-xl font-bold">iAgenda</h1>
						<p className="text-sm text-muted-foreground">
							{t("desktop.iagenda.subtitle", "Evenements diplomatiques & rendez-vous consulaires")}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{/* Stats badges */}
					<Badge variant="outline" className="text-xs">
						{monthEventCount} {t("desktop.iagenda.thisMonth", "ce mois")}
					</Badge>
					{todayCount > 0 && (
						<Badge className="text-xs bg-blue-500/15 text-blue-400 border-blue-500/20">
							{todayCount} {t("desktop.iagenda.today", "aujourd'hui")}
						</Badge>
					)}
					{/* View toggle */}
					<div className="flex items-center border border-border/50 rounded-lg p-0.5 bg-muted/30">
						<button
							type="button"
							onClick={() => setViewMode("calendar")}
							className={cn("p-1.5 rounded-md transition-colors", viewMode === "calendar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
						>
							<Grid className="h-4 w-4" />
						</button>
						<button
							type="button"
							onClick={() => setViewMode("list")}
							className={cn("p-1.5 rounded-md transition-colors", viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
						>
							<List className="h-4 w-4" />
						</button>
					</div>
				</div>
			</motion.div>

			{/* Month navigation */}
			<div className="flex items-center justify-between">
				<Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}>
					<ChevronLeft className="h-4 w-4" />
				</Button>
				<h2 className="text-lg font-semibold capitalize">{monthName}</h2>
				<Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}>
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>

			{isPending ? (
				<div className="flex items-center justify-center h-64">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</div>
			) : viewMode === "calendar" ? (
				/* === CALENDAR VIEW === */
				<Card className="flex-1">
					<CardContent className="p-3">
						{/* Day headers */}
						<div className="grid grid-cols-7 gap-1 mb-1">
							{DAYS_FR.map((d) => (
								<div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1.5">
									{d}
								</div>
							))}
						</div>

						{/* Days grid */}
						<div className="grid grid-cols-7 gap-1">
							{calendarDays.map((day, idx) => {
								if (!day) return <div key={`empty-${idx}`} className="min-h-[80px]" />;

								const dayEvents = getEventsForDay(day);
								const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
								const isSelected = selectedDate === dateStr;

								return (
									<button
										key={day}
										type="button"
										onClick={() => {
											setSelectedDate(isSelected ? null : dateStr);
											if (!isSelected) setViewMode("list");
										}}
										className={cn(
											"min-h-[80px] p-1.5 rounded-lg border text-left transition-all",
											isToday(day)
												? "bg-primary/10 border-primary/30"
												: isSelected
													? "bg-muted border-primary/20"
													: "border-border/30 hover:border-border/60 hover:bg-muted/30",
										)}
									>
										<p className={cn(
											"text-xs font-semibold mb-1",
											isToday(day) ? "text-primary" : "text-foreground",
										)}>
											{day}
										</p>
										<div className="space-y-0.5">
											{dayEvents.slice(0, 2).map((event) => {
												const cfg = EVENT_TYPE_CONFIG[event.type] ?? EVENT_TYPE_CONFIG.diplomacy;
												return (
													<div
														key={event.id}
														className="flex items-center gap-1 text-[9px] leading-tight"
														title={event.title}
													>
														<span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />
														<span className="truncate text-foreground/80">{event.title}</span>
													</div>
												);
											})}
											{dayEvents.length > 2 && (
												<p className="text-[9px] text-muted-foreground pl-3">
													+{dayEvents.length - 2}
												</p>
											)}
										</div>
									</button>
								);
							})}
						</div>
					</CardContent>
				</Card>
			) : (
				/* === LIST VIEW === */
				<Card className="flex-1">
					<CardContent className="p-0">
						{selectedDate && (
							<div className="px-4 py-2 border-b flex items-center justify-between">
								<p className="text-sm font-medium">
									{formatDateLocalized(selectedDate, i18n.language)}
								</p>
								<Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)} className="text-xs">
									{t("desktop.iagenda.viewWholeMonth", "Voir tout le mois")}
								</Button>
							</div>
						)}
						<ScrollArea className="h-[calc(100vh-340px)]">
							{listEvents.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-16 text-center">
									<Calendar className="h-10 w-10 text-muted-foreground/30 mb-3" />
									<p className="text-sm font-medium">{t("desktop.iagenda.noEvents", "Aucun evenement")}</p>
									<p className="text-xs text-muted-foreground mt-1">
										{selectedDate
											? t("desktop.iagenda.noEventsOnDate", "Aucun evenement a cette date")
											: t("desktop.iagenda.noEventsThisMonth", "Aucun evenement ce mois-ci")}
									</p>
								</div>
							) : (
								<div className="divide-y">
									{listEvents.map((event) => {
										const cfg = EVENT_TYPE_CONFIG[event.type] ?? EVENT_TYPE_CONFIG.diplomacy;
										return (
											<div key={event.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
												<div className="flex items-start gap-3">
													<div className={cn("h-2 w-2 rounded-full mt-1.5 shrink-0", cfg.dot)} />
													<div className="flex-1 min-w-0">
														<div className="flex items-center gap-2 flex-wrap">
															<p className="text-sm font-medium">{event.title}</p>
															<Badge variant="outline" className={cn("text-[9px] h-4", cfg.color)}>
																{cfg.label}
															</Badge>
															{event.source === "appointment" && (
																<Badge variant="outline" className="text-[9px] h-4 text-indigo-400">
																	{t("desktop.iagenda.appointmentBadge", "RDV")}
																</Badge>
															)}
														</div>
														{event.description && (
															<p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{event.description}</p>
														)}
														<div className="flex items-center gap-4 mt-1.5 text-[11px] text-muted-foreground">
															<span className="flex items-center gap-1">
																<Clock className="h-3 w-3" />
																{formatDateLocalized(event.date, i18n.language)} {t("desktop.iagenda.at", "a")} {event.time}
																{event.endTime && ` — ${event.endTime}`}
															</span>
															{event.location && (
																<span className="flex items-center gap-1">
																	<MapPin className="h-3 w-3" />
																	{event.location}
																</span>
															)}
															{event.attendees.length > 0 && (
																<span className="flex items-center gap-1">
																	<Users className="h-3 w-3" />
																	{event.attendees.length}
																</span>
															)}
														</div>
													</div>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</ScrollArea>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
