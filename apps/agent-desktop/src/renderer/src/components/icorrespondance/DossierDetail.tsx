/**
 * DossierDetail — Full dossier view with header, progress bar,
 * pieces checklist, workflow history, and action panel.
 */

import { cn } from "../../lib/utils";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Circle,
  Loader2,
  User,
  Shield,
  Pen,
  Lock,
  Send,
  Pause,
  Play,
} from "lucide-react";
import { useState } from "react";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  brouillon: { label: "Brouillon", class: "text-zinc-400 bg-zinc-500/15 border-zinc-500/20" },
  en_cours: { label: "En cours", class: "text-blue-400 bg-blue-500/15 border-blue-500/20" },
  en_attente: { label: "En attente", class: "text-amber-400 bg-amber-500/15 border-amber-500/20" },
  suspendu: { label: "Suspendu", class: "text-yellow-400 bg-yellow-500/15 border-yellow-500/20" },
  valide: { label: "Valide", class: "text-emerald-400 bg-emerald-500/15 border-emerald-500/20" },
  rejete: { label: "Rejete", class: "text-red-400 bg-red-500/15 border-red-500/20" },
  clos: { label: "Cloture", class: "text-zinc-400 bg-zinc-500/15 border-zinc-500/20" },
  archive: { label: "Archive", class: "text-violet-400 bg-violet-500/15 border-violet-500/20" },
};

const CONFIDENTIALITE_LABELS: Record<string, { label: string; class: string }> = {
  standard: { label: "Standard", class: "text-zinc-400" },
  confidentiel: { label: "Confidentiel", class: "text-amber-400" },
  secret: { label: "Secret", class: "text-red-400" },
};

// ═══════════════════════════════════════════════════════════════
// StepProgressBar (inlined)
// ═══════════════════════════════════════════════════════════════

interface Step {
  code: string;
  label: { fr: string; en?: string };
  ordre: number;
}

