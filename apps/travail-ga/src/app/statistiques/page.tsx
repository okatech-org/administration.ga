/**
 * Statistiques publiques du marché de l'emploi gabonais — TRAVAIL.GA.
 */
"use client";

import { useQuery } from "convex/react";
import { Briefcase, LandPlot, TrendingUp, Users } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { api } from "@convex/_generated/api";

export default function StatistiquesPage() {
  
  const kpis = useQuery((api as any).functions.pnpe.stats?.nationalKpis, {});
  
  const byProvince = (useQuery((api as any).functions.pnpe.stats?.demandeursByProvince, {}) ??
    []) as Array<{ province: string; count: number }>;
  
  const bySector = (useQuery((api as any).functions.pnpe.stats?.offresBySector, {}) ?? []) as Array<{
    secteur: string;
    count: number;
  }>;

  const tauxPlacement =
    kpis && kpis.demandeursInscrits > 0
      ? (kpis.demandeursPlaces / kpis.demandeursInscrits) * 100
      : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="bg-primary/5 py-10 border-b">
          <div className="container mx-auto px-6 lg:px-10">
            <h1 className="text-3xl lg:text-4xl font-display font-bold tracking-tight mb-2">
              Statistiques du marché de l'emploi
            </h1>
            <p className="text-muted-foreground">
              Données agrégées et anonymisées — mises à jour en temps réel par
              le PNPE.
            </p>
          </div>
        </section>

        <section className="py-10 space-y-8">
          <div className="container mx-auto px-6 lg:px-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <KpiCard
                icon={Users}
                label="D.E inscrits"
                value={kpis?.demandeursInscrits ?? "—"}
              />
              <KpiCard
                icon={Briefcase}
                label="Offres publiées"
                value={kpis?.offresPubliees ?? "—"}
              />
              <KpiCard
                icon={LandPlot}
                label="Antennes opérationnelles"
                value={kpis?.antennesOperationnelles ?? 7}
              />
              <KpiCard
                icon={TrendingUp}
                label="Taux de placement"
                value={kpis ? `${tauxPlacement.toFixed(1)}%` : "—"}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="D.E inscrits par province">
                {byProvince.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Pas encore de données.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {byProvince
                      .sort((a, b) => b.count - a.count)
                      .map((p) => (
                        <li
                          key={p.province}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>{p.province.replace(/_/g, "-")}</span>
                          <span className="font-mono font-semibold">
                            {p.count}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </Card>

              <Card title="Offres par secteur d'activité">
                {bySector.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Pas encore de données.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {bySector.slice(0, 10).map((s) => (
                      <li
                        key={s.secteur}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{s.secteur.replace(/_/g, " ").toLowerCase()}</span>
                        <span className="font-mono font-semibold">{s.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        </section>
      </main>

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
    <div className="rounded-xl border bg-card p-4">
      <Icon className="size-4 text-muted-foreground mb-2" />
      <div className="text-2xl font-bold font-display">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}
