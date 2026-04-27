"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Clock,
  Ear,
  MessageCircle,
  PhoneIncoming,
  Users,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { FEATURES } from "../../lib/feature-flags";
import { cn } from "@workspace/ui/lib/utils";

/**
 * SupervisionPanel — Tableau KPIs live pour les superviseurs.
 *
 * Visible uniquement si l'agent a la permission `meetings.supervise`.
 * Affiche :
 *  - KPIs globaux : queue totale, attente moyenne, %SLA breach, agents en ligne
 *  - Tableau par ligne : queue, queue urgent, avg wait, SLA breach%
 */
export function SupervisionPanel({ orgId }: { orgId: Id<"orgs"> | null }) {
  const { t } = useTranslation();
  const { data, error, isPending } = useAuthenticatedConvexQuery(
    api.functions.callCenter.getSupervisionMetrics,
    orgId ? { orgId } : "skip",
  );

  if (!orgId) return null;

  // Erreur la plus fréquente : pas de permission supervise → silent fallback
  if (error) return null;

  // Pendant le chargement initial, on n'occupe AUCUN espace : ce panneau est
  // optionnel (la majorité des agents n'ont pas la permission supervise et la
  // query retournera une erreur silencieuse). Afficher un placeholder de
  // 120px casse l'interface pendant 200ms à chaque render.
  if (isPending || !data) return null;

  const g = data.global;
  return (
    <section className="border-b bg-muted/10 px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <Activity className="h-3.5 w-3.5 text-primary" />
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-primary">
          {t("callCenter.supervision.title")}
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <KpiCard
          icon={<Clock className="h-3.5 w-3.5" />}
          label={t("callCenter.supervision.kpi.queueDepth")}
          value={String(g.queueDepth)}
          tone={g.queueDepth > 5 ? "warn" : "neutral"}
        />
        <KpiCard
          icon={<Clock className="h-3.5 w-3.5" />}
          label={t("callCenter.supervision.kpi.avgWaitSeconds")}
          value={`${g.avgWaitSeconds}s`}
          tone={g.avgWaitSeconds > 30 ? "warn" : "neutral"}
        />
        <KpiCard
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          label={t("callCenter.supervision.kpi.slaBreachPct")}
          value={`${g.slaBreachPct}%`}
          tone={
            g.slaBreachPct > 20
              ? "danger"
              : g.slaBreachPct > 5
                ? "warn"
                : "neutral"
          }
        />
        <KpiCard
          icon={<Users className="h-3.5 w-3.5" />}
          label={t("callCenter.supervision.kpi.agentsOnline")}
          value={`${g.agentsOnline - g.agentsBusy}/${g.agentsOnline}`}
        />
      </div>

      {data.perLine.length > 0 && (
        <div className="mt-3">
          <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {t("callCenter.supervision.perLine")}
          </h4>
          <ul className="flex flex-col gap-1">
            {data.perLine.map((l) => (
              <li
                key={(l.lineId as string | null) ?? l.label}
                className="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-[11px]"
              >
                {l.color && (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: l.color }}
                  />
                )}
                <span className="w-28 shrink-0 truncate font-semibold">
                  {l.label}
                </span>
                <span className="w-10 text-right font-mono">
                  {l.queueDepth}
                </span>
                {l.queueUrgent > 0 && (
                  <span className="rounded-full bg-destructive/10 px-1.5 text-[9px] font-bold text-destructive">
                    {l.queueUrgent} ⚠
                  </span>
                )}
                <span className="ml-auto w-14 text-right text-muted-foreground">
                  {l.avgWaitSeconds}s
                </span>
                <span
                  className={cn(
                    "w-10 text-right font-mono",
                    l.slaBreachPct > 20
                      ? "text-destructive"
                      : l.slaBreachPct > 5
                        ? "text-muted-foreground"
                        : "text-muted-foreground",
                  )}
                >
                  {l.slaBreachPct}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sprint 6 — Supervision actions (whisper / barge / listen) */}
      {FEATURES.supervisionWhisper && <SupervisionActions orgId={orgId} />}
    </section>
  );
}

/**
 * SupervisionActions — bloc avec 3 boutons (Listen/Whisper/Barge) par appel actif.
 * Respect Design System v3.0 :
 *  - Conteneur bg-foreground/8 (Niveau S2)
 *  - Boutons Type A (secondary) pour Listen
 *  - Bouton primary pour Whisper
 *  - Bouton rose-500/10 pour Barge (action intrusive)
 */
function SupervisionActions({ orgId }: { orgId: Id<"orgs"> }) {
  const { t } = useTranslation();
  const activeSupervisions = useAuthenticatedConvexQuery(
    api.functions.supervision.listActiveSupervisions,
    { orgId },
  );
  const startSupervision = useMutation(
    api.functions.supervision.startSupervision,
  );
  const endSupervision = useMutation(
    api.functions.supervision.endSupervision,
  );
  const [pendingMode, setPendingMode] = useState<string | null>(null);

  // Récupère les appels actifs depuis le cache callCenter
  const queuedCalls = useAuthenticatedConvexQuery(
    api.functions.callCenter.listQueuedCallsForAgent,
    {},
  );

  const mySession = (activeSupervisions.data ?? [])[0] ?? null;

  const handleStart = async (
    meetingId: Id<"meetings">,
    mode: "listen" | "whisper" | "barge",
  ) => {
    setPendingMode(`${meetingId}:${mode}`);
    try {
      await startSupervision({ meetingId, mode });
      toast.success(t(`callCenter.supervision.modeBadge.${mode}`));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur supervision");
    } finally {
      setPendingMode(null);
    }
  };

  const handleEnd = async () => {
    if (!mySession) return;
    try {
      await endSupervision({ sessionId: mySession._id });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  const calls = queuedCalls.data ?? [];

  return (
    <div className="mt-3 rounded-lg bg-foreground/[0.06] dark:bg-foreground/[0.12] p-2">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
          {t("callCenter.supervision.actions")}
        </h4>
        {mySession && (
          <button
            type="button"
            onClick={handleEnd}
            className="flex h-5 items-center gap-1 rounded-md bg-rose-500/10 px-1.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 transition-transform active:scale-[0.97]"
          >
            <X className="h-2.5 w-2.5" />
            {t("callCenter.supervision.endSession")}
          </button>
        )}
      </div>

      {calls.length === 0 ? (
        <p className="py-2 text-center text-[11px] font-medium text-muted-foreground">
          {t("callCenter.supervision.noActiveCalls")}
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {calls.slice(0, 5).map((call: any) => {
            const meetingId = call.meeting._id as Id<"meetings">;
            const isCurrentTarget = mySession?.meetingId === meetingId;
            const currentMode = isCurrentTarget ? mySession?.mode : null;
            return (
              <li
                key={meetingId}
                className="flex items-center gap-2 rounded-md bg-card px-2 py-1.5"
              >
                <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-foreground">
                  {call.meeting.title ?? call.line?.label ?? "Appel"}
                </span>
                <SupervisionButton
                  icon={<Ear className="h-3 w-3" />}
                  label={t("callCenter.supervision.listenMode")}
                  tone="secondary"
                  active={currentMode === "listen"}
                  disabled={pendingMode === `${meetingId}:listen`}
                  onClick={() => handleStart(meetingId, "listen")}
                />
                <SupervisionButton
                  icon={<MessageCircle className="h-3 w-3" />}
                  label={t("callCenter.supervision.whisperMode")}
                  tone="primary"
                  active={currentMode === "whisper"}
                  disabled={pendingMode === `${meetingId}:whisper`}
                  onClick={() => handleStart(meetingId, "whisper")}
                />
                <SupervisionButton
                  icon={<PhoneIncoming className="h-3 w-3" />}
                  label={t("callCenter.supervision.bargeMode")}
                  tone="rose"
                  active={currentMode === "barge"}
                  disabled={pendingMode === `${meetingId}:barge`}
                  onClick={() => handleStart(meetingId, "barge")}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SupervisionButton({
  icon,
  label,
  tone,
  active,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "secondary" | "primary" | "rose";
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const toneCls = {
    secondary: active
      ? "bg-primary text-white"
      : "bg-[#DCD7C7] dark:bg-[#4A4744]/40 text-foreground hover:bg-[#DCD7C7]/80",
    primary: active
      ? "bg-primary text-white"
      : "bg-primary/15 text-primary hover:bg-primary/20",
    rose: active
      ? "bg-rose-500 text-white"
      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/15",
  }[tone];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-6 items-center gap-1 rounded-md px-1.5 text-[10px] font-bold transition-transform active:scale-[0.97] disabled:opacity-50",
        toneCls,
      )}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

function KpiCard({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "neutral" | "warn" | "danger";
}) {
  const toneStyles = {
    neutral: "border-border",
    warn: "border-border bg-muted/40",
    danger: "border-destructive/30 bg-destructive/5",
  } as const;
  const valueStyles = {
    neutral: "text-foreground",
    warn: "text-muted-foreground",
    danger: "text-destructive",
  } as const;
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg border bg-card px-2.5 py-2",
        toneStyles[tone],
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <span className={cn("text-base font-bold tabular-nums", valueStyles[tone])}>
        {value}
      </span>
    </div>
  );
}
