/**
 * Inscription Demandeur d'Emploi — React Hook Form + Zod.
 *
 * Validation côté client avec Zod, soumission via `pnpe.demandeurs.create`.
 * Le statut initial est `BROUILLON` ; un conseiller PNPE valide ensuite
 * via contact (WhatsApp ou visite agence) pour passer en `ACTIF`.
 */
"use client";

import { forwardRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

// ─── Référentiel provinces ──────────────────────────────────────

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

const inscriptionSchema = z.object({
  nip: z
    .string()
    .min(6, "Le NIP doit comporter au moins 6 caractères")
    .max(20, "Le NIP est trop long"),
  nom: z.string().min(1, "Nom requis").max(60),
  prenoms: z.string().min(1, "Prénoms requis").max(80),
  email: z.string().email("Email invalide"),
  telephone: z
    .string()
    .regex(
      /^\+?[0-9 ]{8,}$/,
      "Téléphone invalide (8 chiffres minimum, optionnellement préfixé par +)",
    ),
  telephoneWhatsApp: z
    .string()
    .regex(/^\+?[0-9 ]{8,}$/, "WhatsApp invalide")
    .or(z.literal(""))
    .optional(),
  provinceResidence: z.enum(PROVINCES, {
    message: "Province requise",
  }),
  antenneSlug: z.string().min(1, "Antenne requise"),
});

type InscriptionForm = z.infer<typeof inscriptionSchema>;

// ─── Page ───────────────────────────────────────────────────────

export default function InscriptionDemandeurPage() {
  const router = useRouter();
  const antennes = (useQuery(api.functions.pnpe.antennes.list, {}) ?? []) as Array<{
    _id: string;
    slug: string;
    nom: string;
    province: (typeof PROVINCES)[number];
  }>;
  const createDemandeur = useMutation(api.functions.pnpe.demandeurs.create);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InscriptionForm>({
    resolver: zodResolver(inscriptionSchema),
    defaultValues: {
      nip: "",
      nom: "",
      prenoms: "",
      email: "",
      telephone: "",
      telephoneWhatsApp: "",
      provinceResidence: "ESTUAIRE",
      antenneSlug: "",
    },
  });

  const provinceResidence = watch("provinceResidence");
  const filteredAntennes = antennes.filter(
    (a) => !provinceResidence || a.province === provinceResidence,
  );

  const onSubmit = handleSubmit(async (values) => {
    try {
      const antenne = antennes.find((a) => a.slug === values.antenneSlug);
      if (!antenne) {
        toast.error("Antenne introuvable.");
        return;
      }
      await createDemandeur({
        nip: values.nip,
        nom: values.nom,
        prenoms: values.prenoms,
        email: values.email,
        telephone: values.telephone,
        telephoneWhatsApp: values.telephoneWhatsApp || undefined,
        provinceResidence: values.provinceResidence,
        antenneId: antenne._id as Id<"antennesPnpe">,
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
    }
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-display font-bold tracking-tight mb-2">
        Inscription Demandeur d&apos;Emploi
      </h1>
      <p className="text-muted-foreground mb-8">
        Renseignez vos informations principales. Votre compte sera validé par
        un conseiller PNPE après contact.
      </p>

      <form onSubmit={onSubmit} className="space-y-6">
        <Field
          id="nip"
          label="NIP — Numéro d'Identification Personnel"
          placeholder="Ex : 1234567890"
          required
          error={errors.nip?.message}
          {...register("nip")}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            id="nom"
            label="Nom"
            required
            error={errors.nom?.message}
            {...register("nom")}
          />
          <Field
            id="prenoms"
            label="Prénoms"
            required
            error={errors.prenoms?.message}
            {...register("prenoms")}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            id="email"
            type="email"
            label="Email"
            required
            error={errors.email?.message}
            {...register("email")}
          />
          <Field
            id="telephone"
            type="tel"
            label="Téléphone"
            placeholder="+241 ..."
            required
            error={errors.telephone?.message}
            {...register("telephone")}
          />
        </div>

        <Field
          id="telephoneWhatsApp"
          type="tel"
          label="Téléphone WhatsApp (utilisé pour la validation)"
          error={errors.telephoneWhatsApp?.message}
          {...register("telephoneWhatsApp")}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              className="text-sm font-medium block mb-1.5"
              htmlFor="provinceResidence"
            >
              Province de résidence
              <span className="text-destructive ml-0.5">*</span>
            </label>
            <select
              id="provinceResidence"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              {...register("provinceResidence")}
            >
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {PROVINCE_LABELS[p]}
                </option>
              ))}
            </select>
            {errors.provinceResidence && (
              <p className="text-xs text-destructive mt-1">
                {errors.provinceResidence.message}
              </p>
            )}
          </div>
          <div>
            <label
              className="text-sm font-medium block mb-1.5"
              htmlFor="antenneSlug"
            >
              Antenne de rattachement
              <span className="text-destructive ml-0.5">*</span>
            </label>
            <select
              id="antenneSlug"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              {...register("antenneSlug")}
            >
              <option value="">-- Choisir --</option>
              {filteredAntennes.map((a) => (
                <option key={a._id} value={a.slug}>
                  {a.nom}
                </option>
              ))}
            </select>
            {errors.antenneSlug && (
              <p className="text-xs text-destructive mt-1">
                {errors.antenneSlug.message}
              </p>
            )}
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full md:w-auto inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {isSubmitting ? "Inscription en cours…" : "Créer mon compte D.E"}
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
