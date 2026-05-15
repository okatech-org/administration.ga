import { fetchQuery } from "convex/nextjs"
import type { Metadata } from "next"
import { api } from "@convex/_generated/api"
import { JsonLd } from "@/components/seo/JsonLd"
import { breadcrumbSchema } from "@/lib/json-ld"
import { buildMetadata } from "@/lib/seo"
import { TutorialDetailClient } from "./tutorial-detail-client"

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

  return (
    <>
      {tutorial && (
        <JsonLd
          data={breadcrumbSchema([
            { name: "Accueil", path: "/" },
            { name: "Ressources", path: "/ressources" },
            {
              name: tutorial.titleI18n
                ? pickFr(tutorial.titleI18n)
                : tutorial.title,
              path: `/ressources/${slug}`,
            },
          ])}
        />
      )}
      <TutorialDetailClient />
    </>
  )
}
