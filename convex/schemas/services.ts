import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  serviceCategoryValidator,
  localizedStringValidator,
  formSchemaValidator,
  formDocumentValidator,
  publicUserTypeValidator,
} from "../lib/validators";
import { fileObjectValidator } from "./documents";

/**
 * Services table - global catalog (read-only for orgs)
 * Managed by superadmins
 *
 * Note: Required documents are now part of formSchema.joinedDocuments
 */
export const servicesTable = defineTable({
  slug: v.string(),
  code: v.string(), // ex: "PASSPORT_NEW", "CONSULAR_CARD"

  // Localized content
  name: localizedStringValidator,
  description: localizedStringValidator,
  content: v.optional(localizedStringValidator), // HTML from Tiptap editor

  category: serviceCategoryValidator,
  icon: v.optional(v.string()),

  // Eligible profile types (who can access this service)
  // e.g. ["long_stay", "short_stay"] for citizen-only services
  eligibleProfiles: v.optional(v.array(publicUserTypeValidator)),

  // Processing info
  estimatedDays: v.number(),
  requiresAppointment: v.boolean(),
  requiresPickupAppointment: v.boolean(),

  joinedDocuments: v.optional(v.array(formDocumentValidator)),

  // Form schema - typed structure for dynamic forms
  // Includes sections, joinedDocuments, and showRecap
  formSchema: v.optional(formSchemaValidator),

  // Downloadable form files (public-facing document, e.g. PDF forms)
  formFiles: v.optional(v.array(fileObjectValidator)),

  // Editorial — affiché sur la page publique /services
  // Étapes du parcours utilisateur (différent du formSchema qui décrit le formulaire).
  processSteps: v.optional(
    v.array(
      v.object({
        label: localizedStringValidator,
        icon: v.optional(v.string()),
      }),
    ),
  ),
  // Validité du titre délivré (ex: « 5 ans (adultes) »)
  titleValidity: v.optional(localizedStringValidator),

  // Status
  isActive: v.boolean(),
  updatedAt: v.optional(v.number()),
})
  .index("by_slug", ["slug"])
  .index("by_code", ["code"])
  .index("by_category_active", ["category", "isActive"])
  .index("by_active", ["isActive"]);
