import { fetchQuery, preloadQuery } from "convex/nextjs"
import type { Metadata } from "next"
import { Suspense } from "react"
import { api } from "@convex/_generated/api"
import { JsonLd } from "@/components/seo/JsonLd"
import { breadcrumbSchema, collectionPageSchema } from "@/lib/json-ld"
import { buildMetadata } from "@/lib/seo"
import RepsLoading from "./loading"
import { RepsPageClient } from "./reps-page-client"

export const metadata: Metadata = buildMetadata({
  title: "Annuaire des administrations",
  description:
    "Annuaire des administrations publiques gabonaises : ministères, directions générales, établissements publics — adresses, horaires, coordonnées et services disponibles.",
  path: "/reps",
})

export default async function RepsPage() {
  const [preloaded, orgs] = await Promise.all([
    preloadQuery(api.functions.orgs.list, {}),
    fetchQuery(api.functions.orgs.list, {}),
  ])

  const collectionItems = ((orgs ?? []) as Array<{
    slug?: string
    name?: string
    address?: { city?: string; country?: string }
  }>)
    .filter((o) => !!o.slug)
    .slice(0, 30)
    .map((o) => ({
      name: o.name ?? "",
      description:
        o.address?.city && o.address?.country
          ? `${o.address.city}, ${o.address.country}`
          : undefined,
      url: `/reps/${o.slug}`,
    }))

  return (
    <>
      <JsonLd
        data={collectionPageSchema({
          name: "Annuaire des administrations de la République Gabonaise",
          description:
            "Annuaire des administrations gabonaises (ministères, DG, EP), avec adresses, horaires et services disponibles.",
          path: "/reps",
          items: collectionItems,
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Accueil", path: "/" },
          { name: "Représentations", path: "/reps" },
        ])}
      />
      <Suspense fallback={<RepsLoading />}>
        <RepsPageClient preloaded={preloaded} />
      </Suspense>
    </>
  )
}
