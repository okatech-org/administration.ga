/**
 * Vérification employeur — upload justificatifs DGI/CNSS/RCCM.
 *
 * MVP : marqueur de soumission sans upload réel (Phase 7 branchera storage
 * Convex + actions DGI/CNSS via stubs Phase 7.2).
 */
"use client";

import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { FileCheck2, ShieldCheck } from "lucide-react";
import { api } from "@convex/_generated/api";

export default function VerificationPage() {
  const employeur = useQuery((api as any).functions.pnpe.employeurs.getMine);
  const request = useMutation((api as any).functions.pnpe.employeurs.requestVerification);

  if (employeur === undefined) {
    return <div className="h-64 bg-muted/50 animate-pulse rounded-xl" />;
  }
  if (!employeur) {
    return (
      <p className="text-muted-foreground">
        Créez d'abord votre compte employeur.
      </p>
    );
  }

  const onSubmit = async () => {
    try {
      await request({ employeurId: employeur._id, documents: [] });
      toast.success("Demande de vérification soumise au conseiller PNPE.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  if (employeur.statutVerification === "VERIFIE") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 max-w-2xl">
        <ShieldCheck className="size-8 text-emerald-600 mb-3" />
        <h1 className="text-xl font-semibold mb-1">Entreprise vérifiée</h1>
        <p className="text-sm text-muted-foreground">
          Vous pouvez maintenant publier des offres d'emploi.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">
          Vérification de l'entreprise
        </h1>
        <p className="text-muted-foreground mt-1">
          Soumettez vos justificatifs pour qu'un conseiller PNPE valide votre
          compte.
        </p>
      </div>

      <ul className="space-y-3">
        {[
          { titre: "Attestation d'immatriculation DGI", req: "NIF à jour" },
          { titre: "Attestation CNSS", req: "Régularité sociale" },
          { titre: "RCCM (Registre du Commerce)", req: "Acte constitutif" },
        ].map((doc) => (
          <li key={doc.titre} className="flex items-start gap-3 rounded-lg border bg-card p-4">
            <FileCheck2 className="size-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="font-medium text-sm">{doc.titre}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{doc.req}</div>
              {/* TODO Phase 7 : input file + upload Convex storage. */}
              <button
                type="button"
                disabled
                className="mt-2 rounded-md border px-3 py-1 text-xs opacity-60"
              >
                Joindre — bientôt
              </button>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onSubmit}
        disabled={employeur.statutVerification === "EN_COURS"}
        className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {employeur.statutVerification === "EN_COURS"
          ? "Vérification en cours…"
          : "Soumettre pour vérification"}
      </button>
    </div>
  );
}
