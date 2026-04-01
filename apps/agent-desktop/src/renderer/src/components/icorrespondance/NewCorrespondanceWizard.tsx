/**
 * NewCorrespondanceWizard — 3-step wizard modal for creating a new correspondance.
 * Steps: 1) Informations -> 2) Documents -> 3) Envoi
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "../../hooks/useConvexHooks";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import { useState, useCallback, useMemo, useRef } from "react";
import {
  Mail,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Send,
  Save,
  Loader2,
  X,
  User,
  Building2,
  FileText,
  Upload,
  AlertTriangle,
  Check,
  ChevronsUpDown,
  Users2,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  note_verbale: "Note Verbale",
  lettre_officielle: "Lettre Officielle",
  circulaire: "Circulaire",
  telegramme: "Telegramme",
  memorandum: "Memorandum",
  communique: "Communique",
};

const PRIORITY_LABELS: Record<string, string> = {
  normal: "Normal",
  urgent: "Urgent",
  confidentiel: "Confidentiel",
};

const STEP_LABELS = ["1. Informations", "2. Documents", "3. Envoi"];

// ─── Recipient types ────────────────────────────────────────

interface Recipient {
  userId: string;
  name: string;
  email: string;
  positionTitle?: string;
  orgId: string;
  orgName: string;
  avatarUrl?: string;
}

// ─── Attachment types ───────────────────────────────────────

interface UploadedAttachment {
  storageId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: number;
}

// ─── RecipientPicker (inlined) ──────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function RecipientPicker({
  selected,
  onChange,
  excludeUserId,
}: {
  selected: Recipient[];
  onChange: (recipients: Recipient[]) => void;
  excludeUserId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: recipients } = useAuthenticatedConvexQuery(
    api.functions.correspondance.listAvailableRecipients,
    {},
  );

  const allRecipients = useMemo(() => {
    if (!recipients) return [];
    const flat: Recipient[] = [];
    for (const group of recipients as any[]) {
      for (const member of group.members ?? []) {
        flat.push({
          userId: member.userId,
          name: member.name,
          email: member.email,
          positionTitle: member.positionTitle,
          orgId: group.orgId,
          orgName: group.orgName,
          avatarUrl: member.avatarUrl,
        });
      }
    }
    return flat;
  }, [recipients]);

  const filteredRecipients = useMemo(() => {
    let list = allRecipients;
    if (excludeUserId) {
      list = list.filter((r) => r.userId !== excludeUserId);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          (r.positionTitle && r.positionTitle.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [allRecipients, excludeUserId, search]);

  const groupedByOrg = useMemo(() => {
    const groups: Record<string, { orgName: string; members: Recipient[] }> = {};
    for (const r of filteredRecipients) {
      if (!groups[r.orgId]) {
        groups[r.orgId] = { orgName: r.orgName, members: [] };
      }
      groups[r.orgId].members.push(r);
    }
    return Object.entries(groups);
  }, [filteredRecipients]);

  const selectedIds = useMemo(
    () => new Set(selected.map((r) => r.userId)),
    [selected],
  );

  const toggleRecipient = (recipient: Recipient) => {
    if (selectedIds.has(recipient.userId)) {
      onChange(selected.filter((r) => r.userId !== recipient.userId));
    } else {
      onChange([...selected, recipient]);
    }
  };

  const removeRecipient = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((r) => r.userId !== userId));
  };

  const promoteToTitulaire = (userId: string) => {
    const idx = selected.findIndex((r) => r.userId === userId);
    if (idx <= 0) return;
    const next = [...selected];
    const [promoted] = next.splice(idx, 1);
    next.unshift(promoted);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            "flex w-full items-center justify-between rounded-md border border-border/50 bg-card px-3 py-2 text-sm",
            "hover:bg-accent/50 transition-colors",
            selected.length > 0 ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Users2 className="h-4 w-4 shrink-0 opacity-50" />
            <span className="truncate">
              {selected.length > 0
                ? `${selected.length} destinataire${selected.length > 1 ? "s" : ""} selectionne${selected.length > 1 ? "s" : ""}`
                : "Selectionner les destinataires..."}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute z-50 mt-1 w-full min-w-[360px] border border-border rounded-lg bg-popover shadow-lg max-h-[280px] overflow-hidden flex flex-col">
              <div className="p-2 border-b border-border/50">
                <input
                  type="text"
                  placeholder="Rechercher par nom, email, poste..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-8 px-3 text-xs bg-muted/50 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/30"
                  autoFocus
                />
              </div>
              <div className="overflow-y-auto flex-1">
                {groupedByOrg.length === 0 && (
                  <div className="p-4 text-center text-xs text-muted-foreground">Aucun destinataire trouve</div>
                )}
                {groupedByOrg.map(([orgId, group]) => (
                  <div key={orgId}>
                    <div className="px-3 py-1.5 text-[10px] text-muted-foreground flex items-center gap-1.5">
                      <Building2 className="h-3 w-3" />{group.orgName}
                    </div>
                    {group.members.map((recipient) => {
                      const isSelected = selectedIds.has(recipient.userId);
                      return (
                        <button
                          key={recipient.userId}
                          type="button"
                          onClick={() => toggleRecipient(recipient)}
                          className="flex items-center gap-3 px-3 py-1.5 w-full hover:bg-muted/50 transition-colors"
                        >
                          <Check className={cn("h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-bold text-violet-400">
                            {getInitials(recipient.name)}
                          </div>
                          <div className="flex min-w-0 flex-col text-left">
                            <span className="truncate text-sm font-medium text-foreground">{recipient.name}</span>
                            <div className="flex items-center gap-1.5">
                              {recipient.positionTitle && (
                                <span className="truncate text-xs text-muted-foreground">{recipient.positionTitle}</span>
                              )}
                              <span className="truncate text-[11px] text-muted-foreground/70">{recipient.email}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((recipient, index) => {
            const isTitulaire = index === 0;
            return (
              <button
                key={recipient.userId}
                type="button"
                onClick={() => { if (!isTitulaire) promoteToTitulaire(recipient.userId); }}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
                  isTitulaire
                    ? "bg-violet-500/15 text-violet-400 hover:bg-violet-500/25"
                    : "bg-zinc-500/15 text-zinc-400 hover:bg-zinc-500/25 cursor-pointer",
                )}
              >
                <span>{isTitulaire ? "Titulaire" : "CC"} -- {recipient.name}</span>
                <span
                  role="button"
                  tabIndex={0}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10"
                  onClick={(e) => removeRecipient(recipient.userId, e)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") removeRecipient(recipient.userId, e as unknown as React.MouseEvent); }}
                >
                  <X className="h-3 w-3" />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── AttachmentUploader (inlined) ───────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " o";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " Ko";
  return (bytes / (1024 * 1024)).toFixed(1) + " Mo";
}

function AttachmentUploader({
  attachments,
  onAttachmentsChange,
  onGenerateUploadUrl,
  showError = false,
}: {
  attachments: UploadedAttachment[];
  onAttachmentsChange: (attachments: UploadedAttachment[]) => void;
  onGenerateUploadUrl: () => Promise<string>;
  showError?: boolean;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasError = showError && attachments.length < 1;

  const uploadFile = useCallback(
    async (file: File) => {
      const uploadUrl = await onGenerateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
      const { storageId } = (await response.json()) as { storageId: string };
      return {
        storageId,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        uploadedAt: Date.now(),
      } as UploadedAttachment;
    },
    [onGenerateUploadUrl],
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;
      setIsUploading(true);
      try {
        const uploaded: UploadedAttachment[] = [];
        for (const file of fileArray) {
          const attachment = await uploadFile(file);
          uploaded.push(attachment);
        }
        onAttachmentsChange([...attachments, ...uploaded]);
      } catch (error) {
        console.error("Upload error:", error);
      } finally {
        setIsUploading(false);
      }
    },
    [attachments, onAttachmentsChange, uploadFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleRemove = useCallback(
    (index: number) => {
      onAttachmentsChange(attachments.filter((_, i) => i !== index));
    },
    [attachments, onAttachmentsChange],
  );

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors",
          "border-border/50 hover:border-border",
          isDragOver && "border-blue-500/50 bg-blue-500/5",
          hasError && !isDragOver && "border-red-500/30 bg-red-500/5",
        )}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            <p className="text-sm text-muted-foreground">Televersement en cours...</p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Deposez vos fichiers PDF ici</p>
            <p className="text-xs text-muted-foreground">ou cliquez pour parcourir</p>
          </>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,application/pdf"
        onChange={(e) => { if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files); e.target.value = ""; }}
        className="hidden"
      />
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment, index) => (
            <div key={attachment.storageId} className="flex items-center gap-3 border border-border/50 rounded-lg p-3 bg-card">
              <FileText className="h-5 w-5 shrink-0 text-red-500" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate text-foreground">{attachment.filename}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(attachment.sizeBytes)}</p>
              </div>
              <button type="button" onClick={() => handleRemove(index)} className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      {hasError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-500">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Au moins un document PDF est requis</span>
        </div>
      )}
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────

interface NewCorrespondanceWizardProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
}

// ─── Component ───────────────────────────────────────────────

export function NewCorrespondanceWizard({
  open,
  onClose,
  orgId,
}: NewCorrespondanceWizardProps) {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>("lettre_officielle");
  const [priority, setPriority] = useState<string>("normal");
  const [comment, setComment] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [showAttachError, setShowAttachError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: senderInfo } = useAuthenticatedConvexQuery(
    api.functions.correspondance.getCurrentUserSenderInfo,
    { orgId: orgId as Id<"orgs"> },
  );

  const generateUploadUrlMutation = useConvexMutationQuery(
    api.functions.correspondance.generateUploadUrl,
  );

  const createItemMutation = useConvexMutationQuery(
    api.functions.correspondance.createItem,
  );

  const sendCorrespondanceMutation = useConvexMutationQuery(
    api.functions.correspondance.sendCorrespondance,
  );

  const handleGenerateUploadUrl = useCallback(async () => {
    const result = await generateUploadUrlMutation.mutateAsync({});
    return result as string;
  }, [generateUploadUrlMutation]);

  const canProceedStep0 = title.trim().length > 0 && recipients.length > 0;

  const handleNextStep = useCallback(() => {
    if (step === 0) {
      if (!canProceedStep0) return;
      setStep(1);
    } else if (step === 1) {
      if (attachments.length === 0) {
        setShowAttachError(true);
        return;
      }
      setShowAttachError(false);
      setStep(2);
    }
  }, [step, canProceedStep0, attachments.length]);

  const handlePrevStep = useCallback(() => {
    if (step > 0) setStep(step - 1);
    else onClose();
  }, [step, onClose]);

  const handleSubmit = useCallback(
    async (asDraft: boolean) => {
      if (!senderInfo) return;
      if (!asDraft && attachments.length === 0) {
        toast.error("Au moins un document PDF est requis");
        return;
      }
      setIsSubmitting(true);
      try {
        const primary = recipients[0];
        const cc = recipients.slice(1);
        const itemId = await createItemMutation.mutateAsync({
          orgId: orgId as Id<"orgs">,
          title: title.trim(),
          type: type as any,
          priority: priority as any,
          senderName: senderInfo.name,
          senderOrg: senderInfo.orgName,
          senderEmail: senderInfo.email,
          senderUserId: senderInfo.userId as Id<"users">,
          recipientName: primary.name,
          recipientOrg: primary.orgName,
          recipientEmail: primary.email,
          primaryRecipientId: primary.userId as Id<"users">,
          primaryRecipientOrgId: primary.orgId as Id<"orgs">,
          ccRecipients: cc.map((r) => ({
            userId: r.userId as Id<"users">,
            orgId: r.orgId as Id<"orgs">,
            name: r.name,
            email: r.email,
            positionTitle: r.positionTitle,
            orgName: r.orgName,
          })),
          comment: comment.trim() || undefined,
          attachments: attachments.map((a) => ({
            storageId: a.storageId as Id<"_storage">,
            filename: a.filename,
            mimeType: a.mimeType,
            sizeBytes: a.sizeBytes,
            uploadedAt: a.uploadedAt,
          })),
          direction: "outgoing",
          confidentialite: priority === "confidentiel" ? "confidentiel" : "standard",
        });
        if (!asDraft && itemId) {
          await sendCorrespondanceMutation.mutateAsync({
            itemId: itemId as Id<"correspondanceItems">,
          });
        }
        toast.success(asDraft ? "Brouillon enregistre" : "Correspondance envoyee");
        onClose();
      } catch (e: any) {
        toast.error(e?.message ?? "Erreur lors de la creation");
      } finally {
        setIsSubmitting(false);
      }
    },
    [senderInfo, attachments, recipients, createItemMutation, orgId, title, type, priority, comment, onClose, sendCorrespondanceMutation],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl border border-border/50 shadow-2xl bg-popover rounded-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-border/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Mail className="h-5 w-5 text-violet-400" />
            Nouvelle correspondance
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="px-5 py-3 border-b border-border/50 flex items-center gap-3 shrink-0">
          {STEP_LABELS.map((label, idx) => (
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
          {/* Step 0: Informations */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Expediteur</label>
                <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                  {senderInfo ? (
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-violet-400" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-bold">{senderInfo.name}</p>
                        {senderInfo.positionTitle && (
                          <p className="text-[11px] text-muted-foreground">
                            {typeof senderInfo.positionTitle === "object" ? (senderInfo.positionTitle as any).fr : senderInfo.positionTitle}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />{senderInfo.orgName}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60">{senderInfo.email}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Chargement...</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Titre <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Objet de la correspondance..."
                  className="w-full h-9 px-3 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30"
                >
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Priorite</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30"
                >
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Destinataires <span className="text-red-400">*</span></label>
                <RecipientPicker
                  selected={recipients}
                  onChange={setRecipients}
                  excludeUserId={senderInfo?.userId}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Commentaire</label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Remarques ou instructions complementaires..."
                  className="w-full px-3 py-2 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 1: Documents */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Joignez au moins un document PDF a votre correspondance.
              </p>
              <AttachmentUploader
                attachments={attachments}
                onAttachmentsChange={setAttachments}
                onGenerateUploadUrl={handleGenerateUploadUrl}
                showError={showAttachError}
              />
            </div>
          )}

          {/* Step 2: Recap & Send */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">Verifiez les informations avant d'envoyer.</p>
              <div className="border border-border/50 rounded-xl p-4 space-y-3 bg-card">
                {senderInfo && (
                  <div>
                    <p className="text-[9px] text-muted-foreground/60 uppercase">Expediteur</p>
                    <p className="text-xs font-medium">{senderInfo.name}</p>
                    {senderInfo.positionTitle && (
                      <p className="text-[11px] text-muted-foreground">
                        {typeof senderInfo.positionTitle === "object" ? (senderInfo.positionTitle as any).fr : senderInfo.positionTitle}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">{senderInfo.orgName}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[9px] text-muted-foreground/60 uppercase">Titre</p>
                    <p className="text-xs font-medium">{title}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground/60 uppercase">Type</p>
                    <p className="text-xs font-medium">{TYPE_LABELS[type] ?? type}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground/60 uppercase">Priorite</p>
                    <p className="text-xs font-medium capitalize">{PRIORITY_LABELS[priority] ?? priority}</p>
                  </div>
                </div>
                {recipients.length > 0 && (
                  <div>
                    <p className="text-[9px] text-muted-foreground/60 uppercase">Destinataire principal</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs font-medium">{recipients[0].name}</p>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 font-medium">Titulaire</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{recipients[0].orgName}</p>
                  </div>
                )}
                {recipients.length > 1 && (
                  <div>
                    <p className="text-[9px] text-muted-foreground/60 uppercase">En copie</p>
                    <div className="space-y-1 mt-1">
                      {recipients.slice(1).map((r) => (
                        <div key={r.userId} className="text-xs text-muted-foreground">
                          {r.name} <span className="text-muted-foreground/50">({r.orgName})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-[9px] text-muted-foreground/60 uppercase">Documents joints ({attachments.length})</p>
                  <div className="space-y-1 mt-1">
                    {attachments.map((a) => (
                      <div key={a.storageId} className="text-xs text-muted-foreground">{a.filename}</div>
                    ))}
                  </div>
                </div>
                {comment.trim() && (
                  <div>
                    <p className="text-[9px] text-muted-foreground/60 uppercase">Commentaire</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{comment}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/50 flex justify-between shrink-0">
          <button
            onClick={handlePrevStep}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {step > 0 ? "Precedent" : "Annuler"}
          </button>
          {step < 2 ? (
            <button
              onClick={handleNextStep}
              disabled={step === 0 && !canProceedStep0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-gradient-to-r from-indigo-600 to-violet-500 text-white disabled:opacity-50 transition-colors"
            >
              Suivant
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Enregistrer brouillon
              </button>
              <button
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-gradient-to-r from-indigo-600 to-violet-500 text-white disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Envoyer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
