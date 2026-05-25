/**
 * Modération des offres employeur (EN_VALIDATION → PUBLIEE) — adapté 3 types.
 *
 * Affiche les offres en attente avec badge type employeur (ENTREPRISE,
 * ADMINISTRATION, PARTICULIER). Filtre par type pour faciliter la modération.
 */
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  Building2,
  CheckCircle2,
  FileText,
  Flag,
  Landmark,
  ListChecks,
  User,
} from "lucide-react";
import { api } from "@workspace/api/convex/_generated/api";

const CONTRAT_LABELS: Record<string, string> = {
  CDI: "CDI",
  CDD: "CDD",
  STAGE: "Stage",
  ALTERNANCE: "Alternance",
  INTERIM: "Intérim",
  INSERTION: "Insertion",
  INDEPENDANT: "Indépendant",
};

const TYPE_META: Record<
  string,
  { label: string; icon: typeof Building2; tone: string }
> = {
  ENTREPRISE: {
    label: "Entreprise",
    icon: Building2,
    tone: "bg-blue-100 text-blue-700",
  },
  ADMINISTRATION: {
    label: "Administration",
    icon: Landmark,
    tone: "bg-emerald-100 text-emerald-700",
  },
  PARTICULIER: {
    label: "Particulier",
    icon: User,
    tone: "bg-amber-100 text-amber-700",
  },
};

type Offre = {
  _id: string;
  reference: string;
  titre: string;
  typeContrat: string;
  typeEmployeur: string;
  lieuTravail: { ville: string };
  _creationTime: number;
  signalements?: { count: number; flaggedForReview: boolean };
};

export default function OffresAValiderPage() {
  const [filterType, setFilterType] = useState<string>("");
  // @ts-expect-error — api.pnpe typé après codegen
  const offres = (useQuery(api.pnpe?.offres?.listPending, { limit: 100 }) ??
    []) as Offre[];
  // @ts-expect-error
  const validate = useMutation(api.pnpe?.offres?.validate);

  const filtered = filterType
    ? offres.filter((o) => o.typeEmployeur === filterType)
    : offres;

  const onValidate = async (id: string) => {
    try {
      await validate({ offreId: id });
      toast.success("Offre publiée.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  const byType = {
    ENTREPRISE: offres.filter((o) => o.typeEmployeur === "ENTREPRISE").length,
    ADMINISTRATION: offres.filter((o) => o.typeEmployeur === "ADMINISTRATION").length,
    PARTICULIER: offres.filter((o) => o.typeEmployeur === "PARTICULIER").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">
          Offres à valider
        </h1>
        <p className="text-muted-foreground mt-1">
          {offres.length} offre{offres.length > 1 ? "s" : ""} en attente —{" "}
          {byType.ENTREPRISE} entreprise(s), {byType.ADMINISTRATION}{" "}
          administration(s), {byType.PARTICULIER} particulier(s)
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip
          active={filterType === ""}
          onClick={() => setFilterType("")}
        >
          Toutes ({offres.length})
        </FilterChip>
        {(["ENTREPRISE", "ADMINISTRATION", "PARTICULIER"] as const).map((t) => (
          <FilterChip
            key={t}
            active={filterType === t}
            onClick={() => setFilterType(t)}
          >
            {TYPE_META[t].label} ({byType[t]})
          </FilterChip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <ListChecks className="size-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">Aucune offre en attente.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((o) => {
            const meta = TYPE_META[o.typeEmployeur] ?? TYPE_META.ENTREPRISE;
            const TypeIcon = meta.icon;
            return (
              <li
                key={o._id}
                className="rounded-lg border bg-card p-4 flex items-start justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.tone}`}
                    >
                      <TypeIcon className="size-3" />
                      {meta.label}
                    </span>
                    {o.signalements && o.signalements.count > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
                        <Flag className="size-3" />
                        {o.signalements.count} signalement(s)
                      </span>
                    )}
                  </div>
                  <div className="font-semibold text-sm">{o.titre}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    <FileText className="size-3 inline mr-1" />
                    Réf {o.reference} ·{" "}
                    {CONTRAT_LABELS[o.typeContrat] ?? o.typeContrat} ·{" "}
                    {o.lieuTravail.ville}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onValidate(o._id)}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 shrink-0"
                >
                  <CheckCircle2 className="size-3.5" />
                  Valider
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted hover:bg-muted/80"
      }`}
    >
      {children}
    </button>
  );
}
