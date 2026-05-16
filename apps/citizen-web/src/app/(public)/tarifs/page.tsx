import type { Metadata } from "next"
import { JsonLd } from "@/components/seo/JsonLd"
import { breadcrumbSchema } from "@/lib/json-ld"
import { buildMetadata } from "@/lib/seo"
import TarifsPageClient from "./tarifs-page-client"

export const metadata: Metadata = buildMetadata({
  title: "Tarifs des services consulaires",
  description:
    "Grille tarifaire officielle des services consulaires de la République Gabonaise : passeport, visa, transcription d'actes, légalisation et autres prestations.",
  path: "/tarifs",
})

export default function TarifsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Accueil", path: "/" },
          { name: "Tarifs", path: "/tarifs" },
        ])}
      />
      <TarifsPageClient />
    </>
  )
}
