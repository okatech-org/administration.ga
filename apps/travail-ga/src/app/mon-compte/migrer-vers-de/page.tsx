/**
 * Migration citoyen → Demandeur d'Emploi PNPE — TRAVAIL.GA.
 *
 * Formulaire pré-rempli avec les données issues des candidatures
 * précédentes (nom, prénoms, email, téléphone). Crée le profil D.E
 * (statut BROUILLON) et migre les candidatures CITOYEN_ORDINAIRE vers
 * DEMANDEUR_INSCRIT.
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { CheckCircle2, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { api } from "@convex/_generated/api";
import { pnpeLink } from "@/lib/utils";

type FormState = {
  nip: string;
  nom: string;
  prenoms: string;
  email: string;
  telephone: string;
  telephoneWhatsApp: string;
  provinceResidence: string;
  antenneId: string;
};

const initial: FormState = {
  nip: "",
  nom: "",
  prenoms: "",
  email: "",
  telephone: "",
  telephoneWhatsApp: "",
  provinceResidence: "ESTUAIRE",
  antenneId: "",
};

const PROVINCE_LABELS: Record<string, string> = {
  ESTUAIRE: "Estuaire",
  HAUT_OGOOUE: "Haut-Ogooué",
  MOYEN_OGOOUE: "Moyen-Ogooué",
  NGOUNIE: "Ngounié",
  NYANGA: "Nyanga",
  OGOOUE_IVINDO: "Ogooué-Ivindo",
  OGOOUE_LOLO: "Ogooué-Lolo",
  OGOOUE_MARITIME: "Ogooué-Maritime",
  WOLEU_NTEM: "Woleu-Ntem",
};

export default function MigrerVersDePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);

  // @ts-expect-error — api typé après codegen
  const prefill = useQuery(api.functions?.pnpe?.citizenMigration?.getMigrationPrefill);
  // @ts-expect-error
  const antennes = (useQuery(api.functions?.pnpe?.antennes?.list, {}) ?? []) as Array<{
    _id: string;
    slug: string;
    nom: string;
    province: string;
  }>;
  // @ts-expect-error
  const migrate = useMutation(api.functions?.pnpe?.citizenMigration?.migrateToDemandeur);

  useEffect(() => {
    if (prefill && !form.email) {
      setForm((s) => ({
        ...s,
        nom: prefill.nom ?? "",
        prenoms: prefill.prenoms ?? "",
        email: prefill.email ?? "",
        telephone: prefill.telephone ?? "",
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  const filteredAntennes = antennes.filter(
    (a) => !form.provinceResidence || a.province === form.provinceResidence,
  );

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.antenneId) {
      toast.error("Choisissez une antenne PNPE de rattachement.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await migrate({
        nip: form.nip,
        nom: form.nom,
        prenoms: form.prenoms,
        email: form.email,
        telephone: form.telephone,
        telephoneWhatsApp: form.telephoneWhatsApp || undefined,
        provinceResidence: form.provinceResidence,
        antenneId: form.antenneId,
      });
      toast.success(
        `Profil D.E créé ! ${result.candidaturesMigrees ?? 0} candidature(s) migrée(s).`,
      );
      router.push("/mon-compte");
    } catch (err) {
      const m = err instanceof Error ? err.message : "Erreur";
      if (m.includes("DEJA_DEMANDEUR")) {
        toast.error("Vous êtes déjà Demandeur d'Emploi.");
      } else if (m.includes("NIP_DEJA_UTILISE")) {
        toast.error("Ce NIP est déjà utilisé. Vérifiez votre saisie.");
      } else {
        toast.error(m);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 py-10">
        <div className="container mx-auto px-6 lg:px-10 max-w-2xl">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="size-6 text-primary" />
            <h1 className="text-3xl font-display font-bold tracking-tight">
              Devenir Demandeur d'Emploi PNPE
            </h1>
          </div>
          <p className="text-muted-foreground mb-8">
            Bénéficiez de l'accompagnement complet du PNPE : conseiller
            personnel, formation BMC, alertes d'offres, suivi de placement.
            Vos candidatures actuelles seront automatiquement migrées.
          </p>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 mb-6 text-sm">
            <CheckCircle2 className="size-4 text-emerald-600 inline mr-1.5" />
            <strong>Bonus :</strong> votre nouvelle inscription D.E sera
            validée plus rapidement (vos candidatures précédentes attestent de
            votre démarche active).
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <section className="rounded-xl border bg-card p-5 space-y-3">
              <h2 className="font-semibold">Identité officielle</h2>
              <Field
                label="NIP — Numéro d'Identification Personnel *"
                value={form.nip}
                onChange={(v) => update("nip", v)}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Nom *" value={form.nom} onChange={(v) => update("nom", v)} />
                <Field
                  label="Prénoms *"
                  value={form.prenoms}
                  onChange={(v) => update("prenoms", v)}
                />
              </div>
            </section>

            <section className="rounded-xl border bg-card p-5 space-y-3">
              <h2 className="font-semibold">Contact</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field
                  type="email"
                  label="Email *"
                  value={form.email}
                  onChange={(v) => update("email", v)}
                />
                <Field
                  type="tel"
                  label="Téléphone *"
                  value={form.telephone}
                  onChange={(v) => update("telephone", v)}
                />
                <Field
                  type="tel"
                  label="WhatsApp (validation conseiller)"
                  value={form.telephoneWhatsApp}
                  onChange={(v) => update("telephoneWhatsApp", v)}
                />
              </div>
            </section>

            <section className="rounded-xl border bg-card p-5 space-y-3">
              <h2 className="font-semibold">Antenne PNPE de rattachement</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    Province de résidence
                  </label>
                  <select
                    value={form.provinceResidence}
                    onChange={(e) => update("provinceResidence", e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  >
                    {Object.entries(PROVINCE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    Antenne PNPE *
                  </label>
                  <select
                    value={form.antenneId}
                    onChange={(e) => update("antenneId", e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="">-- Choisir --</option>
                    {filteredAntennes.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.nom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? "Migration…" : "Créer mon profil D.E"}
              </button>
              <a
                href={pnpeLink("/demandeur/inscription")}
                className="rounded-lg border px-6 py-2.5 text-sm font-semibold hover:bg-muted"
              >
                Inscription complète sur PNPE.GA
              </a>
            </div>
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
