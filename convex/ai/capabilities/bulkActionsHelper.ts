/**
 * Capability: bulk_actions_helper
 *
 * Stub V1 — l'assistance sur les selections multiples sera branchee via
 * un canal UI dedie qui passera le contexte `{ selectedIds: [...] }`
 * dans metadata. Pour l'instant ce handler est un placeholder enregistre.
 */

"use node";

import type { CapabilityHandler } from "./_types";
import { skip } from "./_types";

export const run: CapabilityHandler = async () => {
  return skip("bulk_actions_helper_stub_v1");
};
