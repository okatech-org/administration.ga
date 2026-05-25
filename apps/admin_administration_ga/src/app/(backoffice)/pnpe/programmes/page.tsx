"use client";

import { Construction } from "lucide-react";

export default function PnpeProgrammesPage() {
  return (
    <div className="container mx-auto px-6 py-8 space-y-6 max-w-3xl">
      <div className="flex items-start gap-4">
        <Construction className="size-8 text-amber-500 shrink-0 mt-1" />
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">
            Programmes PNPE
          </h1>
          <p className="text-muted-foreground mt-1">
            Pilotage des programmes Emploi Salarié, Auto-Emploi et Formation.
          </p>
        </div>
      </div>
      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold text-sm mb-3">À venir</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• KPI par programme</li>
          <li>• Sessions BMC programmées (Auto-Emploi)</li>
          <li>• Taux de réussite et placements</li>
          <li>• Configuration des parcours et étapes</li>
        </ul>
      </div>
    </div>
  );
}
