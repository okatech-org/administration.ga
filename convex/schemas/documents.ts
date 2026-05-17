import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  documentStatusValidator,
  documentTypeCategoryValidator,
  detailedDocumentTypeValidator,
} from "../lib/validators";

/**
 * File object schema for documents
 */
export const fileObjectValidator = v.object({
  storageId: v.id("_storage"),
  filename: v.string(),
  mimeType: v.string(),
  sizeBytes: v.number(),
  uploadedAt: v.number(),
});

/**
 * Origine d'un document iDocument — métadonnées de provenance.
 *
 * Posées automatiquement par le pipeline iCorrespondance lors des mutations
 * `classerCorrespondanceDansIDocument` / `removeDocumentFromCorrespondance`,
 * ou lors d'une numérisation / d'un upload direct. Permettent à l'UI iDocument
 * d'afficher un bandeau de provenance et d'offrir un bouton "Répondre"
 * lorsque l'origine est un courrier.
 */
export const documentOriginValidator = v.object({
  type: v.union(
    v.literal("correspondance"),
    v.literal("upload"),
    v.literal("inbound-email"),
    v.literal("scan"),
    v.literal("iasted-correspondance"),
    v.literal("iasted-document"),
  ),
  correspondanceReference: v.optional(v.string()),
  correspondanceArrivalRef: v.optional(v.string()),
  senderName: v.optional(v.string()),
  recipientName: v.optional(v.string()),
  sourceDate: v.optional(v.number()),
  classedAt: v.optional(v.number()),
  classedByUserId: v.optional(v.id("users")),
  // ── Champs spécifiques aux documents générés par iAsted ──
  /** Type de correspondance (note_verbale | lettre_officielle | telegramme | …) si origine iasted-correspondance. */
  correspondanceType: v.optional(v.string()),
  /** Code du template utilisé (attestation_residence, laissez_passer_consulaire, etc.) si origine iasted-document. */
  templateCode: v.optional(v.string()),
  /** Sujet libre saisi par l'utilisateur lors de la commande vocale. */
  subject: v.optional(v.string()),
});

/**
 * Version archivée d'un fichier remplacé (régénération PDF officiel,
 * watermark, amendement).
 */
export const documentVersionValidator = v.object({
  storageId: v.id("_storage"),
  filename: v.string(),
  mimeType: v.string(),
  sizeBytes: v.number(),
  uploadedAt: v.number(),
  reason: v.optional(v.string()),
});

/**
 * Documents table - can contain multiple files
 * Polymorphic owner (profile or request)
 * Also serves as the document vault (e-Documents)
 */
export const documentsTable = defineTable({
  ownerId: v.union(v.id("users"), v.id("orgs"), v.id("profiles"), v.id("childProfiles")),

  files: v.array(fileObjectValidator),

  documentType: v.optional(detailedDocumentTypeValidator),
  category: v.optional(documentTypeCategoryValidator),

  label: v.optional(v.string()),

  status: documentStatusValidator,
  validatedBy: v.optional(v.id("users")),
  validatedAt: v.optional(v.number()),
  rejectionReason: v.optional(v.string()),

  expiresAt: v.optional(v.number()),

  // Lien vers un dossier iDocument (optionnel)
  folderId: v.optional(v.id("documentFolders")),

  updatedAt: v.optional(v.number()),

  // ── Champs archivage (iArchive) ──
  archivedAt: v.optional(v.number()),
  archivedBy: v.optional(v.id("users")),
  archiveCategorySlug: v.optional(v.string()), // fiscal|social|juridique|consulaire|coffre
  retentionExpiresAt: v.optional(v.number()),
  confidentiality: v.optional(v.string()), // public|internal|confidential|secret
  archiveNote: v.optional(v.string()),

  // ── Alignement iCorrespondance (Phase 1 du plan iDoc ↔ iCorr) ──
  /**
   * Back-pointer vers le courrier source quand le document a été créé via
   * `classerCorrespondanceDansIDocument` ou `removeDocumentFromCorrespondance`.
   * Optionnel — un document non lié à un courrier laisse ce champ absent.
   */
  linkedCorrespondanceItemId: v.optional(v.id("correspondanceItems")),
  /** Métadonnées de provenance dénormalisées pour l'affichage UI. */
  origin: v.optional(documentOriginValidator),
  /** Tags applicatifs (ex. "source:correspondance") — distinct des tags i18n. */
  tags: v.optional(v.array(v.string())),
  /**
   * Texte concaténé pour la recherche full-text serveur.
   * Construit via `buildDocumentSearchText` (label + category + filenames +
   * tags + origin.*) à chaque create / update sémantique.
   */
  searchText: v.optional(v.string()),
  /** Versions antérieures du fichier remplacé (régénération PDF, watermark). */
  versions: v.optional(v.array(documentVersionValidator)),

  // Suppression definitive (deux niveaux : archive → suppression)
  deletedAt: v.optional(v.number()),
  deletedBy: v.optional(v.id("users")),
})
  .index("by_owner", ["ownerId"])
  .index("by_owner_status", ["ownerId", "status"])
  .index("by_category", ["ownerId", "category"])
  .index("by_folder", ["folderId"])
  .index("by_owner_and_archivedAt", ["ownerId", "archivedAt"])
  .index("by_folder_and_archivedAt", ["folderId", "archivedAt"])
  .index("by_correspondance_item", ["linkedCorrespondanceItemId"])
  .searchIndex("search_all", {
    searchField: "searchText",
    filterFields: ["ownerId", "status"],
  });

// ─── Dossiers iDocument ────────────────────────────────────────────────────

/**
 * Dossiers virtuels pour iDocument.
 * Hiérarchie arborescente via parentFolderId.
 */
export const documentFoldersTable = defineTable({
  orgId: v.id("orgs"),
  name: v.string(),
  parentFolderId: v.optional(v.id("documentFolders")),
  tags: v.array(v.string()),
  createdBy: v.id("users"),
  isSystem: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
  deletedAt: v.optional(v.number()),
  deletedBy: v.optional(v.id("users")),

  // ── Politique d'archivage (heritage vers documents enfants) ──
  archiveCategorySlug: v.optional(v.string()),
  confidentiality: v.optional(v.string()),
  retentionYears: v.optional(v.number()),
  countingStartEvent: v.optional(v.string()),
})
  .index("by_org", ["orgId"])
  .index("by_org_parent", ["orgId", "parentFolderId"])
  .index("by_org_name", ["orgId", "name"]);
