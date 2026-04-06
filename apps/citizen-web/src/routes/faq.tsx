import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
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
      <main className="flex-1 py-16 px-6">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Foire Aux Questions</h1>
            <p className="text-muted-foreground text-lg">
              Retrouvez les réponses aux questions les plus fréquentes concernant vos démarches consulaires.
            </p>
            <div className="gabon-stripe mt-6 max-w-xs mx-auto" />
          </div>

          <div className="bg-card rounded-xl p-6 md:p-8 border flat-card-border shadow-sm">
            <Accordion type="single" collapsible className="w-full stagger-children">
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
