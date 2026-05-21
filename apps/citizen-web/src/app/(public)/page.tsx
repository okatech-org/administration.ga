import type { Metadata } from "next"
import { buildMetadata } from "@/lib/seo"
import HomePageClient from "./home-page-client"

export const metadata: Metadata = buildMetadata({
  title: "Démarches administratives en ligne — République Gabonaise",
  description:
    "Plateforme officielle de la République Gabonaise : état civil, identité, fiscalité, urbanisme, foncier. Effectuez vos démarches administratives en ligne en toute simplicité.",
  path: "/",
})

export default function HomePage() {
  return <HomePageClient />
}
