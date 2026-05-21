/**
 * useDocumentUpload Hook
 * Manages document uploads to Convex storage
 * Documents are automatically owned by the current user
 */

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  DetailedDocumentType,
  DocumentTypeCategory,
} from "@convex/lib/constants";

interface UploadProgress {
  filename: string;
  progress: number; // 0-100
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

interface UploadResult {
  documentId: Id<"documents">;
  storageId: Id<"_storage">;
  filename: string;
}

interface UseDocumentUploadOptions {
  documentType?: string;
  category?: string;
  label?: string;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: Error, filename: string) => void;
}

export function useDocumentUpload(options: UseDocumentUploadOptions = {}) {
  const { documentType, category, label, onSuccess, onError } = options;

  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(
    new Map(),
  );
  const [isUploading, setIsUploading] = useState(false);

  const generateUploadUrl = useMutation(
    api.functions.documents.generateUploadUrl,
  );
  const createDocument = useMutation(api.functions.documents.create);

  // Update progress for a specific file
  const updateProgress = useCallback(
    (filename: string, update: Partial<UploadProgress>) => {
      setUploads((prev) => {
        const newMap = new Map(prev);
        const current = newMap.get(filename);
        if (current) {
          newMap.set(filename, { ...current, ...update });
        }
        return newMap;
      });
    },
    [],
  );

  // Upload a single file
  const uploadFile = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      const filename = file.name;

      // Initialize progress
      setUploads((prev) => {
        const newMap = new Map(prev);
        newMap.set(filename, {
          filename,
          progress: 0,
          status: "pending",
        });
        return newMap;
      });

      try {
        setIsUploading(true);
        updateProgress(filename, { status: "uploading", progress: 10 });

        // Step 1: Get upload URL
        const uploadUrl = await generateUploadUrl();
        updateProgress(filename, { progress: 30 });

        // Step 2: Upload file to storage
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const { storageId } = await response.json();
        updateProgress(filename, { progress: 70 });

        // Step 3: Create document record (owned by current user)
        const documentId = await createDocument({
          storageId,
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          documentType: documentType as DetailedDocumentType | undefined,
          category: category as DocumentTypeCategory | undefined,
          label,
        });

        updateProgress(filename, { status: "success", progress: 100 });

        const result: UploadResult = {
          documentId,
          storageId,
          filename: file.name,
        };

        onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Upload failed");
        updateProgress(filename, { status: "error", error: error.message });
        onError?.(error, filename);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [
      generateUploadUrl,
      createDocument,
      documentType,
      category,
      label,
      onSuccess,
      onError,
      updateProgress,
    ],
  );

  // Upload multiple files
  const uploadFiles = useCallback(
    async (files: FileList | File[]): Promise<UploadResult[]> => {
      const fileArray = Array.from(files);
      const results: UploadResult[] = [];

      for (const file of fileArray) {
        const result = await uploadFile(file);
        if (result) {
          results.push(result);
        }
      }

      return results;
    },
    [uploadFile],
  );

  // Clear completed uploads
  const clearCompleted = useCallback(() => {
    setUploads((prev) => {
      const newMap = new Map(prev);
      for (const [key, value] of newMap) {
        if (value.status === "success" || value.status === "error") {
          newMap.delete(key);
        }
      }
      return newMap;
    });
  }, []);

  // Reset all uploads
  const reset = useCallback(() => {
    setUploads(new Map());
    setIsUploading(false);
  }, []);

  return {
    uploadFile,
    uploadFiles,
    uploads: Array.from(uploads.values()),
    isUploading,
    clearCompleted,
    reset,
  };
}

export type { UploadProgress, UploadResult, UseDocumentUploadOptions };
