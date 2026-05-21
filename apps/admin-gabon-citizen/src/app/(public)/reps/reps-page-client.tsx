"use client"

import { api } from "@convex/_generated/api"
import type { CountryCode } from "@convex/lib/constants"
import { OrganizationType } from "@convex/lib/constants"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowRight,
  Clock,
  Filter,
  Globe,
  LayoutGrid,
  List,
  MapPin,
  Phone,
  Search,
  X,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import dynamic from "next/dynamic"
import { usePreloadedQuery, type Preloaded } from "convex/react"
import { FlagIcon } from "@/components/ui/flag-icon"
import { cn } from "@/lib/utils"

const ConsularGlobeHero = dynamic(
  () =>
    import("@/components/ConsularGlobeHero").then((m) => ({
      default: m.ConsularGlobeHero,
    })),
  { ssr: false },
)

type ViewMode = "grid" | "list"
type TypeFilter = "all" | "embassy" | "consulate"
type RegionFilter = "all" | string

const TYPE_FILTERS: { id: TypeFilter; label: string; matches: (t: string) => boolean }[] = [
  { id: "all", label: "Tous types", matches: () => true },
  {
    id: "embassy",
    label: "Ambassades",
    matches: (type) =>
      type === OrganizationType.Embassy ||
      type === OrganizationType.HighRepresentation ||
      type === OrganizationType.HighCommission ||
      type === OrganizationType.PermanentMission,
  },
  {
    id: "consulate",
    label: "Consulats",
    matches: (type) =>
      type === OrganizationType.GeneralConsulate ||
      type === "consulate" ||
      type === "honorary_consulate",
  },
]

type Rep = {
  _id: string
  name: string
  slug: string
  type: string
  address: {
    street: string
    city: string
    postalCode: string
    country: string
  }
  phone?: string | null
  email?: string | null
}

type Region = {
  id: string
  nameKey: string
  desc: string
  countries: string[]
}

const REGIONS: Region[] = [
  {
    id: "africa",
    nameKey: "orgs.continents.africa",
    desc: "Membre de l'Union Africaine, de la CEEAC et de la CEMAC. Réseau historique.",
    countries: [
      "ZA",
      "DZ",
      "AO",
      "BJ",
      "CM",
      "CG",
      "CI",
      "EG",
      "ET",
      "GQ",
      "GN",
      "LY",
      "MA",
      "NG",
      "CD",
      "SN",
      "TG",
      "TN",
      "RW",
      "ST",
    ],
  },
  {
    id: "europe",
    nameKey: "orgs.continents.europe",
    desc: "Première diaspora gabonaise. Coopération économique et culturelle dense.",
    countries: [
      "DE",
      "BE",
      "ES",
      "FR",
      "IT",
      "PT",
      "GB",
      "RU",
      "CH",
      "VA",
      "MC",
    ],
  },
  {
    id: "americas",
    nameKey: "orgs.continents.americas",
    desc: "Diplomatie économique et coopération multilatérale (ONU, OEA).",
    countries: ["US", "CA", "BR", "MX", "AR", "CU"],
  },
  {
    id: "asia",
    nameKey: "orgs.continents.asia",
    desc: "Partenaires économiques majeurs ; présence Asie-Pacifique en développement.",
    countries: ["CN", "IN", "JP", "KR", "TR", "IR"],
  },
  {
    id: "middle_east",
    nameKey: "orgs.continents.middle_east",
    desc: "Coopération avec les États du Golfe et du Levant.",
    countries: ["SA", "AE", "QA", "KW", "LB"],
  },
]

const INITIAL_REGION_LIMIT = 6

