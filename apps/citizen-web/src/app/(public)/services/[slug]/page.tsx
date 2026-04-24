import { fetchQuery, preloadQuery } from "convex/nextjs"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { api } from "@convex/_generated/api"
import { getLocalizedValue } from "@/lib/i18n-utils"
import { ServiceDetailClient } from "./service-detail-client"

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const service = await fetchQuery(api.functions.services.getBySlug, { slug })

  if (!service) {
    return { title: "Service introuvable | Consulat.ga" }
  }

  const name = getLocalizedValue(service.name, "fr")
  const description = getLocalizedValue(service.description, "fr")

  return {
    title: `${name} | Services consulaires`,
    description,
    openGraph: {
      type: "website",
      title: `${name} — Consulat.ga`,
      description,
      siteName: "Consulat.ga",
    },
    twitter: {
      card: "summary",
      title: `${name} — Consulat.ga`,
      description,
    },
  }
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { slug } = await params

  const [service, preloaded] = await Promise.all([
    fetchQuery(api.functions.services.getBySlug, { slug }),
    preloadQuery(api.functions.services.getBySlug, { slug }),
  ])

  if (!service) notFound()

  return <ServiceDetailClient preloaded={preloaded} />
}
