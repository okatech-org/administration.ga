"use client";

/**
 * SettingsReadOnlyBanner — Bannière affichée en mode lecture seule.
 *
 * Affichée quand l'utilisateur n'a pas la permission de modifier (ex:
 * `settings.manage` refusée). Le `SettingsFormProvider` propage `readOnly`
 * aux hooks `useDebouncedSave` qui ignorent alors les triggers — défense
 * en profondeur : même si le consommateur oublie `disabled` sur un champ,
 * aucune mutation ne partira.
 *
 * Usage :
 *   const canManage = useCanDoTask("settings.manage", orgId);
 *   <SettingsFormProvider readOnly={!canManage}>
 *     {!canManage && <SettingsReadOnlyBanner />}
 *     ...
 *   </SettingsFormProvider>
 */

import { Lock } from "lucide-react";

export interface SettingsReadOnlyBannerProps {
  /** Titre principal. */
  title?: string;
  /** Message explicatif. */
  description?: string;
  /** Nom de la permission manquante (affichée en code si fournie). */
  missingPermission?: string;
  /** Classe CSS additionnelle. */
  className?: string;
}

export function SettingsReadOnlyBanner({
  title = "Lecture seule",
  description = "Vous n'avez pas les droits nécessaires pour modifier ces paramètres. Contactez un administrateur de la représentation pour obtenir les permissions.",
  missingPermission,
  className,
}: SettingsReadOnlyBannerProps = {}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={joinClasses(
        "flex items-start gap-3 rounded-xl px-4 py-3",
        "border border-amber-500/30",
        "bg-amber-50 dark:bg-amber-950/30",
        "text-amber-900 dark:text-amber-200",
        className,
      )}
    >
      <span
        aria-hidden
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20"
      >
        <Lock className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0 text-sm leading-tight">
        <span className="font-medium">{title}</span>
        <span className="block mt-0.5 text-amber-800/80 dark:text-amber-300/80 text-xs">
          {description}
          {missingPermission && (
            <>
              {" "}
              Permission requise :{" "}
              <code className="rounded bg-amber-500/10 px-1 py-0.5 text-[0.7rem] font-mono">
                {missingPermission}
              </code>
            </>
          )}
        </span>
      </div>
    </div>
  );
}

function joinClasses(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
