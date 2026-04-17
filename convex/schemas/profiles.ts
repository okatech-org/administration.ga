import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  genderValidator,
  passportInfoValidator,
  addressValidator,
  emergencyContactValidator,
  emergencyContactWithCountryValidator,
  parentValidator,
  spouseValidator,
  maritalStatusValidator,
  professionValidator,
  nationalityAcquisitionValidator,
  publicUserTypeValidator,
} from "../lib/validators";
import { countryCodeValidator } from "../lib/countryCodeValidator";

/**
 * Profiles table - consular data for users
 * One profile per user
 */
export const profilesTable = defineTable({
  userId: v.id("users"),

  // Type d'utilisateur public (détermine les services accessibles)
  userType: publicUserTypeValidator,

  // ═══════════════════════════════════════════════════════════════════════════
  // TERRITORIALITÉ
  // ═══════════════════════════════════════════════════════════════════════════

  // Pays de résidence (pour filtrer les services consulaires)
  countryOfResidence: v.optional(countryCodeValidator),

  // Localisation actuelle (si différente de résidence)
  currentLocation: v.optional(countryCodeValidator),

  // Organisation de rattachement (gère les dossiers, résidence >= 6 mois)
  managedByOrgId: v.optional(v.id("orgs")),

  // Organisation de signalement (séjour temporaire < 6 mois)
  signaledToOrgId: v.optional(v.id("orgs")),

  // Core identity
  identity: v.object({
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    nip: v.optional(v.string()), // Numéro d'Identification Personnel
    birthDate: v.optional(v.number()),
    birthPlace: v.optional(v.string()),
    birthCountry: v.optional(countryCodeValidator),
    gender: v.optional(genderValidator),
    nationality: v.optional(countryCodeValidator),
    nationalityAcquisition: v.optional(nationalityAcquisitionValidator),
  }),

  // Passport info
  passportInfo: v.optional(passportInfoValidator),

  // Addresses
  addresses: v.object({
    residence: v.optional(addressValidator),
    homeland: v.optional(addressValidator),
  }),

  // Contacts
  contacts: v.object({
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    // New: dynamic list of emergency contacts with country
    emergencyContacts: v.optional(
      v.array(emergencyContactWithCountryValidator),
    ),
    // Legacy fields — kept for migration, will be removed after narrow step
    emergencyHomeland: v.optional(emergencyContactValidator),
    emergencyResidence: v.optional(emergencyContactValidator),
  }),

  // Family
  family: v.object({
    maritalStatus: v.optional(maritalStatusValidator),
    father: v.optional(parentValidator),
    mother: v.optional(parentValidator),
    spouse: v.optional(spouseValidator),
  }),

  // Profession
  profession: v.optional(professionValidator),

  // Consular Card
  consularCard: v.optional(
    v.object({
      orgId: v.id("orgs"),
      cardNumber: v.string(),
      cardIssuedAt: v.number(),
      cardExpiresAt: v.number(),
    }),
  ),

  documents: v.optional(
    v.object({
      passport: v.optional(v.id("documents")),
      proofOfAddress: v.optional(v.id("documents")),
      identityPhoto: v.optional(v.id("documents")),
      birthCertificate: v.optional(v.id("documents")),
      proofOfResidency: v.optional(v.id("documents")),
    }),
  ),

  // Matricule consulaire permanent (GAB-{CC}-{YYYY}-{NNNNN})
  // Genere une seule fois a l'inscription consulaire, ne change jamais
  matricule: v.optional(v.string()),

  // Score de complétude du profil (0-100), calculé par calculateCompletionScore()
  completionScore: v.optional(v.number()),

  updatedAt: v.optional(v.number()),
})
  .index("by_user", ["userId"])
  .index("by_card_number", ["consularCard.cardNumber"])
  .index("by_matricule", ["matricule"])
  // Recherche de ressortissants par organisation gestionnaire (iContact, iAsted).
  .index("by_managed_org", ["managedByOrgId"])
  // Recherche de ressortissants par pays de résidence (filtre juridiction).
  .index("by_country_of_residence", ["countryOfResidence"])
  .searchIndex("search_firstName", { searchField: "identity.firstName" })
  .searchIndex("search_lastName", { searchField: "identity.lastName" })
  .searchIndex("search_passportNumber", { searchField: "passportInfo.number" });
