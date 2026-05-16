"use client"

import Link from "next/link"
import { Sparkles } from "lucide-react"
import { useTranslation } from "react-i18next"

export function HelpBand({ onOpenChat }: { onOpenChat: () => void }) {
  const { t } = useTranslation()

  return (
    <section className="mt-24">
      <div className="flex flex-col gap-4 rounded-[28px] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-9 md:flex-row md:items-center md:justify-between md:gap-10">
        <div className="flex flex-col gap-3">
          <span className="inline-block w-fit rounded-full border border-[var(--pub-border)] bg-[var(--pub-surface-2)] px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--pub-text)]">
            {t(
              "services.help.assistantKicker",
              "Vous ne savez pas par où commencer ?",
            )}
          </span>
          <h3 className="max-w-[36ch] text-[24px] font-semibold leading-[1.2] tracking-[-0.015em] text-[var(--pub-text)]">
            {t(
              "services.help.assistantTitle",
              "Un assistant IA pour identifier la démarche qu'il vous faut.",
            )}
          </h3>
          <p className="max-w-[60ch] text-[15px] leading-[1.55] text-[var(--pub-text-muted)]">
            {t(
              "services.help.assistantBody",
              "Posez votre question à Mr Ray, notre assistant. Il vous oriente vers le bon service avec la liste des pièces à fournir.",
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2.5">
          <button
            type="button"
            onClick={onOpenChat}
            className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--pub-gabon-blue)] px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[var(--pub-gabon-blue-deep)]"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            {t("services.help.assistantCta", "Démarrer l'assistant")}
          </button>
          <Link
            href="/ressources/guides"
            className="inline-flex items-center gap-2 rounded-[10px] px-5 py-3 text-[14px] font-medium text-[var(--pub-text)] hover:bg-[var(--pub-surface-2)]"
          >
            {t("services.help.assistantSecondary", "Consulter les guides")}
          </Link>
        </div>
      </div>
    </section>
  )
}
