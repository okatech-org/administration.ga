import { fetchQuery, preloadQuery } from "convex/nextjs"
import type { Metadata } from "next"
import { Suspense } from "react"
import { api } from "@convex/_generated/api"
import { JsonLd } from "@/components/seo/JsonLd"
import { getLocalizedValue } from "@/lib/i18n-utils"
import { breadcrumbSchema, collectionPageSchema } from "@/lib/json-ld"
import { buildMetadata } from "@/lib/seo"
import ServicesLoading from "./loading"
import { ServicesPageClient } from "./services-page-client"

export const metadata: Metadata = buildMetadata({
  title: "Services consulaires",
  description:
    "Découvrez l'ensemble des services consulaires proposés par la République Gabonaise pour ses citoyens à l'étranger : passeport, visa, état civil, légalisation et plus encore.",
  path: "/services",
})

export default async function ServicesPage() {
  const [preloadedServices, preloadedStats, preloadedFeatured, allServices] =
    await Promise.all([
      preloadQuery(api.functions.services.listCatalog, {}),
      preloadQuery(api.functions.services.getCatalogStats, {}),
      preloadQuery(api.functions.services.getFeaturedService, {}),
      fetchQuery(api.functions.services.listCatalog, {}),
    ])

  const collectionItems = (allServices ?? []).slice(0, 30).map((s) => ({
    name: getLocalizedValue(s.name, "fr"),
    description: getLocalizedValue(s.description, "fr"),
    url: `/services/${s.slug}`,
  }))

  return (
    <>
      <JsonLd
        data={collectionPageSchema({
          name: "Services consulaires gabonais",
          description:
            "Catalogue officiel des services consulaires de la République Gabonaise : passeport, visa, état civil, légalisation, inscription consulaire.",
          path: "/services",
          items: collectionItems,
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Accueil", path: "/" },
          { name: "Services", path: "/services" },
        ])}
      />
      <Suspense fallback={<ServicesLoading />}>
        <ServicesPageClient
          preloadedServices={preloadedServices}
          preloadedStats={preloadedStats}
          preloadedFeatured={preloadedFeatured}
        />
      </Suspense>
    </>
  )
}
