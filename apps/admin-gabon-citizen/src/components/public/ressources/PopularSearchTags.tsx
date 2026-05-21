"use client"

import { useRouter } from "next/navigation"

interface PopularSearchTagsProps {
  label?: string
  items: string[]
  onSelect?: (term: string) => void
}

export function PopularSearchTags({
  label = "Recherches populaires :",
  items,
  onSelect,
}: PopularSearchTagsProps) {
  const router = useRouter()

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="mr-1 text-[13px] text-muted-foreground">{label}</span>
      {items.map((term) => (
        <button
          key={term}
          type="button"
          onClick={() => {
            if (onSelect) onSelect(term)
            else
              router.replace(`/ressources?q=${encodeURIComponent(term)}`, {
                scroll: false,
              })
          }}
          className="rounded-full border border-border bg-card px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted hover:text-foreground"
        >
          {term}
        </button>
      ))}
    </div>
  )
}
