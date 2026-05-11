import type { Metadata } from "next"
import { buildMetadata } from "@/lib/seo"
import GuideArriveePageClient from "./arrivee-page-client"

export const metadata: Metadata = buildMetadata({
  title: "Guide d'arrivée au Gabon",
  description:
    "Tout ce qu'il faut savoir pour s'installer au Gabon : formalités d'entrée, démarches administratives à l'arrivée, logement, santé, transport et vie quotidienne.",
  path: "/ressources/guides/arrivee",
})

export default function GuideArriveePage() {
  return <GuideArriveePageClient />
}
