export default function LegalPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 py-16 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <h1 className="text-4xl font-bold">Mentions Légales</h1>

          <div className="prose dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Éditeur</h2>
              <p>
                Le site consulat.ga est édité par le Ministère des Affaires Étrangères de la République Gabonaise.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Hébergement</h2>
              <p>
                Ce site est hébergé sur les infrastructures de Vercel Inc.<br/>
                Vercel Inc.<br/>
                340 S Lemon Ave #4133<br/>
                Walnut, CA 91789, USA
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Propriété Intellectuelle</h2>
              <p>
                L&apos;ensemble de ce site relève de la législation gabonaise et internationale sur le droit d&apos;auteur et la propriété intellectuelle. Tous les droits de reproduction sont réservés, y compris pour les documents téléchargeables et les représentations iconographiques et photographiques.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
