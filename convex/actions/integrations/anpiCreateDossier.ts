/**
 * Intégration ANPI-Gabon — création d'un dossier de formalisation
 * d'activité pour un D.E sortant du parcours Auto-Emploi.
 *
 * L'ANPI (Agence Nationale de Promotion des Investissements) est le guichet
 * unique de formalisation des entreprises au Gabon. Quand un D.E PNPE a
 * validé son business plan (étape VALIDATION du programme Auto-Emploi),
 * cette action transfère le dossier vers ANPI pour immatriculation.
 *
 * Flux :
 *   1. Le conseiller PNPE (ou le D.E lui-même) déclenche
 *      `createFormalisationDossier` depuis `/auto-emploi/financement`.
 *   2. L'action POSTe sur l'API ANPI avec le business plan pré-rempli
 *      (NIP, état civil, projet, secteur, province cible).
 *   3. ANPI retourne un `dossierId` qui est persisté sur le programme.
 *   4. ANPI notifie les changements de statut (REÇU → INSTRUCTION →
 *      VALIDATION → IMMATRICULATION) via le webhook
 *      `/integrations/anpi/webhook` (cf. `convex/http.ts`).
 *   5. À l'IMMATRICULATION effective, le programme passe en étape LANCEMENT
 *      et le `companyId` (table `companies`) est créé.
 *
 * MVP Phase 7.6 : pas d'API ANPI-Gabon publique. Mode mock via
 * `PNPE_MOCK_INTEGRATIONS=1` génère un dossierId déterministe et
 * persiste le programme.
 */
"use node";

import { v } from "convex/values";
import { action } from "../../_generated/server";
import { internal } from "../../_generated/api";

type CreateDossierResult =
  | {
      created: true;
      anpiDossierId: string;
      source: "mock" | "anpi_api";
      trackingUrl?: string;
      message: string;
    }
  | {
      created: false;
      source: "mock" | "anpi_api" | "not_configured";
      message: string;
    };

export const createFormalisationDossier = action({
  args: {
    programmeId: v.id("programmesAutoEmploi"),
    /** Identité du D.E pour pré-remplissage. */
    demandeurNip: v.string(),
    demandeurNom: v.string(),
    demandeurPrenoms: v.string(),
    /** Projet à formaliser. */
    secteurProjet: v.string(),
    descriptionProjet: v.string(),
    provinceProjet: v.optional(v.string()),
    /** ID du PDF du business plan dans `_storage`, fourni à ANPI en pièce jointe. */
    businessPlanStorageId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<CreateDossierResult> => {
    const mock = process.env.PNPE_MOCK_INTEGRATIONS === "1";

    if (mock) {
      const dossierId = `ANPI-MOCK-${args.programmeId.slice(-8)}-${Date.now().toString(36)}`;
      await ctx.runMutation(
        (internal as any).functions.pnpe.autoEmploi.setAnpiDossierId,
        {
          programmeId: args.programmeId,
          anpiDossierId: dossierId,
          // En mock on n'avance PAS automatiquement en LANCEMENT — il faut
          // que le webhook de retour confirme l'immatriculation effective.
          avancerEnLancement: false,
        },
      );
      return {
        created: true,
        anpiDossierId: dossierId,
        source: "mock",
        trackingUrl: `https://anpi-gabon.ga/dossiers/${dossierId}?mock=1`,
        message: `Dossier ANPI simulé pour ${args.demandeurPrenoms} ${args.demandeurNom}.`,
      };
    }

    const apiBase = process.env.ANPI_API_BASE;
    const apiKey = process.env.ANPI_API_KEY;
    const partnerId = process.env.ANPI_GABON_PARTNER_ID;

    if (!apiBase || !apiKey || !partnerId) {
      return {
        created: false,
        source: "not_configured",
        message:
          "API ANPI-Gabon non configurée. Définir ANPI_API_BASE/ANPI_API_KEY/ANPI_GABON_PARTNER_ID ou activer PNPE_MOCK_INTEGRATIONS=1.",
      };
    }

    try {
      // TODO Production : adapter le contrat à l'API officielle ANPI-Gabon.
      const res = await fetch(`${apiBase}/v1/dossiers/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "X-Partner-Id": partnerId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          externalReference: args.programmeId,
          fondateur: {
            nip: args.demandeurNip,
            nom: args.demandeurNom,
            prenoms: args.demandeurPrenoms,
          },
          projet: {
            secteur: args.secteurProjet,
            description: args.descriptionProjet,
            province: args.provinceProjet,
          },
          businessPlanStorageId: args.businessPlanStorageId,
        }),
      });

      if (!res.ok) {
        return {
          created: false,
          source: "anpi_api",
          message: `Création dossier ANPI refusée (HTTP ${res.status}).`,
        };
      }

      const data = (await res.json()) as {
        dossierId: string;
        trackingUrl?: string;
      };

      await ctx.runMutation(
        (internal as any).functions.pnpe.autoEmploi.setAnpiDossierId,
        {
          programmeId: args.programmeId,
          anpiDossierId: data.dossierId,
          avancerEnLancement: false,
        },
      );

      return {
        created: true,
        anpiDossierId: data.dossierId,
        source: "anpi_api",
        trackingUrl: data.trackingUrl,
        message: "Dossier ANPI créé.",
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "erreur réseau";
      return {
        created: false,
        source: "anpi_api",
        message: `Création dossier ANPI échouée : ${msg}`,
      };
    }
  },
});
