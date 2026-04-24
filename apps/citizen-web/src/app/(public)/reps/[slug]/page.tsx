import { fetchQuery, preloadQuery } from "convex/nextjs"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { api } from "@convex/_generated/api"
import { OrgDetailClient } from "./org-detail-client"

type PageProps = {
  params: Promise<{ slug: string }>
}

const countryNames: Record<string, string> = {
  FR: "France",
  BE: "Belgique",
  US: "États-Unis",
  GB: "Royaume-Uni",
  DE: "Allemagne",
  ES: "Espagne",
  IT: "Italie",
  CH: "Suisse",
  CA: "Canada",
  GA: "Gabon",
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const org = await fetchQuery(api.functions.orgs.getBySlug, { slug })

  if (!org) {
    return { title: "Représentation introuvable | Consulat.ga" }
  }

  const countryName = countryNames[org.address.country] || org.address.country
  const description = `${org.name} — ${org.address.city}, ${countryName}. Coordonnées, horaires et services consulaires.`

  return {
    title: `${org.name} | Consulat.ga`,
    description,
    openGraph: {
      type: "website",
      title: `${org.name} — Consulat.ga`,
      description,
      siteName: "Consulat.ga",
    },
    twitter: {
      card: "summary",
      title: `${org.name} — Consulat.ga`,
      description,
    },
  }
}

export default async function OrgDetailPage({ params }: PageProps) {
  const { slug } = await params

  const [org, preloaded] = await Promise.all([
    fetchQuery(api.functions.orgs.getBySlug, { slug }),
    preloadQuery(api.functions.orgs.getBySlug, { slug }),
  ])

  if (!org) notFound()

  return <OrgDetailClient preloaded={preloaded} />
}
