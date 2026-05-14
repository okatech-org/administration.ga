"use client"

import Link from "next/link"
import { Mail, Sparkles } from "lucide-react"
import { useTranslation } from "react-i18next"

export function HelpBand({
  onOpenChat,
  emergencyPhone = "+241 11 70 25 25",
  emergencyEmail = "urgence@maeai.ga",
}: {
  onOpenChat: () => void
  emergencyPhone?: string
  emergencyEmail?: string
}) {
  const { t } = useTranslation()

  return (
    <section className="mt-24 grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-4 rounded-[28px] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-9">
        <span className="inline-block w-fit rounded-full border border-[var(--pub-border)] bg-[var(--pub-surface-2)] px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--pub-text)]">
          {t(
            "services.help.assistantKicker",
            "Vous ne savez pas par où commencer ?",
          )}
        </span>
        <h3 className="text-[24px] font-semibold leading-[1.2] tracking-[-0.015em] text-[var(--pub-text)]">
          {t(
            "services.help.assistantTitle",
            "Un assistant IA pour identifier la démarche qu'il vous faut.",
          )}
        </h3>
        <p className="max-w-[44ch] text-[15px] leading-[1.55] text-[var(--pub-text-muted)]">
          {t(
            "services.help.assistantBody",
            "Posez votre question à Mr Ray, notre assistant. Il vous oriente vers le bon service avec la liste des pièces à fournir.",
          )}
        </p>
        <div className="mt-auto flex flex-wrap gap-2.5 pt-4">
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

      <div className="relative flex flex-col gap-4 overflow-hidden rounded-[28px] border border-[var(--pub-ink-900)] bg-[var(--pub-ink-900)] p-9 text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-[30%] -bottom-[50%] h-[360px] w-[360px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(241,197,49,.25), transparent 60%)",
          }}
        />
        <span className="relative z-10 inline-block w-fit rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.04em]">
          {t("services.help.urgencyKicker", "Urgence consulaire")}
        </span>
        <h3 className="relative z-10 text-[24px] font-semibold leading-[1.2] tracking-[-0.015em]">
          {t(
            "services.help.urgencyTitle",
            "Permanence d'assistance, 24h/24, 7j/7.",
          )}
        </h3>
        <p className="relative z-10 max-w-[44ch] text-[15px] leading-[1.55] text-white/70">
          {t(
            "services.help.urgencyBody",
            "Pour les ressortissants gabonais en situation de détresse à l'étranger : décès, hospitalisation, arrestation, perte de documents en zone à risque.",
          )}
        </p>
        <div className="relative z-10 mt-auto flex flex-wrap items-center gap-3 pt-4">
          <a
            href={`tel:${emergencyPhone.replace(/\s/g, "")}`}
            className="font-mono text-[22px] font-medium tracking-[-0.01em] hover:underline"
          >
            {emergencyPhone}
          </a>
          <a
            href={`mailto:${emergencyEmail}`}
            className="inline-flex items-center gap-2 rounded-[10px] bg-white/15 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-white/25"
          >
            <Mail className="size-4" aria-hidden="true" />
            {emergencyEmail}
          </a>
        </div>
      </div>
    </section>
  )
}
