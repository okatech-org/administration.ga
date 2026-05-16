"use client"

import { api } from "@convex/_generated/api"
import { Search } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { usePreloadedQuery, type Preloaded } from "convex/react"
import { Button } from "@/components/ui/button"
import {
  CATEGORY_CONFIG,
  isFullyOnline,
} from "@/components/services/v2/categories"
import { CatalogHeader, type SortKey, type ViewMode } from "@/components/services/v2/CatalogHeader"
import {
  FeaturedServiceCard,
  type FeaturedService,
} from "@/components/services/v2/FeaturedServiceCard"
import { HelpBand } from "@/components/services/v2/HelpBand"
import { PublicChatLauncher } from "@/components/services/v2/PublicChatLauncher"
import {
  ServiceCardV2,
  ServiceRowV2,
  type ServiceCardData,
} from "@/components/services/v2/ServiceCardV2"
import { ServicesFilterBand, type TransverseFilter } from "@/components/services/v2/ServicesFilterBand"
import { ServicesHero } from "@/components/services/v2/ServicesHero"
import { ServicesPagination } from "@/components/services/v2/ServicesPagination"
import { getLocalizedValue } from "@/lib/i18n-utils"

const PAGE_SIZE = 12

export function ServicesPageClient({
  preloadedServices,
  preloadedStats,
  preloadedFeatured,
}: {
  preloadedServices: Preloaded<typeof api.functions.services.listCatalog>
  preloadedStats: Preloaded<typeof api.functions.services.getCatalogStats>
  preloadedFeatured: Preloaded<typeof api.functions.services.getFeaturedService>
}) {
  const { t, i18n } = useTranslation()
  // useSearchParams() est lu UNE SEULE FOIS au mount pour hydrater l'état
  // initial. Les updates suivants passent par window.history.replaceState
  // pour éviter le re-render du Server Component (qui scroll-to-top).
  const searchParams = useSearchParams()

  const services = usePreloadedQuery(preloadedServices)
  const stats = usePreloadedQuery(preloadedStats)
  const featured = usePreloadedQuery(preloadedFeatured)

  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("query") || "",
  )
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    () => searchParams.get("category") || null,
  )
  const [transverse, setTransverse] = useState<Set<TransverseFilter>>(
    () => new Set(),
  )
  const [sort, setSort] = useState<SortKey>("frequency")
  const [view, setView] = useState<ViewMode>("grid")
  const [page, setPage] = useState(1)
  const [chatOpen, setChatOpen] = useState(false)

  // Sync l'URL en mode "silencieux" (pas de routing Next, pas de scroll).
  // Appelé en effet à chaque changement de query/category — debounced sur
  // la query pour éviter de spammer l'historique pendant la frappe.
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery) params.set("query", searchQuery)
    if (selectedCategory) params.set("category", selectedCategory)
    const qs = params.toString()
    const url = qs ? `/services?${qs}` : "/services"

    // Debounce les writes URL pour la frappe rapide.
    const timer = setTimeout(() => {
      if (typeof window !== "undefined" && window.location.pathname + window.location.search !== url) {
        window.history.replaceState(null, "", url)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [searchQuery, selectedCategory])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [searchQuery, selectedCategory, transverse, sort])

  const toggleTransverse = (f: TransverseFilter) => {
    setTransverse((prev) => {
      const next = new Set(prev)
      if (next.has(f)) next.delete(f)
      else next.add(f)
      return next
    })
  }

  const lang = i18n.language

  const filtered = useMemo(() => {
    if (!services) return []
    const q = searchQuery.toLowerCase()
    return services.filter((s) => {
      const name = getLocalizedValue(s.name, lang).toLowerCase()
      const desc = getLocalizedValue(s.description, lang).toLowerCase()
      if (q && !name.includes(q) && !desc.includes(q)) return false
      if (selectedCategory && s.category !== selectedCategory) return false
      if (transverse.has("online") && !isFullyOnline(s)) return false
      if (transverse.has("express") && s.estimatedDays > 3) return false
      // "free" filter — no global price, so we treat it as a no-op for now.
      // Backlogged: ajouter indicativePricing au schéma services.
      return true
    })
  }, [services, lang, searchQuery, selectedCategory, transverse])

  const sorted = useMemo(() => {
    const copy = [...filtered]
    switch (sort) {
      case "name":
        return copy.sort((a, b) =>
          getLocalizedValue(a.name, lang).localeCompare(
            getLocalizedValue(b.name, lang),
          ),
        )
      case "delay":
        return copy.sort((a, b) => a.estimatedDays - b.estimatedDays)
      case "category":
        return copy.sort((a, b) => a.category.localeCompare(b.category))
      case "frequency":
      default:
        // Pas d'info de fréquence par service côté client; on remonte le
        // service phare en tête, puis un ordre stable par catégorie.
        return copy.sort((a, b) => {
          if (featured?._id === a._id) return -1
          if (featured?._id === b._id) return 1
          return a.category.localeCompare(b.category)
        })
    }
  }, [filtered, sort, lang, featured?._id])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const cards: ServiceCardData[] = pageItems.map((s) => {
    const cfg = CATEGORY_CONFIG[s.category] ?? CATEGORY_CONFIG.other
    return {
      slug: s.slug,
      name: getLocalizedValue(s.name, lang),
      description: getLocalizedValue(s.description, lang),
      categoryLabel: t(cfg!.i18nKey, s.category),
      estimatedDays: s.estimatedDays,
      isFullyOnline: isFullyOnline(s),
      icon: cfg!.icon,
      tint: cfg!.tint,
    }
  })

  const featuredService: FeaturedService | null = featured
    ? {
        _id: featured._id,
        slug: featured.slug,
        name: featured.name,
        description: featured.description,
        category: featured.category,
        estimatedDays: featured.estimatedDays,
        processSteps: featured.processSteps as FeaturedService["processSteps"],
        titleValidity: featured.titleValidity as FeaturedService["titleValidity"],
        requestsLast30d: featured.requestsLast30d,
      }
    : null

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedCategory(null)
    setTransverse(new Set())
  }

  return (
    <>
      <ServicesHero
        total={stats?.total ?? services?.length ?? 0}
        onlineCount={stats?.onlineCount ?? 0}
        avgDays={stats?.avgDays ?? 0}
        timeSavedHoursPerOnlineRequest={
          stats?.timeSavedHoursPerOnlineRequest ?? 4
        }
      />

      <ServicesFilterBand
        search={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        byCategory={stats?.byCategory ?? {}}
        total={stats?.total ?? services?.length ?? 0}
        transverse={transverse}
        onTransverseToggle={toggleTransverse}
      />

      <div className="mx-auto max-w-[1280px] px-5 md:px-8 pb-24">
        {featuredService && (
          <div className="hidden md:block">
            <FeaturedServiceCard service={featuredService} />
          </div>
        )}

        <CatalogHeader
          totalCount={sorted.length}
          visibleCount={pageItems.length}
          sort={sort}
          onSortChange={setSort}
          view={view}
          onViewChange={setView}
        />

        {pageItems.length === 0 ? (
          <div className="rounded-[14px] border-2 border-dashed border-[var(--pub-border)] bg-[var(--pub-surface-2)] py-12 text-center">
            <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full border border-[var(--pub-border)] bg-[var(--pub-surface)]">
              <Search
                className="size-8 text-[var(--pub-text-muted)]"
                aria-hidden="true"
              />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-[var(--pub-text)]">
              {t("services.empty.title", "Aucun service trouvé")}
            </h3>
            <p className="mb-4 text-[var(--pub-text-muted)]">
              {t(
                "services.empty.body",
                "Essayez de modifier vos filtres ou votre recherche.",
              )}
            </p>
            <Button onClick={clearFilters} variant="outline">
              {t("services.empty.cta", "Voir tous les services")}
            </Button>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <ServiceCardV2 key={c.slug} service={c} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {cards.map((c) => (
              <ServiceRowV2 key={c.slug} service={c} />
            ))}
          </div>
        )}

        <ServicesPagination
          page={page}
          pageCount={totalPages}
          total={sorted.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />

        <HelpBand onOpenChat={() => setChatOpen(true)} />
      </div>

      <PublicChatLauncher
        open={chatOpen}
        onClose={() => setChatOpen(false)}
      />
    </>
  )
}
