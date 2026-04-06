"use client";

import { api } from "@convex/_generated/api";
import type { CountryCode } from "@convex/lib/constants";
import { OrganizationType } from "@convex/lib/constants";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Building2,
  ChevronRight,
  Globe,
  LayoutGrid,
  Map,
  MapPin,
  Phone,
  Mail,
  Search,
} from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConvexQuery } from "@/integrations/convex/hooks";
import { FlagIcon } from "@/components/ui/flag-icon";

const ConsularMap = dynamic(
  () => import("@/components/ConsularMap").then((m) => ({ default: m.ConsularMap })),
  { ssr: false },
);

// ============================================================================
// CONTINENT CONFIGURATION
// ============================================================================

const CONTINENTS = [
  {
    id: "africa",
    nameKey: "orgs.continents.africa",
    emoji: "",
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
    emoji: "\u{1F1EA}\u{1F1FA}",
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
    id: "asia",
    nameKey: "orgs.continents.asia",
    emoji: "",
    countries: ["CN", "IN", "JP", "KR", "TR", "IR"],
  },
  {
    id: "americas",
    nameKey: "orgs.continents.americas",
    emoji: "",
    countries: ["US", "CA", "BR", "MX", "AR", "CU"],
  },
  {
    id: "middle_east",
    nameKey: "orgs.continents.middle_east",
    emoji: "",
    countries: ["SA", "AE", "QA", "KW", "LB"],
  },
];

