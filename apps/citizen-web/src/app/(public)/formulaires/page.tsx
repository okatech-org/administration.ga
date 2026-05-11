import type { Metadata } from "next"
import { buildMetadata } from "@/lib/seo"
import FormulairesPageClient from "./formulaires-page-client"

export const metadata: Metadata = buildMetadata({
  title: "Formulaires consulaires à télécharger",
  description:
    "Téléchargez gratuitement les formulaires officiels du Consulat gabonais : demande de passeport, visa, transcription d'acte, inscription consulaire et bien d'autres.",
  path: "/formulaires",
})

export default function FormulairesPage() {
  return <FormulairesPageClient />
}
