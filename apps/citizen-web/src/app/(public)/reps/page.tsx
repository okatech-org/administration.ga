import { preloadQuery } from "convex/nextjs"
import type { Metadata } from "next"
import { Suspense } from "react"
import { api } from "@convex/_generated/api"
import RepsLoading from "./loading"
import { RepsPageClient } from "./reps-page-client"

export const metadata: Metadata = {
  title: "Représentations diplomatiques | Consulat.ga",
  description:
    "Retrouvez l'ensemble des représentations diplomatiques et consulaires de la République Gabonaise à travers le monde.",
  openGraph: {
    type: "website",
    title: "Représentations diplomatiques — Consulat.ga",
    description:
      "Retrouvez l'ensemble des représentations diplomatiques et consulaires de la République Gabonaise à travers le monde.",
    url: "/reps",
    siteName: "Consulat.ga",
  },
  twitter: {
    card: "summary",
    title: "Représentations diplomatiques — Consulat.ga",
    description:
      "Retrouvez l'ensemble des représentations diplomatiques et consulaires de la République Gabonaise à travers le monde.",
  },
}

export default async function RepsPage() {
  const preloaded = await preloadQuery(api.functions.orgs.list, {})

  return (
    <Suspense fallback={<RepsLoading />}>
      <RepsPageClient preloaded={preloaded} />
    </Suspense>
  )
}
