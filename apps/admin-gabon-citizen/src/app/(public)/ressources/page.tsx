import { fetchQuery } from "convex/nextjs"
import type { Metadata } from "next"
import { Suspense } from "react"
import { api } from "@convex/_generated/api"
import { JsonLd } from "@/components/seo/JsonLd"
import { breadcrumbSchema, collectionPageSchema } from "@/lib/json-ld"
import { buildMetadata } from "@/lib/seo"
import RessourcesPageClient from "./ressources-page-client"

export const metadata: Metadata = buildMetadata({
  title: "Ressources et guides pratiques",
  description:
    "Guides, tutoriels et ressources pratiques pour les citoyens gabonais à l'étranger : démarches administratives, vie pratique, retour au Gabon et entrepreneuriat.",
  path: "/ressources",
})

export default async function RessourcesPage() {
  let tutorials: Array<{ slug?: string; title?: string; excerpt?: string }> = []
  try {
    tutorials = await fetchQuery(api.functions.tutorials.list, { limit: 30 })
  } catch (error) {
    console.error("[ressources] fetch tutorials failed", error)
  }

  const collectionItems = tutorials
    .filter((t) => !!t.slug)
    .map((t) => ({
      name: t.title ?? "",
      description: t.excerpt ?? "",
      url: `/ressources/${t.slug}`,
    }))

  return (
    <>
      <JsonLd
        data={collectionPageSchema({
          name: "Ressources et guides pour la diaspora gabonaise",
          description:
            "Guides, tutoriels et fiches pratiques pour les ressortissants gabonais à l'étranger : démarches consulaires, vie pratique, retour au Gabon, scolarité, entrepreneuriat.",
          path: "/ressources",
          items: collectionItems,
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Accueil", path: "/" },
          { name: "Ressources", path: "/ressources" },
        ])}
      />
      <Suspense>
        <RessourcesPageClient />
      </Suspense>
    </>
  )
}
