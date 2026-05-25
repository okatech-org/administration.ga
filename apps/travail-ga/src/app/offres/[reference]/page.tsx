/**
 * Détail public d'une offre — TRAVAIL.GA.
 *
 * Affiche les détails enrichis (avec identité de l'émetteur résolue).
 * Bouton "Postuler" → `/postuler/[reference]`.
 */
"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import {
  Briefcase,
  Building2,
  Calendar,
  Landmark,
  MapPin,
  User,
  Flag,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { api } from "@convex/_generated/api";

const TYPE_LABELS: Record<string, { label: string; icon: typeof Building2 }> = {
  ENTREPRISE: { label: "Entreprise", icon: Building2 },
  ADMINISTRATION: { label: "Administration publique", icon: Landmark },
  PARTICULIER: { label: "Particulier", icon: User },
};

const TYPE_TONES: Record<string, string> = {
  ENTREPRISE: "bg-blue-100 text-blue-700",
  ADMINISTRATION: "bg-emerald-100 text-emerald-700",
  PARTICULIER: "bg-amber-100 text-amber-700",
};

const CONTRAT_LABELS: Record<string, string> = {
  CDI: "CDI",
  CDD: "CDD",
  STAGE: "Stage",
  ALTERNANCE: "Alternance",
  INTERIM: "Intérim",
  INSERTION: "Insertion",
  INDEPENDANT: "Indépendant",
};

export default function OffreDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = use(params);
  
  const offre = useQuery((api as any).functions.pnpe.offresPubliques?.getByReferenceEnriched, {
    reference,
  }) as
    | {
        _id: string;
        reference: string;
        titre: string;
        description: string;
        missions?: string[];
        profilRecherche?: string;
        typeContrat: string;
        typeEmployeur: string;
        lieuTravail: { ville: string; province: string };
        salaire?: { min: number; max: number; devise: string };
        dateExpiration: number;
        nbVues?: number;
        nbCandidatures?: number;
        emetteur: { type: string; nom: string; details?: Record<string, unknown> };
      }
    | null
    | undefined;

  if (offre === undefined) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 py-10">
          <div className="container mx-auto px-6 lg:px-10 max-w-3xl">
            <div className="h-64 bg-muted/50 animate-pulse rounded-xl" />
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!offre) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 py-10">
          <div className="container mx-auto px-6 lg:px-10 max-w-3xl text-center">
            <h1 className="text-2xl font-display font-bold mb-3">
              Offre introuvable
            </h1>
            <p className="text-muted-foreground mb-6">
              Cette offre n'existe pas ou a été retirée.
            </p>
            <Link
              href="/offres"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              ← Retour au catalogue
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const typeMeta = TYPE_LABELS[offre.typeEmployeur] ?? TYPE_LABELS.ENTREPRISE;
  const TypeIcon = typeMeta.icon;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 py-10">
        <div className="container mx-auto px-6 lg:px-10 max-w-3xl space-y-6">
          {/* Header */}
          <div className="rounded-2xl border bg-card p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  TYPE_TONES[offre.typeEmployeur] ?? TYPE_TONES.ENTREPRISE
                }`}
              >
                <TypeIcon className="size-3.5" />
                {typeMeta.label}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {offre.reference}
              </span>
            </div>
            <h1 className="text-3xl font-display font-bold tracking-tight mb-2">
              {offre.titre}
            </h1>
            <p className="text-base text-muted-foreground mb-4">
              {offre.emetteur.nom}
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted">
                <Briefcase className="size-3.5" />
                {CONTRAT_LABELS[offre.typeContrat] ?? offre.typeContrat}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted">
                <MapPin className="size-3.5" />
                {offre.lieuTravail.ville} · {offre.lieuTravail.province.replace(/_/g, "-")}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted">
                <Calendar className="size-3.5" />
                Expire le {new Date(offre.dateExpiration).toLocaleDateString("fr-FR")}
              </span>
              {offre.salaire && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700">
                  {offre.salaire.min.toLocaleString("fr-FR")}–
                  {offre.salaire.max.toLocaleString("fr-FR")}{" "}
                  {offre.salaire.devise}/mois
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <section className="rounded-xl border bg-card p-6">
            <h2 className="font-semibold mb-3">Description</h2>
            <p className="text-sm whitespace-pre-line">{offre.description}</p>
          </section>

          {offre.missions && offre.missions.length > 0 && (
            <section className="rounded-xl border bg-card p-6">
              <h2 className="font-semibold mb-3">Missions</h2>
              <ul className="space-y-1.5 text-sm">
                {offre.missions.map((m, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-current mt-2" />
                    {m}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {offre.profilRecherche && (
            <section className="rounded-xl border bg-card p-6">
              <h2 className="font-semibold mb-3">Profil recherché</h2>
              <p className="text-sm whitespace-pre-line">{offre.profilRecherche}</p>
            </section>
          )}

          {/* CTA */}
          <div className="rounded-2xl border-2 border-primary bg-primary/5 p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Intéressé(e) par ce poste ?</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Postulez en quelques clics. Si vous êtes déjà D.E inscrit au PNPE,
              connectez-vous d'abord pour candidater avec votre profil complet.
            </p>
            <Link
              href={`/postuler/${offre.reference}`}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Postuler à cette offre →
            </Link>
          </div>

          {/* Signaler */}
          {offre.typeEmployeur === "PARTICULIER" && (
            <div className="text-center">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-rose-600"
                onClick={() =>
                  alert(
                    "Le signalement sera disponible prochainement. En attendant, contactez contact@pnpe.ga",
                  )
                }
              >
                <Flag className="size-3" />
                Signaler une offre suspecte
              </button>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
