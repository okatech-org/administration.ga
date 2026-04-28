/**
 * WorkflowActionPanel — Context-sensitive action buttons based on current step.
 * Shows available actions for the agent at the current workflow step.
 */

import { cn } from "@workspace/ui/lib/utils";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  Lock,
  Send,
  Pen,
  Loader2,
} from "lucide-react";
import { useState } from "react";

interface WorkflowActionPanelProps {
  dossierId: string;
  currentStepCode: string;
  actionsAutorisees: string[];
  status: string;
  onAction: (action: string, commentaire?: string) => Promise<void>;
  isLoading?: boolean;
}

const ACTION_CONFIG: Record<
  string,
  { label: string; icon: any; color: string; description: string; needsComment?: boolean }
> = {
  valider: {
    label: "Valider",
    icon: CheckCircle2,
    color: "bg-emerald-600 hover:bg-emerald-700 text-white",
    description: "Valider l'étape et transmettre",
  },
  transmettre: {
    label: "Transmettre",
    icon: Send,
    color: "bg-blue-600 hover:bg-blue-700 text-white",
    description: "Envoyer à l'organisme suivant",
  },
  rejeter: {
    label: "Rejeter",
    icon: XCircle,
    color: "bg-red-600 hover:bg-red-700 text-white",
    description: "Rejeter le dossier avec motif",
    needsComment: true,
  },
  retourner: {
    label: "Renvoyer",
    icon: ArrowLeft,
    color: "bg-orange-600 hover:bg-orange-700 text-white",
    description: "Renvoyer à l'étape précédente",
    needsComment: true,
  },
  signer: {
    label: "Signer",
    icon: Pen,
    color: "bg-primary hover:bg-primary/90 text-primary-foreground",
    description: "Apposer votre signature",
  },
  suspendre: {
    label: "Suspendre",
    icon: Pause,
    color: "bg-yellow-600 hover:bg-yellow-700 text-white",
    description: "Mettre en pause le traitement",
    needsComment: true,
  },
  reprendre: {
    label: "Reprendre",
    icon: Play,
    color: "bg-green-600 hover:bg-green-700 text-white",
    description: "Reprendre le traitement",
  },
  clore: {
    label: "Clôturer",
    icon: Lock,
    color: "bg-zinc-600 hover:bg-zinc-700 text-white",
    description: "Clôturer administrativement",
    needsComment: true,
  },
};

export function WorkflowActionPanel({
  currentStepCode: _currentStepCode,
  dossierId: _dossierId,
  actionsAutorisees,
  status,
  onAction,
  isLoading = false,
}: WorkflowActionPanelProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [commentaire, setCommentaire] = useState("");
  const [executing, setExecuting] = useState(false);

  // Filter available actions based on status
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
        Aucune action disponible à cette étape
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
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50",
                cfg.color,
              )}
              title={cfg.description}
            >
              {executing && activeAction === action ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Comment input for actions that require it */}
      {activeAction && ACTION_CONFIG[activeAction]?.needsComment && (
        <div className="border border-border/50 rounded-lg p-3 space-y-2 bg-muted/30">
          <p className="text-xs font-medium">
            {ACTION_CONFIG[activeAction].label} — Commentaire
            {activeAction === "rejeter" && (
              <span className="text-red-400 ml-1">*</span>
            )}
          </p>
          <textarea
            rows={2}
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            placeholder={
              activeAction === "rejeter"
                ? "Motif du rejet (obligatoire)..."
                : "Commentaire optionnel..."
            }
            className="w-full px-3 py-2 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setActiveAction(null);
                setCommentaire("");
              }}
              className="px-3 py-1 text-xs rounded-md border border-border hover:bg-muted transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={() => handleExecute(activeAction)}
              disabled={
                executing ||
                (activeAction === "rejeter" && !commentaire.trim())
              }
              className={cn(
                "px-3 py-1 text-xs rounded-md transition-colors disabled:opacity-50",
                ACTION_CONFIG[activeAction].color,
              )}
            >
              {executing ? (
                <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
              ) : null}
              Confirmer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
