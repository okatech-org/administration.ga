"use client";

import { Circle, Inbox } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export interface LineBucket {
  lineId: string | null;
  label: string;
  color: string | null;
  count: number;
  urgentCount: number;
}

/**
 * Rail gauche : liste des lignes d'appel avec compteur live.
 * "Toutes" en premier, puis chaque ligne avec son code couleur et son compteur.
 * Permet de filtrer la file centrale.
 */
export function LineFilterRail({
  queue,
  selectedLineId,
  onSelect,
  totalCount,
  urgentCount,
}: {
  queue: Array<{
    callLineId: string | null;
    lineLabel: string | null;
    lineColor: string | null;
    priority: "urgent" | "high" | "normal";
  }>;
  selectedLineId: string | "all";
  onSelect: (lineId: string | "all") => void;
  totalCount: number;
  urgentCount: number;
}) {
  const { t } = useTranslation();

  const buckets: LineBucket[] = useMemo(() => {
    const byLine = new Map<string | "__unassigned__", LineBucket>();
    for (const q of queue) {
      const key = (q.callLineId as string | null) ?? "__unassigned__";
      const existing = byLine.get(key) ?? {
        lineId: q.callLineId,
        label: q.lineLabel ?? t("callCenter.line.allAgents"),
        color: q.lineColor,
        count: 0,
        urgentCount: 0,
      };
      existing.count += 1;
      if (q.priority === "urgent") existing.urgentCount += 1;
      byLine.set(key, existing);
    }
    return Array.from(byLine.values()).sort((a, b) => {
      // Urgent en premier, puis par volume décroissant
      if (b.urgentCount !== a.urgentCount) return b.urgentCount - a.urgentCount;
      return b.count - a.count;
    });
  }, [queue, t]);

  const rowClass = (selected: boolean) =>
    cn(
      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
      selected
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
    );

  return (
    <div className="flex h-full w-52 shrink-0 flex-col border-r p-3">
      <h3 className="px-1 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
        {t("callCenter.line.filterTitle")}
      </h3>

      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {/* Toutes les lignes */}
        <button
          type="button"
          onClick={() => onSelect("all")}
          className={rowClass(selectedLineId === "all")}
        >
          <Inbox className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate text-sm font-medium">
            {t("callCenter.queue.allLines")}
          </span>
          <LineCounter count={totalCount} urgent={urgentCount} />
        </button>

        {buckets.map((b) => {
          const id = b.lineId ?? "__unassigned__";
          const selected = selectedLineId === (b.lineId ?? "__unassigned__");
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(b.lineId ?? "__unassigned__")}
              className={rowClass(selected)}
            >
              <Circle
                className="h-3 w-3 shrink-0"
                fill={b.color ?? "currentColor"}
                style={{ color: b.color ?? "currentColor" }}
              />
              <span className="flex-1 truncate text-sm">{b.label}</span>
              <LineCounter count={b.count} urgent={b.urgentCount} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LineCounter({
  count,
  urgent,
}: {
  count: number;
  urgent: number;
}) {
  if (count === 0) return null;
  return (
    <span className="flex shrink-0 items-center gap-1">
      {urgent > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive/15 px-1 text-[9px] font-bold text-destructive">
          {urgent}
        </span>
      )}
      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground/10 px-1 text-[9px] font-bold text-foreground/80">
        {count}
      </span>
    </span>
  );
}
