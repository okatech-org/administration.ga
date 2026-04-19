/**
 * Types partages pour les 12 capability handlers.
 *
 * Extrait dans un fichier a part pour eviter les cycles d'import
 * (proactiveAgent → capability/X → proactiveAgent).
 */

import type { ActionCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";

export interface CapabilityHandlerArgs {
  orgId: Id<"orgs">;
  membershipId: Id<"memberships">;
  userId: Id<"users">;
  targetType: string;
  targetId?: string;
  model: string;
  sensitivity: "low" | "medium" | "high";
}

export interface CapabilityHandlerResult {
  /** True : suggestion sera creee (ou auto-appliquee) */
  proposed: boolean;
  title?: string;
  body?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  metadata?: unknown;
  proposedActions?: Array<{
    label: string;
    kind:
      | "update_status"
      | "add_comment"
      | "create_document"
      | "update_field"
      | "send_notification"
      | "navigate"
      | "custom";
    mutationPath?: string;
    mutationArgs?: unknown;
    variant?: "primary" | "secondary" | "destructive";
  }>;
  targetRoute?: string;
  /** Stats LLM pour audit */
  model: string;
  tokensIn: number;
  tokensOut: number;
  costMicroCents: number;
  latencyMs: number;
  /** Raison du skip si proposed=false */
  skipReason?: string;
}

export type CapabilityHandler = (
  ctx: ActionCtx,
  args: CapabilityHandlerArgs,
) => Promise<CapabilityHandlerResult>;

/** Resultat standard pour un skip sans appel LLM. */
export function skip(reason: string, model = "none"): CapabilityHandlerResult {
  return {
    proposed: false,
    skipReason: reason,
    model,
    tokensIn: 0,
    tokensOut: 0,
    costMicroCents: 0,
    latencyMs: 0,
  };
}
