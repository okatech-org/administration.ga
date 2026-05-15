import { fetchQuery } from "convex/nextjs"
import type { Metadata } from "next"
import { api } from "@convex/_generated/api"
import { JsonLd } from "@/components/seo/JsonLd"
import { articleSchema, breadcrumbSchema } from "@/lib/json-ld"
import { buildMetadata } from "@/lib/seo"
import { TutorialDetailClient } from "./tutorial-detail-client"

type PageProps = {
  params: Promise<{ slug: string }>
}

export const revalidate = 3600

export async function generateStaticParams() {
  try {
    const entries = await fetchQuery(api.functions.seo.getSitemapEntries, {})
    return entries.tutorials.slice(0, 100).map((t) => ({ slug: t.slug }))
  } catch (error) {
    console.error("[ressources/[slug]] generateStaticParams failed", error)
    return []
  }
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
  const tutorial = await fetchQuery(api.functions.tutorials.getBySlug, {
    slug,
  })

  if (!tutorial) {
    return { title: "Ressource introuvable", robots: { index: false } }
  }

  const title = tutorial.titleI18n ? pickFr(tutorial.titleI18n) : tutorial.title
  const description = tutorial.excerptI18n
    ? pickFr(tutorial.excerptI18n)
    : tutorial.excerpt

  return buildMetadata({
    title,
    description,
    path: `/ressources/${slug}`,
    type: "article",
    image: tutorial.coverImageUrl ?? undefined,
    publishedTime: tutorial.publishedAt
      ? new Date(tutorial.publishedAt).toISOString()
      : undefined,
  })
}

export default async function TutorialDetailPage({ params }: PageProps) {
  const { slug } = await params
  const tutorial = await fetchQuery(api.functions.tutorials.getBySlug, {
    slug,
  })

  const title = tutorial?.titleI18n
    ? pickFr(tutorial.titleI18n)
    : tutorial?.title ?? ""
  const description = tutorial?.excerptI18n
    ? pickFr(tutorial.excerptI18n)
    : tutorial?.excerpt ?? ""

  return (
    <>
      {tutorial && (
        <>
          <JsonLd
            data={articleSchema({
              title,
              description,
              slug,
              basePath: "/ressources",
              image: tutorial.coverImageUrl ?? undefined,
              publishedAt: tutorial.publishedAt,
              updatedAt:
                (tutorial as { updatedAt?: number }).updatedAt ??
                tutorial._creationTime,
              articleSection:
                (tutorial as { category?: string }).category,
              keywords: (tutorial as { tags?: string[] }).tags,
              techArticle: true,
              speakable: true,
            })}
          />
          <JsonLd
            data={breadcrumbSchema([
              { name: "Accueil", path: "/" },
              { name: "Ressources", path: "/ressources" },
              { name: title, path: `/ressources/${slug}` },
            ])}
          />
        </>
      )}
      <TutorialDetailClient />
    </>
  )
}
