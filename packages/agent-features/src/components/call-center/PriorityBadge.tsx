"use client";

import { useTranslation } from "react-i18next";
import { cn } from "@workspace/ui/lib/utils";

/**
 * Pill de priorité respectant les tokens Soft UI consulat.ga.
 * - urgent : ring destructive + dot pulse
 * - high   : fond muted + dot amber
 * - normal : fond muted discret
 */
export type CallPriority = "urgent" | "high" | "normal";

export function PriorityBadge({
  priority,
  className,
}: {
  priority: CallPriority;
  className?: string;
}) {
  const { t } = useTranslation();
  const label = t(`callCenter.priority.${priority}`);

  const styles: Record<CallPriority, string> = {
    urgent:
      "bg-destructive/10 text-destructive ring-1 ring-destructive/40",
    high:
      "bg-muted text-muted-foreground ring-1 ring-border",
    normal:
      "bg-muted text-muted-foreground ring-1 ring-foreground/10",
  };

  const dotStyles: Record<CallPriority, string> = {
    urgent: "bg-destructive animate-pulse",
    high: "bg-muted-foreground",
    normal: "bg-muted-foreground/40",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        styles[priority],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotStyles[priority])} />
      {label}
    </span>
  );
}
