/**
 * Vue agrégée des candidatures reçues sur les offres de l'employeur.
 */
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { Inbox } from "lucide-react";
import { api } from "@workspace/api/convex/_generated/api";

export default function CandidaturesEmployeurPage() {
  const [selectedOffre, setSelectedOffre] = useState<string | null>(null);
  // @ts-expect-error — api.pnpe typé après codegen
  const offres = (useQuery(api.pnpe?.employeurs?.listMyOffres, {}) ?? []) as Array<{
    _id: string;
    titre: string;
    nbCandidatures?: number;
  }>;
  // @ts-expect-error
  const candidatures = (useQuery(
    selectedOffre ? api.pnpe?.candidatures?.listByOffre : "skip",
    selectedOffre ? { offreId: selectedOffre } : "skip",
  ) ?? []) as Array<{
    _id: string;
    statut: string;
    _creationTime: number;
  }>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">
          Candidatures reçues
        </h1>
        <p className="text-muted-foreground mt-1">
          Sélectionnez une offre pour voir ses candidatures.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4">
        <aside className="space-y-1">
          {offres.length === 0 && (
            <p className="text-sm text-muted-foreground p-3">
              Aucune offre. Publiez-en une pour recevoir des candidatures.
            </p>
          )}
          {offres.map((o) => (
            <button
              key={o._id}
              type="button"
              onClick={() => setSelectedOffre(o._id)}
              className={`w-full text-left rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow ${
                selectedOffre === o._id ? "ring-2 ring-primary" : ""
              }`}
            >
              <div className="font-medium text-sm truncate">{o.titre}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {o.nbCandidatures ?? 0} candidature(s)
              </div>
            </button>
          ))}
        </aside>

        <div className="rounded-xl border bg-card p-4 min-h-[300px]">
          {!selectedOffre ? (
            <div className="text-center py-12 text-muted-foreground">
              <Inbox className="size-12 text-muted-foreground/40 mx-auto mb-3" />
              Sélectionnez une offre à gauche
            </div>
          ) : candidatures.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Pas encore de candidature sur cette offre.
            </div>
          ) : (
            <ul className="space-y-2">
              {candidatures.map((c) => (
                <li key={c._id} className="rounded-lg border bg-background p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Candidature #{c._id.slice(-6)}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100">
                      {c.statut}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Reçue le{" "}
                    {new Date(c._creationTime).toLocaleDateString("fr-FR")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
