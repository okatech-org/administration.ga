/**
 * PiecesChecklist — Grid of required document pieces for a dossier.
 * Shows status, upload button, validate/reject buttons for agents.
 */

import { cn } from "@workspace/ui/lib/utils";
import {
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Loader2,
  Pen,
} from "lucide-react";

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

interface PiecesChecklistProps {
  pieces: Piece[];
  onUpload: (pieceCode: string) => void;
  onValidate?: (pieceCode: string) => void;
  onReject?: (pieceCode: string) => void;
  canValidate?: boolean;
  isUploading?: string | null;
}

const STATUS_CONFIG = {
  manquant: {
    label: "Manquant",
    icon: AlertTriangle,
    class: "text-amber-400 bg-amber-500/15 border-amber-500/20",
    dot: "bg-amber-400",
  },
  fourni: {
    label: "Fourni",
    icon: Clock,
    class: "text-blue-400 bg-blue-500/15 border-blue-500/20",
    dot: "bg-blue-400",
  },
  valide: {
    label: "Validé",
    icon: CheckCircle2,
    class: "text-emerald-400 bg-emerald-500/15 border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  rejete: {
    label: "Rejeté",
    icon: XCircle,
    class: "text-red-400 bg-red-500/15 border-red-500/20",
    dot: "bg-red-400",
  },
  signe: {
    label: "Signé",
    icon: Pen,
    class: "text-indigo-400 bg-indigo-500/15 border-indigo-500/20",
    dot: "bg-indigo-400",
  },
};

const FOURNISSEUR_LABELS: Record<string, string> = {
  demandeur: "Demandeur",
  organisme: "Organisme",
  tiers: "Tiers",
};

export function PiecesChecklist({
  pieces,
  onUpload,
  onValidate,
  onReject,
  canValidate = false,
  isUploading = null,
}: PiecesChecklistProps) {
  const completedCount = pieces.filter(
    (p) => p.status === "valide" || p.status === "signe",
  ).length;
  const totalRequired = pieces.filter((p) => p.required).length;

  return (
    <div className="space-y-3">
      {/* Progress summary */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Pièces constitutives
        </span>
        <span className="font-medium">
          {completedCount}/{totalRequired} validées
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
          style={{
            width: `${totalRequired > 0 ? (completedCount / totalRequired) * 100 : 0}%`,
          }}
        />
      </div>

      {/* Pieces grid */}
      <div className="space-y-2">
        {pieces.map((piece) => {
          const cfg = STATUS_CONFIG[piece.status];
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
                  <div
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                      cfg.class,
                    )}
                  >
                    <StatusIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium truncate">
                        {piece.label.fr}
                      </p>
                      {piece.required && (
                        <span className="text-[8px] text-red-400 font-bold">
                          *
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded-full border font-medium",
                          cfg.class,
                        )}
                      >
                        {cfg.label}
                      </span>
                      <span className="text-[9px] text-muted-foreground/50">
                        {FOURNISSEUR_LABELS[piece.fournisseur]}
                      </span>
                    </div>
                    {piece.filename && (
                      <p className="text-[9px] text-muted-foreground/50 mt-0.5 truncate">
                        {piece.filename}
                      </p>
                    )}
                    {piece.rejectionReason && (
                      <p className="text-[9px] text-red-400 mt-1">
                        Motif : {piece.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* View link */}
                  {piece.url && (
                    <a
                      href={piece.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-7 px-2 text-[10px] rounded-md border border-border/50 hover:bg-muted flex items-center gap-1 transition-colors"
                    >
                      <FileText className="h-3 w-3" />
                      Voir
                    </a>
                  )}

                  {/* Upload button (for manquant or rejete) */}
                  {(piece.status === "manquant" || piece.status === "rejete") && (
                    <button
                      onClick={() => onUpload(piece.pieceCode)}
                      disabled={isUploadingThis}
                      className="h-7 px-2 text-[10px] rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/20 hover:bg-blue-500/25 flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                      {isUploadingThis ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3" />
                      )}
                      {piece.status === "rejete" ? "Remplacer" : "Déposer"}
                    </button>
                  )}

                  {/* Validate/Reject buttons (for fourni pieces, agents only) */}
                  {piece.status === "fourni" && canValidate && (
                    <>
                      <button
                        onClick={() => onValidate?.(piece.pieceCode)}
                        className="h-7 px-2 text-[10px] rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 flex items-center gap-1 transition-colors"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Valider
                      </button>
                      <button
                        onClick={() => onReject?.(piece.pieceCode)}
                        className="h-7 px-2 text-[10px] rounded-md bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 flex items-center gap-1 transition-colors"
                      >
                        <XCircle className="h-3 w-3" />
                        Rejeter
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
