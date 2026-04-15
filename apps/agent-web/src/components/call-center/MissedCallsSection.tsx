"use client";

import { PhoneMissed, RotateCw, UserCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Id } from "@convex/_generated/dataModel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface MissedCallRow {
  _id: string;
  lineLabel: string | null;
  lineColor: string | null;
  reason: string;
  callbackStatus: string;
  endedAt: number;
  durationSeconds: number | null;
  assignedToMe: boolean;
  caller: {
    userId: string | null;
    displayName: string;
    email: string | null;
    phoneNumber: string | null;
  };
}

/**
 * Section "À rappeler" affichée sous la file d'attente.
 * Cards compactes avec bouton Rappeler qui crée un outbound call et bascule
 * l'agent sur cet appel en actif.
 */
export function MissedCallsSection({
  rows,
  onCallBack,
  pendingIds,
}: {
  rows: MissedCallRow[];
  onCallBack: (missedCallId: Id<"missedCalls">) => void;
  pendingIds: Set<string>;
}) {
  const { t } = useTranslation();

  if (rows.length === 0) return null;

  return (
    <div className="mt-4 flex flex-col gap-2 border-t pt-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <PhoneMissed className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            {t("callCenter.missed.title")}
          </h4>
        </div>
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
          {rows.length}
        </span>
      </div>

      <ul className="flex flex-col gap-1.5">
        {rows.slice(0, 10).map((r) => {
          const isPending = pendingIds.has(r._id);
          const isCallable = !!r.caller.userId;
          const sinceMin = Math.max(
            1,
            Math.floor((Date.now() - r.endedAt) / 60_000),
          );
          const initials =
            r.caller.displayName
              .split(" ")
              .map((w) => w[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase() || "?";
          return (
            <li
              key={r._id}
              className={cn(
                "relative flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5",
                r.assignedToMe && "border-primary/40",
              )}
            >
              {r.lineColor && (
                <span
                  className="absolute inset-y-2 left-0 w-0.5 rounded-full"
                  style={{ backgroundColor: r.lineColor }}
                  aria-hidden
                />
              )}

              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-amber-500/10 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                  {isCallable ? initials : <UserCircle2 className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">
                  {r.caller.displayName}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  {r.lineLabel && (
                    <span className="truncate">{r.lineLabel}</span>
                  )}
                  <span>
                    {t("callCenter.missed.sinceMinutes", { count: sinceMin })}
                  </span>
                  {r.assignedToMe && (
                    <span className="rounded-full bg-primary/15 px-1.5 py-px text-[9px] font-bold uppercase text-primary">
                      {t("callCenter.missed.assignedToMe")}
                    </span>
                  )}
                </div>
              </div>

              <Button
                size="sm"
                variant={isCallable ? "default" : "outline"}
                className="h-7 gap-1 text-[11px]"
                disabled={!isCallable || isPending}
                onClick={() => onCallBack(r._id as Id<"missedCalls">)}
                title={
                  isCallable
                    ? t("callCenter.missed.callBack")
                    : t("callCenter.missed.noUserId")
                }
              >
                <RotateCw
                  className={cn(
                    "h-3 w-3",
                    isPending && "animate-spin",
                  )}
                />
                {t("callCenter.missed.callBack")}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