function StepProgressBar({
  steps,
  currentStepCode,
  currentStepOrdre,
  status,
}: {
  steps: Step[];
  currentStepCode: string;
  currentStepOrdre: number;
  status?: string;
}) {
  const sorted = [...steps].sort((a, b) => a.ordre - b.ordre);
  const isCompleted = status === "valide" || status === "clos" || status === "archive";
  const isRejected = status === "rejete";

  return (
    <div className="w-full">
      <div className="flex items-center gap-0">
        {sorted.map((step, idx) => {
          const isDone = step.ordre < currentStepOrdre || isCompleted;
          const isCurrent = step.code === currentStepCode && !isCompleted;
          const isUpcoming = step.ordre > currentStepOrdre && !isCompleted;

          return (
            <div key={step.code} className="flex items-center flex-1 min-w-0">
              {idx > 0 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 transition-colors",
                    isDone || isCurrent
                      ? isRejected && isCurrent
                        ? "bg-red-500/50"
                        : "bg-emerald-500/50"
                      : "bg-border/50",
                  )}
                />
              )}
              <div className="relative flex flex-col items-center">
                <div
                  className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center border-2 transition-all",
                    isDone && "bg-emerald-500/20 border-emerald-500 text-emerald-400",
                    isCurrent && !isRejected && "bg-blue-500/20 border-blue-500 text-blue-400 ring-2 ring-blue-500/30",
                    isCurrent && isRejected && "bg-red-500/20 border-red-500 text-red-400 ring-2 ring-red-500/30",
                    isUpcoming && "bg-muted/50 border-border/50 text-muted-foreground/40",
                  )}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : isCurrent ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                </div>
                <span
                  className={cn(
                    "absolute -bottom-5 text-[8px] font-medium whitespace-nowrap max-w-[80px] truncate text-center",
                    isDone && "text-emerald-400/70",
                    isCurrent && "text-foreground font-semibold",
                    isUpcoming && "text-muted-foreground/40",
                  )}
                  title={step.label.fr}
                >
                  {step.label.fr}
                </span>
              </div>
              {idx < sorted.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 transition-colors",
                    isDone ? "bg-emerald-500/50" : "bg-border/50",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PiecesChecklist (inlined)
// ═══════════════════════════════════════════════════════════════

interface Piece {
  _id: string;
  pieceCode: string;
  label: { fr: string; en?: string };
  status: "manquant" | "fourni" | "valide" | "rejete" | "signe";
  required: boolean;
  fournisseur: "demandeur" | "organisme" | "tiers";
  filename?: string;
  url?: string | null;
  rejectionReason?: string;
  validatedBy?: string;
}

const PIECE_STATUS_CONFIG: Record<string, { label: string; icon: any; class: string }> = {
  manquant: { label: "Manquant", icon: AlertTriangle, class: "text-amber-400 bg-amber-500/15 border-amber-500/20" },
  fourni: { label: "Fourni", icon: Clock, class: "text-blue-400 bg-blue-500/15 border-blue-500/20" },
  valide: { label: "Valide", icon: CheckCircle2, class: "text-emerald-400 bg-emerald-500/15 border-emerald-500/20" },
  rejete: { label: "Rejete", icon: XCircle, class: "text-red-400 bg-red-500/15 border-red-500/20" },
  signe: { label: "Signe", icon: Pen, class: "text-indigo-400 bg-indigo-500/15 border-indigo-500/20" },
};

const FOURNISSEUR_LABELS: Record<string, string> = {
  demandeur: "Demandeur",
  organisme: "Organisme",
  tiers: "Tiers",
};

function PiecesChecklist({
  pieces,
  onUpload,
  onValidate,
  onReject,
  canValidate = false,
  isUploading = null,
}: {
  pieces: Piece[];
  onUpload: (pieceCode: string) => void;
  onValidate?: (pieceCode: string) => void;
  onReject?: (pieceCode: string) => void;
  canValidate?: boolean;
  isUploading?: string | null;
}) {
  const completedCount = pieces.filter(
    (p) => p.status === "valide" || p.status === "signe",
  ).length;
  const totalRequired = pieces.filter((p) => p.required).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Pieces constitutives</span>
        <span className="font-medium">{completedCount}/{totalRequired} validees</span>
      </div>
      <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
          style={{ width: `${totalRequired > 0 ? (completedCount / totalRequired) * 100 : 0}%` }}
        />
      </div>
      <div className="space-y-2">
        {pieces.map((piece) => {
          const cfg = PIECE_STATUS_CONFIG[piece.status] ?? PIECE_STATUS_CONFIG.manquant;
          const StatusIcon = cfg.icon;
          const isUploadingThis = isUploading === piece.pieceCode;

          return (
            <div
              key={piece._id}
              className={cn(
                "border border-border/50 rounded-lg p-3 transition-colors",
                piece.status === "rejete" && "border-red-500/30 bg-red-500/5",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", cfg.class)}>
                    <StatusIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium truncate">{piece.label.fr}</p>
                      {piece.required && <span className="text-[8px] text-red-400 font-bold">*</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-medium", cfg.class)}>{cfg.label}</span>
                      <span className="text-[9px] text-muted-foreground/50">{FOURNISSEUR_LABELS[piece.fournisseur]}</span>
                    </div>
                    {piece.filename && <p className="text-[9px] text-muted-foreground/50 mt-0.5 truncate">{piece.filename}</p>}
                    {piece.rejectionReason && <p className="text-[9px] text-red-400 mt-1">Motif : {piece.rejectionReason}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {piece.url && (
                    <a href={piece.url} target="_blank" rel="noopener noreferrer" className="h-7 px-2 text-[10px] rounded-md border border-border/50 hover:bg-muted flex items-center gap-1 transition-colors">
                      <FileText className="h-3 w-3" />Voir
                    </a>
                  )}
                  {(piece.status === "manquant" || piece.status === "rejete") && (
                    <button
                      onClick={() => onUpload(piece.pieceCode)}
                      disabled={isUploadingThis}
                      className="h-7 px-2 text-[10px] rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/20 hover:bg-blue-500/25 flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                      {isUploadingThis ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                      {piece.status === "rejete" ? "Remplacer" : "Deposer"}
                    </button>
                  )}
                  {piece.status === "fourni" && canValidate && (
                    <>
                      <button onClick={() => onValidate?.(piece.pieceCode)} className="h-7 px-2 text-[10px] rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 flex items-center gap-1 transition-colors">
                        <CheckCircle2 className="h-3 w-3" />Valider
                      </button>
                      <button onClick={() => onReject?.(piece.pieceCode)} className="h-7 px-2 text-[10px] rounded-md bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 flex items-center gap-1 transition-colors">
                        <XCircle className="h-3 w-3" />Rejeter
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// WorkflowActionPanel (inlined)
// ═══════════════════════════════════════════════════════════════

const ACTION_CONFIG: Record<
  string,
  { label: string; icon: any; color: string; description: string; needsComment?: boolean }
> = {
  valider: { label: "Valider", icon: CheckCircle2, color: "bg-emerald-600 hover:bg-emerald-700 text-white", description: "Valider l'etape et transmettre" },
  transmettre: { label: "Transmettre", icon: Send, color: "bg-blue-600 hover:bg-blue-700 text-white", description: "Envoyer a l'organisme suivant" },
  rejeter: { label: "Rejeter", icon: XCircle, color: "bg-red-600 hover:bg-red-700 text-white", description: "Rejeter le dossier avec motif", needsComment: true },
  retourner: { label: "Renvoyer", icon: ArrowLeft, color: "bg-orange-600 hover:bg-orange-700 text-white", description: "Renvoyer a l'etape precedente", needsComment: true },
  signer: { label: "Signer", icon: Pen, color: "bg-indigo-600 hover:bg-indigo-700 text-white", description: "Apposer votre signature" },
  suspendre: { label: "Suspendre", icon: Pause, color: "bg-yellow-600 hover:bg-yellow-700 text-white", description: "Mettre en pause le traitement", needsComment: true },
  reprendre: { label: "Reprendre", icon: Play, color: "bg-green-600 hover:bg-green-700 text-white", description: "Reprendre le traitement" },
  clore: { label: "Cloturer", icon: Lock, color: "bg-zinc-600 hover:bg-zinc-700 text-white", description: "Cloturer administrativement", needsComment: true },
};

function WorkflowActionPanel({
  currentStepCode: _currentStepCode,
  actionsAutorisees,
  status,
  onAction,
  isLoading = false,
}: {
  dossierId: string;
  currentStepCode: string;
  actionsAutorisees: string[];
  status: string;
  onAction: (action: string, commentaire?: string) => Promise<void>;
  isLoading?: boolean;
}) {
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [commentaire, setCommentaire] = useState("");
  const [executing, setExecuting] = useState(false);

  void _currentStepCode;

  let availableActions = actionsAutorisees.filter((a) => ACTION_CONFIG[a]);
  if (status === "suspendu") {
    availableActions = availableActions.filter((a) => a === "reprendre" || a === "clore");
  }

  const handleExecute = async (action: string) => {
    const cfg = ACTION_CONFIG[action];
    if (cfg?.needsComment && !activeAction) {
      setActiveAction(action);
      return;
    }
    setExecuting(true);
    try {
      await onAction(action, commentaire || undefined);
      setActiveAction(null);
      setCommentaire("");
    } finally {
      setExecuting(false);
    }
  };

  if (availableActions.length === 0) {
    return (
      <div className="text-center py-4 text-xs text-muted-foreground/50">
        Aucune action disponible a cette etape
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        Actions disponibles
      </p>
      <div className="flex flex-wrap gap-2">
        {availableActions.map((action) => {
          const cfg = ACTION_CONFIG[action];
          if (!cfg) return null;
          const Icon = cfg.icon;
          return (
            <button
              key={action}
              onClick={() => handleExecute(action)}
              disabled={executing || isLoading}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50", cfg.color)}
              title={cfg.description}
            >
              {executing && activeAction === action ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
              {cfg.label}
            </button>
          );
        })}
      </div>
      {activeAction && ACTION_CONFIG[activeAction]?.needsComment && (
        <div className="border border-border/50 rounded-lg p-3 space-y-2 bg-muted/30">
          <p className="text-xs font-medium">
            {ACTION_CONFIG[activeAction].label} -- Commentaire
            {activeAction === "rejeter" && <span className="text-red-400 ml-1">*</span>}
          </p>
          <textarea
            rows={2}
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            placeholder={activeAction === "rejeter" ? "Motif du rejet (obligatoire)..." : "Commentaire optionnel..."}
            className="w-full px-3 py-2 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setActiveAction(null); setCommentaire(""); }} className="px-3 py-1 text-xs rounded-md border border-border hover:bg-muted transition-colors">
              Annuler
            </button>
            <button
              onClick={() => handleExecute(activeAction)}
              disabled={executing || (activeAction === "rejeter" && !commentaire.trim())}
              className={cn("px-3 py-1 text-xs rounded-md transition-colors disabled:opacity-50", ACTION_CONFIG[activeAction].color)}
            >
              {executing ? <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> : null}
              Confirmer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

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
            <h2 className="text-lg font-bold tracking-tight truncate">{dossier.reference}</h2>
            <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", statusCfg.class)}>{statusCfg.label}</span>
            {dossier.priorite && dossier.priorite !== "normal" && (
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", dossier.priorite === "urgent" ? "text-red-400 bg-red-500/15 border-red-500/20" : "text-amber-400 bg-amber-500/15 border-amber-500/20")}>
                {dossier.priorite === "urgent" ? "Urgent" : "Confidentiel"}
              </span>
            )}
            {isOverdue && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 font-medium flex items-center gap-1">
                <AlertTriangle className="h-2.5 w-2.5" />En retard
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {dossier.typeDemarche?.label?.fr ?? "Type inconnu"} -- {dossier.typeDemarche?.code}
          </p>
        </div>
      </div>

      {/* Info cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border border-border/50 rounded-lg p-3 bg-card">
          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/60 uppercase tracking-wider mb-1">
            <User className="h-3 w-3" />Demandeur
          </div>
          <p className="text-xs font-medium truncate">{dossier.demandeur?.name ?? "--"}</p>
        </div>
        <div className="border border-border/50 rounded-lg p-3 bg-card">
          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/60 uppercase tracking-wider mb-1">
            <User className="h-3 w-3" />Agent traitant
          </div>
          <p className="text-xs font-medium truncate">{dossier.agentTraitant?.name ?? "Non assigne"}</p>
        </div>
        <div className="border border-border/50 rounded-lg p-3 bg-card">
          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/60 uppercase tracking-wider mb-1">
            <Calendar className="h-3 w-3" />Date de depot
          </div>
          <p className="text-xs font-medium">{new Date(dossier.dateDepot).toLocaleDateString("fr-FR")}</p>
        </div>
        <div className="border border-border/50 rounded-lg p-3 bg-card">
          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/60 uppercase tracking-wider mb-1">
            <Clock className="h-3 w-3" />Date limite
          </div>
          <p className={cn("text-xs font-medium", isOverdue && "text-red-400")}>
            {dossier.dateLimite ? new Date(dossier.dateLimite).toLocaleDateString("fr-FR") : "--"}
          </p>
        </div>
      </div>

      {/* Confidentiality + step info */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className={cn("flex items-center gap-1", confCfg.class)}>
          <Shield className="h-3 w-3" />{confCfg.label}
        </span>
        {currentStep && (
          <>
            <span className="text-border">|</span>
            <span>Etape actuelle : <strong className="text-foreground">{currentStep.label?.fr ?? dossier.etapeCouranteCode}</strong></span>
          </>
        )}
      </div>

      {/* Step progress bar */}
      {dossier.typeDemarche?.etapesParcours && (
        <div className="border border-border/50 rounded-xl p-5 pb-8 bg-card">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-4">Parcours</p>
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
        <div className="border border-border/50 rounded-xl p-4 bg-card">
          <WorkflowActionPanel
            dossierId={dossier._id}
            currentStepCode={dossier.etapeCouranteCode}
            actionsAutorisees={currentStep?.actionsAutorisees ?? []}
            status={dossier.status}
            onAction={onAction}
            isLoading={isLoading}
          />
          {transitions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">Historique</p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {transitions.map((t: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 text-[10px]">
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground/80">{t.actorName ?? "?"}</span>
                        {" -- "}{t.action}{t.etapeArrivee && ` -> ${t.etapeArrivee}`}
                      </p>
                      {t.commentaire && <p className="text-muted-foreground/50 italic mt-0.5">{t.commentaire}</p>}
                      <p className="text-muted-foreground/30 mt-0.5">{new Date(t.createdAt).toLocaleString("fr-FR")}</p>
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
