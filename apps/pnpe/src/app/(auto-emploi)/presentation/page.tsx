/**
 * Page de présentation du programme Auto-Emploi PNPE.
 */
import Link from "next/link";
import { BookOpen, HandshakeIcon, Landmark, Sparkles } from "lucide-react";

export default function PresentationAutoEmploi() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <Sparkles className="size-10 text-primary mb-3" />
        <h1 className="text-3xl font-display font-bold tracking-tight">
          Programme Auto-Emploi
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
          Vous avez un projet d'activité ? Le PNPE vous accompagne du Business
          Model Canvas à la formalisation avec l'ANPI-Gabon.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: BookOpen,
            title: "Formation BMC",
            desc: "Sessions présentielles ou en ligne (Ediandza) pour structurer votre modèle économique.",
          },
          {
            icon: HandshakeIcon,
            title: "Mentorat",
            desc: "Un mentor PNPE ou partenaire vous suit sur tout le parcours.",
          },
          {
            icon: Landmark,
            title: "Formalisation ANPI",
            desc: "Passerelle automatique vers l'ANPI-Gabon pour la création d'entreprise.",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="rounded-xl border bg-card p-5">
              <Icon className="size-6 text-primary mb-3" />
              <h2 className="font-semibold mb-1">{card.title}</h2>
              <p className="text-sm text-muted-foreground">{card.desc}</p>
            </div>
          );
        })}
      </div>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="font-semibold mb-3">Les 7 étapes du parcours</h2>
        <ol className="space-y-2 text-sm">
          {[
            "Évaluation du projet (conseiller PNPE)",
            "Formation Business Model Canvas (BMC)",
            "Élaboration du business plan simplifié",
            "Validation du plan par le conseiller",
            "Lancement et passerelle ANPI-Gabon",
            "Suivi post-installation (6-12 mois)",
            "Clôture du parcours",
          ].map((step, i) => (
            <li key={step} className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <div>
        <Link
          href="/auto-emploi/inscription"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          S'inscrire au programme →
        </Link>
      </div>
    </div>
  );
}
