"use client"

import Link from "next/link"
import { ArrowRight, Calendar, CheckCircle2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

export function ServiceHero({
  pills,
  title,
  tagline,
  category,
  estimatedDays,
  pricingMain,
  audience,
  ctaTitle,
  ctaDescription,
  ctaHref,
  secondaryCtaHref,
  isResumable,
}: {
  pills: { label: string; tone: "neutral" | "online" | "official" | "express" }[]
  title: string
  tagline: string
  category: string
  estimatedDays: number
  pricingMain?: string
  audience?: string
  ctaTitle: string
  ctaDescription: string
  ctaHref: string
  secondaryCtaHref?: string
  isResumable?: boolean
}) {
  const { t } = useTranslation()
  return (
    <section className="grid items-end gap-8 pb-8 md:grid-cols-[1.5fr_1fr]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          {pills.map((p, i) => (
            <Pill key={i} tone={p.tone}>
              {p.label}
            </Pill>
          ))}
        </div>
        <h1 className="mt-4 text-[clamp(36px,4.4vw,56px)] font-semibold leading-[1.05] tracking-[-0.025em] text-[var(--pub-text)]">
          {title}
        </h1>
        <p className="mt-4 max-w-[60ch] text-[17px] leading-[1.55] text-[var(--pub-text-muted)]">
          {tagline}
        </p>
        <div className="mt-7 grid gap-5 border-t border-[var(--pub-border)] pt-5 sm:grid-cols-2 md:grid-cols-4">
          <HeroInfo
            label={t("services.detail.metaCategory", "Catégorie")}
            value={category}
          />
          <HeroInfo
            label={t("services.detail.metaStandardDelay", "Délai standard")}
            value={t("services.detail.daysValue", {
              count: estimatedDays,
              defaultValue: "{{count}} jours",
            })}
          />
          {pricingMain && (
            <HeroInfo
              label={t("services.detail.metaFee", "Frais de chancellerie")}
              value={pricingMain}
            />
          )}
          {audience && (
            <HeroInfo
              label={t("services.detail.metaAudience", "Public concerné")}
              value={audience}
              small
            />
          )}
        </div>
      </div>

      <aside className="relative flex flex-col gap-3.5 overflow-hidden rounded-[14px] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-5">
        <span
          aria-hidden="true"
          className="absolute top-0 right-0 left-0 h-[3px]"
          style={{
            background:
              "linear-gradient(to right, var(--pub-gabon-green) 0%, var(--pub-gabon-green) 33%, var(--pub-gabon-yellow) 33%, var(--pub-gabon-yellow) 66%, var(--pub-gabon-blue) 66%, var(--pub-gabon-blue) 100%)",
          }}
        />
        <span className="inline-block w-fit text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--pub-text-muted)]">
          {t("services.detail.heroCtaKicker", "Démarche en ligne")}
        </span>
        <h3 className="text-[17px] font-semibold tracking-[-0.005em] text-[var(--pub-text)]">
          {ctaTitle}
        </h3>
        <p className="text-[13px] leading-[1.5] text-[var(--pub-text-muted)]">
          {ctaDescription}
        </p>
        <Link
          href={ctaHref}
          className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--pub-gabon-blue)] px-4 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[var(--pub-gabon-blue-deep)]"
        >
          {t("services.detail.heroCtaPrimary", "Démarrer la démarche")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        {secondaryCtaHref && (
          <Link
            href={secondaryCtaHref}
            className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--pub-surface-2)] px-4 py-3.5 text-[14px] font-medium text-[var(--pub-text)] hover:bg-[var(--pub-surface-3)]"
          >
            <Calendar className="size-3.5" aria-hidden="true" />
            {t("services.detail.heroCtaSecondary", "Prendre rendez-vous au consulat")}
          </Link>
        )}
        {isResumable && (
          <div className="flex items-center gap-2 border-t border-dashed border-[var(--pub-border)] pt-3 text-[12px] text-[var(--pub-text-muted)]">
            <CheckCircle2
              className="size-3.5 text-[var(--pub-success)]"
              aria-hidden="true"
            />
            {t("services.detail.resumePrefix", "Vous avez déjà commencé ?")}
            <Link
              href={ctaHref}
              className="ml-auto font-medium text-[var(--pub-gabon-blue)] hover:underline"
            >
              {t("services.detail.resumeCta", "Reprendre")}
            </Link>
          </div>
        )}
      </aside>
    </section>
  )
}

function HeroInfo({
  label,
  value,
  small,
}: {
  label: string
  value: string
  small?: boolean
}) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--pub-text-muted)]">
        {label}
      </div>
      <div
        className={cn(
          "mt-1.5 font-semibold tracking-[-0.005em] text-[var(--pub-text)]",
          small ? "text-[14px]" : "text-[16px]",
        )}
      >
        {value}
      </div>
    </div>
  )
}

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: "neutral" | "online" | "official" | "express"
}) {
  const toneClasses = {
    neutral:
      "bg-[var(--pub-gabon-blue-tint)] text-[var(--pub-gabon-blue)] border-transparent",
    online:
      "bg-[var(--pub-gabon-green-tint)] text-[var(--pub-gabon-green)] border-transparent",
    official:
      "border border-[var(--pub-border)] bg-[var(--pub-surface)] text-[var(--pub-text)]",
    express:
      "bg-[var(--pub-warning-tint)] text-[var(--pub-warning)] border-transparent",
  } as const
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em]",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  )
}
