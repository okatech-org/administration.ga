/**
 * Inscription Employeur PNPE — React Hook Form + Zod.
 *
 * Crée le compte entreprise (statut `NON_VERIFIE`). L'employeur doit
 * ensuite passer à l'étape `verification` pour soumettre ses documents
 * DGI/CNSS et passer en `VERIFIE`.
 */
"use client";

import { forwardRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api } from "@convex/_generated/api";
import { CountryCode } from "@convex/lib/countryCodeValidator";

// ─── Référentiels ───────────────────────────────────────────────

const SECTEURS = [
  "AGRICULTURE_PECHE",
  "MINES_EXTRACTION",
  "PETROLE_GAZ",
  "INDUSTRIE_MANUFACTURE",
  "BTP_CONSTRUCTION",
  "COMMERCE",
  "TRANSPORT_LOGISTIQUE",
  "HOTELLERIE_RESTAURATION",
  "TELECOMS_NUMERIQUE",
  "BANQUE_ASSURANCE",
  "SANTE_SOCIAL",
  "EDUCATION_FORMATION",
  "ADMINISTRATION_PUBLIQUE",
  "SERVICES_AUX_ENTREPRISES",
  "ARTS_CULTURE_SPORT",
  "ENERGIE_EAU",
  "AUTRES",
] as const;

const SECTEUR_LABELS: Record<(typeof SECTEURS)[number], string> = {
  AGRICULTURE_PECHE: "Agriculture / Pêche",
  MINES_EXTRACTION: "Mines / Extraction",
  PETROLE_GAZ: "Pétrole / Gaz",
  INDUSTRIE_MANUFACTURE: "Industrie / Manufacture",
  BTP_CONSTRUCTION: "BTP / Construction",
  COMMERCE: "Commerce",
  TRANSPORT_LOGISTIQUE: "Transport / Logistique",
  HOTELLERIE_RESTAURATION: "Hôtellerie / Restauration",
  TELECOMS_NUMERIQUE: "Télécoms / Numérique",
  BANQUE_ASSURANCE: "Banque / Assurance",
  SANTE_SOCIAL: "Santé / Social",
  EDUCATION_FORMATION: "Éducation / Formation",
  ADMINISTRATION_PUBLIQUE: "Administration publique",
  SERVICES_AUX_ENTREPRISES: "Services aux entreprises",
  ARTS_CULTURE_SPORT: "Arts / Culture / Sport",
  ENERGIE_EAU: "Énergie / Eau",
  AUTRES: "Autres",
};

const PROVINCES = [
  "ESTUAIRE",
  "HAUT_OGOOUE",
  "MOYEN_OGOOUE",
  "NGOUNIE",
  "NYANGA",
  "OGOOUE_IVINDO",
  "OGOOUE_LOLO",
  "OGOOUE_MARITIME",
  "WOLEU_NTEM",
] as const;

