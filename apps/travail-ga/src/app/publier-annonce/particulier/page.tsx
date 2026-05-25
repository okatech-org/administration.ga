/**
 * Formulaire « Publier comme particulier » — TRAVAIL.GA.
 *
 * Auth requise (compte Better Auth basique). Soumet une offre avec
 * typeEmployeur=PARTICULIER + particulierInfo. Workflow : statut
 * EN_VALIDATION jusqu'à modération conseiller PNPE.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { api } from "@convex/_generated/api";

type FormState = {
  nom: string;
  prenoms: string;
  email: string;
  telephone: string;
  nip: string;
  titre: string;
  description: string;
  typeContrat: "CDD" | "CDI" | "STAGE" | "ALTERNANCE" | "INTERIM" | "INDEPENDANT";
  ville: string;
  province: string;
  salaireMin: string;
  salaireMax: string;
  dateExpiration: string;
};

const initial: FormState = {
  nom: "",
  prenoms: "",
  email: "",
  telephone: "",
  nip: "",
  titre: "",
  description: "",
  typeContrat: "CDD",
  ville: "Libreville",
  province: "ESTUAIRE",
  salaireMin: "",
  salaireMax: "",
  dateExpiration: "",
};

export default function PublierParticulierPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);

  // @ts-expect-error — api.pnpe typé après codegen
  const create = useMutation(api.pnpe?.offresPubliques?.createByParticulier);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.dateExpiration) {
      toast.error("Date d'expiration requise.");
      return;
    }
    setSubmitting(true);
    try {
      await create({
        particulierInfo: {
          nom: form.nom,
          prenoms: form.prenoms,
          email: form.email,
          telephone: form.telephone,
          nip: form.nip || undefined,
        },
        titre: form.titre,
        description: form.description,
        typeContrat: form.typeContrat,
        lieuTravail: {
          province: form.province,
          ville: form.ville,
          teletravail: "NON",
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
      toast.success(
        "Annonce soumise pour modération. Visible après validation PNPE.",
      );
      router.push("/offres");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 py-10">
        <div className="container mx-auto px-6 lg:px-10 max-w-2xl">
          <h1 className="text-3xl font-display font-bold tracking-tight mb-2">
            Publier une annonce — Particulier
          </h1>
          <p className="text-muted-foreground mb-8">
            Emploi domestique, garde d'enfants, jardinier, cours particuliers…
            La modération PNPE valide votre annonce sous 48 h.
          </p>

          <form onSubmit={onSubmit} className="space-y-6">
            <section className="rounded-xl border bg-card p-5 space-y-4">
              <h2 className="font-semibold">Vos coordonnées</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Nom *" value={form.nom} onChange={(v) => update("nom", v)} />
                <Field label="Prénoms *" value={form.prenoms} onChange={(v) => update("prenoms", v)} />
                <Field type="email" label="Email *" value={form.email} onChange={(v) => update("email", v)} />
                <Field type="tel" label="Téléphone *" value={form.telephone} onChange={(v) => update("telephone", v)} />
                <Field label="NIP (recommandé)" value={form.nip} onChange={(v) => update("nip", v)} />
              </div>
            </section>

            <section className="rounded-xl border bg-card p-5 space-y-4">
              <h2 className="font-semibold">L'annonce</h2>
              <Field
                label="Titre *"
                value={form.titre}
                onChange={(v) => update("titre", v)}
                placeholder="Ex : Garde d'enfants à domicile"
              />
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1.5">Type</label>
                  <select
                    value={form.typeContrat}
                    onChange={(e) =>
                      update("typeContrat", e.target.value as FormState["typeContrat"])
                    }
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  >
                    <option value="CDD">CDD</option>
                    <option value="CDI">CDI</option>
                    <option value="STAGE">Stage</option>
                    <option value="INTERIM">Mission temporaire</option>
                    <option value="INDEPENDANT">Prestation indépendant</option>
                  </select>
                </div>
                <Field
                  type="date"
                  label="Date d'expiration *"
                  value={form.dateExpiration}
                  onChange={(v) => update("dateExpiration", v)}
                />
              </div>
            </section>

            <section className="rounded-xl border bg-card p-5 space-y-4">
              <h2 className="font-semibold">Lieu & rémunération</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Ville" value={form.ville} onChange={(v) => update("ville", v)} />
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
                <Field
                  type="number"
                  label="Salaire min (XAF/mois)"
                  value={form.salaireMin}
                  onChange={(v) => update("salaireMin", v)}
                />
                <Field
                  type="number"
                  label="Salaire max (XAF/mois)"
                  value={form.salaireMax}
                  onChange={(v) => update("salaireMax", v)}
                />
              </div>
            </section>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Envoi…" : "Soumettre pour modération"}
            </button>
          </form>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={label.endsWith("*")}
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
      />
    </div>
  );
}
