/**
 * Formulaire « Publier comme administration publique » — TRAVAIL.GA.
 *
 * Auth requise (l'utilisateur doit être membre actif de l'org sélectionnée).
 * Cas d'usage : ministère, DG, mairie, EP qui recrute. Pré-vérification
 * automatique car l'org existe déjà dans la table `orgs`.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { api } from "@convex/_generated/api";

type FormState = {
  orgId: string;
  titre: string;
  description: string;
  typeContrat: "CDD" | "CDI" | "STAGE" | "ALTERNANCE" | "INTERIM";
  ville: string;
  province: string;
  salaireMin: string;
  salaireMax: string;
  dateExpiration: string;
};

const initial: FormState = {
  orgId: "",
  titre: "",
  description: "",
  typeContrat: "CDD",
  ville: "Libreville",
  province: "ESTUAIRE",
  salaireMin: "",
  salaireMax: "",
  dateExpiration: "",
};

export default function PublierAdministrationPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);

  // Liste les orgs où l'utilisateur est membre actif
  
  const myOrgs = (useQuery((api as any).functions.orgs?.listMine, "skip") ?? []) as Array<{
    _id: string;
    name: string;
    type: string;
  }>;
  
  const create = useMutation((api as any).functions.pnpe.offresPubliques?.createByAdministration);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.orgId || !form.dateExpiration) {
      toast.error("Organisme et date d'expiration requis.");
      return;
    }
    setSubmitting(true);
    try {
      await create({
        orgId: form.orgId,
        titre: form.titre,
        description: form.description,
        typeContrat: form.typeContrat,
        lieuTravail: {
          province: form.province,
          ville: form.ville,
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
            Publier une annonce — Administration
          </h1>
          <p className="text-muted-foreground mb-8">
            Vous publiez au nom d'un organisme public (ministère, DG, mairie,
            EP). L'organisme doit être référencé dans le système et vous devez
            en être membre actif.
          </p>

          {myOrgs.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="font-semibold mb-2">Aucune organisation rattachée</h2>
              <p className="text-sm text-muted-foreground">
                Vous n'êtes membre actif d'aucune organisation publique. Si
                vous êtes agent d'une administration, demandez à votre
                administrateur de vous ajouter à l'organisme dans
                ADMINISTRATION.GA.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-6">
              <section className="rounded-xl border bg-card p-5 space-y-4">
                <h2 className="font-semibold">Organisme émetteur</h2>
                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    Publier au nom de
                  </label>
                  <select
                    value={form.orgId}
                    onChange={(e) => update("orgId", e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="">-- Choisir l'organisme --</option>
                    {myOrgs.map((o) => (
                      <option key={o._id} value={o._id}>
                        {o.name} ({o.type.replace(/_/g, " ")})
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              <section className="rounded-xl border bg-card p-5 space-y-4">
                <h2 className="font-semibold">L'offre</h2>
                <Field
                  label="Intitulé du poste *"
                  value={form.titre}
                  onChange={(v) => update("titre", v)}
                />
                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    Description du poste *
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    rows={6}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                      <option value="CDD">CDD</option>
                      <option value="CDI">CDI</option>
                      <option value="STAGE">Stage</option>
                      <option value="ALTERNANCE">Alternance</option>
                      <option value="INTERIM">Intérim</option>
                    </select>
                  </div>
                  <Field
                    type="date"
                    label="Date limite candidature *"
                    value={form.dateExpiration}
                    onChange={(v) => update("dateExpiration", v)}
                  />
                </div>
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
          )}
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={label.endsWith("*")}
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
      />
    </div>
  );
}
