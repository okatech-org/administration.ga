"use client"

import { sanitizeHtml } from "@workspace/shared/utils/sanitize"
import { api } from "@convex/_generated/api"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { useConvexAuth, useMutation } from "convex/react"
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  FileCheck,
  Globe2,
  GraduationCap,
  HelpCircle,
  MapPin,
  MessageCircle,
  Plus,
  ThumbsDown,
  ThumbsUp,
  Users,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useConvexQuery } from "@/integrations/convex/hooks"
import { getLocalizedValue } from "@/lib/i18n-utils"
import { cn } from "@/lib/utils"

type LocalizedField = string | Record<string, string> | undefined

const TOC_SECTIONS: Array<{ id: string; labelFr: string }> = [
  { id: "docs", labelFr: "Pièces à fournir" },
  { id: "steps", labelFr: "Étapes pas-à-pas" },
  { id: "fees", labelFr: "Tarifs & paiement" },
  { id: "delays", labelFr: "Délais & retrait" },
  { id: "faq", labelFr: "Questions fréquentes" },
  { id: "contact", labelFr: "Besoin d'aide ?" },
]

const SPEED_STYLES: Record<string, { label: string; className: string }> = {
  fast: {
    label: "Rapide",
    className: "bg-[var(--success-tint)] text-emerald-700",
  },
  standard: {
    label: "Standard",
    className: "bg-muted text-muted-foreground",
  },
  long: {
    label: "Long",
    className: "bg-[var(--warning-tint)] text-amber-700",
  },
}

const REQUIREMENT_PILL: Record<string, { label: string; className: string }> = {
  required: {
    label: "Obligatoire",
    className: "bg-rose-100 text-rose-700",
  },
  ifAvailable: {
    label: "Si dispo",
    className: "bg-muted text-muted-foreground",
  },
  optional: {
    label: "Optionnel",
    className: "bg-muted text-muted-foreground",
  },
}

const REGION_ICONS: Record<string, typeof Globe2> = {
  europe: FileCheck,
  afrique: Globe2,
  ameriques: MapPin,
  asie: Users,
}

