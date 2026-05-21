"use client"

import Link from "next/link"
import { Clock, type LucideIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { TINT_CLASSES, type CategoryTint } from "./categories"

export type ServiceCardData = {
  slug: string
  name: string
  description: string
  categoryLabel: string
  estimatedDays: number
  isFullyOnline: boolean
  icon: LucideIcon
  tint: CategoryTint
}

export function ServiceCardV2({ service }: { service: ServiceCardData }) {
  const { t } = useTranslation()
  const tint = TINT_CLASSES[service.tint]

  return (
    <Link
      href={`/services/${service.slug}`}
      className={cn(
        "group relative flex flex-col gap-4 overflow-hidden rounded-[14px] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-6 no-underline transition-all duration-150",
        "hover:-translate-y-px hover:border-[var(--pub-gabon-blue)] hover:shadow-[0_1px_0_rgba(20,19,15,.04),0_6px_20px_-10px_rgba(20,19,15,.12)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pub-gabon-blue)]",
      )}
    >
      <span
        aria-hidden="true"
        className="absolute top-0 left-0 h-[3px] w-0 bg-[var(--pub-gabon-blue)] transition-all duration-150 group-hover:w-full"
      />
      {service.isFullyOnline && (
        <span className="absolute top-3.5 right-3.5 inline-flex items-center gap-1.5 rounded-full bg-[var(--pub-gabon-blue-tint)] px-2.5 py-1 text-[11px] font-medium text-[var(--pub-gabon-blue)]">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-[var(--pub-gabon-blue)]"
          />
          {t("services.cardOnlineRibbon", "100 % en ligne")}
        </span>
      )}
      <div
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-[12px]",
          tint.bg,
          tint.fg,
        )}
      >
        <service.icon className="size-5" aria-hidden="true" />
      </div>
      <div>
        <h3 className="text-[20px] font-semibold leading-[1.25] tracking-[-0.015em] text-[var(--pub-text)]">
          {service.name}
        </h3>
        <p className="mt-2 text-[14px] leading-[1.5] text-[var(--pub-text-muted)]">
          {service.description}
        </p>
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-dashed border-[var(--pub-border)] pt-4 text-[13px] text-[var(--pub-text-muted)]">
        <span className="font-medium text-[var(--pub-text)]">
          {service.categoryLabel}
        </span>
        <span className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--pub-gabon-blue)]">
          {t("services.cardCta", "En savoir plus →")}
        </span>
      </div>
    </Link>
  )
}

export function ServiceRowV2({ service }: { service: ServiceCardData }) {
  const { t } = useTranslation()
  const tint = TINT_CLASSES[service.tint]

  return (
    <Link
      href={`/services/${service.slug}`}
      className={cn(
        "group flex items-center gap-5 rounded-[14px] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-5 no-underline transition-colors hover:border-[var(--pub-gabon-blue)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pub-gabon-blue)]",
      )}
    >
      <div
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-[12px]",
          tint.bg,
          tint.fg,
        )}
      >
        <service.icon className="size-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-[var(--pub-text-muted)]">
            {service.categoryLabel}
          </span>
          {service.isFullyOnline && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--pub-gabon-blue-tint)] px-2 py-0.5 text-[10px] font-medium text-[var(--pub-gabon-blue)]">
              <span
                aria-hidden="true"
                className="size-1 rounded-full bg-[var(--pub-gabon-blue)]"
              />
              {t("services.cardOnlineRibbon", "100 % en ligne")}
            </span>
          )}
        </div>
        <h3 className="mt-0.5 truncate text-[16px] font-semibold tracking-[-0.01em] text-[var(--pub-text)]">
          {service.name}
        </h3>
        <p className="mt-0.5 truncate text-[13px] text-[var(--pub-text-muted)]">
          {service.description}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-4 text-[13px] text-[var(--pub-text-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <Clock
            className="size-3.5 text-[var(--pub-text-faint)]"
            aria-hidden="true"
          />
          <b className="font-medium text-[var(--pub-text)]">
            {t("services.daysShort", {
              count: service.estimatedDays,
              defaultValue: "{{count}} j",
            })}
          </b>
        </span>
        <span className="text-[var(--pub-gabon-blue)]">→</span>
      </div>
    </Link>
  )
}
