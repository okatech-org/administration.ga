"use client"

import { api } from "@convex/_generated/api"
import { useConvexQuery } from "@/integrations/convex/hooks"

interface Stat {
  value: number | string
  label: string
}

/**
 * 4 chiffres-clés sous le hero — consomme `resources.stats`
 * Fallback vers des compteurs neutres pendant le chargement
 */
export function HeroStatsRow() {
  const { data } = useConvexQuery(api.functions.resources.stats, {})

  const stats: Stat[] = [
    {
      value: data?.guidesCount ?? "—",
      label: "Guides & fiches pratiques",
    },
    {
      value: data?.videosCount ?? "—",
      label: "Tutoriels vidéo",
    },
    {
      value: data?.faqsCount ?? "—",
      label: "Questions fréquentes",
    },
    {
      value: data?.languagesCount ?? "—",
      label: "Langues disponibles",
    },
  ]

  return (
    <div className="mt-8 grid grid-cols-2 gap-6 border-t border-border pt-6 md:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label}>
          <div className="text-[26px] font-semibold leading-none tracking-[-0.02em] text-primary tabular-nums">
            {s.value}
          </div>
          <div className="mt-2 text-[13px] leading-[1.4] text-muted-foreground">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  )
}
