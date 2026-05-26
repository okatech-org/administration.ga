/**
 * Intégration Ediandza — inscription d'un D.E sur une session de formation BMC.
 *
 * Ediandza (ediandza.ga) est le partenaire formation professionnelle du PNPE.
 * Le parcours Auto-Emploi inclut une formation Business Model Canvas (BMC)
 * proposée soit en présentiel (en agence PNPE) soit en ligne via Ediandza.
 *
 * Flux :
 *   1. Le D.E (ou son conseiller) déclenche `enrollDemandeurInBmcSession`
 *      depuis la page `/auto-emploi/formation`.
 *   2. L'action POSTe sur l'API Ediandza pour créer un parcours.
 *   3. Au retour, l'action persiste l'ID du parcours dans le programme
 *      `programmesAutoEmploi.ediandzaParcoursId` via `setEdiandzaParcoursId`.
 *   4. Ediandza notifie ensuite les changements de statut (INSCRIT →
 *      EN_COURS → TERMINE | ABANDON) via le webhook
 *      `/integrations/ediandza/webhook` (cf. `convex/http.ts`).
 *
 * MVP Phase 7.6 : pas d'API Ediandza publique disponible. Mode mock activé
 * via `PNPE_MOCK_INTEGRATIONS=1` génère un parcoursId déterministe et
 * persiste le programme comme si l'inscription avait abouti.
 */
"use node";

import { v } from "convex/values";
import { action } from "../../_generated/server";
import { internal } from "../../_generated/api";

type EnrollResult =
  | {
      enrolled: true;
      ediandzaParcoursId: string;
      source: "mock" | "ediandza_api";
      redirectUrl?: string;
      message: string;
    }
  | {
      enrolled: false;
      source: "mock" | "ediandza_api" | "not_configured";
      message: string;
    };

export const enrollDemandeurInBmcSession = action({
  args: {
    programmeId: v.id("programmesAutoEmploi"),
    /** Identifiant de la session BMC côté Ediandza (catalogue). */
    sessionId: v.string(),
    /** Libellé de session pour traçabilité. */
    sessionTitre: v.optional(v.string()),
    dateDebut: v.number(),
    dateFin: v.number(),
  },
  handler: async (ctx, args): Promise<EnrollResult> => {
    const mock = process.env.PNPE_MOCK_INTEGRATIONS === "1";

    if (mock) {
      // Mock dev : parcoursId déterministe pour faciliter les tests
      const parcoursId = `EDIANDZA-MOCK-${args.programmeId.slice(-8)}-${args.sessionId}`;
      await ctx.runMutation(
        (internal as any).functions.pnpe.autoEmploi.setEdiandzaParcoursId,
        {
          programmeId: args.programmeId,
          ediandzaParcoursId: parcoursId,
          formationBMC: {
            sessionId: args.sessionId,
            dateDebut: args.dateDebut,
            dateFin: args.dateFin,
            statutSuivi: "INSCRIT" as const,
          },
        },
      );
      return {
        enrolled: true,
        ediandzaParcoursId: parcoursId,
        source: "mock",
        redirectUrl: `https://ediandza.ga/parcours/${parcoursId}?mock=1`,
        message: `Inscription Ediandza simulée (session ${args.sessionTitre ?? args.sessionId}).`,
      };
    }

    const apiBase = process.env.EDIANDZA_API_BASE;
    const apiKey = process.env.EDIANDZA_API_KEY;
    const partnerId = process.env.EDIANDZA_PARTNER_ID;

    if (!apiBase || !apiKey || !partnerId) {
      return {
        enrolled: false,
        source: "not_configured",
        message:
          "API Ediandza non configurée. Définir EDIANDZA_API_BASE/EDIANDZA_API_KEY/EDIANDZA_PARTNER_ID ou activer PNPE_MOCK_INTEGRATIONS=1.",
      };
    }

    try {
      // TODO Production : adapter le contrat à l'API officielle Ediandza.
      // Le format ci-dessous est une supposition raisonnable basée sur les
      // standards REST courants — à valider à la signature du protocole.
      const res = await fetch(`${apiBase}/v1/parcours/enroll`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "X-Partner-Id": partnerId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          externalReference: args.programmeId,
          sessionId: args.sessionId,
          dateDebut: args.dateDebut,
          dateFin: args.dateFin,
        }),
      });

      if (!res.ok) {
        return {
          enrolled: false,
          source: "ediandza_api",
          message: `Inscription Ediandza refusée (HTTP ${res.status}).`,
        };
      }

      const data = (await res.json()) as {
        parcoursId: string;
        redirectUrl?: string;
      };

      await ctx.runMutation(
        (internal as any).functions.pnpe.autoEmploi.setEdiandzaParcoursId,
        {
          programmeId: args.programmeId,
          ediandzaParcoursId: data.parcoursId,
          formationBMC: {
            sessionId: args.sessionId,
            dateDebut: args.dateDebut,
            dateFin: args.dateFin,
            statutSuivi: "INSCRIT" as const,
          },
        },
      );

      return {
        enrolled: true,
        ediandzaParcoursId: data.parcoursId,
        source: "ediandza_api",
        redirectUrl: data.redirectUrl,
        message: "Inscription Ediandza confirmée.",
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "erreur réseau";
      return {
        enrolled: false,
        source: "ediandza_api",
        message: `Inscription Ediandza échouée : ${msg}`,
      };
    }
  },
});
