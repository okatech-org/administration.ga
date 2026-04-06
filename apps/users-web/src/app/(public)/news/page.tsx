"use client"

import { api } from "@convex/_generated/api"
import { PostCategory } from "@convex/lib/constants"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import {
  Calendar,
  CalendarDays,
  FileText,
  MapPin,
  Megaphone,
  Newspaper,
} from "lucide-react"
import { Suspense } from "react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { usePaginatedConvexQuery } from "@/integrations/convex/hooks"
import { cn } from "@/lib/utils"

const categoryConfig = [
  { value: null, key: "all", icon: Newspaper },
  { value: PostCategory.News, key: "news", icon: Newspaper },
  { value: PostCategory.Event, key: "event", icon: CalendarDays },
  { value: PostCategory.Announcement, key: "communique", icon: Megaphone },
] as const

const badgeStyles = {
  news: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  event: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  communique:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
} as const

function CategoryBadge({ category }: { category: string }) {
  const { t } = useTranslation()
  const style =
    badgeStyles[category as keyof typeof badgeStyles] ??
    "bg-gray-100 text-gray-800"

  return (
    <span
      className={cn("text-xs font-medium px-2.5 py-0.5 rounded-full", style)}
    >
      {t(`news.categories.${category}`, category)}
    </span>
  )
}

interface Post {
  _id: string
  slug: string
  title: string
  excerpt: string
  category: string
  coverImageUrl: string | null
  documentUrl?: string | null
  publishedAt?: number
  eventStartAt?: number
  eventLocation?: string
}

function PostCard({ post }: { post: Post }) {
  const isEvent = post.category === PostCategory.Event

  return (
    <Link
      href={`/news/${post.slug}`}
      className="group block bg-card rounded-xl overflow-hidden border hover:shadow-lg transition-all duration-300"
    >
      {/* Image */}
      <div className="aspect-[16/9] overflow-hidden bg-muted">
        {post.coverImageUrl ? (
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {post.category === PostCategory.Event ? (
              <CalendarDays className="h-12 w-12 text-muted-foreground/30" />
            ) : post.category === PostCategory.Announcement ? (
              <FileText className="h-12 w-12 text-muted-foreground/30" />
            ) : (
              <Newspaper className="h-12 w-12 text-muted-foreground/30" />
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <CategoryBadge category={post.category} />
          {post.publishedAt && (
            <span className="text-xs text-muted-foreground">
              {format(new Date(post.publishedAt), "d MMM yyyy", { locale: fr })}
            </span>
          )}
        </div>

        <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {post.title}
        </h3>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {post.excerpt}
        </p>

        {/* Event specific info */}
        {isEvent && post.eventStartAt && (
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {format(new Date(post.eventStartAt), "d MMM yyyy", {
                  locale: fr,
                })}
              </span>
            </div>
            {post.eventLocation && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate max-w-[150px]">
                  {post.eventLocation}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Communique specific */}
        {post.category === PostCategory.Announcement && post.documentUrl && (
          <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <FileText className="h-3.5 w-3.5" />
            <span>Document officiel joint</span>
          </div>
        )}
      </div>
    </Link>
  )
}

function NewsPageContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const category = searchParams.get("category") as
    | "news"
    | "event"
    | "communique"
    | null

  // Map URL param to PostCategory value
  const selectedCategory =
    category
      ? PostCategory[
          (category.charAt(0).toUpperCase() +
            category.slice(1)) as keyof typeof PostCategory
        ]
      : undefined

  const {
    results: posts,
    isLoading,
    status: paginationStatus,
    loadMore,
  } = usePaginatedConvexQuery(
    api.functions.posts.list,
    {
      category: selectedCategory,
    },
    { initialNumItems: 20 },
  )

  const handleCategoryChange = (
    value: (typeof PostCategory)[keyof typeof PostCategory] | null,
  ) => {
    if (value === null) {
      router.push("/news")
    } else {
      const params = new URLSearchParams()
      params.set("category", value)
      router.push(`/news?${params.toString()}`)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/10 to-background py-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <Badge
            variant="secondary"
            className="mb-4 bg-primary/10 text-primary"
          >
            {t("news.badge")}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {t("news.title")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t(
              "news.subtitle",
              "Restez informe des dernieres nouvelles, evenements et communiques officiels du Consulat.",
            )}
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-0 bg-background/50 backdrop-blur-sm z-10">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 py-2 overflow-x-auto">
            {categoryConfig.map((cat) => {
              const Icon = cat.icon
              const isActive =
                category === cat.value || (!category && cat.value === null)
              return (
                <Button
                  variant={"ghost"}
                  key={cat.key}
                  onClick={() => handleCategoryChange(cat.value)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t(`news.categories.${cat.key}`, cat.key)}
                </Button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="container mx-auto px-4 py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-card rounded-xl overflow-hidden border animate-pulse"
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
        ) : !posts || posts.length === 0 ? (
          <div className="text-center py-16">
            <Newspaper className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {t("news.empty")}
            </h3>
            <p className="text-muted-foreground">
              {t(
                "news.emptyHint",
                "Revenez bientot pour decouvrir les dernieres nouvelles.",
              )}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post: any) => (
                <PostCard key={post._id} post={post} />
              ))}
            </div>
            {paginationStatus === "CanLoadMore" && (
              <div className="flex justify-center mt-8">
                <Button variant="outline" onClick={() => loadMore(20)}>
                  Charger plus
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

export default function NewsPage() {
  return (
    <Suspense fallback={null}>
      <NewsPageContent />
    </Suspense>
  )
}
