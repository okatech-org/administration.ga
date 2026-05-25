/**
 * Backoffice PNPE — gestion des antennes régionales.
 */
"use client";

import { useQuery } from "convex/react";
import { LandPlot, MapPin, Phone, Mail } from "lucide-react";
import { api } from "@convex/_generated/api";

const STATUT_TONE: Record<string, string> = {
  OPERATIONNELLE: "bg-emerald-100 text-emerald-700",
  EN_OUVERTURE: "bg-amber-100 text-amber-700",
  SUSPENDUE: "bg-rose-100 text-rose-700",
  FERMEE: "bg-slate-100 text-slate-500",
};

export default function PnpeAntennesPage() {
  // @ts-expect-error — api.pnpe typé après codegen
  const antennes = (useQuery(api.pnpe?.antennes?.list, {}) ?? []) as Array<{
    _id: string;
    nom: string;
    province: string;
    ville: string;
    telephone?: string;
    email?: string;
    statut: string;
  }>;

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">
          Antennes PNPE
        </h1>
        <p className="text-muted-foreground mt-1">
          {antennes.length} antenne{antennes.length > 1 ? "s" : ""} sur 9 provinces
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {antennes.map((a) => (
          <div key={a._id} className="rounded-xl border bg-card p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <LandPlot className="size-5 text-primary mb-2" />
                <h2 className="font-semibold">{a.nom}</h2>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${STATUT_TONE[a.statut] ?? STATUT_TONE.OPERATIONNELLE}`}
              >
                {a.statut.replace(/_/g, " ").toLowerCase()}
              </span>
            </div>
            <dl className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-3.5" />
                {a.ville} · {a.province.replace(/_/g, "-")}
              </div>
              {a.telephone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-3.5" />
                  {a.telephone}
                </div>
              )}
              {a.email && (
                <div className="flex items-center gap-2 text-muted-foreground truncate">
                  <Mail className="size-3.5" />
                  {a.email}
                </div>
              )}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
