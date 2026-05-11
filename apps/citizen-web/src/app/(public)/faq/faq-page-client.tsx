"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { faqItems } from "./faq-items"

export default function FAQPage() {
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
