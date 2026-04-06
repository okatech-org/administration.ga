import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/accessibilite')({
  component: AccessibilityPage,
})

function AccessibilityPage() {

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 py-16 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Accessibilité</h1>
            <p className="text-muted-foreground text-lg">
              Le service consulaire s'engage à rendre ses services numériques accessibles à tous, y compris aux personnes en situation de handicap.
            </p>
            <div className="gabon-stripe mt-6 max-w-xs mx-auto" />
          </div>

          <div className="bg-card rounded-xl p-6 md:p-8 border flat-card-border shadow-sm">
            <div className="prose dark:prose-invert max-w-none space-y-6 stagger-children">
              <section>
                <h2 className="text-2xl font-semibold mb-4">État de conformité</h2>
                <p>
                  Le site consulat.ga est en cours d'audit pour déterminer son niveau de conformité avec les normes internationales d'accessibilité (WCAG 2.1).
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Fonctionnalités d'assistance</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Contraste des couleurs optimisé</li>
                  <li>Navigation au clavier possible sur l'ensemble du site</li>
                  <li>Compatibilité avec les lecteurs d'écran</li>
                  <li>Textes alternatifs pour les images</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Signaler un problème</h2>
                <p>
                  Si vous rencontrez des difficultés pour accéder à un contenu ou à une fonctionnalité de ce site, n'hésitez pas à nous contacter pour que nous puissions vous orienter vers une alternative accessible ou vous fournir le contenu sous une autre forme.
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
