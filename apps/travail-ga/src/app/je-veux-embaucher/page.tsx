/**
 * Page d'orientation « Je veux embaucher » — TRAVAIL.GA.
 */
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  FileCheck2,
  Send,
  ShieldCheck,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { pnpeLink } from "@/lib/utils";

export default function JeVeuxEmbaucher() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="bg-primary/5 py-10 border-b">
          <div className="container mx-auto px-6 lg:px-10 max-w-3xl">
            <h1 className="text-3xl lg:text-4xl font-display font-bold tracking-tight mb-2">
              Je veux embaucher
            </h1>
            <p className="text-muted-foreground">
              Publiez vos offres, vérifions ensemble votre statut DGI/CNSS,
              accédez au vivier de candidats validés.
            </p>
          </div>
        </section>

        <section className="py-10">
          <div className="container mx-auto px-6 lg:px-10 max-w-3xl space-y-5">
            <Step
              number={1}
              icon={Briefcase}
              title="Créer mon compte entreprise"
              description="Renseignez l'identité légale (NIF, RCCM, secteur d'activité, représentant légal). Inscription gratuite."
              cta="Créer mon compte"
              href={pnpeLink("/employeur/inscription")}
              external
            />

            <Step
              number={2}
              icon={ShieldCheck}
              title="Vérification DGI / CNSS"
              description="Soumettez vos attestations fiscales et sociales. Un conseiller PNPE valide votre compte sous 48 h."
              cta="Vérification"
              href={pnpeLink("/employeur/verification")}
              external
            />

            <Step
              number={3}
              icon={Send}
              title="Publier mes offres et recevoir des candidatures"
              description="Une fois vérifié, publiez vos offres. Toutes les candidatures arrivent dans votre espace, vous pouvez organiser des entretiens en visio."
              cta="Mon espace employeur"
              href={pnpeLink("/employeur/tableau-de-bord")}
              external
            />

            <div className="rounded-2xl border bg-card p-6 mt-8">
              <FileCheck2 className="size-6 text-primary mb-3" />
              <h2 className="font-semibold mb-2">Engagement PNPE</h2>
              <p className="text-sm text-muted-foreground">
                Toutes les offres publiées sur TRAVAIL.GA sont modérées par un
                conseiller PNPE avant publication, garantissant la conformité
                au Code du travail gabonais et la légitimité de l'entreprise.
              </p>
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
  icon: typeof Briefcase;
  title: string;
  description: string;
  cta: string;
  href: string;
  external?: boolean;
}) {
  const C = external ? "a" : Link;
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
        <C
          href={href}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {cta}
          <ArrowRight className="size-3.5" />
        </C>
      </div>
    </div>
  );
}
