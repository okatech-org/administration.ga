"use client";

import {
  FileText,
  Mic,
  MicOff,
  Pause,
  PhoneOff,
  Play,
  Plus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Id } from "@convex/_generated/dataModel";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { useCitizenContext } from "../../hooks/use-citizen-context";
import { useCallStore } from "../../stores/call-store";
import type { ActiveCallSlot } from "./ActiveCallsBar";
import { AddAgentDialog } from "./AddAgentDialog";

/**
 * Vue plein-centre pendant un appel actif — remplace IncomingCallQueue
 * dans la colonne centrale quand `activeCalls.length > 0`.
 *
 * Refonte UX (sprint 2026-05) : layout horizontal hero (avatar | identité |
 * chrono) puis control-bar inline puis split notes/AI suggestions.
 */
export function ActiveConversationView({
  call,
  onHold,
  onResume,
  onEnd,
  onRequestTransfer,
}: {
  call: ActiveCallSlot & { _id: string };
  onHold: (id: Id<"meetings">) => void;
  onResume: (id: Id<"meetings">) => void;
  onEnd: (id: Id<"meetings">) => void;
  /** Ouvre la dialog de transfert chaud — gérée par le parent (shell). */
  onRequestTransfer?: (id: Id<"meetings">) => void;
}) {
  const { t } = useTranslation();
  const { context } = useCitizenContext(call._id as Id<"meetings">);
  const { micMuted, setMicMuted } = useCallStore();
  const [addAgentOpen, setAddAgentOpen] = useState(false);

  const isHeld = call.callStatus === "on_hold";
  const baseTs = isHeld ? call.parkedAt : call.answeredAt;

  const [elapsed, setElapsed] = useState(() =>
    baseTs ? Math.floor((Date.now() - baseTs) / 1000) : 0,
  );
  useEffect(() => {
    if (!baseTs) return;
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - baseTs) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, [baseTs]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const timerText = `${mm}:${ss}`;

  const startedAt = call.answeredAt
    ? new Date(call.answeredAt).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const displayName = context?.caller.name ?? call.callerName;
  const avatarUrl = context?.caller.avatarUrl ?? null;
  const phone = context?.caller.phone ?? null;
  const dossierRef = (context?.caller as any)?.reference ?? null;

  const initials =
    displayName
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  const stateLabel = isHeld
    ? t("callCenter.conversation.onHold", "En attente")
    : t("callCenter.conversation.live", "En communication");

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
      {/* ═══ Hero card — avatar + identité + chrono ═══ */}
      <div className="rounded-2xl border bg-card p-5 md:p-6 relative overflow-hidden">
        {/* Bandeau ligne — liseré couleur en haut */}
        {call.lineColor && (
          <span
            className="absolute inset-x-0 top-0 h-0.5"
            style={{ backgroundColor: call.lineColor }}
            aria-hidden
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-center gap-4 md:gap-6">
          {/* Avatar */}
          <div className="av-ring text-primary/30">
            <Avatar className="h-20 w-20 md:h-24 md:w-24 ring-4 ring-primary/10">
              <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
              <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-2xl font-bold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Identité */}
          <div className="min-w-0">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              {displayName}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              {context?.caller.role && (
                <Badge
                  variant="outline"
                  className="h-5 px-2 text-[10px] font-medium border-primary/30 text-primary bg-primary/5"
                >
                  {context.caller.role}
                </Badge>
              )}
              {phone && (
                <>
                  <span className="font-mono text-xs">{phone}</span>
                </>
              )}
              {call.lineLabel && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-xs">{call.lineLabel}</span>
                </>
              )}
              {dossierRef && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="font-mono text-xs">{dossierRef}</span>
                </>
              )}
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <span
                className={cn(
                  "call-bars-anim",
                  isHeld ? "text-warning opacity-50" : "text-primary",
                )}
              >
                {Array.from({ length: 7 }).map((_, i) => (
                  <span key={i} />
                ))}
              </span>
              <span
                className={cn(
                  "text-xs font-semibold",
                  isHeld ? "text-warning" : "text-primary",
                )}
              >
                {stateLabel}
              </span>
            </div>
          </div>

          {/* Chrono */}
          <div className="text-left md:text-right">
            <div className="font-mono text-3xl md:text-4xl font-bold tabular-nums leading-none">
              {timerText}
            </div>
            {startedAt && (
              <div className="mt-1.5 text-[11px] text-muted-foreground">
                {isHeld
                  ? t("callCenter.conversation.parkedFor", "En attente depuis")
                  : t("callCenter.conversation.startedAt", "Démarré à")}{" "}
                {startedAt}
              </div>
            )}
          </div>
        </div>

        <div className="my-5 h-px bg-border" />

        {/* Control bar — horizontal, dense */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={micMuted ? "default" : "outline"}
            aria-pressed={micMuted}
            disabled={isHeld}
            className={cn(
              "h-9 gap-2",
              micMuted && "bg-warning text-warning-foreground hover:bg-warning/90",
            )}
            onClick={() => setMicMuted(!micMuted)}
          >
            {micMuted ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
            {micMuted
              ? t("callCenter.action.unmute", "Réactiver micro")
              : t("callCenter.action.mute", "Couper micro")}
          </Button>

          {isHeld ? (
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-2"
              onClick={() => onResume(call._id as Id<"meetings">)}
            >
              <Play className="h-4 w-4" />
              {t("callCenter.action.resume", "Reprendre")}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-2"
              onClick={() => onHold(call._id as Id<"meetings">)}
            >
              <Pause className="h-4 w-4" />
              {t("callCenter.action.hold", "Mettre en attente")}
            </Button>
          )}

          {onRequestTransfer && (
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-2"
              onClick={() => onRequestTransfer(call._id as Id<"meetings">)}
            >
              <Users className="h-4 w-4" />
              {t("callCenter.action.transfer", "Transférer")}
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-2"
            onClick={() => setAddAgentOpen(true)}
          >
            <Plus className="h-4 w-4" />
            {t("callCenter.action.addAgent", "Ajouter un agent")}
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-2 hidden md:inline-flex"
            disabled
            title={t("common.comingSoon", "Bientôt")}
          >
            <FileText className="h-4 w-4" />
            {t("callCenter.action.shareDoc", "Partager un document")}
          </Button>

          <span className="flex-1" />

          <Button
            size="sm"
            variant="destructive"
            className="h-9 gap-2"
            onClick={() => onEnd(call._id as Id<"meetings">)}
          >
            <PhoneOff className="h-4 w-4" />
            {t("callCenter.action.end", "Raccrocher")}
          </Button>
        </div>
      </div>

      {/* ═══ Notes pendant l'appel ═══ */}
      <div className="rounded-2xl border bg-card p-4 flex flex-col flex-1 min-h-0">
        <div className="text-[11px] uppercase tracking-[0.08em] font-semibold text-muted-foreground mb-2.5">
          {t("callCenter.notes.title", "Notes pendant l'appel")}
        </div>
        <textarea
          placeholder={t(
            "callCenter.notes.placeholder",
            "Notez les points clés de la conversation, les actions à prendre, les références…",
          )}
          className="flex-1 min-h-[160px] rounded-xl bg-secondary/40 px-3.5 py-3 text-[13.5px] leading-[1.6] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>

      <AddAgentDialog
        open={addAgentOpen}
        onOpenChange={setAddAgentOpen}
        meetingId={call._id as Id<"meetings">}
      />
    </div>
  );
}
