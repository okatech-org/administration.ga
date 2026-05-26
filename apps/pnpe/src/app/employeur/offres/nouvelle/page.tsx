/**
 * Création d'une offre d'emploi par un employeur — formulaire simple
 * (Phase 7+ : assistant 5 étapes).
 *
 * Sauvegarde en statut BROUILLON. L'employeur doit ensuite "soumettre"
 * pour validation conseiller PNPE (transition → EN_VALIDATION → PUBLIEE).
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";

type FormState = {
  titre: string;
  description: string;
  missions: string; // multiline split sur \n
  profilRecherche: string;
  typeContrat:
    | "CDI"
    | "CDD"
    | "STAGE"
    | "ALTERNANCE"
    | "INTERIM"
    | "INSERTION"
    | "INDEPENDANT";
  dureeMois: string;
  secteurActivite: string;
  ville: string;
  province: string;
  teletravail: "NON" | "PARTIEL" | "TOTAL";
  salaireMin: string;
  salaireMax: string;
  dateExpiration: string;
};

const initial: FormState = {
  titre: "",
  description: "",
  missions: "",
  profilRecherche: "",
  typeContrat: "CDI",
  dureeMois: "",
  secteurActivite: "AUTRES",
  ville: "Libreville",
  province: "ESTUAIRE",
  teletravail: "NON",
  salaireMin: "",
  salaireMax: "",
  dateExpiration: "",
};

export default function NouvelleOffrePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);

  const employeur = useQuery((api as any).functions.pnpe.employeurs.getMine);
  const createOffre = useMutation((api as any).functions.pnpe.employeurs.createOffre);
  const submitOffre = useMutation((api as any).functions.pnpe.employeurs.submitOffre);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  if (employeur === undefined) {
    return <div className="h-64 bg-muted/50 animate-pulse rounded-xl" />;
  }
  if (!employeur) {
    return (
      <p className="text-muted-foreground">
        Inscrivez-vous comme employeur avant de publier une offre.
      </p>
    );
  }
  if (employeur.statutVerification !== "VERIFIE") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 max-w-2xl">
        <h2 className="font-semibold mb-2">Vérification requise</h2>
        <p className="text-sm text-muted-foreground">
          Votre entreprise doit être vérifiée (DGI + CNSS) avant de publier des
          offres. Rendez-vous dans la rubrique « Vérification ».
        </p>
      </div>
    );
  }

  const onSubmit = async (submitAfter: boolean) => {
    if (!form.titre || !form.description || !form.dateExpiration) {
      toast.error("Titre, description et date d'expiration sont requis.");
      return;
    }
    setSubmitting(true);
    try {
      const offreId = await createOffre({
        employeurId: employeur._id,
        titre: form.titre,
        description: form.description,
        missions: form.missions
          ? form.missions.split("\n").filter(Boolean)
          : undefined,
        profilRecherche: form.profilRecherche || undefined,
        typeContrat: form.typeContrat,
        dureeMois: form.dureeMois ? Number(form.dureeMois) : undefined,
        secteurActivite: form.secteurActivite,
        lieuTravail: {
          province: form.province,
          ville: form.ville,
          teletravail: form.teletravail,
        },
        salaire:
          form.salaireMin && form.salaireMax
            ? {
                min: Number(form.salaireMin),
                max: Number(form.salaireMax),
                devise: "XAF",
                periodicite: "MENSUEL",
              }
            : undefined,
        dateExpiration: new Date(form.dateExpiration).getTime(),
      });
      if (submitAfter) {
        await submitOffre({ offreId });
        toast.success("Offre soumise pour modération.");
      } else {
        toast.success("Offre sauvegardée en brouillon.");
      }
      router.push("/employeur/offres");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">
          Publier une offre
        </h1>
        <p className="text-muted-foreground mt-1">
          Décrivez le poste à pourvoir. L'offre sera validée par un conseiller
          PNPE avant publication.
        </p>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
        <section className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold">Poste</h2>
          <div>
            <label className="text-sm font-medium block mb-1.5">Titre *</label>
            <input
              value={form.titre}
              onChange={(e) => update("titre", e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder="Ex : Développeur Full-Stack"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">
              Description *
            </label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={5}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">
              Missions (une par ligne)
            </label>
            <textarea
              value={form.missions}
              onChange={(e) => update("missions", e.target.value)}
              rows={4}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">
              Profil recherché
            </label>
            <textarea
              value={form.profilRecherche}
              onChange={(e) => update("profilRecherche", e.target.value)}
              rows={3}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold">Contrat & rémunération</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">
                Type de contrat
              </label>
              <select
                value={form.typeContrat}
                onChange={(e) =>
                  update("typeContrat", e.target.value as FormState["typeContrat"])
                }
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
                <option value="STAGE">Stage</option>
                <option value="ALTERNANCE">Alternance</option>
                <option value="INTERIM">Intérim</option>
                <option value="INSERTION">Insertion</option>
                <option value="INDEPENDANT">Indépendant</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">
                Durée (mois)
              </label>
              <input
                type="number"
                value={form.dureeMois}
                onChange={(e) => update("dureeMois", e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                placeholder="CDD/Stage/Alternance"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">
                Secteur
              </label>
              <select
                value={form.secteurActivite}
                onChange={(e) => update("secteurActivite", e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="BTP_CONSTRUCTION">BTP</option>
                <option value="COMMERCE">Commerce</option>
                <option value="SERVICES_AUX_ENTREPRISES">Services</option>
                <option value="TELECOMS_NUMERIQUE">Télécoms / Numérique</option>
                <option value="TRANSPORT_LOGISTIQUE">Transport</option>
                <option value="HOTELLERIE_RESTAURATION">Hôtellerie</option>
                <option value="AUTRES">Autres</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">
                Salaire min (XAF / mois)
              </label>
              <input
                type="number"
                value={form.salaireMin}
                onChange={(e) => update("salaireMin", e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">
                Salaire max (XAF / mois)
              </label>
              <input
                type="number"
                value={form.salaireMax}
                onChange={(e) => update("salaireMax", e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold">Lieu</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">
                Province
              </label>
              <select
                value={form.province}
                onChange={(e) => update("province", e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="ESTUAIRE">Estuaire</option>
                <option value="HAUT_OGOOUE">Haut-Ogooué</option>
                <option value="MOYEN_OGOOUE">Moyen-Ogooué</option>
                <option value="NGOUNIE">Ngounié</option>
                <option value="NYANGA">Nyanga</option>
                <option value="OGOOUE_IVINDO">Ogooué-Ivindo</option>
                <option value="OGOOUE_LOLO">Ogooué-Lolo</option>
                <option value="OGOOUE_MARITIME">Ogooué-Maritime</option>
                <option value="WOLEU_NTEM">Woleu-Ntem</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Ville</label>
              <input
                value={form.ville}
                onChange={(e) => update("ville", e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">
                Télétravail
              </label>
              <select
                value={form.teletravail}
                onChange={(e) =>
                  update("teletravail", e.target.value as FormState["teletravail"])
                }
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="NON">Non</option>
                <option value="PARTIEL">Partiel</option>
                <option value="TOTAL">Total</option>
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold">Diffusion</h2>
          <div>
            <label className="text-sm font-medium block mb-1.5">
              Date d'expiration *
            </label>
            <input
              type="date"
              value={form.dateExpiration}
              onChange={(e) => update("dateExpiration", e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
              required
            />
          </div>
        </section>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onSubmit(false)}
            disabled={submitting}
            className="rounded-lg border px-5 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            Sauvegarder en brouillon
          </button>
          <button
            type="button"
            onClick={() => onSubmit(true)}
            disabled={submitting}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "Envoi…" : "Soumettre pour modération"}
          </button>
        </div>
      </form>
    </div>
  );
}