const TYPE_COLORS: Record<string, string> = {
  embassy: "bg-emerald-500 text-white",
  general_consulate: "bg-blue-500 text-white",
  consulate: "bg-sky-500 text-white",
  high_commission: "bg-purple-500 text-white",
  permanent_mission: "bg-indigo-500 text-white",
  honorary_consulate: "bg-gray-400 text-white",
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function RepsPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryParam = searchParams.get("query") || "";
  const viewParam = (searchParams.get("view") as "map" | "grid") || "map";

  const { data: orgs } = useConvexQuery(api.functions.orgs.list, {});

  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [viewMode, setViewMode] = useState<"map" | "grid">(viewParam);
  const [selectedContinent, setSelectedContinent] = useState<string>("all");

  const isLoading = orgs === undefined;

  // Sync state with URL params
  const updateFilters = (updates: { query?: string; view?: "map" | "grid" }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (updates.query !== undefined) {
      if (updates.query) {
        params.set("query", updates.query);
      } else {
        params.delete("query");
      }
    }
    if (updates.view !== undefined) {
      params.set("view", updates.view);
    }
    router.replace(`/reps?${params.toString()}`);
  };

  // Debounced search update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== queryParam) {
        updateFilters({ query: searchQuery || undefined });
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, queryParam]);

  // View mode update
  const handleViewModeChange = (value: string) => {
    const mode = value as "map" | "grid";
    setViewMode(mode);
    updateFilters({ view: mode });
  };

  // Group orgs by country
  const orgsByCountry = useMemo(() => {
    if (!orgs) return {};
    const grouped: Record<string, typeof orgs> = {};
    orgs.forEach((org) => {
      const code = org.address.country || "XX";
      if (!grouped[code]) grouped[code] = [];
      grouped[code].push(org);
    });
    return grouped;
  }, [orgs]);

  // Get continent for country
  const getContinentForCountry = (code: string) =>
    CONTINENTS.find((c) => c.countries.includes(code));

  // Filter by search and continent
  const filteredCountries = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return Object.entries(orgsByCountry)
      .filter(([code, reps]) => {
        // Continent filter
        if (selectedContinent !== "all") {
          const continent = getContinentForCountry(code);
          if (continent?.id !== selectedContinent) return false;
        }
        // Search filter
        if (query) {
          const countryName = t(
            `superadmin.countryCodes.${code}`,
            code,
          ).toLowerCase();
          const repNames = reps.map((r) => r.name.toLowerCase()).join(" ");
          const cities = reps
            .map((r) => r.address.city?.toLowerCase() || "")
            .join(" ");
          return (
            countryName.includes(query) ||
            repNames.includes(query) ||
            cities.includes(query)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const nameA = t(`superadmin.countryCodes.${a[0]}`, a[0]);
        const nameB = t(`superadmin.countryCodes.${b[0]}`, b[0]);
        return nameA.localeCompare(nameB);
      });
  }, [orgsByCountry, searchQuery, selectedContinent]);

  // Stats
  const stats = useMemo(
    () => ({
      total: orgs?.length ?? 0,
      countries: Object.keys(orgsByCountry).length,
      ambassades:
        orgs?.filter((r) => r.type === OrganizationType.Embassy).length ?? 0,
    }),
    [orgs, orgsByCountry],
  );

  return (
    <div className="min-h-screen bg-background">
      {/* ==================== HERO SECTION ==================== */}
      <section className="bg-gradient-to-b from-primary/10 to-background py-10 md:py-16 px-4 md:px-6">
        <div className="max-w-7xl mx-auto text-center">
          <Badge
            variant="secondary"
            className="mb-4 bg-primary/10 text-primary"
          >
            {t("consulates.badge")}
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-3 md:mb-4">
            {t("orgs.pageTitle")}
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-6 md:mb-8">
            {t(
              "orgs.pageDescription",
              "Retrouvez l'ensemble des représentations diplomatiques et consulaires de la République Gabonaise à travers le monde.",
            )}
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              className="h-14 pl-12 pr-4 rounded-2xl bg-background shadow-lg border-primary/10 text-lg placeholder:text-muted-foreground/50 focus-visible:ring-primary/20"
              placeholder={t(
                "orgs.searchPlaceholder",
                "Rechercher une ambassade, un consulat, une ville...",
              )}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* ==================== CONTENT ==================== */}
      <section className="py-6 md:py-12 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Stats + View Toggle */}
          <div className="flex flex-col gap-4 items-center mb-6 md:mb-8">
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                {stats.total} {t("orgs.representations")}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {stats.countries} {t("orgs.countries")}
              </span>
              <span className="flex items-center gap-1.5">
                <Globe className="h-4 w-4" />
                {stats.ambassades} {t("map.embassy")}
              </span>
            </div>

            <Tabs
              value={viewMode}
              onValueChange={handleViewModeChange}
              className="w-full md:w-auto"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="map" className="gap-2">
                  <Map className="w-4 h-4" />
                  {t("orgs.mapView")}
                </TabsTrigger>
                <TabsTrigger value="grid" className="gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  {t("orgs.gridView")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* ==================== MAP VIEW ==================== */}
          {viewMode === "map" && (
            <div className="max-w-6xl mx-auto">
              <Suspense fallback={<Skeleton className="h-[400px] md:h-[70vh] rounded-xl md:rounded-2xl" />}>
                <ConsularMap
                  searchQuery={searchQuery}
                  className="h-[400px] md:h-[70vh] rounded-xl md:rounded-2xl"
                />
              </Suspense>
            </div>
          )}

          {/* ==================== GRID VIEW ==================== */}
          {viewMode === "grid" && (
            <div className="max-w-6xl mx-auto">
              {/* Continent Tabs */}
              <Tabs
                value={selectedContinent}
                onValueChange={setSelectedContinent}
                className="mb-6"
              >
                <TabsList
                  className="flex h-auto gap-1.5 md:gap-2 justify-start md:justify-center overflow-x-auto pb-1 w-full"
                  style={{ scrollbarWidth: "none" }}
                >
                  <TabsTrigger
                    value="all"
                    className="text-sm whitespace-nowrap shrink-0"
                  >
                     {t("orgs.allContinents")} (
                    {Object.keys(orgsByCountry).length})
                  </TabsTrigger>
                  {CONTINENTS.map((c) => {
                    const count = Object.keys(orgsByCountry).filter((code) =>
                      c.countries.includes(code),
                    ).length;
                    if (count === 0) return null;
                    return (
                      <TabsTrigger
                        key={c.id}
                        value={c.id}
                        className="text-sm whitespace-nowrap shrink-0"
                      >
                        {c.emoji} {t(c.nameKey)} ({count})
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>

              {/* Loading */}
              {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={`skeleton-${i}`} className="h-48">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-10 h-10 rounded-full" />
                          <div className="space-y-2 flex-1">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-16 w-full rounded-lg" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!isLoading && filteredCountries.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {t("orgs.noResults")}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {t(
                      "orgs.noResultsDesc",
                      "Essayez de modifier votre recherche.",
                    )}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedContinent("all");
                      updateFilters({
                        query: undefined,
                      });
                    }}
                  >
                    {t("orgs.viewAll")}
                  </Button>
                </div>
              )}

              {/* Country Cards Grid */}
              {!isLoading && filteredCountries.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCountries.map(
                    ([countryCode, representations], index) => (
                      <CountryCard
                        key={countryCode}
                        countryCode={countryCode}
                        representations={representations}
                        index={index}
                      />
                    ),
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// COUNTRY CARD COMPONENT
// ============================================================================

interface CountryCardProps {
  countryCode: string;
  representations: Array<{
    _id: string;
    name: string;
    slug: string;
    type: string;
    address: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
    phone?: string | null;
    email?: string | null;
  }>;
  index: number;
}

function CountryCard({
  countryCode,
  representations,
  index,
}: CountryCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const mainRep =
    representations.find((r) => r.type === OrganizationType.Embassy) ||
    representations[0];
  const otherReps = representations.filter((r) => r._id !== mainRep._id);

  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition-shadow"
      style={{ animationDelay: `${index * 0.03}s` }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <FlagIcon
            countryCode={countryCode as CountryCode}
            size={40}
            className="w-8 !h-auto rounded-sm"
          />
          <div>
            <CardTitle className="text-lg">
              {t(`superadmin.countryCodes.${countryCode}`, countryCode)}
            </CardTitle>
            <CardDescription>
              {representations.length}{" "}
              {t("orgs.representations")}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Main Representation */}
        <RepresentationItem rep={mainRep} isMain />

        {/* Other representations */}
        {otherReps.length > 0 && (
          <>
            {!expanded ?
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => setExpanded(true)}
              >
                +{otherReps.length}{" "}
                {t("orgs.otherRepresentations")}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            : <div className="space-y-2 pt-2 border-t">
                {otherReps.map((rep) => (
                  <RepresentationItem key={rep._id} rep={rep} />
                ))}
              </div>
            }
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// REPRESENTATION ITEM
// ============================================================================

function RepresentationItem({
  rep,
  isMain,
}: {
  rep: CountryCardProps["representations"][number];
  isMain?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Link href={`/reps/${rep.slug}`} className="block group">
      <div
        className={`rounded-lg border p-3 transition-all hover:border-primary/40 hover:shadow-sm ${isMain ? "border-primary/30 bg-primary/5" : ""}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge
                className={TYPE_COLORS[rep.type] || "bg-gray-500"}
                variant="secondary"
              >
                {t(`superadmin.types.${rep.type}`, rep.type)}
              </Badge>
              <span className="text-sm font-medium">{rep.address.city}</span>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
              {rep.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  <span>{rep.phone}</span>
                </div>
              )}
              {rep.email && (
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{rep.email}</span>
                </div>
              )}
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 mt-1" />
        </div>
      </div>
    </Link>
  );
}

export default function RepsPage() {
  return (
    <Suspense fallback={null}>
      <RepsPageContent />
    </Suspense>
  );
}
