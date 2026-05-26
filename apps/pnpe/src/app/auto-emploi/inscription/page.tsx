/**
 * Inscription au programme Auto-Emploi.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";

export default function InscriptionAutoEmploi() {
  const router = useRouter();
  const [secteur, setSecteur] = useState("COMMERCE");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const demandeur = useQuery((api as any).functions.pnpe.demandeurs.getMine);
  const enroll = useMutation((api as any).functions.pnpe.autoEmploi.enroll);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demandeur) {
      toast.error("Vous devez être inscrit comme D.E avant.");
      return;
    }
    if (!demandeur.conseillerAttribueId) {
      toast.error(
        "Pas de conseiller PNPE attribué. Patientez ou contactez votre antenne.",
      );
      return;
    }
    setSubmitting(true);
    try {
      await enroll({
        demandeurId: demandeur._id,
        secteurProjet: secteur,
        descriptionProjet: description,
        conseillerReferentId: demandeur.conseillerAttribueId,
      });
      toast.success("Inscription au programme enregistrée.");
      router.push("/auto-emploi/business-plan");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">
          Inscription Auto-Emploi
        </h1>
        <p className="text-muted-foreground mt-1">
          Décrivez votre projet en quelques lignes. Un conseiller PNPE évaluera
          sa viabilité.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="text-sm font-medium block mb-1.5">
            Secteur d'activité
          </label>
          <select
            value={secteur}
            onChange={(e) => setSecteur(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="COMMERCE">Commerce</option>
            <option value="BTP_CONSTRUCTION">BTP / Construction</option>
            <option value="SERVICES_AUX_ENTREPRISES">Services aux entreprises</option>
            <option value="HOTELLERIE_RESTAURATION">Hôtellerie / Restauration</option>
            <option value="AGRICULTURE_PECHE">Agriculture / Pêche</option>
            <option value="TELECOMS_NUMERIQUE">Télécoms / Numérique</option>
            <option value="ARTS_CULTURE_SPORT">Arts / Culture / Sport</option>
            <option value="AUTRES">Autres</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1.5">
            Description du projet
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            placeholder="Décrivez votre activité, votre cible client, votre valeur ajoutée…"
            required
            minLength={50}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Minimum 50 caractères. Soyez concret et précis.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? "Inscription…" : "Démarrer le programme"}
        </button>
      </form>
    </div>
  );
}
