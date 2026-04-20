"use client";

import {
  ArrowDownLeft,
  Calendar,
  FileText,
  History,
  Loader2,
  MailOpen,
  Mic,
  Video,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Id } from "@convex/_generated/dataModel";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { cn } from "@workspace/ui/lib/utils";
import { useCitizenContext } from "../../hooks/use-citizen-context";
import { CitizenContextPanel } from "./CitizenContextPanel";
import { OngoingDossierList } from "./OngoingDossierList";
import { QuickActions } from "./QuickActions";

type DrawerTab = "dossiers" | "appointments" | "correspondance" | "history";

/**
 * Drawer contextuel (colonne droite) — hydraté dynamiquement selon le slot focalisé.
 * Tabs : Dossiers (défaut), RDV, Correspondance, Historique.
 * Sprint 1 : Dossiers + identité + historique d'appels sommaire.
 * Sprint 2 : correspondance détaillée, dossier procedures multi-étapes.
 */
export function CallContextDrawer({
  meetingId,
  onOpenRequest,
  orgId,
  activeMeetingId,
  onTransfer,
  onEscalate,
}: {
  meetingId: Id<"meetings"> | null;
  onOpenRequest?: (requestId: string) => void;
  orgId?: Id<"orgs"> | null;
  activeMeetingId?: Id<"meetings"> | null;
  onTransfer?: (
    meetingId: Id<"meetings">,
    target: { userId?: Id<"users">; lineId?: Id<"callLines"> },
  ) => Promise<void>;
  onEscalate?: (meetingId: Id<"meetings">) => void;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<DrawerTab>("dossiers");
  const { context, isPending } = useCitizenContext(meetingId);

  if (!meetingId) {
    return (
      <div className="flex h-full w-[420px] shrink-0 flex-col items-center justify-center border-l p-6 text-center lg:w-[460px]">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted/40">
          <FileText className="h-6 w-6 text-muted-foreground/60" />
        </div>
        <h3 className="text-sm font-semibold">
          {t("callCenter.drawer.selectCall")}
        </h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          {t("callCenter.drawer.selectCallHint")}
        </p>
      </div>
    );
  }

  if (isPending || !context) {
    return (
      <div className="flex h-full w-[420px] shrink-0 flex-col items-center justify-center border-l lg:w-[460px]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const TABS: Array<{ id: DrawerTab; label: string; icon: typeof FileText }> = [
    {
      id: "dossiers",
      label: t("callCenter.drawer.tabs.dossiers"),
      icon: FileText,
    },
    {
      id: "appointments",
      label: t("callCenter.drawer.tabs.appointments"),
      icon: Calendar,
    },
    {
      id: "correspondance",
      label: t("callCenter.drawer.tabs.correspondance"),
      icon: MailOpen,
    },
    {
      id: "history",
      label: t("callCenter.drawer.tabs.history"),
      icon: History,
    },
  ];

  return (
    <aside className="flex h-full w-[420px] shrink-0 flex-col border-l bg-background lg:w-[460px]">
      <ScrollArea className="flex-1">
        <CitizenContextPanel
          citizen={context.caller}
          flags={context.flags}
        />

        {/* Tabs */}
        <div className="sticky top-0 z-10 flex items-center gap-0.5 border-b bg-background px-2 py-2">
          {TABS.map((item) => {
            const Icon = item.icon;
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {tab === "dossiers" && (
          <OngoingDossierList
            requests={context.openRequests}
            closedCount={context.closedRequestsCount}
            onOpenRequest={onOpenRequest}
          />
        )}

        {tab === "appointments" && (
          <AppointmentsTab
            upcoming={context.upcomingAppointments}
            recent={context.recentAppointments}
          />
        )}

        {tab === "correspondance" && (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <MailOpen className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {t("callCenter.drawer.history.empty")}
            </p>
          </div>
        )}

        {tab === "history" && (
          <CallHistoryTab calls={context.recentCalls} />
        )}
      </ScrollArea>

      {/* QuickActions sticky — disponibles si on a un appel actif */}
      {onTransfer && (
        <QuickActions
          orgId={orgId ?? null}
          activeMeetingId={activeMeetingId ?? null}
          callerUserId={context.caller.userId as string}
          onTransfer={onTransfer}
          onEscalate={onEscalate}
        />
      )}
    </aside>
  );
}

function AppointmentsTab({
  upcoming,
  recent,
}: {
  upcoming: Array<{
    _id: string;
    date: string;
    time: string;
    status: string;
    appointmentType: string | null;
  }>;
  recent: Array<{
    _id: string;
    date: string;
    time: string;
    status: string;
    appointmentType: string | null;
  }>;
}) {
  const { t } = useTranslation();
  if (upcoming.length === 0 && recent.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
        <Calendar className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          {t("callCenter.drawer.appointments.empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-3">
      {upcoming.length > 0 && (
        <section>
          <h4 className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
            {t("callCenter.drawer.appointments.upcoming")}
          </h4>
          <ul className="flex flex-col gap-1.5">
            {upcoming.map((a) => (
              <AppointmentRow key={a._id} appointment={a} />
            ))}
          </ul>
        </section>
      )}
      {recent.length > 0 && (
        <section>
          <h4 className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
            {t("callCenter.drawer.appointments.recent")}
          </h4>
          <ul className="flex flex-col gap-1.5">
            {recent.map((a) => (
              <AppointmentRow key={a._id} appointment={a} dimmed />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function AppointmentRow({
  appointment,
  dimmed = false,
}: {
  appointment: {
    date: string;
    time: string;
    status: string;
    appointmentType: string | null;
  };
  dimmed?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <li
      className={cn(
        "flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2",
        dimmed && "opacity-70",
      )}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Calendar className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold">
          {appointment.date} · {appointment.time}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {appointment.appointmentType === "deposit"
            ? t("callCenter.drawer.appointments.deposit")
            : appointment.appointmentType === "pickup"
              ? t("callCenter.drawer.appointments.pickup")
              : appointment.status}
        </p>
      </div>
    </li>
  );
}

function CallHistoryTab({
  calls,
}: {
  calls: Array<{
    _id: string;
    _creationTime: number;
    callStatus: string | null;
    endReason: string | null;
    mediaType: string;
  }>;
}) {
  const { t } = useTranslation();
  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
        <History className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          {t("callCenter.drawer.history.empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 px-4 py-3">
      <h4 className="px-1 pb-1 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
        {t("callCenter.drawer.history.title")}
      </h4>
      <ul className="flex flex-col gap-1.5">
        {calls.map((c) => {
          const isMissed = c.callStatus === "missed";
          const isDeclined = c.callStatus === "declined";
          const Icon =
            c.mediaType === "video" ? Video : isMissed ? Mic : ArrowDownLeft;
          const label = isMissed
            ? t("callCenter.drawer.history.missed")
            : isDeclined
              ? t("callCenter.drawer.history.declined")
              : c.callStatus === "ended"
                ? t("callCenter.drawer.history.ended")
                : t("callCenter.drawer.history.answered");
          return (
            <li
              key={c._id}
              className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2"
            >
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                  isMissed
                    ? "bg-destructive/10 text-destructive"
                    : "bg-primary/10 text-primary",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium">{label}</p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(c._creationTime).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
