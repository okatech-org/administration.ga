"use client";

/**
 * SaveStatusIndicator — Indicateur visuel du statut de sauvegarde.
 *
 * Renforcé par rapport à la version initiale :
 *   - Sticky en bas du contenu (toujours visible, pas de risque de scroll out)
 *   - Taille augmentée (text-sm, icônes h-4 w-4)
 *   - Animation progress bar discrète pendant "saving"
 *   - Linger géré par `useDebouncedSave` (défaut 3000ms après succès)
 *
 * Usage :
 *   <SaveStatusIndicator status={status} errorMessage={errorMessage} />
 *
 * Le composant se cache automatiquement quand status === "idle".
 */

import { Check, Loader2, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import type { SaveStatus } from "../types";

export interface SaveStatusIndicatorProps {
  status: SaveStatus;
  errorMessage?: string;
  /** Position : "sticky" (défaut) ou "fixed" (bottom-right classique). */
  position?: "sticky" | "fixed";
  /** Classe CSS additionnelle. */
  className?: string;
}

export function SaveStatusIndicator({
  status,
  errorMessage,
  position = "sticky",
  className,
}: SaveStatusIndicatorProps) {
  if (status === "idle") return null;

  const labelByStatus: Record<
    Exclude<SaveStatus, "idle">,
    { icon: ReactNode; text: string; className: string }
  > = {
    saving: {
      icon: <Loader2 className="h-4 w-4 animate-spin" />,
      text: "Sauvegarde en cours…",
      className:
        "bg-primary/10 text-primary border-primary/20 dark:bg-primary/20",
    },
    saved: {
      icon: <Check className="h-4 w-4" />,
      text: "Enregistré",
      className:
        "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/20",
    },
    error: {
      icon: <TriangleAlert className="h-4 w-4" />,
      text: errorMessage ?? "Erreur lors de la sauvegarde",
      className:
        "bg-destructive/10 text-destructive border-destructive/30 dark:bg-destructive/20",
    },
  };

  const content = labelByStatus[status as Exclude<SaveStatus, "idle">];
  const positionClass =
    position === "fixed" ? "fixed bottom-4 right-4" : "sticky bottom-4 ml-auto";

  return (
    <div
      role="status"
      aria-live="polite"
      className={joinClasses(
        positionClass,
        "z-50 flex items-center gap-2 rounded-xl border px-4 py-2.5",
        "text-sm font-medium shadow-lg backdrop-blur-sm",
        "transition-all duration-200",
        "w-fit",
        content.className,
        className,
      )}
    >
      {content.icon}
      <span className="truncate max-w-[280px]">{content.text}</span>
      {status === "saving" && (
        <span
          aria-hidden
          className="inline-block h-1 w-10 overflow-hidden rounded-full bg-primary/20"
        >
          <span className="block h-full w-1/2 animate-[saveBar_1500ms_ease-in-out_infinite] rounded-full bg-primary/60" />
        </span>
      )}
      {/* Keyframe inline fallback for the progress bar animation */}
      <style>{`
        @keyframes saveBar {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}

function joinClasses(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
