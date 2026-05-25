/**
 * Catalogue public d'offres multi-source — TRAVAIL.GA.
 *
 * Affiche les offres `PUBLIEE` quel que soit le typeEmployeur, avec badge
 * et filtre dédié.
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import {
  Briefcase,
  Building2,
  Landmark,
  MapPin,
  Search,
  User,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
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

const TYPE_META: Record<
  string,
  { label: string; icon: typeof Building2; tone: string }
> = {
  ENTREPRISE: {
    label: "Entreprise",
    icon: Building2,
    tone: "bg-blue-100 text-blue-700",
  },
  ADMINISTRATION: {
    label: "Administration",
    icon: Landmark,
    tone: "bg-emerald-100 text-emerald-700",
  },
  PARTICULIER: {
    label: "Particulier",
    icon: User,
    tone: "bg-amber-100 text-amber-700",
  },
};

export default function OffresPage() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<{
    typeEmployeur?: string;
    typeContrat?: string;
    province?: string;
  }>({});

  // @ts-expect-error — api.pnpe typé après codegen Convex
  const offres = (useQuery(api.pnpe?.offresPubliques?.listAllPublished, filters) ??
    []) as Array<{
    _id: string;
    reference: string;
    titre: string;
    description?: string;
    typeContrat: string;
    typeEmployeur: string;
    lieuTravail: { ville: string; province: string };
    salaire?: { min: number; max: number; devise: string };
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
              validée{filteredOffres.length > 1 ? "s" : ""} par le PNPE — toutes
              sources confondues (entreprises, administrations, particuliers)
            </p>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_180px_180px] gap-3">
              <div className="relative">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher…"
                  className="w-full pl-9 rounded-lg border bg-background px-3 py-2.5 text-sm"
                />
              </div>
              <select
                value={filters.typeEmployeur ?? ""}
                onChange={(e) =>
                  setFilters({ ...filters, typeEmployeur: e.target.value || undefined })
                }
                className="rounded-lg border bg-background px-3 py-2.5 text-sm"
              >
                <option value="">Tous émetteurs</option>
                <option value="ENTREPRISE">Entreprises</option>
                <option value="ADMINISTRATION">Administrations</option>
                <option value="PARTICULIER">Particuliers</option>
              </select>
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
                <p className="text-muted-foreground">
                  Aucune offre ne correspond aux critères.
                </p>
              </div>
            ) : (
              filteredOffres.map((o) => {
                const meta = TYPE_META[o.typeEmployeur] ?? TYPE_META.ENTREPRISE;
                const TypeIcon = meta.icon;
                return (
                  <Link
                    key={o._id}
                    href={`/offres/${o.reference}`}
                    className="block rounded-xl border bg-card p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.tone}`}
                      >
                        <TypeIcon className="size-3" />
                        {meta.label}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {o.reference}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="font-semibold text-base mb-1">
                          {o.titre}
                        </h2>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Briefcase className="size-3.5" />
                            {CONTRAT_LABELS[o.typeContrat] ?? o.typeContrat}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3.5" />
                            {o.lieuTravail.ville} ·{" "}
                            {PROVINCE_LABELS[o.lieuTravail.province]}
                          </span>
                          {o.salaire && (
                            <span>
                              {o.salaire.min.toLocaleString("fr-FR")}–
                              {o.salaire.max.toLocaleString("fr-FR")}{" "}
                              {o.salaire.devise}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-primary text-sm font-medium shrink-0">
                        Voir →
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
