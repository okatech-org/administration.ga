import type { Metadata } from "next"
import { buildMetadata } from "@/lib/seo"
import GuideRetourPageClient from "./retour-page-client"

export const metadata: Metadata = buildMetadata({
  title: "Guide de retour au Gabon",
  description:
    "Préparer son retour au Gabon : déménagement international, dédouanement, scolarisation, immatriculation véhicule, reprise d'activité et démarches consulaires.",
  path: "/ressources/guides/retour",
})

export default function GuideRetourPage() {
  return <GuideRetourPageClient />
}
