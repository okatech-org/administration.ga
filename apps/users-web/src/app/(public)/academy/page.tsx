"use client";

import { api } from "@convex/_generated/api";
import { TutorialCategory, TutorialType } from "@convex/lib/constants";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  Clock,
  FileText,
  GraduationCap,
  PlayCircle,
  Search,
} from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { useConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

const categoryConfig = [
  { value: null, key: "all", icon: BookOpen },
  {
    value: TutorialCategory.Administrative,
    key: "administratif",
    icon: FileText,
  },
  {
    value: TutorialCategory.Entrepreneurship,
    key: "entrepreneuriat",
    icon: GraduationCap,
  },
  { value: TutorialCategory.Travel, key: "voyage", icon: GraduationCap },
  {
    value: TutorialCategory.PracticalLife,
    key: "vie_pratique",
    icon: BookOpen,
  },
] as const;

const typeIcons: Record<string, typeof PlayCircle> = {
  [TutorialType.Video]: PlayCircle,
  [TutorialType.Article]: FileText,
  [TutorialType.Guide]: BookOpen,
};

const typeBadgeStyles: Record<string, string> = {
  [TutorialType.Video]: "badge-destructive",
  [TutorialType.Article]: "badge-info",
  [TutorialType.Guide]: "badge-success",
};

function AcademyPageContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const category = searchParams.get("category") ?? undefined;
  const [searchQuery, setSearchQuery] = useState("");

  const selectedCategory =
    category ? (category as TutorialCategory) : undefined;

  const { data: tutorials, isLoading } = useConvexQuery(
    api.functions.tutorials.list,
    { category: selectedCategory, limit: 50 },
  );

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!tutorials) return [];
    if (!searchQuery.trim()) return tutorials;
    const q = searchQuery.toLowerCase();
    return tutorials.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.excerpt.toLowerCase().includes(q),
    );
  }, [tutorials, searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-background py-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <Badge
            variant="secondary"
            className="mb-4 bg-primary/10 text-primary"
          >
            {t("academy.badge")}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {t("academy.title")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t(
              "academy.subtitle",
              "Guides pratiques, tutoriels vidéo et articles pour simplifier vos démarches.",
            )}
          </p>
          <div className="gabon-stripe mt-8 max-w-xs mx-auto" />
          <div className="mt-8 max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10 rounded-full"
              placeholder={t(
                "academy.searchPlaceholder",
                "Rechercher un guide...",
              )}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Category Filters */}
      <section className="sticky top-0 bg-background/50 backdrop-blur-sm z-10">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 py-2 overflow-x-auto">
            {categoryConfig.map((cat) => {
              const Icon = cat.icon;
              const isActive =
                category === cat.value || (!category && cat.value === null);
              return (
                <Link
                  key={cat.key}
                  href={cat.value ? `/academy?category=${cat.value}` : "/academy"}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                      isActive ?
                        "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {t(`academy.categories.${cat.key}`, cat.key)}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tutorials Grid */}
      <section className="container mx-auto px-4 py-12">
        {isLoading ?
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-card rounded-xl overflow-hidden border flat-card-border animate-pulse"
              >
                <div className="aspect-[16/9] bg-muted" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-20 bg-muted rounded" />
                  <div className="h-6 w-full bg-muted rounded" />
                  <div className="h-4 w-3/4 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        : filtered.length === 0 ?
          <div className="text-center py-20">
            <GraduationCap className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {t("academy.empty.title")}
            </h3>
            <p className="text-muted-foreground">
              {t(
                "academy.empty.description",
                "De nouveaux guides seront bientôt publiés.",
              )}
            </p>
          </div>
        : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((tutorial) => {
              const TypeIcon = typeIcons[tutorial.type] ?? BookOpen;
              return (
                <Link
                  key={tutorial._id}
                  href={`/academy/${tutorial.slug}`}
                  className="block"
                >
                  <Card className="pt-0 group overflow-hidden border flat-card-border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                    {/* Cover */}
                    <div className="aspect-[16/9] bg-muted overflow-hidden relative">
                      {tutorial.coverImageUrl ?
                        <img
                          src={tutorial.coverImageUrl}
                          alt={tutorial.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/20">
                          <GraduationCap className="h-12 w-12 text-primary/30" />
                        </div>
                      }
                      {/* Type badge */}
                      <span
                        className={cn(
                          "absolute top-3 left-3 text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1",
                          typeBadgeStyles[tutorial.type] ??
                            "bg-gray-100 text-gray-800",
                        )}
                      >
                        <TypeIcon className="h-3.5 w-3.5" />
                        {t(`academy.types.${tutorial.type}`, tutorial.type)}
                      </span>
                    </div>

                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {t(
                            `academy.categories.${tutorial.category}`,
                            tutorial.category,
                          )}
                        </Badge>
                        {tutorial.duration && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {tutorial.duration}
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-lg line-clamp-2">
                        {tutorial.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="line-clamp-2">
                        {tutorial.excerpt}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        }
      </section>
    </div>
  );
}

export default function AcademyPage() {
  return (
    <Suspense fallback={null}>
      <AcademyPageContent />
    </Suspense>
  );
}
