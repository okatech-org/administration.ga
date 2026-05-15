"use client"

import { DollarSign, LayoutGrid, Search, Target, Zap } from "lucide-react"
import { useTranslation } from "react-i18next"
import { CATEGORY_CONFIG } from "./categories"
import { FilterPill } from "./FilterPill"

export type TransverseFilter = "online" | "express" | "free"

export function ServicesFilterBand({
  search,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  byCategory,
  total,
  transverse,
  onTransverseToggle,
}: {
  search: string
  onSearchChange: (q: string) => void
  selectedCategory: string | null
  onCategoryChange: (cat: string | null) => void
  byCategory: Record<string, number>
  total: number
  transverse: Set<TransverseFilter>
  onTransverseToggle: (f: TransverseFilter) => void
}) {
  const { t } = useTranslation()

  // Order matters — we mirror the maquette display.
  const categoryOrder = [
    "passport",
    "visa",
    "civil_status",
    "registration",
    "certification",
    "assistance",
    "declaration",
  ] as const

  return (
    <div className="sticky top-0 z-20 border-b border-[var(--pub-border)] bg-[var(--pub-bg)]/95 backdrop-blur-sm">
      <div className="mx-auto max-w-[1280px] px-8 py-3">
        <div className="flex items-center gap-2.5 rounded-full border border-[var(--pub-border)] bg-[var(--pub-surface)] py-1.5 pr-1.5 pl-4">
          <Search
            className="size-[16px] shrink-0 text-[var(--pub-text-muted)]"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t(
              "services.filterband.searchPlaceholder",
              "Rechercher un service — passeport, mariage, certification…",
            )}
            className="flex-1 border-0 bg-transparent py-1.5 text-[14px] text-[var(--pub-text)] placeholder:text-[var(--pub-text-faint)] focus:outline-none"
          />
          <button
            type="button"
            className="shrink-0 rounded-full bg-[var(--pub-gabon-blue)] px-4 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--pub-gabon-blue-deep)]"
          >
            {t("services.filterband.searchCta", "Rechercher")}
          </button>
        </div>

        <div className="mt-2.5 flex items-center gap-2 overflow-x-auto [scrollbar-width:thin]">
          <FilterPill
            icon={LayoutGrid}
            label={t("services.allCategories", "Tous")}
            count={total}
            active={selectedCategory === null}
            onClick={() => onCategoryChange(null)}
          />
          {categoryOrder.map((cat) => {
            const config = CATEGORY_CONFIG[cat]
            if (!config) return null
            return (
              <FilterPill
                key={cat}
                icon={config.icon}
                label={t(config.i18nKey, cat)}
                count={byCategory[cat] ?? 0}
                active={selectedCategory === cat}
                onClick={() =>
                  onCategoryChange(selectedCategory === cat ? null : cat)
                }
              />
            )
          })}
          <span
            aria-hidden="true"
            className="mx-1 inline-block h-6 w-px shrink-0 self-center bg-[var(--pub-border)]"
          />
          <FilterPill
            icon={Target}
            label={t("services.filterband.fullyOnline", "100 % en ligne")}
            active={transverse.has("online")}
            onClick={() => onTransverseToggle("online")}
          />
          <FilterPill
            icon={Zap}
            label={t("services.filterband.express", "Express < 3 jours")}
            active={transverse.has("express")}
            onClick={() => onTransverseToggle("express")}
          />
          <FilterPill
            icon={DollarSign}
            label={t("services.filterband.free", "Gratuit")}
            active={transverse.has("free")}
            onClick={() => onTransverseToggle("free")}
          />
        </div>
      </div>
    </div>
  )
}
