/**
 * Page accueil Espace Demandeur — tableau de bord personnel.
 *
 * Affiche les KPI personnels du D.E (candidatures envoyées, vues du profil,
 * formation en cours) et les actions rapides. En MVP Phase 2, données
 * factices ; à brancher sur Convex queries en Phase 7+.
 */
"use client";

import Link from "next/link";
import { Briefcase, Send, GraduationCap, Eye } from "lucide-react";

const KPI = [
  { label: "Candidatures envoyées", value: "—", icon: Send },
  { label: "Vues de mon profil", value: "—", icon: Eye },
  { label: "Offres consultées", value: "—", icon: Briefcase },
  { label: "Formations en cours", value: "—", icon: GraduationCap },
] as const;

export default function DemandeurHomePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">
          Bienvenue sur votre espace
        </h1>
        <p className="text-muted-foreground mt-1">
          Suivez vos candidatures, mettez à jour votre profil et trouvez votre
          prochain emploi.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {KPI.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border bg-card p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold font-display">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/demandeur/offres"
          className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow"
        >
          <Briefcase className="size-6 text-primary mb-3" />
          <h2 className="font-semibold mb-1">Parcourir les offres</h2>
          <p className="text-sm text-muted-foreground">
            Trouvez des offres correspondant à votre profil.
          </p>
        </Link>
        <Link
          href="/demandeur/profil"
          className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow"
        >
          <Send className="size-6 text-primary mb-3" />
          <h2 className="font-semibold mb-1">Compléter mon profil</h2>
          <p className="text-sm text-muted-foreground">
            Un profil complet augmente vos chances de placement.
          </p>
        </Link>
      </div>
    </div>
  );
}
