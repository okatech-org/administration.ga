/**
 * Moderation des offres signalees — espace Conseiller PNPE.
 *
 * Liste les offres ayant recu un ou plusieurs signalements. Le conseiller
 * peut :
 *   - rejeter les signalements (offre reste publiee)
 *   - suspendre l'offre (statut RETIREE)
 *   - supprimer definitivement les offres PARTICULIER suspectes (arnaque)
 *
 * Les signalements PARTICULIER sont prioritaires (workflow anti-fraude).
 */
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Eye,
  Flag,
  Landmark,
  MailIcon,
  PhoneIcon,
  ShieldX,
  Trash2,
  User,
} from "lucide-react";
import { api } from "@workspace/api/convex/_generated/api";

type Offre = {
  _id: string;
  reference: string;
  titre: string;
  typeEmployeur: "ENTREPRISE" | "ADMINISTRATION" | "PARTICULIER";
  statut: string;
  _creationTime: number;
  ville: string;
  signalements: {
    count: number;
    flaggedForReview: boolean;
    lastSignaledAt?: number;
  };
  motifs: string[];
  particulierInfo: {
    nom: string;
    prenoms: string;
    email: string;
    telephone: string;
  } | null;
};

const TYPE_META: Record<
  Offre["typeEmployeur"],
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

