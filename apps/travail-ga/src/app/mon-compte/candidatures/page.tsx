/**
 * Mes candidatures (citoyen ordinaire) — TRAVAIL.GA.
 */
"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import {
  Briefcase,
  Building2,
  Landmark,
  MapPin,
  Send,
  User,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { api } from "@convex/_generated/api";

const STATUT_LABELS: Record<string, { label: string; tone: string }> = {
  ENVOYEE: { label: "Envoyée", tone: "bg-slate-100 text-slate-700" },
  VUE: { label: "Vue", tone: "bg-blue-100 text-blue-700" },
  PRESELECTIONNEE: {
    label: "Présélectionnée",
    tone: "bg-amber-100 text-amber-700",
  },
  ENTRETIEN: { label: "Entretien", tone: "bg-purple-100 text-purple-700" },
  RETENUE: { label: "Retenue", tone: "bg-emerald-100 text-emerald-700" },
  NON_RETENUE: { label: "Non retenue", tone: "bg-rose-100 text-rose-700" },
  RETIREE: { label: "Retirée", tone: "bg-slate-100 text-slate-500" },
};

const TYPE_ICONS: Record<string, typeof Briefcase> = {
  ENTREPRISE: Building2,
  ADMINISTRATION: Landmark,
  PARTICULIER: User,
};

export default function MesCandidaturesPage() {
  
  const candidatures = (useQuery(
    (api as any).functions.pnpe.citizenMigration?.listMyCandidatures,
  ) ?? []) as Array<{
    _id: string;
    statut: string;
    _creationTime: number;
    offre: {
      reference: string;
      titre: string;
      statut: string;
      typeEmployeur: string;
      lieuTravail: { ville: string };
    } | null;
  }>;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 py-10">
        <div className="container mx-auto px-6 lg:px-10 max-w-3xl">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-display font-bold tracking-tight">
                Mes candidatures
              </h1>
              <p className="text-muted-foreground mt-1">
                {candidatures.length} candidature{candidatures.length > 1 ? "s" : ""}
              </p>
            </div>
            <Link
              href="/offres"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Voir d'autres offres →
            </Link>
          </div>

          {candidatures.length === 0 ? (
            <div className="rounded-xl border bg-card p-12 text-center">
              <Send className="size-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">
                Vous n'avez pas encore postulé.
              </p>
              <Link
                href="/offres"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Voir les offres
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {candidatures.map((c) => {
                const statut = STATUT_LABELS[c.statut] ?? STATUT_LABELS.ENVOYEE;
                const TypeIcon = c.offre
                  ? TYPE_ICONS[c.offre.typeEmployeur] ?? Briefcase
                  : Briefcase;
                return (
                  <li key={c._id} className="rounded-xl border bg-card p-5">
                    {c.offre ? (
                      <>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <Link
                            href={`/offres/${c.offre.reference}`}
                            className="font-semibold text-base hover:text-primary"
                          >
                            {c.offre.titre}
                          </Link>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${statut.tone}`}
                          >
                            {statut.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <TypeIcon className="size-3.5" />
                            {c.offre.typeEmployeur.toLowerCase()}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3.5" />
                            {c.offre.lieuTravail.ville}
                          </span>
                          <span>Réf {c.offre.reference}</span>
                          <span>
                            Envoyé le{" "}
                            {new Date(c._creationTime).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Offre supprimée — candidature du{" "}
                        {new Date(c._creationTime).toLocaleDateString("fr-FR")}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
