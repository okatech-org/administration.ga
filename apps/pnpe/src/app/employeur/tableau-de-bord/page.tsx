/**
 * Tableau de bord employeur — KPI principaux.
 */
"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Briefcase, CheckCircle2, Clock, Inbox } from "lucide-react";
import { api } from "@convex/_generated/api";

const STATUT_LABELS: Record<string, { label: string; tone: string; icon: typeof Clock }> = {
  NON_VERIFIE: { label: "Non vérifié", tone: "bg-slate-100 text-slate-700", icon: Clock },
  EN_COURS: { label: "Vérification en cours", tone: "bg-amber-100 text-amber-700", icon: Clock },
  VERIFIE: { label: "Vérifié", tone: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  REJETE: { label: "Rejeté", tone: "bg-rose-100 text-rose-700", icon: Clock },
};

export default function EmployeurDashboardPage() {
  const employeur = useQuery(api.functions.pnpe.employeurs.getMine);
  const offres = (useQuery(api.functions.pnpe.employeurs.listMyOffres, {}) ?? []) as Array<{
    statut: string;
    nbCandidatures?: number;
  }>;

  if (employeur === undefined) {
    return <div className="h-64 bg-muted/50 animate-pulse rounded-xl" />;
  }

  if (!employeur) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold mb-2">Bienvenue sur le PNPE</h1>
        <p className="text-muted-foreground mb-6">
          Pour publier des offres d'emploi, créez votre compte employeur.
        </p>
        <Link
          href="/employeur/inscription"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Créer mon compte entreprise
        </Link>
      </div>
    );
  }

  const badge = STATUT_LABELS[employeur.statutVerification] ?? STATUT_LABELS.NON_VERIFIE;
  const Icon = badge.icon;

  const totalCandidatures = offres.reduce(
    (acc, o) => acc + (o.nbCandidatures ?? 0),
    0,
  );
  const offresActives = offres.filter((o) => o.statut === "PUBLIEE").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">
            {employeur.raisonSociale}
          </h1>
          <p className="text-muted-foreground mt-1">NIF : {employeur.nif}</p>
        </div>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${badge.tone}`}
        >
          <Icon className="size-3.5" />
          {badge.label}
        </div>
      </div>

      {employeur.statutVerification !== "VERIFIE" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-semibold mb-1">Vérification requise</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Pour publier des offres, votre entreprise doit être vérifiée par
            un conseiller PNPE. Soumettez les justificatifs DGI et CNSS.
          </p>
          <Link
            href="/employeur/verification"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Lancer la vérification →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <Briefcase className="size-4 text-muted-foreground mb-2" />
          <div className="text-2xl font-bold font-display">{offres.length}</div>
          <div className="text-xs text-muted-foreground">Offres au total</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <CheckCircle2 className="size-4 text-emerald-500 mb-2" />
          <div className="text-2xl font-bold font-display">{offresActives}</div>
          <div className="text-xs text-muted-foreground">Offres publiées</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <Inbox className="size-4 text-primary mb-2" />
          <div className="text-2xl font-bold font-display">
            {totalCandidatures}
          </div>
          <div className="text-xs text-muted-foreground">Candidatures reçues</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <Clock className="size-4 text-muted-foreground mb-2" />
          <div className="text-2xl font-bold font-display">—</div>
          <div className="text-xs text-muted-foreground">Taux pourvoi</div>
        </div>
      </div>
    </div>
  );
}
