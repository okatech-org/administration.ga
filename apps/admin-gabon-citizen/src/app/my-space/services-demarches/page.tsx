"use client"

/**
 * Services & Demarches — Design iProfil strict.
 *
 * Patterns iProfil :
 * - FlatCard : rounded-xl bg-card border flat-card-border
 * - Section headers : icon dans bg-foreground/[0.06] + text-sm font-semibold text-muted-foreground
 * - Boutons Type A : variant="ghost" h-8 px-3 text-xs font-medium bg-muted rounded-full
 * - Micro labels : text-[10px] font-semibold uppercase tracking-widest
 * - Items actifs : bg-amber-500/15 dark:bg-amber-500/10
 * - Compteurs : bg-foreground/[0.06] text-muted-foreground font-bold rounded-full
 */

import { api } from "@convex/_generated/api"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  FolderOpen,
  Globe,
  Loader2,
  Search,
  X,
} from "lucide-react"
import { motion } from "motion/react"
import { Suspense, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { FlatCard } from "@/components/my-space/flat-card"
import { PageHeader } from "@/components/my-space/page-header"
import { RequestCard } from "@/components/my-space/request-card"
import { CardGridSkeleton, ListSkeleton } from "@/components/skeletons"
import type { CatalogService } from "@/components/my-space/service-detail-sheet"
import { ServiceDetailSheet } from "@/components/my-space/service-detail-sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import {
  useAuthenticatedConvexQuery,
  useAuthenticatedPaginatedQuery,
  useConvexQuery,
} from "@/integrations/convex/hooks"
import { captureEvent } from "@/lib/analytics"
import {
  DEMARCHE_FILTER_TABS,
  type DemarcheSubFilter,
  type DossierStatus,
  DOSSIER_STATUS_CONFIG,
  formatDateFr,
  getDeadlineInfo,
  matchDossierFilter,
  matchRequestFilter,
} from "@/lib/dossier-status-config"
import { getLocalizedValue } from "@/lib/i18n-utils"
import { getCategoryConfig, SERVICE_CATEGORIES } from "@/lib/service-categories"
import { cn } from "@/lib/utils"

// ─── Types & Constants ──────────────────────────────────────────────────────

type TabKey = "services" | "demarches"
const SERVICES_PER_PAGE = 16

// ─── Main ───────────────────────────────────────────────────────────────────

export default function ServicesDemarchesPage() {
  return (
    <Suspense fallback={null}>
      <ServicesDemarchesContent />
    </Suspense>
  )
}

