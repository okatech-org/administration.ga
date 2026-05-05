"use client";

import { Mic, MicOff, Phone, PhoneOff, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Id } from "@convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { useCitizenContext } from "../../hooks/use-citizen-context";
import { useCallStore } from "../../stores/call-store";
import type { ActiveCallSlot } from "./ActiveCallsBar";

/**
 * Vue plein-centre pendant un appel actif — remplace IncomingCallQueue
 * dans la colonne centrale quand `activeCalls.length > 0`.
 *
 * Rôle : centrer l'attention de l'agent sur la personne au bout du fil.
 * Identité + chrono + contrôles primaires. Le dossier reste dans le drawer.
 */
export function ActiveConversationView({
  call,
  onHold,
  onResume,
  onEnd,
}: {
  call: ActiveCallSlot & { _id: string };
  onHold: (id: Id<"meetings">) => void;
  onResume: (id: Id<"meetings">) => void;
  onEnd: (id: Id<"meetings">) => void;
}) {
  const { t } = useTranslation();
  const { context } = useCitizenContext(call._id as Id<"meetings">);
  const { micMuted, setMicMuted } = useCallStore();

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

  const displayName = context?.caller.name ?? call.callerName;
  const avatarUrl = context?.caller.avatarUrl ?? null;
  const phone = context?.caller.phone ?? null;
  const email = context?.caller.email ?? null;

  const initials =
    displayName
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-8">
      {/* Bandeau ligne — liseré couleur en haut */}
      {call.lineColor && (
        <span
          className="absolute inset-x-0 top-0 h-0.5"
          style={{ backgroundColor: call.lineColor }}
          aria-hidden
        />
      )}

      {/* Statut + ligne */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-2 w-2 rounded-full",
            isHeld ? "bg-muted-foreground" : "bg-primary animate-pulse",
          )}
        />
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {isHeld
            ? t("callCenter.conversation.onHold")
            : t("callCenter.conversation.live")}
        </span>
        {call.lineLabel && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-[11px] font-medium text-muted-foreground">
              {call.lineLabel}
            </span>
          </>
        )}
      </div>

      {/* Avatar + identité */}
      <div className="flex flex-col items-center gap-3">
        <Avatar className="h-24 w-24 ring-4 ring-primary/10">
          <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
          <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h2 className="text-xl font-bold">{displayName}</h2>
          {phone && (
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              {phone}
            </p>
          )}
          {!phone && email && (
            <p className="mt-1 text-sm text-muted-foreground">{email}</p>
          )}
        </div>
      </div>

      {/* Chrono */}
      <div className="flex flex-col items-center">
        <span className="font-mono text-4xl font-bold tabular-nums">
          {timerText}
        </span>
        <span className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground/70">
          {isHeld
            ? t("callCenter.conversation.parkedFor")
            : t("callCenter.conversation.inCall")}
        </span>
      </div>

      {/* Contrôles primaires — Mute / End. Le Hold (Sprint 2) est retiré
          de la vue centrale ; reprendre un appel parqué reste possible
          depuis le slot pill de la barre des appels actifs. */}
      <div className="flex items-center gap-3">
        {isHeld && (
          <Button
            size="lg"
            variant="secondary"
            className="h-12 gap-2"
            onClick={() => onResume(call._id as Id<"meetings">)}
          >
            <Play className="h-4 w-4" />
            {t("callCenter.action.resume")}
          </Button>
        )}
        <Button
          size="lg"
          variant={micMuted ? "default" : "secondary"}
          aria-pressed={micMuted}
          disabled={isHeld}
          className={cn(
            "h-12 gap-2",
            micMuted && "bg-amber-500 text-white hover:bg-amber-500/90",
          )}
          onClick={() => setMicMuted(!micMuted)}
          title={
            micMuted
              ? t("callCenter.action.unmute")
              : t("callCenter.action.mute")
          }
        >
          {micMuted ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          {micMuted
            ? t("callCenter.action.unmute")
            : t("callCenter.action.mute")}
        </Button>
        <Button
          size="lg"
          variant="destructive"
          className="h-12 gap-2"
          onClick={() => onEnd(call._id as Id<"meetings">)}
        >
          <PhoneOff className="h-4 w-4" />
          {t("callCenter.action.end")}
        </Button>
      </div>

      {/* Indice dossier (le détail reste dans le drawer) */}
      <p className="max-w-sm text-center text-[11px] text-muted-foreground/70">
        <Phone className="mr-1 inline h-3 w-3" />
        {t("callCenter.conversation.dossierHint")}
      </p>
    </div>
  );
}
