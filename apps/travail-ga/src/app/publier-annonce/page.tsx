/**
 * Hub « Publier une annonce » — TRAVAIL.GA.
 *
 * 3 choix : Entreprise, Administration, Particulier. Chaque CTA dirige
 * vers le formulaire adapté ou redirige vers PNPE.GA pour le workflow
 * entreprise complet.
 */
import Link from "next/link";
import { Building2, Briefcase, Landmark, User, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { pnpeLink } from "@/lib/utils";

export default function PublierAnnoncePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="bg-primary/5 py-10 border-b">
          <div className="container mx-auto px-6 lg:px-10 max-w-3xl">
            <h1 className="text-3xl lg:text-4xl font-display font-bold tracking-tight mb-2">
              Publier une annonce
            </h1>
            <p className="text-muted-foreground">
              Trois profils acceptés. Choisissez celui qui correspond à votre
              situation.
            </p>
          </div>
        </section>

        <section className="py-10">
          <div className="container mx-auto px-6 lg:px-10 max-w-3xl space-y-5">
            <ChoiceCard
              icon={Building2}
              title="Je suis une entreprise"
              description="Société commerciale immatriculée (NIF, RCCM). Vérification DGI et CNSS requise. Accès au vivier de candidats validés et entretiens visio LiveKit."
              cta="Créer mon compte entreprise"
              href={pnpeLink("/employeur/inscription")}
              external
              tone="primary"
            />

            <ChoiceCard
              icon={Landmark}
              title="Je suis une administration publique"
              description="Ministère, direction générale, mairie, établissement public. L'organisme est pré-vérifié — il vous suffit d'être membre actif pour publier."
              cta="Publier comme administration"
              href="/publier-annonce/administration"
              tone="secondary"
            />

            <ChoiceCard
              icon={User}
              title="Je suis un particulier"
              description="Vous cherchez à embaucher pour de l'emploi domestique, garde d'enfants, jardinier, aide à domicile, cours particuliers, etc. Modération PNPE renforcée."
              cta="Publier comme particulier"
              href="/publier-annonce/particulier"
              tone="tertiary"
            />

            <div className="rounded-2xl border bg-card p-6 mt-8">
              <Briefcase className="size-6 text-muted-foreground mb-3" />
              <h2 className="font-semibold mb-2">Engagement PNPE</h2>
              <p className="text-sm text-muted-foreground">
                Toutes les offres publiées sur TRAVAIL.GA sont modérées par un
                conseiller PNPE (Pôle National de Promotion de l'Emploi) avant
                d'être visibles publiquement. Ceci garantit la conformité au
                Code du travail gabonais et lutte contre la fraude.
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function ChoiceCard({
  icon: Icon,
  title,
  description,
  cta,
  href,
  external = false,
  tone,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
  cta: string;
  href: string;
  external?: boolean;
  tone: "primary" | "secondary" | "tertiary";
}) {
  const tones = {
    primary: "border-primary/40 hover:border-primary",
    secondary: "border-emerald-200 hover:border-emerald-400 bg-emerald-50/30",
    tertiary: "border-amber-200 hover:border-amber-400 bg-amber-50/30",
  };
  const C = external ? "a" : Link;
  return (
    <C
      href={href}
      className={`block rounded-2xl border-2 bg-card p-6 transition-all hover:shadow-md ${tones[tone]}`}
    >
      <Icon className="size-7 text-primary mb-3" />
      <h2 className="font-semibold text-lg mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <span className="inline-flex items-center gap-1.5 text-primary text-sm font-semibold">
        {cta}
        <ArrowRight className="size-3.5" />
      </span>
    </C>
  );
}
