/**
 * Modération des offres employeur (EN_VALIDATION → PUBLIEE).
 */
"use client";

import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { CheckCircle2, FileText, ListChecks } from "lucide-react";
import { api } from "@workspace/api/convex/_generated/api";

const CONTRAT_LABELS: Record<string, string> = {
  CDI: "CDI",
  CDD: "CDD",
  STAGE: "Stage",
  ALTERNANCE: "Alternance",
  INTERIM: "Intérim",
  INSERTION: "Insertion",
  INDEPENDANT: "Indépendant",
};

export default function OffresAValiderPage() {
  // @ts-expect-error — api.pnpe typé après codegen
  const offres = (useQuery(api.pnpe?.offres?.listPending, { limit: 50 }) ?? []) as Array<{
    _id: string;
    reference: string;
    titre: string;
    typeContrat: string;
    lieuTravail: { ville: string };
    _creationTime: number;
  }>;
  // @ts-expect-error
  const validate = useMutation(api.pnpe?.offres?.validate);

  const onValidate = async (id: string) => {
    try {
      await validate({ offreId: id });
      toast.success("Offre publiée.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">
          Offres à valider
        </h1>
        <p className="text-muted-foreground mt-1">
          {offres.length} offre{offres.length > 1 ? "s" : ""} en attente
        </p>
      </div>

      {offres.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <ListChecks className="size-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">Aucune offre en attente.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {offres.map((o) => (
            <li
              key={o._id}
              className="rounded-lg border bg-card p-4 flex items-start justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="font-semibold text-sm">{o.titre}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  <FileText className="size-3 inline mr-1" />
                  Réf {o.reference} ·{" "}
                  {CONTRAT_LABELS[o.typeContrat] ?? o.typeContrat} ·{" "}
                  {o.lieuTravail.ville}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onValidate(o._id)}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 shrink-0"
              >
                <CheckCircle2 className="size-3.5" />
                Valider et publier
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
