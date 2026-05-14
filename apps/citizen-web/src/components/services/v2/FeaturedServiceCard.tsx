"use client"

import Link from "next/link"
import { ArrowRight, Star } from "lucide-react"
import { useTranslation } from "react-i18next"
import { getLocalizedValue } from "@/lib/i18n-utils"
import { CATEGORY_CONFIG } from "./categories"

type Step = { label: { fr?: string; en?: string } | string; icon?: string }

export type FeaturedService = {
  _id: string
  slug: string
  name: { fr?: string; en?: string } | string
  description: { fr?: string; en?: string } | string
  category: string
  estimatedDays: number
  expressDays?: number
  titleValidity?: { fr?: string; en?: string } | string
  processSteps?: Step[]
  requestsLast30d?: number
}

const DEFAULT_STEPS: Array<{ key: string; fallback: string }> = [
  { key: "services.featured.step1", fallback: "Préinscription en ligne" },
  { key: "services.featured.step2", fallback: "Rendez-vous" },
  { key: "services.featured.step3", fallback: "Paiement & suivi" },
  { key: "services.featured.step4", fallback: "Réception" },
]

export function FeaturedServiceCard({ service }: { service: FeaturedService }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  const name = getLocalizedValue(service.name as never, lang)
  const description = getLocalizedValue(service.description as never, lang)
  const titleValidity = service.titleValidity
    ? getLocalizedValue(service.titleValidity as never, lang)
    : undefined
  const categoryLabel = t(
    CATEGORY_CONFIG[service.category]?.i18nKey ??
      "services.categoriesMap.other",
  )

  const steps =
    service.processSteps && service.processSteps.length > 0
      ? service.processSteps.map((s) => getLocalizedValue(s.label as never, lang))
      : DEFAULT_STEPS.map((s) => t(s.key, s.fallback))

  return (
    <section
      className="relative mt-3 grid items-stretch gap-10 overflow-hidden rounded-[28px] bg-gradient-to-br from-[var(--pub-gabon-blue)] to-[var(--pub-gabon-blue-deep)] p-7 text-white md:grid-cols-[1.4fr_1fr] md:p-11"
      aria-labelledby="featured-service-title"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-1/2 -right-[20%] h-[460px] w-[460px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(241,197,49,.35), transparent 65%)",
        }}
      />
      <div className="relative z-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[12px] font-medium uppercase tracking-[0.04em]">
          <Star className="size-3.5" aria-hidden="true" />
          {t("services.featured.badge", "Service phare")}
          {typeof service.requestsLast30d === "number" &&
            service.requestsLast30d > 0 && (
              <>
                <span aria-hidden="true">·</span>
                {t("services.featured.requestsCount", {
                  count: service.requestsLast30d,
                  defaultValue: "{{count}} demandes ce mois-ci",
                })}
              </>
            )}
        </span>
        <h3
          id="featured-service-title"
          className="mt-4 text-[24px] font-semibold leading-[1.1] tracking-[-0.02em] md:text-[30px]"
        >
          {name}
        </h3>
        <p className="mt-3.5 max-w-[480px] text-[15px] leading-[1.55] text-white/80">
          {description}
        </p>
        <div className="mt-6 flex flex-wrap gap-6">
          {steps.map((label, i) => (
            <div
              key={`${label}-${i}`}
              className="flex items-center gap-2 text-[13px] text-white/85"
            >
              <span className="grid size-[22px] place-items-center rounded-full bg-white/15 font-mono text-[12px] font-semibold">
                {i + 1}
              </span>
              {label}
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/services/${service.slug}`}
            className="inline-flex min-h-[46px] items-center gap-2 rounded-[10px] bg-white px-5 py-3 text-[14px] font-semibold text-[var(--pub-gabon-blue)] transition-colors hover:bg-white/95"
          >
            {t("services.featured.ctaStart", "Démarrer la demande")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href={`/services/${service.slug}#documents`}
            className="inline-flex min-h-[46px] items-center gap-2 rounded-[10px] bg-white/15 px-5 py-3 text-[14px] font-medium text-white transition-colors hover:bg-white/25"
          >
            {t("services.featured.ctaDocs", "Documents requis")}
          </Link>
        </div>
      </div>
      <aside className="relative z-10 self-center rounded-[14px] border border-white/15 bg-white/10 p-6 backdrop-blur-md">
        <h4 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-white/60">
          {t("services.featured.sidebarTitle", "En bref")}
        </h4>
        <dl className="grid gap-3.5">
          <Row dt={t("services.featured.metaCategory", "Catégorie")} dd={categoryLabel} />
          <Row
            dt={t("services.featured.metaStandardDelay", "Délai standard")}
            dd={t("services.featured.daysValue", {
              count: service.estimatedDays,
              defaultValue: "{{count}} jours",
            })}
          />
          {service.expressDays && (
            <Row
              dt={t("services.featured.metaExpressDelay", "Délai express")}
              dd={
                <>
                  {t("services.featured.daysValue", {
                    count: service.expressDays,
                    defaultValue: "{{count}} jours",
                  })}{" "}
                  <span className="text-[#f1c531]" aria-hidden="true">
                    ★
                  </span>
                </>
              }
            />
          )}
          {titleValidity && (
            <Row
              dt={t("services.featured.metaValidity", "Validité du titre")}
              dd={titleValidity}
            />
          )}
        </dl>
      </aside>
    </section>
  )
}

function Row({ dt, dd }: { dt: string; dd: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3.5 text-[14px] last:border-b-0 last:pb-0">
      <dt className="text-white/60">{dt}</dt>
      <dd className="m-0 font-medium">{dd}</dd>
    </div>
  )
}
