/**
 * Portefeuille D.E du conseiller — vue liste par antenne et statut.
 */
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { Users } from "lucide-react";
import { api } from "@convex/_generated/api";

const STATUT_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  EN_VALIDATION: "En validation",
  ACTIF: "Actif",
  EN_FORMATION: "En formation",
  EN_CONTRAT: "En contrat",
  PLACE: "Placé",
  SUSPENDU: "Suspendu",
  RADIE: "Radié",
};

export default function MesDemandeursPage() {
  const [selectedAntenneId, setSelectedAntenneId] = useState<string>("");
  const [statutFilter, setStatutFilter] = useState<string>("");
  const antennes = (useQuery((api as any).functions.pnpe.antennes.list, {}) ?? []) as Array<{
    _id: string;
    nom: string;
  }>;
  const demandeurs = (useQuery(
    selectedAntenneId ? (api as any).functions.pnpe.demandeurs.listByAntenne : "skip",
    selectedAntenneId
      ? {
          antenneId: selectedAntenneId,
          statut: statutFilter || undefined,
        }
      : "skip",
  ) ?? []) as Array<{
    _id: string;
    nom: string;
    prenoms: string;
    nip: string;
    statutCompte: string;
    provinceResidence: string;
  }>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">
          Mes Demandeurs d'Emploi
        </h1>
        <p className="text-muted-foreground mt-1">
          Portefeuille D.E par antenne et statut.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-center rounded-xl border bg-card p-4">
        <select
          value={selectedAntenneId}
          onChange={(e) => setSelectedAntenneId(e.target.value)}
          className="rounded-lg border bg-background px-3 py-1.5 text-sm"
        >
          <option value="">-- Antenne --</option>
          {antennes.map((a) => (
            <option key={a._id} value={a._id}>
              {a.nom}
            </option>
          ))}
        </select>
        <select
          value={statutFilter}
          onChange={(e) => setStatutFilter(e.target.value)}
          className="rounded-lg border bg-background px-3 py-1.5 text-sm"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {!selectedAntenneId ? null : demandeurs.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Users className="size-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">Aucun D.E avec ces critères.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-xs">
              <tr>
                <th className="text-left p-3 font-medium">Nom</th>
                <th className="text-left p-3 font-medium">NIP</th>
                <th className="text-left p-3 font-medium">Province</th>
                <th className="text-left p-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {demandeurs.map((d) => (
                <tr key={d._id} className="border-b last:border-0">
                  <td className="p-3 font-medium">
                    {d.prenoms} {d.nom}
                  </td>
                  <td className="p-3 font-mono text-xs">{d.nip}</td>
                  <td className="p-3 text-xs">{d.provinceResidence}</td>
                  <td className="p-3 text-xs">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5">
                      {STATUT_LABELS[d.statutCompte] ?? d.statutCompte}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
