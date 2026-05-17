/**
 * iCorrespondance — Configuration réseau (singleton)
 *
 * Une seule ligne globale qui définit les réglages par défaut hérités par
 * toutes les représentations. Chaque org peut surcharger ces valeurs via
 * `orgs.settings.correspondanceConfig` ou via ses propres
 * `correspondanceTypeConfigs`.
 *
 * Modèle d'héritage :
 *   1. Lire la config réseau (singleton)
 *   2. Lire la config org (settings.correspondanceConfig ou typeConfigs)
 *   3. Merge profond : org > network pour chaque champ défini
 *
 * Le singleton est créé par la migration `initCorrespondanceNetworkConfig`
 * et identifié par le marqueur booléen `isSingleton: true`.
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

// Workflow par type au niveau réseau (sert de défaut pour chaque org)
const networkTypeDefaultValidator = v.object({
  typeCode: v.string(),
  label: v.object({ fr: v.string(), en: v.optional(v.string()) }),
  description: v.optional(
    v.object({ fr: v.string(), en: v.optional(v.string()) }),
  ),
  // Activé par défaut pour les nouvelles orgs
  enabledByDefault: v.boolean(),
  workflowConfig: v.object({
    requiresApproval: v.boolean(),
    approvalChain: v.array(
      v.object({
        ordre: v.number(),
        roleMinimum: v.string(),
        conditionType: v.union(
          v.literal("always"),
          v.literal("if_recipient_rank_above"),
          v.literal("if_external"),
        ),
        conditionValue: v.optional(v.string()),
      }),
    ),
    autoRouteByHierarchy: v.boolean(),
  }),
  prioriteParDefaut: v.optional(v.string()),
  confidentialiteParDefaut: v.optional(v.string()),
});

export const correspondanceNetworkConfigTable = defineTable({
  // Marqueur de singleton : toujours `true`. Permet une query déterministe.
  isSingleton: v.literal(true),

  // ── Réglages globaux du registre courrier ──
  // Pattern de référence par défaut pour les correspondances sortantes.
  // Tokens supportés : {YYYY}, {TYPE}, {ORG}, {NN}, {NNNN}, {NNNNN}
  referencePattern: v.optional(v.string()),

  // ── Workflow global ──
  // Force l'auto-routage hiérarchique par défaut.
  autoRouteByHierarchy: v.optional(v.boolean()),
  // Force la validation chef de poste par défaut.
  chiefApprovalRequired: v.optional(v.boolean()),

  // ── Signature / cachet ──
  signatureDefaults: v.optional(
    v.object({
      // Niveau eIDAS par défaut (1 = simple, 2 = avancée, 3 = qualifiée)
      defaultLevel: v.number(),
      // Cachet réseau par défaut (peut être remplacé par celui de l'org)
      defaultSealStorageId: v.optional(v.id("_storage")),
    }),
  ),

  // ── Filigrane ──
  watermarkDefaults: v.optional(
    v.object({
      enabled: v.boolean(),
      text: v.optional(v.string()),
      opacity: v.optional(v.number()),
    }),
  ),

  // ── Types standards (template livré aux nouvelles orgs) ──
  standardTypes: v.array(networkTypeDefaultValidator),

  // ── Métadonnées ──
  updatedAt: v.number(),
  updatedBy: v.optional(v.id("users")),
}).index("by_singleton", ["isSingleton"]);
