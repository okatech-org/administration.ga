"use client"

import { api } from "@convex/_generated/api"
import { PostCategory } from "@convex/lib/constants"
import Image from "next/image"
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
import { useTranslation } from "react-i18next"
import { usePreloadedQuery, type Preloaded } from "convex/react"
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
  news: "badge-info",
  event: "badge-warning",
  communique: "badge-success",
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
      className="group block bg-card rounded-xl overflow-hidden border flat-card-border hover:shadow-lg transition-all duration-300"
    >
      <div className="aspect-[16/9] overflow-hidden bg-muted relative">
        {post.coverImageUrl ? (
          <Image
            src={post.coverImageUrl}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
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

type UrlCategory = "news" | "event" | "communique"

function urlCategoryToPostCategory(
  value: UrlCategory | null,
): (typeof PostCategory)[keyof typeof PostCategory] | undefined {
  if (!value) return undefined
  return PostCategory[
    (value.charAt(0).toUpperCase() +
      value.slice(1)) as keyof typeof PostCategory
  ]
}

export function NewsPageClient({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.functions.posts.list>
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const category = searchParams.get("category") as UrlCategory | null
  const selectedCategory = urlCategoryToPostCategory(category)

  const preloadedData = usePreloadedQuery(preloaded)

  const {
    results,
    isLoading,
    status: paginationStatus,
    loadMore,
  } = usePaginatedConvexQuery(
    api.functions.posts.list,
    { category: selectedCategory },
    { initialNumItems: 20 },
  )

  // Seed from preloaded data (SSR) until the live paginated query has data.
  const posts = results.length > 0 ? results : preloadedData.page
  const canLoadMore = paginationStatus === "CanLoadMore"
  const showEmpty =
    !isLoading && results.length === 0 && preloadedData.page.length === 0

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
      <section className="bg-background py-16 px-6">
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
              "Restez informé des dernières nouvelles, événements et communiqués officiels du Consulat.",
            )}
          </p>
          <div className="gabon-stripe mt-8 max-w-xs mx-auto" />
        </div>
      </section>

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

      <section className="container mx-auto px-4 py-12">
        {showEmpty ? (
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
              {posts.map((post) => (
                <PostCard key={post._id} post={post as Post} />
              ))}
            </div>
            {canLoadMore && (
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
