/**
 * Inscription Demandeur d'Emploi.
 *
 * Formulaire MVP Phase 2 en useState + validation manuelle. À migrer vers
 * React Hook Form + Zod en Phase 7 (cf. plan), une fois `@hookform/resolvers`
 * ajouté aux deps `apps/pnpe`.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";

type Province =
  | "ESTUAIRE"
  | "HAUT_OGOOUE"
  | "MOYEN_OGOOUE"
  | "NGOUNIE"
  | "NYANGA"
  | "OGOOUE_IVINDO"
  | "OGOOUE_LOLO"
  | "OGOOUE_MARITIME"
  | "WOLEU_NTEM";

const PROVINCE_LABELS: Record<Province, string> = {
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

type FormState = {
  nip: string;
  nom: string;
  prenoms: string;
  email: string;
  telephone: string;
  telephoneWhatsApp: string;
  provinceResidence: Province | "";
  antenneSlug: string;
};

export default function InscriptionDemandeurPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>({
    nip: "",
    nom: "",
    prenoms: "",
    email: "",
    telephone: "",
    telephoneWhatsApp: "",
    provinceResidence: "",
    antenneSlug: "",
  });

  // @ts-expect-error — api.pnpe typé après codegen Convex
  const antennes = (useQuery(api.pnpe?.antennes?.list, {}) ?? []) as Array<{
    _id: string;
    slug: string;
    nom: string;
    province: Province;
  }>;
  // @ts-expect-error — idem
  const createDemandeur = useMutation(api.pnpe?.demandeurs?.create);

  const filteredAntennes = antennes.filter(
    (a) => !form.provinceResidence || a.province === form.provinceResidence,
  );

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((s) => ({ ...s, [key]: value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.provinceResidence || !form.antenneSlug || form.nip.length < 6) {
      toast.error("Renseignez NIP, province et antenne.");
      return;
    }
    setSubmitting(true);
    try {
      const antenne = antennes.find((a) => a.slug === form.antenneSlug);
      if (!antenne) throw new Error("Antenne introuvable");
      await createDemandeur({
        nip: form.nip,
        nom: form.nom,
        prenoms: form.prenoms,
        email: form.email,
        telephone: form.telephone,
        telephoneWhatsApp: form.telephoneWhatsApp || undefined,
        provinceResidence: form.provinceResidence,
        antenneId: antenne._id,
      });
      toast.success("Inscription enregistrée ! Complétez votre profil.");
      router.push("/demandeur/profil");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur";
      if (message.includes("ALREADY_REGISTERED")) {
        toast.error("Vous êtes déjà inscrit. Connectez-vous.");
      } else if (message.includes("NIP_ALREADY_USED")) {
        toast.error("Ce NIP est déjà utilisé.");
      } else {
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-display font-bold tracking-tight mb-2">
        Inscription Demandeur d'Emploi
      </h1>
      <p className="text-muted-foreground mb-8">
        Renseignez vos informations principales. Votre compte sera validé par
        un conseiller PNPE après contact.
      </p>

      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label className="text-sm font-medium block mb-1.5" htmlFor="nip">
            NIP (Numéro d'Identification Personnel)
            <span className="text-destructive ml-0.5">*</span>
          </label>
          <input
            id="nip"
            value={form.nip}
            onChange={(e) => update("nip", e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            placeholder="Ex : 1234567890"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1.5" htmlFor="nom">
              Nom<span className="text-destructive ml-0.5">*</span>
            </label>
            <input
              id="nom"
              value={form.nom}
              onChange={(e) => update("nom", e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5" htmlFor="prenoms">
              Prénoms<span className="text-destructive ml-0.5">*</span>
            </label>
            <input
              id="prenoms"
              value={form.prenoms}
              onChange={(e) => update("prenoms", e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1.5" htmlFor="email">
              Email<span className="text-destructive ml-0.5">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5" htmlFor="telephone">
              Téléphone<span className="text-destructive ml-0.5">*</span>
            </label>
            <input
              id="telephone"
              type="tel"
              value={form.telephone}
              onChange={(e) => update("telephone", e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder="+241 ..."
              required
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1.5" htmlFor="wa">
            Téléphone WhatsApp (utilisé pour la validation)
          </label>
          <input
            id="wa"
            type="tel"
            value={form.telephoneWhatsApp}
            onChange={(e) => update("telephoneWhatsApp", e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1.5" htmlFor="province">
              Province de résidence
              <span className="text-destructive ml-0.5">*</span>
            </label>
            <select
              id="province"
              value={form.provinceResidence}
              onChange={(e) =>
                update("provinceResidence", e.target.value as Province)
              }
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">-- Choisir --</option>
              {Object.entries(PROVINCE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5" htmlFor="antenne">
              Antenne de rattachement
              <span className="text-destructive ml-0.5">*</span>
            </label>
            <select
              id="antenne"
              value={form.antenneSlug}
              onChange={(e) => update("antenneSlug", e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">-- Choisir --</option>
              {filteredAntennes.map((a) => (
                <option key={a._id} value={a.slug}>
                  {a.nom}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full md:w-auto rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "Inscription en cours…" : "Créer mon compte D.E"}
          </button>
        </div>
      </form>
    </div>
  );
}