export function TutorialDetailClient() {
  const { t, i18n } = useTranslation()
  const params = useParams<{ slug: string }>()
  const lang = i18n.language ?? "fr"

  const { data: tutorial, isLoading } = useConvexQuery(
    api.functions.tutorials.getBySlug,
    { slug: params.slug },
  )

  const { data: related } = useConvexQuery(
    api.functions.tutorials.getRelated,
    { slug: params.slug, limit: 3 },
  )

  const { isAuthenticated } = useConvexAuth()
  const updateProgress = useMutation(
    api.functions.tutorialProgress.updateProgress,
  )

  // Local state: completed step ids
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [openSteps, setOpenSteps] = useState<Set<number>>(new Set())
  const [checkedDocs, setCheckedDocs] = useState<Set<number>>(new Set())
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const handleDownloadPdf = async () => {
    if (!tutorial || downloadingPdf) return
    setDownloadingPdf(true)
    try {
      const { downloadTutorialPdf } = await import("@/lib/tutorialPdf")
      await downloadTutorialPdf(tutorial, lang === "en" ? "en" : "fr")
    } catch (err) {
      console.error("[tutorial] PDF download failed", err)
      toast.error(
        t("ressources.pdfDownloadError", {
          defaultValue: "Erreur lors du téléchargement du PDF",
        }),
      )
    } finally {
      setDownloadingPdf(false)
    }
  }

  // Scroll-progress tutorialProgress sync
  const startedRef = useRef(false)
  const halfwayRef = useRef(false)
  const completedRef = useRef(false)
  useEffect(() => {
    if (!isAuthenticated || !tutorial?._id) return
    if (!startedRef.current) {
      startedRef.current = true
      void updateProgress({ tutorialId: tutorial._id, percent: 10 }).catch(
        () => {},
      )
    }
    const onScroll = () => {
      const winH = window.innerHeight
      const docH = document.documentElement.scrollHeight
      const ratio = (window.scrollY + winH) / docH
      if (ratio >= 0.5 && !halfwayRef.current) {
        halfwayRef.current = true
        void updateProgress({ tutorialId: tutorial._id, percent: 50 }).catch(
          () => {},
        )
      }
      if (ratio >= 0.95 && !completedRef.current) {
        completedRef.current = true
        void updateProgress({ tutorialId: tutorial._id, percent: 100 }).catch(
          () => {},
        )
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [isAuthenticated, tutorial?._id, updateProgress])

  // Open the first step by default
  useEffect(() => {
    if (tutorial?.steps && tutorial.steps.length > 0 && openSteps.size === 0) {
      setOpenSteps(new Set([tutorial.steps[0].number]))
    }
  }, [tutorial?.steps, openSteps.size])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-12 space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (!tutorial) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <GraduationCap className="h-16 w-16 text-muted-foreground/30 mx-auto" />
          <h1 className="text-2xl font-bold">{t("academy.notFound.title")}</h1>
          <p className="text-muted-foreground">
            {t("academy.notFound.description")}
          </p>
          <Button asChild variant="outline">
            <Link href="/ressources">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("ressources.backToList")}
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const title = getLocalizedValue(tutorial.titleI18n ?? tutorial.title, lang)
  const excerpt = getLocalizedValue(
    tutorial.excerptI18n ?? tutorial.excerpt,
    lang,
  )
  const lede = getLocalizedValue(
    (tutorial.ledeI18n ?? tutorial.lede) as LocalizedField,
    lang,
  )
  const summary = tutorial.procedureSummary
  const updatedDate = tutorial.updatedAt
    ? new Date(tutorial.updatedAt).toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null

  const steps = tutorial.steps ?? []
  const stepCount = steps.length || tutorial.stepCount || 0
  const completedCount = completedSteps.size
  const progressPct = stepCount > 0
    ? Math.round((completedCount / stepCount) * 100)
    : 0

  const docs = tutorial.prerequisites ?? []
  const checkedCount = checkedDocs.size

  const fees = tutorial.fees ?? []
  const delays = tutorial.delays ?? []
  const faqItems = tutorial.faqItems ?? []
  const sources = tutorial.sources ?? []

  const toggleStep = (n: number) =>
    setOpenSteps((s) => {
      const next = new Set(s)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  const toggleStepDone = (n: number) =>
    setCompletedSteps((s) => {
      const next = new Set(s)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  const toggleDoc = (idx: number) =>
    setCheckedDocs((s) => {
      const next = new Set(s)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })

  const ctaHref = tutorial.relatedService
    ? `/services/${tutorial.relatedService.slug}`
    : "/services"

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6 lg:py-10 max-w-6xl">
        {/* 01 Breadcrumb */}
        <nav
          aria-label="Fil d'Ariane"
          className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap"
        >
          <Link href="/" className="hover:text-foreground">
            Accueil
          </Link>
          <ChevronRight className="h-3 w-3 opacity-50" />
          <Link href="/ressources" className="hover:text-foreground">
            Ressources
          </Link>
          <ChevronRight className="h-3 w-3 opacity-50" />
          <span className="text-foreground font-medium truncate max-w-[40ch]">
            {title}
          </span>
        </nav>

        {/* 02 En-tête guide */}
        <header className="grid lg:grid-cols-[1fr_360px] gap-8 mb-8">
          <div>
            <div className="gabon-stripe h-1 w-24 rounded-full mb-5" />
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-[var(--gabon-blue-tint)] text-[var(--gabon-blue-hex)] mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              Guide procédural
            </span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight tracking-tight mb-5">
              {title}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
              {lede || excerpt}
            </p>
          </div>

          {/* Carte résumé + actions */}
          <aside className="rounded-2xl border bg-[var(--surface)] p-5 shadow-sm self-start lg:sticky lg:top-24">
            {summary && (
              <>
                <h3 className="text-sm font-semibold mb-4">
                  Résumé de la démarche
                </h3>
                <dl className="space-y-3 text-sm">
                  {summary.steps && (
                    <SummaryRow
                      icon={<FileCheck className="h-3.5 w-3.5" />}
                      label="Étapes"
                      value={getLocalizedValue(
                        summary.stepsI18n ?? summary.steps,
                        lang,
                      )}
                      highlight
                    />
                  )}
                  {summary.delay && (
                    <SummaryRow
                      icon={<Clock className="h-3.5 w-3.5" />}
                      label="Délai"
                      value={getLocalizedValue(
                        summary.delayI18n ?? summary.delay,
                        lang,
                      )}
                    />
                  )}
                  {summary.fees && (
                    <SummaryRow
                      icon={<CreditCard className="h-3.5 w-3.5" />}
                      label="Frais"
                      value={getLocalizedValue(
                        summary.feesI18n ?? summary.fees,
                        lang,
                      )}
                    />
                  )}
                  {summary.location && (
                    <SummaryRow
                      icon={<MapPin className="h-3.5 w-3.5" />}
                      label="Lieu"
                      value={getLocalizedValue(
                        summary.locationI18n ?? summary.location,
                        lang,
                      )}
                    />
                  )}
                  {updatedDate && (
                    <SummaryRow
                      icon={<Calendar className="h-3.5 w-3.5" />}
                      label="Mis à jour"
                      value={updatedDate}
                    />
                  )}
                </dl>
              </>
            )}
            {!summary && updatedDate && (
              <dl className="space-y-3 text-sm">
                <SummaryRow
                  icon={<Calendar className="h-3.5 w-3.5" />}
                  label="Mis à jour"
                  value={updatedDate}
                />
              </dl>
            )}
            <div className={cn(summary || updatedDate ? "mt-5" : "", "space-y-2")}>
                {tutorial.relatedService && (
                  <Button asChild className="w-full">
                    <Link href={ctaHref}>
                      Démarrer la démarche
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                )}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                {downloadingPdf ? "Génération…" : "Télécharger en PDF"}
              </Button>
            </div>
          </aside>
        </header>

        {/* 03 Progress strip */}
        {stepCount > 0 && (
          <div className="rounded-xl border bg-[var(--surface)] p-4 mb-8 flex items-center gap-4 flex-wrap">
            <span className="h-7 w-7 rounded-full bg-[var(--gabon-green-tint)] text-emerald-700 grid place-items-center">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            <span className="text-sm font-medium">Votre progression</span>
            <div className="flex-1 min-w-[120px] h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-[var(--gabon-green-hex)] transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground tabular-nums">
              <b className="text-foreground">{completedCount}</b> / {stepCount}{" "}
              étapes complétées
            </span>
          </div>
        )}

        {/* 04 + body — 2 col layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
          {/* 04 Sommaire (TOC) */}
          <aside className="lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto space-y-4">
            <div className="rounded-xl border bg-[var(--surface)] p-4">
              <h4 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
                Sommaire
              </h4>
              <ul className="space-y-1">
                {TOC_SECTIONS.map((s, idx) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="flex items-center gap-2.5 text-sm px-2 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <span className="font-mono text-xs tabular-nums opacity-60">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      {s.labelFr}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {tutorial.availableLocales &&
              tutorial.availableLocales.length > 0 && (
                <div className="rounded-xl border bg-[var(--surface)] p-4">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
                    Disponible aussi en
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {tutorial.availableLocales.map((l) => (
                      <span
                        key={l}
                        className="text-xs px-2 py-0.5 rounded-md bg-muted uppercase font-medium"
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </aside>

          <div className="min-w-0 space-y-12">
            {/* 05 Pièces à fournir */}
            {docs.length > 0 && (
              <section id="docs" className="scroll-mt-24">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold mb-1.5">
                      Pièces à fournir.
                    </h2>
                    <p className="text-sm text-muted-foreground max-w-2xl">
                      Cochez-les au fur et à mesure pour suivre votre
                      préparation.
                    </p>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground tabular-nums">
                    {checkedCount} / {docs.length} prêts
                  </span>
                </div>
                <div className="rounded-2xl border bg-[var(--surface)] divide-y">
                  {docs.map((d, idx) => {
                    const dTitle = getLocalizedValue(
                      d.titleI18n ?? d.title,
                      lang,
                    )
                    const dDesc = getLocalizedValue(
                      d.descriptionI18n ?? d.description,
                      lang,
                    )
                    const req = REQUIREMENT_PILL[d.requirement] ?? REQUIREMENT_PILL.optional
                    const isChecked = checkedDocs.has(idx)
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleDoc(idx)}
                        className="w-full p-4 flex items-start gap-3 text-left hover:bg-muted/40 transition-colors"
                      >
                        <span
                          className={cn(
                            "h-6 w-6 rounded-md border-2 grid place-items-center shrink-0 mt-0.5",
                            isChecked
                              ? "bg-[var(--gabon-green-hex)] border-[var(--gabon-green-hex)] text-white"
                              : "border-muted-foreground/30",
                          )}
                        >
                          {isChecked && (
                            <Check className="h-3 w-3" strokeWidth={3} />
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-sm">{dTitle}</h5>
                          {dDesc && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {dDesc}
                            </p>
                          )}
                        </div>
                        <span
                          className={cn(
                            "text-xs px-2.5 py-1 rounded-full font-medium shrink-0",
                            req.className,
                          )}
                        >
                          {req.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
            )}

            {/* 06 Étapes */}
            {steps.length > 0 && (
              <section id="steps" className="scroll-mt-24">
                <h2 className="text-2xl md:text-3xl font-bold mb-1.5">
                  Les {steps.length} étapes.
                </h2>
                <p className="text-sm text-muted-foreground mb-5 max-w-2xl">
                  Cliquez sur une étape pour déplier les détails. Marquez-la
                  comme terminée pour suivre votre progression.
                </p>
                <div className="space-y-3">
                  {steps.map((s) => {
                    const sTitle = getLocalizedValue(s.titleI18n ?? s.title, lang)
                    const sDuration = getLocalizedValue(
                      s.durationLabelI18n ?? s.durationLabel,
                      lang,
                    )
                    const sLoc = getLocalizedValue(
                      s.locationLabelI18n ?? s.locationLabel,
                      lang,
                    )
                    const sBody = getLocalizedValue(
                      s.bodyI18n ?? s.body,
                      lang,
                    )
                    const isOpen = openSteps.has(s.number)
                    const isDone = completedSteps.has(s.number)
                    return (
                      <article
                        key={s.number}
                        className={cn(
                          "rounded-xl border bg-[var(--surface)] transition-colors",
                          isDone && "border-[var(--gabon-green-hex)]/40 bg-[var(--gabon-green-tint)]/30",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => toggleStep(s.number)}
                          className="w-full p-4 flex items-start gap-4 text-left"
                          aria-expanded={isOpen}
                        >
                          <span
                            className={cn(
                              "h-9 w-9 rounded-lg grid place-items-center shrink-0 text-sm font-bold tabular-nums",
                              isDone
                                ? "bg-[var(--gabon-green-hex)] text-white"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {isDone ? (
                              <Check className="h-4 w-4" strokeWidth={3} />
                            ) : (
                              String(s.number).padStart(2, "0")
                            )}
                          </span>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold leading-snug">
                              {sTitle}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                              {sDuration && (
                                <>
                                  <Clock className="h-3 w-3" />
                                  <span>{sDuration}</span>
                                </>
                              )}
                              {sDuration && sLoc && (
                                <span className="w-1 h-1 rounded-full bg-current opacity-30" />
                              )}
                              {sLoc && <span>{sLoc}</span>}
                            </div>
                          </div>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                              isOpen && "rotate-180",
                            )}
                          />
                        </button>
                        {isOpen && (sBody || true) && (
                          <div className="border-t px-4 py-4">
                            {sBody && (
                              <div
                                className="prose prose-sm max-w-none dark:prose-invert
                                  prose-p:text-muted-foreground prose-p:leading-relaxed
                                  prose-a:text-[var(--gabon-blue-hex)] prose-a:underline
                                  [&_.step-tip]:bg-[var(--gabon-blue-tint)] [&_.step-tip]:p-3 [&_.step-tip]:rounded-md [&_.step-tip]:text-sm [&_.step-tip]:my-3
                                  [&_.callout]:p-3 [&_.callout]:rounded-md [&_.callout]:text-sm [&_.callout]:my-3
                                  [&_.callout[data-variant='warn']]:bg-[var(--warning-tint)] [&_.callout[data-variant='warn']]:text-amber-800
                                  [&_.callout[data-variant='info']]:bg-[var(--gabon-blue-tint)] [&_.callout[data-variant='info']]:text-[var(--gabon-blue-hex)]
                                  [&_.callout[data-variant='ok']]:bg-[var(--success-tint)] [&_.callout[data-variant='ok']]:text-emerald-700"
                                dangerouslySetInnerHTML={{
                                  __html: sanitizeHtml(sBody),
                                }}
                              />
                            )}
                            <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t">
                              <button
                                type="button"
                                onClick={() => toggleStepDone(s.number)}
                                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                              >
                                <span
                                  className={cn(
                                    "h-5 w-5 rounded-md border-2 grid place-items-center",
                                    isDone
                                      ? "bg-[var(--gabon-green-hex)] border-[var(--gabon-green-hex)] text-white"
                                      : "border-muted-foreground/30",
                                  )}
                                >
                                  {isDone && (
                                    <Check className="h-3 w-3" strokeWidth={3} />
                                  )}
                                </span>
                                {isDone
                                  ? "Étape terminée"
                                  : "Marquer cette étape comme terminée"}
                              </button>
                            </div>
                          </div>
                        )}
                      </article>
                    )
                  })}
                </div>
              </section>
            )}

            {/* 07 Tarifs */}
            {fees.length > 0 && (
              <section id="fees" className="scroll-mt-24">
                <h2 className="text-2xl md:text-3xl font-bold mb-1.5">
                  Tarifs & modes de paiement.
                </h2>
                <p className="text-sm text-muted-foreground mb-5 max-w-2xl">
                  Frais de chancellerie fixés par décret. Conversion automatique
                  dans la devise du pays de résidence au moment du paiement.
                </p>
                <div className="rounded-2xl border bg-[var(--surface)] overflow-hidden">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground border-b bg-muted/40">
                    <span>Prestation</span>
                    <span>Délai</span>
                    <span>Montant</span>
                  </div>
                  <div className="divide-y">
                    {fees.map((f, idx) => {
                      const fLabel = getLocalizedValue(
                        f.labelI18n ?? f.label,
                        lang,
                      )
                      const fDesc = getLocalizedValue(
                        f.descriptionI18n ?? f.description,
                        lang,
                      )
                      const fDelay = getLocalizedValue(
                        f.delayI18n ?? f.delay,
                        lang,
                      )
                      return (
                        <div
                          key={idx}
                          className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3.5 items-start"
                        >
                          <div>
                            <div className="font-semibold text-sm flex items-center gap-2 flex-wrap">
                              {fLabel}
                              {f.badge && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--gabon-blue-tint)] text-[var(--gabon-blue-hex)] font-medium">
                                  {f.badge}
                                </span>
                              )}
                            </div>
                            {fDesc && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {fDesc}
                              </div>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                            {fDelay}
                          </span>
                          <span className="text-sm font-bold tabular-nums whitespace-nowrap">
                            {f.amount}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* 08 Délais */}
            {delays.length > 0 && (
              <section id="delays" className="scroll-mt-24">
                <h2 className="text-2xl md:text-3xl font-bold mb-1.5">
                  Délais & retrait.
                </h2>
                <p className="text-sm text-muted-foreground mb-5 max-w-2xl">
                  Délais moyens constatés. Susceptibles d'évoluer en fonction de
                  l'affluence en haute saison (mai à septembre).
                </p>
                <div className="rounded-2xl border bg-[var(--surface)] divide-y">
                  {delays.map((d) => {
                    const dLabel = getLocalizedValue(
                      d.labelI18n ?? d.label,
                      lang,
                    )
                    const dDesc = getLocalizedValue(
                      d.descriptionI18n ?? d.description,
                      lang,
                    )
                    const speed = SPEED_STYLES[d.speed] ?? SPEED_STYLES.standard
                    const Icon = REGION_ICONS[d.region] ?? Globe2
                    return (
                      <div
                        key={d.region}
                        className="p-4 flex items-start gap-3"
                      >
                        <span className="h-9 w-9 rounded-lg bg-muted text-muted-foreground grid place-items-center shrink-0">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-sm">{dLabel}</h5>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {dDesc}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "text-xs px-2.5 py-1 rounded-full font-medium shrink-0",
                            speed.className,
                          )}
                        >
                          {speed.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* 09 FAQ */}
            {faqItems.length > 0 && (
              <section id="faq" className="scroll-mt-24">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold mb-1.5">
                      Questions fréquentes.
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Les réponses aux interrogations les plus courantes.
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/faq">Toute la FAQ</Link>
                  </Button>
                </div>
                <ul className="space-y-2">
                  {faqItems.map((f, idx) => {
                    const q = getLocalizedValue(
                      f.questionI18n ?? f.question,
                      lang,
                    )
                    const a = getLocalizedValue(
                      f.answerI18n ?? f.answer,
                      lang,
                    )
                    return (
                      <li key={idx}>
                        <details className="group rounded-xl border bg-[var(--surface)] [&[open]>summary>span.toggle-ic]:rotate-45">
                          <summary className="flex items-center justify-between gap-3 px-4 py-3.5 cursor-pointer list-none">
                            <span className="font-medium text-sm leading-snug">
                              {q}
                            </span>
                            <span className="toggle-ic shrink-0 h-7 w-7 rounded-md border bg-background grid place-items-center transition-transform">
                              <Plus className="h-3.5 w-3.5" />
                            </span>
                          </summary>
                          <div className="px-4 pb-4 -mt-1 text-sm text-muted-foreground leading-relaxed">
                            {a}
                          </div>
                        </details>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {/* 10 CTA banner */}
            {tutorial.relatedService && (
              <section
                id="contact"
                className="scroll-mt-24 rounded-2xl bg-gradient-to-br from-[var(--gabon-blue-deep)] to-[var(--gabon-blue-hex)] text-white p-8 md:p-10 grid gap-6 md:grid-cols-[1fr_auto] items-center"
              >
                <div>
                  <h3 className="text-xl md:text-2xl font-bold mb-2">
                    Prêt à lancer votre démarche ?
                  </h3>
                  <p className="text-sm text-white/85 leading-relaxed max-w-2xl">
                    Connectez-vous à votre espace personnel pour pré-remplir
                    votre dossier, prendre rendez-vous et suivre l'avancement en
                    temps réel.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="lg" variant="secondary">
                    <Link href={ctaHref}>
                      Commencer
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  >
                    <Link href="/contact">
                      <MessageCircle className="mr-1.5 h-4 w-4" />
                      Parler à un agent
                    </Link>
                  </Button>
                </div>
              </section>
            )}

            {/* 11 Feedback */}
            <section className="rounded-2xl border bg-[var(--surface)] p-6 grid gap-4 md:grid-cols-[1fr_auto] items-center">
              <div>
                <h4 className="font-semibold mb-1">
                  Ce guide vous a-t-il été utile ?
                </h4>
                <p className="text-sm text-muted-foreground">
                  Votre retour nous aide à améliorer la qualité des informations
                  diffusées.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <ThumbsUp className="mr-1.5 h-3.5 w-3.5" />
                  Oui, utile
                </Button>
                <Button variant="outline" size="sm">
                  <ThumbsDown className="mr-1.5 h-3.5 w-3.5" />
                  À améliorer
                </Button>
              </div>
            </section>

            {/* Sources */}
            {sources.length > 0 && (
              <section className="rounded-xl border bg-[var(--surface)] p-5">
                <h4 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
                  Sources
                </h4>
                <ul className="space-y-2">
                  {sources.map((s) => (
                    <li key={s.url} className="text-sm">
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--gabon-blue-hex)] hover:underline break-all"
                      >
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>

        {/* 12 Guides liés */}
        {related && related.length > 0 && (
          <section className="mt-16 pt-10 border-t">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold">
                Guides{" "}
                <span className="text-[var(--gabon-blue-hex)]">
                  complémentaires
                </span>
                .
              </h2>
              <Button asChild variant="ghost" size="sm">
                <Link href="/ressources">
                  Tous les guides
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {related.map((r) => {
                const rTitle = getLocalizedValue(r.titleI18n ?? r.title, lang)
                const rExcerpt = getLocalizedValue(
                  r.excerptI18n ?? r.excerpt,
                  lang,
                )
                return (
                  <Link
                    key={r._id}
                    href={`/ressources/${r.slug}`}
                    className="group rounded-xl border bg-[var(--surface)] p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="h-9 w-9 rounded-lg bg-[var(--gabon-green-tint)] text-emerald-700 grid place-items-center">
                        <HelpCircle className="h-4 w-4" />
                      </span>
                      {r.stepCount && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                          {r.stepCount} étapes
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold leading-snug mb-1.5 group-hover:text-[var(--gabon-blue-hex)]">
                      {rTitle}
                    </h4>
                    {rExcerpt && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {rExcerpt}
                      </p>
                    )}
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function SummaryRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
}) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="flex items-center gap-1.5 text-muted-foreground shrink-0">
        {icon}
        {label}
      </dt>
      <dd
        className={cn(
          "text-right",
          highlight ? "font-semibold" : "text-foreground/90",
        )}
      >
        {value}
      </dd>
    </div>
  )
}
