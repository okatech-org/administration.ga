"use client";

/**
 * SettingsFormContext — Coordination transversale entre sections d'un formulaire paramétrage.
 *
 * Responsabilités :
 *   - Registre de `flush()` par section : chaque section s'inscrit au mount via
 *     `useRegisterSection()` et le provider expose `flushAll()` qui itère.
 *   - État "dirty" global agrégé à partir des notifications de chaque section.
 *   - Statut agrégé (saving / saved / error / idle) pour indicateurs globaux.
 *   - Mode lecture seule (permissions) propagé à toutes les sections.
 *
 * Utilisation :
 *   <SettingsFormProvider readOnly={!canManage}>
 *     <SettingsTabsLayout ... />
 *     <SettingsUnsavedGuard />
 *   </SettingsFormProvider>
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { FlushEntry, SaveStatus } from "../types";

export interface SettingsFormValue {
  /** Mode lecture seule (désactive les saves). */
  readOnly: boolean;
  /** Inscrit une section au registre. Retourne la fonction de désinscription. */
  registerFlush: (entry: FlushEntry) => () => void;
  /** Force le save de TOUTES les sections pending en parallèle. */
  flushAll: () => Promise<void>;
  /** Retourne true si au moins une section a des modifs non sauvegardées. */
  isDirty: () => boolean;
  /** Set des ids de sections actuellement dirty (pour indicateurs visuels). */
  dirtySections: ReadonlySet<string>;
  /** Notifie le contexte qu'une section a changé son état dirty. */
  notifySectionDirty: (id: string, dirty: boolean) => void;
  /** Statut agrégé : error > saving > saved > idle. */
  aggregateStatus: SaveStatus;
  /** Message d'erreur agrégé (première erreur rencontrée). */
  aggregateErrorMessage: string | undefined;
  /** Notifie le contexte qu'une section a changé son statut de save. */
  notifySectionStatus: (id: string, status: SaveStatus, message?: string) => void;
}

const SettingsFormContext = createContext<SettingsFormValue | null>(null);

export interface SettingsFormProviderProps {
  children: ReactNode;
  /** Si true, désactive tous les saves des sections inscrites. */
  readOnly?: boolean;
}

export function SettingsFormProvider({
  children,
  readOnly = false,
}: SettingsFormProviderProps) {
  const registryRef = useRef<Map<string, FlushEntry>>(new Map());
  const [dirtySections, setDirtySections] = useState<Set<string>>(new Set());
  const statusesRef = useRef<Map<string, { status: SaveStatus; message?: string }>>(
    new Map(),
  );
  const [aggregateStatus, setAggregateStatus] = useState<SaveStatus>("idle");
  const [aggregateErrorMessage, setAggregateErrorMessage] = useState<
    string | undefined
  >();

  const registerFlush = useCallback((entry: FlushEntry) => {
    registryRef.current.set(entry.id, entry);
    return () => {
      registryRef.current.delete(entry.id);
      // Nettoyage dirty et status si la section se démonte
      setDirtySections((prev) => {
        if (!prev.has(entry.id)) return prev;
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
      statusesRef.current.delete(entry.id);
    };
  }, []);

  const flushAll = useCallback(async () => {
    const entries = Array.from(registryRef.current.values());
    // Exécution en parallèle — chaque section a sa propre mutation indépendante.
    // Promise.allSettled pour ne pas avorter si une section échoue.
    await Promise.allSettled(entries.map((e) => e.flush()));
  }, []);

  const isDirty = useCallback(() => {
    for (const entry of registryRef.current.values()) {
      if (entry.isDirty()) return true;
    }
    return false;
  }, []);

  const notifySectionDirty = useCallback((id: string, dirty: boolean) => {
    setDirtySections((prev) => {
      const has = prev.has(id);
      if (dirty === has) return prev;
      const next = new Set(prev);
      if (dirty) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const recomputeAggregate = useCallback(() => {
    let hasError = false;
    let errorMsg: string | undefined;
    let hasSaving = false;
    let hasSaved = false;
    for (const { status, message } of statusesRef.current.values()) {
      if (status === "error") {
        hasError = true;
        if (!errorMsg) errorMsg = message;
      } else if (status === "saving") {
        hasSaving = true;
      } else if (status === "saved") {
        hasSaved = true;
      }
    }
    if (hasError) {
      setAggregateStatus("error");
      setAggregateErrorMessage(errorMsg);
    } else if (hasSaving) {
      setAggregateStatus("saving");
      setAggregateErrorMessage(undefined);
    } else if (hasSaved) {
      setAggregateStatus("saved");
      setAggregateErrorMessage(undefined);
    } else {
      setAggregateStatus("idle");
      setAggregateErrorMessage(undefined);
    }
  }, []);

  const notifySectionStatus = useCallback(
    (id: string, status: SaveStatus, message?: string) => {
      if (status === "idle") {
        statusesRef.current.delete(id);
      } else {
        statusesRef.current.set(id, { status, message });
      }
      recomputeAggregate();
    },
    [recomputeAggregate],
  );

  const value = useMemo<SettingsFormValue>(
    () => ({
      readOnly,
      registerFlush,
      flushAll,
      isDirty,
      dirtySections,
      notifySectionDirty,
      aggregateStatus,
      aggregateErrorMessage,
      notifySectionStatus,
    }),
    [
      readOnly,
      registerFlush,
      flushAll,
      isDirty,
      dirtySections,
      notifySectionDirty,
      aggregateStatus,
      aggregateErrorMessage,
      notifySectionStatus,
    ],
  );

  return (
    <SettingsFormContext.Provider value={value}>
      {children}
    </SettingsFormContext.Provider>
  );
}

/**
 * Hook d'accès au contexte. Retourne null si appelé hors provider
 * (utile pour les sections réutilisables qui peuvent fonctionner seules).
 */
export function useSettingsFormOptional(): SettingsFormValue | null {
  return useContext(SettingsFormContext);
}

/**
 * Hook d'accès au contexte. Lève une erreur si hors provider.
 */
export function useSettingsForm(): SettingsFormValue {
  const ctx = useContext(SettingsFormContext);
  if (!ctx) {
    throw new Error(
      "useSettingsForm doit être utilisé à l'intérieur d'un <SettingsFormProvider>",
    );
  }
  return ctx;
}
