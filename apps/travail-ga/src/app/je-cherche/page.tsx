/**
 * Page d'orientation « Je cherche un emploi » — TRAVAIL.GA.
 *
 * Guide le citoyen vers les bonnes actions :
 * - Parcourir les offres (sans compte)
 * - Créer un compte D.E sur PNPE.GA (pour candidater)
 * - Programme Auto-Emploi
 */
import Link from "next/link";
import { ArrowRight, Briefcase, FileCheck2, Search, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { pnpeLink } from "@/lib/utils";

export default function JeChercheEmploi() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="bg-primary/5 py-10 border-b">
          <div className="container mx-auto px-6 lg:px-10 max-w-3xl">
            <h1 className="text-3xl lg:text-4xl font-display font-bold tracking-tight mb-2">
              Je cherche un emploi
            </h1>
            <p className="text-muted-foreground">
              Suivez les 3 étapes pour mettre toutes les chances de votre côté.
            </p>
          </div>
        </section>

        <section className="py-10">
          <div className="container mx-auto px-6 lg:px-10 max-w-3xl space-y-5">
            <Step
              number={1}
              icon={Search}
              title="Parcourir les offres"
              description="Consultez les offres validées par le PNPE — pas besoin de compte."
              cta="Voir les offres"
              href="/offres"
            />

            <Step
              number={2}
              icon={FileCheck2}
              title="Créer mon compte Demandeur d'Emploi (D.E)"
              description="Inscription gratuite avec votre NIP. Un conseiller PNPE vous contacte (WhatsApp ou agence) pour valider votre compte."
              cta="Créer mon compte D.E"
              href={pnpeLink("/demandeur/inscription")}
              external
            />

            <Step
              number={3}
              icon={Briefcase}
              title="Candidater aux offres"
              description="Une fois validé, candidatez en quelques clics. Téléversez votre CV, suivez vos candidatures en temps réel."
              cta="Mon espace D.E"
              href={pnpeLink("/demandeur")}
              external
            />

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 mt-8">
              <Sparkles className="size-6 text-emerald-600 mb-3" />
              <h2 className="font-semibold mb-2">
                Vous voulez créer votre propre activité ?
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Le programme <strong>Auto-Emploi PNPE</strong> vous accompagne
                de l'idée au lancement : formation Business Model Canvas (BMC),
                mentorat, passerelle vers ANPI-Gabon pour la formalisation.
              </p>
              <a
                href={pnpeLink("/auto-emploi/presentation")}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Découvrir Auto-Emploi
                <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Step({
  number,
  icon: Icon,
  title,
  description,
  cta,
  href,
  external = false,
}: {
  number: number;
  icon: typeof Search;
  title: string;
  description: string;
  cta: string;
  href: string;
  external?: boolean;
}) {
  const ButtonComponent = external ? "a" : Link;
  return (
    <div className="flex items-start gap-4 rounded-2xl border bg-card p-6">
      <div className="shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="size-4 text-primary" />
          <h2 className="font-semibold">{title}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        <ButtonComponent
          href={href}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {cta}
          <ArrowRight className="size-3.5" />
        </ButtonComponent>
      </div>
    </div>
  );
}
