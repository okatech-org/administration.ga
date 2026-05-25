/**
 * Landing TRAVAIL.GA — vitrine publique du marché de l'emploi gabonais.
 */
"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import {
  Briefcase,
  LandPlot,
  Sparkles,
  TrendingUp,
  Users,
  Search,
  ArrowRight,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { api } from "@convex/_generated/api";
import { pnpeLink } from "@/lib/utils";

export default function LandingPage() {
  // @ts-expect-error — api.pnpe typé après codegen Convex
  const kpis = useQuery(api.functions?.pnpe?.stats?.nationalKpis, {});

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-16 lg:py-24">
        <div className="container mx-auto px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium mb-4">
              <Sparkles className="size-3.5" />
              Marché de l'emploi gabonais — officiel
            </span>
            <h1 className="text-4xl lg:text-6xl font-display font-bold tracking-tight leading-[1.1] mb-5">
              Trouvez votre <span className="text-primary">prochain emploi</span> au Gabon
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl">
              Toutes les offres validées par le PNPE (Pôle National de
              Promotion de l'Emploi). Pour les D.E, les entreprises et les
              porteurs de projet Auto-Emploi.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/offres"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Search className="size-4" />
                Voir les offres
              </Link>
              <a
                href={pnpeLink("/demandeur/inscription")}
                className="inline-flex items-center gap-2 rounded-lg border px-6 py-3 text-sm font-semibold hover:bg-muted"
              >
                Créer mon compte D.E
              </a>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3">
            <KpiCard icon={Briefcase} label="Offres publiées" value={kpis?.offresPubliees ?? "—"} />
            <KpiCard icon={Users} label="D.E inscrits" value={kpis?.demandeursInscrits ?? "—"} />
            <KpiCard icon={LandPlot} label="Antennes" value={kpis?.antennesOperationnelles ?? 7} />
            <KpiCard icon={TrendingUp} label="Employeurs vérifiés" value={kpis?.employeursVerifies ?? "—"} />
          </div>
        </div>
      </section>

      {/* 3 actions */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-6 lg:px-10">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-display font-bold tracking-tight">
              Trois publics, un marché
            </h2>
            <p className="text-muted-foreground mt-2">
              Quel que soit votre profil, TRAVAIL.GA vous met en relation avec
              le bon interlocuteur PNPE.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ActionCard
              icon={Search}
              title="Je cherche un emploi"
              description="Parcourez les offres, créez votre compte D.E, candidatez en quelques clics."
              href="/je-cherche"
              cta="Démarrer"
            />
            <ActionCard
              icon={Briefcase}
              title="Je veux embaucher"
              description="Publiez vos offres, accédez au vivier de candidats validés, organisez les entretiens."
              href="/je-veux-embaucher"
              cta="Embaucher"
            />
            <ActionCard
              icon={Sparkles}
              title="Je crée mon activité"
              description="Programme Auto-Emploi : formation BMC, accompagnement, passerelle ANPI-Gabon."
              href="/je-cherche?programme=auto-emploi"
              cta="En savoir plus"
            />
          </div>
        </div>
      </section>

      {/* CTA bandeau */}
      <section className="py-16 bg-primary/5 border-y">
        <div className="container mx-auto px-6 lg:px-10 text-center max-w-2xl">
          <h2 className="text-2xl font-display font-bold tracking-tight mb-3">
            Une question administrative non liée à l'emploi ?
          </h2>
          <p className="text-muted-foreground mb-6">
            Toutes les autres démarches administratives gabonaises (état civil,
            urbanisme, fiscalité…) sont sur DEMARCHE.GA.
          </p>
          <a
            href="https://demarche.ga"
            className="inline-flex items-center gap-2 rounded-lg border bg-background px-5 py-2.5 text-sm font-semibold hover:bg-muted"
          >
            Aller sur DEMARCHE.GA
            <ArrowRight className="size-4" />
          </a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Briefcase;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 hover:shadow-md transition-shadow">
      <Icon className="size-5 text-primary mb-3" />
      <div className="text-3xl font-bold font-display">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function ActionCard({
  icon: Icon,
  title,
  description,
  href,
  cta,
}: {
  icon: typeof Search;
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border bg-card p-6 hover:shadow-md hover:border-primary/40 transition-all"
    >
      <Icon className="size-7 text-primary mb-4" />
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <span className="inline-flex items-center gap-1 text-primary text-sm font-semibold">
        {cta}
        <ArrowRight className="size-3.5" />
      </span>
    </Link>
  );
}
