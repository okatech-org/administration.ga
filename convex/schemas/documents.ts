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

  // Suppression definitive (deux niveaux : archive → suppression)
  deletedAt: v.optional(v.number()),
  deletedBy: v.optional(v.id("users")),
})
  .index("by_owner", ["ownerId"])
  .index("by_owner_status", ["ownerId", "status"])
  .index("by_category", ["ownerId", "category"])
  .index("by_folder", ["folderId"])
  .index("by_owner_and_archivedAt", ["ownerId", "archivedAt"])
  .index("by_folder_and_archivedAt", ["folderId", "archivedAt"]);

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
