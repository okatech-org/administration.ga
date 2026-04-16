"use client";

import { AlertCircle, ArrowRightLeft, Phone, PhoneOff, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PriorityBadge, type CallPriority } from "./PriorityBadge";

export interface CallCardData {
  _id: string;
  _creationTime: number;
  caller: {
    name: string;
    nip: string | null;
    avatarUrl: string | null;
  };
  lineLabel: string | null;
  lineColor: string | null;
  priority: CallPriority;
  mediaType: "audio" | "video";
  hasOpenRequests: boolean;
  openRequestsCount: number;
  incomingMs: number;
  isFocused?: boolean;
  wasRedirected?: boolean;
  originalLineLabel?: string | null;
}

/**
 * Carte d'appel entrant — affichée dans la file d'attente.
 * Design neumorphique : stripe gauche colorée selon la ligne, dot de priorité animé,
 * hover + focus states respectant les tokens.
 */
export function CallCard({
  call,
  onPickup,
  onDecline,
  onFocus,
  isPickingUp = false,
  isFocused = false,
}: {
  call: CallCardData;
  onPickup: () => void;
  onDecline: () => void;
  onFocus?: () => void;
  isPickingUp?: boolean;
  isFocused?: boolean;
}) {
  const { t } = useTranslation();

  // Timer live (chaque seconde, reset si la carte disparaît)
  const [seconds, setSeconds] = useState(
    Math.floor(call.incomingMs / 1000),
  );
  useEffect(() => {
    const baseMs = Date.now() - call.incomingMs;
    const id = setInterval(() => {
      setSeconds(Math.floor((Date.now() - baseMs) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [call.incomingMs]);

  const initials =
    call.caller.name
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  const stripeColor = call.lineColor ?? "transparent";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onFocus}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onFocus?.();
        }
      }}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-xl border bg-card px-3 py-3 text-left transition-all cursor-pointer",
        "hover:bg-muted/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        isFocused && "ring-2 ring-primary/40 bg-muted/30",
        call.priority === "urgent" && "border-destructive/50",
      )}
    >
      {/* Stripe couleur ligne */}
      <span
        className="absolute inset-y-2 left-0 w-0.5 rounded-full"
        style={{ backgroundColor: stripeColor }}
        aria-hidden
      />

      {/* Avatar + dot statut */}
      <div className="relative shrink-0">
        <Avatar className="h-11 w-11">
          <AvatarImage src={call.caller.avatarUrl ?? undefined} />
          <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ring-2 ring-background",
            call.priority === "urgent"
              ? "bg-destructive animate-pulse"
              : "bg-primary",
          )}
          aria-hidden
        />
      </div>

      {/* Contenu */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{call.caller.name}</p>
          {call.caller.nip && (
            <span className="truncate text-[10px] font-mono text-muted-foreground">
              {call.caller.nip}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <PriorityBadge priority={call.priority} />
          {call.lineLabel && (
            <span className="truncate text-[11px] text-muted-foreground">
              {call.lineLabel}
            </span>
          )}
          {call.wasRedirected && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400"
              title={
                call.originalLineLabel
                  ? t("callCenter.card.redirectedFrom", {
                      line: call.originalLineLabel,
                    })
                  : t("callCenter.card.redirected")
              }
            >
              <ArrowRightLeft className="h-2.5 w-2.5" />
              {t("callCenter.card.redirected")}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{t("callCenter.card.ringingSince", { seconds })}</span>
          {call.hasOpenRequests && (
            <span className="flex items-center gap-1 text-foreground/80">
              <AlertCircle className="h-3 w-3" />
              {t("callCenter.card.openDossiers", {
                count: call.openRequestsCount,
              })}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDecline();
          }}
          title={t("callCenter.action.decline")}
        >
          <PhoneOff className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          className={cn(
            "h-9 w-9",
            call.priority === "urgent"
              ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
          onClick={(e) => {
            e.stopPropagation();
            onPickup();
          }}
          disabled={isPickingUp}
          title={t("callCenter.action.pickup")}
        >
          {call.mediaType === "video" ? (
            <Video className="h-4 w-4" />
          ) : (
            <Phone className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
