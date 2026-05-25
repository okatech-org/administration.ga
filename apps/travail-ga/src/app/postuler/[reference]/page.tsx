/**
 * Postulation publique (citoyen ordinaire) — TRAVAIL.GA.
 *
 * Permet à un user Better Auth de candidater à une offre sans avoir un
 * profil D.E PNPE complet. Le candidat fournit son contact direct ;
 * l'employeur le recontactera.
 *
 * Si l'utilisateur est aussi D.E PNPE inscrit, il est invité à utiliser
 * l'espace D.E sur PNPE.GA pour candidater avec son profil complet.
 */
"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { api } from "@convex/_generated/api";
import { pnpeLink } from "@/lib/utils";

type FormState = {
  nom: string;
  prenoms: string;
  email: string;
  telephone: string;
  niveauEtudes: string;
  experienceText: string;
  lettreMotivation: string;
};

const initial: FormState = {
  nom: "",
  prenoms: "",
  email: "",
  telephone: "",
  niveauEtudes: "",
  experienceText: "",
  lettreMotivation: "",
};

export default function PostulerPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = use(params);
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);

  // @ts-expect-error — api.pnpe typé après codegen
  const offre = useQuery(api.pnpe?.offres?.getByReference, { reference }) as
    | { _id: string; titre: string }
    | null
    | undefined;
  // @ts-expect-error
  const apply = useMutation(api.pnpe?.candidaturesPubliques?.applyAsCitizen);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offre) return;
    setSubmitting(true);
    try {
      await apply({
        offreId: offre._id,
        contact: {
          nom: form.nom,
          prenoms: form.prenoms,
          email: form.email,
          telephone: form.telephone,
          niveauEtudes: form.niveauEtudes || undefined,
          experienceText: form.experienceText || undefined,
        },
        lettreMotivation: form.lettreMotivation || undefined,
      });
      toast.success("Candidature envoyée ! L'employeur vous recontactera.");
      router.push("/offres");
    } catch (err) {
      const m = err instanceof Error ? err.message : "Erreur";
      if (m.includes("ALREADY_APPLIED")) {
        toast.error("Vous avez déjà postulé à cette offre.");
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
          <h1 className="text-3xl font-display font-bold tracking-tight mb-2">
            Postuler à cette offre
          </h1>
          <p className="text-muted-foreground mb-6">
            {offre?.titre ? <>Offre : <strong>{offre.titre}</strong></> : "Chargement…"}
          </p>

          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 mb-8 flex items-start gap-3">
            <Info className="size-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong>Vous êtes déjà D.E inscrit au PNPE ?</strong> Pour
              candidater avec votre profil complet (CV, parcours, compétences),
              connectez-vous sur{" "}
              <a
                href={pnpeLink(`/demandeur/offres/${reference}`)}
                className="text-primary underline font-medium"
              >
                PNPE.GA
              </a>
              .
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <section className="rounded-xl border bg-card p-5 space-y-4">
              <h2 className="font-semibold">Vos coordonnées</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Nom *" value={form.nom} onChange={(v) => update("nom", v)} />
                <Field label="Prénoms *" value={form.prenoms} onChange={(v) => update("prenoms", v)} />
                <Field type="email" label="Email *" value={form.email} onChange={(v) => update("email", v)} />
                <Field type="tel" label="Téléphone *" value={form.telephone} onChange={(v) => update("telephone", v)} />
              </div>
            </section>

            <section className="rounded-xl border bg-card p-5 space-y-4">
              <h2 className="font-semibold">Votre profil</h2>
              <div>
                <label className="text-sm font-medium block mb-1.5">
                  Niveau d'études (optionnel)
                </label>
                <select
                  value={form.niveauEtudes}
                  onChange={(e) => update("niveauEtudes", e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Non renseigné</option>
                  <option value="AUCUN">Aucun</option>
                  <option value="CEP">CEP</option>
                  <option value="BEPC">BEPC</option>
                  <option value="BAC">Baccalauréat</option>
                  <option value="BAC_PLUS_2">Bac+2 (BTS, DUT)</option>
                  <option value="BAC_PLUS_3">Bac+3 (Licence)</option>
                  <option value="BAC_PLUS_5">Bac+5 (Master)</option>
                  <option value="DOCTORAT">Doctorat</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">
                  Expérience résumée (optionnel)
                </label>
                <textarea
                  value={form.experienceText}
                  onChange={(e) => update("experienceText", e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  placeholder="Ex : 3 ans dans la vente, 5 ans en garde d'enfants…"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">
                  Lettre de motivation (optionnel)
                </label>
                <textarea
                  value={form.lettreMotivation}
                  onChange={(e) => update("lettreMotivation", e.target.value)}
                  rows={5}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  placeholder="Pourquoi ce poste vous intéresse…"
                />
              </div>
            </section>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Envoi…" : "Envoyer ma candidature"}
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
