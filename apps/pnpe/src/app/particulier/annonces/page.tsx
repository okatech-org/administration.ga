"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Briefcase, Plus } from "lucide-react";
import { api } from "@convex/_generated/api";

const STATUT_TONE: Record<string, string> = {
  PUBLIEE: "bg-emerald-100 text-emerald-700",
  EN_VALIDATION: "bg-amber-100 text-amber-700",
  BROUILLON: "bg-muted text-muted-foreground",
  EXPIREE: "bg-stone-200 text-stone-700",
  RETIREE: "bg-rose-100 text-rose-700",
  POURVUE: "bg-blue-100 text-blue-700",
};

export default function MesAnnoncesParticulier() {
  // @ts-expect-error api.pnpe type apres codegen
  const list = useQuery(api.pnpe?.citoyenAccount?.listMyAnnonces) as
    | Array<{
        _id: string;
        titre: string;
        reference: string;
        statut: string;
        _creationTime: number;
        candidaturesCount: number;
        ville: string;
        typeContrat: string;
      }>
    | undefined;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">
            Mes annonces publiees
          </h1>
          <p className="text-muted-foreground mt-1">
            {list?.length ?? 0} annonce{(list?.length ?? 0) > 1 ? "s" : ""} —
            cliquez pour voir les candidatures recues.
          </p>
        </div>
        <a
          href="https://travail.ga/publier-annonce/particulier"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-4" />
          Publier
        </a>
      </header>

      {!list ? (
        <div className="rounded-xl border p-6 animate-pulse h-32" />
      ) : list.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-3">
          {list.map((a) => (
            <li
              key={a._id}
              className="rounded-xl border bg-card p-4 hover:border-primary/40 transition-colors"
            >
              <Link href={`/particulier/annonces/${a.reference}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="font-semibold">{a.titre}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Ref. {a.reference} · {a.typeContrat} · {a.ville} ·
                      Publiee le{" "}
                      {new Date(a._creationTime).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUT_TONE[a.statut] ?? "bg-muted"
                    }`}
                  >
                    {a.statut}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  <strong>{a.candidaturesCount}</strong> candidature
                  {a.candidaturesCount > 1 ? "s" : ""} recue
                  {a.candidaturesCount > 1 ? "s" : ""}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border-2 border-dashed p-10 text-center">
      <Briefcase className="size-10 mx-auto text-muted-foreground mb-3" />
      <p className="text-muted-foreground mb-3">
        Vous n'avez pas encore publie d'annonce comme particulier.
      </p>
      <a
        href="https://travail.ga/publier-annonce/particulier"
        target="_blank"
        rel="noreferrer"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Publier une premiere annonce
      </a>
    </div>
  );
}
