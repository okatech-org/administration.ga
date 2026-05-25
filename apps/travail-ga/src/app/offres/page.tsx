/**
 * Catalogue public d'offres d'emploi — TRAVAIL.GA.
 *
 * Pas d'auth, consultation libre. Pour candidater, redirection vers PNPE.GA
 * (inscription D.E requise).
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { Briefcase, Filter, MapPin, Search } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { api } from "@workspace/api/convex/_generated/api";
import { pnpeLink } from "@/lib/utils";

const CONTRAT_LABELS: Record<string, string> = {
  CDI: "CDI",
  CDD: "CDD",
  STAGE: "Stage",
  ALTERNANCE: "Alternance",
  INTERIM: "Intérim",
  INSERTION: "Insertion",
  INDEPENDANT: "Indépendant",
};

const PROVINCES = [
  "ESTUAIRE",
  "HAUT_OGOOUE",
  "MOYEN_OGOOUE",
  "NGOUNIE",
  "NYANGA",
  "OGOOUE_IVINDO",
  "OGOOUE_LOLO",
  "OGOOUE_MARITIME",
  "WOLEU_NTEM",
] as const;

const PROVINCE_LABELS: Record<string, string> = {
  ESTUAIRE: "Estuaire",
  HAUT_OGOOUE: "Haut-Ogooué",
  MOYEN_OGOOUE: "Moyen-Ogooué",
  NGOUNIE: "Ngounié",
  NYANGA: "Nyanga",
  OGOOUE_IVINDO: "Ogooué-Ivindo",
  OGOOUE_LOLO: "Ogooué-Lolo",
  OGOOUE_MARITIME: "Ogooué-Maritime",
  WOLEU_NTEM: "Woleu-Ntem",
};

export default function OffresPage() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<{
    typeContrat?: string;
    province?: string;
  }>({});

  // @ts-expect-error — api.pnpe typé après codegen Convex
  const offres = (useQuery(api.pnpe?.offres?.listPublished, filters) ??
    []) as Array<{
    _id: string;
    reference: string;
    titre: string;
    description?: string;
    typeContrat: string;
    lieuTravail: { ville: string; province: string };
    secteurActivite?: string;
    salaire?: { min: number; max: number; devise: string };
    datePublication?: number;
    nbCandidatures?: number;
  }>;

  const filteredOffres = query
    ? offres.filter(
        (o) =>
          o.titre.toLowerCase().includes(query.toLowerCase()) ||
          o.description?.toLowerCase().includes(query.toLowerCase()),
      )
    : offres;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="bg-primary/5 py-10 border-b">
          <div className="container mx-auto px-6 lg:px-10">
            <h1 className="text-3xl lg:text-4xl font-display font-bold tracking-tight mb-2">
              Catalogue d'offres
            </h1>
            <p className="text-muted-foreground mb-6">
              {filteredOffres.length} offre{filteredOffres.length > 1 ? "s" : ""}{" "}
              validée{filteredOffres.length > 1 ? "s" : ""} par le PNPE
            </p>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_200px] gap-3">
              <div className="relative">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher un titre, mot-clé…"
                  className="w-full pl-9 rounded-lg border bg-background px-3 py-2.5 text-sm"
                />
              </div>
              <select
                value={filters.typeContrat ?? ""}
                onChange={(e) =>
                  setFilters({ ...filters, typeContrat: e.target.value || undefined })
                }
                className="rounded-lg border bg-background px-3 py-2.5 text-sm"
              >
                <option value="">Tous contrats</option>
                {Object.entries(CONTRAT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <select
                value={filters.province ?? ""}
                onChange={(e) =>
                  setFilters({ ...filters, province: e.target.value || undefined })
                }
                className="rounded-lg border bg-background px-3 py-2.5 text-sm"
              >
                <option value="">Toutes provinces</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {PROVINCE_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="py-10">
          <div className="container mx-auto px-6 lg:px-10 space-y-3">
            {filteredOffres.length === 0 ? (
              <div className="rounded-xl border bg-card p-12 text-center">
                <Briefcase className="size-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">
                  Aucune offre ne correspond aux critères.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setFilters({});
                  }}
                  className="text-sm text-primary font-medium"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            ) : (
              filteredOffres.map((o) => (
                <article
                  key={o._id}
                  className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/offres/${o.reference}`}
                        className="font-semibold text-base hover:text-primary"
                      >
                        {o.titre}
                      </Link>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Briefcase className="size-3.5" />
                          {CONTRAT_LABELS[o.typeContrat] ?? o.typeContrat}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5" />
                          {o.lieuTravail.ville} ·{" "}
                          {PROVINCE_LABELS[o.lieuTravail.province]}
                        </span>
                        <span className="font-mono">{o.reference}</span>
                        {o.salaire && (
                          <span>
                            {o.salaire.min.toLocaleString("fr-FR")}–
                            {o.salaire.max.toLocaleString("fr-FR")} {o.salaire.devise}
                          </span>
                        )}
                      </div>
                      {o.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {o.description}
                        </p>
                      )}
                    </div>
                    <a
                      href={pnpeLink(`/demandeur/offres/${o.reference}`)}
                      className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      Candidater →
                    </a>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
