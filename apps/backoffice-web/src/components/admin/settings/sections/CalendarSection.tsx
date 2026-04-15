"use client";

/**
 * CalendarSection — Horaires, jours fériés, fermetures
 *
 * Couverture :
 *   - Horaires d'ouverture par défaut (tous services) — lundi à dimanche
 *   - Paramètres RDV : délai minimum, max avance, politique d'annulation
 *   - Jours fériés (gabonais nationaux + pays hôte + custom)
 *   - Fermetures exceptionnelles ponctuelles
 *
 * Initialise automatiquement un calendrier par défaut (incluant les jours
 * fériés gabonais officiels) si aucun n'existe.
 */

import { api } from "@convex/_generated/api";
import {
  CalendarDays,
  CalendarX,
  Clock,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { HelpTooltip } from "@/components/admin/HelpTooltip";
import { HELP } from "@/lib/help-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";
import type { SettingsSectionProps } from "../SettingsTabsLayout";
import {
  useDebouncedSave,
  useRegisterSection,
  useSettingsFormOptional,
} from "@workspace/settings-form";

type DayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

const DAYS: Array<{ key: DayKey; label: string; short: string }> = [
  { key: "monday", label: "Lundi", short: "Lun" },
  { key: "tuesday", label: "Mardi", short: "Mar" },
  { key: "wednesday", label: "Mercredi", short: "Mer" },
  { key: "thursday", label: "Jeudi", short: "Jeu" },
  { key: "friday", label: "Vendredi", short: "Ven" },
  { key: "saturday", label: "Samedi", short: "Sam" },
  { key: "sunday", label: "Dimanche", short: "Dim" },
];

type DaySchedule = { open?: string; close?: string; closed?: boolean };
type WeeklySchedule = Partial<Record<DayKey, DaySchedule>> & { notes?: string };
type ServiceHoursEntry = {
  scopeType: "default" | "service";
  schedule: WeeklySchedule;
  notes?: string;
};

export function CalendarSection({ orgId, onStatusChange }: SettingsSectionProps) {
  const ctx = useSettingsFormOptional();
  const readOnly = ctx?.readOnly ?? false;

  const { data: calendar, isPending } = useAuthenticatedConvexQuery(
    api.functions.orgCalendar.getByOrg,
    { orgId },
  );

  const { mutateAsync: initializeDefaults } = useConvexMutationQuery(
    api.functions.orgCalendar.initializeDefaults,
  );
  const { mutateAsync: updateServiceHours } = useConvexMutationQuery(
    api.functions.orgCalendar.updateServiceHours,
  );
  const { mutateAsync: updateAppointmentConfig } = useConvexMutationQuery(
    api.functions.orgCalendar.updateAppointmentConfig,
  );
  const { mutateAsync: addHoliday } = useConvexMutationQuery(
    api.functions.orgCalendar.addHoliday,
  );
  const { mutateAsync: removeHoliday } = useConvexMutationQuery(
    api.functions.orgCalendar.removeHoliday,
  );
  const { mutateAsync: addClosure } = useConvexMutationQuery(
    api.functions.orgCalendar.addExceptionalClosure,
  );

  // État horaires par défaut
  const [schedule, setSchedule] = useState<WeeklySchedule>({});

  // État paramètres RDV
  const [leadTime, setLeadTime] = useState(24);
  const [urgencyLeadTime, setUrgencyLeadTime] = useState(2);
  const [maxAdvance, setMaxAdvance] = useState(90);
  const [cancellation, setCancellation] = useState(24);
  const [sameDay, setSameDay] = useState(false);
  const [waitlist, setWaitlist] = useState(false);

  // Nouveau jour férié (formulaire inline)
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayLabel, setNewHolidayLabel] = useState("");
  const [newHolidaySource, setNewHolidaySource] = useState<
    "gabon_national" | "host_country" | "custom"
  >("custom");
  const [newHolidayRecurring, setNewHolidayRecurring] = useState(true);

  // Nouvelle fermeture
  const [newClosureStart, setNewClosureStart] = useState("");
  const [newClosureEnd, setNewClosureEnd] = useState("");
  const [newClosureReason, setNewClosureReason] = useState("");
  const [newClosurePublic, setNewClosurePublic] = useState(true);

  // Auto-save horaires (sous-hook #1 de la section)
  const {
    trigger: triggerSchedule,
    flush: flushSchedule,
    hasPending: hasPendingSchedule,
    status: statusSchedule,
    errorMessage: errorSchedule,
  } = useDebouncedSave<WeeklySchedule>({
    readOnly,
    onSave: async (val) => {
      await updateServiceHours({
        orgId,
        scopeType: "default",
        schedule: val,
      });
    },
    onStatusChange,
    onDirtyChange: (dirty) => ctx?.notifySectionDirty("calendar", dirty),
  });

  // Auto-save paramètres RDV (sous-hook #2 de la section)
  const {
    trigger: triggerAppointment,
    flush: flushAppointment,
    hasPending: hasPendingAppointment,
    status: statusAppointment,
    errorMessage: errorAppointment,
  } = useDebouncedSave<{
    defaultLeadTimeHours: number;
    urgencyLeadTimeHours?: number;
    maxAdvanceDays: number;
    cancellationPolicyHours?: number;
    sameDaySlots?: boolean;
    allowWaitlist?: boolean;
  }>({
    readOnly,
    onSave: async (val) => {
      await updateAppointmentConfig({ orgId, appointmentConfig: val });
    },
    onStatusChange,
    onDirtyChange: (dirty) => ctx?.notifySectionDirty("calendar", dirty),
  });

  // Composition des 2 sous-hooks pour exposer un flush + hasPending + status unifiés
  // à useRegisterSection. Status agrégé : error > saving > saved > idle.
  const combinedFlush = async () => {
    await Promise.all([flushSchedule(), flushAppointment()]);
  };
  const combinedHasPending = () => hasPendingSchedule() || hasPendingAppointment();
  const combinedStatus =
    statusSchedule === "error" || statusAppointment === "error"
      ? "error"
      : statusSchedule === "saving" || statusAppointment === "saving"
      ? "saving"
      : statusSchedule === "saved" || statusAppointment === "saved"
      ? "saved"
      : "idle";
  const combinedErrorMessage = errorSchedule ?? errorAppointment;

  useRegisterSection("calendar", {
    flush: combinedFlush,
    hasPending: combinedHasPending,
    status: combinedStatus,
    errorMessage: combinedErrorMessage,
  });

  // Synchro serveur — BUG FIX #4 : skip si modifs pending (race condition).
  useEffect(() => {
    if (!calendar) return;
    if (combinedHasPending()) return;
    const defaultEntry = (calendar.serviceHours as ServiceHoursEntry[]).find(
      (s) => s.scopeType === "default",
    );
    if (defaultEntry) {
      setSchedule(defaultEntry.schedule);
    }
    const ac = calendar.appointmentConfig;
    setLeadTime(ac.defaultLeadTimeHours);
    setUrgencyLeadTime(ac.urgencyLeadTimeHours ?? 2);
    setMaxAdvance(ac.maxAdvanceDays);
    setCancellation(ac.cancellationPolicyHours ?? 24);
    setSameDay(ac.sameDaySlots ?? false);
    setWaitlist(ac.allowWaitlist ?? false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendar]);

  const updateDay = (day: DayKey, patch: Partial<DaySchedule>) => {
    const next = {
      ...schedule,
      [day]: { ...(schedule[day] ?? {}), ...patch },
    };
    setSchedule(next);
    triggerSchedule(next);
  };

  const pushAppointment = () => {
    triggerAppointment({
      defaultLeadTimeHours: leadTime,
      urgencyLeadTimeHours: urgencyLeadTime,
      maxAdvanceDays: maxAdvance,
      cancellationPolicyHours: cancellation,
      sameDaySlots: sameDay,
      allowWaitlist: waitlist,
    });
  };

  const handleInitialize = async () => {
    onStatusChange?.("saving");
    try {
      await initializeDefaults({ orgId });
      onStatusChange?.("saved");
      setTimeout(() => onStatusChange?.("idle"), 1500);
    } catch (err) {
      onStatusChange?.(
        "error",
        err instanceof Error ? err.message : "Erreur inconnue",
      );
    }
  };

  const handleAddHoliday = async () => {
    if (!newHolidayDate || !newHolidayLabel) return;
    onStatusChange?.("saving");
    try {
      await addHoliday({
        orgId,
        holiday: {
          date: newHolidayDate,
          label: newHolidayLabel,
          recurring: newHolidayRecurring,
          source: newHolidaySource,
          showToPublic: true,
        },
      });
      setNewHolidayDate("");
      setNewHolidayLabel("");
      onStatusChange?.("saved");
      setTimeout(() => onStatusChange?.("idle"), 1500);
    } catch (err) {
      onStatusChange?.(
        "error",
        err instanceof Error ? err.message : "Erreur inconnue",
      );
    }
  };

  const handleRemoveHoliday = async (date: string, label: string) => {
    onStatusChange?.("saving");
    try {
      await removeHoliday({ orgId, date, label });
      onStatusChange?.("saved");
      setTimeout(() => onStatusChange?.("idle"), 1500);
    } catch (err) {
      onStatusChange?.(
        "error",
        err instanceof Error ? err.message : "Erreur inconnue",
      );
    }
  };

  const handleAddClosure = async () => {
    if (!newClosureStart || !newClosureEnd || !newClosureReason) return;
    onStatusChange?.("saving");
    try {
      await addClosure({
        orgId,
        closure: {
          startDate: new Date(newClosureStart).getTime(),
          endDate: new Date(newClosureEnd).getTime(),
          reasonFr: newClosureReason,
          showToPublic: newClosurePublic,
        },
      });
      setNewClosureStart("");
      setNewClosureEnd("");
      setNewClosureReason("");
      onStatusChange?.("saved");
      setTimeout(() => onStatusChange?.("idle"), 1500);
    } catch (err) {
      onStatusChange?.(
        "error",
        err instanceof Error ? err.message : "Erreur inconnue",
      );
    }
  };

  if (isPending) return <CalendarSkeleton />;

  // Première utilisation : pas de calendrier
  if (!calendar) {
    return (
      <FlatCard>
        <div className="p-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div>
            <h3 className="font-medium mb-1">
              Initialiser le calendrier de la représentation
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Charge les horaires standards (9h-17h lundi à vendredi), les jours
              fériés officiels gabonais et les paramètres RDV par défaut.
            </p>
          </div>
          <Button onClick={handleInitialize}>
            <Sparkles className="h-4 w-4 mr-2" />
            Initialiser avec les valeurs par défaut
          </Button>
        </div>
      </FlatCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── Horaires d'ouverture ────────────────── */}
      <FlatCard>
        <div className="p-4">
          <div className="flex items-center gap-1.5">
            <SectionHeader
              icon={<Clock className="h-4 w-4 text-blue-600" />}
              title="Horaires d'ouverture publique"
            />
            <HelpTooltip content={HELP.calendar.serviceHours} />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Horaires appliqués à tous les services par défaut. Des horaires
            spécifiques par service peuvent être définis dans l'onglet Services.
          </p>
          <ul className="space-y-1.5">
            {DAYS.map((d) => {
              const s = schedule[d.key] ?? {};
              const closed = s.closed === true;
              return (
                <li
                  key={d.key}
                  className={cn(
                    "flex items-center gap-3 py-1.5 px-2 rounded-md",
                    closed && "opacity-60",
                  )}
                >
                  <div className="w-20 shrink-0 text-sm font-medium">
                    {d.label}
                  </div>
                  <Switch
                    checked={!closed}
                    onCheckedChange={(checked) =>
                      updateDay(d.key, { closed: !checked })
                    }
                    aria-label={`${d.label} ${closed ? "fermé" : "ouvert"}`}
                  />
                  {!closed && (
                    <>
                      <Input
                        type="time"
                        value={s.open ?? "09:00"}
                        onChange={(e) =>
                          updateDay(d.key, { open: e.target.value })
                        }
                        className="w-28"
                      />
                      <span className="text-muted-foreground text-sm">—</span>
                      <Input
                        type="time"
                        value={s.close ?? "17:00"}
                        onChange={(e) =>
                          updateDay(d.key, { close: e.target.value })
                        }
                        className="w-28"
                      />
                    </>
                  )}
                  {closed && (
                    <Badge variant="secondary" className="text-[10px]">
                      Fermé
                    </Badge>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </FlatCard>

      {/* ─── Paramètres RDV ─────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <div className="flex items-center gap-1.5">
            <SectionHeader
              icon={<Settings2 className="h-4 w-4 text-indigo-600" />}
              title="Paramètres de rendez-vous"
            />
            <HelpTooltip content={HELP.calendar.appointmentLeadTime} />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Délais et contraintes applicables aux prises de rendez-vous par les
            citoyens.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Délai minimum standard (heures)</FieldLabel>
              <Input
                type="number"
                min={0}
                value={leadTime}
                onChange={(e) => {
                  setLeadTime(Number(e.target.value));
                  pushAppointment();
                }}
              />
            </Field>
            <Field>
              <FieldLabel>Délai minimum urgence (heures)</FieldLabel>
              <Input
                type="number"
                min={0}
                value={urgencyLeadTime}
                onChange={(e) => {
                  setUrgencyLeadTime(Number(e.target.value));
                  pushAppointment();
                }}
              />
            </Field>
            <Field>
              <FieldLabel>Réservation max à l'avance (jours)</FieldLabel>
              <Input
                type="number"
                min={1}
                value={maxAdvance}
                onChange={(e) => {
                  setMaxAdvance(Number(e.target.value));
                  pushAppointment();
                }}
              />
            </Field>
            <Field>
              <FieldLabel>Délai d'annulation sans pénalité (heures)</FieldLabel>
              <Input
                type="number"
                min={0}
                value={cancellation}
                onChange={(e) => {
                  setCancellation(Number(e.target.value));
                  pushAppointment();
                }}
              />
            </Field>
          </div>
          <div className="mt-4 space-y-2">
            <label className="flex items-center gap-2.5 text-sm">
              <Switch
                checked={sameDay}
                onCheckedChange={(v) => {
                  setSameDay(v);
                  pushAppointment();
                }}
              />
              Autoriser les RDV le jour même
            </label>
            <label className="flex items-center gap-2.5 text-sm">
              <Switch
                checked={waitlist}
                onCheckedChange={(v) => {
                  setWaitlist(v);
                  pushAppointment();
                }}
              />
              Activer la liste d'attente si créneaux complets
            </label>
          </div>
        </div>
      </FlatCard>

      {/* ─── Jours fériés ────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <div className="flex items-center gap-1.5">
            <SectionHeader
              icon={<CalendarDays className="h-4 w-4 text-emerald-600" />}
              title="Jours fériés"
            />
            <HelpTooltip content={HELP.calendar.holidays} />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Jours fériés gabonais nationaux, du pays hôte, ou ponctuels.
            Services fermés ces jours-là.
          </p>

          {/* Formulaire inline */}
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto_auto_auto] gap-2 p-3 bg-muted/30 rounded-lg mb-3">
            <Input
              type="date"
              value={newHolidayDate}
              onChange={(e) => setNewHolidayDate(e.target.value)}
              className="w-full"
              placeholder="Date"
            />
            <Input
              value={newHolidayLabel}
              onChange={(e) => setNewHolidayLabel(e.target.value)}
              placeholder="Libellé du jour férié"
            />
            <Select
              value={newHolidaySource}
              onValueChange={(v) =>
                setNewHolidaySource(
                  v as "gabon_national" | "host_country" | "custom",
                )
              }
            >
              <SelectTrigger className="w-full md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gabon_national">🇬🇦 Gabon</SelectItem>
                <SelectItem value="host_country">Pays hôte</SelectItem>
                <SelectItem value="custom">Personnalisé</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-1.5 text-xs">
              <Switch
                checked={newHolidayRecurring}
                onCheckedChange={setNewHolidayRecurring}
              />
              Annuel
            </label>
            <Button
              size="sm"
              onClick={handleAddHoliday}
              disabled={!newHolidayDate || !newHolidayLabel}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Liste existants */}
          <ul className="space-y-1">
            {[...calendar.holidays]
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((h) => (
                <li
                  key={`${h.date}-${h.label}`}
                  className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50"
                >
                  <span className="font-mono text-xs text-muted-foreground w-24 shrink-0">
                    {h.date}
                  </span>
                  <span className="flex-1 text-sm">{h.label}</span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[9px] uppercase",
                      h.source === "gabon_national" &&
                        "bg-emerald-500/10 text-emerald-700",
                      h.source === "host_country" &&
                        "bg-blue-500/10 text-blue-700",
                    )}
                  >
                    {h.source === "gabon_national"
                      ? "Gabon"
                      : h.source === "host_country"
                        ? "Pays hôte"
                        : "Custom"}
                  </Badge>
                  {h.recurring && (
                    <Badge variant="outline" className="text-[9px]">
                      Annuel
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveHoliday(h.date, h.label)}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            {calendar.holidays.length === 0 && (
              <li className="text-xs text-muted-foreground italic py-3 text-center">
                Aucun jour férié configuré
              </li>
            )}
          </ul>
        </div>
      </FlatCard>

      {/* ─── Fermetures exceptionnelles ──────────── */}
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<CalendarX className="h-4 w-4 text-rose-600" />}
            title="Fermetures exceptionnelles"
          />
          <p className="text-xs text-muted-foreground mb-3">
            Périodes ponctuelles de fermeture (grèves, déménagement, événement
            diplomatique, etc.).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr_auto_auto] gap-2 p-3 bg-muted/30 rounded-lg mb-3">
            <Input
              type="date"
              value={newClosureStart}
              onChange={(e) => setNewClosureStart(e.target.value)}
              placeholder="Début"
            />
            <Input
              type="date"
              value={newClosureEnd}
              onChange={(e) => setNewClosureEnd(e.target.value)}
              placeholder="Fin"
            />
            <Input
              value={newClosureReason}
              onChange={(e) => setNewClosureReason(e.target.value)}
              placeholder="Motif (ex: Déménagement bureaux)"
            />
            <label className="flex items-center gap-1.5 text-xs">
              <Switch
                checked={newClosurePublic}
                onCheckedChange={setNewClosurePublic}
              />
              Public
            </label>
            <Button
              size="sm"
              onClick={handleAddClosure}
              disabled={
                !newClosureStart || !newClosureEnd || !newClosureReason
              }
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          <ul className="space-y-1">
            {calendar.exceptionalClosures.map((c, idx) => (
              <li
                key={idx}
                className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {new Date(c.startDate).toLocaleDateString("fr-FR")}
                  {" → "}
                  {new Date(c.endDate).toLocaleDateString("fr-FR")}
                </span>
                <span className="flex-1 text-sm">{c.reasonFr}</span>
                {c.showToPublic ? (
                  <Badge variant="secondary" className="text-[9px]">
                    Public
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px]">
                    Interne
                  </Badge>
                )}
              </li>
            ))}
            {calendar.exceptionalClosures.length === 0 && (
              <li className="text-xs text-muted-foreground italic py-3 text-center">
                Aucune fermeture exceptionnelle planifiée
              </li>
            )}
          </ul>
        </div>
      </FlatCard>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <FlatCard key={i}>
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-2/3" />
            {[1, 2, 3, 4, 5].map((j) => (
              <Skeleton key={j} className="h-8 w-full" />
            ))}
          </div>
        </FlatCard>
      ))}
    </div>
  );
}
