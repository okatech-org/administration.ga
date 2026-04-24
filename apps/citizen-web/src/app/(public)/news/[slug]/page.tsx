import { fetchQuery, preloadQuery } from "convex/nextjs"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { api } from "@convex/_generated/api"
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
    return { title: "Article introuvable | Consulat.ga" }
  }

  const images = post.coverImageUrl ? [{ url: post.coverImageUrl }] : undefined

  return {
    title: `${post.title} | Consulat.ga`,
    description: post.excerpt,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.publishedAt
        ? new Date(post.publishedAt).toISOString()
        : undefined,
      images,
      siteName: "Consulat.ga",
    },
    twitter: {
      card: post.coverImageUrl ? "summary_large_image" : "summary",
      title: post.title,
      description: post.excerpt,
      images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    },
  }
}

export default async function PostDetailPage({ params }: PageProps) {
  const { slug } = await params

  const [post, preloaded] = await Promise.all([
    fetchQuery(api.functions.posts.getBySlug, { slug }),
    preloadQuery(api.functions.posts.getBySlug, { slug }),
  ])

  if (!post) notFound()

  return <PostDetailClient preloaded={preloaded} />
}
