import { defineTable } from "convex/server";
import { v } from "convex/values";
import { localizedStringValidator } from "../lib/validators";

/**
 * Documents publics téléchargeables affichés sur la page publique d'une
 * représentation (listes de pièces, formulaires, brochures, tarifs, plan
 * d'accès…).
 *
 * Distincts de `documents` (dossiers personnels des usagers) et
 * `documentTemplates` (modèles de génération). Ces fichiers sont publiés
 * par l'org elle-même et téléchargeables sans authentification.
 */
export const orgPublicDocumentCategoryValidator = v.union(
  v.literal("checklist"), // pièces à fournir
  v.literal("form"), // formulaire à remplir
  v.literal("brochure"),
  v.literal("pricing"), // tarifs / barème
  v.literal("access"), // plan d'accès, transports
  v.literal("other"),
);

export const orgPublicDocumentsTable = defineTable({
  orgId: v.id("orgs"),
  title: v.string(),
  titleI18n: v.optional(localizedStringValidator),
  description: v.optional(v.string()),
  category: orgPublicDocumentCategoryValidator,
  storageId: v.id("_storage"),
  mimeType: v.string(),
  sizeBytes: v.number(),
  order: v.number(),
  isActive: v.boolean(),
  publishedAt: v.optional(v.number()),
  expiresAt: v.optional(v.number()),
  createdBy: v.optional(v.id("users")),
  updatedAt: v.optional(v.number()),
  deletedAt: v.optional(v.number()),
})
  .index("by_org", ["orgId"])
  .index("by_org_active_order", ["orgId", "isActive", "order"])
  .index("by_org_category", ["orgId", "category"]);
