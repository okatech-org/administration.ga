"use client";

/**
 * useRegisterSection — Inscrit automatiquement une section au contexte.
 *
 * À utiliser juste après `useDebouncedSave` dans chaque section :
 *
 *   const { trigger, flush, hasPending, status } = useDebouncedSave({ ... });
 *   useRegisterSection("identity", { flush, hasPending, status });
 *
 * Le hook :
 *   - Inscrit `flush` + `isDirty` dans le registre du provider (pour flushAll).
 *   - Propage le statut de save vers le contexte (pour l'agrégat global).
 *   - Désinscrit automatiquement au démontage.
 *   - Fonctionne hors provider (no-op) pour les sections standalone.
 */

import { useEffect } from "react";
import { useSettingsFormOptional } from "../context/settings-form-context";
import type { SaveStatus } from "../types";

export interface UseRegisterSectionArgs {
  flush: () => Promise<void>;
  hasPending: () => boolean;
  status: SaveStatus;
  errorMessage?: string;
}

export function useRegisterSection(
  id: string,
  { flush, hasPending, status, errorMessage }: UseRegisterSectionArgs,
) {
  const ctx = useSettingsFormOptional();

  // Enregistrement au montage, désenregistrement au démontage.
  // On utilise une déps vide pour ne s'inscrire qu'une fois — les fonctions
  // `flush` et `hasPending` sont stables (wrappées dans useCallback).
  useEffect(() => {
    if (!ctx) return;
    return ctx.registerFlush({ id, flush, isDirty: hasPending });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, id]);

  // Propagation du statut au contexte à chaque changement.
  useEffect(() => {
    if (!ctx) return;
    ctx.notifySectionStatus(id, status, errorMessage);
  }, [ctx, id, status, errorMessage]);
}
