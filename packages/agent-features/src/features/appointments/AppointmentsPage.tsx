"use client";

import { api } from "@convex/_generated/api";
import { getLocalized } from "@convex/lib/utils";
import type { LocalizedString } from "@convex/lib/validators";
import { useRouter } from "@workspace/routing";
import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import type { LucideIcon } from "lucide-react";
import {
	Calendar,
	CalendarDays,
	Check,
	ChevronLeft,
	ChevronRight,
	Clock,
	Eye,
	FileText,
	List,
	Printer,
	User,
	UserX,
	X,
	XCircle,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useOrg } from "../../shell/org-provider";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { FlatCard } from "../../components/my-space/flat-card";
import { Combobox } from "@workspace/ui/components/combobox";
import { DataTable } from "@workspace/ui/components/data-table";
import { Input } from "@workspace/ui/components/input";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { useCanDoTask } from "../../hooks/useCanDoTask";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";
import { cn } from "@workspace/ui/lib/utils";
import {
	usePageContext,
	useRegisterPageAction,
} from "../../hooks/use-page-context";
import type { PageAction, PageEntity } from "../../stores/page-context-store";

// ─── Shared appointment type ─────────────────────────────────────────────────

export interface AppointmentItem {
	_id: string;
	status: string;
	date: string;
	time: string;
	endTime?: string;
	attendee?: { firstName?: string; lastName?: string; email?: string } | null;
	service?: { name?: LocalizedString } | null;
	request?: { _id: string; reference?: string; status?: string } | null;
	[key: string]: unknown;
}


// ─── Status helpers ──────────────────────────────────────────────────────────

type AppointmentStatusConfig = {
	color: string;
	bg: string;
	border: string;
	icon?: LucideIcon;
	label: string;
	labelKey: string;
};

const STATUS_CONFIG: Record<string, AppointmentStatusConfig> = {
	confirmed: {
		color: "text-emerald-400",
		bg: "bg-emerald-500/10",
		icon: Check,
		border: "border-emerald-500/30",
		label: "Confirmé",
		labelKey: "dashboard.appointments.statuses.confirmed",
	},
	completed: {
		color: "text-blue-400",
		bg: "bg-blue-500/10",
		icon: Check,
		border: "border-blue-500/30",
		label: "Terminé",
		labelKey: "dashboard.appointments.statuses.completed",
	},
	cancelled: {
		color: "text-red-400",
		bg: "bg-red-500/10",
		icon: XCircle,
		border: "border-red-500/30",
		label: "Annulé",
		labelKey: "dashboard.appointments.statuses.cancelled",
	},
	no_show: {
		color: "text-amber-400",
		bg: "bg-amber-500/10",
		icon: UserX,
		border: "border-amber-500/30",
		label: "Absent",
		labelKey: "dashboard.appointments.statuses.no_show",
	},
	rescheduled: {
		color: "text-purple-400",
		bg: "bg-purple-500/10",
		icon: Clock,
		border: "border-purple-500/30",
		label: "Reprogrammé",
		labelKey: "dashboard.appointments.statuses.rescheduled",
	},
};

const getStatusConfig = (status: string): AppointmentStatusConfig =>
	STATUS_CONFIG[status] ?? {
		color: "text-muted-foreground",
		bg: "bg-muted/50",
		icon: Clock,
		border: "border-border",
		label: status,
		labelKey: "",
	};

// ─── Main component ─────────────────────────────────────────────────────────

