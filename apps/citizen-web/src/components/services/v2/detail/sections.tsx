"use client"

import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  HelpCircle,
  Info,
  type LucideIcon,
  Plus,
  ShieldCheck,
  Upload,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { getLocalizedValue } from "@/lib/i18n-utils"

type Loc = { fr?: string; en?: string } | string

function loc(value: Loc | undefined, lang: string, fallback = ""): string {
  if (!value) return fallback
  const v = getLocalizedValue(value as never, lang)
  return v || fallback
}

const EXTRA_ICON_MAP: Record<string, LucideIcon> = {
  clock: Clock,
  shield: ShieldCheck,
  upload: Upload,
  check: CheckCircle2,
}

// ─── Présentation ─────────────────────────────────────────────────────────

export function PresentationSection({
  lang,
  title,
  lede,
  noteCallout,
  useCases,
  contentHtml,
}: {
  lang: string
  title: string
  lede: string
  noteCallout?: { variant: "info" | "warning" | "success"; body: Loc }
  useCases?: Loc[]
  contentHtml?: string | null
}) {
  const { t } = useTranslation()

  const variantClasses = {
    info: "bg-[var(--pub-gabon-blue-tint)] text-[var(--pub-text)]",
    warning: "bg-[var(--pub-warning-tint)] text-[var(--pub-text)]",
    success: "bg-[var(--pub-success-tint)] text-[var(--pub-text)]",
  } as const

  const variantIconColor = {
    info: "text-[var(--pub-gabon-blue)]",
    warning: "text-[var(--pub-warning)]",
    success: "text-[var(--pub-success)]",
  } as const

  return (
    <PCard id="presentation" label={t("services.toc.presentation", "Présentation")}>
      <h2 className="text-[22px] font-semibold tracking-[-0.015em] text-[var(--pub-text)]">
        {t("services.detail.aboutTitle", "Qu'est-ce que ce service ?")}
      </h2>
      <p className="mt-2 max-w-[70ch] text-[15px] leading-[1.55] text-[var(--pub-text-muted)]">
        {lede}
      </p>

      {noteCallout && (
        <div
          className={cn(
            "mt-6 flex items-start gap-3 rounded-[10px] p-4 leading-[1.55]",
            variantClasses[noteCallout.variant],
          )}
        >
          <Info
            className={cn("size-[18px] shrink-0 mt-0.5", variantIconColor[noteCallout.variant])}
            aria-hidden="true"
          />
          <div className="text-[14px]">{loc(noteCallout.body, lang)}</div>
        </div>
      )}

      {useCases && useCases.length > 0 && (
        <>
          <h3 className="mt-7 mb-2.5 text-[16px] font-semibold text-[var(--pub-text)]">
            {t("services.detail.useCasesTitle", "Dans quels cas en avez-vous besoin ?")}
          </h3>
          <ul className="ml-5 list-disc space-y-1.5 text-[14px] leading-[1.6] text-[var(--pub-text-muted)]">
            {useCases.map((uc, i) => (
              <li key={i}>{loc(uc, lang)}</li>
            ))}
          </ul>
        </>
      )}

      {contentHtml && (
        <div
          className="prose prose-sm mt-6 max-w-none text-[14px] leading-[1.6] text-[var(--pub-text)]"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized content
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      )}
    </PCard>
  )
}

// ─── Étapes ───────────────────────────────────────────────────────────────

type Step = {
  label: Loc
  description?: Loc
  icon?: string
  extras?: Array<{ label: Loc; icon?: string }>
}

