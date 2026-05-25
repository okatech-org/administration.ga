/**
 * Hook React — assignment PNPE du user connecte.
 *
 * Retourne :
 *   - `assignment` : la fiche pnpeStaffAssignments (role, modules, etc.)
 *   - `modules` : la liste des PnpeModuleClient autorises (filtree)
 *   - `isLoading` : true tant que la query n'est pas resolue
 *   - `hasFallback` : true si l'utilisateur n'a pas d'assignment et qu'on
 *     applique le mode "tout afficher" (admin / superadmin / DG).
 */
"use client";

import { useQuery } from "convex/react";
import { useMemo } from "react";
import { api } from "@convex/_generated/api";
import {
  PNPE_MODULES_CLIENT,
  type PnpeModuleClient,
} from "./pnpe-modules-catalog";

export type MyPnpeAssignment = {
  _id: string;
  pnpeRole: string;
  antenneId?: string;
  modules: string[];
  fonctionAffichee: string;
  nom: string;
  prenoms: string;
};

export function useMyPnpeAssignment(): {
  assignment: MyPnpeAssignment | null | undefined;
  modules: PnpeModuleClient[];
  isLoading: boolean;
  hasFallback: boolean;
} {
  // @ts-expect-error api.pnpe type apres codegen
  const assignment = useQuery(
    // @ts-expect-error
    api.pnpe?.pnpeStaffAssignments?.getMyAssignment,
  ) as MyPnpeAssignment | null | undefined;

  const isLoading = assignment === undefined;
  const hasFallback = assignment === null; // pas d'assignment -> mode admin

  const modules = useMemo<PnpeModuleClient[]>(() => {
    if (isLoading) return [];
    if (hasFallback) {
      // Pas d'assignment : afficher tous les modules (defaut admin/DG)
      return Object.values(PNPE_MODULES_CLIENT);
    }
    const codes = assignment?.modules ?? [];
    return codes
      .map((c) => PNPE_MODULES_CLIENT[c])
      .filter((m): m is PnpeModuleClient => Boolean(m));
  }, [assignment, isLoading, hasFallback]);

  return { assignment, modules, isLoading, hasFallback };
}
