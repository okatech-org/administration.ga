"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

export function ServicesPagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
}: {
  page: number
  pageCount: number
  total: number
  pageSize: number
  onPageChange: (p: number) => void
}) {
  const { t } = useTranslation()
  if (pageCount <= 1) return null

  const visible = Math.min(pageSize * page, total)
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1)
  const display = pages.length <= 5 ? pages : compact(page, pageCount)

  return (
    <nav
      className="mt-12 flex items-center justify-center gap-1.5"
      aria-label={t("pagination.label", "Pagination")}
    >
      <button
        type="button"
        aria-label={t("pagination.prev", "Précédent")}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="grid size-[38px] place-items-center rounded-full border border-[var(--pub-border)] bg-[var(--pub-surface)] text-[var(--pub-text)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="size-3.5" aria-hidden="true" />
      </button>
      {display.map((p, i) =>
        p === -1 ? (
          <span
            key={`gap-${i}`}
            aria-hidden="true"
            className="px-1 text-[var(--pub-text-faint)]"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-current={page === p ? "page" : undefined}
            onClick={() => onPageChange(p)}
            className={cn(
              "size-[38px] rounded-full border text-[13px] font-medium",
              page === p
                ? "border-[var(--pub-ink-900)] bg-[var(--pub-ink-900)] text-white"
                : "border-[var(--pub-border)] bg-[var(--pub-surface)] text-[var(--pub-text)] hover:bg-[var(--pub-surface-2)]",
            )}
          >
            {p}
          </button>
        ),
      )}
      <span className="px-4 text-[13px] text-[var(--pub-text-muted)]">
        {t("pagination.summary", {
          visible,
          total,
          defaultValue: "{{visible}} sur {{total}} affichés",
        })}
      </span>
      <button
        type="button"
        aria-label={t("pagination.next", "Suivant")}
        onClick={() => onPageChange(Math.min(pageCount, page + 1))}
        disabled={page === pageCount}
        className="grid size-[38px] place-items-center rounded-full border border-[var(--pub-border)] bg-[var(--pub-surface)] text-[var(--pub-text)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight className="size-3.5" aria-hidden="true" />
      </button>
    </nav>
  )
}

function compact(page: number, total: number): number[] {
  const out: number[] = [1]
  if (page > 3) out.push(-1)
  for (let p = Math.max(2, page - 1); p <= Math.min(total - 1, page + 1); p++) {
    out.push(p)
  }
  if (page < total - 2) out.push(-1)
  out.push(total)
  return out
}
