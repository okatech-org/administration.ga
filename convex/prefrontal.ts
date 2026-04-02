import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { backofficeQuery } from "./lib/customFunctions";
import { calculerScorePondere } from "./lib/types";
import {
  canTransition,
  getValidNextStatuses,
  isTerminalStatus,
  requiresAgentAction,
  REQUEST_STATUS_METADATA,
} from "./lib/requestWorkflow";
import { RequestPriority, type RequestStatus } from "./lib/constants";

// ============================================================================
// CORTEX PRÉFRONTAL — Décisions complexes & scoring pondéré
//
// Responsable de :
// 1. Évaluation multi-critères avec scoring pondéré
// 2. Validation de transitions de workflow (machine à états)
// 3. Priorisation intelligente des demandes
// ============================================================================

/**
 * Évaluer une décision multi-critères avec scoring pondéré.
 * Utilisé pour les validations complexes (profil complet, éligibilité service, etc.)
 */
export const evaluerDecision = internalMutation({
  args: {
    critereData: v.array(
      v.object({
        valeur: v.number(),
        poids: v.number(),
      }),
    ),
    seuil: v.number(),
  },
  handler: async (_ctx, args) => {
    const score = calculerScorePondere(args.critereData);
    return {
      score,
      approuve: score >= args.seuil,
      confiance: Math.min(1, score / args.seuil),
    };
  },
});

/**
 * Valider si une transition de statut est autorisée dans le workflow des demandes.
 * Connecté à la machine à états requestWorkflow.ts.
 */
export const validerTransition = backofficeQuery({
  args: {
    etapeActuelle: v.string(),
    action: v.string(),
  },
  handler: async (_ctx, args) => {
    const from = args.etapeActuelle as RequestStatus;
    const to = args.action as RequestStatus;

    const autorise = canTransition(from, to);
    const transitionsValides = getValidNextStatuses(from);
    const estTerminal = isTerminalStatus(from);
    const needsAgent = requiresAgentAction(to);
    const metadata = REQUEST_STATUS_METADATA[to as RequestStatus];

    return {
      autorise,
      transitionsValides,
      estTerminal,
      needsAgent,
      phase: metadata?.phase ?? "unknown",
    };
  },
});

/**
 * Calculer un score de priorité pour une demande basé sur plusieurs facteurs.
 * Aide les agents à trier les demandes par urgence.
 */
export const calculerPriorite = backofficeQuery({
  args: {
    requestId: v.id("requests"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) return null;

    const now = Date.now();
    const age = now - (request.submittedAt ?? request._creationTime);
    const ageJours = age / (1000 * 60 * 60 * 24);

    // Facteurs de priorité pondérés
    const criteres = [
      {
        // Ancienneté : plus c'est vieux, plus c'est prioritaire
        valeur: Math.min(1, ageJours / 30), // Plafond à 30 jours
        poids: 0.3,
      },
      {
        // Priorité explicite
        valeur:
          request.priority === RequestPriority.Critical ? 1
          : request.priority === RequestPriority.Urgent ? 0.7
          : request.priority === RequestPriority.Normal ? 0.4
          : 0.2,
        poids: 0.4,
      },
      {
        // Demande avec paiement validé → prioritaire
        valeur: request.paymentStatus === "succeeded" ? 1 : 0,
        poids: 0.2,
      },
      {
        // A un rendez-vous programmé → traiter avant
        valeur: request.status === "appointment_scheduled" ? 1 : 0,
        poids: 0.1,
      },
    ];

    const score = calculerScorePondere(criteres);

    return {
      requestId: args.requestId,
      score,
      niveau:
        score >= 0.7 ? "URGENT"
        : score >= 0.4 ? "NORMAL"
        : "BASSE",
      facteurs: {
        ageJours: Math.round(ageJours * 10) / 10,
        prioriteExplicite: request.priority,
        paiementValide: request.paymentStatus === "succeeded",
      },
    };
  },
});