const PROVINCE_LABELS: Record<(typeof PROVINCES)[number], string> = {
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

// ─── Schéma Zod ─────────────────────────────────────────────────

const inscriptionEmployeurSchema = z.object({
  raisonSociale: z.string().min(2, "Raison sociale requise"),
  nif: z.string().min(4, "NIF requis"),
  rccm: z.string().optional(),
  secteurActivite: z.enum(SECTEURS, {
    message: "Secteur requis",
  }),
  tailleEntreprise: z.enum(["TPE", "PME", "ETI", "GE"]),
  effectif: z
    .string()
    .regex(/^\d*$/, "Effectif doit être un nombre")
    .optional(),
  adresseRue: z.string().min(1, "Adresse requise"),
  adresseVille: z.string().min(1, "Ville requise"),
  provinceSiege: z.enum(PROVINCES, {
    message: "Province requise",
  }),
  representantNom: z.string().min(1, "Nom requis"),
  representantPrenoms: z.string().min(1, "Prénoms requis"),
  representantFonction: z.string().min(1, "Fonction requise"),
  representantEmail: z.string().email("Email invalide"),
  representantTelephone: z
    .string()
    .regex(/^\+?[0-9 ]{8,}$/, "Téléphone invalide"),
});

type InscriptionEmployeurForm = z.infer<typeof inscriptionEmployeurSchema>;

// ─── Page ───────────────────────────────────────────────────────

export default function InscriptionEmployeurPage() {
  const router = useRouter();
  const createEmployeur = useMutation(api.functions.pnpe.employeurs.create);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InscriptionEmployeurForm>({
    resolver: zodResolver(inscriptionEmployeurSchema),
    defaultValues: {
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
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createEmployeur({
        raisonSociale: values.raisonSociale,
        nif: values.nif,
        rccm: values.rccm || undefined,
        secteurActivite: values.secteurActivite,
        tailleEntreprise: values.tailleEntreprise,
        effectif: values.effectif ? Number(values.effectif) : undefined,
        adresseSiege: {
          street: values.adresseRue,
          city: values.adresseVille,
          postalCode: "",
          country: CountryCode.GA,
        },
        provinceSiege: values.provinceSiege,
        representantLegal: {
          nom: values.representantNom,
          prenoms: values.representantPrenoms,
          fonction: values.representantFonction,
          email: values.representantEmail,
          telephone: values.representantTelephone,
        },
      });
      toast.success("Compte employeur créé ! Procédez à la vérification.");
      router.push("/employeur/verification");
    } catch (err) {
      const m = err instanceof Error ? err.message : "Erreur";
      toast.error(m);
    }
  });

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-display font-bold tracking-tight mb-2">
        Créer un compte entreprise
      </h1>
      <p className="text-muted-foreground mb-8">
        Renseignez l&apos;identité légale de votre entreprise. La vérification
        (DGI + CNSS) sera demandée à l&apos;étape suivante.
      </p>

      <form onSubmit={onSubmit} className="space-y-6">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold mb-4">Identité légale</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Field
                id="raisonSociale"
                label="Raison sociale"
                required
                error={errors.raisonSociale?.message}
                {...register("raisonSociale")}
              />
            </div>
            <Field
              id="nif"
              label="NIF"
              required
              error={errors.nif?.message}
              {...register("nif")}
            />
            <Field
              id="rccm"
              label="RCCM"
              error={errors.rccm?.message}
              {...register("rccm")}
            />
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold mb-4">Activité & taille</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1.5" htmlFor="secteurActivite">
                Secteur
              </label>
              <select
                id="secteurActivite"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                {...register("secteurActivite")}
              >
                {SECTEURS.map((s) => (
                  <option key={s} value={s}>
                    {SECTEUR_LABELS[s]}
                  </option>
                ))}
              </select>
              {errors.secteurActivite && (
                <p className="text-xs text-destructive mt-1">
                  {errors.secteurActivite.message}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" htmlFor="tailleEntreprise">
                Taille
              </label>
              <select
                id="tailleEntreprise"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                {...register("tailleEntreprise")}
              >
                <option value="TPE">TPE (0-9)</option>
                <option value="PME">PME (10-49)</option>
                <option value="ETI">ETI (50-249)</option>
                <option value="GE">GE (250+)</option>
              </select>
            </div>
            <Field
              id="effectif"
              type="number"
              label="Effectif"
              error={errors.effectif?.message}
              {...register("effectif")}
            />
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold mb-4">Adresse du siège</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Field
                id="adresseRue"
                label="Rue"
                required
                error={errors.adresseRue?.message}
                {...register("adresseRue")}
              />
            </div>
            <Field
              id="adresseVille"
              label="Ville"
              required
              error={errors.adresseVille?.message}
              {...register("adresseVille")}
            />
            <div>
              <label className="text-sm font-medium block mb-1.5" htmlFor="provinceSiege">
                Province
                <span className="text-destructive ml-0.5">*</span>
              </label>
              <select
                id="provinceSiege"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                {...register("provinceSiege")}
              >
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {PROVINCE_LABELS[p]}
                  </option>
                ))}
              </select>
              {errors.provinceSiege && (
                <p className="text-xs text-destructive mt-1">
                  {errors.provinceSiege.message}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold mb-4">Représentant légal</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              id="representantNom"
              label="Nom"
              required
              error={errors.representantNom?.message}
              {...register("representantNom")}
            />
            <Field
              id="representantPrenoms"
              label="Prénoms"
              required
              error={errors.representantPrenoms?.message}
              {...register("representantPrenoms")}
            />
            <Field
              id="representantFonction"
              label="Fonction"
              placeholder="DG, DRH…"
              required
              error={errors.representantFonction?.message}
              {...register("representantFonction")}
            />
            <Field
              id="representantEmail"
              type="email"
              label="Email"
              required
              error={errors.representantEmail?.message}
              {...register("representantEmail")}
            />
            <div className="md:col-span-2">
              <Field
                id="representantTelephone"
                type="tel"
                label="Téléphone"
                required
                error={errors.representantTelephone?.message}
                {...register("representantTelephone")}
              />
            </div>
          </div>
        </section>

        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {isSubmitting ? "Création…" : "Créer mon compte entreprise"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Composants helper ─────────────────────────────────────────

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
};

const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { id, label, required, error, ...rest },
  ref,
) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium block mb-1.5">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <input
        id={id}
        ref={ref}
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
        aria-invalid={!!error}
        {...rest}
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
});
