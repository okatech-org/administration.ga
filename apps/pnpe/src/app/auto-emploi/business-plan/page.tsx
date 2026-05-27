/**
 * Éditeur Business Model Canvas — Tiptap + auto-save (Polish D).
 *
 * Remplace le textarea MVP Phase 4 par un éditeur rich-text Tiptap
 * (gras, italique, listes) par bloc, avec auto-save debounced 2s.
 */
"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { BMCEditor } from "@/components/auto-emploi/BMCEditor";

export default function BusinessPlanPage() {
  const programme = useQuery(api.functions.pnpe.autoEmploi.getMine);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">
          Business Model Canvas
        </h1>
        <p className="text-muted-foreground mt-1">
          Décrivez votre projet en remplissant les 9 blocs. Sauvegarde
          automatique 2 secondes après chaque modification.
        </p>
      </div>

      {programme === undefined ? (
        <div className="h-64 bg-muted/50 animate-pulse rounded-xl" />
      ) : !programme ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 max-w-2xl">
          <h2 className="font-semibold mb-2">Inscription requise</h2>
          <p className="text-sm text-muted-foreground">
            Inscrivez-vous au programme Auto-Emploi avant d'élaborer votre
            business plan.
          </p>
        </div>
      ) : (
        <BMCEditor
          programmeId={programme._id}
          initialContent={programme.businessPlan?.contenuJson as never}
          initialVersion={programme.businessPlan?.version}
        />
      )}
    </div>
  );
}
