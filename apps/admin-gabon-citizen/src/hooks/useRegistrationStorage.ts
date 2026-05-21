/**
 * useRegistrationStorage Hook
 * Manages local persistence for the registration form:
 * - sessionStorage for form field data (saved per-step on "Next" click)
 * - IndexedDB for binary file blobs (documents)
 *
 * Files survive page refreshes — uploads are only sent to Convex at final
 * submission, preventing orphaned storage objects.
 *
 * Records are partitioned by `ownerKey` (typically a guest session ID or
 * the user's email). The legacy schema named this column `email`; the
 * IndexedDB keyPath is preserved for backward compatibility.
 */

import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================================
// IndexedDB Constants & Helpers
// ============================================================================

const DB_NAME = "consulat_registration";
const DB_VERSION = 1;
const FILE_STORE = "files";
const LS_PREFIX = "reg_draft_";

interface StoredFile {
  /** Partition key — guest session ID or email. Schema name kept for IDB compat. */
  email: string;
  docType: string;
  filename: string;
  mimeType: string;
  size: number;
  blob: Blob;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(FILE_STORE)) {
        const store = db.createObjectStore(FILE_STORE, {
          keyPath: ["email", "docType"],
        });
        store.createIndex("by_email", "email", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// Hook
// ============================================================================

export interface LocalFileInfo {
  filename: string;
  mimeType: string;
  size: number;
  /** Object URL for preview – revoked on cleanup */
  previewUrl?: string;
}

export function useRegistrationStorage(ownerKey: string | undefined) {
  const dbRef = useRef<IDBDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  // Track object URLs for cleanup
  const objectUrlsRef = useRef<string[]>([]);

  // Initialize IndexedDB
  useEffect(() => {
    let cancelled = false;
    openDB()
      .then((db) => {
        if (!cancelled) {
          dbRef.current = db;
          setIsReady(true);
        }
      })
      .catch((err) => {
        console.error("Failed to open IndexedDB:", err);
      });

    return () => {
      cancelled = true;
      // Revoke all object URLs on unmount
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // ========================================================================
  // Form Data (sessionStorage)
  // ========================================================================

  /** Save form data for a specific step */
  const saveStepData = useCallback(
    (step: number, data: Record<string, unknown>) => {
      if (!ownerKey) return;
      const key = `${LS_PREFIX}${ownerKey}`;

      try {
        const existing = sessionStorage.getItem(key);
        const allData = existing ? JSON.parse(existing) : {};
        allData[`step_${step}`] = data;
        allData._lastStep = step;
        allData._updatedAt = Date.now();
        sessionStorage.setItem(key, JSON.stringify(allData));
        setLastSavedAt(new Date());
      } catch (err) {
        console.error("Failed to save step data:", err);
      }
    },
    [ownerKey],
  );

  /** Save a snapshot of the current form data (for auto-save on blur) */
  const saveFormSnapshot = useCallback(
    (step: number, data: Record<string, unknown>) => {
      if (!ownerKey) return;
      const key = `${LS_PREFIX}${ownerKey}`;

      try {
        const existing = sessionStorage.getItem(key);
        const allData = existing ? JSON.parse(existing) : {};
        allData[`step_${step}`] = data;
        allData._updatedAt = Date.now();
        sessionStorage.setItem(key, JSON.stringify(allData));
        setLastSavedAt(new Date());
      } catch (err) {
        console.error("Failed to save form snapshot:", err);
      }
    },
    [ownerKey],
  );

  /** Get all stored form data */
  const getStoredData = useCallback((): {
    steps: Record<string, Record<string, unknown>>;
    lastStep: number;
  } | null => {
    if (!ownerKey) return null;
    const key = `${LS_PREFIX}${ownerKey}`;

    try {
      const stored = sessionStorage.getItem(key);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      const steps: Record<string, Record<string, unknown>> = {};

      for (const [k, v] of Object.entries(parsed)) {
        if (k.startsWith("step_")) {
          steps[k] = v as Record<string, unknown>;
        }
      }

      return {
        steps,
        lastStep: parsed._lastStep || 0,
      };
    } catch {
      return null;
    }
  }, [ownerKey]);

  // ========================================================================
  // File Storage (IndexedDB)
  // ========================================================================

  /** Save a file blob to IndexedDB */
  const saveFile = useCallback(
    async (docType: string, file: File): Promise<void> => {
      if (!ownerKey || !dbRef.current) return;

      return new Promise((resolve, reject) => {
        const tx = dbRef.current!.transaction(FILE_STORE, "readwrite");
        const store = tx.objectStore(FILE_STORE);

        const record: StoredFile = {
          email: ownerKey,
          docType,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          blob: file,
        };

        const request = store.put(record);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    },
    [ownerKey],
  );

  /** Get a stored file from IndexedDB */
  const getFile = useCallback(
    async (
      docType: string,
    ): Promise<(LocalFileInfo & { blob: Blob }) | null> => {
      if (!ownerKey || !dbRef.current) return null;

      return new Promise((resolve, reject) => {
        const tx = dbRef.current!.transaction(FILE_STORE, "readonly");
        const store = tx.objectStore(FILE_STORE);
        const request = store.get([ownerKey, docType]);

        request.onsuccess = () => {
          const result = request.result as StoredFile | undefined;
          if (!result) {
            resolve(null);
            return;
          }

          const previewUrl = URL.createObjectURL(result.blob);
          objectUrlsRef.current.push(previewUrl);

          resolve({
            filename: result.filename,
            mimeType: result.mimeType,
            size: result.size,
            previewUrl,
            blob: result.blob,
          });
        };

        request.onerror = () => reject(request.error);
      });
    },
    [ownerKey],
  );

  /** Get all stored files for this owner key */
  const getAllFiles = useCallback(async (): Promise<
    Map<string, LocalFileInfo & { blob: Blob }>
  > => {
    if (!ownerKey || !dbRef.current) return new Map();

    return new Promise((resolve, reject) => {
      const tx = dbRef.current!.transaction(FILE_STORE, "readonly");
      const store = tx.objectStore(FILE_STORE);
      const index = store.index("by_email");
      const request = index.getAll(ownerKey);

      request.onsuccess = () => {
        const results = request.result as StoredFile[];
        const map = new Map<string, LocalFileInfo & { blob: Blob }>();

        for (const r of results) {
          const previewUrl = URL.createObjectURL(r.blob);
          objectUrlsRef.current.push(previewUrl);

          map.set(r.docType, {
            filename: r.filename,
            mimeType: r.mimeType,
            size: r.size,
            previewUrl,
            blob: r.blob,
          });
        }

        resolve(map);
      };

      request.onerror = () => reject(request.error);
    });
  }, [ownerKey]);

  /** Remove a file from IndexedDB */
  const removeFile = useCallback(
    async (docType: string): Promise<void> => {
      if (!ownerKey || !dbRef.current) return;

      return new Promise((resolve, reject) => {
        const tx = dbRef.current!.transaction(FILE_STORE, "readwrite");
        const store = tx.objectStore(FILE_STORE);
        const request = store.delete([ownerKey, docType]);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    },
    [ownerKey],
  );

  // ========================================================================
  // Cleanup
  // ========================================================================

  /** Clear all registration data (sessionStorage + IndexedDB) */
  const clearRegistration = useCallback(async () => {
    if (!ownerKey) return;

    // Clear sessionStorage
    sessionStorage.removeItem(`${LS_PREFIX}${ownerKey}`);

    // Clear IndexedDB files for this owner key
    if (dbRef.current) {
      try {
        const tx = dbRef.current.transaction(FILE_STORE, "readwrite");
        const store = tx.objectStore(FILE_STORE);
        const index = store.index("by_email");
        const request = index.getAllKeys(ownerKey);

        request.onsuccess = () => {
          const keys = request.result;
          for (const key of keys) {
            store.delete(key);
          }
        };
      } catch (err) {
        console.error("Failed to clear IndexedDB:", err);
      }
    }

    // Revoke all preview URLs
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
  }, [ownerKey]);

  // ========================================================================
  // Utility: Convert file to base64 (for AI scan)
  // ========================================================================

  /** Convert a stored file to base64 string (for sending to AI extraction) */
  const fileToBase64 = useCallback(
    async (
      docType: string,
    ): Promise<{ base64: string; mimeType: string } | null> => {
      const stored = await getFile(docType);
      if (!stored) return null;

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          // Remove the "data:type;base64," prefix
          const base64 = dataUrl.split(",")[1];
          resolve({ base64, mimeType: stored.mimeType });
        };
        reader.readAsDataURL(stored.blob);
      });
    },
    [getFile],
  );

  return {
    isReady,
    lastSavedAt,
    // Form data
    saveStepData,
    saveFormSnapshot,
    getStoredData,
    // File storage
    saveFile,
    getFile,
    getAllFiles,
    removeFile,
    // AI scan helper
    fileToBase64,
    // Cleanup
    clearRegistration,
  };
}

export type RegistrationStorage = ReturnType<typeof useRegistrationStorage>;
