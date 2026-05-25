/**
 * Postulation comme citoyen ordinaire — TRAVAIL.GA.
 *
 * Auth Better Auth requise (middleware). Pre-remplit contact depuis la
 * session (nom + email). Soumet une candidature avec typeCandidature
 * CITOYEN_ORDINAIRE ; l'employeur recontacte par email/telephone.
 */
"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Info, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { authClient } from "@/lib/auth-client";
import { pnpeLink } from "@/lib/utils";
import { api } from "@workspace/api/convex/_generated/api";

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
  const { data: session, isPending } = authClient.useSession();
  const [form, setForm] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);

  // @ts-expect-error api.pnpe type apres codegen
  const offre = useQuery(api.functions?.pnpe?.offresPubliques?.getByReferenceEnriched, {
    reference,
  }) as
    | { _id: string; titre: string; statut: string }
    | null
    | undefined;
  // @ts-expect-error
  const apply = useMutation(api.functions?.pnpe?.candidaturesPubliques?.applyAsCitizen);

  // Pre-remplit avec les infos de la session une fois disponible
  useEffect(() => {
    if (!session?.user || form.email) return;
    const name = session.user.name ?? "";
    const parts = name.split(" ");
    const prenoms = parts.slice(0, -1).join(" ") || parts[0] || "";
    const nom = parts.length > 1 ? parts[parts.length - 1] : "";
    setForm((s) => ({
      ...s,
      email: session.user.email ?? "",
      prenoms,
      nom,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user]);

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
      toast.success("Candidature envoyee ! L'employeur vous recontactera.");
      router.push("/mon-compte/candidatures");
    } catch (err) {
      const m = err instanceof Error ? err.message : "Erreur";
      if (m.includes("ALREADY_APPLIED")) {
        toast.error("Vous avez deja postule a cette offre.");
      } else if (m.includes("OFFRE_NOT_AVAILABLE")) {
        toast.error("Cette offre n'est plus disponible.");
      } else {
        toast.error(m);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 py-10">
        <div className="container mx-auto px-6 lg:px-10 max-w-2xl">
          <h1 className="text-3xl font-display font-bold tracking-tight mb-2">
            Postuler a cette offre
          </h1>
          <p className="text-muted-foreground mb-6">
            {offre?.titre ? (
              <>
                Offre : <strong>{offre.titre}</strong>
              </>
            ) : (
              "Chargement…"
            )}
          </p>

          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 mb-8 flex items-start gap-3">
            <Info className="size-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong>Vous etes deja D.E inscrit au PNPE ?</strong> Pour
              candidater avec votre profil complet (CV, parcours, competences),
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
              <h2 className="font-semibold">Vos coordonnees</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field
                  label="Nom *"
                  value={form.nom}
                  onChange={(v) => update("nom", v)}
                />
                <Field
                  label="Prenoms *"
                  value={form.prenoms}
                  onChange={(v) => update("prenoms", v)}
                />
                <Field
                  type="email"
                  label="Email *"
                  value={form.email}
                  onChange={(v) => update("email", v)}
                />
                <Field
                  type="tel"
                  label="Telephone *"
                  value={form.telephone}
                  onChange={(v) => update("telephone", v)}
                />
              </div>
            </section>

            <section className="rounded-xl border bg-card p-5 space-y-4">
              <h2 className="font-semibold">Votre profil</h2>
              <div>
                <label className="text-sm font-medium block mb-1.5">
                  Niveau d'etudes (optionnel)
                </label>
                <select
                  value={form.niveauEtudes}
                  onChange={(e) => update("niveauEtudes", e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Non renseigne</option>
                  <option value="AUCUN">Aucun</option>
                  <option value="CEP">CEP</option>
                  <option value="BEPC">BEPC</option>
                  <option value="BAC">Baccalaureat</option>
                  <option value="BAC_PLUS_2">Bac+2 (BTS, DUT)</option>
                  <option value="BAC_PLUS_3">Bac+3 (Licence)</option>
                  <option value="BAC_PLUS_5">Bac+5 (Master)</option>
                  <option value="DOCTORAT">Doctorat</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">
                  Experience resumee (optionnel)
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
                  placeholder="Pourquoi ce poste vous interesse…"
                />
              </div>
            </section>

            <button
              type="submit"
              disabled={submitting || !offre}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
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
