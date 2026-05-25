/**
 * Reporting PNPE → Ministère du Travail.
 *
 * MVP : structure des rapports (mensuel, trimestriel, annuel) avec stubs
 * d'exports. Branchement Convex aggregates + skill xlsx en Phase 7+.
 */
"use client";

import { Download, FileBarChart2 } from "lucide-react";

const RAPPORTS = [
  {
    titre: "Rapport mensuel",
    desc: "KPI emploi par antenne — D.E inscrits, placements, taux conversion.",
    periode: "Mensuel",
  },
  {
    titre: "Rapport trimestriel",
    desc: "Performance par programme (Salarié, Auto-Emploi, Formation).",
    periode: "Trimestriel",
  },
  {
    titre: "Rapport annuel",
    desc: "Bilan national PNPE + secteurs en tension.",
    periode: "Annuel",
  },
  {
    titre: "Statistiques de placement",
    desc: "Taux d'insertion par tranche d'âge, niveau d'études, province.",
    periode: "À la demande",
  },
] as const;

export default function ReportingPnpePage() {
  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">
          Reporting Ministère du Travail
        </h1>
        <p className="text-muted-foreground mt-1">
          Exports officiels pour le cabinet ministériel et la direction PNPE.
        </p>
      </div>

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {RAPPORTS.map((r) => (
          <li key={r.titre} className="rounded-xl border bg-card p-5">
            <FileBarChart2 className="size-6 text-primary mb-3" />
            <h2 className="font-semibold mb-1">{r.titre}</h2>
            <p className="text-sm text-muted-foreground mb-3">{r.desc}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{r.periode}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs opacity-60"
                >
                  <Download className="size-3.5" />
                  PDF
                </button>
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs opacity-60"
                >
                  <Download className="size-3.5" />
                  Excel
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted-foreground">
        TODO Phase 7+ : génération réelle via Convex aggregates + skill xlsx /
        pdf-lib. Pour MVP, structure et templates seulement.
      </p>
    </div>
  );
}
