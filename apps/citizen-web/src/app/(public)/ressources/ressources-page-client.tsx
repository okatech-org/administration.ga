"use client"

import { api } from "@convex/_generated/api"
import { TutorialCategory, TutorialType } from "@convex/lib/constants"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  ArrowRight,
  BookOpen,
  Clock,
  FileText,
  GraduationCap,
  PlayCircle,
  Search,
} from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { LocationBanner } from "@/components/guides/LocationBanner"
import { FeatureGuides } from "@/components/blocks/feature-guides"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useConvexQuery } from "@/integrations/convex/hooks"
import { cn } from "@/lib/utils"

const categoryConfig = [
  { value: null, key: "all", icon: BookOpen },
  { value: TutorialCategory.Administrative, key: "administratif", icon: FileText },
  { value: TutorialCategory.Entrepreneurship, key: "entrepreneuriat", icon: GraduationCap },
  { value: TutorialCategory.Travel, key: "voyage", icon: GraduationCap },
  { value: TutorialCategory.PracticalLife, key: "vie_pratique", icon: BookOpen },
] as const

const typeIcons: Record<string, typeof PlayCircle> = {
  [TutorialType.Video]: PlayCircle,
  [TutorialType.Article]: FileText,
  [TutorialType.Guide]: BookOpen,
}

const typeBadgeStyles: Record<string, string> = {
  [TutorialType.Video]: "badge-destructive",
  [TutorialType.Article]: "badge-info",
  [TutorialType.Guide]: "badge-success",
}

export default function RessourcesPage() {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const category = searchParams.get("category") as TutorialCategory | null
  const [searchQuery, setSearchQuery] = useState("")

  const selectedCategory = category ?? undefined

  const { data: tutorials, isLoading } = useConvexQuery(
    api.functions.tutorials.list,
    { category: selectedCategory, limit: 50 },
  )

  const filtered = useMemo(() => {
    if (!tutorials) return []
    if (!searchQuery.trim()) return tutorials
    const q = searchQuery.toLowerCase()
    return tutorials.filter(
      (tut) =>
        tut.title.toLowerCase().includes(q) ||
        tut.excerpt.toLowerCase().includes(q),
    )
  }, [tutorials, searchQuery])

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-20 lg:py-40 bg-[oklch(0.145_0_0)] text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block mb-4 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-white/80">
            {t("ressources.badge")}
          </span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-[-0.02em] text-white mb-4">
            {t("ressources.title")}
          </h1>
          <p className="text-lg md:text-xl text-[oklch(0.7_0_0)] max-w-2xl mx-auto">
            {t(
              "ressources.subtitle",
              "Retrouvez toutes les informations essentielles pour vos demarches consulaires, la vie pratique, l'education ainsi que nos guides et tutoriels.",
            )}
          </p>
          <div className="mt-8 max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              className="pl-10 rounded-[10px] bg-white/5 border border-white/10 text-white placeholder:text-white/40"
              placeholder={t("academy.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Section 1: Guides Personnalises */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <LocationBanner />
          </div>
          <FeatureGuides />
        </div>
      </section>

      {/* Section 2: Filtres tutoriels */}
      <section className="sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b border-t border-border pt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground mb-4 text-center">
            {t("academy.guidesTitle")}
          </h2>
          <div className="flex gap-2 py-2 overflow-x-auto justify-center">
            {categoryConfig.map((cat) => {
              const Icon = cat.icon
              const isActive =
                category === cat.value || (!category && cat.value === null)
              return (
                <Link
                  key={cat.key}
                  href={cat.value ? `/ressources?category=${cat.value}` : "/ressources"}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {t(`academy.categories.${cat.key}`, cat.key)}
                  </Button>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Tutorials Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-card rounded-[10px] overflow-hidden border border-border animate-pulse"
                >
                  <div className="aspect-video bg-muted" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 w-20 bg-muted rounded" />
                    <div className="h-6 w-full bg-muted rounded" />
                    <div className="h-4 w-3/4 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <GraduationCap className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {t("academy.empty.title")}
              </h3>
              <p className="text-muted-foreground">
                {t(
                  "academy.empty.description",
                  "De nouveaux guides seront bientot publies.",
                )}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((tutorial) => {
                const TypeIcon = typeIcons[tutorial.type] ?? BookOpen
                return (
                  <Link
                    key={tutorial._id}
                    href={`/ressources/${tutorial.slug}`}
                    className="block"
                  >
                    <Card className="pt-0 group overflow-hidden border border-border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                      <div className="aspect-video bg-muted overflow-hidden relative">
                        {tutorial.coverImageUrl ? (
                          <Image
                            src={tutorial.coverImageUrl}
                            alt={tutorial.title}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-primary/5 to-primary/20">
                            <GraduationCap className="h-12 w-12 text-primary/30" />
                          </div>
                        )}
                        <span
                          className={cn(
                            "absolute top-3 left-3 text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1",
                            typeBadgeStyles[tutorial.type] ?? "bg-gray-100 text-gray-800",
                          )}
                        >
                          <TypeIcon className="h-3.5 w-3.5" />
                          {t(`academy.types.${tutorial.type}`, tutorial.type)}
                        </span>
                      </div>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {t(`academy.categories.${tutorial.category}`, tutorial.category)}
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
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
