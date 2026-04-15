"use client";

/**
 * SettingsAutoSaveBanner — Bandeau pédagogique permanent expliquant l'auto-save.
 *
 * Affiche :
 *   - Un picto "éclair" + message clair "Enregistrement automatique"
 *   - Le statut courant agrégé (spinner si saving, check si saved)
 *   - Un bouton "Enregistrer maintenant" visible uniquement si des modifs sont
 *     en attente (feat de rassurance pour les utilisateurs habitués aux
 *     formulaires classiques).
 *
 * Pattern design : respect charte Consulat.ga (soft UI neumorphic, palette
 * achromatique avec accent primary, ombres inset).
 *
 * Usage :
 *   <SettingsFormProvider>
 *     <SettingsAutoSaveBanner />
 *     ...
 *   </SettingsFormProvider>
 */

import { Check, Loader2, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSettingsForm } from "../context/settings-form-context";

export interface SettingsAutoSaveBannerProps {
  /** Message principal du bandeau. */
  title?: string;
  /** Texte explicatif. */
  description?: string;
  /** Libellé du bouton flush manuel. */
  manualSaveLabel?: string;
  /** Toast de confirmation après flush manuel réussi. */
  manualSaveSuccessToast?: string;
  /** Classe CSS additionnelle. */
  className?: string;
}

export function SettingsAutoSaveBanner({
  title = "Enregistrement automatique",
  description = "Vos modifications sont sauvegardées en continu (≈ 1s après chaque saisie).",
  manualSaveLabel = "Enregistrer maintenant",
  manualSaveSuccessToast = "Modifications enregistrées",
  className,
}: SettingsAutoSaveBannerProps) {
  const { aggregateStatus, dirtySections, flushAll, readOnly } = useSettingsForm();
  const [flushing, setFlushing] = useState(false);
  const hasDirty = dirtySections.size > 0;

  const handleManualSave = async () => {
    if (flushing) return;
    setFlushing(true);
    try {
      await flushAll();
      // Si aucune erreur agrégée après flush, on affiche le toast succès.
      if (aggregateStatus !== "error") {
        toast.success(manualSaveSuccessToast, { duration: 2000 });
      }
    } finally {
      setFlushing(false);
    }
  };

  // En mode lecture seule, on n'affiche pas le bandeau (remplacé par SettingsReadOnlyBanner)
  if (readOnly) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={joinClasses(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3",
        "rounded-xl px-4 py-2.5",
        "border border-border/30",
        "bg-gradient-to-r from-primary/5 to-accent/5",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6),0_1px_2px_rgba(0,0,0,0.04)]",
        "dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_1px_2px_rgba(0,0,0,0.2)]",
        className,
      )}
    >
      <div className="flex items-start sm:items-center gap-2.5 text-sm">
        <span
          aria-hidden
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <Zap className="h-4 w-4" />
        </span>
        <div className="leading-tight">
          <span className="font-medium text-foreground">{title}</span>
          <span className="hidden sm:inline text-muted-foreground"> — </span>
          <span className="block sm:inline text-muted-foreground text-xs sm:text-sm">
            {description}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {aggregateStatus === "saving" && (
          <span className="flex items-center gap-1.5 text-xs text-primary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="hidden sm:inline">Sauvegarde…</span>
          </span>
        )}
        {aggregateStatus === "saved" && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">À jour</span>
          </span>
        )}
        {hasDirty && (
          <button
            type="button"
            onClick={handleManualSave}
            disabled={flushing}
            className={joinClasses(
              "inline-flex items-center gap-1.5 rounded-lg",
              "border border-border/50 bg-background/80",
              "px-2.5 py-1.5 text-xs font-medium",
              "hover:bg-accent/50 transition-colors",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              "shadow-sm",
            )}
          >
            {flushing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            {manualSaveLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function joinClasses(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
