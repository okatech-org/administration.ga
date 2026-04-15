"use client";

import { AlertTriangle, PhoneIncoming } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Id } from "@convex/_generated/dataModel";
import { CallCard, type CallCardData } from "./CallCard";

type QueueItem = CallCardData & {
  callLineId: string | null;
  lineLabel: string | null;
};

/**
 * Colonne centrale : liste des appels entrants, groupée par ligne,
 * avec bannière sticky URGENT quand ≥1 appel urgent présent.
 *
 * Respecte le tri côté serveur (priorité → ancienneté) — ici on se contente
 * de regrouper visuellement par ligne tout en préservant l'ordre.
 */
export function IncomingCallQueue({
  calls,
  focusedMeetingId,
  pickingUpId,
  onPickup,
  onDecline,
  onFocus,
}: {
  calls: QueueItem[];
  focusedMeetingId: Id<"meetings"> | null;
  pickingUpId: Id<"meetings"> | null;
  onPickup: (id: Id<"meetings">) => void;
  onDecline: (id: Id<"meetings">) => void;
  onFocus: (id: Id<"meetings">) => void;
}) {
  const { t } = useTranslation();

  const { urgent, byLine } = useMemo(() => {
    const urgent: QueueItem[] = [];
    const byLine = new Map<string, { label: string; items: QueueItem[] }>();
    for (const c of calls) {
      if (c.priority === "urgent") urgent.push(c);
      const key = c.callLineId ?? "__unassigned__";
      const label = c.lineLabel ?? t("callCenter.line.allAgents");
      const bucket = byLine.get(key) ?? { label, items: [] };
      bucket.items.push(c);
      byLine.set(key, bucket);
    }
    return { urgent, byLine };
  }, [calls, t]);

  if (calls.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
          <PhoneIncoming className="h-7 w-7 text-muted-foreground/60" />
        </div>
        <h3 className="text-base font-semibold">
          {t("callCenter.queue.empty")}
        </h3>
        <p className="max-w-xs text-sm text-muted-foreground">
          {t("callCenter.queue.emptyHint")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Bannière URGENT sticky */}
      {urgent.length > 0 && (
        <div className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/5 px-4 py-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-destructive">
            {t("callCenter.queue.urgentBanner")}
          </span>
          <span className="ml-auto rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold text-destructive">
            {urgent.length}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="flex flex-col gap-4">
          {Array.from(byLine.entries()).map(([key, bucket]) => (
            <div key={key} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {bucket.label}
                </h4>
                <span className="text-[10px] font-medium text-muted-foreground/70">
                  ({bucket.items.length})
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {bucket.items.map((call) => (
                  <CallCard
                    key={call._id}
                    call={call}
                    isFocused={focusedMeetingId === call._id}
                    isPickingUp={pickingUpId === call._id}
                    onPickup={() => onPickup(call._id as Id<"meetings">)}
                    onDecline={() => onDecline(call._id as Id<"meetings">)}
                    onFocus={() => onFocus(call._id as Id<"meetings">)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