export default function DashboardAppointments() {
	const { activeOrgId } = useOrg();
	const { t } = useTranslation();
	const router = useRouter();
	const { canDo } = useCanDoTask(activeOrgId ?? undefined);
	const canManage = canDo("appointments.manage");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [dateFilter, setDateFilter] = useState<string>("");
	const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
	const [selectedDay, setSelectedDay] = useState<string | null>(null);

	// Calendar month state
	const [calendarMonth, setCalendarMonth] = useState(() => {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	});

	// ─── API queries ───────────────────────────────────────────────────────

	const queryArgs = activeOrgId
		? {
				orgId: activeOrgId,
				status: (statusFilter !== "all" ? statusFilter : undefined) as
					| "completed"
					| "cancelled"
					| "confirmed"
					| "no_show"
					| "rescheduled"
					| undefined,
				date: dateFilter || undefined,
				month: viewMode === "calendar" ? calendarMonth : undefined,
			}
		: "skip";

	const { data: appointments } = useAuthenticatedConvexQuery(
		api.functions.slots.listAppointmentsByOrg,
		queryArgs,
	);

	// ─── Mutations ─────────────────────────────────────────────────────────

	const { mutateAsync: cancelMutation } = useConvexMutationQuery(
		api.functions.slots.cancelAppointment,
	);
	const { mutateAsync: completeMutation } = useConvexMutationQuery(
		api.functions.slots.completeAppointment,
	);
	const { mutateAsync: noShowMutation } = useConvexMutationQuery(
		api.functions.slots.markNoShow,
	);

	const handleCancel = useCallback(
		async (appointmentId: string) => {
			try {
				await cancelMutation({ appointmentId: appointmentId as never });
				toast.success(t("dashboard.appointments.success.cancelled"));
			} catch {
				toast.error(t("dashboard.appointments.error.cancel"));
			}
		},
		[cancelMutation, t],
	);

	const handleComplete = useCallback(
		async (appointmentId: string) => {
			try {
				await completeMutation({ appointmentId: appointmentId as never });
				toast.success(t("dashboard.appointments.success.completed"));
			} catch {
				toast.error(t("dashboard.appointments.error.complete"));
			}
		},
		[completeMutation, t],
	);

	const handleNoShow = useCallback(
		async (appointmentId: string) => {
			try {
				await noShowMutation({ appointmentId: appointmentId as never });
				toast.success(t("dashboard.appointments.success.noShow"));
			} catch {
				toast.error(t("dashboard.appointments.error.noShow"));
			}
		},
		[noShowMutation, t],
	);

	// ─── Calendar logic ────────────────────────────────────────────────────

	const calendarDays = useMemo(() => {
		const [year, month] = calendarMonth.split("-").map(Number);
		const firstDay = new Date(year, month - 1, 1);
		const lastDay = new Date(year, month, 0);
		const daysInMonth = lastDay.getDate();

		// Monday-start: getDay() returns 0=Sun, we want Mon=0
		const startPad = (firstDay.getDay() + 6) % 7;

		const days: {
			date: string;
			day: number;
			isCurrentMonth: boolean;
			isToday: boolean;
		}[] = [];

		// Previous month padding
		const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
		for (let i = startPad - 1; i >= 0; i--) {
			const d = prevMonthLastDay - i;
			const prevMonth = month === 1 ? 12 : month - 1;
			const prevYear = month === 1 ? year - 1 : year;
			const dateStr = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
			days.push({
				date: dateStr,
				day: d,
				isCurrentMonth: false,
				isToday: false,
			});
		}

		// Current month days
		const now = new Date();
		const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
		for (let d = 1; d <= daysInMonth; d++) {
			const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
			days.push({
				date: dateStr,
				day: d,
				isCurrentMonth: true,
				isToday: dateStr === todayStr,
			});
		}

		// Next month padding (fill to complete 6 rows)
		const remainingSlots = 42 - days.length;
		for (let i = 1; i <= remainingSlots; i++) {
			const nextMonth = month === 12 ? 1 : month + 1;
			const nextYear = month === 12 ? year + 1 : year;
			const dateStr = `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
			days.push({
				date: dateStr,
				day: i,
				isCurrentMonth: false,
				isToday: false,
			});
		}

		return days;
	}, [calendarMonth]);

	const appointmentsByDate = useMemo(() => {
		if (!appointments) return {};
		const map: Record<string, typeof appointments> = {};
		for (const apt of appointments) {
			if (!map[apt.date]) map[apt.date] = [];
			map[apt.date].push(apt);
		}
		return map;
	}, [appointments]);

	// Stats
	const stats = useMemo(() => {
		if (!appointments)
			return { total: 0, confirmed: 0, completed: 0, cancelled: 0, noShow: 0 };
		return {
			total: appointments.length,
			confirmed: appointments.filter((a) => a.status === "confirmed").length,
			completed: appointments.filter((a) => a.status === "completed").length,
			cancelled: appointments.filter((a) => a.status === "cancelled").length,
			noShow: appointments.filter((a) => a.status === "no_show").length,
		};
	}, [appointments]);

	const selectedDayAppointments = useMemo(() => {
		if (!selectedDay || !appointmentsByDate[selectedDay]) return [];
		return appointmentsByDate[selectedDay].sort((a, b) =>
			a.time.localeCompare(b.time),
		);
	}, [selectedDay, appointmentsByDate]);

	// ─── Month navigation ──────────────────────────────────────────────────

	const handlePrevMonth = () => {
		const [year, month] = calendarMonth.split("-").map(Number);
		const prev =
			month === 1 ? new Date(year - 1, 11, 1) : new Date(year, month - 2, 1);
		setCalendarMonth(
			`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`,
		);
		setSelectedDay(null);
	};

	const handleNextMonth = () => {
		const [year, month] = calendarMonth.split("-").map(Number);
		const next =
			month === 12 ? new Date(year + 1, 0, 1) : new Date(year, month, 1);
		setCalendarMonth(
			`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`,
		);
		setSelectedDay(null);
	};

	const handleToday = () => {
		const now = new Date();
		setCalendarMonth(
			`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
		);
		const todayStr = now.toISOString().split("T")[0];
		setSelectedDay(todayStr);
	};

	const formatMonthYear = () => {
		const [year, month] = calendarMonth.split("-").map(Number);
		return new Date(year, month - 1, 1).toLocaleDateString(
			t("common.locale", { defaultValue: "fr-FR" }),
			{
				month: "long",
				year: "numeric",
			},
		);
	};

	const formatSelectedDay = (dateStr: string) => {
		const d = new Date(`${dateStr}T12:00:00`);
		return d.toLocaleDateString(t("common.locale", { defaultValue: "fr-FR" }), {
			weekday: "long",
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	};

	// ─── Table Columns ───────────────────────────────────────────────────────

	const columns = useMemo<ColumnDef<AppointmentItem>[]>(
		() => [
			{
				accessorKey: "date",
				header: t("dashboard.appointments.columns.dateTime"),
				cell: ({ row }) => {
					const appointment = row.original;
					return (
						<div className="flex items-center gap-2.5">
							<div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
								<Calendar className="h-3.5 w-3.5 text-primary" />
							</div>
							<div className="flex flex-col">
								<span className="text-sm font-medium">
									{new Date(`${appointment.date}T12:00:00`).toLocaleDateString(
										t("common.locale", { defaultValue: "fr-FR" }),
										{ day: "numeric", month: "short", year: "numeric" },
									)}
								</span>
								<span className="text-xs text-muted-foreground flex items-center gap-1">
									<Clock className="h-3 w-3" />
									{appointment.time} - {appointment.endTime || "—"}
								</span>
							</div>
						</div>
					);
				},
			},
			{
				accessorKey: "attendee",
				header: t("dashboard.appointments.columns.user"),
				cell: ({ row }) => {
					const appointment = row.original;
					return (
						<div className="flex items-center gap-2.5">
							<div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
								{appointment.attendee
									? `${appointment.attendee?.firstName?.[0] ?? ""}${appointment.attendee?.lastName?.[0] ?? ""}`.toUpperCase()
									: "?"}
							</div>
							<div className="flex flex-col">
								<span className="text-sm font-medium">
									{appointment.attendee
										? `${appointment.attendee?.firstName ?? ""} ${appointment.attendee?.lastName ?? ""}`
										: "—"}
								</span>
								<span className="text-xs text-muted-foreground">
									{appointment.attendee?.email}
								</span>
							</div>
						</div>
					);
				},
			},
			{
				accessorKey: "service",
				header: t("dashboard.appointments.columns.service"),
				cell: ({ row }) => {
					const appointment = row.original;
					return (
						<span className="text-sm">
							{getLocalized(appointment.service?.name, "fr") ??
								"Service consulaire"}
						</span>
					);
				},
			},
			{
				accessorKey: "status",
				header: t("dashboard.appointments.columns.status"),
				cell: ({ row }) => {
					const appointment = row.original;
					const cfg = getStatusConfig(appointment.status);
					return (
						<Badge
							variant="outline"
							className={cn(
								"text-[11px] font-medium",
								cfg.bg,
								cfg.color,
								cfg.border,
							)}
						>
							{cfg.icon && (
								<cfg.icon
									className={cn("w-3 h-3 rounded-full mr-1.5", cfg.color)}
								/>
							)}
							{t(cfg.labelKey, cfg.label)}
						</Badge>
					);
				},
			},
			{
				id: "actions",
				header: () => (
					<div className="text-right text-xs">
						{t("dashboard.appointments.columns.action")}
					</div>
				),
				cell: ({ row }) => {
					const appointment = row.original;
					return (
						<TooltipProvider delayDuration={0}>
							<div className="flex items-center justify-end gap-0.5">
								{canManage && appointment.status === "confirmed" && (
									<>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													size="icon"
													variant="ghost"
													className="h-7 w-7"
													onClick={(e) => {
														e.stopPropagation();
														handleComplete(appointment._id);
													}}
												>
													<Check className="h-3.5 w-3.5 text-emerald-500" />
												</Button>
											</TooltipTrigger>
											<TooltipContent side="bottom">
												<p className="text-xs">
													{t(
														"dashboard.appointments.actions.complete",
														"Terminer",
													)}
												</p>
											</TooltipContent>
										</Tooltip>

										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													size="icon"
													variant="ghost"
													className="h-7 w-7"
													onClick={(e) => {
														e.stopPropagation();
														handleNoShow(appointment._id);
													}}
												>
													<UserX className="h-3.5 w-3.5 text-amber-500" />
												</Button>
											</TooltipTrigger>
											<TooltipContent side="bottom">
												<p className="text-xs">
													{t("dashboard.appointments.actions.noShow")}
												</p>
											</TooltipContent>
										</Tooltip>
									</>
								)}
								{canManage &&
									["confirmed", "rescheduled"].includes(appointment.status) && (
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													size="icon"
													variant="ghost"
													className="h-7 w-7"
													onClick={(e) => {
														e.stopPropagation();
														handleCancel(appointment._id);
													}}
												>
													<X className="h-3.5 w-3.5 text-red-500" />
												</Button>
											</TooltipTrigger>
											<TooltipContent side="bottom">
												<p className="text-xs">
													{t(
														"dashboard.appointments.actions.cancel",
														"Annuler",
													)}
												</p>
											</TooltipContent>
										</Tooltip>
									)}
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											size="icon"
											variant="ghost"
											className="h-7 w-7"
											onClick={(e) => {
												e.stopPropagation();
												router.push(`/appointments/${appointment._id}`);
											}}
										>
											<Eye className="h-3.5 w-3.5 text-muted-foreground" />
										</Button>
									</TooltipTrigger>
									<TooltipContent side="bottom">
										<p className="text-xs">
											{t("dashboard.appointments.actions.view")}
										</p>
									</TooltipContent>
								</Tooltip>
							</div>
						</TooltipProvider>
					);
				},
			},
		],
		[t, handleComplete, handleCancel, handleNoShow, canManage, router],
	);

	// ─── iAsted page context ──────────────────────────────
	const pageEntities = useMemo<PageEntity[]>(() => {
		const list = (appointments ?? []) as AppointmentItem[];
		return list.slice(0, 30).map((a) => ({
			id: a._id,
			type: "appointment",
			label: `${a.date} ${a.time} · ${a.attendee?.firstName ?? ""} ${a.attendee?.lastName ?? ""}`.trim(),
			data: {
				status: a.status,
				date: a.date,
				time: a.time,
				attendeeEmail: a.attendee?.email,
				serviceName: a.service?.name
					? getLocalized(a.service.name as LocalizedString)
					: undefined,
				requestRef: a.request?.reference,
			},
		}));
	}, [appointments]);

	const pageActions = useMemo<PageAction[]>(() => {
		const actions: PageAction[] = [
			{
				id: "set-status-filter",
				label: "Filtrer par statut",
				description:
					"params.status ∈ ['all','confirmed','completed','cancelled','no_show','rescheduled']",
			},
			{
				id: "set-date-filter",
				label: "Filtrer par date",
				description: "params.date au format YYYY-MM-DD (vide pour reset).",
			},
			{
				id: "toggle-view",
				label: "Basculer vue calendrier/liste",
				description:
					"params.mode ∈ ['calendar','list'] (optionnel, sinon toggle).",
			},
			{
				id: "navigate-month",
				label: "Naviguer dans le mois",
				description:
					"params.direction ∈ ['prev','next','today'] OU params.month = 'YYYY-MM'.",
			},
			{
				id: "open-appointment",
				label: "Ouvrir un RDV",
				description: "params.appointmentId requis (depuis les entités visibles).",
			},
			{
				id: "open-new-appointment",
				label: "Nouveau RDV",
				description: "Navigue vers le formulaire de création.",
			},
			{
				id: "open-print-schedule",
				label: "Imprimer le planning",
				description: "Ouvre la vue impression du mois actuel.",
			},
		];
		if (canManage) {
			actions.push(
				{
					id: "complete-appointment",
					label: "Marquer un RDV terminé",
					description: "params.appointmentId requis.",
					requiresConfirmation: true,
				},
				{
					id: "cancel-appointment",
					label: "Annuler un RDV",
					description: "params.appointmentId requis.",
					requiresConfirmation: true,
				},
				{
					id: "no-show-appointment",
					label: "Marquer absent",
					description: "params.appointmentId requis.",
					requiresConfirmation: true,
				},
			);
		}
		return actions;
	}, [canManage]);

	const counts = useMemo(() => {
		const list = (appointments ?? []) as AppointmentItem[];
		const c: Record<string, number> = {};
		for (const a of list) c[a.status] = (c[a.status] ?? 0) + 1;
		return c;
	}, [appointments]);

	const summary = `${(appointments ?? []).length} RDV affichés (vue ${viewMode}, mois ${calendarMonth}, statut ${statusFilter}${dateFilter ? `, date ${dateFilter}` : ""}). Répartition: ${Object.entries(counts).map(([s, n]) => `${s}=${n}`).join(", ") || "aucun"}.`;

	usePageContext({
		module: "appointments",
		title: "Rendez-vous",
		summary,
		visibleEntities: pageEntities,
		availableActions: pageActions,
		scopedToolNames: ["getAppointmentsList"],
	});

	useRegisterPageAction("set-status-filter", async (params) => {
		const s = params?.status as string | undefined;
		if (s) setStatusFilter(s);
	});
	useRegisterPageAction("set-date-filter", async (params) => {
		const d = params?.date as string | undefined;
		setDateFilter(d ?? "");
	});
	useRegisterPageAction("toggle-view", async (params) => {
		const m = params?.mode as "calendar" | "list" | undefined;
		setViewMode((curr) =>
			m === "calendar" || m === "list" ? m : curr === "calendar" ? "list" : "calendar",
		);
	});
	useRegisterPageAction("navigate-month", async (params) => {
		const month = params?.month as string | undefined;
		const direction = params?.direction as "prev" | "next" | "today" | undefined;
		if (month && /^\d{4}-\d{2}$/.test(month)) {
			setCalendarMonth(month);
			return;
		}
		if (direction === "today") {
			const now = new Date();
			setCalendarMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
			return;
		}
		setCalendarMonth((curr) => {
			const [y, m] = curr.split("-").map(Number);
			const delta = direction === "prev" ? -1 : 1;
			const d = new Date(y, m - 1 + delta, 1);
			return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
		});
	});
	useRegisterPageAction("open-appointment", async (params) => {
		const id = params?.appointmentId as string | undefined;
		if (id) router.push(`/appointments/${id}`);
	});
	useRegisterPageAction("open-new-appointment", async () => {
		router.push("/appointments/new");
	});
	useRegisterPageAction("open-print-schedule", async () => {
		const params = new URLSearchParams();
		params.set("period", "month");
		params.set("anchor", `${calendarMonth}-01`);
		router.push(`/appointments/print?${params.toString()}`);
	});
	useRegisterPageAction("complete-appointment", async (params) => {
		if (!canManage) return;
		const id = params?.appointmentId as string | undefined;
		if (id) await handleComplete(id);
	});
	useRegisterPageAction("cancel-appointment", async (params) => {
		if (!canManage) return;
		const id = params?.appointmentId as string | undefined;
		if (id) await handleCancel(id);
	});
	useRegisterPageAction("no-show-appointment", async (params) => {
		if (!canManage) return;
		const id = params?.appointmentId as string | undefined;
		if (id) await handleNoShow(id);
	});

	// ─── Render ────────────────────────────────────────────────────────────

	return (
		<div className="flex min-h-full flex-col gap-4 p-4 md:p-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">
						{t("dashboard.appointments.title")}
					</h1>
					<p className="text-muted-foreground text-sm">
						{t("dashboard.appointments.description")}
					</p>
				</div>
				<div className="flex items-center gap-3">
					<Button
						size="sm"
						onClick={() => router.push("/appointments/new")}
					>
						<Calendar className="mr-2 h-4 w-4" />
						{t("appointments.manualBooking.cta")}
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() =>
							router.push("/appointments/agent-schedules")
						}
					>
						<User className="mr-2 h-4 w-4" />
						{t("dashboard.appointments.agentSchedules")}
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => router.push("/appointments/waitlist")}
					>
						<Clock className="mr-2 h-4 w-4" />
						{t("appointments.waitlist.cta", "Liste d'attente")}
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							const params = new URLSearchParams();
							if (viewMode === "calendar") {
								params.set("period", "month");
								params.set("anchor", `${calendarMonth}-01`);
							} else if (dateFilter) {
								params.set("period", "day");
								params.set("anchor", dateFilter);
							} else {
								params.set("period", "week");
							}
							params.set("autoPrint", "1");
							const url = `/appointments/print?${params.toString()}`;
							window.open(url, "_blank", "noopener");
						}}
					>
						<Printer className="mr-2 h-4 w-4" />
						{t("dashboard.appointments.print", "Imprimer")}
					</Button>
					<Tabs
						value={viewMode}
						onValueChange={(v) => setViewMode(v as "calendar" | "list")}
					>
						<TabsList className="h-9">
							<TabsTrigger value="calendar" className="gap-1.5 text-xs px-3">
								<CalendarDays className="h-3.5 w-3.5" />
								{t("dashboard.appointments.calendarView")}
							</TabsTrigger>
							<TabsTrigger value="list" className="gap-1.5 text-xs px-3">
								<List className="h-3.5 w-3.5" />
								{t("dashboard.appointments.listView")}
							</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>
			</div>

			{/* Stats bar */}
			{viewMode === "calendar" && (
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
					<StatsCard
						label={t("dashboard.appointments.stats.total")}
						value={stats.total}
						color="text-foreground"
						bgColor="bg-muted/50"
					/>
					<StatsCard
						label={t("dashboard.appointments.statuses.confirmed")}
						value={stats.confirmed}
						color="text-emerald-400"
						bgColor="bg-emerald-500/5"
						dotColor="bg-emerald-500"
					/>
					<StatsCard
						label={t("dashboard.appointments.statuses.completed")}
						value={stats.completed}
						color="text-blue-400"
						bgColor="bg-blue-500/5"
						dotColor="bg-blue-500"
					/>
					<StatsCard
						label={t("dashboard.appointments.statuses.cancelled")}
						value={stats.cancelled + stats.noShow}
						color="text-red-400"
						bgColor="bg-red-500/5"
						dotColor="bg-red-500"
					/>
				</div>
			)}

			{/* Main content */}
			{viewMode === "calendar" ? (
				<div className="flex gap-4 flex-1 min-h-0">
					{/* Calendar grid */}
					<FlatCard className="flex-1 flex flex-col">
						{/* Calendar header */}
						<div className="pb-2 border-b border-border/50">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8"
										onClick={handlePrevMonth}
									>
										<ChevronLeft className="h-4 w-4" />
									</Button>
									<h2 className="text-lg font-semibold min-w-[180px] text-center capitalize">
										{formatMonthYear()}
									</h2>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8"
										onClick={handleNextMonth}
									>
										<ChevronRight className="h-4 w-4" />
									</Button>
								</div>
								<Button
									variant="outline"
									size="sm"
									onClick={handleToday}
									className="text-xs"
								>
									{t("dashboard.appointments.today")}
								</Button>
							</div>
						</div>
						<div className="flex-1 p-3">
							{/* Day headers (Mon-Sun) */}
							<div className="grid grid-cols-7 mb-1">
								{["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(
									(day) => (
										<div
											key={day}
											className="text-center text-xs font-medium text-muted-foreground py-2"
										>
											{day}
										</div>
									),
								)}
							</div>

							{/* Calendar grid */}
							<div className="grid grid-cols-7 gap-px bg-border/30 rounded-lg overflow-hidden">
								{calendarDays.map((day) => {
									const dayAppointments = appointmentsByDate[day.date] ?? [];
									const isSelected = selectedDay === day.date;
									const hasAppointments = dayAppointments.length > 0;

									return (
										<button
											type="button"
											key={day.date}
											onClick={() => {
												if (day.isCurrentMonth) {
													setSelectedDay(isSelected ? null : day.date);
												}
											}}
											className={cn(
												"relative min-h-[85px] p-1.5 text-left transition-all duration-150 bg-background",
												day.isCurrentMonth
													? "hover:bg-muted/60 cursor-pointer"
													: "opacity-30 cursor-default",
												isSelected &&
													"ring-2 ring-primary ring-inset bg-primary/5",
												day.isToday && !isSelected && "bg-primary/5",
											)}
										>
											{/* Day number */}
											<span
												className={cn(
													"inline-flex items-center justify-center text-xs font-medium rounded-md h-6 w-6",
													day.isToday
														? "bg-primary text-primary-foreground"
														: day.isCurrentMonth
															? "text-foreground"
															: "text-muted-foreground/50",
												)}
											>
												{day.day}
											</span>

											{/* Appointment dots */}
											{hasAppointments && day.isCurrentMonth && (
												<div className="mt-0.5 space-y-0.5">
													{dayAppointments
														.slice(0, 3)
														.map((apt: AppointmentItem) => {
															const cfg = getStatusConfig(apt.status);
															return (
																<div
																	key={apt._id}
																	className={cn(
																		"flex items-center gap-1 rounded px-1 py-0.5 text-[10px] leading-tight truncate",
																		cfg.bg,
																	)}
																>
																	<div
																		className={cn(
																			"w-1.5 h-1.5 rounded-full shrink-0",
																			cfg.icon ? "" : "bg-muted-foreground", // Fallback if icon is not a dot
																			cfg.icon &&
																				cfg.icon === Check &&
																				"bg-emerald-500",
																			cfg.icon &&
																				cfg.icon === XCircle &&
																				"bg-red-500",
																			cfg.icon &&
																				cfg.icon === UserX &&
																				"bg-amber-500",
																			cfg.icon &&
																				cfg.icon === Clock &&
																				"bg-purple-500",
																		)}
																	/>
																	<span className={cn("truncate", cfg.color)}>
																		{apt.time}
																	</span>
																</div>
															);
														})}
													{dayAppointments.length > 3 && (
														<span className="text-[10px] text-muted-foreground pl-1">
															+{dayAppointments.length - 3}
														</span>
													)}
												</div>
											)}
										</button>
									);
								})}
							</div>

							{/* Legend */}
							<div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
								{Object.entries(STATUS_CONFIG)
									.slice(0, 4)
									.map(([key, cfg]) => (
										<div key={key} className="flex items-center gap-1.5">
											<div className={cn("w-2 h-2 rounded-full", cfg.bg)} />
											<span className="text-[11px] text-muted-foreground">
												{t(cfg.labelKey, cfg.label)}
											</span>
										</div>
									))}
							</div>
						</div>
					</FlatCard>

					{/* Day detail panel */}
					<div
						className={cn(
							"transition-all duration-300 ease-in-out overflow-hidden",
							selectedDay ? "w-[340px] opacity-100" : "w-0 opacity-0",
						)}
					>
						{selectedDay && (
							<FlatCard className="h-full flex flex-col w-[340px]">
								<div className="pb-3 border-b border-border/50">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm font-semibold capitalize">
												{formatSelectedDay(selectedDay)}
											</p>
											<p className="text-xs mt-0.5">
												{selectedDayAppointments.length}{" "}
												{t(
													"dashboard.appointments.appointmentsCount",
													"rendez-vous",
												)}
											</p>
										</div>
										<Button
											variant="ghost"
											size="icon"
											className="h-7 w-7"
											onClick={() => setSelectedDay(null)}
										>
											<X className="h-3.5 w-3.5" />
										</Button>
									</div>
								</div>
								<div className="flex-1 overflow-y-auto p-3 space-y-2">
									{selectedDayAppointments.length === 0 ? (
										<div className="flex flex-col items-center justify-center py-12 text-center">
											<Calendar className="h-8 w-8 text-muted-foreground/20 mb-3" />
											<p className="text-sm text-muted-foreground">
												{t(
													"dashboard.appointments.noAppointmentsToday",
													"Aucun rendez-vous ce jour",
												)}
											</p>
										</div>
									) : (
										selectedDayAppointments.map((apt: AppointmentItem) => (
											<AppointmentDetailCard
												key={apt._id}
												appointment={apt}
												t={t}
													onComplete={canManage ? handleComplete : undefined}
												onCancel={canManage ? handleCancel : undefined}
												onNoShow={canManage ? handleNoShow : undefined}
											/>
										))
									)}
								</div>
							</FlatCard>
						)}
					</div>
				</div>
			) : (
				/* ─── List view ──────────────────────────────────────────────── */
				<FlatCard>
					<div className="pb-3">
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<p className="text-base">
									{t("dashboard.appointments.listTitle")}
								</p>
								<p className="text-xs">
									{t("dashboard.appointments.listDescription")}
								</p>
							</div>
							<div className="flex items-center gap-2">
								<Input
									type="date"
									value={dateFilter}
									onChange={(e) => setDateFilter(e.target.value)}
									className="w-[160px] h-9 text-xs"
								/>
								<Combobox
									value={statusFilter}
									onValueChange={setStatusFilter}
									placeholder={t("dashboard.appointments.filterByStatus")}
									searchPlaceholder={t("common.search")}
									className="w-[180px] h-9 text-xs"
									options={[
										{
											value: "all",
											label: t("dashboard.appointments.statuses.all"),
										},
										...Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
											value: key,
											label: t(cfg.labelKey, cfg.label),
											icon: cfg.icon ? (
												<cfg.icon
													className={cn("w-3 h-3 rounded-full", cfg.color)}
												/>
											) : undefined,
										})),
									]}
								/>
							</div>
						</div>
					</div>
					<div>
						<DataTable
							columns={columns}
							data={appointments || []}
							isLoading={appointments === undefined}
						/>
					</div>
				</FlatCard>
			)}
		</div>
	);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatsCard({
	label,
	value,
	color,
	bgColor,
	dotColor,
}: {
	label: string;
	value: number;
	color: string;
	bgColor: string;
	dotColor?: string;
}) {
	return (
		<div
			className={cn(
				"rounded-xl border border-border/50 px-4 py-3 flex items-center gap-3",
				bgColor,
			)}
		>
			{dotColor && <div className={cn("w-2.5 h-2.5 rounded-full", dotColor)} />}
			<div>
				<p className={cn("text-2xl font-bold tabular-nums", color)}>{value}</p>
				<p className="text-[11px] text-muted-foreground">{label}</p>
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// APPOINTMENT DETAIL CARD (used in lists)
// ─────────────────────────────────────────────────────────────────────────────

export function AppointmentDetailCard({
	appointment,
	t,
	onComplete,
	onCancel,
	onNoShow,
}: {
	appointment: AppointmentItem;
	t: TFunction;
	onComplete?: (id: string) => void;
	onCancel?: (id: string) => void;
	onNoShow?: (id: string) => void;
}) {
	const router = useRouter();
	const cfg = getStatusConfig(appointment.status);

	return (
		<button
			type="button"
			className={cn(
				"group w-full text-left rounded-lg border p-3 transition-all  cursor-pointer",
				cfg.border,
				"bg-card hover:bg-muted/30",
			)}
			onClick={() => router.push(`/appointments/${appointment._id}`)}
		>
			{/* Time + Status */}
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-2">
					<div className="flex items-center gap-1.5 text-sm font-semibold">
						<Clock className="h-3.5 w-3.5 text-muted-foreground" />
						{appointment.time}
						{appointment.endTime && (
							<span className="text-muted-foreground font-normal">
								— {appointment.endTime}
							</span>
						)}
					</div>
				</div>
				<Badge
					variant="outline"
					className={cn(
						"text-[10px] h-5 font-medium",
						cfg.bg,
						cfg.color,
						cfg.border,
					)}
				>
					{cfg.icon && (
						<cfg.icon className={cn("w-3 h-3 rounded-full mr-1", cfg.color)} />
					)}
					{t(cfg.labelKey, { defaultValue: cfg.label })}
				</Badge>
			</div>

			{/* Attendee */}
			<div className="flex items-center gap-2 mb-2">
				<div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
					{appointment.attendee
						? `${appointment.attendee?.firstName?.[0] ?? ""}${appointment.attendee?.lastName?.[0] ?? ""}`
						: "?"}
				</div>
				<div className="min-w-0">
					<p className="text-sm font-medium truncate">
						{appointment.attendee
							? `${appointment.attendee?.firstName ?? ""} ${appointment.attendee?.lastName ?? ""}`
							: "—"}
					</p>
					{appointment.attendee?.email && (
						<p className="text-[11px] text-muted-foreground truncate">
							{appointment.attendee.email}
						</p>
					)}
				</div>
			</div>

			{/* Service */}
			{appointment.service && (
				<div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
					<FileText className="h-3 w-3 shrink-0" />
					<span className="truncate">
						{getLocalized(appointment.service?.name, "fr")}
					</span>
				</div>
			)}

			{/* Actions */}
			{onComplete &&
				onCancel &&
				onNoShow &&
				appointment.status === "confirmed" && (
					<div className="flex items-center gap-1 pt-2 border-t border-border/50">
						<TooltipProvider delayDuration={0}>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="sm"
										variant="ghost"
										className="h-7 text-xs gap-1 flex-1"
										onClick={(e) => {
											e.stopPropagation();
											onComplete(appointment._id);
										}}
									>
										<Check className="h-3 w-3 text-emerald-500" />
										{t("dashboard.appointments.complete")}
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p className="text-xs">
										{t("dashboard.appointments.markComplete", {
											defaultValue: "Marquer terminé",
										})}
									</p>
								</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="sm"
										variant="ghost"
										className="h-7 text-xs gap-1 flex-1"
										onClick={(e) => {
											e.stopPropagation();
											onNoShow(appointment._id);
										}}
									>
										<UserX className="h-3 w-3 text-amber-500" />
										{t("dashboard.appointments.absent")}
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p className="text-xs">
										{t("dashboard.appointments.markNoShow")}
									</p>
								</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="ghost"
										className="h-7 w-7"
										onClick={(e) => {
											e.stopPropagation();
											onCancel(appointment._id);
										}}
									>
										<XCircle className="h-3.5 w-3.5 text-red-500" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p className="text-xs">
										{t("dashboard.appointments.cancel")}
									</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
				)}
		</button>
	);
}
