"use client"

import { Plus } from "lucide-react"

export interface PublicFAQItem {
  id: string
  question: string
  answer: string
}

interface PublicFAQProps {
  items: PublicFAQItem[]
}

/**
 * Liste accordion FAQ pleine largeur
 * Utilise <details>/<summary> natif (a11y, focusable clavier)
 */
export function PublicFAQ({ items }: PublicFAQProps) {
  return (
    <ul className="list-none overflow-hidden rounded-xl border border-border bg-card p-0">
      {items.map((item, idx) => (
        <li key={item.id} className={idx === 0 ? "" : "border-t border-border"}>
          <details className="group" open={idx === 0}>
            <summary
              id={item.id}
              className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
            >
              <span className="flex-1 text-[15px] font-semibold leading-snug tracking-tight text-foreground">
                {item.question}
              </span>
              <span
                aria-hidden
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-foreground/15 text-muted-foreground transition-all group-open:rotate-45 group-open:border-primary group-open:bg-primary group-open:text-primary-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
              </span>
            </summary>
            <div className="max-w-[70ch] px-6 pb-5 text-sm leading-relaxed text-muted-foreground">
              {item.answer}
            </div>
          </details>
        </li>
      ))}
    </ul>
  )
}
