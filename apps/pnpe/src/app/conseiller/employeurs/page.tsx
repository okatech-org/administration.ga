/**
 * Page Employeurs — portefeuille des entreprises inscrites.
 *
 * Liste filtrable par statut de vérification (NON_VERIFIE, EN_COURS,
 * VERIFIE, REJETE) avec actions rapides de modération.
 *
 * Query Convex utilisée : `pnpe.employeurs.listByStatut`.
 * Mutation : `pnpe.employeurs.validate` pour changer le statut.
 */
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  Building2,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  FlatCard,
  PageHeader,
  SectionHeader,
} from "@workspace/agent-features/components/my-space";
import { cn } from "@/lib/utils";

type StatutVerification = "NON_VERIFIE" | "EN_COURS" | "VERIFIE" | "REJETE";

const STATUTS: Array<{
  value: StatutVerification;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}> = [
  {
    value: "EN_COURS",
    label: "À examiner",
    icon: Clock,
    tone: "bg-amber-500/10 text-amber-600",
  },
  {
    value: "NON_VERIFIE",
    label: "Non vérifiés",
    icon: Building2,
    tone: "bg-foreground/8 dark:bg-foreground/5 text-foreground/70",
  },
  {
    value: "VERIFIE",
    label: "Vérifiés",
    icon: CheckCircle2,
    tone: "bg-emerald-500/10 text-emerald-600",
  },
  {
    value: "REJETE",
    label: "Rejetés",
    icon: XCircle,
    tone: "bg-rose-500/10 text-rose-600",
  },
];

const TAILLE_LABEL: Record<string, string> = {
  TPE: "TPE",
  PME: "PME",
  ETI: "ETI",
  GE: "Grande entreprise",
};

export default function EmployeursPage() {
  const [statutActif, setStatutActif] = useState<StatutVerification>("EN_COURS");
  const employeurs = useQuery(api.functions.pnpe.employeurs.listByStatut, {
    statut: statutActif,
  }) as
    | Array<{
        _id: string;
        raisonSociale: string;
        nif: string;
        secteurActivite?: string;
        tailleEntreprise?: string;
        effectif?: number;
        representantLegal?: {
          nom?: string;
          prenoms?: string;
          email?: string;
          telephone?: string;
        };
        adresseSiege?: { city?: string };
        _creationTime: number;
      }>
    | undefined;
  const validate = useMutation(api.functions.pnpe.employeurs.validate);

  const onValidate = async (
    employeurId: string,
    nouveauStatut: StatutVerification,
  ) => {
    try {
      await validate({
        employeurId: employeurId as Id<"employeurs">,
        nouveauStatut,
      });
      const label =
        nouveauStatut === "VERIFIE"
          ? "Employeur vérifié."
          : nouveauStatut === "REJETE"
            ? "Employeur rejeté."
            : "Statut mis à jour.";
      toast.success(label);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de mise à jour.");
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Portefeuille employeurs"
        subtitle="Modération et suivi des entreprises inscrites"
        icon={<Building2 className="size-4" />}
      />

      {/* Sélecteur de statut sous forme d'onglets */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUTS.map((s) => {
          const Icon = s.icon;
          const active = statutActif === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => setStatutActif(s.value)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground/80 hover:bg-foreground/5",
              )}
            >
              <span
                className={cn(
                  "size-5 rounded-md flex items-center justify-center",
                  active ? "bg-primary-foreground/15" : s.tone,
                )}
              >
                <Icon className="size-3" />
              </span>
              {s.label}
            </button>
          );
        })}
      </div>

      <FlatCard className="p-5">
        <SectionHeader
          icon={<ShieldCheck />}
          title={
            employeurs
              ? `${employeurs.length} employeur${employeurs.length > 1 ? "s" : ""}`
              : "Chargement…"
          }
        />

        {employeurs === undefined ? (
          <div className="mt-4 text-sm text-muted-foreground">Chargement…</div>
        ) : employeurs.length === 0 ? (
          <div className="mt-6 rounded-lg bg-background p-12 text-center text-sm text-muted-foreground">
            Aucun employeur dans ce statut.
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {employeurs.map((e) => (
              <li
                key={e._id}
                className="rounded-lg bg-background p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {e.raisonSociale}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>NIF {e.nif}</span>
                    {e.tailleEntreprise && (
                      <span>
                        {TAILLE_LABEL[e.tailleEntreprise] ?? e.tailleEntreprise}
                        {e.effectif != null ? ` · ${e.effectif} salariés` : ""}
                      </span>
                    )}
                    {e.secteurActivite && <span>{e.secteurActivite}</span>}
                    {e.adresseSiege?.city && (
                      <span>{e.adresseSiege.city}</span>
                    )}
                  </div>
                  {e.representantLegal && (
                    <div className="text-xs text-muted-foreground mt-1.5 flex flex-wrap items-center gap-3">
                      <span>
                        {e.representantLegal.prenoms} {e.representantLegal.nom}
                      </span>
                      {e.representantLegal.email && (
                        <a
                          href={`mailto:${e.representantLegal.email}`}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          <Mail className="size-3" />
                          {e.representantLegal.email}
                        </a>
                      )}
                      {e.representantLegal.telephone && (
                        <a
                          href={`tel:${e.representantLegal.telephone}`}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          <Phone className="size-3" />
                          {e.representantLegal.telephone}
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {statutActif !== "VERIFIE" && (
                    <button
                      type="button"
                      onClick={() => onValidate(e._id, "VERIFIE")}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                    >
                      <CheckCircle2 className="size-3.5" />
                      Valider
                    </button>
                  )}
                  {statutActif !== "REJETE" && (
                    <button
                      type="button"
                      onClick={() => onValidate(e._id, "REJETE")}
                      className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground/80 hover:bg-rose-500/10 hover:text-rose-600"
                    >
                      <XCircle className="size-3.5" />
                      Rejeter
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </FlatCard>
    </div>
  );
}
