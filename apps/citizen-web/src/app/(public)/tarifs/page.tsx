"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const fees = [
  { service: "Passeport ordinaire (Adulte)", price: "95 000 FCFA", delay: "3-4 semaines" },
  { service: "Passeport ordinaire (Mineur)", price: "80 000 FCFA", delay: "3-4 semaines" },
  { service: "Visa Tourisme (entrée unique, 1 mois)", price: "55 000 FCFA", delay: "3 jours ouvrés" },
  { service: "Visa Affaires (entrées multiples, 3 mois)", price: "110 000 FCFA", delay: "3 jours ouvrés" },
  { service: "Légalisation de document", price: "10 000 FCFA / doc", delay: "Immédiat" },
  { service: "Carte Consulaire", price: "15 000 FCFA", delay: "Immédiat" },
  { service: "Laissez-passer", price: "30 000 FCFA", delay: "24h" },
]

export default function TarifsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 py-16 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Tarifs Consulaires</h1>
            <p className="text-muted-foreground text-lg">
              Tarifs en vigueur applicables pour les services consulaires.
            </p>
            <div className="gabon-stripe mt-6 max-w-xs mx-auto" />
          </div>

          <div className="bg-card rounded-xl p-6 md:p-8 border flat-card-border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%]">Service</TableHead>
                  <TableHead>Tarif</TableHead>
                  <TableHead className="text-right">Délai estimé</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="stagger-children">
                {fees.map((item) => (
                  <TableRow key={item.service}>
                    <TableCell className="font-medium">{item.service}</TableCell>
                    <TableCell>{item.price}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{item.delay}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <p className="text-sm text-muted-foreground text-center italic mt-6">
            Les tarifs sont indicatifs et peuvent être sujets à modification sans préavis. Les paiements se font généralement en espèces ou par carte bancaire au guichet consulaire.
          </p>
        </div>
      </main>
    </div>
  )
}
