"use client"

import { useRouter, useSearchParams } from "next/navigation"

export interface CategoryChip {
  value: string | null
  label: string
  count?: number
}

interface CategoryChipsProps {
  items: CategoryChip[]
  total?: number
  /** Param URL utilisé pour le filtre (default: "category") */
  paramName?: string
  /** Si non fourni, utilise router.push pour changer ?paramName= */
  onChange?: (value: string | null) => void
}

export function CategoryChips({
  items,
  total,
  paramName = "category",
  onChange,
}: CategoryChipsProps) {
  const router = useRouter()
  const params = useSearchParams()
  const current = params.get(paramName)

  const select = (val: string | null) => {
    if (onChange) {
      onChange(val)
      return
    }
    const next = new URLSearchParams(params)
    if (val) next.set(paramName, val)
    else next.delete(paramName)
    const qs = next.toString()
    router.replace(qs ? `?${qs}` : "?", { scroll: false })
  }

  const allItem: CategoryChip = {
    value: null,
    label: "Toutes",
    count: total,
  }

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {[allItem, ...items].map((it) => {
        const isActive =
          (current ?? null) === it.value || (!current && it.value === null)
        return (
          <button
            key={it.label}
            type="button"
            onClick={() => select(it.value)}
            aria-pressed={isActive}
            className={
              "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-medium transition-colors " +
              (isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground")
            }
          >
            {it.label}
            {typeof it.count === "number" ? (
              <span
                className={`font-mono text-[11px] ${
                  isActive ? "opacity-70" : "opacity-60"
                }`}
              >
                {it.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
