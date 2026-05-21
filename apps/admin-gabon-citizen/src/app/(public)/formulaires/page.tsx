import type { Metadata } from "next"
import { JsonLd } from "@/components/seo/JsonLd"
import { breadcrumbSchema } from "@/lib/json-ld"
import { buildMetadata } from "@/lib/seo"
import FormulairesPageClient from "./formulaires-page-client"

export const metadata: Metadata = buildMetadata({
  title: "Formulaires administratifs à télécharger",
  description:
    "Téléchargez gratuitement les formulaires officiels de l'administration gabonaise : demande de passeport, visa, transcription d'acte, inscription en ligne et bien d'autres.",
  path: "/formulaires",
})

export default function FormulairesPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Accueil", path: "/" },
          { name: "Formulaires", path: "/formulaires" },
        ])}
      />
      <FormulairesPageClient />
    </>
  )
}
