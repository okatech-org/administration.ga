export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 py-16 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Politique de Confidentialité</h1>
            <p className="text-muted-foreground text-lg">
              La République Gabonaise s&apos;engage à protéger la vie privée des utilisateurs de ses services consulaires en ligne.
            </p>
          </div>

          <div className="bg-card rounded-[10px] p-6 md:p-8 border border-border shadow-sm">
            <div className="prose dark:prose-invert max-w-none space-y-6 stagger-children">
              <section>
                <h2 className="text-2xl font-semibold mb-4">Collecte des Données</h2>
                <p>
                  Nous collectons uniquement les données nécessaires au traitement de vos démarches administratives (demandes de passeport, visa, inscription consulaire, etc.). Ces données incluent vos informations d&apos;identité, coordonnées et justificatifs.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Utilisation des Données</h2>
                <p>
                  Vos données sont utilisées exclusivement par les services consulaires pour l&apos;instruction de vos dossiers. Elles ne sont jamais commercialisées ni cédées à des tiers non autorisés.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Vos Droits</h2>
                <p>
                  Conformément à la législation en vigueur, vous disposez d&apos;un droit d&apos;accès, de rectification et de suppression de vos données personnelles. Pour exercer ce droit, veuillez contacter notre délégué à la protection des données.
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
