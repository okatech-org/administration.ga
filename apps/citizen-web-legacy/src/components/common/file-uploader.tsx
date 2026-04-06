import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useConvexMutationQuery } from "@/integrations/convex/hooks";
import { api } from "@convex/_generated/api";
import { UploadCloud, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";
import {
  DetailedDocumentType,
  DocumentTypeCategory,
} from "@convex/lib/constants";

interface FileUploaderProps {
  onUploadComplete: (documentId: string) => Promise<void>;
  onUploadError?: (error: Error) => void;
  label?: string;
  accept?: Record<string, string[]>;
  maxSize?: number;
  docType: string;
  category?: string;
}

export function FileUploader({
  onUploadComplete,
  onUploadError,
  label = "Glissez vos fichiers ici ou cliquez pour parcourir",
  accept = {
    "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    "application/pdf": [".pdf"],
  },
  maxSize = 5 * 1024 * 1024,
  docType,
  category,
}: FileUploaderProps) {
  const { mutateAsync: generateUploadUrl } = useConvexMutationQuery(
    api.functions.documents.generateUploadUrl,
  );
  const { mutateAsync: createDocument } = useConvexMutationQuery(
    api.functions.documents.create,
  );

  const [uploadingFiles, setUploadingFiles] = useState<
    { name: string; progress: number }[]
  >([]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      for (const file of acceptedFiles) {
        setUploadingFiles((prev) => [
          ...prev,
          { name: file.name, progress: 0 },
        ]);

        try {
          const postUrl = await generateUploadUrl({});

          const result = await fetch(postUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });

          if (!result.ok)
            throw new Error(`Upload failed: ${result.statusText}`);
          const { storageId } = await result.json();

          // Create document - owned by current user automatically
          const documentId = await createDocument({
            storageId: storageId as Id<"_storage">,
            filename: file.name,
            sizeBytes: file.size,
            mimeType: file.type,
            documentType: docType as DetailedDocumentType | undefined,
            category: category as DocumentTypeCategory | undefined,
          });

          await onUploadComplete(documentId);

          setUploadingFiles((prev) => prev.filter((f) => f.name !== file.name));
          toast.success(`Fichier ${file.name} ajouté`);
        } catch (error: any) {
          console.error(error);
          setUploadingFiles((prev) => prev.filter((f) => f.name !== file.name));
          toast.error(`Erreur: ${error.message}`);
          onUploadError?.(error);
        }
      }
    },
    [
      generateUploadUrl,
      createDocument,
      docType,
      category,
      onUploadComplete,
      onUploadError,
    ],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors hover:bg-muted/50",
          isDragActive ?
            "border-primary bg-primary/5"
          : "border-muted-foreground/25",
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <div className="p-3 bg-muted rounded-full">
            <UploadCloud className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">
            PDF, PNG, JPG jusqu'à {maxSize / 1024 / 1024}MB
          </div>
        </div>
      </div>

      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-2 border rounded-md bg-muted/20"
            >
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm flex-1 truncate">{file.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
