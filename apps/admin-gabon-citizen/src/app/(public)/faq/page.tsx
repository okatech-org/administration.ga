import type { Metadata } from "next"
import { JsonLd } from "@/components/seo/JsonLd"
import { breadcrumbSchema, faqPageSchema } from "@/lib/json-ld"
import { buildMetadata } from "@/lib/seo"
import { faqItems } from "./faq-items"
import FAQPageClient from "./faq-page-client"

export const metadata: Metadata = buildMetadata({
  title: "Foire aux questions — Démarches administratives",
  description:
    "Réponses aux questions fréquentes sur les démarches administratives gabonaises : état civil, identité, fiscalité, urbanisme et délais de traitement.",
  path: "/faq",
})

export default function FAQPage() {
  return (
    <>
      <JsonLd data={faqPageSchema(faqItems)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Accueil", path: "/" },
          { name: "Foire aux questions", path: "/faq" },
        ])}
      />
      <FAQPageClient />
    </>
  )
}
