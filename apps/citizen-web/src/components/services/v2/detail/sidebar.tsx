"use client"

import Link from "next/link"
import {
  ArrowRight,
  Briefcase,
  Calendar,
  ChevronRight,
  type LucideIcon,
  FileText,
  Info,
  LogIn,
  MapPin,
  Phone,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import type { ServiceCtaState } from "./hero"
import { getLocalizedValue } from "@/lib/i18n-utils"
import { cn } from "@/lib/utils"
import { CATEGORY_CONFIG } from "../categories"

type Loc = { fr?: string; en?: string } | string

function loc(value: Loc | undefined, lang: string, fallback = ""): string {
  if (!value) return fallback
  const v = getLocalizedValue(value as never, lang)
  return v || fallback
}

// ─── « En bref » ──────────────────────────────────────────────────────────

export function InBriefCard({
  category,
  audience,
  estimatedDays,
  expressDays,
  pricingMain,
  isFullyOnline,
  pricingMinor,
  cta,
  showSticky = true,
}: {
  category: string
  audience?: string
  estimatedDays: number
  expressDays?: number
  pricingMain?: string
  isFullyOnline: boolean
  pricingMinor?: string
  cta: ServiceCtaState
  showSticky?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div
      className={cn(
        "rounded-[14px] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-5",
        showSticky && "lg:sticky lg:top-24",
      )}
    >
      <h3 className="mb-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--pub-text-muted)]">
        {t("services.detail.sidebar.inBrief", "En bref")}
      </h3>
      <Row label={t("services.detail.metaCategory", "Catégorie")} value={category} />
      {audience && <Row label={t("services.detail.metaAudience", "Public")} value={audience} />}
      <Row
        label={t("services.detail.metaStandardDelay", "Délai standard")}
        value={t("services.detail.daysValue", {
          count: estimatedDays,
          defaultValue: "{{count}} jours",
        })}
      />
      {expressDays && (
        <Row
          label={t("services.detail.metaExpressDelay", "Délai express")}
          value={t("services.detail.daysValue", {
            count: expressDays,
            defaultValue: "{{count}} jours",
          })}
        />
      )}
      {pricingMain && (
        <Row label={t("services.detail.metaFee", "Frais")} value={pricingMain} />
      )}
      {pricingMinor && (
        <Row
          label={t("services.detail.metaMinors", "Mineurs")}
          value={pricingMinor}
          highlight="success"
        />
      )}
      <Row
        label={t("services.detail.metaOnline", "100 % en ligne")}
        value={
          isFullyOnline
            ? `✓ ${t("common.yes", "Oui")}`
            : t("common.no", "Non")
        }
        highlight={isFullyOnline ? "success" : undefined}
      />
      {cta.kind === "eligible" && (
        <Link
          href={cta.href}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--pub-gabon-blue)] px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[var(--pub-gabon-blue-deep)]"
        >
          {t("services.detail.startCta", "Démarrer la démarche")}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      )}
      {cta.kind === "unauthenticated" && (
        <Link
          href={cta.href}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--pub-gabon-blue)] px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[var(--pub-gabon-blue-deep)]"
        >
          <LogIn className="size-3.5" aria-hidden="true" />
          {t("services.detail.heroCtaSignIn", "Se connecter pour démarrer")}
        </Link>
      )}
      {(cta.kind === "not_offered" || cta.kind === "no_attached_org") && (
        <div className="mt-4 flex items-start gap-2 rounded-[10px] border border-[var(--pub-border)] bg-[var(--pub-surface-2)] px-3 py-2.5 text-[12px] leading-[1.45] text-[var(--pub-text-muted)]">
          <Info
            className="mt-0.5 size-3.5 shrink-0 text-[var(--pub-warning)]"
            aria-hidden="true"
          />
          <span>
            {cta.kind === "no_attached_org"
              ? t(
                  "services.detail.heroCtaNoOrg",
                  "Vous devez d'abord vous immatriculer auprès d'un organisme consulaire pour démarrer cette démarche.",
                )
              : t(
                  "services.detail.heroCtaNotOffered",
                  "Cette démarche n'est pas proposée par votre organisme de rattachement.",
                )}
          </span>
        </div>
      )}
      {cta.kind === "loading" && (
        <div
          aria-hidden="true"
          className="mt-4 h-[42px] w-full animate-pulse rounded-[10px] bg-[var(--pub-surface-2)]"
        />
      )}
    </div>
  )
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: "success"
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-[var(--pub-border)] py-3 text-[14px] first-of-type:border-t-0 first-of-type:pt-2">
      <span className="text-[var(--pub-text-muted)]">{label}</span>
      <span
        className={cn(
          "text-right font-semibold",
          highlight === "success"
            ? "text-[var(--pub-success)]"
            : "text-[var(--pub-text)]",
        )}
      >
        {value}
      </span>
    </div>
  )
}

// ─── « Où faire ? » ───────────────────────────────────────────────────────

