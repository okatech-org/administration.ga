/**
 * Catalogue d'offres d'emploi PNPE — vue D.E.
 *
 * Liste les offres `PUBLIEE` avec filtres secteur/contrat/province.
 * Au clic, ouvre `/demandeur/offres/[reference]` pour candidater (Phase 2.1).
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { Briefcase, Filter, MapPin } from "lucide-react";
import { api } from "@convex/_generated/api";

const CONTRAT_LABELS: Record<string, string> = {
  CDI: "CDI",
  CDD: "CDD",
  STAGE: "Stage",
  ALTERNANCE: "Alternance",
  INTERIM: "Intérim",
  INSERTION: "Insertion",
  INDEPENDANT: "Indépendant",
};

export default function OffresPage() {
  const [filters, setFilters] = useState<{
    typeContrat?: string;
    province?: string;
  }>({});

  const offres = useQuery((api as any).functions.pnpe.offres.listPublished, filters) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">
            Offres d'emploi
          </h1>
          <p className="text-muted-foreground mt-1">
            {offres.length} offre{offres.length > 1 ? "s" : ""} disponible
            {offres.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
        <Filter className="size-4 text-muted-foreground" />
        <select
          value={filters.typeContrat ?? ""}
          onChange={(e) =>
            setFilters({
              ...filters,
              typeContrat: e.target.value || undefined,
            })
          }
          className="rounded-lg border bg-background px-3 py-1.5 text-sm"
        >
          <option value="">Tous types de contrat</option>
          {Object.entries(CONTRAT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {/* Liste */}
      {offres.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Briefcase className="size-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">
            Aucune offre ne correspond à vos critères pour le moment.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {offres.map((offre: {
            _id: string;
            reference: string;
            titre: string;
            typeContrat: string;
            lieuTravail: { ville: string; province: string };
            datePublication?: number;
            nbCandidatures?: number;
          }) => (
            <Link
              key={offre._id}
              href={`/demandeur/offres/${offre.reference}`}
              className="block rounded-xl border bg-card p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="font-semibold text-base mb-1 truncate">
                    {offre.titre}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Briefcase className="size-3.5" />
                      {CONTRAT_LABELS[offre.typeContrat] ?? offre.typeContrat}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {offre.lieuTravail.ville}
                    </span>
                    <span>Réf : {offre.reference}</span>
                    {offre.nbCandidatures != null && (
                      <span>{offre.nbCandidatures} candidature(s)</span>
                    )}
                  </div>
                </div>
                <span className="text-primary text-sm font-medium shrink-0">
                  Voir →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
