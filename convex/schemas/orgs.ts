import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  orgTypeValidator,
  addressValidator,
  orgSettingsValidator,
  weeklyScheduleValidator,
} from "../lib/validators";
import { countryCodeValidator } from "../lib/countryCodeValidator";
import { moduleCodeValidator } from "../lib/moduleCodes";

/**
 * Organizations table - consulats/ambassades
 */
export const orgsTable = defineTable({
  // Identité
  slug: v.string(),
  name: v.string(),
  type: orgTypeValidator,

  // Localisation
  country: countryCodeValidator,
  timezone: v.string(),
  address: addressValidator,
  addresses: v.optional(v.object({
    physical: addressValidator,
    postal: v.optional(addressValidator),
    correspondence: v.optional(v.string()),
  })),
  jurisdictionCountries: v.optional(v.array(countryCodeValidator)),

  // Branding
  branding: v.optional(v.object({
    logoStorageId: v.optional(v.id("_storage")),
    logoCompactStorageId: v.optional(v.id("_storage")),
    bannerStorageId: v.optional(v.id("_storage")),
    colors: v.optional(v.object({
      primary: v.string(),
      secondary: v.optional(v.string()),
      accent: v.optional(v.string()),
    })),
    photos: v.optional(v.array(v.object({
      storageId: v.id("_storage"),
      order: v.number(),
      caption: v.optional(v.string()),
    }))),
    publicDescription: v.optional(v.object({
      fr: v.string(),
      en: v.optional(v.string()),
      local: v.optional(v.string()),
    })),
    socialLinks: v.optional(v.object({
      facebook: v.optional(v.string()),
      instagram: v.optional(v.string()),
      linkedin: v.optional(v.string()),
      twitter: v.optional(v.string()),
      youtube: v.optional(v.string()),
    })),
    publishNews: v.optional(v.boolean()),
  })),

  // Contact
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  fax: v.optional(v.string()),
  website: v.optional(v.string()),
  description: v.optional(v.string()),
  notes: v.optional(v.string()),

  // Identity extended
  identityExtended: v.optional(v.object({
    accreditedTo: v.optional(v.array(countryCodeValidator)),
    closedAt: v.optional(v.number()),
    officialName: v.optional(v.string()),
    officialNameLocal: v.optional(v.string()),
    openedAt: v.optional(v.number()),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("draft"),
      v.literal("maintenance"),
      v.literal("archived"),
      v.literal("suspended"),
    )),
  })),

  // Jurisdiction (structured)
  jurisdiction: v.optional(v.object({
    primary: v.array(countryCodeValidator),
    secondary: v.optional(v.array(countryCodeValidator)),
    subJurisdictions: v.optional(v.array(v.object({
      name: v.string(),
      countryCode: countryCodeValidator,
      city: v.optional(v.string()),
      contactName: v.optional(v.string()),
      contactEmail: v.optional(v.string()),
      contactPhone: v.optional(v.string()),
      honoraryConsulateOrgId: v.optional(v.id("orgs")),
      servicesAuthorized: v.optional(v.array(v.string())),
    }))),
    notes: v.optional(v.string()),
  })),

  // Opening hours
  openingHours: v.optional(weeklyScheduleValidator),

  // Logo
  logoUrl: v.optional(v.string()),

  // Config
  settings: v.optional(orgSettingsValidator),

  // Protocol (diplomatic credentials)
  protocol: v.optional(v.object({
    headOfMissionGrade: v.optional(v.union(
      v.literal("ambassadeur"),
      v.literal("ambassadeur_extraordinaire"),
      v.literal("ministre_plenipotentiaire"),
      v.literal("consul_general"),
      v.literal("consul"),
      v.literal("charge_affaires"),
      v.literal("haut_commissaire"),
      v.literal("representant_permanent"),
      v.literal("consul_honoraire"),
    )),
    headOfMissionUserId: v.optional(v.id("users")),
    headOfMissionMembershipId: v.optional(v.id("memberships")),
    headOfMissionTitleFr: v.optional(v.string()),
    headOfMissionTitleEn: v.optional(v.string()),
    officialPhotoStorageId: v.optional(v.id("_storage")),
    credentialsPresentedAt: v.optional(v.number()),
    exequaturGrantedAt: v.optional(v.number()),
  })),

  // Diplomatic post info (legacy)
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
  jurisdictionNotes: v.optional(v.string()), // Notes on jurisdiction

  // Status
  isActive: v.boolean(),
  updatedAt: v.optional(v.number()),
  deletedAt: v.optional(v.number()), // Soft delete
})
  .index("by_slug", ["slug"])
  .index("by_country", ["country"])
  .index("by_active_notDeleted", ["isActive", "deletedAt"])
  .searchIndex("search_name", { searchField: "name" });
