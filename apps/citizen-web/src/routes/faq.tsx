import { createFileRoute } from '@tanstack/react-router'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export const Route = createFileRoute('/faq')({
  component: FAQPage,
})

function FAQPage() {

  const faqItems = [
    {
      question: "Comment renouveler mon passeport ?",
      answer: "Pour renouveler votre passeport, vous devez prendre rendez-vous au consulat et présenter votre ancien passeport, votre acte de naissance, et 2 photos d'identité récentes. Le délai de traitement est d'environ 3 à 4 semaines."
    },
    {
      question: "Quels sont les documents nécessaires pour un visa ?",
      answer: "Les documents varient selon le type de visa (tourisme, affaires, etc.). En général, il faut un formulaire de demande rempli, un passeport valide au moins 6 mois, une photo d'identité, une réservation de vol et de logement, ainsi qu'une attestation d'assurance voyage."
    },
    {
      question: "Comment s'inscrire au registre des Gabonais de l'étranger ?",
      answer: "L'inscription consulaire se fait désormais en ligne via ce portail. Vous aurez besoin de votre carte d'identité ou passeport, un justificatif de domicile dans la circonscription consulaire, et une photo d'identité."
    },
    {
      question: "Puis-je voter aux élections depuis l'étranger ?",
      answer: "Oui, si vous êtes inscrit sur la liste électorale consulaire. Vous pouvez voter à l'urne au consulat, par procuration, ou par internet pour certaines élections."
    },
    {
      question: "Que faire en cas de perte de passeport ?",
      answer: "En cas de perte ou de vol, vous devez d'abord faire une déclaration auprès des autorités de police locales. Ensuite, contactez le consulat pour faire une déclaration de perte et demander un laissez-passer ou un passeport d'urgence."
    }
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <section className="py-20 lg:py-40 bg-[oklch(0.145_0_0)] text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block mb-4 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-white/80">FAQ</span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-[-0.02em] text-white mb-4">Foire Aux Questions</h1>
          <p className="text-lg md:text-xl text-[oklch(0.7_0_0)] max-w-2xl mx-auto">
            Retrouvez les réponses aux questions les plus fréquentes concernant vos démarches consulaires.
          </p>
        </div>
      </section>

      <main className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto bg-card rounded-[10px] p-6 md:p-8 border border-border">
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left font-medium text-lg">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </main>
    </div>
  )
}
