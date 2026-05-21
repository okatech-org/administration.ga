import { fetchQuery, preloadQuery } from "convex/nextjs"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { api } from "@convex/_generated/api"
import { JsonLd } from "@/components/seo/JsonLd"
import { getLocalizedValue } from "@/lib/i18n-utils"
import {
  breadcrumbSchema,
  serviceSchema,
} from "@/lib/json-ld"
import { buildMetadata } from "@/lib/seo"
import { ServiceDetailClient } from "./service-detail-client"

type PageProps = {
  params: Promise<{ slug: string }>
}

export const revalidate = 3600

export async function generateStaticParams() {
  try {
    const entries = await fetchQuery(api.functions.seo.getSitemapEntries, {})
    return entries.services.slice(0, 100).map((s) => ({ slug: s.slug }))
  } catch (error) {
    console.error("[services/[slug]] generateStaticParams failed", error)
    return []
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const service = await fetchQuery(api.functions.services.getBySlug, { slug })

  if (!service) {
    return { title: "Service introuvable", robots: { index: false } }
  }

  const name = getLocalizedValue(service.name, "fr")
  const description = getLocalizedValue(service.description, "fr")

  return buildMetadata({
    title: name,
    description,
    path: `/services/${slug}`,
  })
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { slug } = await params

  const [service, preloaded] = await Promise.all([
    fetchQuery(api.functions.services.getBySlug, { slug }),
    preloadQuery(api.functions.services.getBySlug, { slug }),
  ])

  if (!service) notFound()

  const name = getLocalizedValue(service.name, "fr")
  const description = getLocalizedValue(service.description, "fr")

  return (
    <>
      <JsonLd
        data={serviceSchema({
          name,
          description,
          slug,
          category: service.category as string | undefined,
          serviceType: (service as { serviceType?: string }).serviceType,
          price: (service as { price?: number }).price,
          currency: (service as { currency?: string }).currency,
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Accueil", path: "/" },
          { name: "Services", path: "/services" },
          { name, path: `/services/${slug}` },
        ])}
      />
      <ServiceDetailClient preloaded={preloaded} />
    </>
  )
}
