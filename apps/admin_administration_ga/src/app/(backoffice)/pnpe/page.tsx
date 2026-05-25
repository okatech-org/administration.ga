/**
 * Backoffice PNPE — Dashboard national.
 *
 * Vue d'ensemble agrégée pour le directeur PNPE et l'administration du
 * Ministère du Travail. KPI nationaux + accès rapides aux modules de
 * pilotage (antennes, contrats, reporting).
 */
"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import {
  Briefcase,
  Building2,
  FileBarChart2,
  LandPlot,
  ListChecks,
  Sparkles,
  Users,
} from "lucide-react";
import { api } from "@convex/_generated/api";

const MODULES = [
  {
    href: "/pnpe/antennes",
    title: "Antennes",
    desc: "Gérer les 7 antennes régionales + ouvertures à venir.",
    icon: LandPlot,
  },
  {
    href: "/pnpe/contrats",
    title: "Contrats suivis",
    desc: "Apprentissage, professionnalisation, insertion.",
    icon: ListChecks,
  },
  {
    href: "/pnpe/programmes",
    title: "Programmes",
    desc: "Auto-Emploi BMC, sessions de formation.",
    icon: Sparkles,
  },
  {
    href: "/pnpe/reporting",
    title: "Reporting Ministère",
    desc: "Exports mensuels / trimestriels / annuels.",
    icon: FileBarChart2,
  },
] as const;

export default function PnpeBackofficeDashboard() {
  // @ts-expect-error — api.pnpe typé après codegen
  const kpis = useQuery(api.pnpe?.stats?.nationalKpis, {});

  const KPI = [
    {
      label: "D.E inscrits",
      value: kpis?.demandeursInscrits ?? "—",
      icon: Users,
    },
    {
      label: "Offres publiées",
      value: kpis?.offresPubliees ?? "—",
      icon: Briefcase,
    },
    {
      label: "Employeurs vérifiés",
      value: kpis?.employeursVerifies ?? "—",
      icon: Building2,
    },
    {
      label: "Antennes opérationnelles",
      value: kpis?.antennesOperationnelles ?? 7,
      icon: LandPlot,
    },
  ];

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">
          PNPE — Pilotage national
        </h1>
        <p className="text-muted-foreground mt-1">
          Pôle National de Promotion de l'Emploi · Sous tutelle du Ministère
          du Travail.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {KPI.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border bg-card p-4">
              <Icon className="size-4 text-muted-foreground mb-2" />
              <div className="text-3xl font-bold font-display">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border bg-card p-4">
            <div className="text-xs text-muted-foreground mb-1">D.E actifs</div>
            <div className="text-2xl font-bold font-display">
              {kpis.demandeursActifs}
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="text-xs text-muted-foreground mb-1">Placés</div>
            <div className="text-2xl font-bold font-display text-emerald-600">
              {kpis.demandeursPlaces}
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="text-xs text-muted-foreground mb-1">
              Taux de placement
            </div>
            <div className="text-2xl font-bold font-display">
              {kpis.demandeursInscrits > 0
                ? `${((kpis.demandeursPlaces / kpis.demandeursInscrits) * 100).toFixed(1)}%`
                : "—"}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.href}
              href={m.href}
              className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow"
            >
              <Icon className="size-6 text-primary mb-3" />
              <h2 className="font-semibold mb-1">{m.title}</h2>
              <p className="text-sm text-muted-foreground">{m.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
