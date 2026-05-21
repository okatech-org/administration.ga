import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowRight } from "lucide-react"

export type GuideCardIconTint = "primary" | "success" | "warning" | "amber"

interface GuideCardProps {
  href: string
  icon: LucideIcon
  iconTint?: GuideCardIconTint
  /** Pill mono en haut à droite : "12 étapes", "Fiche", "Essentiel" */
  stepLabel?: string
  title: string
  description: string
  /** Meta texte gauche : "Lecture 8 min · mis à jour le 5 mai" */
  meta: string
}

const TINTS: Record<GuideCardIconTint, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success-light text-success",
  warning: "bg-warning-light text-warning",
  amber: "bg-gabon-yellow/15 text-amber-700 dark:text-amber-400",
}

/**
 * Card de "Guide personnalisé" — barre primary en haut au hover,
 * icône teintée, step-pill mono, meta dashed en bas.
 */
export function GuideCard({
  href,
  icon: Icon,
  iconTint = "primary",
  stepLabel,
  title,
  description,
  meta,
}: GuideCardProps) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-xl border border-border bg-card p-6 transition-all hover:-translate-y-px hover:border-primary hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span
        aria-hidden
        className="absolute left-0 top-0 h-[3px] w-0 bg-primary transition-all duration-200 group-hover:w-full"
      />
      <div className="flex items-center justify-between gap-3">
        <div
          aria-hidden
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-[10px] ${TINTS[iconTint]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        {stepLabel ? (
          <span className="rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {stepLabel}
          </span>
        ) : null}
      </div>
      <h3 className="mt-1 text-[18px] font-semibold leading-[1.3] tracking-tight text-foreground">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <div className="mt-auto flex items-center justify-between border-t border-dashed border-border pt-3.5 text-xs text-muted-foreground">
        <span>{meta}</span>
        <span className="inline-flex items-center gap-1 font-medium text-primary">
          Ouvrir <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  )
}
