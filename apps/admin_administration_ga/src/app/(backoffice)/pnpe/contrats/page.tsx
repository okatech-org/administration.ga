"use client";

import { Construction } from "lucide-react";

export default function PnpeContratsPage() {
  return (
    <div className="container mx-auto px-6 py-8 space-y-6 max-w-3xl">
      <div className="flex items-start gap-4">
        <Construction className="size-8 text-amber-500 shrink-0 mt-1" />
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">
            Contrats suivis
          </h1>
          <p className="text-muted-foreground mt-1">
            Pilotage national des contrats d'apprentissage, professionnalisation
            et insertion.
          </p>
        </div>
      </div>
      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold text-sm mb-3">À venir</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Vue agrégée par type de contrat</li>
          <li>• Filtres par antenne, employeur, secteur</li>
          <li>• Alertes contrats rompus ou en retard de suivi</li>
          <li>• Export Excel pour reporting Ministère</li>
        </ul>
      </div>
    </div>
  );
}
