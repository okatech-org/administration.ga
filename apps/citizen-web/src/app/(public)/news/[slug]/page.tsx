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

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await fetchQuery(api.functions.posts.getBySlug, { slug })

  if (!post) {
    return { title: "Article introuvable", robots: { index: false } }
  }

  return buildMetadata({
    title: post.title,
    description: post.excerpt,
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

  const [post, preloaded] = await Promise.all([
    fetchQuery(api.functions.posts.getBySlug, { slug }),
    preloadQuery(api.functions.posts.getBySlug, { slug }),
  ])

  if (!post) notFound()

  return (
    <>
      <JsonLd
        data={articleSchema({
          title: post.title,
          description: post.excerpt,
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
          { name: post.title, path: `/news/${slug}` },
        ])}
      />
      <PostDetailClient preloaded={preloaded} />
    </>
  )
}
