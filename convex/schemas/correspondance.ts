/**
 * iCorrespondance Schema
 *
 * Official diplomatic correspondence management for consulates and embassies.
 * Adapted from the mairie.ga iCorrespondance module for the gabon-diplomatie context.
 *
 * Tables:
 *  - correspondanceFolders         : User-created folder hierarchy per org
 *  - correspondanceItems           : Individual correspondence items (note verbale, lettre, etc.)
 *  - correspondanceWorkflowSteps   : Workflow audit trail (approval, rejection, transmission)
 *  - correspondanceTypeConfigs     : Per-org type configuration (approval chains, templates)
 *  - correspondanceApprovalSteps   : Multi-level hierarchical approval chain steps
 *  - correspondanceRecipients      : Junction table for primary & CC recipients
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE DECISIONS (ADR)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 1. DÉNORMALISATION DES NOMS (senderName, recipientName, actorName, etc.)
 *    CHOIX DÉLIBÉRÉ — Les noms sont stockés en clair à côté des IDs liés.
 *    Raison : la correspondance diplomatique est un acte officiel. Le nom du
 *    signataire/destinataire au moment de l'envoi fait partie du dossier juridique.
 *    Si un membre change de poste ou de nom, les correspondances passées doivent
 *    conserver le nom officiel au moment de l'acte. De plus, cela évite des
 *    jointures coûteuses dans les listes et timelines.
 *
 * 2. MÉCANISME COPIE/ORIGINAL (isCopy, originalItemId, copyOwnerOrgId)
 *    CHOIX DÉLIBÉRÉ — À l'envoi, l'original est créé chez le destinataire et
 *    l'expéditeur conserve une copie (isCopy=true). Cela modélise le flux réel
 *    du courrier diplomatique : le dossier « se déplace ». L'expéditeur garde
 *    une copie en lecture seule avec suivi du statut côté destinataire.
 *
 * 3. DOCUMENTS EMBARQUÉS (documents: v.array(...))
 *    COMPROMIS ACCEPTÉ — Les documents sont stockés comme array dans l'item
 *    plutôt que dans une table séparée. Simplifie les opérations atomiques
 *    (envoi crée copie + original avec leurs docs en une mutation).
 *    Limitation : performance dégradée si > 50 documents par dossier (rare
 *    en contexte diplomatique : 2-5 documents en moyenne).
 *
 * 4. DOUBLE ARRAY (documents + attachments)
 *    RÉTROCOMPATIBILITÉ — `attachments` est l'ancien format (storageId + filename).
 *    `documents` est le format enrichi (avec ordre, label, type, watermark).
 *    Les deux sont maintenus en parallèle pendant la migration progressive.
 *    Les nouvelles fonctions (correspondanceCore.ts) utilisent `documents`.
 *
 * 5. RÉFÉRENCE SÉQUENTIELLE (DIPL/YYYY/TYPE/NNNNN)
 *    Utilise la table `counters` avec un compteur atomique par type + année.
 *    Garantit l'unicité sans risque de collision (mutations Convex sérialisées).
 *    Format diplomatique : DIPL/2026/NV/00042.
 *
 * 6. REGISTRE COURRIER (ARR/YYYY/NNNNN, DEP/YYYY/NNNNN)
 *    Numérotation séquentielle par org + année pour le registre d'arrivée
 *    et le registre de départ. Chaque org a ses propres compteurs.
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

// ─── Validators ──────────────────────────────────────────────────────────────

export const correspondanceTypeValidator = v.union(
  v.literal("note_verbale"),
  v.literal("lettre_officielle"),
  v.literal("circulaire"),
  v.literal("telegramme"),
  v.literal("memorandum"),
  v.literal("communique"),
);

export const correspondancePriorityValidator = v.union(
  v.literal("normal"),
  v.literal("urgent"),
  v.literal("confidentiel"),
);

export const correspondanceStatusValidator = v.union(
  v.literal("draft"),
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("sent"),
  v.literal("received"),
  v.literal("archived"),
);

export const recipientStatusValidator = v.union(
  v.literal("en_transit"),
  v.literal("recu"),
  v.literal("en_attente"),
  v.literal("approuve"),
  v.literal("repondu"),
);

export const correspondanceWorkflowStepTypeValidator = v.union(
  v.literal("CREATED"),
  v.literal("SENT_FOR_APPROVAL"),
  v.literal("VIEWED"),
  v.literal("APPROVED"),
  v.literal("REJECTED"),
  v.literal("MODIFICATION_REQUESTED"),
  v.literal("RETURNED_TO_AGENT"),
  v.literal("TRANSMITTED"),
  v.literal("SENT_EMAIL"),
  v.literal("ARCHIVED"),
  // Types spécifiques pour les actions sur documents (remplacent la surcharge de VIEWED)
  v.literal("DOCUMENT_ADDED"),
  v.literal("DOCUMENT_REMOVED"),
  v.literal("REGISTERED"),
);

const correspondanceAttachmentValidator = v.object({
  storageId: v.id("_storage"),
  filename: v.string(),
  mimeType: v.string(),
  sizeBytes: v.number(),
  uploadedAt: v.number(),
});

/**
 * Document enrichi — chaque pièce d'un dossier de correspondance
 * avec métadonnées (type, label, ordre, document principal vs annexe).
 */
