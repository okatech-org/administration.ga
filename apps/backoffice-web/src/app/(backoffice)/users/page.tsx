"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { DataTable } from "@/components/ui/data-table"
import { columns, corpsAdminColumns } from "@/components/admin/users-columns"
import dynamic from "next/dynamic"
import { ProfilesView } from "@/components/admin/profiles-view"
import { DiplomaticProfilesView } from "@/components/admin/diplomatic-profiles-view"

// Mapbox-GL touches `window` / WebGL at module load and breaks Next's SSR
// analysis even from a "use client" file — load the map view client-only.
const UsersMapView = dynamic(
  () =>
    import("@/components/admin/users-map-view").then((m) => ({
      default: m.UsersMapView,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Chargement de la carte…
      </div>
    ),
  }
)
import {
  Crown,
  Map as MapIcon,
  Shield,
  Users as UsersIcon,
  X,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { PaginationState } from "@tanstack/react-table"
import { cn } from "@/lib/utils"
import {
  getCountryFlag,
  getCountryName,
  getContinent,
  CONTINENT_META,
  type Continent,
} from "@/lib/country-utils"
import { PageHeader } from "@/components/design-system/page-header"
import { TabSwitcher } from "@/components/design-system/tab-switcher"
import { FlatCard } from "@/components/design-system/flat-card"
import {
  Combobox,
  type ComboboxOption,
} from "@workspace/ui/components/combobox"
import { Button } from "@workspace/ui/components/button"
import { useDebounce } from "@/hooks/use-debounce"

type ViewMode = "accounts" | "profiles" | "diplomatic" | "map"

type UserTab = "all" | "backoffice" | "corps" | "agents" | "users" | "inactive"

const POPULATION_LABELS: Record<UserTab, string> = {
  all: "Tous",
  backoffice: "Back-Office",
  corps: "Corps Administratif",
  agents: "Agents Spéciaux",
  users: "Utilisateurs",
  inactive: "Inactifs",
}

const POPULATION_ORDER: UserTab[] = [
  "all",
  "backoffice",
  "corps",
  "agents",
  "users",
  "inactive",
]

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin_system: "Admin Système",
  admin: "Admin",
  sous_admin: "Sous-Admin",
  intel_agent: "Agent Intel",
  education_agent: "Agent Éducation",
  user: "Utilisateur",
}

const ALL_ROLES = [
  "super_admin",
  "admin_system",
  "admin",
  "sous_admin",
  "intel_agent",
  "education_agent",
  "user",
] as const

const VIEW_MODES: { id: ViewMode; label: string; icon: React.ElementType }[] = [
  { id: "accounts", label: "Comptes", icon: UsersIcon },
  { id: "profiles", label: "Profils Consulaires", icon: Crown },
  { id: "diplomatic", label: "Corps Diplomatique", icon: Shield },
  { id: "map", label: "Carte des utilisateurs", icon: MapIcon },
]

const DEFAULT_PAGE_SIZE = 10

// URL search-param keys. Kept short so the address bar stays readable.
const PARAM = {
  view: "view",
  pop: "pop",
  role: "role",
  continent: "continent",
  country: "country",
  status: "status",
  q: "q",
  page: "page", // 1-indexed in URL, 0-indexed in TanStack
  pageSize: "pageSize",
} as const

export default function UsersPage() {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const router = useRouter()
  const view = (searchParams.get(PARAM.view) as ViewMode) || "accounts"

  // ── URL is the source of truth for every Comptes filter + pagination ──
  const activeTab = (searchParams.get(PARAM.pop) as UserTab) || "all"
  const activeRole = searchParams.get(PARAM.role)
  const activeContinent = searchParams.get(PARAM.continent) as Continent | null
  const activeCountry = searchParams.get(PARAM.country)
  const activeStatus = searchParams.get(PARAM.status) as
    | "active"
    | "inactive"
    | null
  const urlSearch = searchParams.get(PARAM.q) ?? ""
  const urlPage = Math.max(
    0,
    Number.parseInt(searchParams.get(PARAM.page) ?? "1", 10) - 1
  )
  const urlPageSize = (() => {
    const raw = Number.parseInt(
      searchParams.get(PARAM.pageSize) ?? String(DEFAULT_PAGE_SIZE),
      10
    )
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_PAGE_SIZE
  })()

  // Search input keeps a local mirror so keystrokes don't wait on the URL
  // round-trip. It debounces into the URL, and the URL → input direction is
  // synced for back/forward navigation.
  const [searchInput, setSearchInput] = useState(urlSearch)
  const debouncedSearch = useDebounce(searchInput, 300)

  useEffect(() => {
    setSearchInput(urlSearch)
  }, [urlSearch])

  // ── URL writer — `router.replace` is shallow (no reload, no scroll jump).
  // Setting a value to null/empty drops the key entirely so the URL stays
  // clean when filters are at their default.
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "") params.delete(k)
        else params.set(k, v)
      }
      const qs = params.toString()
      router.replace(qs ? `/users?${qs}` : "/users", { scroll: false })
    },
    [router, searchParams]
  )

  // Push debounced search to URL. Resets pagination to page 1.
  useEffect(() => {
    if (debouncedSearch !== urlSearch) {
      updateParams({ [PARAM.q]: debouncedSearch || null, [PARAM.page]: null })
    }
  }, [debouncedSearch, urlSearch, updateParams])

  const filters = useMemo(
    () => ({
      population: activeTab,
      role: activeRole ?? undefined,
      continent: activeContinent ?? undefined,
      country: activeCountry ?? undefined,
      status: activeStatus ?? undefined,
      search: urlSearch.trim() || undefined,
    }),
    [
      activeTab,
      activeRole,
      activeContinent,
      activeCountry,
      activeStatus,
      urlSearch,
    ]
  )

  const skip = view !== "accounts"

  const pageData = useQuery(
    api.functions.admin.listUsersPage,
    skip ? "skip" : { filters, page: urlPage, pageSize: urlPageSize }
  )

  const facets = useQuery(api.functions.admin.getUserFacets, skip ? "skip" : {})

  // ── Keep last rendered rows visible while the next query is in flight.
  // `useQuery` returns `undefined` whenever its args change, which would
  // otherwise empty the table and trigger a layout shift on every page click.
  // The ref retains the previous payload; the DataTable's existing
  // `isPageTransitioning` overlay dims it to signal loading.
  const lastSnapshotRef = useRef<{ rows: any[]; total: number }>({
    rows: [],
    total: 0,
  })
  if (pageData !== undefined) {
    lastSnapshotRef.current = { rows: pageData.rows, total: pageData.total }
  }
  const rows = lastSnapshotRef.current.rows
  const total = lastSnapshotRef.current.total

  const isInitialLoad = !skip && pageData === undefined && rows.length === 0
  const isPageTransitioning = !skip && pageData === undefined && rows.length > 0

  // ── Filter setters (each one writes through to the URL) ─────────────
  const setPagination = useCallback(
    (updater: PaginationState | ((s: PaginationState) => PaginationState)) => {
      const current: PaginationState = {
        pageIndex: urlPage,
        pageSize: urlPageSize,
      }
      const next = typeof updater === "function" ? updater(current) : updater
      updateParams({
        // page in URL is 1-indexed; omit when it's 1 to keep ?-less URLs clean
        [PARAM.page]: next.pageIndex === 0 ? null : String(next.pageIndex + 1),
        [PARAM.pageSize]:
          next.pageSize === DEFAULT_PAGE_SIZE ? null : String(next.pageSize),
      })
    },
    [urlPage, urlPageSize, updateParams]
  )

  const setActiveTab = (v: UserTab) => {
    updateParams({
      [PARAM.pop]: v === "all" ? null : v,
      // Population implies a role family, so clear any conflicting role.
      [PARAM.role]: null,
      [PARAM.page]: null,
    })
  }

  const setActiveRole = (v: string | null) => {
    updateParams({ [PARAM.role]: v, [PARAM.page]: null })
  }

  const setActiveContinent = (v: Continent | null) => {
    const updates: Record<string, string | null> = {
      [PARAM.continent]: v,
      [PARAM.page]: null,
    }
    // Drop the country filter if it doesn't belong to the new continent.
    if (activeCountry && v && getContinent(activeCountry) !== v) {
      updates[PARAM.country] = null
    }
    updateParams(updates)
  }

  const setActiveCountry = (v: string | null) => {
    updateParams({ [PARAM.country]: v, [PARAM.page]: null })
  }

  const setActiveStatus = (v: "active" | "inactive" | null) => {
    updateParams({ [PARAM.status]: v, [PARAM.page]: null })
  }

  // Clear every filter the Comptes view owns, but keep view=accounts in URL.
  const resetAllFilters = () => {
    setSearchInput("")
    const params = new URLSearchParams()
    params.set(PARAM.view, "accounts")
    router.replace(`/users?${params.toString()}`, { scroll: false })
  }

  // Tab switch (Comptes / Profils / Diplomatique / Carte): start the next
  // view with a clean slate — every data-shaping param is per-view, so we
  // drop them all and only keep `view`. Each sub-view manages its own URL
  // state from there.
  const onViewChange = (key: string) => {
    const params = new URLSearchParams()
    params.set(PARAM.view, key)
    router.replace(`/users?${params.toString()}`, { scroll: false })
  }

  // ── Filter option lists (driven by facets) ──────────────────
  const populationOptions: ComboboxOption<UserTab>[] = POPULATION_ORDER.map(
    (id) => {
      const count =
        id === "all"
          ? (facets?.total ?? 0)
          : (facets?.populations?.[id as Exclude<UserTab, "all">] ?? 0)
      return { value: id, label: `${POPULATION_LABELS[id]} (${count})` }
    }
  )

  const roleOptions: ComboboxOption<string>[] = ALL_ROLES.filter(
    (r) => (facets?.roles?.[r] ?? 0) > 0
  ).map((r) => ({
    value: r,
    label: `${ROLE_LABELS[r] ?? r} (${facets?.roles?.[r] ?? 0})`,
  }))

  const continentOptions: ComboboxOption<Continent>[] = facets
    ? (Object.entries(facets.continents) as [Continent, number][])
        .sort(
          ([a], [b]) =>
            (CONTINENT_META[a]?.order ?? 99) - (CONTINENT_META[b]?.order ?? 99)
        )
        .map(([c, n]) => ({
          value: c,
          label: `${CONTINENT_META[c]?.label ?? c} (${n})`,
        }))
    : []

  const countryOptions: ComboboxOption<string>[] = facets
    ? Object.entries(facets.countries)
        .filter(([code]) =>
          activeContinent ? getContinent(code) === activeContinent : true
        )
        .map(([code, count]) => ({
          value: code,
          label: `${getCountryFlag(code)} ${getCountryName(code)} (${count})`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    : []

  const hasActiveFilter =
    activeTab !== "all" ||
    activeRole !== null ||
    activeContinent !== null ||
    activeCountry !== null ||
    activeStatus !== null ||
    urlSearch.length > 0

  const activeColumns = activeTab === "corps" ? corpsAdminColumns : columns

  const subtitleByView: Record<ViewMode, string> = {
    accounts: "Gestion des comptes de la plateforme",
    profiles: "Profils consulaires des citoyens et ressortissants",
    diplomatic: "Profils diplomatiques du corps administratif",
    map: "Vision géographique : citoyens et agents répartis dans le monde",
  }

  const viewModeTabs = VIEW_MODES.map((mode) => ({
    key: mode.id as string,
    label: mode.label,
    icon: mode.icon as import("lucide-react").LucideIcon,
  }))

  const pagination: PaginationState = {
    pageIndex: urlPage,
    pageSize: urlPageSize,
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-7 pt-6 pb-[60px]">
      <PageHeader
        icon={<UsersIcon className="h-5 w-5" />}
        title="Comptes & Profils"
        subtitle={subtitleByView[view]}
      />

      <TabSwitcher
        tabs={viewModeTabs}
        activeTab={view}
        onTabChange={onViewChange}
        className="w-fit"
      />

      {view === "profiles" && <ProfilesView />}
      {view === "diplomatic" && <DiplomaticProfilesView />}
      {view === "map" && <UsersMapView />}

      {view === "accounts" && (
        <>
          <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <FilterField label="Population">
              <Combobox
                options={populationOptions.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as UserTab)}
                placeholder="Population"
                searchPlaceholder="Filtrer…"
                emptyText="Aucune option."
                className="h-9"
              />
            </FilterField>

            <FilterField label="Rôle">
              <Combobox
                options={[
                  {
                    value: "__all__",
                    label: `Tous les rôles (${facets?.total ?? 0})`,
                  },
                  ...roleOptions,
                ]}
                value={activeRole ?? "__all__"}
                onValueChange={(v) => setActiveRole(v === "__all__" ? null : v)}
                placeholder="Tous les rôles"
                searchPlaceholder="Filtrer…"
                emptyText="Aucun rôle."
                className="h-9"
              />
            </FilterField>

            <FilterField label="Continent">
              <Combobox
                options={[
                  { value: "__all__", label: "Tous les continents" },
                  ...continentOptions,
                ]}
                value={activeContinent ?? "__all__"}
                onValueChange={(v) =>
                  setActiveContinent(v === "__all__" ? null : (v as Continent))
                }
                placeholder="Tous les continents"
                searchPlaceholder="Filtrer…"
                emptyText="Aucun continent."
                className="h-9"
              />
            </FilterField>

            <FilterField label="Pays">
              <Combobox
                options={[
                  { value: "__all__", label: "Tous les pays" },
                  ...countryOptions,
                ]}
                value={activeCountry ?? "__all__"}
                onValueChange={(v) =>
                  setActiveCountry(v === "__all__" ? null : v)
                }
                placeholder="Tous les pays"
                searchPlaceholder="Rechercher un pays…"
                emptyText="Aucun pays."
                className="h-9"
              />
            </FilterField>

            <FilterField label="Statut">
              <Combobox
                options={[
                  { value: "__all__", label: "Tous statuts" },
                  {
                    value: "active",
                    label: `Actif (${facets?.statuses.active ?? 0})`,
                  },
                  {
                    value: "inactive",
                    label: `Inactif (${facets?.statuses.inactive ?? 0})`,
                  },
                ]}
                value={activeStatus ?? "__all__"}
                onValueChange={(v) =>
                  setActiveStatus(
                    v === "__all__" ? null : (v as "active" | "inactive")
                  )
                }
                placeholder="Tous statuts"
                searchPlaceholder="Filtrer…"
                emptyText="—"
                className="h-9"
              />
            </FilterField>

            <FilterField label={hasActiveFilter ? "Action" : " "}>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-full font-normal"
                disabled={!hasActiveFilter}
                onClick={resetAllFilters}
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Réinitialiser
              </Button>
            </FilterField>
          </div>

          <FlatCard>
            <div className="p-3 lg:p-4">
              <DataTable
                columns={activeColumns}
                data={rows as any[]}
                searchKeys={["name", "email", "phone", "residenceCountry"]}
                searchPlaceholder={t(
                  "superadmin.users.filters.searchPlaceholder"
                )}
                searchValue={searchInput}
                onSearchChange={setSearchInput}
                isLoading={isInitialLoad}
                isPageTransitioning={isPageTransitioning}
                totalRowCount={total}
                pagination={pagination}
                onPaginationChange={setPagination}
              />
            </div>
          </FlatCard>
        </>
      )}
    </div>
  )
}

function FilterField({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </div>
  )
}
