import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { SaveStatus } from "../types";

/**
 * useDebouncedSave — Hook utilitaire pour auto-save debounced par section.
 *
 * Usage :
 *   const { trigger, flush, hasPending, status } = useDebouncedSave({
 *     onSave: async (val) => await mutateAsync(val),
 *     onStatusChange,
 *     onDirtyChange, // optionnel : notifier le contexte
 *     readOnly,      // optionnel : si true, trigger() est no-op
 *     debounceMs: 1000,
 *     savedLingerMs: 3000,
 *   });
 *
 *   // dans un input :
 *   onChange={(v) => { setLocal(v); trigger(v); }}
 *
 * Garanties :
 *   - Un seul appel réseau en vol à la fois (cancellation via séquence).
 *   - Statut propagé au parent via onStatusChange.
 *   - Reset automatique à "idle" après savedLingerMs après "saved".
 *   - Cleanup unmount : flush fire-and-forget des modifs pending (évite la perte).
 *   - Toast sonner automatique sur erreur (désactivable via showErrorToast).
 *   - onDirtyChange notifie le contexte à chaque entrée/sortie de l'état "pending".
 */
export interface UseDebouncedSaveOptions<TValue> {
  onSave: (value: TValue) => Promise<unknown>;
  onStatusChange?: (status: SaveStatus, errorMessage?: string) => void;
  /** Notifie le contexte à chaque changement de l'état "a-t-il une valeur pending ?" */
  onDirtyChange?: (dirty: boolean) => void;
  /** Si true, trigger() et flush() sont no-op (mode lecture seule). */
  readOnly?: boolean;
  /** Afficher un toast sonner rouge sur erreur (défaut: true). */
  showErrorToast?: boolean;
  /** Libellé du toast d'erreur (défaut: "Erreur d'enregistrement"). */
  errorToastTitle?: string;
  /** Délai avant déclenchement (défaut 1000ms). */
  debounceMs?: number;
  /** Temps avant retour à idle après succès (défaut 3000ms). */
  savedLingerMs?: number;
}

export interface UseDebouncedSaveResult<TValue> {
  /** Trigger un save debounced avec la valeur donnée. */
  trigger: (value: TValue) => void;
  /** Force un save immédiat de la valeur pending (si elle existe). */
  flush: () => Promise<void>;
  /** Retourne true si une valeur est en attente de save. */
  hasPending: () => boolean;
  /** Statut courant de la sauvegarde. */
  status: SaveStatus;
  /** Message d'erreur si status === "error". */
  errorMessage: string | undefined;
}

export function useDebouncedSave<TValue>({
  onSave,
  onStatusChange,
  onDirtyChange,
  readOnly = false,
  showErrorToast = true,
  errorToastTitle = "Erreur d'enregistrement",
  debounceMs = 1000,
  savedLingerMs = 3000,
}: UseDebouncedSaveOptions<TValue>): UseDebouncedSaveResult<TValue> {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingValueRef = useRef<TValue | null>(null);
  const sequenceRef = useRef(0);
  const dirtyNotifiedRef = useRef(false);

  // Refs pour éviter les closures stales dans les callbacks
  const onSaveRef = useRef(onSave);
  const onStatusChangeRef = useRef(onStatusChange);
  const onDirtyChangeRef = useRef(onDirtyChange);
  const readOnlyRef = useRef(readOnly);
  const showErrorToastRef = useRef(showErrorToast);
  const errorToastTitleRef = useRef(errorToastTitle);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);
  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange;
  }, [onDirtyChange]);
  useEffect(() => {
    readOnlyRef.current = readOnly;
  }, [readOnly]);
  useEffect(() => {
    showErrorToastRef.current = showErrorToast;
  }, [showErrorToast]);
  useEffect(() => {
    errorToastTitleRef.current = errorToastTitle;
  }, [errorToastTitle]);

  const emit = useCallback((next: SaveStatus, message?: string) => {
    setStatus(next);
    setErrorMessage(message);
    onStatusChangeRef.current?.(next, message);
  }, []);

  const notifyDirty = useCallback((dirty: boolean) => {
    if (dirtyNotifiedRef.current === dirty) return;
    dirtyNotifiedRef.current = dirty;
    onDirtyChangeRef.current?.(dirty);
  }, []);

  const performSave = useCallback(
    async (value: TValue) => {
      const seq = ++sequenceRef.current;
      emit("saving");
      try {
        await onSaveRef.current(value);
        // Si une sauvegarde plus récente est en vol, on ignore le résultat
        if (seq !== sequenceRef.current) return;
        notifyDirty(false);
        emit("saved");
        setTimeout(() => {
          if (seq === sequenceRef.current) emit("idle");
        }, savedLingerMs);
      } catch (err) {
        if (seq !== sequenceRef.current) return;
        const msg = err instanceof Error ? err.message : "Erreur inconnue";
        emit("error", msg);
        if (showErrorToastRef.current) {
          toast.error(errorToastTitleRef.current, {
            description: msg,
            duration: 8000,
          });
        }
      }
    },
    [emit, notifyDirty, savedLingerMs],
  );

  const trigger = useCallback(
    (value: TValue) => {
      if (readOnlyRef.current) return; // mode lecture seule : ignore
      pendingValueRef.current = value;
      notifyDirty(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        const val = pendingValueRef.current;
        if (val !== null) {
          pendingValueRef.current = null;
          void performSave(val as TValue);
        }
      }, debounceMs);
    },
    [debounceMs, notifyDirty, performSave],
  );

  const flush = useCallback(async () => {
    if (readOnlyRef.current) return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (pendingValueRef.current !== null) {
      const val = pendingValueRef.current;
      pendingValueRef.current = null;
      await performSave(val as TValue);
    }
  }, [performSave]);

  const hasPending = useCallback(() => {
    return pendingValueRef.current !== null || timeoutRef.current !== null;
  }, []);

  // Cleanup unmount — flush fire-and-forget pour éviter la perte de données
  // lorsque la section est démontée (changement d'onglet, navigation...).
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (pendingValueRef.current !== null) {
        const val = pendingValueRef.current;
        pendingValueRef.current = null;
        // Fire-and-forget : la mutation Convex peut continuer après unmount
        // (la sequenceRef empêche les races si le composant se remount).
        void performSave(val as TValue);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { trigger, flush, hasPending, status, errorMessage };
}