function ServicesDemarchesContent() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()

  const childId = searchParams.get("childId")
  const activeTab: TabKey =
    searchParams.get("tab") === "demarches" ? "demarches" : "services"
  const setActiveTab = useCallback(
    (tab: TabKey) => {
      const childParam = childId ? `&childId=${childId}` : ""
      router.replace(`/my-space/services-demarches?tab=${tab}${childParam}`)
    },
    [router, childId]
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("ALL")
  const [selectedService, setSelectedService] = useState<CatalogService | null>(
    null
  )
  const [demarcheFilter, setDemarcheFilter] =
    useState<DemarcheSubFilter>("tous")
  const [currentPage, setCurrentPage] = useState(1)

  // ── Data ──
  const { data: services } = useConvexQuery(
    api.functions.services.listCatalog,
    {}
  )
  const { data: myProfile } = useAuthenticatedConvexQuery(
    api.functions.profiles.getMine,
    {}
  )
  const userType = myProfile?.userType
  const userCountry = myProfile?.countryOfResidence
  const { data: availableServiceIds } = useConvexQuery(
    api.functions.services.getAvailableServiceIdsForCountry,
    userCountry ? { userCountry } : "skip"
  )
  const {
    results: requests,
    status: paginationStatus,
    loadMore,
    isLoading: requestsLoading,
  } = useAuthenticatedPaginatedQuery(
    api.functions.requests.listMine,
    {},
    { initialNumItems: 20 }
  )
  const { data: dossiers = [] } = useAuthenticatedConvexQuery(
    api.functions.dossierProcedure.listMyDossiers,
    {}
  )

  // ── Child profile context (when browsing services for a child) ──
  const { data: childProfile } = useAuthenticatedConvexQuery(
    api.functions.childProfiles.getById,
    childId ? { id: childId as any } : "skip"
  )
  const childName = childProfile
    ? `${(childProfile as any).identity?.firstName ?? ""} ${(childProfile as any).identity?.lastName ?? ""}`.trim()
    : null

  // ── Services disponibles pour l'utilisateur (representation + eligibilite) ──
  const userServices = useMemo(() => {
    if (!services) return []
    return services.filter((svc) => {
      if (availableServiceIds && !availableServiceIds.includes(svc._id))
        return false
      if (
        svc.eligibleProfiles?.length &&
        userType &&
        !svc.eligibleProfiles.includes(userType)
      )
        return false
      return true
    })
  }, [services, availableServiceIds, userType])

  // ── Services filtres par categorie + recherche UI ──
  const filteredServices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return userServices.filter((svc) => {
      if (selectedCategory !== "ALL" && svc.category !== selectedCategory)
        return false
      if (q) {
        const name = getLocalizedValue(svc.name, i18n.language)
        const desc = getLocalizedValue(svc.description, i18n.language)
        if (!name.toLowerCase().includes(q) && !desc.toLowerCase().includes(q))
          return false
      }
      return true
    })
  }, [userServices, searchQuery, selectedCategory, i18n.language])

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat)
    setCurrentPage(1)
  }

  // ── Stats ──
  const stats = useMemo(() => {
    const allD = dossiers as Array<{ status: string }>
    return {
      totalServices: userServices.length,
      inProgress:
        requests.filter((r) => matchRequestFilter(r.status, "en_cours"))
          .length +
        allD.filter((d) =>
          matchDossierFilter(d.status as DossierStatus, "en_cours")
        ).length,
      actionsCount: requests.filter((r: any) =>
        r.actionsRequired?.some((a: any) => !a.completedAt)
      ).length,
      completed:
        requests.filter((r) => matchRequestFilter(r.status, "termines"))
          .length +
        allD.filter((d) =>
          matchDossierFilter(d.status as DossierStatus, "termines")
        ).length,
    }
  }, [userServices, requests, dossiers])

  const totalDemarches = requests.length + (dossiers as any[]).length

  const handleServiceClick = (svc: CatalogService) => {
    setSelectedService(svc)
    captureEvent("myspace_service_viewed", { service_type: svc.slug })
  }
  const handleCreateRequest = () => {
    if (!selectedService) return
    const childParam = childId ? `?childId=${childId}` : ""
    router.push(`/my-space/services/${selectedService.slug}/new${childParam}`)
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col md:h-full md:overflow-hidden">
      <div className="shrink-0">
        <PageHeader
          title={t("servicesDemarches.title")}
          subtitle={t("servicesDemarches.subtitle")}
          icon={<Globe className="h-6 w-6 text-primary" />}
        />
        {childName && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-pink-500/20 bg-pink-500/5 px-3 py-2 text-sm">
            <span className="font-medium text-pink-600">
              {t("servicesDemarches.childContext", "Services pour {{name}}", { name: childName })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 px-2 text-xs text-muted-foreground"
              onClick={() => router.replace("/my-space/services-demarches")}
            >
              <X className="h-3 w-3 mr-1" />
              {t("common.cancel")}
            </Button>
          </div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 flex flex-col gap-3 md:min-h-0 md:flex-1 md:overflow-hidden"
      >
        {/* ── Stats ── */}
        <div className="stagger-children grid shrink-0 grid-cols-2 gap-2.5 lg:grid-cols-4">
          <StatCard
            icon={<Globe className="h-3.5 w-3.5 text-muted-foreground" />}
            value={stats.totalServices}
            label="Services disponibles"
          />
          <StatCard
            icon={<Clock className="h-3.5 w-3.5 text-muted-foreground" />}
            value={stats.inProgress}
            label="En cours"
          />
          <StatCard
            icon={
              <AlertTriangle
                className={cn(
                  "h-3.5 w-3.5",
                  stats.actionsCount > 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-muted-foreground"
                )}
              />
            }
            iconBg={stats.actionsCount > 0 ? "bg-rose-500/10" : undefined}
            value={stats.actionsCount}
            label="Actions requises"
            valueClass={
              stats.actionsCount > 0
                ? "text-rose-600 dark:text-rose-400"
                : undefined
            }
          />
          <StatCard
            icon={
              <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
            }
            value={stats.completed}
            label="Completees"
          />
        </div>

        {/* ── Tabs ── */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabKey)}
        >
          <TabsList className="flex h-auto min-h-0 w-full flex-row gap-1.5 rounded-md bg-foreground/[0.06] p-1.5 md:gap-2 md:p-2 dark:bg-foreground/[0.08]">
            <TabsTrigger
              value="services"
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2.5 text-sm font-semibold transition-all active:scale-[0.97] md:gap-2.5 md:px-5 md:py-2.5 md:text-base",
                "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                "data-[state=active]:bg-primary data-[state=active]:font-bold data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              )}
            >
              <Globe className="hidden size-4 shrink-0 md:block" />
              Services
            </TabsTrigger>
            <TabsTrigger
              value="demarches"
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2.5 text-sm font-semibold transition-all active:scale-[0.97] md:gap-2.5 md:px-5 md:py-2.5 md:text-base",
                "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                "data-[state=active]:bg-primary data-[state=active]:font-bold data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              )}
            >
              <FolderOpen className="hidden size-4 shrink-0 md:block" />
              Mes Demarches
              {totalDemarches > 0 && (
                <span className="ml-1 min-w-6 rounded-full bg-amber-500/20 px-2 py-0.5 text-center text-xs font-bold text-amber-600 dark:text-amber-400">
                  {totalDemarches}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Content ── */}
          <TabsContent value="services" className="mt-3">
            <CatalogueContent
              services={userServices}
              filteredServices={filteredServices}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCategory={selectedCategory}
              handleCategoryChange={handleCategoryChange}
              handleServiceClick={handleServiceClick}
            />
          </TabsContent>
          <TabsContent value="demarches" className="mt-3">
            <DemarchesContent
              requests={requests}
              requestsLoading={requestsLoading}
              paginationStatus={paginationStatus}
              loadMore={loadMore}
              dossiers={dossiers as any[]}
              demarcheFilter={demarcheFilter}
              setDemarcheFilter={setDemarcheFilter}
            />
          </TabsContent>
        </Tabs>
      </motion.div>

      <ServiceDetailSheet
        service={selectedService}
        open={!!selectedService}
        onOpenChange={(open) => !open && setSelectedService(null)}
        onCreateRequest={handleCreateRequest}
        isEligible={
          !selectedService?.eligibleProfiles ||
          selectedService.eligibleProfiles.length === 0 ||
          (!!userType && selectedService.eligibleProfiles.includes(userType))
        }
        isAvailableInJurisdiction={
          !!availableServiceIds &&
          !!selectedService &&
          availableServiceIds.includes(selectedService._id)
        }
      />
    </div>
  )
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  icon,
  iconBg,
  value,
  label,
  valueClass,
}: {
  icon: React.ReactNode
  iconBg?: string
  value: number
  label: string
  valueClass?: string
}) {
  return (
    <FlatCard>
      <div className="flex items-center gap-2.5 p-3 md:gap-3 md:p-4">
        <div
          className={cn(
            "shrink-0 rounded-lg p-1.5 md:p-2",
            iconBg ?? "bg-foreground/[0.06] dark:bg-foreground/[0.12]"
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p
            className={cn(
              "text-lg leading-none font-bold md:text-2xl",
              valueClass
            )}
          >
            {value}
          </p>
          <p className="mt-0.5 text-[10px] leading-tight font-semibold tracking-wider text-muted-foreground uppercase md:text-xs">
            {label}
          </p>
        </div>
      </div>
    </FlatCard>
  )
}

// ─── Catalogue ──────────────────────────────────────────────────────────────

function CatalogueContent({
  services,
  filteredServices,
  currentPage,
  setCurrentPage,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  handleCategoryChange,
  handleServiceClick,
}: {
  services: any
  filteredServices: any[]
  currentPage: number
  setCurrentPage: (n: number) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  selectedCategory: string
  handleCategoryChange: (c: string) => void
  handleServiceClick: (s: CatalogService) => void
}) {
  const { t, i18n } = useTranslation()

  if (services === undefined) {
    return <CardGridSkeleton cols={3} count={6} className="flex-1" />
  }

  const totalPages = Math.max(
    1,
    Math.ceil(filteredServices.length / SERVICES_PER_PAGE)
  )
  const safePage = Math.min(currentPage, totalPages)
  const startIdx = (safePage - 1) * SERVICES_PER_PAGE
  const pageServices = filteredServices.slice(
    startIdx,
    startIdx + SERVICES_PER_PAGE
  )

  return (
    <div className="flex flex-col gap-3 md:min-h-0 md:flex-1 md:overflow-hidden">
      {/* Search + Categories — shrink-0 */}
      <FlatCard className="shrink-0">
        <div className="flex flex-col gap-2.5 p-3 md:flex-row md:items-center md:gap-3 md:p-3.5">
          {/* Recherche */}
          <div className="relative w-full shrink-0 md:w-56">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("common.search")}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full rounded-lg border-0 bg-muted py-2 pr-8 pl-10 text-sm transition-all outline-none focus:ring-2 focus:ring-primary/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("")
                  setCurrentPage(1)
                }}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-0.5 transition-colors hover:bg-foreground/[0.06]"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          {/* Separateur — vertical sur desktop, horizontal sur mobile */}
          <div className="hidden h-6 w-px shrink-0 bg-foreground/[0.08] md:block" />
          {/* Categories */}
          <div className="scrollbar-hide -mx-1 flex flex-1 items-center gap-1.5 overflow-x-auto px-1 pb-0.5">
            {SERVICE_CATEGORIES.map((cat) => {
              const CatIcon = cat.icon
              const isActive = selectedCategory === cat.id
              const count =
                cat.id === "ALL"
                  ? (services?.length ?? 0)
                  : (services?.filter((s: any) => s.category === cat.id)
                      .length ?? 0)
              // Masquer les categories sans services disponibles
              if (cat.id !== "ALL" && count === 0) return null
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all md:gap-1.5 md:px-3.5 md:py-2",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-foreground/[0.04] text-muted-foreground hover:bg-foreground/[0.08] dark:bg-foreground/[0.08]"
                  )}
                >
                  <CatIcon className="h-3 w-3 md:h-3.5 md:w-3.5" />
                  {t(cat.labelKey)}
                  <span
                    className={cn(
                      "min-w-[20px] rounded-full px-1.5 text-center text-[10px] font-bold",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-foreground/[0.06] text-muted-foreground dark:bg-foreground/[0.12]"
                    )}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </FlatCard>

      {/* Grille — flex-1 pour remplir l'espace restant */}
      {pageServices.length > 0 ? (
        <div className="flex flex-col gap-3 md:min-h-0 md:flex-1 md:overflow-hidden">
          <div className="grid auto-rows-fr grid-cols-1 content-start gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {pageServices.map((service: any) => {
              const { icon: SvcIcon, style } = getCategoryConfig(
                service.category
              )
              const serviceName = getLocalizedValue(service.name, i18n.language)
              return (
                <button
                  key={service._id}
                  type="button"
                  onClick={() => handleServiceClick(service as CatalogService)}
                  className="group h-full text-left"
                >
                  <FlatCard className="h-full transition-all">
                    <div className="flex h-full items-center gap-3.5 p-4">
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                          style.bgColor
                        )}
                      >
                        <SvcIcon className={cn("h-5.5 w-5.5", style.color)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="line-clamp-2 block text-sm leading-snug font-semibold transition-colors group-hover:text-primary">
                          {serviceName}
                        </span>
                        {service.estimatedDays && (
                          <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 shrink-0" />
                            {service.estimatedDays} jours
                          </span>
                        )}
                      </div>
                    </div>
                  </FlatCard>
                </button>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex shrink-0 items-center justify-center gap-4">
              <p className="shrink-0 text-xs text-muted-foreground">
                {startIdx + 1}-
                {Math.min(
                  startIdx + SERVICES_PER_PAGE,
                  filteredServices.length
                )}{" "}
                sur {filteredServices.length}
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage(safePage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "h-8 min-w-8 rounded-full px-2 text-xs font-bold transition-all",
                        page === safePage
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-foreground/[0.06]"
                      )}
                    >
                      {page}
                    </button>
                  )
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage(safePage + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <FlatCard className="md:flex-1">
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
            <div className="mb-3 inline-flex rounded-full bg-muted p-3">
              <Search className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="mb-1 text-sm font-semibold">Aucun service trouve</p>
            <p className="mb-3 text-xs text-muted-foreground">
              Modifiez vos filtres ou votre recherche.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-full bg-muted px-3 text-xs font-medium hover:bg-muted/70"
              onClick={() => {
                setSearchQuery("")
                handleCategoryChange("ALL")
              }}
            >
              Reinitialiser
            </Button>
          </div>
        </FlatCard>
      )}
    </div>
  )
}

