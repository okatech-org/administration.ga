"use client";

import { use } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Mail,
  Phone,
  UserCheck,
  UserX,
} from "lucide-react";
import { api } from "@workspace/api/convex/_generated/api";

type Candidature = {
  _id: string;
  statut: string;
  _creationTime: number;
  lettreMotivation?: string;
  typeCandidature: "DEMANDEUR_INSCRIT" | "CITOYEN_ORDINAIRE";
  candidatProfil: {
    prenoms: string;
    nom: string;
    email?: string;
    telephone?: string;
  } | null;
};

const STATUT_LABEL: Record<string, string> = {
  ENVOYEE: "Nouvelle",
  VUE: "Vue",
  PRESELECTIONNEE: "Preselectionnee",
  ENTRETIEN: "Entretien programme",
  RETENUE: "Retenue",
  NON_RETENUE: "Non retenue",
};

const NEXT_STATUS: Record<string, string[]> = {
  ENVOYEE: ["VUE", "PRESELECTIONNEE", "NON_RETENUE"],
  VUE: ["PRESELECTIONNEE", "NON_RETENUE"],
  PRESELECTIONNEE: ["ENTRETIEN", "NON_RETENUE"],
  ENTRETIEN: ["RETENUE", "NON_RETENUE"],
};

export default function DetailAnnonceParticulier({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = use(params);

  // @ts-expect-error api.pnpe type apres codegen
  const data = useQuery(
    // @ts-expect-error
    api.pnpe?.citoyenAccount?.listCandidaturesForMyParticulierOffre,
    { offreReference: reference },
  ) as
    | {
        offre: {
          _id: string;
          titre: string;
          reference: string;
          statut: string;
          ville: string;
          typeContrat: string;
        };
        candidatures: Candidature[];
      }
    | null
    | undefined;

  // @ts-expect-error
  const updateStatus = useMutation(api.pnpe?.candidatures?.updateStatus);

  const onMove = async (id: string, statut: string) => {
    try {
      await updateStatus({
        candidatureId: id,
        nouveauStatut: statut,
      });
      toast.success(`Statut mis a jour : ${STATUT_LABEL[statut] ?? statut}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  if (data === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="rounded-xl border p-8 text-center">
        <p className="text-muted-foreground mb-3">Annonce introuvable.</p>
        <Link
          href="/particulier/annonces"
          className="text-primary hover:underline text-sm"
        >
          Retour a mes annonces
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/particulier/annonces"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Retour a mes annonces
      </Link>

      <header className="rounded-xl border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">
              {data.offre.titre}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Ref. {data.offre.reference} · {data.offre.typeContrat} ·{" "}
              {data.offre.ville}
            </p>
          </div>
          <span className="rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-1 text-xs font-medium">
            {data.offre.statut}
          </span>
        </div>
      </header>

      <section>
        <h2 className="text-lg font-semibold mb-3">
          {data.candidatures.length} candidature
          {data.candidatures.length > 1 ? "s" : ""}
        </h2>

        {data.candidatures.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed p-10 text-center">
            <UserX className="size-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              Aucune candidature recue pour le moment.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {data.candidatures.map((c) => (
              <li
                key={c._id}
                className="rounded-xl border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      <UserCheck className="size-4 text-muted-foreground" />
                      {c.candidatProfil
                        ? `${c.candidatProfil.prenoms} ${c.candidatProfil.nom}`
                        : "Candidat anonyme"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {c.typeCandidature === "DEMANDEUR_INSCRIT"
                        ? "D.E inscrit PNPE"
                        : "Citoyen (compte basique)"}
                      {" · "}
                      Postule le{" "}
                      {new Date(c._creationTime).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {STATUT_LABEL[c.statut] ?? c.statut}
                  </span>
                </div>

                {c.candidatProfil && (
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                    {c.candidatProfil.email && (
                      <a
                        href={`mailto:${c.candidatProfil.email}`}
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <Mail className="size-3" />
                        {c.candidatProfil.email}
                      </a>
                    )}
                    {c.candidatProfil.telephone && (
                      <a
                        href={`tel:${c.candidatProfil.telephone}`}
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <Phone className="size-3" />
                        {c.candidatProfil.telephone}
                      </a>
                    )}
                  </div>
                )}

                {c.lettreMotivation && (
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      Lire la lettre de motivation
                    </summary>
                    <div className="mt-2 rounded-lg bg-muted/40 p-3 whitespace-pre-wrap text-foreground">
                      {c.lettreMotivation}
                    </div>
                  </details>
                )}

                {/* Actions de workflow */}
                {NEXT_STATUS[c.statut] && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {NEXT_STATUS[c.statut].map((next) => (
                      <button
                        key={next}
                        type="button"
                        onClick={() => onMove(c._id, next)}
                        className="inline-flex items-center gap-1 rounded-md border bg-card px-2.5 py-1 text-xs hover:bg-muted"
                      >
                        Passer en {STATUT_LABEL[next] ?? next}
                        <ChevronRight className="size-3" />
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
