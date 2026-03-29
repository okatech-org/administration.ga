/**
 * Dossier de Procédure — Schema
 *
 * Tables pour la gestion des procédures administratives multi-étapes.
 * Un dossier suit un parcours défini par son TypeDemarche, passant
 * d'organisme en organisme selon les étapes configurées.
 *
 * Tables:
 *  - typeDemarches       : Configuration des types de procédure (parcours, pièces, délais)
 *  - dossierProcedures   : Instances de dossiers en cours de traitement
 *  - dossierPieces       : Pièces constitutives de chaque dossier
 *  - dossierTransitions  : Journal des transitions workflow (étape → étape)
 *  - copiesPassage       : Copies en lecture seule après transit entre organismes
 *  - journalActions      : Audit trail immuable de toutes les actions
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

// ─── Validators ──────────────────────────────────────────────────────────────

export const demarcheCategoryValidator = v.union(
  v.literal("identity"),
  v.literal("visa"),
  v.literal("civil_status"),
  v.literal("certification"),
  v.literal("notarial"),
  v.literal("administrative"),
  v.literal("diplomatic"),
  v.literal("custom"),
);

export const dossierStatusValidator = v.union(
  v.literal("brouillon"),
  v.literal("en_cours"),
  v.literal("en_attente"),
  v.literal("suspendu"),
  v.literal("valide"),
  v.literal("rejete"),
  v.literal("clos"),
  v.literal("archive"),
);

export const pieceStatusValidator = v.union(
  v.literal("manquant"),
  v.literal("fourni"),
  v.literal("valide"),
  v.literal("rejete"),
  v.literal("signe"),
);

export const transitionActionValidator = v.union(
  v.literal("creer"),
  v.literal("soumettre"),
  v.literal("valider"),
  v.literal("rejeter"),
  v.literal("transmettre"),
  v.literal("signer"),
  v.literal("retourner"),
  v.literal("suspendre"),
  v.literal("reprendre"),
  v.literal("clore"),
  v.literal("archiver"),
  v.literal("commenter"),
);

export const confidentialiteValidator = v.union(
  v.literal("standard"),
  v.literal("confidentiel"),
  v.literal("secret"),
);

export const fournisseurTypeValidator = v.union(
  v.literal("demandeur"),
  v.literal("organisme"),
  v.literal("tiers"),
);

export const pieceFormatValidator = v.union(
  v.literal("pdf"),
  v.literal("image"),
  v.literal("any"),
);

// ─── Sub-object validators ──────────────────────────────────────────────────

const pieceRequiseValidator = v.object({
  code: v.string(),
  label: v.object({ fr: v.string(), en: v.optional(v.string()) }),
  description: v.optional(v.object({ fr: v.string(), en: v.optional(v.string()) })),
  fournisseur: fournisseurTypeValidator,
  fournisseurOrgId: v.optional(v.id("orgs")),
  signataireRole: v.optional(v.string()),
  signataireOrgId: v.optional(v.id("orgs")),
  format: pieceFormatValidator,
  required: v.boolean(),
});

const etapeParcoursConfigValidator = v.object({
  ordre: v.number(),
  code: v.string(),
  label: v.object({ fr: v.string(), en: v.optional(v.string()) }),
  organismeType: v.optional(v.string()),
  organismeId: v.optional(v.id("orgs")),
  roleRequired: v.optional(v.string()),
  delaiJours: v.optional(v.number()),
  actionsAutorisees: v.array(v.string()),
  conditionPassage: v.optional(v.string()),
});

// ─── Tables ──────────────────────────────────────────────────────────────────

/**
 * TypeDemarche — Configuration des types de procédure.
 * Définit le parcours, les pièces requises, le schéma de référence et les délais.
 */
export const typeDemarchesTable = defineTable({
  orgId: v.id("orgs"),
  createdBy: v.id("users"),

  // Identity
  code: v.string(),
  label: v.object({ fr: v.string(), en: v.optional(v.string()) }),
  description: v.optional(v.object({ fr: v.string(), en: v.optional(v.string()) })),
  category: demarcheCategoryValidator,

  // Reference pattern — configurable, e.g. "{TYPE}/{YYYY}/{ORG}/{SEQ:5}"
  referencePattern: v.string(),

  // Required pieces
  piecesRequises: v.array(pieceRequiseValidator),

  // Workflow steps
  etapesParcours: v.array(etapeParcoursConfigValidator),

  // Global settings
  confidentialite: confidentialiteValidator,
  delaiGlobalJours: v.optional(v.number()),
  isActive: v.boolean(),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
  deletedAt: v.optional(v.number()),
})
  .index("by_org", ["orgId"])
  .index("by_org_category", ["orgId", "category"])
  .index("by_org_active", ["orgId", "isActive"])
  .index("by_org_code", ["orgId", "code"]);

/**
 * DossierProcedure — Instance d'un dossier administratif.
 * Se déplace entre organismes selon le parcours défini par son TypeDemarche.
 */