export default function ModerationPage() {
  const [filterType, setFilterType] = useState<"" | Offre["typeEmployeur"]>("");
  const [showOnlyFlagged, setShowOnlyFlagged] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // @ts-expect-error api.pnpe.moderation typee apres codegen
  const offres = (useQuery(api.pnpe?.moderation?.listSignalees, {
    onlyFlagged: showOnlyFlagged,
    typeEmployeur: filterType || undefined,
    limit: 100,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any) ?? []) as Offre[];

  // @ts-expect-error
  const stats = useQuery(api.pnpe?.moderation?.stats) as
    | {
        totalSignalees: number;
        flaggedForReview: number;
        byTypeFlagged: Record<Offre["typeEmployeur"], number>;
      }
    | undefined;

  // @ts-expect-error
  const resetMut = useMutation(api.pnpe?.moderation?.resetSignalements);
  // @ts-expect-error
  const suspendMut = useMutation(api.pnpe?.moderation?.suspendOffre);
  // @ts-expect-error
  const deleteMut = useMutation(api.pnpe?.moderation?.hardDeleteOffre);

  const selected = offres.find((o) => o._id === selectedId);

  const onReset = async (offre: Offre) => {
    if (!confirm(`Rejeter les ${offre.signalements.count} signalement(s) ?`))
      return;
    try {
      await resetMut({ offreId: offre._id });
      toast.success("Signalements rejetes — offre reste publiee.");
      setSelectedId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  const onSuspend = async (offre: Offre) => {
    const motif = prompt("Motif de suspension (visible cote employeur) :");
    if (!motif) return;
    try {
      await suspendMut({ offreId: offre._id, motifRetrait: motif });
      toast.success("Offre suspendue (statut RETIREE).");
      setSelectedId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  const onDelete = async (offre: Offre) => {
    if (offre.typeEmployeur !== "PARTICULIER") {
      toast.error("Suppression reservee aux offres PARTICULIER.");
      return;
    }
    const motif = prompt("Motif de suppression definitive (audit) :");
    if (!motif) return;
    if (
      !confirm(
        `Supprimer DEFINITIVEMENT cette offre et toutes les candidatures liees ?`,
      )
    )
      return;
    try {
      const res = await deleteMut({ offreId: offre._id, motifSuppression: motif });
      toast.success(
        `Offre supprimee (${res.candidaturesSupprimees} candidature(s)).`,
      );
      setSelectedId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2">
          <Flag className="size-6 text-rose-500" />
          Moderation des signalements
        </h1>
        <p className="text-muted-foreground mt-1">
          {stats
            ? `${stats.flaggedForReview} offre(s) flaggee(s) (>= 3 signalements) · ${stats.totalSignalees} avec au moins 1 signalement`
            : "Chargement…"}
        </p>
      </header>

      {/* Stats par type */}
      {stats && stats.flaggedForReview > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {(
            ["PARTICULIER", "ENTREPRISE", "ADMINISTRATION"] as const
          ).map((t) => {
            const meta = TYPE_META[t];
            const Icon = meta.icon;
            return (
              <div
                key={t}
                className="rounded-xl border bg-card p-4 flex items-center gap-3"
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${meta.tone}`}
                >
                  <Icon className="size-5" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">
                    {meta.label}
                  </div>
                  <div className="text-xl font-bold tabular-nums">
                    {stats.byTypeFlagged[t] ?? 0}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={filterType === ""} onClick={() => setFilterType("")}>
            Tous types
          </FilterChip>
          {(["PARTICULIER", "ENTREPRISE", "ADMINISTRATION"] as const).map((t) => (
            <FilterChip
              key={t}
              active={filterType === t}
              onClick={() => setFilterType(t)}
            >
              {TYPE_META[t].label}
            </FilterChip>
          ))}
        </div>

        <label className="ml-auto flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showOnlyFlagged}
            onChange={(e) => setShowOnlyFlagged(e.target.checked)}
            className="rounded"
          />
          Seulement les offres flaggees (≥ 3 signalements)
        </label>
      </div>

      {/* Liste */}
      {offres.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-2">
          {offres.map((o) => {
            const meta = TYPE_META[o.typeEmployeur];
            const Icon = meta.icon;
            const isFlagged = o.signalements.flaggedForReview;
            return (
              <li
                key={o._id}
                className={`rounded-lg border bg-card p-4 flex items-start gap-4 ${
                  isFlagged ? "border-rose-300" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.tone}`}
                    >
                      <Icon className="size-3" />
                      {meta.label}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        isFlagged
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      <Flag className="size-3" />
                      {o.signalements.count} signalement
                      {o.signalements.count > 1 ? "s" : ""}
                      {isFlagged && " — FLAG"}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {o.statut}
                    </span>
                  </div>
                  <div className="font-semibold text-sm">{o.titre}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Ref. {o.reference} · {o.ville}
                  </div>

                  {o.motifs.length > 0 && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        {o.motifs.length} motif(s) declare(s)
                      </summary>
                      <ul className="mt-1 space-y-0.5 pl-3 border-l-2 border-muted">
                        {o.motifs.map((m, i) => (
                          <li key={i} className="text-muted-foreground">
                            {m}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {o.particulierInfo && (
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {o.particulierInfo.prenoms} {o.particulierInfo.nom}
                      </span>
                      <a
                        href={`mailto:${o.particulierInfo.email}`}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        <MailIcon className="size-3" />
                        {o.particulierInfo.email}
                      </a>
                      <a
                        href={`tel:${o.particulierInfo.telephone}`}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        <PhoneIcon className="size-3" />
                        {o.particulierInfo.telephone}
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  <a
                    href={`/offres/${o.reference}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded border bg-card px-2.5 py-1 text-xs hover:bg-muted"
                  >
                    <Eye className="size-3" />
                    Voir
                  </a>
                  <button
                    type="button"
                    onClick={() => onReset(o)}
                    className="inline-flex items-center gap-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 text-xs hover:bg-emerald-100"
                  >
                    <CheckCircle2 className="size-3" />
                    Rejeter signalements
                  </button>
                  <button
                    type="button"
                    onClick={() => onSuspend(o)}
                    className="inline-flex items-center gap-1 rounded bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 text-xs hover:bg-amber-100"
                  >
                    <ShieldX className="size-3" />
                    Suspendre
                  </button>
                  {o.typeEmployeur === "PARTICULIER" && (
                    <button
                      type="button"
                      onClick={() => onDelete(o)}
                      className="inline-flex items-center gap-1 rounded bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 text-xs hover:bg-rose-100"
                    >
                      <Trash2 className="size-3" />
                      Supprimer
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Banniere : doctrine de moderation */}
      <aside className="rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground flex items-start gap-3">
        <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-600" />
        <div>
          <div className="font-semibold text-foreground mb-0.5">
            Doctrine de moderation
          </div>
          <p>
            Les <strong>offres PARTICULIER</strong> sont prioritaires (anti-fraude,
            travail dissimule). Suspension recommandee a la moindre ambiguite ;
            suppression definitive si l'arnaque est evidente. Les{" "}
            <strong>offres ADMINISTRATION</strong> et <strong>ENTREPRISE</strong>{" "}
            doivent etre suspendues plutot que supprimees ; investigation en
            cooperation avec l'organisme emetteur.
          </p>
        </div>
      </aside>
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

function EmptyState() {
  return (
    <div className="rounded-xl border bg-card p-12 text-center">
      <CheckCircle2 className="size-12 text-emerald-500/60 mx-auto mb-3" />
      <p className="text-muted-foreground">
        Aucune offre signalee a moderer pour le moment.
      </p>
    </div>
  );
}
