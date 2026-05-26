"use client";

import { Phone, PhoneOff, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

export interface ActiveCallSlot {
  _id: string;
  callStatus: "connected" | "on_hold" | string;
  answeredAt: number | null;
  parkedAt: number | null;
  callerName: string;
  lineLabel: string | null;
  lineColor?: string | null;
  agentColor?: string | null;
  priority: "urgent" | "high" | "normal";
  mediaType: "audio" | "video";
}

/**
 * Barre des appels actifs — affiche les slots joints par l'agent
 * (actifs + en attente pour Sprint 2). Sprint 1 : un seul slot à la fois.
 */
export function ActiveCallsBar({
  calls,
  activeSlotId,
  onFocus,
  onEnd,
  onHold,
  onResume,
}: {
  calls: ActiveCallSlot[];
  activeSlotId: Id<"meetings"> | null;
  onFocus: (id: Id<"meetings">) => void;
  onEnd: (id: Id<"meetings">) => void;
  onHold?: (id: Id<"meetings">) => void;
  onResume?: (id: Id<"meetings">) => void;
}) {
  const { t } = useTranslation();

  if (calls.length === 0) return null;

  return (
    <div className="flex min-h-[64px] shrink-0 items-center gap-2 overflow-x-auto border-b bg-muted/20 px-3 py-2">
      <span className="shrink-0 px-2 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
        {t("callCenter.activeBar.title")}
      </span>

      <div className="flex items-center gap-2">
        {calls.map((c) => (
          <SlotPill
            key={c._id}
            slot={c}
            isActive={activeSlotId === c._id}
            onFocus={() => onFocus(c._id as Id<"meetings">)}
            onEnd={() => onEnd(c._id as Id<"meetings">)}
            onHold={onHold ? () => onHold(c._id as Id<"meetings">) : undefined}
            onResume={
              onResume ? () => onResume(c._id as Id<"meetings">) : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}

function SlotPill({
  slot,
  isActive,
  onFocus,
  onEnd,
  onResume,
}: {
  slot: ActiveCallSlot;
  isActive: boolean;
  onFocus: () => void;
  onEnd: () => void;
  onHold?: () => void;
  onResume?: () => void;
}) {
  const { t } = useTranslation();
  const isHeld = slot.callStatus === "on_hold";
  const baseTs = isHeld ? slot.parkedAt : slot.answeredAt;

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

  const formatted =
    elapsed >= 60
      ? `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`
      : `${elapsed}s`;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border px-2 py-1 text-xs transition-all",
        isActive
          ? "bg-card shadow-sm ring-2 ring-primary/40"
          : "bg-card/60 opacity-80 hover:opacity-100",
        isHeld && "bg-muted/50",
      )}
    >
      <button
        type="button"
        onClick={onFocus}
        className="flex items-center gap-2 px-1"
      >
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full",
            isActive
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Phone className="h-3 w-3" />
        </span>
        <span className="max-w-[140px] truncate font-semibold">
          {slot.callerName}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {isHeld
            ? t("callCenter.activeBar.parkedFor", { duration: formatted })
            : formatted}
        </span>
      </button>

      {/* Resume uniquement (le Hold reste accessible depuis la vue centrale).
          La barre des appels actifs reste minimaliste : focus + raccrocher,
          + reprendre quand un appel est parqué. */}
      {isHeld && onResume && (
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={onResume}
          title={t("callCenter.action.resume")}
        >
          <Play className="h-3 w-3" />
        </Button>
      )}

      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 text-destructive hover:bg-destructive/10"
        onClick={onEnd}
        title={t("callCenter.action.end")}
      >
        <PhoneOff className="h-3 w-3" />
      </Button>
    </div>
  );
}
