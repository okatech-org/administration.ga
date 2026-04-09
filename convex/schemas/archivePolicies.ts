import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Politiques d'archivage par organisation / categorie.
 * Override les durees de retention par defaut definies dans archiveHelpers.
 */
export const archivePoliciesTable = defineTable({
  orgId: v.id("orgs"),
  categorySlug: v.string(), // fiscal|social|juridique|consulaire|coffre
  retentionYears: v.number(),
  confidentiality: v.string(), // public|internal|confidential|secret
  countingStartEvent: v.string(), // date_creation|date_cloture|date_tag|date_gel|date_manuelle
  autoArchiveOnApproval: v.optional(v.boolean()),
  notifyBeforeExpiryDays: v.optional(v.number()),
  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_org", ["orgId"])
  .index("by_org_and_categorySlug", ["orgId", "categorySlug"]);

/**
 * Journal d'audit immutable pour toutes les operations d'archivage.
 * Pattern identique a journalActionsTable (dossierProcedure).
 */
export const archiveAuditLogTable = defineTable({
  orgId: v.id("orgs"),
  documentId: v.optional(v.id("documents")),
  folderId: v.optional(v.id("documentFolders")),
  action: v.string(), // archive|restore|permanent_delete|policy_update|category_change|retention_extend
  actorId: v.id("users"),
  actorName: v.optional(v.string()),
  detail: v.optional(v.any()),
  createdAt: v.number(),
})
  .index("by_org", ["orgId"])
  .index("by_document", ["documentId"])
  .index("by_org_and_createdAt", ["orgId", "createdAt"]);
