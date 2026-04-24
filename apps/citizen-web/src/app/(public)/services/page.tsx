import { preloadQuery } from "convex/nextjs"
import type { Metadata } from "next"
import { Suspense } from "react"
import { api } from "@convex/_generated/api"
import ServicesLoading from "./loading"
import { ServicesPageClient } from "./services-page-client"

export const metadata: Metadata = {
  title: "Services consulaires | Consulat.ga",
  description:
    "Découvrez l'ensemble des services consulaires proposés par la République Gabonaise pour ses citoyens à l'étranger.",
  openGraph: {
    type: "website",
    title: "Services consulaires — Consulat.ga",
    description:
      "Découvrez l'ensemble des services consulaires proposés par la République Gabonaise pour ses citoyens à l'étranger.",
    url: "/services",
    siteName: "Consulat.ga",
  },
  twitter: {
    card: "summary",
    title: "Services consulaires — Consulat.ga",
    description:
      "Découvrez l'ensemble des services consulaires proposés par la République Gabonaise pour ses citoyens à l'étranger.",
  },
}

export default async function ServicesPage() {
  const preloaded = await preloadQuery(api.functions.services.listCatalog, {})

  return (
    <Suspense fallback={<ServicesLoading />}>
      <ServicesPageClient preloaded={preloaded} />
    </Suspense>
  )
}
