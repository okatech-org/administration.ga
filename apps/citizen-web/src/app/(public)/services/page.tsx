import { preloadQuery } from "convex/nextjs"
import type { Metadata } from "next"
import { Suspense } from "react"
import { api } from "@convex/_generated/api"
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
  const [preloadedServices, preloadedStats, preloadedFeatured] =
    await Promise.all([
      preloadQuery(api.functions.services.listCatalog, {}),
      preloadQuery(api.functions.services.getCatalogStats, {}),
      preloadQuery(api.functions.services.getFeaturedService, {}),
    ])

  return (
    <Suspense fallback={<ServicesLoading />}>
      <ServicesPageClient
        preloadedServices={preloadedServices}
        preloadedStats={preloadedStats}
        preloadedFeatured={preloadedFeatured}
      />
    </Suspense>
  )
}
