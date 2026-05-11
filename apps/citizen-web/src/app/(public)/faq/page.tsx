import type { Metadata } from "next"
import { JsonLd } from "@/components/seo/JsonLd"
import { faqPageSchema } from "@/lib/json-ld"
import { buildMetadata } from "@/lib/seo"
import { faqItems } from "./faq-items"
import FAQPageClient from "./faq-page-client"

export const metadata: Metadata = buildMetadata({
  title: "Foire aux questions consulaires",
  description:
    "Réponses aux questions fréquentes sur les services consulaires gabonais : passeport, visa, état civil, légalisation, inscription consulaire et délais de traitement.",
  path: "/faq",
})

export default function FAQPage() {
  return (
    <>
      <JsonLd data={faqPageSchema(faqItems)} />
      <FAQPageClient />
    </>
  )
}
