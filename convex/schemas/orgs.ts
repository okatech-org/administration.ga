import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  orgTypeValidator,
  addressValidator,
  orgSettingsValidator,
  weeklyScheduleValidator,
  orgIdentityExtendedValidator,
  orgProtocolValidator,
  orgAddressesValidator,
  orgJurisdictionValidator,
  orgBrandingValidator,
} from "../lib/validators";
import { countryCodeValidator } from "../lib/countryCodeValidator";
import { moduleCodeValidator } from "../lib/moduleCodes";

/**
 * Organizations table - consulats/ambassades
 *
 * Historique : les champs "plats" historiques (address, email, phone, jurisdictionCountries,
 * headOfMission, logoUrl, description) restent en place pour compatibilité. Les nouveaux
 * sous-objets optionnels (identityExtended, protocol, addresses, jurisdiction, branding)
 * les enrichissent et sont destinés à devenir la source de vérité après migration complète
 * (pattern widen-migrate-narrow).
 */
export const orgsTable = defineTable({
  // Identité
  slug: v.string(),
  name: v.string(),
  type: orgTypeValidator,

  // Localisation (champs historiques - à migrer vers `addresses` et `jurisdiction`)
  country: countryCodeValidator,
  timezone: v.string(),
  address: addressValidator,
  jurisdictionCountries: v.optional(v.array(countryCodeValidator)),

  // Contact (historique)
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  fax: v.optional(v.string()),
  website: v.optional(v.string()),
  description: v.optional(v.string()),
  notes: v.optional(v.string()),

  // @deprecated Phase E.4 — utiliser `orgCalendar.serviceHours` + helper
  // `getOrgSchedule(ctx, org)` au lieu de lire ce champ directement.
  // Maintenu en écriture uniquement via cron `syncLegacyOrgFields`.
  // Suppression planifiée en Phase F (après migration citizen-web).
  openingHours: v.optional(weeklyScheduleValidator),

  // Logo (historique - à migrer vers `branding.logoStorageId`)
  logoUrl: v.optional(v.string()),

  // Config
  settings: v.optional(orgSettingsValidator),

  // Diplomatic post info (historique - à migrer vers `protocol`)
  shortName: v.optional(v.string()), // Short display name
  headOfMission: v.optional(v.string()), // Name of head of mission
  headOfMissionTitle: v.optional(v.string()), // Title (Ambassadeur, Consul Général...)
  staffCount: v.optional(v.number()), // Staff count
  modules: v.optional(v.array(moduleCodeValidator)), // Active feature modules (typed)
  // Configuration modulaire enrichie avec capabilities/sous-modules par module
  orgModuleConfig: v.optional(v.array(v.object({
    moduleCode: moduleCodeValidator,
    enabled: v.boolean(),
    capabilities: v.optional(v.array(v.string())),
  }))),
  jurisdictionNotes: v.optional(v.string()), // Notes on jurisdiction (historique)

  // ──────────────────────────────────────────────────────────────
  // NOUVEAUX SOUS-OBJETS (Phase 1 Fondations) — tous optionnels
  // pour préserver les données existantes (pattern widen)
  // ──────────────────────────────────────────────────────────────

  // Identité étendue (nom officiel multilingue, accréditation, cycle de vie)
  identityExtended: v.optional(orgIdentityExtendedValidator),

  // Protocole diplomatique (chef de poste, grade, credentials)
  protocol: v.optional(orgProtocolValidator),

  // Adresses structurées (physique + postale + correspondance)
  addresses: v.optional(orgAddressesValidator),

  // Juridiction enrichie (primaire, secondaire, sous-juridictions)
  jurisdiction: v.optional(orgJurisdictionValidator),

  // Branding & page publique (logo Storage, couleurs, photos, réseaux sociaux)
  branding: v.optional(orgBrandingValidator),

  // Status
  isActive: v.boolean(),
  updatedAt: v.optional(v.number()),
  deletedAt: v.optional(v.number()), // Soft delete
})
  .index("by_slug", ["slug"])
  .index("by_country", ["country"])
  .index("by_active_notDeleted", ["isActive", "deletedAt"])
  .searchIndex("search_name", { searchField: "name" });
