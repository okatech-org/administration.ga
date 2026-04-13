"use client";

import { api } from "@convex/_generated/api";
import { ServiceCategory } from "@convex/lib/constants";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  BookOpenCheck,
  Building2,
  FileCheck,
  FileText,
  Globe,
  LayoutGrid,
  type LucideIcon,
  Search,
  ShieldAlert,
} from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ServiceCard } from "@/components/home/ServiceCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useConvexQuery } from "@/integrations/convex/hooks";
import { getLocalizedValue } from "@/lib/i18n-utils";
import { cn } from "@/lib/utils";

function ServiceCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <Skeleton className="h-12 w-12 rounded-xl" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

function ServicesPageContent() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  const searchQuery$ = searchParams.get("query") || "";
  const selectedCategory = searchParams.get("category") || null;

  const { data: services } = useConvexQuery(
    api.functions.services.listCatalog,
    {},
  );

  const categoryConfig: Record<
    string,
    {
      icon: LucideIcon;
      color: string;
      bgColor: string;
      label: string;
      slug: string;
    }
  > = useMemo(
    () => ({
      [ServiceCategory.Passport]: {
        icon: BookOpenCheck,
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-500/10",
        label: t("services.category.passport"),
        slug: ServiceCategory.Passport,
      },
      [ServiceCategory.Visa]: {
        icon: Globe,
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-500/10",
        label: t(`services.categoriesMap.${ServiceCategory.Visa}`),
        slug: ServiceCategory.Visa,
      },
      [ServiceCategory.CivilStatus]: {
        icon: FileText,
        color: "text-yellow-600 dark:text-yellow-400",
        bgColor: "bg-yellow-500/10",
        label: t(`services.categoriesMap.${ServiceCategory.CivilStatus}`),
        slug: ServiceCategory.CivilStatus,
      },
      [ServiceCategory.Registration]: {
        icon: BookOpen,
        color: "text-purple-600 dark:text-purple-400",
        bgColor: "bg-purple-500/10",
        label: t(`services.categoriesMap.${ServiceCategory.Registration}`),
        slug: ServiceCategory.Registration,
      },
      [ServiceCategory.Certification]: {
        icon: FileCheck,
        color: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-orange-500/10",
        label: t(`services.categoriesMap.${ServiceCategory.Certification}`),
        slug: ServiceCategory.Certification,
      },
      [ServiceCategory.Assistance]: {
        icon: ShieldAlert,
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-500/10",
        label: t(`services.categoriesMap.${ServiceCategory.Assistance}`),
        slug: ServiceCategory.Assistance,
      },
      [ServiceCategory.Other]: {
        icon: FileText,
        color: "text-gray-600 dark:text-gray-400",
        bgColor: "bg-gray-500/10",
        label: t(`services.categoriesMap.${ServiceCategory.Other}`),
        slug: ServiceCategory.Other,
      },
      [ServiceCategory.Declaration]: {
        icon: Building2,
        color: "text-indigo-600 dark:text-indigo-400",
        bgColor: "bg-indigo-500/10",
        label: t("services.category.declaration"),
        slug: ServiceCategory.Declaration,
      },
    }),
    [ServiceCategory],
  );

  const [searchQuery, setSearchQuery] = useState(searchQuery$);

  // Category filter config for horizontal pill bar
  const categoryFilterConfig: {
    value: string | null;
    key: string;
    icon: LucideIcon;
    label: string;
  }[] = useMemo(
    () => [
      {
        value: null,
        key: "all",
        icon: LayoutGrid,
        label: t("services.allCategories"),
      },
      ...Object.entries(categoryConfig).map(([key, config]) => ({
        value: key,
        key: config.slug,
        icon: config.icon,
        label: config.label,
      })),
    ],
    [categoryConfig, t],
  );

  // Sync state with URL params
  const updateFilters = useCallback(
    (updates: { query?: string; category?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      const qs = params.toString();
      router.replace(qs ? `/services?${qs}` : "/services");
    },
    [router, searchParams],
  );

  // Navigate to service detail page
  const handleServiceClick = (slug: string) => {
    router.push(`/services/${slug}`);
  };

  // Debounced search update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== searchQuery$) {
        updateFilters({
          query: searchQuery || undefined,
          category: selectedCategory || undefined,
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectCategory = (cat: string | null) => {
    updateFilters({
      query: searchQuery || undefined,
      category: cat || undefined,
    });
  };

  const isLoading = services === undefined;

  const filteredServices = services?.filter((service) => {
    const serviceName = getLocalizedValue(service.name, i18n.language);
    const serviceDesc = getLocalizedValue(service.description, i18n.language);
    const matchesQuery =
      !searchQuery$ ||
      serviceName.toLowerCase().includes(searchQuery$.toLowerCase()) ||
      serviceDesc.toLowerCase().includes(searchQuery$.toLowerCase());

    const matchesCategory =
      !selectedCategory || selectedCategory === service.category;

    return matchesQuery && matchesCategory;
  });

  const clearFilters = () => {
    setSearchQuery("");
    updateFilters({ query: undefined, category: undefined });
  };

  const activeFiltersCount =
    (searchQuery$ ? 1 : 0) + (selectedCategory ? 1 : 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-background py-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <Badge
            variant="secondary"
            className="mb-4 bg-primary/10 text-primary"
          >
            {t("services.badge")}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {t("services.pageTitle")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            {t(
              "services.pageDescription",
              "Decouvrez l'ensemble des services consulaires proposes par la Republique Gabonaise pour ses citoyens a l'etranger.",
            )}
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              className="h-14 pl-12 pr-4 rounded-2xl bg-background shadow-lg border-primary/10 text-lg placeholder:text-muted-foreground/50 focus-visible:ring-primary/20"
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

      {/* Sticky Category Filter Bar */}
      <section className="sticky top-0 bg-background/50 backdrop-blur-sm z-10 border-b">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-2 py-3 overflow-x-auto">
            {categoryFilterConfig.map((cat) => {
              const Icon = cat.icon;
              const isActive =
                selectedCategory === cat.value ||
                (!selectedCategory && cat.value === null);
              return (
                <Button
                  variant="ghost"
                  key={cat.key}
                  onClick={() => selectCategory(cat.value)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                    isActive ?
                      "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {cat.label}
                </Button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {filteredServices ?
                `${filteredServices.length} service${filteredServices.length > 1 ? "s" : ""}`
              : "Chargement..."}
            </h2>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={clearFilters}
              >
                {t("services.clearAll")}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ?
              Array.from({ length: 6 }).map((_, i) => (
                <ServiceCardSkeleton key={i} />
              ))
            : filteredServices?.length === 0 ?
              <div className="col-span-full py-12 text-center rounded-xl bg-muted/30 border-2 border-dashed">
                <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-4 border">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Aucun service trouve
                </h3>
                <p className="text-muted-foreground mb-4">
                  Essayez de modifier vos filtres ou votre recherche.
                </p>
                <Button onClick={clearFilters} variant="outline">
                  Voir tous les services
                </Button>
              </div>
            : filteredServices?.map((service) => {
                const config =
                  categoryConfig[service.category] ||
                  categoryConfig[ServiceCategory.Other];
                const suffix =
                  service.category === ServiceCategory.Identity ? "passport"
                  : service.category === ServiceCategory.Certification ?
                    "legalization"
                  : service.category === ServiceCategory.Assistance ?
                    "emergency"
                  : service.category;
                const categoryLabel = t(`services.categoriesMap.${suffix}`);
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
                      service.estimatedDays ?
                        `${service.estimatedDays} ${t("services.days", { count: service.estimatedDays, defaultValue: "jour(s)" })}`
                      : undefined
                    }
                    onClick={() => handleServiceClick(service.slug)}
                  />
                );
              })
            }
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={null}>
      <ServicesPageContent />
    </Suspense>
  );
}
