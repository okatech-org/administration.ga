"use client";

/**
 * SettingsUnsavedGuard — Garde de navigation contre la perte de modifications.
 *
 * Combine :
 *   1. `useBlocker` de TanStack Router : intercepte la navigation interne
 *      (clics sur liens, Back button) quand il y a des modifs non sauvegardées.
 *   2. `beforeunload` listener : déclenche la popup native du navigateur
 *      en cas de reload (Cmd+R) ou fermeture d'onglet.
 *   3. AlertDialog maison : propose 3 choix clairs à l'utilisateur
 *      — Rester / Quitter sans sauvegarder / Enregistrer et quitter.
 *
 * À placer une seule fois, dans le provider, typiquement :
 *   <SettingsFormProvider>
 *     <SettingsAutoSaveBanner />
 *     <MyContent />
 *     <SettingsUnsavedGuard />
 *   </SettingsFormProvider>
 */

import { useBlocker } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSettingsForm } from "../context/settings-form-context";

export interface SettingsUnsavedGuardProps {
  /** Titre du dialog. */
  title?: string;
  /** Description du dialog. */
  description?: string;
  /** Libellé bouton "Rester sur la page". */
  stayLabel?: string;
  /** Libellé bouton "Quitter sans sauvegarder". */
  leaveWithoutSavingLabel?: string;
  /** Libellé bouton "Enregistrer et quitter". */
  saveAndLeaveLabel?: string;
}

export function SettingsUnsavedGuard({
  title = "Modifications non enregistrées",
  description = "Des changements sont en cours d'enregistrement. Que voulez-vous faire ?",
  stayLabel = "Rester",
  leaveWithoutSavingLabel = "Quitter sans sauvegarder",
  saveAndLeaveLabel = "Enregistrer et quitter",
}: SettingsUnsavedGuardProps = {}) {
  const { flushAll, isDirty, readOnly } = useSettingsForm();
  const [resolving, setResolving] = useState(false);

  // 1) Navigation interne TanStack Router — avec resolver pour afficher notre dialog
  const blocker = useBlocker({
    shouldBlockFn: () => !readOnly && isDirty(),
    withResolver: true,
    enableBeforeUnload: !readOnly, // couvre aussi reload / fermeture onglet
  });

  // 2) Fallback : tente un flush best-effort juste avant que l'onglet soit fermé.
  //    La popup native du navigateur est déclenchée par `enableBeforeUnload` ci-dessus,
  //    mais on ajoute ce handler pour maximiser les chances que la mutation parte.
  useEffect(() => {
    if (readOnly) return;
    const handler = () => {
      if (isDirty()) {
        void flushAll();
      }
    };
    window.addEventListener("pagehide", handler);
    return () => window.removeEventListener("pagehide", handler);
  }, [flushAll, isDirty, readOnly]);

  // 3) Dialog personnalisé quand blocker.status === "blocked"
  if (blocker.status !== "blocked") return null;

  const handleStay = () => {
    blocker.reset();
  };

  const handleLeaveWithoutSaving = () => {
    blocker.proceed();
  };

  const handleSaveAndLeave = async () => {
    if (resolving) return;
    setResolving(true);
    try {
      await flushAll();
      blocker.proceed();
    } catch {
      // Si flushAll throw, on reste sur la page (utilisateur peut réessayer)
      setResolving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-guard-title"
      aria-describedby="unsaved-guard-desc"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={handleStay}
      />

      {/* Panel */}
      <div
        className={joinClasses(
          "relative z-10 w-full max-w-md",
          "rounded-2xl border border-border/60 bg-background",
          "shadow-2xl",
          "animate-in fade-in zoom-in-95 duration-150",
        )}
      >
        <div className="p-5">
          <h2
            id="unsaved-guard-title"
            className="text-base font-semibold text-foreground"
          >
            {title}
          </h2>
          <p
            id="unsaved-guard-desc"
            className="mt-2 text-sm text-muted-foreground"
          >
            {description}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 border-t border-border/50 bg-muted/20 p-3 rounded-b-2xl">
          <button
            type="button"
            onClick={handleStay}
            className={joinClasses(
              "inline-flex items-center justify-center rounded-lg",
              "border border-border/60 bg-background",
              "px-3 py-2 text-sm font-medium",
              "hover:bg-accent/50 transition-colors",
              "sm:mr-auto",
            )}
          >
            {stayLabel}
          </button>
          <button
            type="button"
            onClick={handleLeaveWithoutSaving}
            className={joinClasses(
              "inline-flex items-center justify-center rounded-lg",
              "border border-destructive/30 bg-destructive/5 text-destructive",
              "px-3 py-2 text-sm font-medium",
              "hover:bg-destructive/10 transition-colors",
            )}
          >
            {leaveWithoutSavingLabel}
          </button>
          <button
            type="button"
            onClick={handleSaveAndLeave}
            disabled={resolving}
            className={joinClasses(
              "inline-flex items-center justify-center gap-1.5 rounded-lg",
              "bg-primary text-primary-foreground",
              "px-3 py-2 text-sm font-medium",
              "hover:bg-primary/90 transition-colors",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              "shadow-sm",
            )}
          >
            {resolving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saveAndLeaveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function joinClasses(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
