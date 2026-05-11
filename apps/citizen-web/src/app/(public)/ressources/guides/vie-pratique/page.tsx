import type { Metadata } from "next"
import { buildMetadata } from "@/lib/seo"
import GuideViePratiquePageClient from "./vie-pratique-page-client"

export const metadata: Metadata = buildMetadata({
  title: "Guide pratique de la vie au Gabon",
  description:
    "Informations utiles pour vivre au Gabon ou à l'étranger : santé, banque, fiscalité, télécommunications, sécurité, éducation et services du quotidien.",
  path: "/ressources/guides/vie-pratique",
})

export default function GuideViePratiquePage() {
  return <GuideViePratiquePageClient />
}
