"use client";

/**
 * RecordingConsentBanner — Sprint 6 (citoyen)
 *
 * Modal RGPD bloquante affichée au citoyen quand un agent déclenche
 * l'enregistrement de l'appel. Respecte le Citizen Design System v3.0 :
 *  - Conteneur rounded-xl bg-[#F4F3ED] dark:bg-[#171616] (S1)
 *  - Icon rose-500/15 + AlertTriangle (sémantique "attention")
 *  - Bullets RGPD en text-xs font-medium text-muted-foreground
 *  - CTA accept : Type C primary full width
 *  - CTA decline : Type A secondary
 *  - Anim framer-motion initial opacity 0 y 10
 */

import { AlertTriangle, FileWarning, Lock } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

const DEFAULT_RETENTION_DAYS = 90;

export function RecordingConsentBanner({
  meetingId,
  onDecision,
}: {
  meetingId: Id<"meetings">;
  onDecision?: (accepted: boolean) => void;
}) {
  const { t } = useTranslation();
  const accept = useMutation(api.functions.meetings.acceptRecordingConsent);
  const decline = useMutation(api.functions.meetings.declineRecordingConsent);

  const handleAccept = async () => {
    await accept({ meetingId });
    onDecision?.(true);
  };
  const handleDecline = async () => {
    await decline({ meetingId });
    onDecision?.(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm md:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recording-consent-title"
    >
      <div className="w-full max-w-md rounded-xl bg-[#F4F3ED] p-0 dark:bg-[#171616] overflow-hidden">
        <div className="p-4 md:p-5">
          {/* SectionHeader v3 : icon rose + title */}
          <div className="mb-3 flex items-center gap-2">
            <div className="rounded-md bg-rose-500/15 p-1">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            </div>
            <h2
              id="recording-consent-title"
              className="text-sm font-bold text-foreground"
            >
              {t("callCenter.recording.consentTitle")}
            </h2>
          </div>

          {/* Bannière explicative */}
          <p className="text-sm font-medium text-foreground">
            {t("callCenter.recording.consentBanner")}
          </p>

          {/* Bullets RGPD - sub-cards S4 */}
          <ul className="mt-3 flex flex-col gap-2">
            <li className="flex items-start gap-2 rounded-lg bg-[#FDFCFA] dark:bg-[#21201E]/77 p-2.5">
              <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {t("callCenter.recording.consentBullets.purpose", {
                  days: DEFAULT_RETENTION_DAYS,
                })}
              </span>
            </li>
            <li className="flex items-start gap-2 rounded-lg bg-[#FDFCFA] dark:bg-[#21201E]/77 p-2.5">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {t("callCenter.recording.consentBullets.rights")}
              </span>
            </li>
            <li className="flex items-start gap-2 rounded-lg bg-[#FDFCFA] dark:bg-[#21201E]/77 p-2.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {t("callCenter.recording.consentBullets.optional")}
              </span>
            </li>
          </ul>

          {/* CTAs — accept (Type C primary) puis decline (Type A secondary) */}
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleAccept}
              className="h-11 w-full rounded-lg bg-primary text-sm font-medium text-white transition-transform hover:bg-primary/90 active:scale-[0.97]"
            >
              {t("callCenter.recording.consentAccept")}
            </button>
            <button
              type="button"
              onClick={handleDecline}
              className="h-9 w-full rounded-lg bg-[#DCD7C7] px-3 text-xs font-medium text-foreground transition-transform hover:bg-[#DCD7C7]/80 dark:bg-[#4A4744]/40 active:scale-[0.97]"
            >
              {t("callCenter.recording.consentDecline")}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
