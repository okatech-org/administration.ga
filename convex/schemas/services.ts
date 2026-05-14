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

  // ────────────────────────────────────────────────────────────────────────
  // CONTENU ÉDITORIAL — alimente la page publique /services et le détail.
  // Tous optionnels. Permet aux superadmins d'enrichir progressivement
  // la fiche de chaque service sans migration.
  // ────────────────────────────────────────────────────────────────────────

  // Étapes du parcours utilisateur (numérotées 1, 2, 3…). Différent de
  // `formSchema` qui décrit les sections du formulaire de demande — ici
  // on raconte le bout-en-bout (préinscription → instruction → délivrance).
  processSteps: v.optional(
    v.array(
      v.object({
        label: localizedStringValidator,
        description: v.optional(localizedStringValidator),
        icon: v.optional(v.string()),
        // Badges affichés sous l'étape (durée, sécurité, format, etc.)
        extras: v.optional(
          v.array(
            v.object({
              label: localizedStringValidator,
              icon: v.optional(v.string()),
            }),
          ),
        ),
      }),
    ),
  ),

  // Validité du titre délivré (ex: « 5 ans (adultes) »)
  titleValidity: v.optional(localizedStringValidator),

  // Public concerné — version humaine d'eligibleProfiles
  // (ex: « Ressortissants gabonais », « Étrangers en séjour »)
  audience: v.optional(localizedStringValidator),

  // Délai express en jours ouvrés (affiché dans la sidebar « En bref »)
  expressDays: v.optional(v.number()),

  // Encart « À noter » dans la section Présentation
  noteCallout: v.optional(
    v.object({
      variant: v.union(
        v.literal("info"),
        v.literal("warning"),
        v.literal("success"),
      ),
      body: localizedStringValidator,
    }),
  ),

  // Liste « Dans quels cas en avez-vous besoin ? »
  useCases: v.optional(v.array(localizedStringValidator)),

  // Tarifs détaillés — variantes (standard, express, duplicata, mineurs…).
  // Chaque entrée porte un `id` stable (slug) pour pouvoir être surchargée
  // côté orgServices.pricingTableOverrides.
  pricingTable: v.optional(
    v.array(
      v.object({
        id: v.string(),
        name: localizedStringValidator,
        description: v.optional(localizedStringValidator),
        delay: v.optional(localizedStringValidator),
        price: v.optional(localizedStringValidator),
        isFree: v.optional(v.boolean()),
        variant: v.optional(
          v.union(
            v.literal("standard"),
            v.literal("express"),
            v.literal("duplicate"),
            v.literal("reduced"),
            v.literal("addon"),
          ),
        ),
      }),
    ),
  ),
  legalReference: v.optional(localizedStringValidator),
  pricingNote: v.optional(localizedStringValidator),

  // Modes de soumission disponibles (en ligne / en personne / postal).
  availableModes: v.optional(
    v.array(
      v.object({
        mode: v.union(
          v.literal("online"),
          v.literal("in_person"),
          v.literal("postal"),
        ),
        title: v.optional(localizedStringValidator),
        description: localizedStringValidator,
        delay: v.optional(localizedStringValidator),
        fee: v.optional(localizedStringValidator),
        availability: v.optional(localizedStringValidator),
        recommended: v.optional(v.boolean()),
      }),
    ),
  ),

  // FAQ propre au service (section « Questions fréquentes »).
  faqs: v.optional(
    v.array(
      v.object({
        question: localizedStringValidator,
        answer: localizedStringValidator,
      }),
    ),
  ),

  // Status
  isActive: v.boolean(),
  updatedAt: v.optional(v.number()),
})
  .index("by_slug", ["slug"])
  .index("by_code", ["code"])
  .index("by_category_active", ["category", "isActive"])
  .index("by_active", ["isActive"]);