export function WhereCard() {
  const { t } = useTranslation()
  return (
    <SideCard title={t("services.detail.sidebar.whereTitle", "Où faire cette démarche ?")}>
      <p className="mt-2 text-[13px] leading-[1.55] text-[var(--pub-text-muted)]">
        {t(
          "services.detail.sidebar.whereBody",
          "Le service est délivré par votre représentation consulaire de rattachement, déterminée par votre pays de résidence.",
        )}
      </p>
      <Link
        href="/reps"
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--pub-surface-2)] px-4 py-2.5 text-[13px] font-medium text-[var(--pub-text)] hover:bg-[var(--pub-surface-3)]"
      >
        <MapPin className="size-3.5" aria-hidden="true" />
        {t("services.detail.sidebar.whereCta", "Trouver ma représentation")}
      </Link>
    </SideCard>
  )
}

// ─── Formulaires & documents ──────────────────────────────────────────────

export function FormFilesCard({
  files,
}: {
  files: Array<{ filename: string; sizeBytes: number; url: string | null }>
}) {
  const { t } = useTranslation()
  if (!files || files.length === 0) return null
  return (
    <SideCard
      title={t("services.detail.sidebar.formsTitle", "Formulaires & documents")}
    >
      <p className="mt-2 mb-3 text-[13px] leading-[1.55] text-[var(--pub-text-muted)]">
        {t(
          "services.detail.sidebar.formsBody",
          "Téléchargez les modèles officiels et les guides utiles.",
        )}
      </p>
      <ul className="m-0 flex list-none flex-col p-0">
        {files.map((file, i) => (
          <li key={i}>
            <a
              href={file.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              download={file.filename}
              className={cn(
                "group flex items-center gap-2.5 py-2.5 text-[13px] no-underline text-[var(--pub-text)]",
                i > 0 && "border-t border-dashed border-[var(--pub-border)]",
              )}
            >
              <FileText
                className="size-4 text-[var(--pub-gabon-blue)]"
                aria-hidden="true"
              />
              <span className="flex-1 truncate font-medium group-hover:text-[var(--pub-gabon-blue)]">
                {file.filename}
              </span>
              <span className="font-mono text-[11px] text-[var(--pub-text-faint)]">
                {formatFileSize(file.sizeBytes)}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </SideCard>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

// ─── Démarches liées ──────────────────────────────────────────────────────

export function RelatedServicesCard({
  related,
  lang,
}: {
  related: Array<{
    _id: string
    slug: string
    name: { fr?: string; en?: string }
    category: string
    icon?: string
  }>
  lang: string
}) {
  const { t } = useTranslation()
  if (!related || related.length === 0) return null
  return (
    <SideCard title={t("services.detail.sidebar.relatedTitle", "Démarches liées")}>
      <ul className="m-0 mt-2 flex list-none flex-col p-0">
        {related.map((s, i) => {
          const cfg = CATEGORY_CONFIG[s.category] ?? CATEGORY_CONFIG.other
          const Icon = cfg!.icon
          const name = loc(s.name, lang, s.slug)
          return (
            <li key={s._id}>
              <Link
                href={`/services/${s.slug}`}
                className={cn(
                  "group grid grid-cols-[32px_1fr_auto] items-center gap-2.5 py-2.5 text-[13px] no-underline text-[var(--pub-text)]",
                  i > 0 && "border-t border-[var(--pub-border)]",
                )}
              >
                <div className="grid size-7 place-items-center rounded-[7px] bg-[var(--pub-surface-2)] text-[var(--pub-text)]">
                  <Icon className="size-3.5" aria-hidden="true" />
                </div>
                <span className="font-medium group-hover:text-[var(--pub-gabon-blue)]">
                  {name}
                </span>
                <ChevronRight
                  className="size-3 text-[var(--pub-text-faint)]"
                  aria-hidden="true"
                />
              </Link>
            </li>
          )
        })}
      </ul>
    </SideCard>
  )
}

// ─── Aide ─────────────────────────────────────────────────────────────────

export function HelpSidebarCard() {
  const { t } = useTranslation()
  return (
    <SideCard
      title={t("services.detail.sidebar.helpTitle", "Besoin d'aide ?")}
      tone="muted"
    >
      <p className="mt-2 text-[13px] leading-[1.55] text-[var(--pub-text-muted)]">
        {t(
          "services.detail.sidebar.helpBody",
          "Un agent peut vous accompagner par téléphone ou par chat pour constituer votre dossier.",
        )}
      </p>
      <Link
        href="/reps"
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--pub-surface)] px-4 py-2.5 text-[13px] font-medium text-[var(--pub-text)] hover:bg-[var(--pub-surface-2)]"
      >
        <Phone className="size-3.5" aria-hidden="true" />
        {t("services.detail.sidebar.helpCta", "Contacter mon consulat")}
      </Link>
    </SideCard>
  )
}

// ─── Card wrapper ─────────────────────────────────────────────────────────

function SideCard({
  title,
  children,
  tone,
}: {
  title: string
  children: React.ReactNode
  tone?: "muted"
}) {
  return (
    <div
      className={cn(
        "mt-4 rounded-[14px] border p-5",
        tone === "muted"
          ? "border-transparent bg-[var(--pub-surface-2)]"
          : "border-[var(--pub-border)] bg-[var(--pub-surface)]",
      )}
    >
      <h3 className="text-[15px] font-semibold text-[var(--pub-text)]">
        {title}
      </h3>
      {children}
    </div>
  )
}
