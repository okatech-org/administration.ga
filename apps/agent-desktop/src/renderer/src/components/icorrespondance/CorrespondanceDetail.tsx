/**
 * CorrespondanceDetail — Detailed view of a correspondance item.
 * Layout: [Document list | Viewer/Infos] with action bar.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { DocumentSheetFile } from "@workspace/ui/components/document-sheet";
import {
  ArrowLeft,
  Archive,
  Check,
  ChevronRight,
  Clock,
  Download,
  FileText,
  FolderOpen,
  Inbox,
  Loader2,
  Maximize,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Send,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "../../hooks/useConvexHooks";
import { cn } from "../../lib/utils";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface ViewerDoc {
  id: string;
  title: string;
  url?: string;
  mimeType?: string;
}

interface CorrespondanceDetailProps {
  itemId: Id<"correspondanceItems">;
  currentUserId: string;
  currentOrgId: string;
  onBack: () => void;
}

// ═══════════════════════════════════════════════════════════════
// Config
// ═══════════════════════════════════════════════════════════════

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Brouillon", color: "text-amber-400 bg-amber-500/15" },
  pending: { label: "En attente", color: "text-blue-400 bg-blue-500/15" },
  approved: { label: "Approuve", color: "text-emerald-400 bg-emerald-500/15" },
  sent: { label: "Envoye", color: "text-violet-400 bg-violet-500/15" },
  received: { label: "Recu", color: "text-indigo-400 bg-indigo-500/15" },
  archived: { label: "Archive", color: "text-zinc-400 bg-zinc-500/15" },
};

// ═══════════════════════════════════════════════════════════════
// DocumentViewerModal (inlined)
// ═══════════════════════════════════════════════════════════════

function DocumentViewerModal({ isOpen, onClose, document: doc }: { isOpen: boolean; onClose: () => void; document: ViewerDoc | null }) {
  if (!isOpen || !doc) return null;
  const url = doc.url ?? "";
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={onClose}>
      <div className="bg-card rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold truncate">{doc.title}</h3>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        {doc.mimeType === "application/pdf" ? (
          <iframe src={`${url}#view=FitH`} className="w-full h-[75vh] border-0" title={doc.title} />
        ) : doc.mimeType?.startsWith("image/") ? (
          <div className="flex items-center justify-center p-4 h-[75vh]">
            <img src={url} alt={doc.title} className="max-w-full max-h-full object-contain" />
          </div>
        ) : (
          <div className="flex items-center justify-center h-[75vh]">
            <p className="text-muted-foreground">Apercu non disponible</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ApprovalPanel (inlined)
// ═══════════════════════════════════════════════════════════════

const STEP_STATUS_CFG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "En attente", color: "text-blue-400 bg-blue-500/15 border-blue-500/20", icon: Loader2 },
  approved: { label: "Approuve", color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/20", icon: Check },
  rejected: { label: "Rejete", color: "text-red-400 bg-red-500/15 border-red-500/20", icon: X },
  skipped: { label: "Passe", color: "text-zinc-400 bg-zinc-500/15 border-zinc-500/20", icon: ChevronRight },
};

function ApprovalPanel({ itemId, currentUserId, status }: { itemId: Id<"correspondanceItems">; currentUserId: string; status: string }) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [approveComment, setApproveComment] = useState("");
  const [showCommentInput, setShowCommentInput] = useState(false);

  const { data: steps, isPending } = useAuthenticatedConvexQuery(
    api.functions.correspondance.getApprovalSteps,
    { itemId },
  );

  const { mutateAsync: approveStep, isPending: isApproving } = useConvexMutationQuery(
    api.functions.correspondance.approveChainStep,
  );

  const { mutateAsync: rejectStep, isPending: isRejecting } = useConvexMutationQuery(
    api.functions.correspondance.rejectChainStep,
  );

  if (isPending) {
    return <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;
  }

  if (!steps || steps.length === 0) return null;

  const sortedSteps = [...steps].sort((a: any, b: any) => a.ordre - b.ordre);
  const myPendingStep = sortedSteps.find((s: any) => s.approverId === currentUserId && s.status === "pending");
  const isMyTurn = !!myPendingStep;

  const handleApprove = async () => {
    try {
      await approveStep({ itemId, comment: approveComment.trim() || undefined });
      toast.success("Correspondance approuvee");
      setApproveComment("");
      setShowCommentInput(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors de l'approbation");
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error("Veuillez indiquer un motif de rejet"); return; }
    try {
      await rejectStep({ itemId, reason: rejectReason.trim() });
      toast.success("Correspondance rejetee");
      setRejectOpen(false);
      setRejectReason("");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors du rejet");
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-primary">Chaine d'approbation</h4>
        <span className="text-[9px] ml-auto px-1.5 py-0.5 rounded-full border border-border/50">
          {sortedSteps.filter((s: any) => s.status === "approved").length}/{sortedSteps.length} etapes
        </span>
      </div>
      <div className="space-y-1">
        {sortedSteps.map((step: any, i: number) => {
          const cfg = STEP_STATUS_CFG[step.status] ?? STEP_STATUS_CFG.pending;
          const isActive = step.status === "pending" && (i === 0 || sortedSteps[i - 1]?.status === "approved");
          const StepIcon = cfg.icon;
          return (
            <div key={step._id} className={cn("flex items-center gap-3 px-3 py-2 rounded-lg transition-all", isActive ? "bg-primary/10 border border-primary/20" : "bg-transparent")}>
              <div className={cn("h-7 w-7 rounded-full flex items-center justify-center shrink-0", cfg.color)}>
                <StepIcon className={cn("h-3.5 w-3.5", step.status === "pending" && isActive && "animate-spin")} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{step.approverName ?? "Approbateur"}</span>
                  {step.approverRole && <span className="text-[9px] text-muted-foreground capitalize">({step.approverRole})</span>}
                </div>
                {step.comment && <p className="text-[10px] text-muted-foreground mt-0.5 italic">"{step.comment}"</p>}
              </div>
              <span className={cn("text-[9px] shrink-0 px-1.5 py-0.5 rounded-full border", cfg.color)}>{cfg.label}</span>
            </div>
          );
        })}
      </div>
      {isMyTurn && status === "pending" && (
        <div className="pt-2 border-t border-primary/10 space-y-2">
          {showCommentInput && (
            <input
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
              placeholder="Commentaire (optionnel)"
              className="h-8 w-full text-xs px-3 border border-border rounded-md bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          )}
          <div className="flex items-center gap-2">
            <button onClick={handleApprove} disabled={isApproving || isRejecting} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">
              {isApproving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Approuver
            </button>
            <button onClick={() => setRejectOpen(true)} disabled={isApproving || isRejecting} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-red-600 hover:bg-red-700 text-white disabled:opacity-50">
              <X className="h-3.5 w-3.5" />Rejeter
            </button>
            {!showCommentInput && (
              <button onClick={() => setShowCommentInput(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md text-muted-foreground hover:bg-muted transition-colors">
                <MessageSquare className="h-3.5 w-3.5" />Commentaire
              </button>
            )}
          </div>
        </div>
      )}
      {/* Reject dialog */}
      {rejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setRejectOpen(false)}>
          <div className="bg-popover rounded-xl border border-border shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-500" />
              <h3 className="text-sm font-semibold">Rejeter la correspondance</h3>
            </div>
            <p className="text-xs text-muted-foreground">La correspondance sera retournee au createur pour modification.</p>
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motif du rejet (obligatoire)"
              className="h-9 w-full text-xs px-3 border border-border rounded-md bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRejectOpen(false)} className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors">Annuler</button>
              <button onClick={handleReject} disabled={isRejecting || !rejectReason.trim()} className="px-3 py-1.5 text-xs rounded-md bg-red-600 hover:bg-red-700 text-white disabled:opacity-50">
                {isRejecting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin inline" /> : null}Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// WorkflowTimeline (inlined)
// ═══════════════════════════════════════════════════════════════

interface WorkflowStep {
  id: string;
  action: string;
  actorName?: string;
  targetName?: string;
  comment?: string;
  timestamp: number;
}

const WF_ACTION_CONFIG: Record<string, { label: string; color: string }> = {
  CREATED: { label: "Cree", color: "bg-green-500" },
  creer: { label: "Cree", color: "bg-green-500" },
  SENT_FOR_APPROVAL: { label: "Soumis pour approbation", color: "bg-blue-500" },
  soumettre: { label: "Soumis pour approbation", color: "bg-blue-500" },
  APPROVED: { label: "Approuve", color: "bg-emerald-500" },
  valider: { label: "Approuve", color: "bg-emerald-500" },
  REJECTED: { label: "Rejete", color: "bg-red-500" },
  rejeter: { label: "Rejete", color: "bg-red-500" },
  TRANSMITTED: { label: "Transmis", color: "bg-violet-500" },
  transmettre: { label: "Transmis", color: "bg-violet-500" },
  SENT_EMAIL: { label: "Envoye par email", color: "bg-sky-500" },
  ARCHIVED: { label: "Archive", color: "bg-amber-500" },
  archiver: { label: "Archive", color: "bg-amber-500" },
  VIEWED: { label: "Consulte", color: "bg-gray-500" },
  retourner: { label: "Renvoye", color: "bg-orange-500" },
  suspendre: { label: "Suspendu", color: "bg-yellow-500" },
  reprendre: { label: "Repris", color: "bg-green-500" },
  signer: { label: "Signe", color: "bg-indigo-500" },
  clore: { label: "Cloture", color: "bg-zinc-500" },
  commenter: { label: "Commentaire", color: "bg-gray-500" },
};

const rtf = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

function getRelativeTime(timestamp: number): string {
  const diffMs = timestamp - Date.now();
  const diffSeconds = Math.round(diffMs / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);
  const diffWeeks = Math.round(diffDays / 7);
  const diffMonths = Math.round(diffDays / 30);

  if (Math.abs(diffSeconds) < 60) return rtf.format(diffSeconds, "second");
  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, "minute");
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");
  if (Math.abs(diffDays) < 7) return rtf.format(diffDays, "day");
  if (Math.abs(diffWeeks) < 5) return rtf.format(diffWeeks, "week");
  return rtf.format(diffMonths, "month");
}

