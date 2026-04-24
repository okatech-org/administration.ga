import { preloadQuery } from "convex/nextjs"
import type { Metadata } from "next"
import { Suspense } from "react"
import { api } from "@convex/_generated/api"
import { PostCategory } from "@convex/lib/constants"
import NewsLoading from "./loading"
import { NewsPageClient } from "./news-page-client"

export const metadata: Metadata = {
  title: "Actualités | Consulat.ga",
  description:
    "Restez informé des dernières nouvelles, événements et communiqués officiels du Consulat du Gabon.",
  openGraph: {
    type: "website",
    title: "Actualités — Consulat.ga",
    description:
      "Restez informé des dernières nouvelles, événements et communiqués officiels du Consulat du Gabon.",
    url: "/news",
    siteName: "Consulat.ga",
  },
  twitter: {
    card: "summary",
    title: "Actualités — Consulat.ga",
    description:
      "Restez informé des dernières nouvelles, événements et communiqués officiels du Consulat du Gabon.",
  },
}

function urlCategoryToPostCategory(value: string | undefined) {
  if (!value) return undefined
  if (!["news", "event", "communique"].includes(value)) return undefined
  return PostCategory[
    (value.charAt(0).toUpperCase() +
      value.slice(1)) as keyof typeof PostCategory
  ]
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const selectedCategory = urlCategoryToPostCategory(category)

  const preloaded = await preloadQuery(api.functions.posts.list, {
    category: selectedCategory,
    paginationOpts: { numItems: 20, cursor: null },
  })

  return (
    <Suspense fallback={<NewsLoading />}>
      <NewsPageClient preloaded={preloaded} />
    </Suspense>
  )
}
