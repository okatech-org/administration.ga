"use client";

/**
 * iAgenda -- Mon Agenda
 *
 * Appointment and calendar management for citizens.
 * Tab 1: Mini-calendar view with upcoming appointments and stats.
 * Tab 2: Full appointments list (upcoming + past) with cancel functionality.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	Calendar,
	ChevronLeft,
	ChevronRight,
	ClipboardList,
	Clock,
	ExternalLink,
	Loader2,
	MapPin,
	Plus,
	X,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { EmptyState } from "@/components/my-space/empty-state";
import { FlatCard } from "@/components/my-space/flat-card";
import { PageHeader } from "@/components/my-space/page-header";
import { SectionHeader } from "@/components/my-space/section-header";
import { TabSwitcher } from "@/components/my-space/tab-switcher";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { captureEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type ActiveTab = "calendar" | "appointments";

const statusConfig: Record<
	string,
	{ label: string; color: string; dotColor: string }
> = {
	confirmed: {
		label: "Confirme",
		color: "bg-green-500/10 text-green-600 border-green-500/20",
		dotColor: "bg-green-500",
	},
	completed: {
		label: "Complete",
		color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
		dotColor: "bg-blue-500",
	},
	cancelled: {
		label: "Annule",
		color: "bg-red-500/10 text-red-600 border-red-500/20",
		dotColor: "bg-red-500",
	},
	no_show: {
		label: "Absent",
		color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
		dotColor: "bg-amber-500",
	},
	rescheduled: {
		label: "Reprogramme",
		color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
		dotColor: "bg-purple-500",
	},
};

export default function IAgendaPage() {
	const { t } = useTranslation();
	const [activeTab, setActiveTab] = useState<ActiveTab>("calendar");
	const [currentMonth, setCurrentMonth] = useState(new Date());

	// Real appointments from Convex
	const { data: appointments, isPending } = useAuthenticatedConvexQuery(
		api.functions.slots.listMyAppointments,
		{},
	);

	const { mutateAsync: cancelAppointment } = useConvexMutationQuery(
		api.functions.slots.cancelAppointment,
	);

	const today = new Date().toISOString().split("T")[0];

	// Upcoming appointments (not cancelled, in the future)
	const upcomingAppointments = (appointments ?? [])
		.filter(
			(apt) =>
				apt.status !== "cancelled" && apt.date >= today,
		)
		.sort((a, b) => {
			const dateCompare = a.date.localeCompare(b.date);
			if (dateCompare !== 0) return dateCompare;
			return a.time.localeCompare(b.time);
		});

	// Past appointments (in the past or cancelled)
	const pastAppointments = (appointments ?? [])
		.filter(
			(apt) => apt.date < today || apt.status === "cancelled",
		);

	// Appointments in the current calendar month (for calendar dots)
	const monthAppointments = (appointments ?? []).filter(
		(apt) =>
			apt.status !== "cancelled" &&
			apt.date.startsWith(
				`${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`,
			),
	);

	const getDaysInMonth = (date: Date) => {
		return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
	};

	const getFirstDayOfMonth = (date: Date) => {
		// Adjust for Monday-first week (0=Mon, 6=Sun)
		const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
		return day === 0 ? 6 : day - 1;
	};

	const getStatusInfo = (status: string) => {
		return statusConfig[status] ?? statusConfig.confirmed;
	};

	const handleCancel = async (appointmentId: Id<"appointments">) => {
		try {
			await cancelAppointment({ appointmentId });
			captureEvent("myspace_appointment_cancelled");
			toast.success(t("appointments.cancelled"));
		} catch {
			toast.error(t("appointments.cancelError"));
		}
	};

	const getStatusBadge = (status: string) => {
		const info = getStatusInfo(status);
		return (
			<Badge variant="outline" className={cn("text-[10px] border", info.color)}>
				{info.label}
			</Badge>
		);
	};

	return (
		<div className="h-full flex flex-col bg-background">
			<PageHeader
				title="iAgenda"
				subtitle="Mon Agenda -- Espace Citoyen"
				icon={<Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
				iconBgClass="bg-blue-500/10"
				actions={
					<Button asChild>
						<Link href="/my-space/appointments/new">
							<Plus className="w-4 h-4 mr-2" />
							Prendre un rendez-vous
						</Link>
					</Button>
				}
			/>

			<div className="flex-1 flex flex-col gap-4 p-4 overflow-hidden">
				{/* Tab Switcher */}
				<TabSwitcher
					tabs={[
						{ key: "calendar", label: "Calendrier", icon: Calendar },
						{ key: "appointments", label: "Mes Rendez-vous", icon: ClipboardList, count: upcomingAppointments.length },
					]}
					activeTab={activeTab}
					onTabChange={(key) => setActiveTab(key as ActiveTab)}
				/>

				{/* Tab Content */}
				{activeTab === "calendar" ? (
					/* ===== TAB 1: CALENDRIER ===== */
					<div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
						{/* Upcoming Appointments */}
						<div className="lg:col-span-2 flex flex-col gap-3 overflow-hidden">
							<SectionHeader
								icon={<Calendar />}
								iconBgClass="bg-blue-500/10"
								iconTextClass="text-blue-600 dark:text-blue-400"
								title="Rendez-vous a venir"
								actions={
									<Button
										variant="ghost"
										size="sm"
										className="text-xs gap-1.5"
										onClick={() => setActiveTab("appointments")}
									>
										Voir tout
										<ExternalLink className="w-3 h-3" />
									</Button>
								}
							/>

							<div className="flex-1 space-y-2 overflow-y-auto">
								{isPending ? (
									<div className="flex items-center justify-center py-12">
										<Loader2 className="h-6 w-6 animate-spin text-primary" />
									</div>
								) : upcomingAppointments.length === 0 ? (
									<FlatCard>
										<EmptyState
											icon={<Calendar />}
											title="Aucun rendez-vous planifie"
											action={
												<Button size="sm" variant="outline" asChild>
													<Link href="/my-space/appointments/new">
														<Plus className="w-3.5 h-3.5 mr-1.5" />
														Prendre rendez-vous
													</Link>
												</Button>
											}
										/>
									</FlatCard>
								) : (
									upcomingAppointments.map((apt) => {
										const info = getStatusInfo(apt.status);
										return (
											<Link
												key={apt._id}
												href={`/my-space/appointments/${apt._id}`}
												className="block transition-transform hover:scale-[1.005] active:scale-[0.995]"
											>
												<FlatCard className="bg-linear-to-r from-muted/50 to-muted/30 hover:border-primary/30 transition-colors p-3">
													<div className="space-y-2">
														<div className="flex items-start justify-between gap-2">
															<div className="flex items-start gap-3 flex-1 min-w-0">
																{/* Date block */}
																<div className="shrink-0 text-center bg-primary/10 rounded-lg p-2 min-w-[52px]">
																	<span className="text-lg font-bold text-primary block leading-none">
																		{format(new Date(apt.date + "T00:00:00"), "dd")}
																	</span>
																	<span className="text-[10px] font-medium uppercase text-primary/70">
																		{format(new Date(apt.date + "T00:00:00"), "MMM", { locale: fr })}
																	</span>
																</div>

																<div className="flex-1 min-w-0">
																	<p className="text-sm font-medium">
																		Rendez-vous consulaire
																	</p>
																	{apt.org && (
																		<p className="text-xs text-muted-foreground truncate mt-0.5">
																			{typeof apt.org.name === "string"
																				? apt.org.name
																				: apt.org.name}
																		</p>
																	)}
																</div>
															</div>

															<Badge
																variant="outline"
																className={cn(
																	"text-[10px] border shrink-0",
																	info.color,
																)}
															>
																{info.label}
															</Badge>
														</div>

														<div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
															<div className="flex items-center gap-1">
																<Clock className="w-3 h-3" />
																<span>
																	{apt.time}
																	{apt.endTime && ` -- ${apt.endTime}`}
																</span>
															</div>
															{apt.org?.address && (
																<div className="flex items-center gap-1">
																	<MapPin className="w-3 h-3" />
																	<span className="truncate">
																		{apt.org.address.city}
																	</span>
																</div>
															)}
														</div>

														{apt.notes && (
															<p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
																{apt.notes}
															</p>
														)}
													</div>
												</FlatCard>
											</Link>
										);
									})
								)}
							</div>
						</div>

						{/* Mini Calendar + Legend */}
						<div className="flex flex-col gap-4">
							<FlatCard className="p-4">
								<div className="space-y-4">
									{/* Month Navigation */}
									<div className="flex items-center justify-between gap-2">
										<Button
											size="icon"
											variant="ghost"
											className="h-8 w-8"
											onClick={() =>
												setCurrentMonth(
													new Date(
														currentMonth.getFullYear(),
														currentMonth.getMonth() - 1,
													),
												)
											}
										>
											<ChevronLeft className="w-4 h-4" />
										</Button>
										<h4 className="text-sm font-semibold capitalize">
											{format(currentMonth, "MMMM yyyy", {
												locale: fr,
											})}
										</h4>
										<Button
											size="icon"
											variant="ghost"
											className="h-8 w-8"
											onClick={() =>
												setCurrentMonth(
													new Date(
														currentMonth.getFullYear(),
														currentMonth.getMonth() + 1,
													),
												)
											}
										>
											<ChevronRight className="w-4 h-4" />
										</Button>
									</div>

									{/* Weekday Headers */}
									<div className="grid grid-cols-7 gap-1 text-xs font-semibold text-center">
										{["L", "M", "M", "J", "V", "S", "D"].map(
											(day, i) => (
												<div
													key={`${day}-${i}`}
													className="h-6 flex items-center justify-center text-muted-foreground"
												>
													{day}
												</div>
											),
										)}
									</div>

									{/* Calendar Days */}
									<div className="grid grid-cols-7 gap-1">
										{Array.from({
											length: getFirstDayOfMonth(currentMonth),
										}).map((_, i) => (
											<div key={`empty-${i}`} className="h-7" />
										))}
										{Array.from({
											length: getDaysInMonth(currentMonth),
										}).map((_, i) => {
											const day = i + 1;
											const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
											const hasAppointment =
												monthAppointments.some(
													(apt) => apt.date === dateStr,
												);
											const isToday = dateStr === today;

											return (
												<button
													key={day}
													type="button"
													className={cn(
														"h-7 text-xs font-medium rounded-md flex flex-col items-center justify-center relative",
														isToday
															? "bg-primary text-primary-foreground font-bold"
															: hasAppointment
																? "bg-primary/15 text-foreground font-semibold"
																: "hover:bg-muted text-foreground/70",
													)}
												>
													{day}
													{hasAppointment && !isToday && (
														<span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary" />
													)}
												</button>
											);
										})}
									</div>
								</div>
							</FlatCard>

							{/* Legend */}
							<FlatCard className="p-4">
								<div className="space-y-2 text-xs">
									<p className="font-semibold mb-2">Statuts</p>
									{Object.entries(statusConfig).map(
										([key, config]) => (
											<div
												key={key}
												className="flex items-center gap-2"
											>
												<span
													className={cn(
														"w-2 h-2 rounded-full shrink-0",
														config.dotColor,
													)}
												/>
												<span className="text-muted-foreground">
													{config.label}
												</span>
											</div>
										),
									)}
								</div>
							</FlatCard>

							{/* Stats */}
							<FlatCard className="p-4">
								<div className="space-y-2 text-xs">
									<p className="font-semibold mb-2">Resume</p>
									<div className="flex justify-between">
										<span className="text-muted-foreground">
											A venir
										</span>
										<span className="font-semibold">
											{isPending ? "--" : upcomingAppointments.length}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">
											Ce mois
										</span>
										<span className="font-semibold">
											{isPending ? "--" : monthAppointments.length}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">
											Total
										</span>
										<span className="font-semibold">
											{isPending
												? "--"
												: (appointments ?? []).length}
										</span>
									</div>
								</div>
							</FlatCard>
						</div>
					</div>
				) : (
					/* ===== TAB 2: MES RENDEZ-VOUS ===== */
					<div className="flex-1 overflow-y-auto space-y-6">
						{isPending ? (
							<div className="flex justify-center p-8">
								<Loader2 className="animate-spin h-8 w-8 text-primary" />
							</div>
						) : (
							<>
								{/* Upcoming Appointments */}
								<motion.div
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.2, delay: 0.1 }}
								>
									<h2 className="text-lg font-semibold mb-4">
										{t("appointments.upcoming")}
									</h2>
									<div className="grid gap-4">
										{upcomingAppointments.length === 0 ? (
											<FlatCard>
												<EmptyState
													icon={<Calendar />}
													title={t("appointments.empty")}
													action={
														<Button size="sm" variant="outline" asChild>
															<Link href="/my-space/appointments/new">
																<Plus className="w-3.5 h-3.5 mr-1.5" />
																Prendre rendez-vous
															</Link>
														</Button>
													}
												/>
											</FlatCard>
										) : (
											upcomingAppointments.map((apt) => (
												<Link
													key={apt._id}
													href={`/my-space/appointments/${apt._id}`}
													className="block transition-transform hover:scale-[1.01] active:scale-[0.99]"
												>
													<FlatCard>
														<div className="flex flex-col sm:flex-row border-l-4 border-l-primary h-full">
															<div className="bg-muted p-4 flex flex-col items-center justify-center min-w-[120px] text-center border-b sm:border-b-0 sm:border-r">
																<span className="text-3xl font-bold text-primary">
																	{format(new Date(apt.date), "dd", { locale: fr })}
																</span>
																<span className="text-sm uppercase font-medium text-muted-foreground">
																	{format(new Date(apt.date), "MMM yyyy", { locale: fr })}
																</span>
																<div className="mt-2 flex items-center gap-1 text-sm font-semibold">
																	<Clock className="h-3 w-3" />
																	{apt.time}
																</div>
															</div>
															<div className="flex-1 p-4 sm:p-6 flex flex-col justify-between gap-4">
																<div>
																	<div className="flex justify-between items-start mb-2">
																		<h3 className="font-semibold text-lg">
																			{t("appointments.consularAppointment")}
																		</h3>
																		{getStatusBadge(apt.status)}
																	</div>
																	{apt.org && (
																		<div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
																			<MapPin className="h-4 w-4" />
																			<span>
																				{apt.org.name}
																				{apt.org.address && ` -- ${apt.org.address.city}`}
																			</span>
																		</div>
																	)}
																	{apt.endTime && (
																		<p className="text-xs text-muted-foreground">
																			{apt.time} - {apt.endTime}
																		</p>
																	)}
																	{apt.notes && (
																		<p className="text-sm mt-3 bg-muted/50 p-2 rounded-md italic">
																			&ldquo;{apt.notes}&rdquo;
																		</p>
																	)}
																</div>

																{apt.status === "confirmed" && (
																	<div className="flex justify-end">
																		<AlertDialog>
																			<AlertDialogTrigger asChild>
																				<Button
																					variant="outline"
																					size="sm"
																					className="text-destructive hover:text-destructive"
																					onClick={(e) => {
																						e.preventDefault();
																						e.stopPropagation();
																					}}
																				>
																					<X className="mr-2 h-4 w-4" />
																					{t("appointments.cancel")}
																				</Button>
																			</AlertDialogTrigger>
																			<AlertDialogContent
																				onClick={(e) => e.stopPropagation()}
																			>
																				<AlertDialogHeader>
																					<AlertDialogTitle>
																						{t("appointments.cancelConfirmTitle")}
																					</AlertDialogTitle>
																					<AlertDialogDescription>
																						{t("appointments.cancelConfirmDesc")}
																					</AlertDialogDescription>
																				</AlertDialogHeader>
																				<AlertDialogFooter>
																					<AlertDialogCancel>
																						{t("common.cancel")}
																					</AlertDialogCancel>
																					<AlertDialogAction
																						onClick={() => handleCancel(apt._id)}
																						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
																					>
																						{t("appointments.confirmCancel")}
																					</AlertDialogAction>
																				</AlertDialogFooter>
																			</AlertDialogContent>
																		</AlertDialog>
																	</div>
																)}
															</div>
														</div>
													</FlatCard>
												</Link>
											))
										)}
									</div>
								</motion.div>

								{/* Past Appointments */}
								{pastAppointments.length > 0 && (
									<motion.div
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ duration: 0.2, delay: 0.2 }}
									>
										<h2 className="text-lg font-semibold mb-4 text-muted-foreground">
											{t("appointments.past")}
										</h2>
										<div className="grid gap-4 opacity-70">
											{pastAppointments.map((apt) => (
												<Link
													key={apt._id}
													href={`/my-space/appointments/${apt._id}`}
													className="block transition-transform hover:scale-[1.01] active:scale-[0.99]"
												>
													<FlatCard>
														<div className="flex flex-col sm:flex-row border-l-4 border-l-muted h-full">
															<div className="bg-muted/50 p-4 flex flex-col items-center justify-center min-w-[120px] text-center border-b sm:border-b-0 sm:border-r">
																<span className="text-2xl font-bold text-muted-foreground">
																	{format(new Date(apt.date), "dd", { locale: fr })}
																</span>
																<span className="text-xs uppercase font-medium text-muted-foreground">
																	{format(new Date(apt.date), "MMM yyyy", { locale: fr })}
																</span>
																<div className="mt-2 flex items-center gap-1 text-xs">
																	<Clock className="h-3 w-3" />
																	{apt.time}
																</div>
															</div>
															<div className="flex-1 p-4 flex items-center justify-between">
																<div>
																	<h3 className="font-medium">
																		{t("appointments.consularAppointment")}
																	</h3>
																	{apt.org && (
																		<p className="text-sm text-muted-foreground">
																			{apt.org.name}
																		</p>
																	)}
																</div>
																{getStatusBadge(apt.status)}
															</div>
														</div>
													</FlatCard>
												</Link>
											))}
										</div>
									</motion.div>
								)}
							</>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
