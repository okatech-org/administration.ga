/**
 * Vérification du NIF (Numéro d'Identification Fiscal) auprès de la DGI.
 *
 * MVP Phase 7 : stub qui mock la réponse selon flag `PNPE_MOCK_INTEGRATIONS`.
 * En production, branchera l'API DGI réelle (HTTP fetch direct, Convex
 * action côté Node).
 */
"use node";

import { v } from "convex/values";
import { action } from "../../_generated/server";

export const verifyNif = action({
  args: {
    nif: v.string(),
  },
  handler: async (_ctx, args) => {
    const mock = process.env.PNPE_MOCK_INTEGRATIONS === "1";
    if (mock) {
      // Mock dev : NIF de 8 chiffres ou plus = valide
      const valid = /^\d{8,}$/.test(args.nif);
      return {
        verified: valid,
        source: "mock",
        message: valid
          ? "NIF valide (mode mock)."
          : "NIF invalide (format attendu : 8+ chiffres en mode mock).",
        timestamp: Date.now(),
      };
    }

    // TODO Production : appel HTTP réel vers l'API DGI.
    // const base = process.env.DGI_API_BASE;
    // const key = process.env.DGI_API_KEY;
    // const res = await fetch(`${base}/verify-nif/${args.nif}`, {
    //   headers: { Authorization: `Bearer ${key}` },
    // });
    // const data = await res.json();
    // return { verified: data.status === "OK", ... };

    return {
      verified: false,
      source: "not_configured",
      message: "API DGI non configurée. Activer PNPE_MOCK_INTEGRATIONS=1 en dev.",
      timestamp: Date.now(),
    };
  },
});
