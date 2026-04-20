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

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { FlatCard } from "../my-space/flat-card";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";

const DOCUMENT_CONFIGS: Record<
  string,
  { label: string; icon: React.ElementType }
> = {
  identity_photo: { label: "Photo d'identite", icon: FileImage },
  passport: { label: "Passeport", icon: ScrollText },
  proof_of_address: { label: "Justificatif domicile", icon: Home },
  birth_certificate: { label: "Acte de naissance", icon: FileText },
  residence_permit: { label: "Titre de sejour", icon: Shield },
};

function getStatusConfig(status?: string) {
  switch (status) {
    case "validated":
    case "approved":
      return {
        label: "Valide",
        className: "bg-success-light text-success border-success/20",
        Icon: CheckCircle,
      };
    case "rejected":
      return {
        label: "Rejete",
        className: "bg-destructive-light text-destructive border-destructive/20",
        Icon: XCircle,
      };
    case "pending":
    default:
      return {
        label: "En attente",
        className: "bg-warning-light text-warning border-warning/20",
        Icon: Clock,
      };
  }
}

export interface ProfileDocumentsCardProps {
  documents: any[];
  canValidate: boolean;
  onPreview?: (doc: any) => void;
  onValidate?: (documentId: string) => void;
  onReject?: (documentId: string, reason: string) => void;
}

export function ProfileDocumentsCard({
  documents,
  canValidate,
  onPreview,
  onValidate,
  onReject,
}: ProfileDocumentsCardProps) {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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
      <div className="pb-2 pt-3 px-4">
        <div className="text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <FileText className="w-3.5 h-3.5 text-primary" />
            </div>
            Documents
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {validatedCount}/{totalExpected} valides
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full overflow-hidden bg-muted mt-1.5">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              progressPercent === 100
                ? "bg-success"
                : progressPercent >= 60
                  ? "bg-primary"
                  : "bg-warning",
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="p-3 pt-1">
        {documents.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-xs">Aucun document soumis</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {documents.map((doc) => {
              const config = DOCUMENT_CONFIGS[doc.documentType] ?? {
                label: doc.label || doc.documentType || "Document",
                icon: FileText,
              };
              const status = getStatusConfig(doc.status);
              const Icon = config.icon;
              const StatusIcon = status.Icon;
              const isRejecting = rejectingId === doc._id;

              return (
                <div
                  key={doc._id}
                  className="flex flex-col gap-1.5 p-2.5 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-md bg-card flex items-center justify-center shrink-0 border border-border/50">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {config.label}
                      </p>
                      {doc.files?.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {doc.files.length} fichier
                          {doc.files.length > 1 ? "s" : ""}
                        </p>
                      )}
                    </div>

                    <Badge
                      variant="outline"
                      className={cn("text-xs shrink-0", status.className)}
                    >
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>

                    <div className="flex items-center gap-1 shrink-0">
                      {onPreview && doc.files?.[0]?.storageId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onPreview(doc)}
                          title="Apercu"
                        >
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      )}
                      {canValidate && doc.status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:bg-success-light"
                            onClick={() => onValidate?.(doc._id)}
                            title="Valider"
                          >
                            <CheckCircle className="h-3.5 w-3.5 text-success" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:bg-destructive-light"
                            onClick={() =>
                              setRejectingId(isRejecting ? null : doc._id)
                            }
                            title="Rejeter"
                          >
                            <XCircle className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {isRejecting && (
                    <div className="flex gap-2 mt-1">
                      <Textarea
                        placeholder="Motif du rejet..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="text-xs min-h-[48px] h-12 resize-none"
                      />
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-6 text-xs px-2"
                          onClick={() => handleReject(doc._id)}
                          disabled={!rejectReason.trim()}
                        >
                          Rejeter
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs px-2"
                          onClick={() => {
                            setRejectingId(null);
                            setRejectReason("");
                          }}
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
