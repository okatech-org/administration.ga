/**
 * Dialog création d'une antenne PNPE.
 *
 * Réservé à direction PNPE / admin Ministère du Travail (vérifié côté
 * Convex via `requirePnpeRole`). Soumet à `api.functions.pnpe.antennes.create`.
 */
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, PlusCircle } from "lucide-react";
import { api } from "@convex/_generated/api";
import { CountryCode } from "@convex/lib/countryCodeValidator";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

const STATUTS = ["OPERATIONNELLE", "EN_OUVERTURE", "SUSPENDUE"] as const;

const schema = z.object({
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Slug : minuscules, chiffres, tirets uniquement"),
  nom: z.string().min(3, "Nom requis"),
  province: z.enum(PROVINCES),
  ville: z.string().min(2, "Ville requise"),
  street: z.string().min(2, "Adresse requise"),
  telephone: z.string().optional(),
  email: z.string().email("Email invalide").or(z.literal("")).optional(),
  statut: z.enum(STATUTS),
});

type FormValues = z.infer<typeof schema>;

export function CreateAntenneDialog() {
  const [open, setOpen] = useState(false);
  const create = useMutation(api.functions.pnpe.antennes.create);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      slug: "",
      nom: "",
      province: "ESTUAIRE",
      ville: "",
      street: "",
      telephone: "",
      email: "",
      statut: "OPERATIONNELLE",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await create({
        slug: values.slug,
        nom: values.nom,
        province: values.province,
        ville: values.ville,
        adresse: {
          street: values.street,
          city: values.ville,
          postalCode: "",
          country: CountryCode.GA,
        },
        telephone: values.telephone || undefined,
        email: values.email || undefined,
        statut: values.statut,
      });
      toast.success(`Antenne « ${values.nom} » créée.`);
      reset();
      setOpen(false);
    } catch (err) {
      const m = err instanceof Error ? err.message : "Erreur";
      if (m.includes("ANTENNE_ALREADY_EXISTS")) {
        toast.error("Une antenne avec ce slug existe déjà.");
      } else if (m.includes("INSUFFICIENT_PERMISSIONS")) {
        toast.error("Permissions insuffisantes — admin Ministère uniquement.");
      } else {
        toast.error(m);
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <PlusCircle className="h-4 w-4" />
          Ouvrir une antenne
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle antenne PNPE</DialogTitle>
          <DialogDescription>
            Création d&apos;une antenne régionale. Les conseillers seront
            affectés dans un second temps via /pnpe/utilisateurs.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              id="slug"
              label="Slug"
              required
              placeholder="ex : ant-libreville"
              error={errors.slug?.message}
              {...register("slug")}
            />
            <Field
              id="nom"
              label="Nom officiel"
              required
              placeholder="Antenne PNPE Libreville"
              error={errors.nom?.message}
              {...register("nom")}
            />
            <div>
              <label htmlFor="province" className="text-sm font-medium block mb-1.5">
                Province <span className="text-destructive">*</span>
              </label>
              <select
                id="province"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                {...register("province")}
              >
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {PROVINCE_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
            <Field
              id="ville"
              label="Ville"
              required
              placeholder="Libreville"
              error={errors.ville?.message}
              {...register("ville")}
            />
            <div className="sm:col-span-2">
              <Field
                id="street"
                label="Adresse complète"
                required
                placeholder="Boulevard Triomphal, immeuble PNPE"
                error={errors.street?.message}
                {...register("street")}
              />
            </div>
            <Field
              id="telephone"
              type="tel"
              label="Téléphone"
              placeholder="+241 …"
              error={errors.telephone?.message}
              {...register("telephone")}
            />
            <Field
              id="email"
              type="email"
              label="Email"
              placeholder="antenne@pnpe.ga"
              error={errors.email?.message}
              {...register("email")}
            />
            <div className="sm:col-span-2">
              <label htmlFor="statut" className="text-sm font-medium block mb-1.5">
                Statut initial
              </label>
              <select
                id="statut"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                {...register("statut")}
              >
                <option value="OPERATIONNELLE">Opérationnelle</option>
                <option value="EN_OUVERTURE">En ouverture</option>
                <option value="SUSPENDUE">Suspendue</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                setOpen(false);
              }}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Créer l&apos;antenne
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Helpers ────────────────────────────────────────────────────

import { forwardRef } from "react";

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
