"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "@workspace/routing";
import {
  useConvexMutationQuery,
  useAuthenticatedConvexQuery,
} from "@workspace/api/hooks";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Envoie un heartbeat IA au backend avec la route courante + entite focus.
 * Different de useAgentPresence (statut en ligne/occupe/appel) : c'est le
 * contexte UI qui permet a l'assistant de pousser des suggestions pertinentes.
 *
 * - Route capture automatiquement via Next.js router.
 * - Entite focus fournie via setFocusedEntity (expose par useAIPresenceContext).
 */
export function useAIPresence(orgId: Id<"orgs"> | undefined) {
  const heartbeat = useConvexMutationQuery(api.ai.contextStore.heartbeat);
  const clear = useConvexMutationQuery(api.ai.contextStore.clearMyPresence);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const focusRef = useRef<{
    entityType?: string;
    entityId?: string;
    focusedField?: string;
  }>({});

  useEffect(() => {
    if (!orgId) return;
    const route = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;

    const send = () => {
      heartbeat.mutate({
        orgId,
        route,
        entityType: focusRef.current.entityType,
        entityId: focusRef.current.entityId,
        focusedField: focusRef.current.focusedField,
        clientType: "agent-web",
      });
    };

    send();
    const interval = setInterval(send, HEARTBEAT_INTERVAL_MS);

    const handleUnload = () => {
      clear.mutate({ orgId });
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [orgId, pathname, searchParams?.toString()]);

  return {
    setFocusedEntity: (entity: {
      entityType?: string;
      entityId?: string;
      focusedField?: string;
    }) => {
      focusRef.current = entity;
    },
  };
}

/** Query : suggestions actives pour une cible precise. */
export function useProactiveAISuggestions(
  orgId: Id<"orgs"> | undefined,
  targetType: string,
  targetId: string | undefined,
) {
  return useAuthenticatedConvexQuery(
    api.ai.suggestions.getActiveForTarget,
    orgId && targetId ? { orgId, targetType, targetId } : "skip",
  );
}

/** Query : dernieres suggestions auto-appliquees (pour toasts "Annuler"). */
export function useRecentAutoApplied(
  orgId: Id<"orgs"> | undefined,
  sinceTimestamp: number,
) {
  return useAuthenticatedConvexQuery(
    api.ai.suggestions.getRecentAutoApplied,
    orgId ? { orgId, sinceTimestamp } : "skip",
  );
}
