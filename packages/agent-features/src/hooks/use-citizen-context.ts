"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";

/**
 * Hook d'hydratation du panneau contexte citoyen (drawer du centre d'appels).
 *
 * Passer `null` ou `undefined` comme `meetingId` désactive la requête
 * (utile quand aucun slot n'est focalisé).
 */
export function useCitizenContext(meetingId: Id<"meetings"> | null | undefined) {
  const { data, isPending } = useAuthenticatedConvexQuery(
    api.functions.citizenContext.getCitizenContextForCall,
    meetingId ? { meetingId } : "skip",
  );

  return {
    context: data ?? null,
    isPending,
  };
}
