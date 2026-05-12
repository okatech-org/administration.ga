"use client";

/**
 * CallSidePane — panneau contexte citoyen single-flow (col 3 du layout iCom).
 *
 * Remplace l'ancien CallContextDrawer à tabs (Dossiers / Rendez-vous /
 * Correspondance / Historique). Layout fidèle à la maquette
 * `agent-desktop.jsx > AgContextPane` : sections empilées sans navigation.
 *
 * Sections :
 *   1. Identité (avatar + nom + NIP + coordonnées)
 *   2. Statut séjour (placeholder — schéma backend pas encore prêt)
 *   3. Démarches en cours (réutilise OngoingDossierList)
 *   4. Prochain RDV (carte mini-calendrier)
 *   5. Actions rapides (grille 2×2)
 */

import { useRouter } from "@workspace/routing";
import {
  FileText,
  Loader2,
  StickyNote,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Id } from "@convex/_generated/dataModel";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { cn } from "@workspace/ui/lib/utils";
import { useCitizenContext } from "../../hooks/use-citizen-context";
import { OngoingDossierList } from "./OngoingDossierList";

interface CallSidePaneProps {
  /** Meeting actuellement focalisé dans la zone conversation. */
  meetingId: Id<"meetings"> | null;
  /** Org active — conservé pour compat (transfer dialog géré au shell). */
  orgId?: Id<"orgs"> | null;
  /** Meeting actif (différent de focused si l'agent regarde un autre slot). */
  activeMeetingId?: Id<"meetings"> | null;
  onTransfer?: (
    meetingId: Id<"meetings">,
    target: { userId?: Id<"users">; lineId?: Id<"callLines"> },
  ) => Promise<void>;
  onOpenRequest?: (requestId: string) => void;
}

export function CallSidePane({
  meetingId,
  orgId: _orgId,
  activeMeetingId: _activeMeetingId,
  onTransfer: _onTransfer,
  onOpenRequest,
}: CallSidePaneProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { context, isPending } = useCitizenContext(meetingId);

  // ─── Empty state — aucun appel sélectionné ─────────────────────────
  if (!meetingId) {
    return (
      <aside className="hidden lg:flex flex-col items-center justify-center border-l p-6 text-center bg-card/30 min-h-0">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted/40">
          <FileText className="h-6 w-6 text-muted-foreground/60" />
        </div>
        <h3 className="text-sm font-semibold">
          {t("callCenter.drawer.selectCall", "Sélectionnez un appel")}
        </h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          {t(
            "callCenter.drawer.selectCallHint",
            "Cliquez sur une carte pour afficher le contexte du citoyen.",
          )}
        </p>
      </aside>
    );
  }

  // ─── Loading state ───────────────────────────────────────────────
  if (isPending || !context) {
    return (
      <aside className="hidden lg:flex flex-col items-center justify-center border-l min-h-0">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </aside>
    );
  }

  // ─── Ready ──────────────────────────────────────────────────────
  const { caller, openRequests, closedRequestsCount, upcomingAppointments } =
    context;

  const initials =
    caller.name
      .split(/\s+/)
      .map((w: string) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  const birthLabel = caller.birthDate
    ? new Date(caller.birthDate).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const callerUserId = (caller as any).userId ?? null;

  const handleOpenProfile = () => {
    if (callerUserId) {
      router.push(`/affaires-consulaires?citizen=${callerUserId}`);
    }
  };

  const nextAppointment = upcomingAppointments?.[0];

  return (
    <aside className="hidden lg:flex flex-col border-l bg-card/30 min-h-0 overflow-hidden">
      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col gap-5 px-5 py-5">
          {/* ── 1. Identité ─────────────────────────────────────── */}
          <section>
            <div className="flex items-start gap-3 mb-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={caller.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-sm font-bold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold leading-snug">
                  {caller.name}
                </p>
                {caller.nip ? (
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    NIP · {caller.nip}
                  </p>
                ) : (
                  <p className="mt-0.5 text-[11px] text-muted-foreground/70 italic">
                    {t(
                      "callCenter.drawer.citizen.noIdentity",
                      "Identité non renseignée",
                    )}
                  </p>
                )}
              </div>
              {callerUserId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={handleOpenProfile}
                >
                  {t("common.view", "Voir")}
                </Button>
              )}
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[12px]">
              {caller.nationality && (
                <KvRow
                  label={t("callCenter.drawer.citizen.nationality", "Nationalité")}
                  value={caller.nationality}
                />
              )}
              {birthLabel && (
                <KvRow
                  label={t("callCenter.drawer.citizen.birthDate", "Naissance")}
                  value={birthLabel}
                />
              )}
              {caller.countryOfResidence && (
                <KvRow
                  label={t("callCenter.drawer.citizen.country", "Résidence")}
                  value={caller.countryOfResidence}
                />
              )}
              {caller.email && (
                <KvRow
                  label={t("callCenter.drawer.citizen.email", "Email")}
                  value={caller.email}
                  mono
                />
              )}
              {caller.phone && (
                <KvRow
                  label={t("callCenter.drawer.citizen.phone", "Téléphone")}
                  value={caller.phone}
                  mono
                />
              )}
            </dl>
          </section>

          <Divider />

          {/* ── 2. Démarches en cours ─────────────────────────── */}
          <section>
            <SectionHeader
              label={t(
                "callCenter.drawer.dossiers.title",
                "Démarches en cours",
              )}
              count={openRequests?.length ?? 0}
            />
            <OngoingDossierList
              requests={(openRequests ?? []) as any}
              closedCount={closedRequestsCount ?? 0}
              onOpenRequest={onOpenRequest}
            />
          </section>

          <Divider />

          {/* ── 3. Prochain RDV ─────────────────────────────────── */}
          <section>
            <SectionHeader
              label={t("callCenter.drawer.appointments.title", "Prochain RDV")}
            />
            {nextAppointment ? (
              <NextAppointmentCard appointment={nextAppointment} />
            ) : (
              <p className="text-[12px] text-muted-foreground italic">
                {t(
                  "callCenter.drawer.appointments.empty",
                  "Aucun rendez-vous planifié",
                )}
              </p>
            )}
          </section>

          <Divider />

          {/* ── 4. Notes pendant l'appel ─────────────────────────
              Remplace l'ancienne grille "Actions rapides". Le transfert
              reste accessible via les contrôles secondaires de
              ActiveConversationView, la création de demande / RDV depuis
              le bouton "Voir" du profil citoyen. */}
          <section>
            <SectionHeader
              label={t(
                "callCenter.notes.title",
                "Notes pendant l'appel",
              )}
              icon={StickyNote}
            />
            <textarea
              placeholder={t(
                "callCenter.notes.placeholder",
                "Notez les points clés de la conversation, les actions à prendre, les références…",
              )}
              className="w-full min-h-[140px] rounded-xl bg-secondary/40 px-3 py-2.5 text-[12.5px] leading-[1.55] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
            <p className="mt-1.5 text-[10.5px] text-muted-foreground/70 italic">
              {t(
                "callCenter.notes.localOnly",
                "Notes locales — sauvegarde automatique à venir.",
              )}
            </p>
          </section>
        </div>
      </ScrollArea>

    </aside>
  );
}

