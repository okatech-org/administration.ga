/**
 * iAgenda — Mon Agenda
 *
 * Layout single-page sans scroll vertical (comme iProfil) :
 * Desktop  → 3 colonnes : Calendrier (4/12) | Mes RDV (5/12) | Prendre RDV (3/12)
 * Mobile   → scroll horizontal snap entre les 3 "pages"
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { RequestStatus } from "@convex/lib/constants";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	Calendar,
	CalendarPlus,
	Check,
	ClipboardList,
	Clock,
	FileText,
	Loader2,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
	AppointmentSlotPicker,
	type DynamicSlotSelection,
} from "@/components/appointments/AppointmentSlotPicker";
import { AgendaCalendar, type CalendarDayInfo } from "@/components/my-space/agenda-calendar";
import { AppointmentCard, type AppointmentData } from "@/components/my-space/appointment-card";
import { EmptyState } from "@/components/my-space/empty-state";
import { FlatCard } from "@/components/my-space/flat-card";
import { Button } from "@/components/ui/button";
import {
	useAuthenticatedConvexQuery,
	useAuthenticatedPaginatedQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { captureEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "confirmed" | "completed" | "cancelled";

// ═══════════════════════════════════════════════════════════════

const IAgendaPage = () => {
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [selectedDate, setSelectedDate] = useState<string | null>(null);
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

	// Prise de RDV
	const [bookStep, setBookStep] = useState<"select-request" | "select-slot" | "confirm">("select-request");
	const [selectedRequestId, setSelectedRequestId] = useState<Id<"requests"> | null>(null);
	const [selectedSlot, setSelectedSlot] = useState<DynamicSlotSelection | null>(null);
	const [isBooking, setIsBooking] = useState(false);

	// Mobile scroll
	const [mobilePageIndex, setMobilePageIndex] = useState(0);
	const mobileScrollRef = useRef<HTMLDivElement>(null);
	const handleMobileScroll = useCallback(() => {
		const el = mobileScrollRef.current;
		if (!el) return;
		const idx = Math.round(el.scrollLeft / el.clientWidth);
		setMobilePageIndex(idx);
	}, []);

	// ─── Convex ────────────────────────────────────────────────
	const { data: appointments, isPending } = useAuthenticatedConvexQuery(api.functions.slots.listMyAppointments, {});
	const { mutateAsync: cancelAppointment } = useConvexMutationQuery(api.functions.slots.cancelAppointment);
	const { mutateAsync: bookDynamicAppointment } = useConvexMutationQuery(api.functions.slots.bookDynamicAppointment);
	const { results: userRequests, isLoading: requestsLoading } = useAuthenticatedPaginatedQuery(
		api.functions.requests.listMine, {}, { initialNumItems: 50 },
	);

	// ─── Donnees derivees ──────────────────────────────────────
	const today = new Date().toISOString().split("T")[0];
	const allAppointments = useMemo(() => (appointments ?? []) as AppointmentData[], [appointments]);

	const upcomingAppointments = useMemo(
		() => allAppointments
			.filter((a) => a.status !== "cancelled" && a.date >= today)
			.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)),
		[allAppointments, today],
	);

	const pastAppointments = useMemo(
		() => allAppointments.filter((a) => a.date < today || a.status === "cancelled"),
		[allAppointments, today],
	);

	const dayInfoMap = useMemo(() => {
		const map = new Map<string, CalendarDayInfo>();
		for (const apt of allAppointments) {
			if (apt.status === "cancelled") continue;
			const existing = map.get(apt.date);
			if (existing) { existing.count++; existing.statuses.push(apt.status); }
			else map.set(apt.date, { date: apt.date, count: 1, statuses: [apt.status] });
		}
		return map;
	}, [allAppointments]);

	const selectedDayAppointments = useMemo(() => {
		if (!selectedDate) return [];
		return allAppointments.filter((a) => a.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time));
	}, [allAppointments, selectedDate]);

	const filteredAppointments = useMemo(() => {
		const all = [...upcomingAppointments, ...pastAppointments];
		if (statusFilter === "all") return all;
		return all.filter((a) => a.status === statusFilter);
	}, [upcomingAppointments, pastAppointments, statusFilter]);

	// Prise de RDV
	const requestsWithActiveAppointment = useMemo(() => {
		if (!appointments) return new Set<string>();
		return new Set(
			allAppointments.filter((a) => a.status === "confirmed" && a.date >= today)
				.map((a) => a.requestId).filter(Boolean) as string[],
		);
	}, [allAppointments, appointments, today]);

	const eligibleRequests = useMemo(() => {
		if (!userRequests) return [];
		return userRequests.filter((r) =>
			[RequestStatus.Submitted, RequestStatus.ReadyForPickup].includes(r.status) &&
			!requestsWithActiveAppointment.has(r._id),
		);
	}, [userRequests, requestsWithActiveAppointment]);

	const selectedRequest = useMemo(
		() => selectedRequestId && userRequests ? userRequests.find((r) => r._id === selectedRequestId) || null : null,
		[selectedRequestId, userRequests],
	);

	const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;
	const monthCount = allAppointments.filter((a) => a.status !== "cancelled" && a.date.startsWith(monthKey)).length;

	// ─── Handlers ──────────────────────────────────────────────
	const handleCancel = async (id: Id<"appointments">) => {
		try {
			await cancelAppointment({ appointmentId: id });
			captureEvent("myspace_appointment_cancelled");
			toast.success("Rendez-vous annulé");
		} catch { toast.error("Erreur lors de l'annulation"); }
	};

	const handleBook = async () => {
		if (!selectedSlot || !selectedRequestId || !selectedRequest) return;
		setIsBooking(true);
		try {
			await bookDynamicAppointment({
				orgId: selectedRequest.orgId, orgServiceId: selectedRequest.orgServiceId,
				date: selectedSlot.date, startTime: selectedSlot.startTime,
				appointmentType: "deposit", requestId: selectedRequestId,
			});
			captureEvent("myspace_appointment_scheduled", { service_type: selectedRequest.service?.name?.fr, is_online_meeting: false });
			toast.success("Rendez-vous réservé !");
			setBookStep("select-request"); setSelectedRequestId(null); setSelectedSlot(null);
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : "Erreur de réservation");
		} finally { setIsBooking(false); }
	};

	// ─── Section header reusable ───────────────────────────────
	const SectionHead = ({ icon: Icon, title, actions }: { icon: typeof Calendar; title: string; actions?: React.ReactNode }) => (
		<div className="flex items-center justify-between mb-3 shrink-0">
			<span className="text-sm font-bold flex items-center gap-2.5 text-muted-foreground">
				<div className="p-1.5 rounded-lg bg-foreground/[0.06] dark:bg-foreground/[0.12]">
					<Icon className="h-4 w-4 text-muted-foreground" />
				</div>
				{title}
			</span>
			{actions}
		</div>
	);

	// ═════════════════════════════════════════════════════════════
	// RENDER
	// ═════════════════════════════════════════════════════════════
	return (
		<div className="flex flex-col h-full min-h-0 overflow-hidden">
			{/* Header */}
			<div className="flex items-center justify-between gap-3 shrink-0 mb-4">
				<div className="flex items-center gap-3">
					<div className="p-1.5 rounded-lg bg-foreground/[0.06] dark:bg-foreground/[0.12]">
						<Calendar className="h-5 w-5 text-muted-foreground" />
					</div>
					<div>
						<h1 className="text-lg md:text-xl font-black tracking-tight">iAgenda</h1>
						<p className="text-xs text-muted-foreground font-medium hidden sm:block">Mon Agenda — Espace Citoyen</p>
					</div>
				</div>
				{/* Stats inline desktop */}
				<div className="hidden lg:flex items-center gap-3">
					{[
						{ label: "À venir", value: upcomingAppointments.length, accent: true },
						{ label: "Ce mois", value: monthCount },
						{ label: "Total", value: allAppointments.length },
					].map((s) => (
						<div key={s.label} className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full">
							<span className={cn("text-sm font-black", s.accent ? "text-primary" : "text-foreground")}>{isPending ? "—" : s.value}</span>
							<span className="text-[10px] font-bold text-muted-foreground uppercase">{s.label}</span>
						</div>
					))}
				</div>
			</div>

			{/* ─── Mobile : dots indicateurs + scroll horizontal snap ─── */}
			<div className="flex lg:hidden items-center justify-center gap-2 mb-3 shrink-0">
				{["Agenda", "Mes RDV", "Prendre RDV"].map((label, i) => (
					<button
						key={label}
						type="button"
						onClick={() => mobileScrollRef.current?.scrollTo({ left: i * (mobileScrollRef.current?.clientWidth ?? 0), behavior: "smooth" })}
						className={cn(
							"px-3 py-1.5 rounded-full text-xs font-medium transition-all",
							mobilePageIndex === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
						)}
					>
						{label}
					</button>
				))}
			</div>

			{/* ═══ DESKTOP : Grille 3 colonnes ═══ */}
			<motion.div
				initial={{ opacity: 0, y: 5 }}
				animate={{ opacity: 1, y: 0 }}
				className="hidden lg:grid lg:grid-cols-12 gap-4 flex-1 min-h-0 overflow-hidden"
			>
				{/* ─── COL 1 : Calendrier + Stats (4/12) ─── */}
				<div className="lg:col-span-4 flex flex-col gap-4 min-h-0 overflow-y-auto citizen-scrollbar">
					{/* Calendrier */}
					<FlatCard className="shrink-0">
						<div className="p-4">
							<AgendaCalendar
								currentMonth={currentMonth}
								onMonthChange={setCurrentMonth}
								selectedDate={selectedDate}
								onDateSelect={setSelectedDate}
								dayInfoMap={dayInfoMap}
								today={today}
							/>
						</div>
					</FlatCard>

					{/* RDV du jour selectionne */}
					{selectedDate && (
						<FlatCard className="shrink-0">
							<div className="p-4">
								<div className="flex items-center justify-between mb-3">
									<span className="text-sm font-bold flex items-center gap-2 text-foreground capitalize">
										{format(new Date(selectedDate + "T00:00:00"), "EEE d MMM", { locale: fr })}
										{selectedDate === today && (
											<span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/25 text-green-700 dark:text-green-400 font-bold">
												Aujourd'hui
											</span>
										)}
									</span>
									<button type="button" onClick={() => setSelectedDate(null)} className="text-xs font-medium text-muted-foreground hover:text-foreground">
										Effacer
									</button>
								</div>
								{selectedDayAppointments.length === 0 ? (
									<p className="text-sm text-muted-foreground py-4 text-center">Aucun RDV ce jour</p>
								) : (
									<div className="space-y-2">
										{selectedDayAppointments.map((apt) => (
											<AppointmentCard key={apt._id} appointment={apt} onCancel={handleCancel} compact />
										))}
									</div>
								)}
							</div>
						</FlatCard>
					)}

					{/* Legende */}
					<FlatCard className="shrink-0">
						<div className="p-4">
							<SectionHead icon={Calendar} title="Légende" />
							<div className="grid grid-cols-2 gap-2">
								{[
									{ label: "Confirmé", dot: "bg-success" },
									{ label: "Complété", dot: "bg-primary" },
									{ label: "Annulé", dot: "bg-destructive" },
									{ label: "Absent", dot: "bg-warning" },
								].map((item) => (
									<div key={item.label} className="flex items-center gap-2 text-xs">
										<span className={cn("w-2 h-2 rounded-full shrink-0", item.dot)} />
										<span className="text-muted-foreground font-medium">{item.label}</span>
									</div>
								))}
							</div>
						</div>
					</FlatCard>
				</div>

				{/* ─── COL 2 : Mes Rendez-vous (5/12) ─── */}
				<div className="lg:col-span-5 flex flex-col min-h-0 overflow-hidden">
					<FlatCard className="flex-1 flex flex-col overflow-hidden">
						<div className="p-4 flex flex-col flex-1 min-h-0">
							<SectionHead
								icon={ClipboardList}
								title="Mes Rendez-vous"
								actions={
									<span className="text-[10px] bg-foreground/[0.06] dark:bg-foreground/[0.12] text-muted-foreground font-bold px-2 py-0.5 rounded-full">
										{allAppointments.length}
									</span>
								}
							/>

							{/* Filtres */}
							<div className="flex flex-wrap items-center gap-1.5 mb-3 shrink-0">
								{(["all", "confirmed", "completed", "cancelled"] as StatusFilter[]).map((s) => (
									<button key={s} type="button" onClick={() => setStatusFilter(s)}
										className={cn("h-7 px-3 rounded-full text-[11px] font-medium transition-all active:scale-[0.97]",
											statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70")}>
										{{ all: "Tous", confirmed: "Confirmés", completed: "Complétés", cancelled: "Annulés" }[s]}
									</button>
								))}
							</div>

							{/* Liste scrollable */}
							<div className="flex-1 overflow-y-auto citizen-scrollbar space-y-2">
								{isPending ? (
									<div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>
								) : filteredAppointments.length === 0 ? (
									<EmptyState
										icon={<Calendar />}
										title="Aucun rendez-vous"
										description={statusFilter !== "all" ? "Modifiez vos filtres" : "Prenez votre premier rendez-vous"}
									/>
								) : (
									filteredAppointments.map((apt) => (
										<AppointmentCard
											key={apt._id}
											appointment={apt}
											onCancel={handleCancel}
											showActions={apt.date >= today}
											compact
										/>
									))
								)}
							</div>
						</div>
					</FlatCard>
				</div>

				{/* ─── COL 3 : Prendre RDV (3/12) ─── */}
				<div className="lg:col-span-3 flex flex-col min-h-0 overflow-hidden">
					<FlatCard className="flex-1 flex flex-col overflow-hidden">
						<div className="p-4 flex flex-col flex-1 min-h-0">
							<SectionHead icon={CalendarPlus} title="Prendre RDV" />

							<div className="flex-1 overflow-y-auto citizen-scrollbar">
								{/* Step 1 */}
								{bookStep === "select-request" && (
									<div className="space-y-3">
										<p className="text-xs text-muted-foreground">
											Sélectionnez une demande éligible.
										</p>
										{requestsLoading ? (
											<div className="flex justify-center py-6"><Loader2 className="animate-spin h-5 w-5 text-primary" /></div>
										) : eligibleRequests.length === 0 ? (
											<EmptyState
												icon={<FileText />}
												title="Aucune demande éligible"
												action={
													<Button variant="ghost" size="sm" className="h-8 px-3 text-xs font-medium text-foreground bg-muted hover:bg-muted/70 rounded-full" asChild>
														<Link to="/my-space/services-demarches">Mes démarches</Link>
													</Button>
												}
											/>
										) : (
											eligibleRequests.map((req) => (
												<button
													type="button"
													key={req._id}
													onClick={() => { setSelectedRequestId(req._id); setSelectedSlot(null); setBookStep("select-slot"); }}
													className={cn(
														"w-full p-3 rounded-xl border text-left transition-all active:scale-[0.98]",
														selectedRequestId === req._id ? "border-primary bg-primary/5" : "flat-card-border hover:border-foreground/15",
													)}
												>
													<div className="flex items-center gap-2.5">
														<div className="p-1.5 rounded-lg bg-foreground/[0.06] dark:bg-foreground/[0.12] shrink-0">
															<FileText className="h-4 w-4 text-muted-foreground" />
														</div>
														<div className="flex-1 min-w-0">
															<p className="text-sm font-bold truncate">{req.service?.name?.fr || "Demande"}</p>
															<p className="text-[11px] text-muted-foreground">Réf. {req.reference}</p>
														</div>
													</div>
												</button>
											))
										)}
									</div>
								)}

								{/* Step 2 */}
								{bookStep === "select-slot" && selectedRequest && (
									<div className="space-y-3">
										<div className="flex items-center gap-2">
											<Button variant="ghost" size="sm" onClick={() => setBookStep("select-request")}
												className="h-7 px-3 text-xs font-medium text-foreground bg-muted hover:bg-muted/70 rounded-full">
												← Retour
											</Button>
										</div>
										<p className="text-xs text-muted-foreground font-medium truncate">
											{selectedRequest.service?.name?.fr}
										</p>
										<AppointmentSlotPicker
											orgId={selectedRequest.orgId}
											orgServiceId={selectedRequest.orgServiceId}
											appointmentType="deposit"
											onSlotSelected={(slot) => { setSelectedSlot(slot); if (slot) setBookStep("confirm"); }}
											selectedSlot={selectedSlot}
										/>
									</div>
								)}

								{/* Step 3 */}
								{bookStep === "confirm" && selectedSlot && selectedRequest && (
									<div className="space-y-4">
										<div className="bg-muted rounded-xl p-3 space-y-2.5">
											<div className="flex items-center gap-2.5">
												<div className="p-1.5 rounded-lg bg-foreground/[0.06] dark:bg-foreground/[0.12]"><FileText className="h-4 w-4 text-muted-foreground" /></div>
												<div>
													<p className="text-sm font-bold">{selectedRequest.service?.name?.fr}</p>
													<p className="text-[11px] text-muted-foreground">Réf. {selectedRequest.reference}</p>
												</div>
											</div>
											<div className="flex items-center gap-2.5">
												<div className="p-1.5 rounded-lg bg-foreground/[0.06] dark:bg-foreground/[0.12]"><Calendar className="h-4 w-4 text-muted-foreground" /></div>
												<p className="text-sm font-bold capitalize">{format(new Date(selectedSlot.date), "EEE d MMM yyyy", { locale: fr })}</p>
											</div>
											<div className="flex items-center gap-2.5">
												<div className="p-1.5 rounded-lg bg-foreground/[0.06] dark:bg-foreground/[0.12]"><Clock className="h-4 w-4 text-muted-foreground" /></div>
												<p className="text-sm font-bold">{selectedSlot.startTime} — {selectedSlot.endTime}</p>
											</div>
										</div>
										<div className="flex flex-col gap-2">
											<Button className="w-full h-10 rounded-full active:scale-[0.97]" onClick={handleBook} disabled={isBooking}>
												{isBooking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
												Confirmer
											</Button>
											<Button variant="ghost" className="w-full h-9 text-xs font-medium text-foreground bg-muted hover:bg-muted/70 rounded-full" onClick={() => setBookStep("select-slot")}>
												← Modifier le créneau
											</Button>
										</div>
									</div>
								)}
							</div>
						</div>
					</FlatCard>
				</div>
			</motion.div>

			{/* ═══ MOBILE : Scroll horizontal snap (comme iProfil) ═══ */}
			<div
				ref={mobileScrollRef}
				onScroll={handleMobileScroll}
				className="flex lg:hidden flex-1 min-h-0 overflow-x-auto overflow-y-hidden snap-x snap-mandatory disable-scrollbars gap-3"
			>
				{/* Page 1 : Calendrier */}
				<div className="w-full shrink-0 snap-start h-full overflow-y-auto citizen-scrollbar space-y-3 p-0.5">
					<FlatCard>
						<div className="p-3">
							<AgendaCalendar
								currentMonth={currentMonth}
								onMonthChange={setCurrentMonth}
								selectedDate={selectedDate}
								onDateSelect={setSelectedDate}
								dayInfoMap={dayInfoMap}
								today={today}
							/>
						</div>
					</FlatCard>

					{/* Stats mobile */}
					<div className="grid grid-cols-3 gap-2">
						{[
							{ label: "À venir", value: upcomingAppointments.length, accent: true },
							{ label: "Ce mois", value: monthCount },
							{ label: "Total", value: allAppointments.length },
						].map((s) => (
							<div key={s.label} className="bg-card rounded-xl border flat-card-border p-2.5 text-center">
								<span className={cn("text-lg font-black block", s.accent ? "text-primary" : "text-foreground")}>{isPending ? "—" : s.value}</span>
								<span className="text-[10px] font-bold text-muted-foreground uppercase">{s.label}</span>
							</div>
						))}
					</div>

					{/* RDV du jour selectionne mobile */}
					{selectedDate && selectedDayAppointments.length > 0 && (
						<FlatCard>
							<div className="p-3 space-y-2">
								<div className="flex items-center justify-between">
									<span className="text-sm font-bold capitalize">{format(new Date(selectedDate + "T00:00:00"), "EEE d MMM", { locale: fr })}</span>
									<button type="button" onClick={() => setSelectedDate(null)} className="text-xs text-muted-foreground">Effacer</button>
								</div>
								{selectedDayAppointments.map((apt) => (
									<AppointmentCard key={apt._id} appointment={apt} onCancel={handleCancel} compact />
								))}
							</div>
						</FlatCard>
					)}
				</div>

				{/* Page 2 : Mes RDV */}
				<div className="w-full shrink-0 snap-start h-full overflow-y-auto citizen-scrollbar p-0.5">
					<FlatCard className="min-h-full flex flex-col">
						<div className="p-3 flex flex-col flex-1">
							<SectionHead
								icon={ClipboardList}
								title="Mes Rendez-vous"
								actions={
									<span className="text-[10px] bg-foreground/[0.06] dark:bg-foreground/[0.12] text-muted-foreground font-bold px-2 py-0.5 rounded-full">
										{allAppointments.length}
									</span>
								}
							/>
							<div className="flex flex-wrap items-center gap-1.5 mb-3">
								{(["all", "confirmed", "completed", "cancelled"] as StatusFilter[]).map((s) => (
									<button key={s} type="button" onClick={() => setStatusFilter(s)}
										className={cn("h-7 px-3 rounded-full text-[11px] font-medium transition-all",
											statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
										{{ all: "Tous", confirmed: "Confirmés", completed: "Complétés", cancelled: "Annulés" }[s]}
									</button>
								))}
							</div>
							<div className="space-y-2 flex-1">
								{isPending ? (
									<div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>
								) : filteredAppointments.length === 0 ? (
									<EmptyState icon={<Calendar />} title="Aucun rendez-vous" />
								) : (
									filteredAppointments.map((apt) => (
										<AppointmentCard key={apt._id} appointment={apt} onCancel={handleCancel} showActions={apt.date >= today} compact />
									))
								)}
							</div>
						</div>
					</FlatCard>
				</div>

				{/* Page 3 : Prendre RDV */}
				<div className="w-full shrink-0 snap-start h-full overflow-y-auto citizen-scrollbar p-0.5">
					<FlatCard className="min-h-full flex flex-col">
						<div className="p-3 flex flex-col flex-1">
							<SectionHead icon={CalendarPlus} title="Prendre RDV" />
							{bookStep === "select-request" && (
								<div className="space-y-3 flex-1">
									<p className="text-xs text-muted-foreground">Sélectionnez une demande éligible.</p>
									{requestsLoading ? (
										<div className="flex justify-center py-6"><Loader2 className="animate-spin h-5 w-5 text-primary" /></div>
									) : eligibleRequests.length === 0 ? (
										<EmptyState icon={<FileText />} title="Aucune demande éligible"
											action={<Button variant="ghost" size="sm" className="h-8 px-3 text-xs bg-muted rounded-full" asChild><Link to="/my-space/services-demarches">Mes démarches</Link></Button>} />
									) : (
										eligibleRequests.map((req) => (
											<button type="button" key={req._id}
												onClick={() => { setSelectedRequestId(req._id); setSelectedSlot(null); setBookStep("select-slot"); }}
												className={cn("w-full p-3 rounded-xl border text-left transition-all active:scale-[0.98]",
													selectedRequestId === req._id ? "border-primary bg-primary/5" : "flat-card-border")}>
												<div className="flex items-center gap-2.5">
													<div className="p-1.5 rounded-lg bg-foreground/[0.06] dark:bg-foreground/[0.12] shrink-0"><FileText className="h-4 w-4 text-muted-foreground" /></div>
													<div className="flex-1 min-w-0">
														<p className="text-sm font-bold truncate">{req.service?.name?.fr || "Demande"}</p>
														<p className="text-[11px] text-muted-foreground">Réf. {req.reference}</p>
													</div>
												</div>
											</button>
										))
									)}
								</div>
							)}
							{bookStep === "select-slot" && selectedRequest && (
								<div className="space-y-3 flex-1">
									<Button variant="ghost" size="sm" onClick={() => setBookStep("select-request")}
										className="h-7 px-3 text-xs bg-muted rounded-full">← Retour</Button>
									<AppointmentSlotPicker orgId={selectedRequest.orgId} orgServiceId={selectedRequest.orgServiceId}
										appointmentType="deposit" onSlotSelected={(slot) => { setSelectedSlot(slot); if (slot) setBookStep("confirm"); }} selectedSlot={selectedSlot} />
								</div>
							)}
							{bookStep === "confirm" && selectedSlot && selectedRequest && (
								<div className="space-y-4 flex-1">
									<div className="bg-muted rounded-xl p-3 space-y-2.5">
										<div className="flex items-center gap-2.5">
											<div className="p-1.5 rounded-lg bg-foreground/[0.06] dark:bg-foreground/[0.12]"><FileText className="h-4 w-4 text-muted-foreground" /></div>
											<p className="text-sm font-bold">{selectedRequest.service?.name?.fr}</p>
										</div>
										<div className="flex items-center gap-2.5">
											<div className="p-1.5 rounded-lg bg-foreground/[0.06] dark:bg-foreground/[0.12]"><Calendar className="h-4 w-4 text-muted-foreground" /></div>
											<p className="text-sm font-bold capitalize">{format(new Date(selectedSlot.date), "EEE d MMM yyyy", { locale: fr })}</p>
										</div>
										<div className="flex items-center gap-2.5">
											<div className="p-1.5 rounded-lg bg-foreground/[0.06] dark:bg-foreground/[0.12]"><Clock className="h-4 w-4 text-muted-foreground" /></div>
											<p className="text-sm font-bold">{selectedSlot.startTime} — {selectedSlot.endTime}</p>
										</div>
									</div>
									<Button className="w-full h-10 rounded-full" onClick={handleBook} disabled={isBooking}>
										{isBooking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}Confirmer
									</Button>
									<Button variant="ghost" className="w-full h-8 text-xs bg-muted rounded-full" onClick={() => setBookStep("select-slot")}>← Modifier</Button>
								</div>
							)}
						</div>
					</FlatCard>
				</div>
			</div>
		</div>
	);
};

export const Route = createFileRoute("/my-space/iagenda")({
	component: IAgendaPage,
});
