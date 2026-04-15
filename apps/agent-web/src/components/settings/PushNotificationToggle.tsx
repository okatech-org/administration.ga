"use client";

/**
 * PushNotificationToggle — Sprint 6
 *
 * Toggle pour activer/désactiver les notifications push de l'agent.
 * Design System v3.0 :
 *  - FlatCard wrapper
 *  - SectionHeader icon Bell
 *  - Switch button Type C primary quand activé, Type A secondary quand désactivé
 *  - Text informatif muted-foreground
 */

import { Bell, BellOff, BellRing } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePushSubscription } from "@/hooks/use-push-subscription";
import { FEATURES } from "@/lib/feature-flags";

export function PushNotificationToggle() {
  const { t } = useTranslation();
  const push = usePushSubscription();

  if (!FEATURES.push) return null;

  const isUnsupported = push.permission === "unsupported" || !push.isSupported;
  const isDenied = push.permission === "denied";

  return (
    <section className="rounded-xl bg-[#F4F3ED] dark:bg-[#171616] p-0 overflow-hidden">
      <div className="p-3 lg:p-4">
        <div className="mb-2 flex items-center gap-2">
          <div className="rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.12] p-1">
            {push.isSubscribed ? (
              <BellRing className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Bell className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
          <h3 className="text-sm font-bold text-foreground">
            {t("callCenter.push.sectionTitle")}
          </h3>
        </div>

        <p className="text-xs font-medium text-muted-foreground">
          {t("callCenter.push.sectionDescription")}
        </p>

        {/* Sub-card status + action */}
        <div className="mt-3 rounded-lg bg-[#FDFCFA] dark:bg-[#21201E]/77 p-2.5">
          {isUnsupported && (
            <p className="text-xs font-medium text-muted-foreground">
              {t("callCenter.push.unsupported")}
            </p>
          )}

          {isDenied && (
            <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
              {t("callCenter.push.denied")}
            </p>
          )}

          {!isUnsupported && !isDenied && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground">
                {push.isSubscribed
                  ? t("callCenter.push.enabled")
                  : t("callCenter.push.sectionTitle")}
              </span>
              {push.isSubscribed ? (
                <button
                  type="button"
                  disabled={push.loading}
                  onClick={push.disable}
                  className="flex h-8 items-center gap-1.5 rounded-lg bg-[#DCD7C7] dark:bg-[#4A4744]/40 px-3 text-xs font-medium text-foreground transition-transform hover:bg-[#DCD7C7]/80 active:scale-[0.97] disabled:opacity-50"
                >
                  <BellOff className="h-3 w-3" />
                  {t("callCenter.push.disable")}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={push.loading}
                  onClick={push.enable}
                  className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-white transition-transform hover:bg-primary/90 active:scale-[0.97] disabled:opacity-50"
                >
                  <Bell className="h-3 w-3" />
                  {t("callCenter.push.enable")}
                </button>
              )}
            </div>
          )}

          {push.error && (
            <p className="mt-2 text-[10px] font-medium text-rose-600 dark:text-rose-400">
              {push.error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
