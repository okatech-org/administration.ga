"use client"

import { sanitizeHtml } from "@workspace/shared/utils/sanitize"
import { api } from "@convex/_generated/api"
import { ArrowLeft, FileText } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { usePreloadedQuery, type Preloaded } from "convex/react"
import { Button } from "@/components/ui/button"
import {
  CATEGORY_CONFIG,
  isFullyOnline,
} from "@/components/services/v2/categories"
import { ServiceHero } from "@/components/services/v2/detail/hero"
import {
  DocumentsSection,
  FaqSection,
  ModesSection,
  PresentationSection,
  PricingSection,
  ServiceBreadcrumb,
  ServiceTOC,
  StepsSection,
} from "@/components/services/v2/detail/sections"
import {
  FormFilesCard,
  HelpSidebarCard,
  InBriefCard,
  RelatedServicesCard,
  WhereCard,
} from "@/components/services/v2/detail/sidebar"
import { getLocalizedValue } from "@/lib/i18n-utils"

export function ServiceDetailClient({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.functions.services.getBySlug>
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const service = usePreloadedQuery(preloaded)

  // TOC active section: trivial scroll listener (no IntersectionObserver
  // because the public layout uses a custom scroll container).
  const [activeSection, setActiveSection] = useState<string | null>(
    "presentation",
  )

  useEffect(() => {
    if (!service) return
    const main = document.getElementById("main-scrollable-area")
    const root: HTMLElement | Window = main ?? window
    const onScroll = () => {
      const ids = ["presentation", "etapes", "pieces", "tarifs", "modes", "faq"]
      let current: string | null = null
      for (const id of ids) {
        const el = document.getElementById(id)
        if (!el) continue
        const top = el.getBoundingClientRect().top
        if (top - 120 < 0) current = id
      }
      setActiveSection(current ?? "presentation")
    }
    onScroll()
    root.addEventListener("scroll", onScroll, { passive: true })
    return () => root.removeEventListener("scroll", onScroll)
  }, [service])

  if (!service) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center px-6">
        <div className="text-center">
          <FileText className="mx-auto mb-4 size-16 text-[var(--pub-text-muted)]" />
          <h1 className="mb-2 text-2xl font-bold text-[var(--pub-text)]">
            {t("services.notFound", "Service introuvable")}
          </h1>
          <Button asChild>
            <Link href="/services">
              <ArrowLeft className="mr-2 size-4" />
              {t("services.backToServices", "Retour aux services")}
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const categoryConfig = CATEGORY_CONFIG[service.category] ?? CATEGORY_CONFIG.other
  const categoryLabel = t(categoryConfig!.i18nKey, service.category)
  const serviceName = getLocalizedValue(service.name, lang)
  const serviceDescription = getLocalizedValue(service.description, lang)
  const audience = service.audience
    ? getLocalizedValue(service.audience, lang)
    : t("services.detail.audienceFallback", "Ressortissants gabonais")
  const titleValidity = service.titleValidity
    ? getLocalizedValue(service.titleValidity, lang)
    : undefined

  const fullyOnline = isFullyOnline(service)

  // Pricing affiché dans la sidebar / hero — extrait de pricingTable[standard]
  // ou null si pas de pricingTable. On affichera juste « — » sinon.
  const standardPricing = useMemo(() => {
    if (!service.pricingTable || service.pricingTable.length === 0) return null
    const std =
      service.pricingTable.find((p) => p.variant === "standard") ??
      service.pricingTable[0]
    if (!std) return null
    if (std.isFree) return t("services.free", "Gratuit")
    return std.price ? getLocalizedValue(std.price, lang) : null
  }, [service.pricingTable, lang, t])

  const minorsPricing = useMemo(() => {
    if (!service.pricingTable) return undefined
    const minors = service.pricingTable.find((p) => p.variant === "reduced")
    if (!minors) return undefined
    if (minors.isFree) return t("services.free", "Gratuit")
    return minors.price ? getLocalizedValue(minors.price, lang) : undefined
  }, [service.pricingTable, lang, t])

  const expressDays = (service as { expressDays?: number }).expressDays

  // Hero pills
  const heroPills: { label: string; tone: "neutral" | "online" | "official" | "express" }[] = [
    { label: categoryLabel, tone: "neutral" },
    ...(fullyOnline
      ? [
          {
            label: t("services.cardOnlineRibbon", "100 % en ligne"),
            tone: "online" as const,
          },
        ]
      : []),
    {
      label: t("services.detail.pillOfficial", "Service officiel"),
      tone: "official" as const,
    },
  ]

  const ctaHref = `/services/${service.slug}/new`
  const serviceContentHtml = service.content
    ? sanitizeHtml(getLocalizedValue(service.content, lang))
    : null

  // Sections présentes (utilisé pour le TOC)
  const visibleSections = new Set<string>(["presentation"])
  if (service.processSteps && service.processSteps.length > 0)
    visibleSections.add("etapes")
  if (service.joinedDocuments && service.joinedDocuments.length > 0)
    visibleSections.add("pieces")
  if (service.pricingTable && service.pricingTable.length > 0)
    visibleSections.add("tarifs")
  if (service.availableModes && service.availableModes.length > 0)
    visibleSections.add("modes")
  if (service.faqs && service.faqs.length > 0) visibleSections.add("faq")

  return (
    <div className="mx-auto w-full max-w-[1280px] px-8 pb-24">
      <ServiceBreadcrumb
        categoryLabel={categoryLabel}
        serviceName={serviceName}
      />

      <ServiceHero
        pills={heroPills}
        title={serviceName}
        tagline={serviceDescription}
        category={categoryLabel}
        estimatedDays={service.estimatedDays}
        pricingMain={standardPricing ?? undefined}
        audience={audience}
        ctaTitle={t(
          "services.detail.heroCtaTitle",
          "Demandez votre {{name}} depuis votre espace personnel.",
          { name: serviceName.toLowerCase() },
        )}
        ctaDescription={t(
          "services.detail.heroCtaBody",
          "Identité vérifiée par France Connect ou Consulat ID — signature électronique avancée acceptée.",
        )}
        ctaHref={ctaHref}
        secondaryCtaHref="/reps"
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <ServiceTOC visibleIds={visibleSections} active={activeSection} />

          <PresentationSection
            lang={lang}
            title={serviceName}
            lede={serviceDescription}
            noteCallout={
              service.noteCallout as
                | {
                    variant: "info" | "warning" | "success"
                    body: { fr?: string; en?: string } | string
                  }
                | undefined
            }
            useCases={
              service.useCases as
                | Array<{ fr?: string; en?: string } | string>
                | undefined
            }
            contentHtml={serviceContentHtml}
          />

          {service.processSteps && service.processSteps.length > 0 && (
            <StepsSection
              lang={lang}
              steps={service.processSteps as never}
              intro={
                titleValidity
                  ? t(
                      "services.detail.stepsIntroValidity",
                      "Votre titre sera valide {{validity}}.",
                      { validity: titleValidity },
                    )
                  : undefined
              }
            />
          )}

          {service.joinedDocuments && service.joinedDocuments.length > 0 && (
            <DocumentsSection
              lang={lang}
              docs={service.joinedDocuments as never}
            />
          )}

          {service.pricingTable && service.pricingTable.length > 0 && (
            <PricingSection
              lang={lang}
              items={service.pricingTable as never}
              legalReference={service.legalReference as never}
              pricingNote={service.pricingNote as never}
            />
          )}

          {service.availableModes && service.availableModes.length > 0 && (
            <ModesSection
              lang={lang}
              modes={service.availableModes as never}
            />
          )}

          {service.faqs && service.faqs.length > 0 && (
            <FaqSection lang={lang} faqs={service.faqs as never} />
          )}
        </div>

        <aside>
          <InBriefCard
            category={categoryLabel}
            audience={audience}
            estimatedDays={service.estimatedDays}
            expressDays={expressDays}
            pricingMain={standardPricing ?? undefined}
            pricingMinor={minorsPricing}
            isFullyOnline={fullyOnline}
            ctaHref={ctaHref}
          />
          <WhereCard />
          {service.formFilesWithUrls &&
            service.formFilesWithUrls.length > 0 && (
              <FormFilesCard files={service.formFilesWithUrls} />
            )}
          {service.relatedServices && service.relatedServices.length > 0 && (
            <RelatedServicesCard
              related={service.relatedServices as never}
              lang={lang}
            />
          )}
          <HelpSidebarCard />
        </aside>
      </div>
    </div>
  )
}