export function StepsSection({
  lang,
  steps,
  intro,
}: {
  lang: string
  steps: Step[]
  intro?: string
}) {
  const { t } = useTranslation()
  return (
    <PCard id="etapes" label={t("services.toc.steps", "Étapes de la procédure")}>
      <h2 className="text-[22px] font-semibold tracking-[-0.015em] text-[var(--pub-text)]">
        {t("services.detail.stepsTitle", "Étapes de la procédure")}
      </h2>
      {intro && (
        <p className="mt-2 max-w-[70ch] text-[15px] leading-[1.55] text-[var(--pub-text-muted)]">
          {intro}
        </p>
      )}
      <ol className="mt-6">
        {steps.map((step, i) => (
          <li
            key={i}
            className={cn(
              "grid grid-cols-[44px_1fr] gap-4 py-5",
              i > 0 && "border-t border-[var(--pub-border)]",
            )}
          >
            <div className="grid size-8 place-items-center rounded-full bg-[var(--pub-gabon-blue)] font-mono text-[14px] font-semibold text-white">
              {i + 1}
            </div>
            <div>
              <h4 className="text-[16px] font-semibold text-[var(--pub-text)]">
                {loc(step.label, lang)}
              </h4>
              {step.description && (
                <p className="mt-1.5 text-[14px] leading-[1.55] text-[var(--pub-text-muted)]">
                  {loc(step.description, lang)}
                </p>
              )}
              {step.extras && step.extras.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-3.5 text-[12px] text-[var(--pub-text-muted)]">
                  {step.extras.map((extra, j) => {
                    const Icon = extra.icon ? EXTRA_ICON_MAP[extra.icon] : null
                    return (
                      <span key={j} className="inline-flex items-center gap-1.5">
                        {Icon && (
                          <Icon
                            className="size-3.5 text-[var(--pub-text-faint)]"
                            aria-hidden="true"
                          />
                        )}
                        {loc(extra.label, lang)}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </PCard>
  )
}

// ─── Pièces ───────────────────────────────────────────────────────────────

type DocItem = {
  type: string
  label: Loc
  description?: Loc
  required: boolean
  format?: "original" | "copy" | "digital" | "certified"
  group?: "required" | "situational"
}

const FORMAT_LABEL: Record<NonNullable<DocItem["format"]>, string> = {
  original: "Original",
  copy: "Copie",
  digital: "Numérique",
  certified: "Certifié",
}

export function DocumentsSection({
  lang,
  docs,
}: {
  lang: string
  docs: DocItem[]
}) {
  const { t } = useTranslation()

  // Si `group` n'est pas défini, on déduit du flag required.
  const required = docs.filter(
    (d) => (d.group ?? (d.required ? "required" : "situational")) === "required",
  )
  const situational = docs.filter(
    (d) => (d.group ?? (d.required ? "required" : "situational")) === "situational",
  )

  return (
    <PCard id="pieces" label={t("services.toc.docs", "Pièces à fournir")}>
      <h2 className="text-[22px] font-semibold tracking-[-0.015em] text-[var(--pub-text)]">
        {t("services.detail.docsTitle", "Pièces à fournir")}
      </h2>
      <p className="mt-2 max-w-[70ch] text-[15px] leading-[1.55] text-[var(--pub-text-muted)]">
        {t(
          "services.detail.docsLede",
          "Liste des documents requis. Les pièces optionnelles peuvent accélérer le traitement de votre dossier.",
        )}
      </p>

      {required.length > 0 && (
        <DocsGroup
          title={t("services.detail.docsRequired", "Obligatoires")}
          docs={required}
          lang={lang}
        />
      )}
      {situational.length > 0 && (
        <DocsGroup
          title={t("services.detail.docsSituational", "Selon votre situation")}
          docs={situational}
          lang={lang}
          optional
        />
      )}
    </PCard>
  )
}

function DocsGroup({
  title,
  docs,
  lang,
  optional,
}: {
  title: string
  docs: DocItem[]
  lang: string
  optional?: boolean
}) {
  return (
    <>
      <h3 className="mt-6 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--pub-text-muted)]">
        {title}
      </h3>
      <ul className="mt-1 flex flex-col">
        {docs.map((doc, i) => (
          <li
            key={i}
            className={cn(
              "grid grid-cols-[24px_1fr_auto] items-center gap-3.5 py-3.5",
              i > 0 && "border-t border-[var(--pub-border)]",
            )}
          >
            <div
              className={cn(
                "grid size-5 place-items-center rounded-full",
                optional
                  ? "border border-dashed border-[var(--pub-border-strong)] bg-[var(--pub-surface-2)] text-[var(--pub-text-faint)]"
                  : "bg-[var(--pub-success-tint)] text-[var(--pub-success)]",
              )}
            >
              {optional ? (
                <Plus className="size-3" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="size-3" aria-hidden="true" />
              )}
            </div>
            <div>
              <h4 className="text-[14px] font-semibold text-[var(--pub-text)]">
                {loc(doc.label, lang)}
              </h4>
              {doc.description && (
                <p className="mt-0.5 text-[12px] leading-[1.45] text-[var(--pub-text-muted)]">
                  {loc(doc.description, lang)}
                </p>
              )}
            </div>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                optional
                  ? "border-transparent bg-[var(--pub-surface-2)] text-[var(--pub-text-muted)]"
                  : "border-transparent bg-[var(--pub-gabon-blue-tint)] text-[var(--pub-gabon-blue)]",
              )}
            >
              {optional
                ? "Optionnel"
                : doc.format
                  ? FORMAT_LABEL[doc.format]
                  : "Original"}
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}

// ─── Tarifs ───────────────────────────────────────────────────────────────

type PricingItem = {
  id: string
  name: Loc
  description?: Loc
  delay?: Loc
  price?: Loc
  isFree?: boolean
}

export function PricingSection({
  lang,
  items,
  legalReference,
  pricingNote,
}: {
  lang: string
  items: PricingItem[]
  legalReference?: Loc
  pricingNote?: Loc
}) {
  const { t } = useTranslation()
  return (
    <PCard id="tarifs" label={t("services.toc.pricing", "Tarifs & délais")}>
      <h2 className="text-[22px] font-semibold tracking-[-0.015em] text-[var(--pub-text)]">
        {t("services.detail.pricingTitle", "Tarifs & délais")}
      </h2>
      {legalReference && (
        <p className="mt-2 max-w-[70ch] text-[15px] leading-[1.55] text-[var(--pub-text-muted)]">
          {loc(legalReference, lang)}
        </p>
      )}
      <div className="mt-4 overflow-hidden rounded-[10px] border border-[var(--pub-border)]">
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 bg-[var(--pub-surface-2)] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--pub-text-muted)]">
          <span>{t("services.detail.col.service", "Prestation")}</span>
          <span>{t("services.detail.col.delay", "Délai")}</span>
          <span>{t("services.detail.col.price", "Tarif")}</span>
        </div>
        {items.map((item, i) => (
          <div
            key={item.id || i}
            className={cn(
              "grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-3.5",
              i < items.length && "border-t border-[var(--pub-border)]",
            )}
          >
            <div>
              <div className="text-[14px] font-medium text-[var(--pub-text)]">
                {loc(item.name, lang)}
              </div>
              {item.description && (
                <div className="mt-0.5 text-[12px] text-[var(--pub-text-muted)]">
                  {loc(item.description, lang)}
                </div>
              )}
            </div>
            <span className="font-mono text-[13px] text-[var(--pub-text-muted)]">
              {item.delay ? loc(item.delay, lang) : "—"}
            </span>
            <span
              className={cn(
                "font-mono text-[14px] font-semibold",
                item.isFree
                  ? "text-[var(--pub-success)]"
                  : "text-[var(--pub-text)]",
              )}
            >
              {item.isFree
                ? t("services.free", "Gratuit")
                : item.price
                  ? loc(item.price, lang)
                  : "—"}
            </span>
          </div>
        ))}
      </div>
      {pricingNote && (
        <p className="mt-3 text-[12px] leading-[1.5] text-[var(--pub-text-muted)]">
          {loc(pricingNote, lang)}
        </p>
      )}
    </PCard>
  )
}

// ─── Modes ────────────────────────────────────────────────────────────────

type Mode = {
  mode: "online" | "in_person" | "postal"
  title?: Loc
  description: Loc
  delay?: Loc
  fee?: Loc
  availability?: Loc
  recommended?: boolean
}

export function ModesSection({
  lang,
  modes,
}: {
  lang: string
  modes: Mode[]
}) {
  const { t } = useTranslation()
  const defaultTitle: Record<Mode["mode"], string> = {
    online: t("services.detail.mode.online", "En ligne — espace personnel"),
    in_person: t("services.detail.mode.inPerson", "En personne — au consulat"),
    postal: t("services.detail.mode.postal", "Par voie postale"),
  }
  return (
    <PCard id="modes" label={t("services.toc.modes", "En ligne ou en personne ?")}>
      <h2 className="text-[22px] font-semibold tracking-[-0.015em] text-[var(--pub-text)]">
        {t("services.detail.modesTitle", "En ligne ou en personne ?")}
      </h2>
      <p className="mt-2 max-w-[70ch] text-[15px] leading-[1.55] text-[var(--pub-text-muted)]">
        {t(
          "services.detail.modesLede",
          "Le service est disponible selon plusieurs modalités. Choisissez celle qui vous convient le mieux.",
        )}
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {modes.map((m, i) => {
          const isPreferred = m.recommended
          return (
            <div
              key={i}
              className={cn(
                "relative flex flex-col gap-2.5 rounded-[10px] border p-5",
                isPreferred
                  ? "border-[var(--pub-gabon-blue)] bg-[var(--pub-gabon-blue-tint)]"
                  : "border-[var(--pub-border)] bg-[var(--pub-surface)]",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className={cn(
                    "grid size-10 place-items-center rounded-[10px]",
                    isPreferred
                      ? "bg-[var(--pub-surface)] text-[var(--pub-gabon-blue)]"
                      : "border border-[var(--pub-border)] bg-[var(--pub-surface-2)] text-[var(--pub-text)]",
                  )}
                >
                  {m.mode === "online" ? (
                    <ShieldCheck className="size-5" aria-hidden="true" />
                  ) : m.mode === "in_person" ? (
                    <Calendar className="size-5" aria-hidden="true" />
                  ) : (
                    <Upload className="size-5" aria-hidden="true" />
                  )}
                </div>
                {isPreferred && (
                  <span className="rounded-full border-transparent bg-[var(--pub-gabon-blue)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-white">
                    {t("services.detail.recommended", "Recommandé")}
                  </span>
                )}
              </div>
              <h4 className="text-[15px] font-semibold text-[var(--pub-text)]">
                {m.title ? loc(m.title, lang) : defaultTitle[m.mode]}
              </h4>
              <p className="text-[13px] leading-[1.5] text-[var(--pub-text-muted)]">
                {loc(m.description, lang)}
              </p>
              <div
                className={cn(
                  "mt-auto flex flex-wrap gap-3.5 border-t pt-2.5 text-[12px] text-[var(--pub-text-muted)]",
                  isPreferred ? "border-[#0b4f9c26]" : "border-dashed border-[var(--pub-border)]",
                )}
              >
                {m.delay && (
                  <span>
                    {t("services.detail.delayShort", "Délai")} :{" "}
                    <b
                      className={cn(
                        "font-medium",
                        isPreferred && "text-[var(--pub-gabon-blue)]",
                      )}
                    >
                      {loc(m.delay, lang)}
                    </b>
                  </span>
                )}
                {m.fee && (
                  <span>
                    {t("services.detail.feeShort", "Frais")} :{" "}
                    <b
                      className={cn(
                        "font-medium",
                        isPreferred && "text-[var(--pub-gabon-blue)]",
                      )}
                    >
                      {loc(m.fee, lang)}
                    </b>
                  </span>
                )}
                {m.availability && <span>{loc(m.availability, lang)}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </PCard>
  )
}

// ─── FAQ ──────────────────────────────────────────────────────────────────

type Faq = { question: Loc; answer: Loc }

export function FaqSection({ lang, faqs }: { lang: string; faqs: Faq[] }) {
  const { t } = useTranslation()
  return (
    <PCard id="faq" label={t("services.toc.faq", "Questions fréquentes")}>
      <h2 className="text-[22px] font-semibold tracking-[-0.015em] text-[var(--pub-text)]">
        {t("services.detail.faqTitle", "Questions fréquentes")}
      </h2>
      <ul className="mt-4 list-none border-t border-[var(--pub-border)] p-0">
        {faqs.map((f, i) => (
          <li
            key={i}
            className="border-b border-[var(--pub-border)]"
          >
            <details className="group cursor-pointer py-4" {...(i === 0 ? { open: true } : {})}>
              <summary className="flex list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                <span className="flex-1 text-[15px] font-semibold leading-[1.4] text-[var(--pub-text)]">
                  {loc(f.question, lang)}
                </span>
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-[var(--pub-border-strong)] text-[var(--pub-text-muted)] transition-all group-open:rotate-45 group-open:border-[var(--pub-gabon-blue)] group-open:bg-[var(--pub-gabon-blue)] group-open:text-white">
                  <Plus className="size-3.5" aria-hidden="true" />
                </span>
              </summary>
              <p className="mt-3 max-w-[70ch] text-[14px] leading-[1.6] text-[var(--pub-text-muted)]">
                {loc(f.answer, lang)}
              </p>
            </details>
          </li>
        ))}
      </ul>
    </PCard>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function PCard({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      aria-label={label}
      className="rounded-[14px] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-7 [&+section]:mt-4"
    >
      {children}
    </section>
  )
}

// ─── TOC sticky ───────────────────────────────────────────────────────────

const TOC_ITEMS = [
  { id: "presentation", key: "services.toc.presentation", fallback: "Présentation" },
  { id: "etapes", key: "services.toc.steps", fallback: "Étapes de la procédure" },
  { id: "pieces", key: "services.toc.docs", fallback: "Pièces à fournir" },
  { id: "tarifs", key: "services.toc.pricing", fallback: "Tarifs & délais" },
  { id: "modes", key: "services.toc.modes", fallback: "En ligne ou en personne ?" },
  { id: "faq", key: "services.toc.faq", fallback: "Questions fréquentes" },
] as const

export function ServiceTOC({
  visibleIds,
  active,
}: {
  visibleIds: Set<string>
  active: string | null
}) {
  const { t } = useTranslation()
  return (
    <nav
      className="mb-4 rounded-[14px] border border-[var(--pub-border)] bg-[var(--pub-surface)] px-5 py-4"
      aria-label={t("services.toc.aria", "Sur cette page")}
    >
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--pub-text-muted)]">
        {t("services.toc.title", "Sur cette page")}
      </h3>
      <ol className="m-0 flex list-none flex-col gap-0.5 p-0">
        {TOC_ITEMS.filter((it) => visibleIds.has(it.id)).map((it, i) => (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium no-underline",
                active === it.id
                  ? "bg-[var(--pub-gabon-blue-tint)] text-[var(--pub-gabon-blue)]"
                  : "text-[var(--pub-text-muted)] hover:bg-[var(--pub-surface-2)] hover:text-[var(--pub-text)]",
              )}
            >
              <span
                className={cn(
                  "w-[18px] text-center font-mono text-[11px]",
                  active === it.id ? "text-[var(--pub-gabon-blue)]" : "text-[var(--pub-text-faint)]",
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              {t(it.key, it.fallback)}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────

export function ServiceBreadcrumb({
  categoryLabel,
  serviceName,
}: {
  categoryLabel: string
  serviceName: string
}) {
  const { t } = useTranslation()
  return (
    <nav
      aria-label={t("breadcrumb.label", "Fil d'Ariane")}
      className="my-5 flex flex-wrap items-center gap-1.5 text-[13px] text-[var(--pub-text-muted)]"
    >
      <a href="/" className="hover:text-[var(--pub-text)] hover:underline">
        {t("breadcrumb.home", "Accueil")}
      </a>
      <ChevronRight className="size-3 opacity-50" aria-hidden="true" />
      <a href="/services" className="hover:text-[var(--pub-text)] hover:underline">
        {t("breadcrumb.services", "Services consulaires")}
      </a>
      <ChevronRight className="size-3 opacity-50" aria-hidden="true" />
      <span className="text-[var(--pub-text-muted)]">{categoryLabel}</span>
      <ChevronRight className="size-3 opacity-50" aria-hidden="true" />
      <span className="font-medium text-[var(--pub-text)]">{serviceName}</span>
    </nav>
  )
}
