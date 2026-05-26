/**
 * Mon profil D.E — édition.
 *
 * Affiche le profil courant + formulaire d'édition des champs principaux
 * (compétences, niveau d'études, préférences). Si pas encore inscrit, redirige
 * vers /demandeur/inscription.
 */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { CheckCircle2, Clock, FileWarning } from "lucide-react";

const STATUT_BADGES: Record<string, { label: string; tone: string; icon: typeof Clock }> = {
  BROUILLON: {
    label: "Profil incomplet",
    tone: "bg-amber-100 text-amber-700 border-amber-200",
    icon: FileWarning,
  },
  EN_VALIDATION: {
    label: "En attente de validation",
    tone: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Clock,
  },
  ACTIF: {
    label: "Compte actif",
    tone: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
};

export default function ProfilDemandeurPage() {
  const router = useRouter();
  const demandeur = useQuery((api as any).functions.pnpe.demandeurs.getMine);

  useEffect(() => {
    if (demandeur === null) {
      router.replace("/demandeur/inscription");
    }
  }, [demandeur, router]);

  if (demandeur === undefined) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted/50 animate-pulse rounded-xl" />
      </div>
    );
  }
  if (!demandeur) return null;

  const badge = STATUT_BADGES[demandeur.statutCompte] ?? STATUT_BADGES.BROUILLON;
  const Icon = badge.icon;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">
            Mon profil
          </h1>
          <p className="text-muted-foreground mt-1">
            {demandeur.prenoms} {demandeur.nom}
          </p>
        </div>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${badge.tone}`}
        >
          <Icon className="size-3.5" />
          {badge.label}
        </div>
      </div>

      {/* Bloc identité */}
      <section className="rounded-xl border bg-card p-6">
        <h2 className="font-semibold mb-4">Identité</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">NIP</dt>
            <dd className="font-mono">{demandeur.nip}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Email</dt>
            <dd>{demandeur.email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Téléphone</dt>
            <dd>{demandeur.telephone}</dd>
          </div>
          {demandeur.telephoneWhatsApp && (
            <div>
              <dt className="text-muted-foreground text-xs">WhatsApp</dt>
              <dd>{demandeur.telephoneWhatsApp}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Bloc parcours */}
      <section className="rounded-xl border bg-card p-6">
        <h2 className="font-semibold mb-4">Mon parcours</h2>
        <p className="text-sm text-muted-foreground">
          {/* TODO Phase 7 : édition complète (formations, expériences, compétences). */}
          Renseignez votre formation, expérience et compétences pour augmenter
          vos chances d'être présélectionné.
        </p>
        <button
          type="button"
          disabled
          className="mt-4 rounded-lg border px-4 py-2 text-sm font-medium opacity-60 cursor-not-allowed"
        >
          Compléter mon CV — bientôt
        </button>
      </section>

      {/* Bloc statut & validation */}
      {demandeur.statutCompte === "BROUILLON" && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="font-semibold mb-2">Soumettre pour validation</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Une fois votre profil complété, soumettez-le pour qu'un conseiller
            PNPE puisse vous contacter (par WhatsApp ou en agence).
          </p>
          <button
            type="button"
            disabled
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Soumettre pour validation
          </button>
        </section>
      )}
    </div>
  );
}