// ─── Demarches ──────────────────────────────────────────────────────────────

function DemarchesContent({
  requests,
  requestsLoading,
  paginationStatus,
  loadMore,
  dossiers,
  demarcheFilter,
  setDemarcheFilter,
}: {
  requests: any[]
  requestsLoading: boolean
  paginationStatus: string
  loadMore: (n: number) => void
  dossiers: any[]
  demarcheFilter: DemarcheSubFilter
  setDemarcheFilter: (f: DemarcheSubFilter) => void
}) {
  const { t } = useTranslation()
  const filteredR = useMemo(
    () =>
      requests.filter((r: any) => matchRequestFilter(r.status, demarcheFilter)),
    [requests, demarcheFilter]
  )
  const filteredD = useMemo(
    () =>
      dossiers.filter((d: any) =>
        matchDossierFilter(d.status as DossierStatus, demarcheFilter)
      ),
    [dossiers, demarcheFilter]
  )
  const total = filteredR.length + filteredD.length
  const isEmpty =
    !requestsLoading && requests.length === 0 && dossiers.length === 0
  const countFor = (f: DemarcheSubFilter) =>
    requests.filter((r: any) => matchRequestFilter(r.status, f)).length +
    dossiers.filter((d: any) =>
      matchDossierFilter(d.status as DossierStatus, f)
    ).length

  if (requestsLoading && requests.length === 0 && dossiers.length === 0) {
    return <ListSkeleton count={4} />
  }

  if (isEmpty) {
    return (
      <FlatCard>
        <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <FolderOpen className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <h3 className="mb-1.5 text-base font-semibold">
            {t("servicesDemarches.noOngoing")}
          </h3>
          <p className="mb-5 max-w-xs text-sm text-muted-foreground">
            Parcourez les services disponibles pour commencer.
          </p>
          <Button
            variant="ghost"
            className="h-8 gap-1.5 rounded-full bg-muted px-4 text-xs font-medium hover:bg-muted/70"
          >
            <Globe className="h-3.5 w-3.5" />
            Voir les services
          </Button>
        </div>
      </FlatCard>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex w-fit gap-1 rounded-xl bg-muted/50 p-1">
        {DEMARCHE_FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setDemarcheFilter(tab.key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              demarcheFilter === tab.key
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t(tab.labelKey, tab.fallback)}
            <span className="ml-1.5 text-[10px] opacity-60">
              {countFor(tab.key)}
            </span>
          </button>
        ))}
      </div>

      {total === 0 ? (
        <FlatCard>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 rounded-full bg-muted p-3">
              <FolderOpen className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="mb-1 text-sm font-semibold">
              {t("servicesDemarches.noResults")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("servicesDemarches.noResultsFilter")}
            </p>
          </div>
        </FlatCard>
      ) : (
        <div className="space-y-4">
          {/* ── Requests grid (RequestCard like /requests page) ── */}
          {filteredR.length > 0 && (
            <div className="grid auto-rows-fr content-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredR.map((r: any) => (
                <RequestCard key={r._id} request={r} />
              ))}
            </div>
          )}

          {/* ── Dossiers section ── */}
          {filteredD.length > 0 && (
            <>
              {filteredR.length > 0 && (
                <span className="block px-0.5 pt-1 text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase">
                  Procedures administratives
                </span>
              )}
              <div className="grid auto-rows-fr content-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredD.map((d: any) => (
                  <DossierItemCard key={d._id} dossier={d} />
                ))}
              </div>
            </>
          )}

          {/* ── Pagination ── */}
          {paginationStatus === "CanLoadMore" && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={() => loadMore(20)}>
                {t("common.loadMore")}
              </Button>
            </div>
          )}
          {paginationStatus === "LoadingMore" && (
            <div className="flex justify-center pt-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Dossier Item — iProfil ─────────────────────────────────────────────────

function DossierItemCard({ dossier }: { dossier: any }) {
  const status = dossier.status as DossierStatus
  const cfg = DOSSIER_STATUS_CONFIG[status]
  const deadline = getDeadlineInfo(dossier.dateLimite)
  const StatusIcon = cfg?.icon ?? FileText

  return (
    <Link
      href={`/my-space/demarches/${dossier._id}`}
      className="group block h-full"
    >
      <FlatCard className="flex h-full flex-col transition-all">
        <div className="flex flex-1 flex-col p-3 lg:p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("rounded-md p-1", cfg?.bgColor ?? "bg-muted")}>
                <StatusIcon
                  className={cn(
                    "h-3.5 w-3.5",
                    cfg?.color ?? "text-muted-foreground"
                  )}
                />
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">
                {dossier.reference ?? "---"}
              </span>
            </div>
            <Badge
              variant="outline"
              className={cn("h-5 px-1.5 text-[10px]", cfg?.bgColor, cfg?.color)}
            >
              {cfg?.label ?? status}
            </Badge>
          </div>
          <p className="mb-1 text-sm leading-tight font-bold transition-colors group-hover:text-primary">
            {dossier.typeLabel?.fr ?? "Demarche"}
          </p>
          <p className="mb-2 text-xs text-muted-foreground">
            Etape : {dossier.etapeLabel?.fr ?? "---"}
          </p>
          <div className="mt-auto flex items-center justify-between pt-2">
            <span className="text-[10px] text-muted-foreground">
              {formatDateFr(dossier.dateDepot)}
            </span>
            {deadline && (
              <span
                className={cn(
                  "flex items-center gap-1 text-[10px] font-bold",
                  deadline.color
                )}
              >
                {deadline.urgent ? (
                  <AlertTriangle className="h-2.5 w-2.5" />
                ) : (
                  <Clock className="h-2.5 w-2.5" />
                )}
                {deadline.label}
              </span>
            )}
          </div>
        </div>
      </FlatCard>
    </Link>
  )
}
