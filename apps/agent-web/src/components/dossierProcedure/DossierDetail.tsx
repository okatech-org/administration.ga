/**
 * DossierDetail — Full dossier view with header, progress bar,
 * pieces checklist, workflow history, and action panel.
 */

import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Folder,
  Mail,
  Shield,
  User,
  AlertTriangle,
} from "lucide-react";
import { StepProgressBar } from "./StepProgressBar";
import { PiecesChecklist } from "./PiecesChecklist";
import { WorkflowActionPanel } from "./WorkflowActionPanel";

interface DossierDetailProps {
  dossier: any;
  transitions: any[];
  onBack: () => void;
  onAction: (action: string, commentaire?: string) => Promise<void>;
  onUploadPiece: (pieceCode: string) => void;
  onValidatePiece?: (pieceCode: string) => void;
  onRejectPiece?: (pieceCode: string) => void;
  canValidate?: boolean;
  isUploadingPiece?: string | null;
  isLoading?: boolean;
}

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  brouillon: { label: "Brouillon", class: "text-zinc-400 bg-zinc-500/15 border-zinc-500/20" },
  en_cours: { label: "En cours", class: "text-blue-400 bg-blue-500/15 border-blue-500/20" },
  en_attente: { label: "En attente", class: "text-amber-400 bg-amber-500/15 border-amber-500/20" },
  suspendu: { label: "Suspendu", class: "text-yellow-400 bg-yellow-500/15 border-yellow-500/20" },
  valide: { label: "Validé", class: "text-emerald-400 bg-emerald-500/15 border-emerald-500/20" },
  rejete: { label: "Rejeté", class: "text-red-400 bg-red-500/15 border-red-500/20" },
  clos: { label: "Clôturé", class: "text-zinc-400 bg-zinc-500/15 border-zinc-500/20" },
  archive: { label: "Archivé", class: "text-violet-400 bg-violet-500/15 border-violet-500/20" },
};

const CONFIDENTIALITE_LABELS: Record<string, { label: string; class: string }> = {
  standard: { label: "Standard", class: "text-zinc-400" },
  confidentiel: { label: "Confidentiel", class: "text-amber-400" },
  secret: { label: "Secret", class: "text-red-400" },
};

