"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useConvexMutationQuery } from "@workspace/api/hooks";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useRecentAutoApplied } from "./useAIPresence";

/**
 * Observe les suggestions auto-appliquees depuis le montage et affiche un
 * toast « L'IA a fait X — Annuler ». Chaque toast est affiche une seule fois.
 */
export function useAutoApplyToast(orgId: Id<"orgs"> | undefined) {
  const mountedAtRef = useRef<number>(Date.now());
  const seenRef = useRef<Set<string>>(new Set());
  const undoMutation = useConvexMutationQuery(api.ai.suggestions.markUndone);
  const recent = useRecentAutoApplied(orgId, mountedAtRef.current);

  useEffect(() => {
    if (!recent.data) return;

    for (const suggestion of recent.data) {
      if (seenRef.current.has(suggestion._id)) continue;
      seenRef.current.add(suggestion._id);

      toast(`L'IA a fait : ${suggestion.title}`, {
        description: suggestion.body.slice(0, 120),
        duration: 8000,
        action: {
          label: "Annuler",
          onClick: () => {
            undoMutation.mutate({
              suggestionId: suggestion._id as Id<"aiSuggestions">,
            });
          },
        },
      });
    }
  }, [recent.data?.length]);
}
