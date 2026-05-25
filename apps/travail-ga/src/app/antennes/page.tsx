/**
 * Annuaire public des 7 antennes PNPE — TRAVAIL.GA.
 */
"use client";

import { useQuery } from "convex/react";
import { LandPlot, Mail, MapPin, Phone } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { api } from "@convex/_generated/api";

const STATUT_TONES: Record<string, string> = {
  OPERATIONNELLE: "bg-emerald-100 text-emerald-700",
  EN_OUVERTURE: "bg-amber-100 text-amber-700",
};

const STATUT_LABELS: Record<string, string> = {
  OPERATIONNELLE: "Ouverte",
  EN_OUVERTURE: "Ouverture prochaine",
  SUSPENDUE: "Suspendue",
  FERMEE: "Fermée",
};

export default function AntennesPage() {
  
  const antennes = (useQuery((api as any).functions.pnpe.antennes?.list, {}) ?? []) as Array<{
    _id: string;
    nom: string;
    ville: string;
    province: string;
    telephone?: string;
    email?: string;
    statut: string;
  }>;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="bg-primary/5 py-10 border-b">
          <div className="container mx-auto px-6 lg:px-10">
            <h1 className="text-3xl lg:text-4xl font-display font-bold tracking-tight mb-2">
              7 antennes régionales PNPE
            </h1>
            <p className="text-muted-foreground">
              Rendez-vous, inscription, accompagnement : trouvez l'antenne la
              plus proche de chez vous.
            </p>
          </div>
        </section>

        <section className="py-10">
          <div className="container mx-auto px-6 lg:px-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {antennes.map((a) => (
              <div key={a._id} className="rounded-xl border bg-card p-5">
                <div className="flex items-start justify-between mb-3">
                  <LandPlot className="size-5 text-primary" />
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      STATUT_TONES[a.statut] ?? STATUT_TONES.OPERATIONNELLE
                    }`}
                  >
                    {STATUT_LABELS[a.statut] ?? a.statut}
                  </span>
                </div>
                <h2 className="font-semibold mb-1">{a.nom}</h2>
                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                  <MapPin className="size-3" />
                  {a.ville} · {a.province.replace(/_/g, "-")}
                </p>
                <div className="space-y-1.5 text-sm">
                  {a.telephone && (
                    <a
                      href={`tel:${a.telephone}`}
                      className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <Phone className="size-3.5" />
                      {a.telephone}
                    </a>
                  )}
                  {a.email && (
                    <a
                      href={`mailto:${a.email}`}
                      className="flex items-center gap-2 text-muted-foreground hover:text-foreground truncate"
                    >
                      <Mail className="size-3.5" />
                      {a.email}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
