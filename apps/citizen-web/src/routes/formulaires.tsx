import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { FileText, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export const Route = createFileRoute('/formulaires')({
  component: FormsPage,
})

function FormsPage() {
  const { t } = useTranslation()

  const forms = [
    { title: "Demande de Passeport Biométrique", type: "PDF", size: "1.2 MB" },
    { title: "Formulaire de demande de Visa", type: "PDF", size: "850 KB" },
    { title: "Inscription au registre consulaire", type: "PDF", size: "500 KB" },
    { title: "Demande de transcription d'acte de naissance", type: "PDF", size: "450 KB" },
    { title: "Déclaration de perte de document", type: "PDF", size: "300 KB" },
    { title: "Autorisation parentale de voyage", type: "PDF", size: "250 KB" },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 py-16 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Téléchargement de Formulaires</h1>
            <p className="text-muted-foreground text-lg">
              Accédez aux formulaires nécessaires pour vos démarches administratives.
            </p>
          </div>

          <div className="bg-card rounded-[10px] p-6 md:p-8 border border-border shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
              {forms.map((form) => (
                <Card key={form.title} className="hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center p-6 gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg text-primary">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{form.title}</h3>
                      <p className="text-sm text-muted-foreground">{form.type} - {form.size}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="hover:text-primary">
                      <Download className="w-5 h-5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
