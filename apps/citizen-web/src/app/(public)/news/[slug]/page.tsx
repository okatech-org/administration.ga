import { fetchQuery, preloadQuery } from "convex/nextjs"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { api } from "@convex/_generated/api"
import { JsonLd } from "@/components/seo/JsonLd"
import { articleSchema, breadcrumbSchema } from "@/lib/json-ld"
import { buildMetadata } from "@/lib/seo"
import { PostDetailClient } from "./post-detail-client"

type PageProps = {
  params: Promise<{ slug: string }>
}

function pickFr(value: unknown): string {
  if (typeof value === "string") return value
  if (value && typeof value === "object" && "fr" in value) {
    return String((value as { fr: string }).fr ?? "")
  }
  return ""
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await fetchQuery(api.functions.posts.getBySlug, { slug })

  if (!post) {
    return { title: "Article introuvable", robots: { index: false } }
  }

  const title = post.titleI18n ? pickFr(post.titleI18n) : post.title
  const description = post.excerptI18n
    ? pickFr(post.excerptI18n)
    : post.excerpt

  return buildMetadata({
    title,
    description,
    path: `/news/${slug}`,
    type: "article",
    image: post.coverImageUrl ?? undefined,
    publishedTime: post.publishedAt
      ? new Date(post.publishedAt).toISOString()
      : undefined,
    modifiedTime: new Date(post._creationTime).toISOString(),
  })
}

export default async function PostDetailPage({ params }: PageProps) {
  const { slug } = await params

  const [post, preloaded, related] = await Promise.all([
    fetchQuery(api.functions.posts.getBySlug, { slug }),
    preloadQuery(api.functions.posts.getBySlug, { slug }),
    fetchQuery(api.functions.posts.getRelated, { slug, limit: 3 }),
  ])

  if (!post) notFound()

  const title = post.titleI18n ? pickFr(post.titleI18n) : post.title
  const description = post.excerptI18n
    ? pickFr(post.excerptI18n)
    : post.excerpt

  return (
    <>
      <JsonLd
        data={articleSchema({
          title,
          description,
          slug,
          image: post.coverImageUrl ?? undefined,
          publishedAt: post.publishedAt,
          updatedAt: post._creationTime,
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Accueil", path: "/" },
          { name: "Actualités", path: "/news" },
          { name: title, path: `/news/${slug}` },
        ])}
      />
      <PostDetailClient preloaded={preloaded} related={related} />
    </>
  )
}
