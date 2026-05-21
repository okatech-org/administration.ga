import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowRight } from "lucide-react"

export interface ProcedureItem {
  id: string
  href: string
  icon: LucideIcon
  title: string
  subMeta: string[]
  badge?: { label: string; tone: "info" | "success" | "warning" }
}

interface ProcedureListProps {
  items: ProcedureItem[]
}

const BADGE_TONES = {
  info: "bg-primary/10 text-primary",
  success: "bg-success-light text-success",
  warning: "bg-warning-light text-warning",
} as const

/**
 * Table-like 2-col list de fiches démarches
 * Hover : icône passe en primary tint, flèche apparaît à droite
 */
export function ProcedureList({ items }: ProcedureListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
        Aucune fiche dans cette catégorie pour l'instant.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid grid-cols-1 md:grid-cols-2">
        {items.map((it, idx) => {
          const Icon = it.icon
          const isOddCol = idx % 2 === 0
          const isFirstRow = idx < 2
          return (
            <Link
              key={it.id}
              href={it.href}
              className={
                "group grid grid-cols-[40px_1fr_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-muted " +
                (isFirstRow ? "" : "border-t border-border ") +
                (isOddCol ? "md:border-r md:border-border" : "")
              }
            >
              <span
                aria-hidden
                className="grid h-10 w-10 place-items-center rounded-[10px] border border-border bg-muted text-foreground transition-colors group-hover:border-transparent group-hover:bg-primary/10 group-hover:text-primary"
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <h4 className="text-[15px] font-semibold leading-tight text-foreground">
                  {it.title}
                </h4>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {it.subMeta.map((m, i) => (
                    <span key={`${it.id}-m-${i}`} className="inline-flex items-center gap-2">
                      {i > 0 ? (
                        <span aria-hidden className="h-[3px] w-[3px] rounded-full bg-foreground/30" />
                      ) : null}
                      <span>{m}</span>
                    </span>
                  ))}
                  {it.badge ? (
                    <span
                      className={`rounded-full px-[7px] py-px text-[10px] font-medium ${BADGE_TONES[it.badge.tone]}`}
                    >
                      {it.badge.label}
                    </span>
                  ) : null}
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[13px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Ouvrir <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
