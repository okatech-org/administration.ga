import { fetchQuery, preloadQuery } from "convex/nextjs"
import type { Metadata } from "next"
import { Suspense } from "react"
import { api } from "@convex/_generated/api"
import { PostCategory } from "@convex/lib/constants"
import { JsonLd } from "@/components/seo/JsonLd"
import { breadcrumbSchema, collectionPageSchema } from "@/lib/json-ld"
import { buildMetadata } from "@/lib/seo"
import NewsLoading from "./loading"
import { NewsPageClient } from "./news-page-client"

export const metadata: Metadata = buildMetadata({
  title: "Actualités et communiqués officiels",
  description:
    "Restez informé des dernières nouvelles, événements et communiqués officiels du Consulat de la République Gabonaise.",
  path: "/news",
})

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

  const [preloaded, latestPage] = await Promise.all([
    preloadQuery(api.functions.posts.list, {
      category: selectedCategory,
      paginationOpts: { numItems: 20, cursor: null },
    }),
    fetchQuery(api.functions.posts.list, {
      paginationOpts: { numItems: 30, cursor: null },
    }),
  ])

  const collectionItems = ((latestPage?.page ?? []) as Array<{
    slug?: string
    title?: string
    titleI18n?: { fr?: string } | string
    excerpt?: string
    excerptI18n?: { fr?: string } | string
  }>)
    .filter((p) => !!p.slug)
    .map((p) => {
      const title =
        typeof p.titleI18n === "object" && p.titleI18n?.fr
          ? p.titleI18n.fr
          : (p.title ?? "")
      const description =
        typeof p.excerptI18n === "object" && p.excerptI18n?.fr
          ? p.excerptI18n.fr
          : (p.excerpt ?? "")
      return {
        name: title,
        description,
        url: `/news/${p.slug}`,
      }
    })

  return (
    <>
      <JsonLd
        data={collectionPageSchema({
          name: "Actualités et communiqués officiels",
          description:
            "Dernières nouvelles, événements et communiqués officiels du Consulat de la République Gabonaise.",
          path: "/news",
          items: collectionItems,
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Accueil", path: "/" },
          { name: "Actualités", path: "/news" },
        ])}
      />
      <Suspense fallback={<NewsLoading />}>
        <NewsPageClient preloaded={preloaded} />
      </Suspense>
    </>
  )
}
