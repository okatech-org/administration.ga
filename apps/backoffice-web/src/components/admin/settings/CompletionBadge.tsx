import { Check, CircleAlert, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CompletionStatus, SectionScore } from "./use-completion-score";

/**
 * CompletionBadge — Badge visuel de complétude (vert ✓ / orange ⚠ / rouge ●)
 *
 * Variants :
 *   - "minimal" : juste l'icône, idéal pour onglets compacts
 *   - "compact" : icône + score
 *   - "full" : icône + score + label
 */

export interface CompletionBadgeProps {
  score?: number;
  status?: CompletionStatus;
  variant?: "minimal" | "compact" | "full";
  /** Section score complet (alternative à score+status) */
  section?: SectionScore;
  className?: string;
}

const STATUS_META: Record<
  CompletionStatus,
  {
    icon: typeof Check;
    color: string;
    bg: string;
    label: string;
  }
> = {
  complete: {
    icon: Check,
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
    label: "Complet",
  },
  partial: {
    icon: CircleAlert,
    color: "text-amber-600",
    bg: "bg-amber-500/10",
    label: "Partiel",
  },
  empty: {
    icon: CircleDashed,
    color: "text-rose-600",
    bg: "bg-rose-500/10",
    label: "Vide",
  },
};

export function CompletionBadge({
  score,
  status,
  variant = "minimal",
  section,
  className,
}: CompletionBadgeProps) {
  const finalScore = section?.score ?? score ?? 0;
  const finalStatus = section?.status ?? status ?? "empty";
  const meta = STATUS_META[finalStatus];
  const Icon = meta.icon;

  if (variant === "minimal") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center h-4 w-4 rounded-full",
          meta.bg,
          className,
        )}
        title={`${meta.label} (${finalScore}%)`}
        aria-label={`${meta.label} ${finalScore} pour cent`}
      >
        <Icon className={cn("h-2.5 w-2.5", meta.color)} />
      </span>
    );
  }

  if (variant === "compact") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
          meta.bg,
          meta.color,
          className,
        )}
        title={meta.label}
      >
        <Icon className="h-2.5 w-2.5" />
        {finalScore}%
      </span>
    );
  }

  // variant === "full"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium",
        meta.bg,
        meta.color,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      <span>{meta.label}</span>
      <span className="opacity-70">·</span>
      <span>{finalScore}%</span>
    </span>
  );
}
