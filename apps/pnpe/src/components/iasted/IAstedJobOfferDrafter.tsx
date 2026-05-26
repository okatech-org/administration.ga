/**
 * Widget iAsted Emploi — assistance à la rédaction d'offre.
 *
 * Branche `api.functions.pnpe.iastedEmploi.draftJobOffer` qui génère
 * une description type depuis les paramètres clés (titre, secteur,
 * type de contrat, niveau, salaire). L'employeur peut cliquer "Insérer"
 * pour copier le draft dans le champ `description` de son formulaire.
 *
 * UI volontairement compacte : un bouton, un drawer/expansion, un bouton
 * d'insertion. Pas de chat conversationnel — focus sur l'aide rapide.
 */
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { Sparkles, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { FunctionArgs } from "convex/server";

type DraftArgs = FunctionArgs<
  typeof api.functions.pnpe.iastedEmploi.draftJobOffer
>;
type Secteur = DraftArgs["secteur"];
type TypeContrat = DraftArgs["typeContrat"];

type Props = {
  titre: string;
  secteur: Secteur;
  typeContrat: TypeContrat;
  salaireMin?: number;
  salaireMax?: number;
  onInsert: (description: string, missions: string[]) => void;
};

export function IAstedJobOfferDrafter({
  titre,
  secteur,
  typeContrat,
  salaireMin,
  salaireMax,
  onInsert,
}: Props) {
  const [open, setOpen] = useState(false);
  const [inserted, setInserted] = useState(false);

  const canRequest = !!titre && titre.length >= 3;

  const draft = useQuery(
    api.functions.pnpe.iastedEmploi.draftJobOffer,
    open && canRequest
      ? {
          titre,
          secteur,
          typeContrat,
          salaireMin,
          salaireMax,
        }
      : "skip",
  );

  const handleInsert = () => {
    if (!draft) return;
    onInsert(draft.description, draft.missions);
    setInserted(true);
    toast.success("Brouillon iAsted inséré.");
    setTimeout(() => setInserted(false), 2000);
  };

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-emerald-500/10 transition-colors"
      >
        <Sparkles className="size-4 text-emerald-600" />
        <span className="flex-1 text-left">
          {open ? "Masquer" : "Générer"} une description type avec iAsted
        </span>
        {!canRequest && (
          <span className="text-xs text-muted-foreground">
            Renseignez le titre d&apos;abord
          </span>
        )}
      </button>

      {open && canRequest && (
        <div className="border-t border-emerald-500/30 p-4 space-y-3">
          {draft === undefined ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Génération en cours…
            </div>
          ) : (
            <>
              <div className="rounded-lg bg-background border p-3 space-y-3 text-sm whitespace-pre-wrap">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Description suggérée
                  </div>
                  <p>{draft.description}</p>
                </div>
                {draft.missions.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                      Missions clés
                    </div>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {draft.missions.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInsert}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700"
                >
                  {inserted ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {inserted ? "Inséré" : "Insérer dans le formulaire"}
                </button>
                <span className="text-xs text-muted-foreground">
                  Vous pouvez ensuite éditer librement.
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
