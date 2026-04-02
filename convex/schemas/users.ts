import { defineTable } from "convex/server";
import { v } from "convex/values";
import { UserRole } from "../lib/constants";
import { moduleCodeValidator } from "../lib/moduleCodes";

/**
 * Users table - app-level user data
 * 
 * - `authId`: Better Auth user ID (from identity.subject)
 * - `role`: Platform-level role (superadmin, intel_agent, etc.)
 *   These roles grant access across ALL organizations
 * - Organization-specific roles are in the `memberships` table
 */
export const usersTable = defineTable({
  // Auth ID (Better Auth user ID, from identity.subject)
  authId: v.string(),

  // Core identity
  email: v.string(),
  name: v.string(),
  phone: v.optional(v.string()),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),

  // Platform-level role (not org-specific)
  role: v.optional(v.union(
    v.literal(UserRole.User),
    v.literal(UserRole.Admin),
    v.literal(UserRole.AdminSystem),
    v.literal(UserRole.SuperAdmin),
    v.literal(UserRole.IntelAgent),
    v.literal(UserRole.EducationAgent),
  )),

  // Flags système
  isActive: v.boolean(),
  isSuperadmin: v.boolean(), // Legacy, use role === 'super_admin' instead

  // Back-office module attribution: restricts which dashboard modules this user can access.
  // When undefined → full access for their role. When set → only listed modules.
  allowedModules: v.optional(v.array(moduleCodeValidator)),

  // Back-office org scoping: restricts which organizations this admin can see/manage.
  // When undefined → full access to ALL orgs (SuperAdmin/AdminSystem default).
  // When set → only data from the listed orgs is visible in the dashboard.
  allowedOrgs: v.optional(v.array(v.id("orgs"))),

  // User preferences (notification channels, language, etc.)
  preferences: v.optional(v.object({
    emailNotifications: v.optional(v.boolean()),   // Receive email updates
    pushNotifications: v.optional(v.boolean()),    // Browser push notifications
    smsNotifications: v.optional(v.boolean()),     // SMS for appointments
    whatsappNotifications: v.optional(v.boolean()), // WhatsApp + SMS via Bird
    language: v.optional(v.union(v.literal("fr"), v.literal("en"))),
    shareAnalytics: v.optional(v.boolean()),       // Opt-in anonymous analytics
  })),

  // ─── Code PIN (connexion rapide citoyens) ───────────────────
  pinHash: v.optional(v.string()),             // Hash scrypt du PIN 6 chiffres
  pinCreatedAt: v.optional(v.number()),        // Timestamp création/modification
  pinFailedAttempts: v.optional(v.number()),   // Compteur d'échecs (reset à 0 au succès)
  pinLockedUntil: v.optional(v.number()),      // Timestamp fin de verrouillage (30min)
  lastOtpVerifiedAt: v.optional(v.number()),   // Dernière vérification OTP réussie

  // Metadata (pas de _createdAt, utilise _creationTime natif)
  updatedAt: v.optional(v.number()),

  // Soft-delete (trash): timestamp when user was moved to trash
  deletedAt: v.optional(v.number()),
})
  .index("by_authId", ["authId"])
  .index("by_phone", ["phone"])
  .index("by_email", ["email"])
  .index("by_deletedAt", ["deletedAt"])
  .searchIndex("search_name", { searchField: "name" });