export function DossierDetail({
  dossier,
  transitions,
  onBack,
  onAction,
  onUploadPiece,
  onValidatePiece,
  onRejectPiece,
  canValidate = false,
  isUploadingPiece = null,
  isLoading = false,
}: DossierDetailProps) {
  const statusCfg = STATUS_LABELS[dossier.status] ?? STATUS_LABELS.brouillon;
  const confCfg = CONFIDENTIALITE_LABELS[dossier.confidentialite] ?? CONFIDENTIALITE_LABELS.standard;
  const isOverdue = dossier.dateLimite && dossier.dateLimite < Date.now() && !["valide", "clos", "archive", "rejete"].includes(dossier.status);

  // Get current step config
  const currentStep = dossier.typeDemarche?.etapesParcours?.find(
    (e: any) => e.code === dossier.etapeCouranteCode,
  );

  return (
    <div className="space-y-5">
      {/* Back button + header */}
      <div className="flex items-start gap-4">
        <button
          onClick={onBack}
          className="h-9 w-9 rounded-lg border border-border/50 flex items-center justify-center hover:bg-muted transition-colors shrink-0 mt-0.5"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold tracking-tight truncate">
              {dossier.reference}
            </h2>
            <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", statusCfg.class)}>
              {statusCfg.label}
            </span>
            {dossier.priorite && dossier.priorite !== "normal" && (
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", dossier.priorite === "urgent" ? "text-red-400 bg-red-500/15 border-red-500/20" : "text-amber-400 bg-amber-500/15 border-amber-500/20")}>
                {dossier.priorite === "urgent" ? "Urgent" : "Confidentiel"}
              </span>
            )}
            {isOverdue && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 font-medium flex items-center gap-1">
                <AlertTriangle className="h-2.5 w-2.5" />
                En retard
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {dossier.typeDemarche?.label?.fr ?? "Type inconnu"} — {dossier.typeDemarche?.code}
          </p>
        </div>
      </div>

      {/* Info cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border border-border/50 rounded-lg p-3 bg-card">
          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/60 uppercase tracking-wider mb-1">
            <User className="h-3 w-3" />Demandeur
          </div>
          <p className="text-xs font-medium truncate">{dossier.demandeur?.name ?? "—"}</p>
        </div>
        <div className="border border-border/50 rounded-lg p-3 bg-card">
          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/60 uppercase tracking-wider mb-1">
            <User className="h-3 w-3" />Agent traitant
          </div>
          <p className="text-xs font-medium truncate">{dossier.agentTraitant?.name ?? "Non assigné"}</p>
        </div>
        <div className="border border-border/50 rounded-lg p-3 bg-card">
          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/60 uppercase tracking-wider mb-1">
            <Calendar className="h-3 w-3" />Date de dépôt
          </div>
          <p className="text-xs font-medium">{new Date(dossier.dateDepot).toLocaleDateString("fr-FR")}</p>
        </div>
        <div className="border border-border/50 rounded-lg p-3 bg-card">
          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/60 uppercase tracking-wider mb-1">
            <Clock className="h-3 w-3" />Date limite
          </div>
          <p className={cn("text-xs font-medium", isOverdue && "text-red-400")}>
            {dossier.dateLimite ? new Date(dossier.dateLimite).toLocaleDateString("fr-FR") : "—"}
          </p>
        </div>
      </div>

      {/* Confidentiality + step info */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className={cn("flex items-center gap-1", confCfg.class)}>
          <Shield className="h-3 w-3" />
          {confCfg.label}
        </span>
        {currentStep && (
          <>
            <span className="text-border">|</span>
            <span>
              Étape actuelle : <strong className="text-foreground">{currentStep.label?.fr ?? dossier.etapeCouranteCode}</strong>
            </span>
          </>
        )}
      </div>

      {/* Step progress bar */}
      {dossier.typeDemarche?.etapesParcours && (
        <div className="border border-border/50 rounded-xl p-5 pb-8 bg-card">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-4">
            Parcours
          </p>
          <StepProgressBar
            steps={dossier.typeDemarche.etapesParcours}
            currentStepCode={dossier.etapeCouranteCode}
            currentStepOrdre={dossier.etapeCouranteOrdre}
            status={dossier.status}
          />
        </div>
      )}

      {/* Two-column: Pieces + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pieces checklist (2/3 width) */}
        <div className="lg:col-span-2 border border-border/50 rounded-xl p-4 bg-card">
          <PiecesChecklist
            pieces={dossier.pieces ?? []}
            onUpload={onUploadPiece}
            onValidate={onValidatePiece}
            onReject={onRejectPiece}
            canValidate={canValidate}
            isUploading={isUploadingPiece}
          />
        </div>

        {/* Action panel (1/3 width) */}
        <div className="border border-border/50 rounded-xl p-4 bg-card">
          <WorkflowActionPanel
            dossierId={dossier._id}
            currentStepCode={dossier.etapeCouranteCode}
            actionsAutorisees={currentStep?.actionsAutorisees ?? []}
            status={dossier.status}
            onAction={onAction}
            isLoading={isLoading}
          />

          {/* Workflow history */}
          {transitions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">
                Historique
              </p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {transitions.map((t: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 text-[10px]">
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground/80">{t.actorName ?? "?"}</span>
                        {" — "}
                        {t.action}
                        {t.etapeArrivee && ` → ${t.etapeArrivee}`}
                      </p>
                      {t.commentaire && (
                        <p className="text-muted-foreground/50 italic mt-0.5">{t.commentaire}</p>
                      )}
                      <p className="text-muted-foreground/30 mt-0.5">
                        {new Date(t.createdAt).toLocaleString("fr-FR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
