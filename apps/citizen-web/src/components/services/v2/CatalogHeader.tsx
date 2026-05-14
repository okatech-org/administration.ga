"use client"

import { ChevronDown, LayoutGrid, List, SlidersHorizontal } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type SortKey = "frequency" | "name" | "delay" | "category"
export type ViewMode = "grid" | "list"

export function CatalogHeader({
  totalCount,
  visibleCount,
  sort,
  onSortChange,
  view,
  onViewChange,
}: {
  totalCount: number
  visibleCount: number
  sort: SortKey
  onSortChange: (s: SortKey) => void
  view: ViewMode
  onViewChange: (v: ViewMode) => void
}) {
  const { t } = useTranslation()

  const sortLabels: Record<SortKey, string> = {
    frequency: t("services.catalog.sortFrequency", "fréquence"),
    name: t("services.catalog.sortName", "nom"),
    delay: t("services.catalog.sortDelay", "délai"),
    category: t("services.catalog.sortCategory", "catégorie"),
  }

  return (
    <div className="mt-14 mb-6 flex flex-wrap items-end justify-between gap-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--pub-text)]">
          {t("services.catalog.title", "Catalogue")}{" "}
          <em className="not-italic text-[var(--pub-gabon-blue)]">
            {t("services.catalog.titleEm", "complet.")}
          </em>
        </h2>
        <span className="text-[14px] text-[var(--pub-text-muted)]">
          {t("services.catalog.subtitle", {
            visible: visibleCount,
            total: totalCount,
            sort: sortLabels[sort],
            defaultValue:
              "{{visible}} sur {{total}} services · triés par {{sort}}",
          })}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--pub-border)] bg-[var(--pub-surface)] px-3.5 py-2 text-[13px] font-medium text-[var(--pub-text-muted)] hover:text-[var(--pub-text)]"
            >
              <SlidersHorizontal className="size-3.5" aria-hidden="true" />
              {t("services.catalog.sortLabel", "Trier")} : {sortLabels[sort]}
              <ChevronDown className="size-3.5" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(Object.keys(sortLabels) as SortKey[]).map((key) => (
              <DropdownMenuItem
                key={key}
                onClick={() => onSortChange(key)}
                className={sort === key ? "font-semibold" : ""}
              >
                {sortLabels[key]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="inline-flex rounded-full border border-[var(--pub-border)] bg-[var(--pub-surface)] p-1">
          <button
            type="button"
            aria-label={t("services.catalog.viewGrid", "Affichage grille")}
            aria-pressed={view === "grid"}
            onClick={() => onViewChange("grid")}
            className={cn(
              "grid size-8 place-items-center rounded-full",
              view === "grid"
                ? "bg-[var(--pub-ink-900)] text-white"
                : "text-[var(--pub-text-muted)]",
            )}
          >
            <LayoutGrid className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={t("services.catalog.viewList", "Affichage liste")}
            aria-pressed={view === "list"}
            onClick={() => onViewChange("list")}
            className={cn(
              "grid size-8 place-items-center rounded-full",
              view === "list"
                ? "bg-[var(--pub-ink-900)] text-white"
                : "text-[var(--pub-text-muted)]",
            )}
          >
            <List className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
