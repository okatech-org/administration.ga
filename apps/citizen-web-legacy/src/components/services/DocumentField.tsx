"use client";

import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DocumentList } from "@/components/common/document-list";
import { FileUploader } from "@/components/common/file-uploader";
import { cn } from "@/lib/utils";

interface DocumentFieldProps {
  fieldId: string;
  label: string;
  description?: string;
  required?: boolean;
  documentIds: string[];
  docType: string;
  category?: string;
  onUpload: (documentId: string) => void;
  onRemove: (documentId: string) => void;
  isInvalid?: boolean;
}

/**
 * Reusable document field for dynamic forms.
 * Combines FileUploader + DocumentList for complete document management.
 */
export function DocumentField({
  label,
  description,
  required,
  documentIds,
  docType,
  category,
  onUpload,
  onRemove,
  isInvalid,
}: DocumentFieldProps) {
  const { t } = useTranslation();
  const hasDocuments = documentIds.length > 0;

  return (
    <div className="space-y-3">
      {/* Header with label and check icon */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </span>
        {hasDocuments && <Check className="h-4 w-4 text-green-500 shrink-0" />}
      </div>

      {/* Description */}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      {/* Upload zone with visual indicator for required empty fields */}
      <div
        className={cn(
          isInvalid && !hasDocuments && "border-l-4 border-l-destructive pl-3",
        )}
      >
        <FileUploader
          docType={docType}
          category={category}
          onUploadComplete={async (documentId) => {
            onUpload(documentId);
          }}
          label={t("form.upload_hint")}
        />

        {/* Document list */}
        {hasDocuments && (
          <DocumentList
            documentIds={documentIds}
            docType={docType}
            onRemove={async (documentId) => {
              onRemove(documentId);
            }}
          />
        )}
      </div>
    </div>
  );
}
