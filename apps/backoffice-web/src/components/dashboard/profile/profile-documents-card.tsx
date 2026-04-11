import {
  CheckCircle,
  Clock,
  Eye,
  FileImage,
  FileText,
  Home,
  ScrollText,
  Shield,
  XCircle,
} from "lucide-react";
import { useState } from "react";

import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ─── Mapping des types de documents consulaires ───────────────
const DOCUMENT_CONFIGS: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  identity_photo: {
    label: "Photo d'identite",
    icon: FileImage,
    color: "text-teal-600 dark:text-teal-400",
  },
  passport: {
    label: "Passeport",
    icon: ScrollText,
    color: "text-blue-500",
  },
  proof_of_address: {
    label: "Justificatif domicile",
    icon: Home,
    color: "text-amber-500",
  },
  birth_certificate: {
    label: "Acte de naissance",
    icon: FileText,
    color: "text-purple-500",
  },
  residence_permit: {
    label: "Titre de sejour",
    icon: Shield,
    color: "text-emerald-500",
  },
};

// ─── Status helpers ───────────────────────────────────────────
function getStatusConfig(status?: string) {
  switch (status) {
    case "validated":
    case "approved":
      return {
        label: "Valide",
        variant: "default" as const,
        className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
      };
    case "rejected":
      return {
        label: "Rejete",
        variant: "destructive" as const,
        className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
      };
    case "pending":
    default:
      return {
        label: "En attente",
        variant: "secondary" as const,
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
      };
  }
}

// ─── Props ────────────────────────────────────────────────────
export interface ProfileDocumentsCardProps {
  documents: any[];
  canValidate: boolean;
  onPreview?: (doc: any) => void;
  onValidate?: (documentId: string) => void;
  onReject?: (documentId: string, reason: string) => void;
}

/**
 * Grille des 5 documents consulaires avec actions de validation.
 * Barre de progression en haut : X/5 valides.
 */
export function ProfileDocumentsCard({
  documents,
  canValidate,
  onPreview,
  onValidate,
  onReject,
}: ProfileDocumentsCardProps) {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Nombre de documents valides
  const validatedCount = documents.filter(
    (d) => d.status === "validated" || d.status === "approved",
  ).length;
  const totalExpected = 5;
  const progressPercent = Math.round((validatedCount / totalExpected) * 100);

  const handleReject = (docId: string) => {
    if (!rejectReason.trim()) return;
    onReject?.(docId, rejectReason.trim());
    setRejectingId(null);
    setRejectReason("");
  };

  return (
    <FlatCard>
      <div className="p-3 lg:p-4">
        <SectionHeader
          icon={<FileText className="h-3.5 w-3.5" />}
          iconBgClass="bg-blue-500/10"
          iconTextClass="text-blue-500"
          title="Documents"
          actions={
            <span className="text-[10px] text-muted-foreground font-medium">
              {validatedCount}/{totalExpected} valides
            </span>
          }
        />
        {/* Barre de progression */}
        <div className="h-1.5 w-full rounded-full overflow-hidden bg-muted mb-2">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              progressPercent === 100
                ? "bg-green-500"
                : progressPercent >= 60
                  ? "bg-teal-500"
                  : "bg-amber-500",
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {documents.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-[12px]">Aucun document soumis</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {documents.map((doc) => {
              const config = DOCUMENT_CONFIGS[doc.documentType] ?? {
                label: doc.label || doc.documentType || "Document",
                icon: FileText,
                color: "text-muted-foreground",
              };
              const status = getStatusConfig(doc.status);
              const Icon = config.icon;
              const isRejecting = rejectingId === doc._id;

              return (
                <div
                  key={doc._id}
                  className="flex flex-col gap-1.5 p-2.5 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {/* Icone du document */}
                    <div className="h-8 w-8 rounded-md bg-card flex items-center justify-center shrink-0 border border-border/50">
                      <Icon className={cn("h-4 w-4", config.color)} />
                    </div>

                    {/* Nom et statut */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold truncate">{config.label}</p>
                      {doc.files?.length > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          {doc.files.length} fichier{doc.files.length > 1 ? "s" : ""}
                        </p>
                      )}
                    </div>

                    {/* Badge de statut */}
                    <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 shrink-0", status.className)}>
                      {status.label === "Valide" && <CheckCircle className="h-2.5 w-2.5 mr-0.5" />}
                      {status.label === "Rejete" && <XCircle className="h-2.5 w-2.5 mr-0.5" />}
                      {status.label === "En attente" && <Clock className="h-2.5 w-2.5 mr-0.5" />}
                      {status.label}
                    </Badge>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {onPreview && doc.files?.[0]?.storageId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => onPreview(doc)}
                          title="Apercu"
                        >
                          <Eye className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      )}
                      {canValidate && doc.status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:bg-green-500/10"
                            onClick={() => onValidate?.(doc._id)}
                            title="Valider"
                          >
                            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:bg-red-500/10"
                            onClick={() => setRejectingId(isRejecting ? null : doc._id)}
                            title="Rejeter"
                          >
                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Zone de saisie motif de rejet */}
                  {isRejecting && (
                    <div className="flex gap-2 mt-1">
                      <Textarea
                        placeholder="Motif du rejet..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="text-[11px] min-h-[48px] h-12 resize-none"
                      />
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-5 text-[10px] px-2"
                          onClick={() => handleReject(doc._id)}
                          disabled={!rejectReason.trim()}
                        >
                          Rejeter
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 text-[10px] px-2"
                          onClick={() => { setRejectingId(null); setRejectReason(""); }}
                        >
                          Annuler
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </FlatCard>
  );
}
