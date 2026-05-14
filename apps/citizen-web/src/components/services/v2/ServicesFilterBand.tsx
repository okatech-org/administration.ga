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
    <div
      className="sticky z-20 border-b border-[var(--pub-border)] bg-[var(--pub-bg)]/95 backdrop-blur-sm"
      style={{ top: "64px" }}
    >
      <div className="mx-auto max-w-[1280px] px-8 pt-7 pb-5">
        <div className="flex items-center gap-3 border-b border-[var(--pub-border)] pb-2">
          <Search
            className="size-[18px] text-[var(--pub-text-muted)]"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t(
              "services.filterband.searchPlaceholder",
              "Rechercher un service par nom — passeport, mariage, fiscalité, certification…",
            )}
            className="flex-1 border-0 bg-transparent py-3 text-[15px] text-[var(--pub-text)] placeholder:text-[var(--pub-text-faint)] focus:outline-none"
          />
        </div>

        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
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
