/**
 * Vérification CNSS — attestation de situation sociale.
 *
 * MVP Phase 7 : stub mock. À brancher sur l'API CNSS en production.
 */
"use node";

import { v } from "convex/values";
import { action } from "../../_generated/server";

export const verifyEmployer = action({
  args: {
    nif: v.string(),
  },
  handler: async (_ctx, args) => {
    const mock = process.env.PNPE_MOCK_INTEGRATIONS === "1";
    if (mock) {
      // Mock : NIF se terminant par chiffre pair = à jour
      const lastDigit = parseInt(args.nif.slice(-1), 10);
      const upToDate = !isNaN(lastDigit) && lastDigit % 2 === 0;
      return {
        verified: upToDate,
        source: "mock",
        message: upToDate
          ? "Employeur à jour CNSS (mode mock)."
          : "Cotisations CNSS non à jour (mode mock).",
        timestamp: Date.now(),
      };
    }

    // TODO Production : API CNSS officielle (à confirmer avec le PNPE).
    return {
      verified: false,
      source: "not_configured",
      message: "API CNSS non configurée. Activer PNPE_MOCK_INTEGRATIONS=1 en dev.",
      timestamp: Date.now(),
    };
  },
});
