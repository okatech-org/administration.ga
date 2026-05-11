import { preloadQuery } from "convex/nextjs"
import type { Metadata } from "next"
import { Suspense } from "react"
import { api } from "@convex/_generated/api"
import { buildMetadata } from "@/lib/seo"
import RepsLoading from "./loading"
import { RepsPageClient } from "./reps-page-client"

export const metadata: Metadata = buildMetadata({
  title: "Représentations diplomatiques",
  description:
    "Annuaire complet des ambassades et consulats de la République Gabonaise à travers le monde : adresses, horaires, coordonnées et services consulaires disponibles.",
  path: "/reps",
})

export default async function RepsPage() {
  const preloaded = await preloadQuery(api.functions.orgs.list, {})

  return (
    <Suspense fallback={<RepsLoading />}>
      <RepsPageClient preloaded={preloaded} />
    </Suspense>
  )
}
