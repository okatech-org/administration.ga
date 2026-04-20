/**
 * DossierCreateWizard — Multi-step wizard for creating a dossier de procédure.
 * Steps: 1) Select type → 2) Fill metadata → 3) Upload pieces → 4) Submit
 */

import { cn } from "@workspace/ui/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  FolderPlus,
  Loader2,
  X,
} from "lucide-react";
import { useState, useCallback } from "react";

interface TypeDemarche {
  _id: string;
  code: string;
  label: { fr: string; en?: string };
  description?: { fr?: string };
  category: string;
  piecesRequises: Array<{
    code: string;
    label: { fr: string };
    required: boolean;
    fournisseur: string;
    format: string;
  }>;
  etapesParcours: Array<{
    ordre: number;
    code: string;
    label: { fr: string };
  }>;
}

interface DossierCreateWizardProps {
  typeDemarches: TypeDemarche[];
  onClose: () => void;
  onSubmit: (data: {
    typeDemarcheId: string;
    metadata?: Record<string, any>;
    priorite?: string;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  identity: "Identité",
  visa: "Visa",
  civil_status: "État civil",
  certification: "Certification",
  notarial: "Notarial",
  administrative: "Administratif",
  diplomatic: "Diplomatique",
  custom: "Autre",
};

export function DossierCreateWizard({
  typeDemarches,
  onClose,
  onSubmit,
  isSubmitting = false,
}: DossierCreateWizardProps) {
  const [step, setStep] = useState(0);
  const [selectedType, setSelectedType] = useState<TypeDemarche | null>(null);
  const [priorite, setPriorite] = useState("normal");
  const [notes, setNotes] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const filteredTypes = categoryFilter
    ? typeDemarches.filter((t) => t.category === categoryFilter)
    : typeDemarches;

  const categories = [...new Set(typeDemarches.map((t) => t.category))];

  const handleSubmit = useCallback(async () => {
    if (!selectedType) return;
    await onSubmit({
      typeDemarcheId: selectedType._id,
      metadata: notes ? { notes } : undefined,
      priorite: priorite !== "normal" ? priorite : undefined,
    });
  }, [selectedType, priorite, notes, onSubmit]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl border border-border/50 shadow-2xl bg-popover rounded-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-border/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FolderPlus className="h-5 w-5 text-violet-400" />
            Nouveau dossier de procédure
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="px-5 py-3 border-b border-border/50 flex items-center gap-3 shrink-0">
          {["Type de démarche", "Détails", "Récapitulatif"].map((label, idx) => (
            <div key={label} className="flex items-center gap-2">
              {idx > 0 && <div className="h-px w-6 bg-border/50" />}
              <div className={cn(
                "flex items-center gap-1.5 text-xs",
                idx === step ? "text-foreground font-medium" : idx < step ? "text-emerald-400" : "text-muted-foreground/40",
              )}>
                <div className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold border",
                  idx === step ? "bg-violet-500/20 border-violet-500 text-violet-400" :
                  idx < step ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" :
                  "bg-muted/50 border-border/50 text-muted-foreground/40",
                )}>
                  {idx < step ? <CheckCircle2 className="h-3 w-3" /> : idx + 1}
                </div>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Step 0: Select type */}
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Sélectionnez le type de démarche administrative.
              </p>

              {/* Category filter */}
              {categories.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setCategoryFilter(null)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-medium transition-all",
                      !categoryFilter ? "bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30" : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    Tous
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-medium transition-all",
                        categoryFilter === cat ? "bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30" : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {CATEGORY_LABELS[cat] ?? cat}
                    </button>
                  ))}
                </div>
              )}

              {/* Type list */}
              <div className="space-y-2">
                {filteredTypes.map((td) => (
                  <button
                    key={td._id}
                    onClick={() => {
                      setSelectedType(td);
                      setStep(1);
                    }}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left",
                      selectedType?._id === td._id
                        ? "border-violet-500/40 bg-violet-500/10"
                        : "border-border/50 hover:border-border hover:bg-muted/30",
                    )}
                  >
                    <div className="h-9 w-9 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-violet-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium">{td.label.fr}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {td.description?.fr ?? `Code: ${td.code}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50">
                          {CATEGORY_LABELS[td.category] ?? td.category}
                        </span>
                        <span className="text-[9px] text-muted-foreground/40">
                          {td.piecesRequises.length} pièces · {td.etapesParcours.length} étapes
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/30 mt-2.5 shrink-0" />
                  </button>
                ))}

                {filteredTypes.length === 0 && (
                  <div className="text-center py-8 text-xs text-muted-foreground/50">
                    Aucun type de démarche disponible
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 1: Details */}
          {step === 1 && selectedType && (
            <div className="space-y-4">
              <div className="border border-border/50 rounded-lg p-3 bg-muted/20">
                <p className="text-xs font-medium">{selectedType.label.fr}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{selectedType.code}</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Priorité</label>
                  <select
                    value={priorite}
                    onChange={(e) => setPriorite(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="confidentiel">Confidentiel</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Notes / Observations</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes internes, contexte particulier..."
                    className="w-full px-3 py-2 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                  />
                </div>
              </div>

              {/* Preview: required pieces */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Pièces requises ({selectedType.piecesRequises.filter((p) => p.required).length} obligatoires)
                </p>
                <div className="space-y-1">
                  {selectedType.piecesRequises.map((p) => (
                    <div key={p.code} className="flex items-center gap-2 text-xs py-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                      <span className={p.required ? "font-medium" : "text-muted-foreground"}>
                        {p.label.fr}
                      </span>
                      {p.required && <span className="text-[8px] text-red-400 font-bold">*</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview: workflow steps */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Parcours ({selectedType.etapesParcours.length} étapes)
                </p>
                <div className="flex items-center gap-1 flex-wrap">
                  {[...selectedType.etapesParcours].sort((a, b) => a.ordre - b.ordre).map((e, idx) => (
                    <div key={e.code} className="flex items-center gap-1">
                      {idx > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground/30" />}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted border border-border/50">
                        {e.label.fr}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Summary */}
          {step === 2 && selectedType && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Vérifiez les informations avant de créer le dossier.
              </p>

              <div className="border border-border/50 rounded-xl p-4 space-y-3 bg-card">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[9px] text-muted-foreground/60 uppercase">Type</p>
                    <p className="text-xs font-medium">{selectedType.label.fr}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground/60 uppercase">Code</p>
                    <p className="text-xs font-medium">{selectedType.code}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground/60 uppercase">Priorité</p>
                    <p className="text-xs font-medium capitalize">{priorite}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground/60 uppercase">Pièces</p>
                    <p className="text-xs font-medium">{selectedType.piecesRequises.length} pièces</p>
                  </div>
                </div>
                {notes && (
                  <div>
                    <p className="text-[9px] text-muted-foreground/60 uppercase">Notes</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{notes}</p>
                  </div>
                )}
              </div>

              <div className="border border-amber-500/20 rounded-lg p-3 bg-amber-500/5 text-xs text-amber-400">
                Le dossier sera créé en statut <strong>brouillon</strong>. Vous pourrez ensuite y déposer les pièces justificatives et le soumettre pour traitement.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/50 flex justify-between shrink-0">
          <button
            onClick={step > 0 ? () => setStep(step - 1) : onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {step > 0 ? "Précédent" : "Annuler"}
          </button>

          {step < 2 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 0 && !selectedType}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-gradient-to-r from-indigo-600 to-violet-500 text-white disabled:opacity-50 transition-colors"
            >
              Suivant
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedType}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-gradient-to-r from-indigo-600 to-violet-500 text-white disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FolderPlus className="h-3.5 w-3.5" />
              )}
              Créer le dossier
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
