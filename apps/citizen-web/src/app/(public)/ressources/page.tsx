import type { Metadata } from "next"
import { Suspense } from "react"
import { buildMetadata } from "@/lib/seo"
import RessourcesPageClient from "./ressources-page-client"

export const metadata: Metadata = buildMetadata({
  title: "Ressources et guides pratiques",
  description:
    "Guides, tutoriels et ressources pratiques pour les citoyens gabonais à l'étranger : démarches administratives, vie pratique, retour au Gabon et entrepreneuriat.",
  path: "/ressources",
})

export default function RessourcesPage() {
  return (
    <Suspense>
      <RessourcesPageClient />
    </Suspense>
  )
}
