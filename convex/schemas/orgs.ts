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
  jurisdictionCountries: v.optional(v.array(countryCodeValidator)),

  // Contact
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  fax: v.optional(v.string()),
  website: v.optional(v.string()),
  description: v.optional(v.string()),
  notes: v.optional(v.string()),

  // Opening hours
  openingHours: v.optional(weeklyScheduleValidator),

  // Logo
  logoUrl: v.optional(v.string()),

  // Config
  settings: v.optional(orgSettingsValidator),

  // Diplomatic post info
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
