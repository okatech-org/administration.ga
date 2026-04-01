import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { getLocalized } from "@convex/lib/utils";
import type { LocalizedString } from "@convex/lib/validators";
import type { TFunction } from "i18next";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Eye,
  FileText,
  Link as LinkIcon,
  List,
  Plus,
  Power,
  PowerOff,
  Save,
  Trash2,
  User,
  UserCircle,
  UserX,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useOrg } from "../../hooks/useOrg";
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "../../hooks/useConvexHooks";
import { useConvexQuery } from "@workspace/api/hooks";
import { cn } from "../../lib/utils";

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Field, FieldError, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Switch } from "@workspace/ui/components/switch";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

// ─── Types ──────────────────────────────────────────────────────────────────

type AppointmentsView = "list" | "schedules" | "detail";

interface AppointmentItem {
  _id: string;
  status: string;
  date: string;
  time: string;
  endTime?: string;
  attendee?: { firstName?: string; lastName?: string; email?: string; userId?: string } | null;
  service?: { name?: LocalizedString } | null;
  request?: { _id: string; reference?: string; status?: string } | null;
  notes?: string;
  [key: string]: unknown;
}

// ─── Status helpers ─────────────────────────────────────────────────────────

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
    label: "Confirme",
    labelKey: "dashboard.appointments.statuses.confirmed",
  },
  completed: {
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    icon: Check,
    border: "border-blue-500/30",
    label: "Termine",
    labelKey: "dashboard.appointments.statuses.completed",
  },
  cancelled: {
    color: "text-red-400",
    bg: "bg-red-500/10",
    icon: XCircle,
    border: "border-red-500/30",
    label: "Annule",
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
    label: "Reprogramme",
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

// ─── Agent Schedules types ──────────────────────────────────────────────────

const DAYS = [
  { key: "monday" as const, labelKey: "common.days.monday" },
  { key: "tuesday" as const, labelKey: "common.days.tuesday" },
  { key: "wednesday" as const, labelKey: "common.days.wednesday" },
  { key: "thursday" as const, labelKey: "common.days.thursday" },
  { key: "friday" as const, labelKey: "common.days.friday" },
  { key: "saturday" as const, labelKey: "common.days.saturday" },
  { key: "sunday" as const, labelKey: "common.days.sunday" },
] as const;

type DayKey = (typeof DAYS)[number]["key"];

interface TimeRange {
  start: string;
  end: string;
}

interface DaySchedule {
  day: DayKey;
  timeRanges: TimeRange[];
}

const DEFAULT_WEEKDAYS: DaySchedule[] = DAYS.filter(
  (d) => !["saturday", "sunday"].includes(d.key),
).map((d) => ({
  day: d.key,
  timeRanges: [
    { start: "09:00", end: "12:00" },
    { start: "14:00", end: "17:00" },
  ],
}));

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORTED COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function AppointmentsPage() {
  const [view, setView] = useState<AppointmentsView>("list");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  const navigateToDetail = useCallback((appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setView("detail");
  }, []);

  const navigateBack = useCallback(() => {
    setView("list");
    setSelectedAppointmentId(null);
  }, []);

  if (view === "detail" && selectedAppointmentId) {
    return (
      <AppointmentDetailView
        appointmentId={selectedAppointmentId}
        onBack={navigateBack}
      />
    );
  }

  if (view === "schedules") {
    return <AgentSchedulesView onBack={() => setView("list")} />;
  }

  return (
    <AppointmentsListView
      onNavigateToDetail={navigateToDetail}
      onNavigateToSchedules={() => setView("schedules")}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// APPOINTMENTS LIST VIEW (from index.tsx)
// ═══════════════════════════════════════════════════════════════════════════

function AppointmentsListView({
  onNavigateToDetail,
  onNavigateToSchedules,
}: {
  onNavigateToDetail: (id: string) => void;
  onNavigateToSchedules: () => void;
}) {
  const { orgId } = useOrg();
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Calendar month state
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // ─── API queries ──────────────────────────────────────────────────────

  const queryArgs = orgId
    ? {
        orgId,
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

  // ─── Mutations ────────────────────────────────────────────────────────

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

  // ─── Calendar logic ───────────────────────────────────────────────────

  const calendarDays = useMemo(() => {
    const [year, month] = calendarMonth.split("-").map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();

    const startPad = (firstDay.getDay() + 6) % 7;

    const days: {
      date: string;
      day: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }[] = [];

    const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
    for (let i = startPad - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ date: dateStr, day: d, isCurrentMonth: false, isToday: false });
    }

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

    const remainingSlots = 42 - days.length;
    for (let i = 1; i <= remainingSlots; i++) {
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({ date: dateStr, day: i, isCurrentMonth: false, isToday: false });
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

  // ─── Month navigation ────────────────────────────────────────────────

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
      { month: "long", year: "numeric" },
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

  // ─── Render ───────────────────────────────────────────────────────────

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
          <Button variant="outline" size="sm" onClick={onNavigateToSchedules}>
            <User className="mr-2 h-4 w-4" />
            {t("dashboard.appointments.agentSchedules")}
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
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-2 border-b border-border/50">
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
            </CardHeader>
            <CardContent className="flex-1 p-3">
              {/* Day headers */}
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
                                      cfg.icon ? "" : "bg-muted-foreground",
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
            </CardContent>
          </Card>

          {/* Day detail panel */}
          <div
            className={cn(
              "transition-all duration-300 ease-in-out overflow-hidden",
              selectedDay ? "w-[340px] opacity-100" : "w-0 opacity-0",
            )}
          >
            {selectedDay && (
              <Card className="h-full flex flex-col w-[340px]">
                <CardHeader className="pb-3 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold capitalize">
                        {formatSelectedDay(selectedDay)}
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {selectedDayAppointments.length}{" "}
                        {t(
                          "dashboard.appointments.appointmentsCount",
                          "rendez-vous",
                        )}
                      </CardDescription>
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
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-3 space-y-2">
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
                        onNavigate={onNavigateToDetail}
                        onComplete={handleComplete}
                        onCancel={handleCancel}
                        onNoShow={handleNoShow}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        /* ─── List view ─────────────────────────────────────────────── */
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base">
                  {t("dashboard.appointments.listTitle")}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t("dashboard.appointments.listDescription")}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-[160px] h-9 text-xs"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px] h-9 text-xs">
                    <SelectValue
                      placeholder={t("dashboard.appointments.filterByStatus")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("dashboard.appointments.statuses.all")}
                    </SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        {t(cfg.labelKey, cfg.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {appointments === undefined ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {t("dashboard.appointments.noAppointmentsToday", "Aucun rendez-vous")}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {appointments.map((apt: AppointmentItem) => {
                  const cfg = getStatusConfig(apt.status);
                  return (
                    <button
                      type="button"
                      key={apt._id}
                      className="w-full text-left rounded-lg border p-3 transition-all hover:shadow-sm cursor-pointer bg-card hover:bg-muted/30 flex items-center gap-4"
                      onClick={() => onNavigateToDetail(apt._id)}
                    >
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-medium">
                          {new Date(`${apt.date}T12:00:00`).toLocaleDateString(
                            t("common.locale", { defaultValue: "fr-FR" }),
                            { day: "numeric", month: "short", year: "numeric" },
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {apt.time} - {apt.endTime || "--"}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-sm font-medium">
                          {apt.attendee
                            ? `${apt.attendee.firstName ?? ""} ${apt.attendee.lastName ?? ""}`
                            : "--"}
                        </span>
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
                              className={cn(
                                "w-3 h-3 rounded-full mr-1.5",
                                cfg.color,
                              )}
                            />
                          )}
                          {t(cfg.labelKey, cfg.label)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <TooltipProvider delayDuration={0}>
                          {apt.status === "confirmed" && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleComplete(apt._id);
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
                                      handleNoShow(apt._id);
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
                          {["confirmed", "rescheduled"].includes(apt.status) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancel(apt._id);
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
                                  onNavigateToDetail(apt._id);
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
                        </TooltipProvider>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT SCHEDULES VIEW (from agent-schedules.tsx)
// ═══════════════════════════════════════════════════════════════════════════

function AgentSchedulesView({ onBack }: { onBack: () => void }) {
  const { orgId } = useOrg();
  const { t } = useTranslation();

  // --- UI State ---
  const [selectedAgentId, setSelectedAgentId] = useState<string>("all");
  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const [isExcDialogOpen, setIsExcDialogOpen] = useState(false);
  const [excScheduleId, setExcScheduleId] = useState<string>("");

  // --- Create form state (replacing @tanstack/react-form) ---
  const [createAgentId, setCreateAgentId] = useState("");
  const [createOrgServiceId, setCreateOrgServiceId] = useState<string | undefined>(undefined);
  const [createWeeklySchedule, setCreateWeeklySchedule] = useState<DaySchedule[]>(DEFAULT_WEEKDAYS);
  const [createAgentError, setCreateAgentError] = useState<string | undefined>(undefined);

  // --- Exception form state ---
  const [excDate, setExcDate] = useState("");
  const [excAvailable, setExcAvailable] = useState(false);
  const [excReason, setExcReason] = useState("");
  const [excDateError, setExcDateError] = useState<string | undefined>(undefined);

  // --- Queries ---
  const { data: agents } = useAuthenticatedConvexQuery(
    api.functions.agentSchedules.listOrgAgents,
    orgId ? { orgId } : "skip",
  );

  const { data: schedules } = useAuthenticatedConvexQuery(
    api.functions.agentSchedules.listByOrg,
    orgId ? { orgId } : "skip",
  );

  const { data: orgServices } = useConvexQuery(
    api.functions.services.listByOrg,
    orgId ? { orgId } : "skip",
  );

  // --- Mutations ---
  const { mutateAsync: upsertSchedule } = useConvexMutationQuery(
    api.functions.agentSchedules.upsert,
  );
  const { mutateAsync: toggleActive } = useConvexMutationQuery(
    api.functions.agentSchedules.toggleActive,
  );
  const { mutateAsync: deleteSchedule } = useConvexMutationQuery(
    api.functions.agentSchedules.deleteSchedule,
  );
  const { mutateAsync: addException } = useConvexMutationQuery(
    api.functions.agentSchedules.addException,
  );
  const { mutateAsync: removeException } = useConvexMutationQuery(
    api.functions.agentSchedules.removeException,
  );

  // --- Derived options ---
  const agentOptions = useMemo(() => {
    if (!agents || !Array.isArray(agents)) return [];
    return agents.map((a: any) => ({
      value: a._id as string,
      label: `${a.firstName} ${a.lastName}`,
    }));
  }, [agents]);

  const serviceOptions = useMemo(() => {
    if (!orgServices || !Array.isArray(orgServices)) return [];
    return orgServices.map((os: any) => ({
      value: os._id as string,
      label: os.name?.fr || os.name?.en || "Service",
    }));
  }, [orgServices]);

  const filteredSchedules = useMemo(() => {
    if (!schedules || !Array.isArray(schedules)) return [];
    if (selectedAgentId === "all") return schedules;
    return schedules.filter((s: any) => s.agentId === selectedAgentId);
  }, [schedules, selectedAgentId]);

  // --- Create handler ---
  const handleCreateSubmit = async () => {
    setCreateAgentError(undefined);
    if (!createAgentId) {
      setCreateAgentError(t("dashboard.appointments.schedules.agentRequired"));
      return;
    }
    if (!orgId) return;
    try {
      await upsertSchedule({
        orgId,
        agentId: createAgentId as Id<"memberships">,
        orgServiceId: createOrgServiceId
          ? (createOrgServiceId as Id<"orgServices">)
          : undefined,
        weeklySchedule: createWeeklySchedule,
      });
      toast.success(t("dashboard.appointments.schedules.created"));
      setIsCreateDialogOpen(false);
      resetCreateForm();
    } catch {
      toast.error(t("dashboard.appointments.schedules.createError"));
    }
  };

  const resetCreateForm = () => {
    setCreateAgentId("");
    setCreateOrgServiceId(undefined);
    setCreateWeeklySchedule(DEFAULT_WEEKDAYS);
    setCreateAgentError(undefined);
  };

  // --- Exception handler ---
  const handleExceptionSubmit = async () => {
    setExcDateError(undefined);
    if (!excDate) {
      setExcDateError(t("dashboard.appointments.schedules.dateRequired"));
      return;
    }
    if (!excScheduleId) return;
    try {
      await addException({
        scheduleId: excScheduleId as Id<"agentSchedules">,
        exception: {
          date: excDate,
          available: excAvailable,
          reason: excReason || undefined,
        },
      });
      toast.success(t("dashboard.appointments.schedules.exceptionAdded"));
      setIsExcDialogOpen(false);
      resetExcForm();
    } catch {
      toast.error(t("common.error"));
    }
  };

  const resetExcForm = () => {
    setExcDate("");
    setExcAvailable(false);
    setExcReason("");
    setExcDateError(undefined);
  };

  // --- Action Handlers ---
  const handleToggle = async (scheduleId: Id<"agentSchedules">) => {
    try {
      const result = await toggleActive({ scheduleId });
      toast.success(
        result.isActive
          ? t("dashboard.appointments.schedules.activated")
          : t("dashboard.appointments.schedules.deactivated"),
      );
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleDelete = async (scheduleId: Id<"agentSchedules">) => {
    try {
      await deleteSchedule({ scheduleId });
      toast.success(t("dashboard.appointments.schedules.deleted"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleRemoveException = async (
    scheduleId: Id<"agentSchedules">,
    date: string,
  ) => {
    try {
      await removeException({ scheduleId, date });
      toast.success(t("dashboard.appointments.schedules.exceptionRemoved"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  // --- Weekly schedule helpers ---
  const updateTimeRange = (
    schedule: DaySchedule[],
    dayIndex: number,
    rangeIndex: number,
    field: "start" | "end",
    value: string,
  ): DaySchedule[] => {
    const copy = [...schedule];
    const dayEntry = { ...copy[dayIndex] };
    dayEntry.timeRanges = [...dayEntry.timeRanges];
    dayEntry.timeRanges[rangeIndex] = {
      ...dayEntry.timeRanges[rangeIndex],
      [field]: value,
    };
    copy[dayIndex] = dayEntry;
    return copy;
  };

  const addTimeRange = (
    schedule: DaySchedule[],
    dayIndex: number,
  ): DaySchedule[] => {
    const copy = [...schedule];
    const dayEntry = { ...copy[dayIndex] };
    dayEntry.timeRanges = [
      ...dayEntry.timeRanges,
      { start: "14:00", end: "17:00" },
    ];
    copy[dayIndex] = dayEntry;
    return copy;
  };

  const removeTimeRange = (
    schedule: DaySchedule[],
    dayIndex: number,
    rangeIndex: number,
  ): DaySchedule[] => {
    const copy = [...schedule];
    const dayEntry = { ...copy[dayIndex] };
    dayEntry.timeRanges = dayEntry.timeRanges.filter(
      (_, i) => i !== rangeIndex,
    );
    copy[dayIndex] = dayEntry;
    return copy;
  };

  const toggleDay = (
    schedule: DaySchedule[],
    dayKey: DayKey,
  ): DaySchedule[] => {
    const idx = schedule.findIndex((d) => d.day === dayKey);
    if (idx >= 0) {
      return schedule.filter((d) => d.day !== dayKey);
    }
    const newEntry: DaySchedule = {
      day: dayKey,
      timeRanges: [{ start: "09:00", end: "12:00" }],
    };
    return [...schedule, newEntry].sort(
      (a, b) =>
        DAYS.findIndex((d) => d.key === a.day) -
        DAYS.findIndex((d) => d.key === b.day),
    );
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <UserCircle className="h-6 w-6" />
              {t("dashboard.appointments.schedules.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("dashboard.appointments.schedules.description")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Agent filter */}
          <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t("dashboard.appointments.schedules.allAgents")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("dashboard.appointments.schedules.allAgents")}
              </SelectItem>
              {agentOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Create button */}
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) resetCreateForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t("dashboard.appointments.schedules.create")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateSubmit();
                }}
              >
                <DialogHeader>
                  <DialogTitle>
                    {t("dashboard.appointments.schedules.createTitle")}
                  </DialogTitle>
                  <DialogDescription>
                    {t("dashboard.appointments.schedules.createDescription")}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Agent selector */}
                  <Field data-invalid={!!createAgentError}>
                    <FieldLabel>
                      {t("dashboard.appointments.schedules.agent")}
                    </FieldLabel>
                    <Select
                      value={createAgentId || undefined}
                      onValueChange={setCreateAgentId}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            "dashboard.appointments.schedules.selectAgent",
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {agentOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {createAgentError && (
                      <FieldError>
                        {createAgentError}
                      </FieldError>
                    )}
                  </Field>

                  {/* Service selector (optional) */}
                  <Field>
                    <FieldLabel>
                      {t("dashboard.appointments.schedules.service")}
                    </FieldLabel>
                    <Select
                      value={createOrgServiceId ?? ""}
                      onValueChange={(v) =>
                        setCreateOrgServiceId(v || undefined)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            "dashboard.appointments.schedules.allServices",
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  {/* Day toggles */}
                  <Field>
                    <FieldLabel>
                      {t("dashboard.appointments.schedules.workingDays")}
                    </FieldLabel>
                    <div className="flex gap-1 flex-wrap">
                      {DAYS.map((d) => {
                        const active = createWeeklySchedule.some(
                          (ws) => ws.day === d.key,
                        );
                        return (
                          <Button
                            key={d.key}
                            type="button"
                            variant={active ? "default" : "outline"}
                            size="sm"
                            className="text-xs"
                            onClick={() =>
                              setCreateWeeklySchedule(
                                toggleDay(createWeeklySchedule, d.key),
                              )
                            }
                          >
                            {t(d.labelKey).slice(0, 3)}
                          </Button>
                        );
                      })}
                    </div>

                    {/* Time ranges per day */}
                    <div className="space-y-3 mt-3">
                      <Label>
                        {t("dashboard.appointments.schedules.timeRanges")}
                      </Label>
                      {createWeeklySchedule.map((dayEntry, dayIdx) => (
                        <div
                          key={dayEntry.day}
                          className="rounded-lg border p-3 space-y-2"
                        >
                          <p className="text-sm font-medium">
                            {t(
                              DAYS.find((d) => d.key === dayEntry.day)
                                ?.labelKey ?? "",
                            )}
                          </p>
                          {dayEntry.timeRanges.map((range, rangeIdx) => (
                            <div
                              key={rangeIdx}
                              className="flex items-center gap-2"
                            >
                              <Input
                                type="time"
                                value={range.start}
                                onChange={(e) =>
                                  setCreateWeeklySchedule(
                                    updateTimeRange(
                                      createWeeklySchedule,
                                      dayIdx,
                                      rangeIdx,
                                      "start",
                                      e.target.value,
                                    ),
                                  )
                                }
                                className="w-28"
                              />
                              <span className="text-muted-foreground">-</span>
                              <Input
                                type="time"
                                value={range.end}
                                onChange={(e) =>
                                  setCreateWeeklySchedule(
                                    updateTimeRange(
                                      createWeeklySchedule,
                                      dayIdx,
                                      rangeIdx,
                                      "end",
                                      e.target.value,
                                    ),
                                  )
                                }
                                className="w-28"
                              />
                              {dayEntry.timeRanges.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() =>
                                    setCreateWeeklySchedule(
                                      removeTimeRange(
                                        createWeeklySchedule,
                                        dayIdx,
                                        rangeIdx,
                                      ),
                                    )
                                  }
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs gap-1"
                            onClick={() =>
                              setCreateWeeklySchedule(
                                addTimeRange(createWeeklySchedule, dayIdx),
                              )
                            }
                          >
                            <Plus className="h-3 w-3" />
                            {t("dashboard.appointments.schedules.addRange")}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </Field>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" className="gap-2">
                    <Save className="h-4 w-4" />
                    {t("common.save")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Schedule list */}
      {filteredSchedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {t("dashboard.appointments.schedules.empty")}
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {t("dashboard.appointments.schedules.emptyHint")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredSchedules.map((schedule: any) => {
            const isExpanded = expandedScheduleId === schedule._id;
            return (
              <Card
                key={schedule._id}
                className={!schedule.isActive ? "opacity-60" : ""}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {schedule.agent && (
                        <Avatar className="h-9 w-9">
                          <AvatarImage
                            src={schedule.agent.avatarUrl ?? undefined}
                          />
                          <AvatarFallback className="text-xs">
                            {schedule.agent.firstName?.[0] ?? ""}
                            {schedule.agent.lastName?.[0] ?? ""}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        <CardTitle className="text-base">
                          {schedule.agent?.firstName} {schedule.agent?.lastName}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          {schedule.serviceName ? (
                            <Badge variant="outline" className="text-xs">
                              {typeof schedule.serviceName === "object"
                                ? schedule.serviceName?.fr ||
                                  schedule.serviceName?.en
                                : schedule.serviceName}
                            </Badge>
                          ) : (
                            <span className="text-xs">
                              {t(
                                "dashboard.appointments.schedules.allServices",
                              )}
                            </span>
                          )}
                          <Badge
                            variant={
                              schedule.isActive ? "default" : "secondary"
                            }
                            className="text-xs"
                          >
                            {schedule.isActive
                              ? t("dashboard.appointments.schedules.active")
                              : t("dashboard.appointments.schedules.inactive")}
                          </Badge>
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggle(schedule._id)}
                        title={
                          schedule.isActive
                            ? t("dashboard.appointments.schedules.deactivate")
                            : t("dashboard.appointments.schedules.activate")
                        }
                      >
                        {schedule.isActive ? (
                          <Power className="h-4 w-4 text-green-600" />
                        ) : (
                          <PowerOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(schedule._id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setExpandedScheduleId(
                            isExpanded ? null : schedule._id,
                          )
                        }
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Quick schedule overview */}
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {schedule.weeklySchedule.map((day: any) => (
                      <Badge
                        key={day.day}
                        variant="secondary"
                        className="text-xs gap-1"
                      >
                        <Clock className="h-3 w-3" />
                        {t(
                          DAYS.find((d) => d.key === day.day)?.labelKey ?? "",
                        ).slice(0, 3)}{" "}
                        {day.timeRanges
                          .map((r: any) => `${r.start}-${r.end}`)
                          .join(", ")}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>

                {/* Expanded view with exceptions */}
                {isExpanded && (
                  <CardContent className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">
                        {t("dashboard.appointments.schedules.exceptions")}
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => {
                          setExcScheduleId(schedule._id);
                          setIsExcDialogOpen(true);
                        }}
                      >
                        <Plus className="h-3 w-3" />
                        {t("dashboard.appointments.schedules.addException")}
                      </Button>
                    </div>

                    {!schedule.exceptions ||
                    schedule.exceptions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {t("dashboard.appointments.schedules.noExceptions")}
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {schedule.exceptions.map((exc: any) => (
                          <div
                            key={exc.date}
                            className={`flex items-center justify-between rounded-md px-3 py-1.5 text-sm ${
                              exc.available
                                ? "bg-blue-50 dark:bg-blue-950/30"
                                : "bg-destructive/10"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{exc.date}</span>
                              <Badge
                                variant={
                                  exc.available ? "outline" : "destructive"
                                }
                                className="text-xs"
                              >
                                {exc.available
                                  ? t(
                                      "dashboard.appointments.schedules.modifiedHours",
                                    )
                                  : t(
                                      "dashboard.appointments.schedules.dayOff",
                                    )}
                              </Badge>
                              {exc.reason && (
                                <span className="text-muted-foreground text-xs">
                                  {exc.reason}
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() =>
                                handleRemoveException(schedule._id, exc.date)
                              }
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add exception dialog */}
      <Dialog
        open={isExcDialogOpen}
        onOpenChange={(open) => {
          setIsExcDialogOpen(open);
          if (!open) resetExcForm();
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleExceptionSubmit();
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {t("dashboard.appointments.schedules.addExceptionTitle")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "dashboard.appointments.schedules.addExceptionDescription",
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Field data-invalid={!!excDateError}>
                <FieldLabel>
                  {t("dashboard.appointments.schedules.date")}
                </FieldLabel>
                <Input
                  type="date"
                  value={excDate}
                  onChange={(e) => setExcDate(e.target.value)}
                />
                {excDateError && (
                  <FieldError>{excDateError}</FieldError>
                )}
              </Field>

              <Field orientation="horizontal">
                <FieldLabel htmlFor="excAvailable">
                  {t(
                    "dashboard.appointments.schedules.modifiedHoursCheck",
                  )}
                </FieldLabel>
                <Switch
                  id="excAvailable"
                  checked={excAvailable}
                  onCheckedChange={setExcAvailable}
                />
              </Field>

              <Field>
                <FieldLabel>
                  {t("dashboard.appointments.schedules.reason")}
                </FieldLabel>
                <Input
                  value={excReason}
                  onChange={(e) => setExcReason(e.target.value)}
                  placeholder={t(
                    "dashboard.appointments.schedules.reasonPlaceholder",
                  )}
                />
              </Field>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsExcDialogOpen(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit">{t("common.save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// APPOINTMENT DETAIL VIEW (from $appointmentId.tsx)
// ═══════════════════════════════════════════════════════════════════════════

function AppointmentDetailView({
  appointmentId,
  onBack,
}: {
  appointmentId: string;
  onBack: () => void;
}) {
  const { t } = useTranslation();

  const { data: appointment } = useAuthenticatedConvexQuery(
    api.functions.slots.getAppointmentById,
    {
      appointmentId: appointmentId as Id<"appointments">,
    },
  );

  const { mutateAsync: cancelMutation } = useConvexMutationQuery(
    api.functions.slots.cancelAppointment,
  );
  const { mutateAsync: completeMutation } = useConvexMutationQuery(
    api.functions.slots.completeAppointment,
  );
  const { mutateAsync: noShowMutation } = useConvexMutationQuery(
    api.functions.slots.markNoShow,
  );

  const handleCancel = async () => {
    try {
      await cancelMutation({
        appointmentId: appointmentId as Id<"appointments">,
      });
      toast.success(t("dashboard.appointments.success.cancelled"));
    } catch {
      toast.error(t("dashboard.appointments.error.cancel"));
    }
  };

  const handleComplete = async () => {
    try {
      await completeMutation({
        appointmentId: appointmentId as Id<"appointments">,
      });
      toast.success(t("dashboard.appointments.success.completed"));
    } catch {
      toast.error(t("dashboard.appointments.error.complete"));
    }
  };

  const handleNoShow = async () => {
    try {
      await noShowMutation({
        appointmentId: appointmentId as Id<"appointments">,
      });
      toast.success(t("dashboard.appointments.success.noShow"));
    } catch {
      toast.error(t("dashboard.appointments.error.noShow"));
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "confirmed":
        return "default" as const;
      case "scheduled":
        return "secondary" as const;
      case "completed":
        return "default" as const;
      case "cancelled":
        return "destructive" as const;
      case "no_show":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
  };

  if (appointment === undefined) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">
          {t("dashboard.appointments.notFound")}
        </p>
        <Button onClick={onBack}>{t("common.back")}</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {t("dashboard.appointments.detail.title")}
          </h1>
          <p className="text-muted-foreground">{appointment.date}</p>
        </div>
        <Badge
          variant={getStatusBadgeVariant(appointment.status)}
          className="text-sm"
        >
          {t(`dashboard.appointments.statuses.${appointment.status}`)}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-6xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t("dashboard.appointments.detail.dateTime")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {t("dashboard.appointments.detail.date")}:
              </span>
              <span>{appointment.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {appointment.time} - {appointment.endTime}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("dashboard.appointments.detail.user")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {appointment.attendee ? (
              <>
                <p className="font-medium">
                  {appointment.attendee.firstName}{" "}
                  {appointment.attendee.lastName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {appointment.attendee.email}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">-</p>
            )}
          </CardContent>
        </Card>

        {appointment.service && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t("dashboard.appointments.detail.service")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">
                {appointment.service.name?.fr || "-"}
              </p>
            </CardContent>
          </Card>
        )}

        {appointment.request && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                {t(
                  "dashboard.appointments.detail.linkedRequest",
                  "Demande associee",
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium font-mono text-sm">
                  {appointment.request.reference}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {t(
                    `fields.requestStatus.options.${appointment.request.status}`,
                  )}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {appointment.notes && (
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.appointments.detail.notes")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{appointment.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {appointment.status === "confirmed" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.appointments.detail.actions")}</CardTitle>
            <CardDescription>
              {t("dashboard.appointments.detail.actionsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handleComplete}>
              <Clock className="mr-2 h-4 w-4" />
              {t("dashboard.appointments.complete")}
            </Button>
            <Button variant="outline" onClick={handleNoShow}>
              <AlertCircle className="mr-2 h-4 w-4" />
              {t("dashboard.appointments.noShow")}
            </Button>
            <Button variant="destructive" onClick={handleCancel}>
              <X className="mr-2 h-4 w-4" />
              {t("dashboard.appointments.cancel")}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

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
      {dotColor && (
        <div className={cn("w-2.5 h-2.5 rounded-full", dotColor)} />
      )}
      <div>
        <p className={cn("text-2xl font-bold tabular-nums", color)}>{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function AppointmentDetailCard({
  appointment,
  t,
  onNavigate,
  onComplete,
  onCancel,
  onNoShow,
}: {
  appointment: AppointmentItem;
  t: TFunction;
  onNavigate: (id: string) => void;
  onComplete?: (id: string) => void;
  onCancel?: (id: string) => void;
  onNoShow?: (id: string) => void;
}) {
  const cfg = getStatusConfig(appointment.status);

  return (
    <button
      type="button"
      className={cn(
        "group w-full text-left rounded-lg border p-3 transition-all hover:shadow-sm cursor-pointer",
        cfg.border,
        "bg-card hover:bg-muted/30",
      )}
      onClick={() => onNavigate(appointment._id)}
    >
      {/* Time + Status */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            {appointment.time}
            {appointment.endTime && (
              <span className="text-muted-foreground font-normal">
                -- {appointment.endTime}
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
            <cfg.icon
              className={cn("w-3 h-3 rounded-full mr-1", cfg.color)}
            />
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
              : "--"}
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
                      defaultValue: "Marquer termine",
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
