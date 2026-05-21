import { fetchQuery, preloadQuery } from "convex/nextjs"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { api } from "@convex/_generated/api"
import { JsonLd } from "@/components/seo/JsonLd"
import { breadcrumbSchema, governmentOfficeSchema } from "@/lib/json-ld"
import { buildMetadata } from "@/lib/seo"
import { OrgDetailClient } from "./org-detail-client"

type PageProps = {
  params: Promise<{ slug: string }>
}

export const revalidate = 3600

export async function generateStaticParams() {
  try {
    const entries = await fetchQuery(api.functions.seo.getSitemapEntries, {})
    return entries.orgs.slice(0, 100).map((o) => ({ slug: o.slug }))
  } catch (error) {
    console.error("[reps/[slug]] generateStaticParams failed", error)
    return []
  }
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
    return { title: "Représentation introuvable", robots: { index: false } }
  }

  const countryName = countryNames[org.address.country] || org.address.country
  const description = `${org.name} — ${org.address.city}, ${countryName}. Coordonnées, horaires et services disponibles.`

  return buildMetadata({
    title: org.name,
    description,
    path: `/reps/${slug}`,
  })
}

export default async function OrgDetailPage({ params }: PageProps) {
  const { slug } = await params

  const [org, preloaded] = await Promise.all([
    fetchQuery(api.functions.orgs.getBySlug, { slug }),
    preloadQuery(api.functions.orgsPublic.publicDetails, { slug }),
  ])

  if (!org) notFound()

  const countryName = countryNames[org.address.country] || org.address.country
  const description = `${org.name} — ${org.address.city}, ${countryName}. Coordonnées, horaires et services disponibles.`

  return (
    <>
      <JsonLd
        data={governmentOfficeSchema({
          name: org.name,
          slug,
          description,
          street: org.address.street,
          city: org.address.city,
          postalCode: (org.address as { postalCode?: string }).postalCode,
          country: countryName,
          phone: (org as { phone?: string }).phone,
          email: (org as { email?: string }).email,
          latitude: (org.address as { latitude?: number }).latitude,
          longitude: (org.address as { longitude?: number }).longitude,
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Accueil", path: "/" },
          { name: "Représentations", path: "/reps" },
          { name: org.name, path: `/reps/${slug}` },
        ])}
      />
      <OrgDetailClient preloaded={preloaded} />
    </>
  )
}
