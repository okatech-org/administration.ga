/**
 * Liste des offres de l'employeur connecté.
 */
"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Briefcase, PlusCircle } from "lucide-react";
import { api } from "@convex/_generated/api";

const STATUT_COLORS: Record<string, string> = {
  BROUILLON: "bg-slate-100 text-slate-700",
  EN_VALIDATION: "bg-amber-100 text-amber-700",
  PUBLIEE: "bg-emerald-100 text-emerald-700",
  POURVUE: "bg-blue-100 text-blue-700",
  EXPIREE: "bg-rose-100 text-rose-700",
  RETIREE: "bg-slate-100 text-slate-700",
};

const STATUT_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  EN_VALIDATION: "En validation",
  PUBLIEE: "Publiée",
  POURVUE: "Pourvue",
  EXPIREE: "Expirée",
  RETIREE: "Retirée",
};

export default function MesOffresPage() {
  const offres = (useQuery((api as any).functions.pnpe.employeurs.listMyOffres, {}) ?? []) as Array<{
    _id: string;
    reference: string;
    titre: string;
    statut: string;
    nbCandidatures?: number;
    dateExpiration: number;
  }>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">
            Mes offres d'emploi
          </h1>
          <p className="text-muted-foreground mt-1">
            {offres.length} offre{offres.length > 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/employeur/offres/nouvelle"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <PlusCircle className="size-4" />
          Nouvelle offre
        </Link>
      </div>

      {offres.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Briefcase className="size-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">
            Vous n'avez pas encore publié d'offre.
          </p>
          <Link
            href="/employeur/offres/nouvelle"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Publier ma première offre
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-xs">
              <tr>
                <th className="text-left p-3 font-medium">Référence</th>
                <th className="text-left p-3 font-medium">Titre</th>
                <th className="text-left p-3 font-medium">Statut</th>
                <th className="text-center p-3 font-medium">Candidatures</th>
                <th className="text-left p-3 font-medium">Expire le</th>
              </tr>
            </thead>
            <tbody>
              {offres.map((o) => (
                <tr key={o._id} className="border-b last:border-0">
                  <td className="p-3 font-mono text-xs">{o.reference}</td>
                  <td className="p-3 font-medium">{o.titre}</td>
                  <td className="p-3">
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full ${
                        STATUT_COLORS[o.statut] ?? STATUT_COLORS.BROUILLON
                      }`}
                    >
                      {STATUT_LABELS[o.statut] ?? o.statut}
                    </span>
                  </td>
                  <td className="p-3 text-center">{o.nbCandidatures ?? 0}</td>
                  <td className="p-3 text-muted-foreground text-xs">
                    {new Date(o.dateExpiration).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
