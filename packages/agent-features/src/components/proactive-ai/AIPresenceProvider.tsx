"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useOrg } from "../../shell/org-provider";
import { useAIPresence } from "./useAIPresence";
import { useAutoApplyToast } from "./useAutoApplyToast";

interface AIPresenceContextValue {
  setFocusedEntity: (entity: {
    entityType?: string;
    entityId?: string;
    focusedField?: string;
  }) => void;
}

const AIPresenceContext = createContext<AIPresenceContextValue | null>(null);

/**
 * Monte le heartbeat IA et l'observateur d'auto-apply. Les composants enfants
 * peuvent appeler useAIPresenceContext().setFocusedEntity pour informer le
 * backend qu'ils regardent une entite specifique (→ context pour le dispatcher).
 */
export function AIPresenceProvider({ children }: { children: ReactNode }) {
  const { activeOrgId } = useOrg();
  const { setFocusedEntity } = useAIPresence(activeOrgId ?? undefined);
  useAutoApplyToast(activeOrgId ?? undefined);

  return (
    <AIPresenceContext.Provider value={{ setFocusedEntity }}>
      {children}
    </AIPresenceContext.Provider>
  );
}

export function useAIPresenceContext(): AIPresenceContextValue {
  const ctx = useContext(AIPresenceContext);
  if (!ctx) {
    return { setFocusedEntity: () => {} };
  }
  return ctx;
}