// ════════════════════════════════════════════════════════════════════
// Sub-components
// ════════════════════════════════════════════════════════════════════

function KvRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <>
      <dt className="text-[10.5px] uppercase tracking-wider text-muted-foreground/70 font-medium pt-0.5">
        {label}
      </dt>
      <dd
        className={cn(
          "text-right text-[12px] font-medium break-all min-w-0",
          mono && "font-mono text-[11.5px]",
        )}
      >
        {value}
      </dd>
    </>
  );
}

function Divider() {
  return <div className="h-px bg-border" />;
}

function SectionHeader({
  label,
  count,
  icon: Icon,
}: {
  label: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <h3 className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/80">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </h3>
      {count !== undefined && count > 0 && (
        <Badge
          variant="outline"
          className="h-4 px-1.5 text-[10px] font-medium border-muted-foreground/30 text-muted-foreground"
        >
          {count}
        </Badge>
      )}
    </div>
  );
}

function NextAppointmentCard({ appointment }: { appointment: any }) {
  const start = new Date(appointment.startAt ?? appointment._creationTime);
  const monthLabel = start
    .toLocaleDateString("fr-FR", { month: "short" })
    .replace(".", "")
    .toUpperCase();
  const dayLabel = String(start.getDate());
  const timeLabel = start.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="grid grid-cols-[auto_1fr] gap-3 rounded-xl border bg-card p-3 items-center">
      <div className="flex h-11 w-11 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary leading-none">
        <span className="text-[9px] tracking-wider font-semibold">
          {monthLabel}
        </span>
        <span className="text-[16px] font-bold mt-0.5">{dayLabel}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold leading-tight truncate">
          {appointment.title ?? "Rendez-vous"}
        </p>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground truncate">
          {timeLabel}
          {appointment.location && ` · ${appointment.location}`}
        </p>
      </div>
    </div>
  );
}

