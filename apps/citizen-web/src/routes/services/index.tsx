import { api } from "@convex/_generated/api";
import { ServiceCategory } from "@convex/lib/constants";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Filter,
  Globe,
  LayoutGrid,
  type LucideIcon,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { ServiceCard } from "@/components/home/ServiceCard";
import { DGDIServiceBanner } from "@/components/services/DGDIServiceBanner";
import { ServiceDetailModal } from "@/components/services/ServiceDetailModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useConvexQuery } from "@/integrations/convex/hooks";
import { getLocalizedValue } from "@/lib/i18n-utils";
import {
  CATEGORY_STYLE_MAP,
  SERVICE_CATEGORIES_WITHOUT_ALL,
} from "@/lib/service-categories";
import { cn } from "@/lib/utils";

const servicesSearchSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  service: z.string().optional(),
});

export const Route = createFileRoute("/services/")({
  component: ServicesPage,
  validateSearch: (search) => servicesSearchSchema.parse(search),
});

function ServiceCardSkeleton() {
  return (
    <div className="rounded-[10px] border border-border bg-card p-6 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-[10px]" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

function ServicesPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const { data: services } = useConvexQuery(
    api.functions.services.listCatalog,
    {},
  );

  // Config derivee de la source partagee + traductions
  const categoryConfig = useMemo(() => {
    const result: Record<
      string,
      { icon: LucideIcon; color: string; bgColor: string; label: string }
    > = {};
    for (const cat of SERVICE_CATEGORIES_WITHOUT_ALL) {
      const style =
        CATEGORY_STYLE_MAP[cat.id] ?? CATEGORY_STYLE_MAP[ServiceCategory.Other];
      result[cat.id] = {
        icon: cat.icon,
        color: `${style.bgColor} ${style.color}`,
        bgColor: style.bgColor,
        label: t(cat.labelKey),
      };
    }
    const fallbackStyle = CATEGORY_STYLE_MAP[ServiceCategory.Other];
    result._fallback = {
      icon: LayoutGrid,
      color: `${fallbackStyle.bgColor} ${fallbackStyle.color}`,
      bgColor: fallbackStyle.bgColor,
      label: t("services.category.other", "Autre"),
    };
    return result;
  }, [t]);

  const [searchQuery, setSearchQuery] = useState(search.query || "");

  // ─── Service modal via URL ────────────────────────────────────────────────
  const selectedService = useMemo(() => {
    if (!search.service || !services) return null;
    return services.find((s) => s.slug === search.service) ?? null;
  }, [search.service, services]);

  const modalOpen = !!search.service && !!selectedService;

  const handleServiceClick = (slug: string) => {
    updateFilters({ service: slug });
  };

  const handleModalClose = (open: boolean) => {
    if (!open) {
      updateFilters({ service: undefined });
    }
  };

  // ─── Filters ──────────────────────────────────────────────────────────────
  const updateFilters = (updates: Partial<typeof search>) => {
    navigate({
      search: (prev) => ({ ...prev, ...updates }),
      replace: true,
    });
  };

  // Debounced search update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== search.query) {
        updateFilters({ query: searchQuery || undefined });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Multi-selection categories (comma-separated)
  const selectedCategories = search.category
    ? search.category.split(",")
    : [];

  const toggleCategory = (cat: string) => {
    const next = selectedCategories.includes(cat)
      ? selectedCategories.filter((c) => c !== cat)
      : [...selectedCategories, cat];
    updateFilters({ category: next.join(",") || undefined });
  };

  const isLoading = services === undefined;

  const filteredServices = services?.filter((service) => {
    const serviceName = getLocalizedValue(service.name, i18n.language);
    const serviceDesc = getLocalizedValue(service.description, i18n.language);
    const matchesQuery =
      !search.query ||
      serviceName.toLowerCase().includes(search.query.toLowerCase()) ||
      serviceDesc.toLowerCase().includes(search.query.toLowerCase());

    const matchesCategory =
      selectedCategories.length === 0 ||
      selectedCategories.includes(service.category);

    return matchesQuery && matchesCategory;
  });

  const clearFilters = () => {
    setSearchQuery("");
    updateFilters({ query: undefined, category: undefined });
  };

  const activeFiltersCount =
    (search.query ? 1 : 0) + selectedCategories.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-20 lg:py-40 bg-[oklch(0.145_0_0)] text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block mb-4 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-white/80">
            {t("services.badge")}
          </span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-[-0.02em] text-white mb-4">
            {t("services.pageTitle")}
          </h1>
          <p className="text-lg md:text-xl text-[oklch(0.7_0_0)] max-w-2xl mx-auto mb-8">
            {t(
              "services.pageDescription",
              "Découvrez l'ensemble des services consulaires proposés par la République Gabonaise pour ses citoyens à l'étranger.",
            )}
          </p>

          {/* Search Bar — hero (desktop visible, mobile hidden) */}
          <div className="hidden lg:block max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
            <Input
              className="h-12 pl-12 pr-4 rounded-[10px] bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus-visible:ring-white/20"
              placeholder={t(
                "services.searchPlaceholder",
                "Rechercher un service...",
              )}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 lg:py-16 px-4 lg:px-6">
        <div className="max-w-7xl mx-auto">
          {/* ── Mobile: inline filters (search + horizontal chips) ── */}
          <div className="lg:hidden mb-6 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                className="h-10 pl-9 pr-4 rounded-[10px] bg-background border border-border text-sm placeholder:text-muted-foreground/50"
                placeholder={t(
                  "services.searchPlaceholder",
                  "Rechercher un service...",
                )}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="shrink-0 text-[11px] font-medium text-destructive px-2.5 py-1.5 rounded-full border border-destructive/20 bg-destructive/5 transition-colors"
                >
                  ✕ {t("services.clear", "Effacer")}
                </button>
              )}
              {SERVICE_CATEGORIES_WITHOUT_ALL.map((cat) => {
                const _style =
                  CATEGORY_STYLE_MAP[cat.id] ??
                  CATEGORY_STYLE_MAP[ServiceCategory.Other];
                const Icon = cat.icon;
                const isSelected = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={cn(
                      "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all duration-200",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {t(cat.labelKey)}
                  </button>
                );
              })}
            </div>
            {/* DGDI Banner — mobile */}
            <DGDIServiceBanner />
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* ── Desktop Sidebar: search + category checkboxes ── */}
            <aside className="hidden lg:block w-72 shrink-0">
              <div className="lg:sticky lg:top-20 space-y-5">
                {/* Filter Panel */}
                <div className="rounded-[10px] bg-card border border-border p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-base flex items-center gap-2 text-foreground">
                      <Filter className="w-4 h-4 text-primary" />
                      {t("services.filters", "Filtres")}
                    </h3>
                    {activeFiltersCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-muted-foreground hover:text-destructive transition-colors text-xs"
                        onClick={clearFilters}
                      >
                        {t("services.clearAll", "Tout effacer")}
                      </Button>
                    )}
                  </div>

                  {/* Search — sidebar */}
                  <div className="relative mb-5">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      className="h-9 pl-9 text-sm rounded-lg border border-border"
                      placeholder={t(
                        "services.searchPlaceholder",
                        "Rechercher...",
                      )}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Category checkboxes */}
                  <div className="space-y-1">
                    <div className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider mb-3 pl-1">
                      {t("services.categories", "Catégories")}
                    </div>
                    {SERVICE_CATEGORIES_WITHOUT_ALL.map((cat) => {
                      const style =
                        CATEGORY_STYLE_MAP[cat.id] ??
                        CATEGORY_STYLE_MAP[ServiceCategory.Other];
                      const Icon = cat.icon;
                      const isSelected = selectedCategories.includes(cat.id);
                      return (
                        <Label
                          key={cat.id}
                          htmlFor={`cat-${cat.id}`}
                          className={cn(
                            "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200",
                            isSelected
                              ? "bg-primary/10 shadow-sm"
                              : "hover:bg-muted/50",
                          )}
                        >
                          <Checkbox
                            id={`cat-${cat.id}`}
                            checked={isSelected}
                            onCheckedChange={() => toggleCategory(cat.id)}
                            className="border-border/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <span
                            className={cn(
                              "p-1.5 rounded-md",
                              style.bgColor,
                              style.color.split(" ")[0],
                            )}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          <span
                            className={cn(
                              "text-sm",
                              isSelected
                                ? "font-medium text-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            {t(cat.labelKey)}
                          </span>
                        </Label>
                      );
                    })}
                  </div>
                </div>

                {/* DGDI Passeports & Visas — desktop sidebar */}
                <DGDIServiceBanner />
              </div>
            </aside>

            {/* ── Services Grid ── */}
            <div className="flex-1">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {filteredServices
                    ? `${filteredServices.length} service${filteredServices.length > 1 ? "s" : ""}`
                    : t("services.loading", "Chargement...")}
                </h2>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground hidden lg:flex"
                    onClick={clearFilters}
                  >
                    {t("services.clearAll")}
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* DGDI Banner horizontal — desktop, quand pas de filtres */}
                {!isLoading && !search.query && selectedCategories.length === 0 && (
                  <a
                    href="https://www.dgdi.ga/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group hidden lg:flex col-span-full rounded-[10px] border border-border bg-card p-5 items-center gap-5 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300"
                  >
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary/10">
                        <Globe className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                          {t("dgdi.bannerTitle", "Passeport & Visa")}
                        </h3>
                        <Badge variant="outline" className="text-[10px] mt-1 border-border text-primary">
                          DGDI — En ligne
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                      {t(
                        "dgdi.bannerDescription",
                        "Etablissement, depot et retrait de passeports et visas. Demarches effectuees en ligne sur la plateforme de la DGDI.",
                      )}
                    </p>
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary whitespace-nowrap shrink-0">
                      {t("dgdi.bannerCta", "Faire la demarche")}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </a>
                )}

                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <ServiceCardSkeleton key={i} />
                  ))
                ) : filteredServices?.length === 0 ? (
                  <div className="col-span-full py-16 text-center rounded-[10px] bg-muted/50 border-2 border-dashed flex flex-col items-center justify-center">
                    <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-6">
                      <Search className="w-10 h-10 text-primary/50" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-foreground">
                      {t("services.noResults", "Aucun service trouvé")}
                    </h3>
                    <p className="text-muted-foreground mb-8 max-w-md">
                      {t(
                        "services.noResultsDesc",
                        "Essayez de modifier vos filtres ou votre recherche.",
                      )}
                    </p>
                    <Button
                      onClick={clearFilters}
                      variant="outline"
                      className="h-12 px-8 rounded-[10px]"
                    >
                      {t(
                        "services.viewAllServices",
                        "Voir tous les services",
                      )}
                    </Button>
                  </div>
                ) : (
                  filteredServices?.map((service) => {
                    const config =
                      categoryConfig[service.category] ||
                      categoryConfig._fallback;
                    const suffix =
                      service.category === ServiceCategory.Identity
                        ? "passport"
                        : service.category === ServiceCategory.Certification
                          ? "legalization"
                          : service.category === ServiceCategory.Assistance
                            ? "emergency"
                            : service.category;
                    const categoryLabel = t(
                      `services.categoriesMap.${suffix}`,
                    );
                    const serviceName = getLocalizedValue(
                      service.name,
                      i18n.language,
                    );
                    const serviceDesc = getLocalizedValue(
                      service.description,
                      i18n.language,
                    );

                    return (
                      <ServiceCard
                        key={service._id}
                        icon={config.icon}
                        title={serviceName}
                        description={serviceDesc}
                        color={config.color}
                        badge={categoryLabel}
                        price={t("services.free")}
                        delay={
                          service.estimatedDays
                            ? `${service.estimatedDays} ${t("services.days", { count: service.estimatedDays, defaultValue: "jour(s)" })}`
                            : undefined
                        }
                        onClick={() => handleServiceClick(service.slug)}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service Detail Modal */}
      <ServiceDetailModal
        service={selectedService as any}
        open={modalOpen}
        onOpenChange={handleModalClose}
      />
    </div>
  );
}