export function RepsPageClient({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.functions.orgs.list>
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()

  const queryParam = searchParams.get("query") || ""
  const viewQS = searchParams.get("view")
  const viewParam: ViewMode = viewQS === "list" ? "list" : "grid"
  const typeParam = (searchParams.get("type") as TypeFilter) || "all"
  const regionParam = searchParams.get("region") || "all"

  const orgs = usePreloadedQuery(preloaded) as Rep[] | undefined

  const [searchQuery, setSearchQuery] = useState(queryParam)
  const [viewMode, setViewMode] = useState<ViewMode>(viewParam)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(typeParam)
  const [regionFilter, setRegionFilter] = useState<RegionFilter>(regionParam)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set())

  const updateFilters = (updates: {
    query?: string
    view?: ViewMode
    type?: TypeFilter
    region?: RegionFilter
  }) => {
    const params = new URLSearchParams(searchParams.toString())
    if (updates.query !== undefined) {
      if (updates.query) params.set("query", updates.query)
      else params.delete("query")
    }
    if (updates.view !== undefined) params.set("view", updates.view)
    if (updates.type !== undefined) {
      if (updates.type === "all") params.delete("type")
      else params.set("type", updates.type)
    }
    if (updates.region !== undefined) {
      if (updates.region === "all") params.delete("region")
      else params.set("region", updates.region)
    }
    router.replace(`/reps?${params.toString()}`, { scroll: false })
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== queryParam) {
        updateFilters({ query: searchQuery || undefined })
      }
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, queryParam])

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode)
    updateFilters({ view: mode })
  }

  const handleTypeChange = (id: TypeFilter) => {
    setTypeFilter(id)
    updateFilters({ type: id })
  }

  const handleRegionChange = (id: RegionFilter) => {
    setRegionFilter(id)
    updateFilters({ region: id })
  }

  const resetFilters = () => {
    setTypeFilter("all")
    setRegionFilter("all")
    setSearchQuery("")
    updateFilters({ type: "all", region: "all", query: undefined })
  }

  const matchesQuery = (rep: Rep) => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    const country = t(
      `superadmin.countryCodes.${rep.address.country}`,
      rep.address.country,
    ).toLowerCase()
    return (
      rep.name.toLowerCase().includes(q) ||
      (rep.address.city || "").toLowerCase().includes(q) ||
      country.includes(q)
    )
  }

  const matchesType = (rep: Rep) => {
    const f = TYPE_FILTERS.find((t) => t.id === typeFilter)
    return f ? f.matches(rep.type) : true
  }

  const matchesRegion = (rep: Rep) => {
    if (regionFilter === "all") return true
    const region = REGIONS.find((r) => r.countries.includes(rep.address.country))
    return (region?.id ?? "other") === regionFilter
  }

  const repsByRegion = useMemo(() => {
    const map = new Map<string, Rep[]>()
    REGIONS.forEach((r) => map.set(r.id, []))
    map.set("other", [])
    if (!orgs) return map
    orgs.forEach((rep) => {
      if (!matchesQuery(rep)) return
      if (!matchesType(rep)) return
      if (!matchesRegion(rep)) return
      const region = REGIONS.find((r) =>
        r.countries.includes(rep.address.country),
      )
      const bucket = map.get(region?.id ?? "other")
      bucket?.push(rep)
    })
    map.forEach((arr) =>
      arr.sort((a, b) =>
        (a.address.city || a.name).localeCompare(b.address.city || b.name),
      ),
    )
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgs, searchQuery, typeFilter, regionFilter])

  const activeFilterCount =
    (typeFilter !== "all" ? 1 : 0) + (regionFilter !== "all" ? 1 : 0)

  const totalCount = orgs?.length ?? 0

  const toggleRegion = (id: string) =>
    setExpandedRegions((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--foreground)] font-sans">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8">
        {/* HERO */}
        <section className="relative py-10 md:py-16 overflow-hidden">
          <div className="grid md:grid-cols-[1.05fr_1fr] gap-10 lg:gap-16 items-center">
            <div>
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--gabon-blue-tint,_#e7eff9)] text-[var(--gabon-blue-hex)] text-[13px] font-medium">
                <Globe className="w-3.5 h-3.5" strokeWidth={2} />
                {t("orgs.kicker", "Nos représentations")}
              </span>
              <h1
                className="mt-5 font-semibold tracking-[-0.025em] leading-[1]"
                style={{ fontSize: "clamp(44px, 5.6vw, 72px)" }}
              >
                {t("orgs.heroTitlePart1", "Le Gabon, ")}
                <span className="text-[var(--gabon-blue-hex)]">
                  {t("orgs.heroTitleAccent", "partout")}
                </span>
                {t("orgs.heroTitlePart2", " dans le monde.")}
              </h1>
              <p className="mt-6 text-[17px] leading-[1.55] text-[color:var(--muted-foreground)] max-w-[520px]">
                {totalCount > 0
                  ? t("orgs.heroLede", {
                      defaultValue:
                        "{{count}} ambassades et consulats au service des Gabonais établis hors du territoire national, et de leurs partenaires internationaux.",
                      count: totalCount,
                    })
                  : t(
                      "orgs.heroLedeFallback",
                      "Ambassades et consulats au service des Gabonais établis hors du territoire national, et de leurs partenaires internationaux.",
                    )}
              </p>

              {/* Search */}
              <div className="mt-8 max-w-[560px]">
                <div className="flex items-center gap-3 bg-[var(--surface,_#fff)] border border-[color:var(--border-strong,_#d2cdbf)] rounded-full pl-5 pr-1.5 py-1.5 focus-within:border-[var(--gabon-blue-hex)] focus-within:shadow-[0_0_0_4px_rgba(11,79,156,0.12)] transition">
                  <Search
                    className="w-[18px] h-[18px] text-[color:var(--muted-foreground)] shrink-0"
                    strokeWidth={2}
                  />
                  <input
                    type="text"
                    placeholder={t(
                      "orgs.searchPlaceholderRich",
                      "Rechercher une ville, un pays, une ambassade…",
                    )}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 min-w-0 bg-transparent border-0 outline-0 py-3 text-[16px] text-[color:var(--foreground)] placeholder:text-[color:var(--text-faint,_#9a9588)]"
                  />
                  <button
                    type="button"
                    className="bg-[var(--gabon-blue-hex)] hover:bg-[var(--gabon-blue-deep,_#005a94)] text-white rounded-full px-4 py-2.5 text-[14px] font-medium transition"
                  >
                    {t("orgs.searchCta", "Rechercher")}
                  </button>
                </div>

              </div>
            </div>

            {/* Interactive globe map — hidden on mobile */}
            <div className="hidden md:block">
              <ConsularGlobeHero />
            </div>
          </div>
        </section>

        {/* VIEW SWITCH */}
        <section>
          <div className="flex items-end justify-between gap-6 flex-wrap mt-12 mb-6">
            <div>
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--surface,_#fff)] border border-[color:var(--border)] text-[color:var(--foreground)] text-[13px] font-medium">
                {t("orgs.directoryKicker", "Annuaire")}
              </span>
              <h2 className="mt-3.5 text-[clamp(28px,3vw,40px)] font-semibold tracking-[-0.025em] leading-[1.1]">
                {t("orgs.byRegion", "Représentations par région")}
              </h2>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div
                role="tablist"
                className="inline-flex bg-[var(--surface,_#fff)] border border-[color:var(--border)] rounded-full p-1 gap-0.5"
              >
                <ViewTab
                  active={viewMode === "grid"}
                  onClick={() => handleViewChange("grid")}
                  icon={<LayoutGrid className="w-4 h-4" />}
                  label={t("orgs.gridView", "Grille")}
                />
                <ViewTab
                  active={viewMode === "list"}
                  onClick={() => handleViewChange("list")}
                  icon={<List className="w-4 h-4" />}
                  label={t("orgs.listView", "Liste")}
                />
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                aria-expanded={filtersOpen}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-medium transition border",
                  filtersOpen || activeFilterCount > 0
                    ? "bg-[var(--gabon-blue-tint,_#e7eff9)] border-transparent text-[var(--gabon-blue-hex)]"
                    : "bg-[var(--surface,_#fff)] border-[color:var(--border)] hover:border-[color:var(--border-strong)] text-[color:var(--foreground)]",
                )}
              >
                <Filter className="w-4 h-4" strokeWidth={2} />
                {t("orgs.filters", "Filtres")}
                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--gabon-blue-hex)] text-white text-[11px] font-semibold leading-none">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {filtersOpen && (
            <FiltersPanel
              typeFilter={typeFilter}
              regionFilter={regionFilter}
              onTypeChange={handleTypeChange}
              onRegionChange={handleRegionChange}
              onReset={resetFilters}
              onClose={() => setFiltersOpen(false)}
              counts={{
                total: orgs?.length ?? 0,
                visible: Array.from(repsByRegion.values()).reduce(
                  (a, b) => a + b.length,
                  0,
                ),
              }}
            />
          )}

          {REGIONS.map((region) => {
              const reps = repsByRegion.get(region.id) ?? []
              if (reps.length === 0) return null
              const expanded = expandedRegions.has(region.id)
              const visible = expanded ? reps : reps.slice(0, INITIAL_REGION_LIMIT)
              const remaining = reps.length - visible.length

              return (
                <RegionBlock
                  key={region.id}
                  title={t(region.nameKey)}
                  description={region.desc}
                  count={reps.length}
                  remaining={remaining}
                  onToggle={() => toggleRegion(region.id)}
                  expanded={expanded}
                >
                  {viewMode === "grid" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {visible.map((rep) => (
                        <RepCard key={rep._id} rep={rep} />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-[var(--surface,_#fff)] border border-[color:var(--border)] rounded-2xl overflow-hidden divide-y divide-[color:var(--border)]">
                      {visible.map((rep) => (
                        <RepListRow key={rep._id} rep={rep} />
                      ))}
                    </div>
                  )}
                </RegionBlock>
              )
            })}

          {REGIONS.every(
            (r) => (repsByRegion.get(r.id) ?? []).length === 0,
          ) && <EmptyState onReset={() => setSearchQuery("")} />}
        </section>

        {/* CTA */}
        <CtaBlock />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function FiltersPanel({
  typeFilter,
  regionFilter,
  onTypeChange,
  onRegionChange,
  onReset,
  onClose,
  counts,
}: {
  typeFilter: TypeFilter
  regionFilter: RegionFilter
  onTypeChange: (id: TypeFilter) => void
  onRegionChange: (id: RegionFilter) => void
  onReset: () => void
  onClose: () => void
  counts: { total: number; visible: number }
}) {
  const { t } = useTranslation()
  return (
    <div className="mb-6 bg-[var(--surface,_#fff)] border border-[color:var(--border)] rounded-2xl p-5 md:p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="text-[15px] font-semibold text-[color:var(--foreground)]">
            {t("orgs.filters", "Filtres")}
          </div>
          <div className="text-[12px] text-[color:var(--muted-foreground)] mt-0.5">
            {counts.visible} / {counts.total}{" "}
            {t("orgs.representations", "représentations")}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="text-[13px] font-medium text-[var(--gabon-blue-hex)] hover:underline"
          >
            {t("orgs.resetFilters", "Réinitialiser")}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close", "Fermer")}
            className="w-7 h-7 inline-flex items-center justify-center rounded-full text-[color:var(--muted-foreground)] hover:bg-[color:var(--surface-2,_#fbfaf6)]"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.08em] font-semibold text-[color:var(--text-faint,_#9a9588)] mb-2.5">
            {t("orgs.filterByType", "Type")}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TYPE_FILTERS.map((f) => (
              <FilterChip
                key={f.id}
                active={typeFilter === f.id}
                onClick={() => onTypeChange(f.id)}
                label={f.label}
              />
            ))}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.08em] font-semibold text-[color:var(--text-faint,_#9a9588)] mb-2.5">
            {t("orgs.filterByRegion", "Région")}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip
              active={regionFilter === "all"}
              onClick={() => onRegionChange("all")}
              label={t("orgs.allContinents", "Tous")}
            />
            {REGIONS.map((r) => (
              <FilterChip
                key={r.id}
                active={regionFilter === r.id}
                onClick={() => onRegionChange(r.id)}
                label={t(r.nameKey)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-medium transition border",
        active
          ? "bg-[var(--ink-900,_#0a0907)] text-white border-transparent"
          : "bg-[var(--surface,_#fff)] border-[color:var(--border)] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:border-[color:var(--border-strong)]",
      )}
    >
      {label}
    </button>
  )
}

function ViewTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition",
        active
          ? "bg-[var(--ink-900,_#0a0907)] text-white"
          : "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]",
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function RegionBlock({
  title,
  description,
  count,
  remaining,
  expanded,
  onToggle,
  children,
}: {
  title: string
  description: string
  count: number
  remaining: number
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className="mb-14">
      <div className="flex items-end justify-between gap-6 border-b border-[color:var(--border)] pb-4 mb-6">
        <h3 className="text-[28px] font-semibold tracking-[-0.02em] flex items-baseline gap-3.5">
          {title}
          <span className="font-mono text-[13px] font-normal text-[color:var(--text-faint,_#9a9588)]">
            {count}{" "}
            {t("orgs.representations", "représentations")}
          </span>
        </h3>
        <p className="hidden md:block text-[13px] text-[color:var(--muted-foreground)] max-w-[320px] text-right">
          {description}
        </p>
      </div>
      {children}
      {remaining > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--gabon-blue-hex)] hover:underline"
          >
            {expanded
              ? t("orgs.showLess", "Réduire")
              : t("orgs.showMoreRegion", {
                  defaultValue: "Voir les {{count}} autres représentations",
                  count: remaining,
                })}
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  )
}

function RepTypePill({ type }: { type: string }) {
  const { t } = useTranslation()
  const label = t(`superadmin.types.${type}`, type)
  const isEmbassy =
    type === OrganizationType.Embassy ||
    type === OrganizationType.HighRepresentation ||
    type === OrganizationType.HighCommission ||
    type === OrganizationType.PermanentMission

  const className = isEmbassy
    ? "bg-[var(--gabon-blue-tint,_#e7eff9)] text-[var(--gabon-blue-hex)]"
    : "bg-[var(--status-success-tint,_#e3f1e8)] text-[var(--status-success,_#157a3d)]"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium",
        className,
      )}
    >
      {label}
    </span>
  )
}

function RepCard({ rep }: { rep: Rep }) {
  const { t } = useTranslation()
  const country = t(
    `superadmin.countryCodes.${rep.address.country}`,
    rep.address.country,
  )
  const city = rep.address.city || rep.name

  return (
    <Link
      href={`/reps/${rep.slug}`}
      className="group relative flex flex-col gap-3 bg-[var(--surface,_#fff)] border border-[color:var(--border)] rounded-2xl p-5 transition hover:border-[var(--gabon-blue-hex)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_-10px_rgba(20,19,15,0.12)]"
    >
      <div className="flex justify-between items-start gap-3">
        <span className="w-9 h-[26px] rounded-[4px] overflow-hidden ring-1 ring-black/5 shadow-sm shrink-0 bg-[color:var(--surface-2,_#fbfaf6)]">
          <FlagIcon
            countryCode={rep.address.country as CountryCode}
            size={36}
            className="w-full !h-full object-cover rounded-none"
          />
        </span>
        <RepTypePill type={rep.type} />
      </div>
      <div>
        <h4 className="text-[19px] font-semibold tracking-[-0.015em] leading-tight">
          {city}
        </h4>
        <div className="text-[13px] text-[color:var(--muted-foreground)] mt-1">
          {country}
        </div>
      </div>
      <div className="flex flex-col gap-1.5 text-[13px] text-[color:var(--muted-foreground)]">
        {rep.address.street && (
          <div className="flex items-start gap-2">
            <MapPin
              className="w-3.5 h-3.5 mt-0.5 text-[color:var(--text-faint,_#9a9588)] shrink-0"
              strokeWidth={2}
            />
            <span className="truncate">{rep.address.street}</span>
          </div>
        )}
        {rep.phone && (
          <div className="flex items-start gap-2">
            <Phone
              className="w-3.5 h-3.5 mt-0.5 text-[color:var(--text-faint,_#9a9588)] shrink-0"
              strokeWidth={2}
            />
            <span>{rep.phone}</span>
          </div>
        )}
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-dashed border-[color:var(--border)] pt-3.5 text-[13px] font-medium text-[var(--gabon-blue-hex)]">
        <span className="inline-flex items-center gap-1.5 text-[12px] text-[color:var(--muted-foreground)]">
          <Clock
            className="w-3.5 h-3.5 text-[color:var(--text-faint,_#9a9588)]"
            strokeWidth={2}
          />
          {t("orgs.detailsAvailable", "Voir horaires & services")}
        </span>
        <span className="inline-flex items-center gap-1">
          {t("orgs.view", "Voir")}
          <ArrowRight
            className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5"
            strokeWidth={2}
          />
        </span>
      </div>
    </Link>
  )
}

function RepListRow({ rep }: { rep: Rep }) {
  const { t } = useTranslation()
  const country = t(
    `superadmin.countryCodes.${rep.address.country}`,
    rep.address.country,
  )
  return (
    <Link
      href={`/reps/${rep.slug}`}
      className="group flex items-center gap-4 px-5 py-4 hover:bg-[color:var(--surface-2,_#fbfaf6)] transition"
    >
      <span className="w-9 h-[26px] rounded-[4px] overflow-hidden ring-1 ring-black/5 shadow-sm shrink-0 bg-[color:var(--surface-2,_#fbfaf6)]">
        <FlagIcon
          countryCode={rep.address.country as CountryCode}
          size={36}
          className="w-full !h-full object-cover rounded-none"
        />
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[15px] truncate">
          {rep.address.city || rep.name}
        </div>
        <div className="text-[13px] text-[color:var(--muted-foreground)] truncate">
          {country}
          {rep.address.street ? ` · ${rep.address.street}` : ""}
        </div>
      </div>
      <div className="hidden md:flex shrink-0">
        <RepTypePill type={rep.type} />
      </div>
      <div className="hidden lg:flex items-center gap-1.5 shrink-0 text-[13px] text-[color:var(--muted-foreground)]">
        {rep.phone && (
          <>
            <Phone
              className="w-3.5 h-3.5 text-[color:var(--text-faint,_#9a9588)]"
              strokeWidth={2}
            />
            {rep.phone}
          </>
        )}
      </div>
      <ArrowRight
        className="w-4 h-4 text-[color:var(--muted-foreground)] group-hover:translate-x-0.5 transition shrink-0"
        strokeWidth={2}
      />
    </Link>
  )
}


function EmptyState({ onReset }: { onReset: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 bg-[color:var(--surface-2,_#fbfaf6)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[color:var(--border)]">
        <Search className="w-7 h-7 text-[color:var(--muted-foreground)]" />
      </div>
      <h3 className="text-lg font-semibold mb-2">
        {t("orgs.noResults", "Aucun résultat trouvé")}
      </h3>
      <p className="text-[color:var(--muted-foreground)] mb-4">
        {t("orgs.noResultsDesc", "Essayez de modifier votre recherche.")}
      </p>
      <button
        onClick={onReset}
        className="inline-flex items-center gap-2 bg-[var(--surface,_#fff)] border border-[color:var(--border)] hover:border-[color:var(--border-strong)] rounded-full px-4 py-2 text-[14px] font-medium text-[color:var(--foreground)] transition"
      >
        {t("orgs.viewAll", "Voir toutes les représentations")}
      </button>
    </div>
  )
}

function CtaBlock() {
  const { t } = useTranslation()
  return (
    <section
      className="relative my-14 overflow-hidden rounded-[28px] p-8 md:p-12 text-white"
      style={{
        background:
          "linear-gradient(135deg, var(--gabon-blue-hex) 0%, var(--gabon-blue-deep,_#005a94) 100%)",
      }}
    >
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          top: "-40%",
          right: "-30%",
          width: 460,
          height: 460,
          background:
            "radial-gradient(circle, rgba(255,255,255,.12), transparent 70%)",
        }}
      />
      <div className="relative z-10">
        <h2 className="text-[28px] md:text-[36px] font-semibold leading-[1.05]">
          {t("orgs.ctaTitle", "Vous ne trouvez pas votre ville ?")}
        </h2>
        <p className="mt-3 text-[16px] leading-[1.55] text-white/80">
          {t(
            "orgs.ctaLede",
            "Les services consulaires sont également accessibles à distance depuis votre espace personnel. Inscrivez-vous au registre consulaire en moins de 10 minutes.",
          )}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-[var(--gabon-blue-hex)] rounded-full px-5 py-3.5 text-[16px] font-medium hover:bg-white/95 transition"
          >
            {t("orgs.ctaStart", "Commencer l'inscription")}
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </Link>
          <Link
            href="/services"
            className="inline-flex items-center gap-2 bg-white/14 hover:bg-white/22 text-white rounded-full px-5 py-3.5 text-[16px] font-medium transition"
            style={{ backgroundColor: "rgba(255,255,255,0.14)" }}
          >
            {t("orgs.ctaServices", "Voir tous les services")}
          </Link>
        </div>
      </div>
    </section>
  )
}
