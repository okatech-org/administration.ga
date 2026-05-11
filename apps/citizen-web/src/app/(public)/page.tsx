import type { Metadata } from "next"
import { buildMetadata } from "@/lib/seo"
import HomePageClient from "./home-page-client"

export const metadata: Metadata = buildMetadata({
  title: "Services consulaires en ligne — République Gabonaise",
  description:
    "Plateforme officielle de la République Gabonaise : passeport, visa, état civil, inscription consulaire, légalisation. Effectuez vos démarches consulaires en ligne depuis n'importe où dans le monde.",
  path: "/",
})

export default function HomePage() {
  return <HomePageClient />
}
