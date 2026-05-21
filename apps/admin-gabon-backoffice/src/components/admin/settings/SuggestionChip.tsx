import { Lightbulb, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * SuggestionChip — Chip cliquable proposant une suggestion intelligente
 *
 * Usage :
 *   <SuggestionChip
 *     label="Europe/Paris"
 *     hint="Suggéré pour France"
 *     onApply={() => setTimezone("Europe/Paris")}
 *     onDismiss={() => setShowSuggestion(false)}
 *   />
 */

export interface SuggestionChipProps {
  label: ReactNode;
  /** Hint expliquant pourquoi cette suggestion (ex: « Suggéré pour France ») */
  hint?: string;
  /** Callback appelé quand l'utilisateur clique la chip pour appliquer */
  onApply: () => void;
  /** Si défini, affiche un bouton X pour rejeter */
  onDismiss?: () => void;
  className?: string;
}

export function SuggestionChip({
  label,
  hint,
  onApply,
  onDismiss,
  className,
}: SuggestionChipProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700/40 px-2 py-1 text-xs",
        className,
      )}
    >
      <Lightbulb className="h-3 w-3 text-amber-600 shrink-0" />
      <button
        type="button"
        onClick={onApply}
        className="text-amber-700 dark:text-amber-300 hover:underline font-medium"
        title={hint}
      >
        Suggestion : {label}
      </button>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="ml-0.5 opacity-50 hover:opacity-100"
          aria-label="Rejeter la suggestion"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
}
