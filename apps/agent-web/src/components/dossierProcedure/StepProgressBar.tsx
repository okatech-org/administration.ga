/**
 * StepProgressBar — Horizontal progress bar showing workflow steps.
 * Highlights the current step, completed steps are green, upcoming are muted.
 */

import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

interface Step {
  code: string;
  label: { fr: string; en?: string };
  ordre: number;
}

interface StepProgressBarProps {
  steps: Step[];
  currentStepCode: string;
  currentStepOrdre: number;
  status?: string;
}

export function StepProgressBar({
  steps,
  currentStepCode,
  currentStepOrdre,
  status,
}: StepProgressBarProps) {
  const sorted = [...steps].sort((a, b) => a.ordre - b.ordre);
  const isCompleted = status === "valide" || status === "clos" || status === "archive";
  const isRejected = status === "rejete";

  return (
    <div className="w-full">
      <div className="flex items-center gap-0">
        {sorted.map((step, idx) => {
          const isDone = step.ordre < currentStepOrdre || isCompleted;
          const isCurrent = step.code === currentStepCode && !isCompleted;
          const isUpcoming = step.ordre > currentStepOrdre && !isCompleted;

          return (
            <div key={step.code} className="flex items-center flex-1 min-w-0">
              {/* Connector line (before, except first) */}
              {idx > 0 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 transition-colors",
                    isDone || isCurrent
                      ? isRejected && isCurrent
                        ? "bg-red-500/50"
                        : "bg-emerald-500/50"
                      : "bg-border/50",
                  )}
                />
              )}

              {/* Step dot */}
              <div className="relative flex flex-col items-center">
                <div
                  className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center border-2 transition-all",
                    isDone &&
                      "bg-emerald-500/20 border-emerald-500 text-emerald-400",
                    isCurrent &&
                      !isRejected &&
                      "bg-blue-500/20 border-blue-500 text-blue-400 ring-2 ring-blue-500/30",
                    isCurrent &&
                      isRejected &&
                      "bg-red-500/20 border-red-500 text-red-400 ring-2 ring-red-500/30",
                    isUpcoming &&
                      "bg-muted/50 border-border/50 text-muted-foreground/40",
                  )}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : isCurrent ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                </div>

                {/* Label below */}
                <span
                  className={cn(
                    "absolute -bottom-5 text-[8px] font-medium whitespace-nowrap max-w-[80px] truncate text-center",
                    isDone && "text-emerald-400/70",
                    isCurrent && "text-foreground font-semibold",
                    isUpcoming && "text-muted-foreground/40",
                  )}
                  title={step.label.fr}
                >
                  {step.label.fr}
                </span>
              </div>

              {/* Connector line (after, except last) */}
              {idx < sorted.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 transition-colors",
                    isDone ? "bg-emerald-500/50" : "bg-border/50",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
