/**
 * File d'attente conseiller — D.E en attente de validation.
 *
 * Affiche les demandeurs avec `statutCompte === "EN_VALIDATION"` rattachés
 * aux antennes du conseiller. MVP : récupère via listByAntenne et permet
 * la validation rapide.
 */
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { CheckCircle2, Inbox, Phone } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

export default function FileAttentePage() {
  const [selectedAntenneId, setSelectedAntenneId] = useState<string>("");
  const antennes = (useQuery(api.functions.pnpe.antennes.list, {}) ?? []) as Array<{
    _id: string;
    slug: string;
    nom: string;
  }>;
  const demandeurs = (useQuery(
    api.functions.pnpe.demandeurs.listByAntenne,
    selectedAntenneId
      ? {
          antenneId: selectedAntenneId as Id<"antennesPnpe">,
          statut: "EN_VALIDATION" as const,
        }
      : "skip",
  ) ?? []) as Array<{
    _id: string;
    nom: string;
    prenoms: string;
    nip: string;
    telephoneWhatsApp?: string;
    _creationTime: number;
  }>;
  const validate = useMutation(api.functions.pnpe.demandeurs.validateDemandeur);

  const onValidate = async (id: string) => {
    try {
      await validate({ demandeurId: id as Id<"demandeursEmploi"> });
      toast.success("D.E validé. Statut → ACTIF.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">
          File d'attente
        </h1>
        <p className="text-muted-foreground mt-1">
          Validez les inscriptions D.E après contact (WhatsApp ou visite agence).
        </p>
      </div>

      <div>
        <label className="text-sm font-medium block mb-1.5">Antenne</label>
        <select
          value={selectedAntenneId}
          onChange={(e) => setSelectedAntenneId(e.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">-- Choisir une antenne --</option>
          {antennes.map((a) => (
            <option key={a._id} value={a._id}>
              {a.nom}
            </option>
          ))}
        </select>
      </div>

      {!selectedAntenneId ? null : demandeurs.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Inbox className="size-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">
            File vide. Tous les D.E de cette antenne sont à jour.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {demandeurs.map((d) => (
            <li
              key={d._id}
              className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4"
            >
              <div className="min-w-0">
                <div className="font-semibold text-sm">
                  {d.prenoms} {d.nom}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  NIP {d.nip} · Inscrit{" "}
                  {new Date(d._creationTime).toLocaleDateString("fr-FR")}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {d.telephoneWhatsApp && (
                  <a
                    href={`https://wa.me/${d.telephoneWhatsApp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    <Phone className="size-3.5" />
                    WhatsApp
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => onValidate(d._id)}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <CheckCircle2 className="size-3.5" />
                  Valider
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
