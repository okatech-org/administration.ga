/**
 * Inscription Employeur PNPE.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";

type FormState = {
  raisonSociale: string;
  nif: string;
  rccm: string;
  secteurActivite: string;
  tailleEntreprise: "TPE" | "PME" | "ETI" | "GE";
  effectif: string;
  adresseRue: string;
  adresseVille: string;
  provinceSiege: string;
  representantNom: string;
  representantPrenoms: string;
  representantFonction: string;
  representantEmail: string;
  representantTelephone: string;
};

const initial: FormState = {
  raisonSociale: "",
  nif: "",
  rccm: "",
  secteurActivite: "AUTRES",
  tailleEntreprise: "PME",
  effectif: "",
  adresseRue: "",
  adresseVille: "",
  provinceSiege: "ESTUAIRE",
  representantNom: "",
  representantPrenoms: "",
  representantFonction: "",
  representantEmail: "",
  representantTelephone: "",
};

export default function InscriptionEmployeurPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);
  // @ts-expect-error — api.pnpe typé après codegen
  const createEmployeur = useMutation(api.pnpe?.employeurs?.create);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createEmployeur({
        raisonSociale: form.raisonSociale,
        nif: form.nif,
        rccm: form.rccm || undefined,
        secteurActivite: form.secteurActivite,
        tailleEntreprise: form.tailleEntreprise,
        effectif: form.effectif ? Number(form.effectif) : undefined,
        adresseSiege: {
          street: form.adresseRue,
          city: form.adresseVille,
          country: "GA",
        },
        provinceSiege: form.provinceSiege,
        representantLegal: {
          nom: form.representantNom,
          prenoms: form.representantPrenoms,
          fonction: form.representantFonction,
          email: form.representantEmail,
          telephone: form.representantTelephone,
        },
      });
      toast.success("Compte employeur créé ! Procédez à la vérification.");
      router.push("/employeur/verification");
    } catch (err) {
      const m = err instanceof Error ? err.message : "Erreur";
      toast.error(m);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-display font-bold tracking-tight mb-2">
        Créer un compte entreprise
      </h1>
      <p className="text-muted-foreground mb-8">
        Renseignez l'identité légale de votre entreprise. La vérification (DGI
        + CNSS) sera demandée à l'étape suivante.
      </p>

      <form onSubmit={onSubmit} className="space-y-6">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold mb-4">Identité légale</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium block mb-1.5">
                Raison sociale *
              </label>
              <input
                value={form.raisonSociale}
                onChange={(e) => update("raisonSociale", e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">NIF *</label>
              <input
                value={form.nif}
                onChange={(e) => update("nif", e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">RCCM</label>
              <input
                value={form.rccm}
                onChange={(e) => update("rccm", e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold mb-4">Activité & taille</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">Secteur</label>
              <select
                value={form.secteurActivite}
                onChange={(e) => update("secteurActivite", e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="BTP_CONSTRUCTION">BTP / Construction</option>
                <option value="COMMERCE">Commerce</option>
                <option value="SERVICES_AUX_ENTREPRISES">Services aux entreprises</option>
                <option value="INDUSTRIE_MANUFACTURE">Industrie / Manufacture</option>
                <option value="HOTELLERIE_RESTAURATION">Hôtellerie / Restauration</option>
                <option value="TELECOMS_NUMERIQUE">Télécoms / Numérique</option>
                <option value="BANQUE_ASSURANCE">Banque / Assurance</option>
                <option value="TRANSPORT_LOGISTIQUE">Transport / Logistique</option>
                <option value="AUTRES">Autres</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Taille</label>
              <select
                value={form.tailleEntreprise}
                onChange={(e) =>
                  update("tailleEntreprise", e.target.value as FormState["tailleEntreprise"])
                }
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="TPE">TPE (0-9)</option>
                <option value="PME">PME (10-49)</option>
                <option value="ETI">ETI (50-249)</option>
                <option value="GE">GE (250+)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Effectif</label>
              <input
                type="number"
                value={form.effectif}
                onChange={(e) => update("effectif", e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold mb-4">Représentant légal</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">Nom *</label>
              <input
                value={form.representantNom}
                onChange={(e) => update("representantNom", e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Prénoms *</label>
              <input
                value={form.representantPrenoms}
                onChange={(e) => update("representantPrenoms", e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Fonction *</label>
              <input
                value={form.representantFonction}
                onChange={(e) => update("representantFonction", e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                placeholder="DG, DRH…"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Email *</label>
              <input
                type="email"
                value={form.representantEmail}
                onChange={(e) => update("representantEmail", e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium block mb-1.5">Téléphone *</label>
              <input
                type="tel"
                value={form.representantTelephone}
                onChange={(e) => update("representantTelephone", e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                required
              />
            </div>
          </div>
        </section>

        <div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "Création…" : "Créer mon compte entreprise"}
          </button>
        </div>
      </form>
    </div>
  );
}
