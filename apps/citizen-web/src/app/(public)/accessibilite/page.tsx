export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 py-16 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Accessibilité</h1>
            <p className="text-muted-foreground text-lg">
              Le service consulaire s&apos;engage à rendre ses services numériques accessibles à tous, y compris aux personnes en situation de handicap.
            </p>
          </div>

          <div className="bg-card rounded-[10px] p-6 md:p-8 border border-border shadow-sm">
            <div className="prose dark:prose-invert max-w-none space-y-6 stagger-children">
              <section>
                <h2 className="text-2xl font-semibold mb-4">État de conformité</h2>
                <p>
                  Le site consulat.ga est en cours d&apos;audit pour déterminer son niveau de conformité avec les normes internationales d&apos;accessibilité (WCAG 2.1).
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Fonctionnalités d&apos;assistance</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Contraste des couleurs optimisé</li>
                  <li>Navigation au clavier possible sur l&apos;ensemble du site</li>
                  <li>Compatibilité avec les lecteurs d&apos;écran</li>
                  <li>Textes alternatifs pour les images</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Signaler un problème</h2>
                <p>
                  Si vous rencontrez des difficultés pour accéder à un contenu ou à une fonctionnalité de ce site, n&apos;hésitez pas à nous contacter pour que nous puissions vous orienter vers une alternative accessible ou vous fournir le contenu sous une autre forme.
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
