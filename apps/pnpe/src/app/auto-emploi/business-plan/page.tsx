/**
 * Éditeur Business Model Canvas (9 blocs).
 *
 * MVP Phase 4 : 9 textarea structurées. À migrer vers Tiptap (workspace/
 * document-editor) en Phase 7 pour rich-text + sauvegarde automatique.
 */
"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@workspace/api/convex/_generated/api";

const BMC_BLOCS = [
  { key: "partenairesCles", label: "1. Partenaires clés" },
  { key: "activitesCles", label: "2. Activités clés" },
  { key: "ressourcesCles", label: "3. Ressources clés" },
  { key: "propositionValeur", label: "4. Proposition de valeur" },
  { key: "relationClient", label: "5. Relation client" },
  { key: "canauxDistribution", label: "6. Canaux de distribution" },
  { key: "segmentsClients", label: "7. Segments de clients" },
  { key: "structureCouts", label: "8. Structure de coûts" },
  { key: "fluxRevenus", label: "9. Flux de revenus" },
] as const;

type BMCContent = Record<(typeof BMC_BLOCS)[number]["key"], string>;

const empty = BMC_BLOCS.reduce((acc, b) => ({ ...acc, [b.key]: "" }), {} as BMCContent);

export default function BusinessPlanPage() {
  // @ts-expect-error — api.pnpe typé après codegen
  const programme = useQuery(api.pnpe?.autoEmploi?.getMine);
  // @ts-expect-error
  const update = useMutation(api.pnpe?.autoEmploi?.updateBusinessPlan);
  const [content, setContent] = useState<BMCContent>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (programme?.businessPlan?.contenuJson) {
      setContent({ ...empty, ...(programme.businessPlan.contenuJson as BMCContent) });
    }
  }, [programme]);

  const onSave = async () => {
    if (!programme) {
      toast.error("Inscrivez-vous d'abord au programme Auto-Emploi.");
      return;
    }
    setSaving(true);
    try {
      await update({ programmeId: programme._id, contenuJson: content });
      toast.success("Business plan enregistré.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">
          Business Model Canvas
        </h1>
        <p className="text-muted-foreground mt-1">
          Décrivez votre projet en remplissant les 9 blocs. Sauvegarde manuelle
          (auto-save en Phase 7).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {BMC_BLOCS.map((b) => (
          <div key={b.key} className="rounded-xl border bg-card p-4">
            <label className="font-semibold text-sm block mb-2">{b.label}</label>
            <textarea
              value={content[b.key]}
              onChange={(e) =>
                setContent((c) => ({ ...c, [b.key]: e.target.value }))
              }
              rows={5}
              className="w-full rounded-lg border bg-background px-2.5 py-2 text-sm resize-none"
              placeholder="Renseignez ce bloc…"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3">
        <span className="text-xs text-muted-foreground">
          {programme?.businessPlan?.version
            ? `Version ${programme.businessPlan.version}`
            : "Pas encore sauvegardé"}
        </span>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
