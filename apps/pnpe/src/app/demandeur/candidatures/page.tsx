/**
 * Mes candidatures — vue Kanban D.E.
 *
 * Affiche les candidatures du D.E par statut (envoyée / vue / présélectionnée
 * / entretien / retenue / non retenue). En MVP Phase 2, vue liste par
 * colonne ; Phase 7+ kanban drag-and-drop.
 */
"use client";

import { useQuery } from "convex/react";
import { Send } from "lucide-react";
import { api } from "@workspace/api/convex/_generated/api";

const COLUMNS = [
  { key: "ENVOYEE", label: "Envoyées", tone: "bg-slate-100 text-slate-700" },
  { key: "VUE", label: "Vues", tone: "bg-blue-100 text-blue-700" },
  { key: "PRESELECTIONNEE", label: "Présélectionnées", tone: "bg-amber-100 text-amber-700" },
  { key: "ENTRETIEN", label: "Entretien", tone: "bg-purple-100 text-purple-700" },
  { key: "RETENUE", label: "Retenue", tone: "bg-emerald-100 text-emerald-700" },
  { key: "NON_RETENUE", label: "Non retenue", tone: "bg-rose-100 text-rose-700" },
] as const;

type Candidature = {
  _id: string;
  statut: string;
  _creationTime: number;
  offre: { titre: string; reference: string; lieuTravail: { ville: string } } | null;
};

export default function CandidaturesPage() {
  // @ts-expect-error — api.pnpe sera typé après codegen Convex
  const candidatures = (useQuery(api.pnpe?.candidatures?.listMine, {}) ?? []) as Candidature[];

  const byStatus = COLUMNS.reduce(
    (acc, col) => {
      acc[col.key] = candidatures.filter((c) => c.statut === col.key);
      return acc;
    },
    {} as Record<string, Candidature[]>,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">
          Mes candidatures
        </h1>
        <p className="text-muted-foreground mt-1">
          {candidatures.length} candidature{candidatures.length > 1 ? "s" : ""} au
          total
        </p>
      </div>

      {candidatures.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Send className="size-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">
            Vous n'avez pas encore postulé. Parcourez les offres et trouvez votre
            prochain emploi.
          </p>
          <a
            href="/demandeur/offres"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Voir les offres →
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {COLUMNS.map((col) => {
            const items = byStatus[col.key] ?? [];
            return (
              <div key={col.key} className="rounded-xl border bg-card">
                <div className="border-b px-4 py-3 flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{col.label}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${col.tone}`}>
                    {items.length}
                  </span>
                </div>
                <div className="p-3 space-y-2 min-h-[100px]">
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      —
                    </p>
                  ) : (
                    items.map((c) => (
                      <div
                        key={c._id}
                        className="rounded-lg border bg-background p-3 text-sm"
                      >
                        <div className="font-medium truncate">
                          {c.offre?.titre ?? "Offre supprimée"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {c.offre?.lieuTravail.ville} ·{" "}
                          {new Date(c._creationTime).toLocaleDateString("fr-FR")}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