export const correspondanceDocumentValidator = v.object({
  storageId: v.id("_storage"),
  filename: v.string(),
  mimeType: v.string(),
  sizeBytes: v.number(),
  uploadedAt: v.number(),
  documentType: v.optional(v.string()),
  label: v.optional(v.string()),
  ordre: v.number(),
  isMainDocument: v.boolean(),
  copyWatermark: v.optional(v.boolean()),
});

// ─── Tables ──────────────────────────────────────────────────────────────────

/**
 * Folders for organising correspondence within an org.
 * System folders (Toutes, Brouillons, Corbeille) are virtual — not stored here.
 */
export const correspondanceFoldersTable = defineTable({
  orgId: v.id("orgs"),
  createdBy: v.id("users"),
  name: v.string(),
  parentFolderId: v.optional(v.id("correspondanceFolders")),
  tags: v.array(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
  deletedAt: v.optional(v.number()),
})
  .index("by_org", ["orgId"])
  .index("by_org_parent", ["orgId", "parentFolderId"])
  .index("by_org_deleted", ["orgId", "deletedAt"]);

/**
 * Individual correspondence items.
 */
export const correspondanceItemsTable = defineTable({
  orgId: v.id("orgs"),
  folderId: v.optional(v.id("correspondanceFolders")),
  createdBy: v.id("users"),

  // Identity
  reference: v.string(), // e.g. DIPL/2026/NV/00042
  title: v.string(),
  type: correspondanceTypeValidator,
  priority: correspondancePriorityValidator,
  status: correspondanceStatusValidator,

  // Sender (denormalized strings + linked user ID)
  senderName: v.string(),
  senderOrg: v.optional(v.string()),
  senderEmail: v.optional(v.string()),
  senderUserId: v.optional(v.id("users")),

  // Primary recipient (denormalized + linked IDs)
  recipientName: v.string(),
  recipientOrg: v.optional(v.string()),
  recipientEmail: v.optional(v.string()),
  primaryRecipientId: v.optional(v.id("users")),
  primaryRecipientOrgId: v.optional(v.id("orgs")),

  // Content
  comment: v.optional(v.string()),
  tags: v.array(v.string()),

  // Workflow
  currentHolderId: v.optional(v.id("users")),
  requiresApproval: v.boolean(),
  approvedById: v.optional(v.id("users")),
  approvedAt: v.optional(v.number()),
  sentAt: v.optional(v.number()),

  // Documents enrichis du dossier
  documents: v.optional(v.array(correspondanceDocumentValidator)),

  // Champ legacy — toléré pour la rétrocompatibilité des anciens documents,
  // jamais lu ni écrit. À supprimer via migration une fois les données purgées.
  attachments: v.optional(v.array(correspondanceAttachmentValidator)),

  // Direction (for register views)
  direction: v.optional(v.union(v.literal("incoming"), v.literal("outgoing"))),

  // Deadline
  dateReponseAttendue: v.optional(v.number()),

  // Thread (replies)
  parentItemId: v.optional(v.id("correspondanceItems")),

  // Confidentiality
  confidentialite: v.optional(v.union(
    v.literal("standard"),
    v.literal("confidentiel"),
    v.literal("secret"),
  )),

  // Champ dénormalisé pour la recherche full-text (concaténation de
  // title, reference, senderName, senderOrg, recipientName, recipientOrg,
  // comment, tags). Mis à jour automatiquement à chaque insert/patch via
  // `buildCorrespondanceSearchText`.
  searchText: v.optional(v.string()),

  // Read tracking
  readByIds: v.optional(v.array(v.string())),

  // ── Mécanisme de copie (Phase 1 refonte) ──
  // Quand une correspondance est envoyée, l'original part au destinataire
  // et l'expéditeur conserve une copie (isCopy=true).
  isCopy: v.optional(v.boolean()),
  originalItemId: v.optional(v.id("correspondanceItems")),
  copyOwnerOrgId: v.optional(v.id("orgs")),

  // Suivi côté destinataire (mis à jour automatiquement sur la copie)
  recipientStatus: v.optional(recipientStatusValidator),
  recipientStatusUpdatedAt: v.optional(v.number()),

  // Réception côté destinataire
  arrivalReference: v.optional(v.string()),
  arrivalDate: v.optional(v.number()),
  assignedToId: v.optional(v.id("users")),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
  deletedAt: v.optional(v.number()),
})
  .index("by_org", ["orgId"])
  .index("by_org_status", ["orgId", "status"])
  .index("by_org_folder", ["orgId", "folderId"])
  .index("by_org_created", ["orgId", "createdAt"])
  .index("by_org_deleted", ["orgId", "deletedAt"])
  .index("by_org_direction", ["orgId", "direction"])
  .index("by_holder", ["currentHolderId"])
  .index("by_parent", ["parentItemId"])
  // Nouveaux index pour le mécanisme de copie
  .index("by_owner_org", ["copyOwnerOrgId"])
  .index("by_owner_org_status", ["copyOwnerOrgId", "status"])
  .index("by_owner_org_copy", ["copyOwnerOrgId", "isCopy"])
  .index("by_original", ["originalItemId"])
  .searchIndex("search_title", { searchField: "title", filterFields: ["orgId"] })
  .searchIndex("search_all", {
    searchField: "searchText",
    filterFields: ["copyOwnerOrgId", "type", "status", "confidentialite", "isCopy"],
  });

/**
 * Workflow audit trail for correspondence items.
 */
export const correspondanceWorkflowStepsTable = defineTable({
  itemId: v.id("correspondanceItems"),
  stepType: correspondanceWorkflowStepTypeValidator,
  actorId: v.id("users"),
  actorName: v.optional(v.string()),
  targetId: v.optional(v.id("users")),
  targetName: v.optional(v.string()),
  comment: v.optional(v.string()),
  isRead: v.boolean(),
  readAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_item", ["itemId"])
  .index("by_item_created", ["itemId", "createdAt"])
  .index("by_actor", ["actorId"]);

/**
 * Type configuration per organization.
 * Each org can configure its correspondence types, workflows, and templates.
 * Standard types are seeded on org init; custom types can be added.
 */
export const correspondanceTypeConfigsTable = defineTable({
  orgId: v.id("orgs"),
  typeCode: v.string(),
  label: v.object({ fr: v.string(), en: v.optional(v.string()) }),
  description: v.optional(v.object({ fr: v.string(), en: v.optional(v.string()) })),
  isCustom: v.boolean(),
  isActive: v.boolean(),
  templateStorageId: v.optional(v.id("_storage")),
  headerConfig: v.optional(v.object({
    logoStorageId: v.optional(v.id("_storage")),
    headerText: v.optional(v.string()),
    footerText: v.optional(v.string()),
  })),
  workflowConfig: v.object({
    requiresApproval: v.boolean(),
    approvalChain: v.array(v.object({
      ordre: v.number(),
      roleMinimum: v.string(),
      organismeId: v.optional(v.id("orgs")),
      conditionType: v.union(
        v.literal("always"),
        v.literal("if_recipient_rank_above"),
        v.literal("if_external"),
      ),
      conditionValue: v.optional(v.string()),
    })),
    autoRouteByHierarchy: v.boolean(),
  }),
  referencePattern: v.optional(v.string()),
  prioriteParDefaut: v.optional(v.string()),
  confidentialiteParDefaut: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
  deletedAt: v.optional(v.number()),
})
  .index("by_org", ["orgId"])
  .index("by_org_type", ["orgId", "typeCode"])
  .index("by_org_active", ["orgId", "isActive"]);

/**
 * Approval chain steps for multi-level hierarchical approval.
 * Each step represents one approver in the chain.
 * Steps are processed in order (by `ordre` field).
 */
export const correspondanceApprovalStepsTable = defineTable({
  itemId: v.id("correspondanceItems"),
  ordre: v.number(),
  approverId: v.id("users"),
  approverName: v.optional(v.string()),
  approverRole: v.optional(v.string()),
  status: v.union(
    v.literal("pending"),
    v.literal("approved"),
    v.literal("rejected"),
    v.literal("skipped"),
  ),
  comment: v.optional(v.string()),
  decidedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_item", ["itemId"])
  .index("by_item_ordre", ["itemId", "ordre"])
  .index("by_approver", ["approverId"])
  .index("by_approver_status", ["approverId", "status"]);

/**
 * Signatures électroniques simples (niveau 1 eIDAS) apposées sur un document
 * d'un dossier de correspondance.
 *
 * Mécanique : sceau serveur visible (tampon graphique) + horodatage + hash
 * SHA-256 du document scellé. Preuve d'intention, pas de certificat utilisateur.
 */
export const correspondanceSignaturesTable = defineTable({
  itemId: v.id("correspondanceItems"),
  // Document signé (référencé par storageId du PDF original avant scellement)
  originalStorageId: v.id("_storage"),
  // Document scellé final (avec page d'attestation + tampon visuel)
  sealedStorageId: v.id("_storage"),
  documentLabel: v.optional(v.string()),
  // Auteur de la signature (denormalized pour l'historique légal)
  signerId: v.id("users"),
  signerName: v.string(),
  signerTitle: v.optional(v.string()),
  signerOrgId: v.id("orgs"),
  signerOrgName: v.string(),
  // Preuve cryptographique
  documentHash: v.string(), // SHA-256 hex du sealedStorageId
  serialNumber: v.string(), // n° unique de série du sceau
  signedAt: v.number(),
})
  .index("by_item", ["itemId"])
  .index("by_signer", ["signerId"])
  .index("by_serial", ["serialNumber"]);

/**
 * Annotations / commentaires libres sur un dossier de correspondance.
 *
 * À distinguer de `correspondanceWorkflowSteps` : ces commentaires sont des
 * notes humaines (instructions de traitement, remarques internes) tandis que
 * les workflow steps tracent les actions système (envoi, approbation, etc.).
 *
 * Visibilité = "internal" : seulement pour les membres de l'org propriétaire.
 */
export const correspondanceAnnotationsTable = defineTable({
  itemId: v.id("correspondanceItems"),
  orgId: v.id("orgs"),
  authorId: v.id("users"),
  authorName: v.string(),
  content: v.string(),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
  deletedAt: v.optional(v.number()),
})
  .index("by_item", ["itemId"])
  .index("by_item_created", ["itemId", "createdAt"]);

/**
 * Recipients junction table.
 * Tracks primary recipient (holder) and CC recipients for each correspondance item.
 * Needed because Convex doesn't support indexing into arrays.
 */
export const correspondanceRecipientsTable = defineTable({
  itemId: v.id("correspondanceItems"),
  userId: v.id("users"),
  orgId: v.id("orgs"),
  role: v.union(v.literal("primary"), v.literal("cc")),
  // Denormalized for display
  name: v.string(),
  email: v.optional(v.string()),
  positionTitle: v.optional(v.string()),
  orgName: v.string(),
  createdAt: v.number(),
})
  .index("by_item", ["itemId"])
  .index("by_item_role", ["itemId", "role"])
  .index("by_user", ["userId"])
  .index("by_user_role", ["userId", "role"]);