export const dossierProceduresTable = defineTable({
  orgId: v.id("orgs"),
  typeDemarcheId: v.id("typeDemarches"),
  createdBy: v.id("users"),

  // Demandeur (usager ou agent initiateur)
  demandeurId: v.id("users"),
  demandeurProfileId: v.optional(v.id("profiles")),

  // Identity
  reference: v.string(),
  status: dossierStatusValidator,

  // Current workflow position
  etapeCouranteCode: v.string(),
  etapeCouranteOrdre: v.number(),
  organismeActuelId: v.optional(v.id("orgs")),
  agentTraitantId: v.optional(v.id("users")),

  // Settings
  confidentialite: confidentialiteValidator,
  priorite: v.optional(v.union(
    v.literal("normal"),
    v.literal("urgent"),
    v.literal("confidentiel"),
  )),

  // Dates
  dateDepot: v.number(),
  dateLimite: v.optional(v.number()),
  dateValidation: v.optional(v.number()),
  dateCloture: v.optional(v.number()),

  // Custom metadata
  metadata: v.optional(v.any()),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
  deletedAt: v.optional(v.number()),
})
  .index("by_org", ["orgId"])
  .index("by_org_status", ["orgId", "status"])
  .index("by_org_deleted", ["orgId", "deletedAt"])
  .index("by_demandeur", ["demandeurId"])
  .index("by_agent", ["agentTraitantId"])
  .index("by_type", ["typeDemarcheId"])
  .index("by_org_type", ["orgId", "typeDemarcheId"])
  .searchIndex("search_reference", {
    searchField: "reference",
    filterFields: ["orgId"],
  });

/**
 * DossierPiece — Pièces constitutives d'un dossier.
 * Chaque pièce requise génère une entrée avec statut "manquant" à la création.
 */
export const dossierPiecesTable = defineTable({
  dossierId: v.id("dossierProcedures"),
  pieceCode: v.string(),
  label: v.object({ fr: v.string(), en: v.optional(v.string()) }),

  // Status
  status: pieceStatusValidator,
  required: v.boolean(),

  // Document (Convex storage)
  storageId: v.optional(v.id("_storage")),
  filename: v.optional(v.string()),
  mimeType: v.optional(v.string()),
  sizeBytes: v.optional(v.number()),

  // Fournisseur info
  fournisseur: fournisseurTypeValidator,
  fournisseurOrgId: v.optional(v.id("orgs")),

  // Validation
  validatedBy: v.optional(v.id("users")),
  validatedAt: v.optional(v.number()),
  rejectionReason: v.optional(v.string()),

  // Signature
  signedBy: v.optional(v.id("users")),
  signedAt: v.optional(v.number()),

  // Timestamps
  uploadedAt: v.optional(v.number()),
  updatedAt: v.number(),
})
  .index("by_dossier", ["dossierId"])
  .index("by_dossier_status", ["dossierId", "status"]);

/**
 * DossierTransition — Log de chaque transition workflow.
 * Enregistre le passage d'une étape à l'autre avec l'action effectuée.
 */
export const dossierTransitionsTable = defineTable({
  dossierId: v.id("dossierProcedures"),

  // Step transition
  etapeDepart: v.string(),
  etapeArrivee: v.optional(v.string()),
  action: transitionActionValidator,

  // Actor
  actorId: v.id("users"),
  actorName: v.optional(v.string()),
  actorMembershipId: v.optional(v.id("memberships")),

  // Organismes
  organismeSourceId: v.optional(v.id("orgs")),
  organismeDestId: v.optional(v.id("orgs")),

  // Details
  commentaire: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_dossier", ["dossierId"])
  .index("by_dossier_created", ["dossierId", "createdAt"])
  .index("by_actor", ["actorId"]);

/**
 * CopiePassage — Copie en lecture seule quand le dossier quitte un organisme.
 * Le dossier actif continue son parcours ; seule cette copie reste chez l'organisme.
 */
export const copiesPassageTable = defineTable({
  dossierId: v.id("dossierProcedures"),
  organismeId: v.id("orgs"),
  etapeCode: v.string(),
  agentId: v.optional(v.id("users")),

  // Snapshot reference (optional pointer to a stored snapshot)
  snapshotRef: v.optional(v.string()),

  // Copy permissions
  droitsCopie: v.boolean(),
  droitsImpression: v.boolean(),

  // Marking
  marque: v.string(),

  createdAt: v.number(),
})
  .index("by_dossier", ["dossierId"])
  .index("by_organisme", ["organismeId"])
  .index("by_organisme_dossier", ["organismeId", "dossierId"]);

/**
 * JournalAction — Audit trail immuable.
 * Chaque action sur un dossier est consignée de manière irréversible.
 */
export const journalActionsTable = defineTable({
  dossierId: v.id("dossierProcedures"),
  action: v.string(),
  actorId: v.id("users"),
  actorName: v.optional(v.string()),
  detail: v.optional(v.any()),
  ipAddress: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_dossier", ["dossierId"])
  .index("by_dossier_created", ["dossierId", "createdAt"])
  .index("by_actor", ["actorId"]);