function getInitials(name: string): string {
  return name.split(" ").map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function WorkflowTimeline({ steps }: { steps: WorkflowStep[] }) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="relative flex flex-col gap-0">
      {steps.map((step, index) => {
        const { label, color } = WF_ACTION_CONFIG[step.action] ?? { label: step.action, color: "bg-gray-400" };
        const isLast = index === steps.length - 1;
        return (
          <div key={step.id} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast && <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-border/50" />}
            <div className={cn("relative z-10 mt-1 h-6 w-6 shrink-0 rounded-full border-2 border-background shadow-sm", color)} />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{label}</span>
                {step.targetName && <span className="text-xs text-muted-foreground">-&gt; {step.targetName}</span>}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {step.actorName ? (
                  <span className="flex items-center gap-1">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium" title={step.actorName}>{getInitials(step.actorName)}</span>
                    <span>{step.actorName}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /><span>Systeme</span></span>
                )}
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /><span>{getRelativeTime(step.timestamp)}</span></span>
              </div>
              {step.comment && (
                <div className="mt-1 flex items-start gap-1.5 rounded-md bg-muted/30 p-2 text-xs text-muted-foreground">
                  <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/60" />
                  <span>{step.comment}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TrackingTimeline (inlined)
// ═══════════════════════════════════════════════════════════════

const TRACKING_STEPS = [
  { key: "sent", label: "Envoye", icon: Send, color: "text-violet-400", bgColor: "bg-violet-500/15", borderColor: "border-violet-500/30" },
  { key: "recu", label: "Receptionne", icon: Inbox, color: "text-blue-400", bgColor: "bg-blue-500/15", borderColor: "border-blue-500/30" },
  { key: "en_attente", label: "En traitement", icon: Clock, color: "text-orange-400", bgColor: "bg-orange-500/15", borderColor: "border-orange-500/30" },
  { key: "approuve", label: "Approuve", icon: Check, color: "text-emerald-400", bgColor: "bg-emerald-500/15", borderColor: "border-emerald-500/30" },
  { key: "repondu", label: "Repondu", icon: MessageSquare, color: "text-violet-400", bgColor: "bg-violet-500/15", borderColor: "border-violet-500/30" },
] as const;

const STATUS_TO_INDEX: Record<string, number> = { en_transit: 0, recu: 1, en_attente: 2, approuve: 3, repondu: 4 };

function formatTrackingDate(ts?: number): string {
  if (!ts) return "--";
  return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function TrackingTimeline({
  itemId,
  sentAt,
  recipientStatus,
  recipientStatusUpdatedAt,
  arrivalReference,
  arrivalDate,
}: {
  itemId: Id<"correspondanceItems">;
  sentAt?: number;
  recipientStatus?: string;
  recipientStatusUpdatedAt?: number;
  arrivalReference?: string;
  arrivalDate?: number;
}) {
  const activeIndex = recipientStatus ? (STATUS_TO_INDEX[recipientStatus] ?? 0) : 0;

  const { data: workflowSteps } = useAuthenticatedConvexQuery(
    api.functions.correspondance.getWorkflowHistory,
    { itemId },
  );

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">Suivi de la correspondance</h4>
        {recipientStatus && (
          <span className={cn("text-[9px] ml-auto px-1.5 py-0.5 rounded-full border border-border/50", TRACKING_STEPS[activeIndex]?.color)}>
            {TRACKING_STEPS[activeIndex]?.label}
          </span>
        )}
      </div>
      <div className="relative pl-4">
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border/50" />
        {TRACKING_STEPS.map((step, i) => {
          const isPast = i <= activeIndex;
          const isCurrent = i === activeIndex;
          const StepIcon = step.icon;
          let stepDate: number | undefined;
          if (step.key === "sent") stepDate = sentAt;
          else if (step.key === "recu" && arrivalDate) stepDate = arrivalDate;
          else if (isPast && recipientStatusUpdatedAt && i === activeIndex) stepDate = recipientStatusUpdatedAt;

          return (
            <div key={step.key} className={cn("relative flex items-start gap-3 pb-4 last:pb-0", !isPast && "opacity-40")}>
              <div className={cn(
                "relative z-10 h-8 w-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all",
                isPast ? cn(step.bgColor, step.borderColor) : "bg-muted border-border",
                isCurrent && "ring-2 ring-primary/20 ring-offset-2 ring-offset-background",
              )}>
                {isCurrent && recipientStatus !== "repondu" ? (
                  <Loader2 className={cn("h-3.5 w-3.5 animate-spin", step.color)} />
                ) : (
                  <StepIcon className={cn("h-3.5 w-3.5", isPast ? step.color : "text-muted-foreground")} />
                )}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-medium", isPast ? "text-foreground" : "text-muted-foreground")}>{step.label}</span>
                  {isCurrent && <span className="text-[8px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">Actuel</span>}
                </div>
                {isPast && stepDate && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{formatTrackingDate(stepDate)}</span>
                  </div>
                )}
                {step.key === "recu" && arrivalReference && isPast && (
                  <div className="mt-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted border border-border/50">Ref. arrivee : {arrivalReference}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {workflowSteps && (workflowSteps as any[]).length > 0 && (
        <details className="group">
          <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-1">
            <Clock className="h-3 w-3" />Historique complet ({(workflowSteps as any[]).length} actions)
          </summary>
          <div className="mt-2 space-y-1 pl-1">
            {(workflowSteps as any[]).map((step: any) => (
              <div key={step._id} className="flex items-start gap-2 text-[10px] py-1">
                <span className="text-muted-foreground/50 shrink-0 w-24">{formatTrackingDate(step.createdAt)}</span>
                <span className="text-muted-foreground">
                  <strong className="text-foreground/80">{step.actorName}</strong>{" -- "}{step.comment ?? step.stepType}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// WorkflowTimelineWrapper
// ═══════════════════════════════════════════════════════════════

function WorkflowTimelineWrapper({ itemId }: { itemId: Id<"correspondanceItems"> }) {
  const { data: steps } = useAuthenticatedConvexQuery(
    api.functions.correspondance.getWorkflowHistory,
    { itemId },
  );

  if (!steps || steps.length === 0) return null;

  const mappedSteps = (steps as any[]).map((s) => ({
    id: s._id as string,
    action: s.stepType,
    actorName: s.actorName,
    targetName: s.targetName,
    comment: s.comment,
    timestamp: s.createdAt,
  }));

  return <WorkflowTimeline steps={mappedSteps} />;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function CorrespondanceDetail({
  itemId,
  currentUserId,
  currentOrgId,
  onBack,
}: CorrespondanceDetailProps) {
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);
  const [selectedDocViewer, setSelectedDocViewer] = useState<ViewerDoc | null>(null);

  void currentOrgId;

  const { data: item, isPending } = useAuthenticatedConvexQuery(
    api.functions.correspondance.getItem,
    { itemId },
  );

  const { mutateAsync: sendCorrespondance, isPending: isSending } = useConvexMutationQuery(
    api.functions.correspondance.sendCorrespondance,
  );

  const { mutateAsync: deleteItem } = useConvexMutationQuery(
    api.functions.correspondance.deleteItem,
  );

  const { mutateAsync: classerDansIDocument } = useConvexMutationQuery(
    api.functions.correspondanceDocuments.classerCorrespondanceDansIDocument,
  );

  const { mutateAsync: removeDocument } = useConvexMutationQuery(
    api.functions.correspondanceDocuments.removeDocumentFromCorrespondance,
  );

  if (isPending || !item) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isCopy = (item as any).isCopy === true;
  const docs = (item as any).documents ?? [];
  const attachments = item.attachments ?? [];
  const allDocs = docs.length > 0 ? docs : attachments.map((a: any, i: number) => ({
    ...a,
    ordre: i + 1,
    isMainDocument: i === 0,
    label: a.filename,
  }));

  const selectedDoc = allDocs[selectedDocIndex] ?? allDocs[0];
  const stCfg = STATUS_LABELS[item.status] ?? STATUS_LABELS.draft;

  const handleSend = async () => {
    try {
      await sendCorrespondance({ itemId });
      toast.success("Correspondance envoyee");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors de l'envoi");
    }
  };

  const handleClasser = async () => {
    try {
      await classerDansIDocument({ itemId });
      toast.success("Dossier classe dans iDocument");
      onBack();
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors du classement");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteItem({ itemId });
      toast.success("Correspondance supprimee");
      onBack();
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    }
  };

  const handleRemoveDoc = async (docIndex: number) => {
    try {
      await removeDocument({ itemId, documentIndex: docIndex });
      toast.success("Document retire et classe dans iDocument");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    }
  };

  // Keep references to avoid TS6133
  void handleDelete;
  void handleRemoveDoc;

  return (
    <div className="space-y-4">
      {/* Navigation + actions bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md hover:bg-muted transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />Retour
        </button>
        <div className="flex-1" />
        {item.status === "draft" && !isCopy && (
          <button onClick={handleSend} disabled={isSending} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">
            {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}Envoyer
          </button>
        )}
        {item.status === "received" && !isCopy && (
          <>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors">
              <MessageSquare className="h-3.5 w-3.5" />Repondre
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors">
              <Send className="h-3.5 w-3.5" />Transmettre
            </button>
          </>
        )}
        <button onClick={handleClasser} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors">
          <Archive className="h-3.5 w-3.5" />Classer dans iDocument
        </button>
        <div className="relative group">
          <button className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted transition-colors">
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {/* Simple dropdown on hover approach replaced by click-toggle for consistency */}
        </div>
      </div>

      {/* Header */}
      <div className={cn("rounded-xl border p-5 space-y-3", isCopy && "opacity-75 bg-muted/20")}>
        <div className="flex items-start gap-3">
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", isCopy ? "bg-zinc-500/10" : "bg-primary/10")}>
            <FolderOpen className={cn("h-6 w-6", isCopy ? "text-zinc-400" : "text-primary")} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {isCopy && <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/40 bg-muted/40 px-1.5 py-0.5 rounded">Copie</span>}
              <span className="text-[10px] font-mono text-muted-foreground">{item.reference}</span>
              <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full", stCfg.color)}>{stCfg.label}</span>
            </div>
            <h2 className="text-lg font-semibold mt-1">{item.title}</h2>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span><strong>De :</strong> {item.senderName} {item.senderOrg && `(${item.senderOrg})`}</span>
              <span><strong>A :</strong> {item.recipientName} {item.recipientOrg && `(${item.recipientOrg})`}</span>
            </div>
          </div>
        </div>
        {item.comment && (
          <p className="text-sm text-muted-foreground border-l-2 border-primary/20 pl-3 italic">{item.comment}</p>
        )}
      </div>

      {/* Content: Documents + Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Document list — vignettes A4 fidèles */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Paperclip className="h-3 w-3" />Documents ({allDocs.length})
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {allDocs.map((doc: any, i: number) => {
              const label = doc.label ?? doc.filename;
              const subtitle = `${doc.isMainDocument ? "Document principal" : "Annexe"}${doc.copyWatermark ? " - COPIE" : ""}`;
              const isSelected = selectedDocIndex === i;
              return (
                <div key={doc.storageId ?? i} className="flex flex-col gap-1.5">
                  <div className={cn("relative", isSelected && "ring-2 ring-primary/60 ring-offset-2")}>
                    <DocumentSheetFile
                      fileName={doc.filename ?? label}
                      mimeType={doc.mimeType}
                      url={doc.url ?? null}
                      subtitle={subtitle}
                      onClick={() => setSelectedDocIndex(i)}
                      ariaLabel={`Sélectionner ${label}`}
                      overlays={
                        doc.isMainDocument ? (
                          <div className="absolute left-2 top-2">
                            <span className="inline-flex rounded bg-primary/90 px-1.5 py-0.5 text-[0.6rem] font-medium uppercase text-primary-foreground shadow-sm">
                              Principal
                            </span>
                          </div>
                        ) : null
                      }
                    />
                  </div>
                  <div className="px-1">
                    <p className="text-xs font-medium truncate" title={label}>{label}</p>
                    <p className="text-[10px] text-muted-foreground">{subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Viewer / infos */}
        <div className="lg:col-span-2 space-y-4">
          {selectedDoc && (
            <div className={cn("rounded-xl border bg-card overflow-hidden", isCopy && "relative")}>
              {isCopy && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <span className="text-6xl font-black text-muted-foreground/10 rotate-[-30deg] select-none">COPIE</span>
                </div>
              )}
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{selectedDoc.label ?? selectedDoc.filename}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {(selectedDoc.sizeBytes / 1024).toFixed(0)} Ko - {selectedDoc.mimeType}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!isCopy && selectedDoc.url && (
                    <>
                      <button onClick={() => setSelectedDocViewer({ id: selectedDoc.id || String(selectedDocIndex), title: selectedDoc.filename, url: selectedDoc.url, mimeType: selectedDoc.mimeType })} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors hidden sm:flex">
                        <Maximize className="h-3.5 w-3.5" />Agrandir
                      </button>
                      <a href={selectedDoc.url} download={selectedDoc.filename} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors">
                        <Download className="h-3.5 w-3.5" />Telecharger
                      </a>
                    </>
                  )}
                </div>
              </div>
              {selectedDoc.url ? (
                <motion.div layoutId={`doc-card-${selectedDoc.id || selectedDocIndex}`} className="h-[650px] w-full bg-muted/5 border-t">
                  {selectedDoc.mimeType === "application/pdf" ? (
                    <iframe src={`${selectedDoc.url}#view=FitH`} className="w-full h-full border-0" title={selectedDoc.filename} />
                  ) : selectedDoc.mimeType?.startsWith("image/") ? (
                    <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
                      <img src={selectedDoc.url} alt={selectedDoc.filename} className="max-w-full max-h-[600px] object-contain shadow-md border border-border/50 rounded-sm" />
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center space-y-3">
                        <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                        <p className="text-sm font-medium">{selectedDoc.filename}</p>
                        <p className="text-xs text-muted-foreground/60 max-w-[250px] mx-auto">
                          Apercu non disponible pour ce format de fichier ({selectedDoc.mimeType}).
                        </p>
                        <a href={selectedDoc.url} download={selectedDoc.filename} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-4 text-xs rounded-md border border-border hover:bg-muted transition-colors">
                          <Download className="h-3.5 w-3.5" />Telecharger
                        </a>
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="h-[500px] flex items-center justify-center bg-muted/10 border-t">
                  <div className="text-center space-y-2">
                    <Loader2 className="h-8 w-8 text-muted-foreground/30 animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground">Chargement du document...</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Approval panel */}
          {item.status === "pending" && (
            <ApprovalPanel itemId={itemId} currentUserId={currentUserId} status={item.status} />
          )}

          {/* Tracking timeline */}
          {isCopy && (
            <TrackingTimeline
              itemId={itemId}
              sentAt={(item as any).sentAt}
              recipientStatus={(item as any).recipientStatus}
              recipientStatusUpdatedAt={(item as any).recipientStatusUpdatedAt}
              arrivalReference={(item as any).arrivalReference}
              arrivalDate={(item as any).arrivalDate}
            />
          )}

          {/* Workflow history */}
          <WorkflowTimelineWrapper itemId={itemId} />
        </div>
      </div>

      <DocumentViewerModal isOpen={!!selectedDocViewer} onClose={() => setSelectedDocViewer(null)} document={selectedDocViewer} />
    </div>
  );
}
