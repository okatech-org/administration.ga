import { defineTable } from "convex/server";
import { v } from "convex/values";
import { taskCodeValidator } from "../lib/taskCodes";
import { permissionEffectValidator } from "../lib/validators";
import { moduleCodeValidator, accessLevelValidator } from "../lib/moduleCodes";

/**
 * Memberships table - User ↔ Org relationship
 *
 * Permissions are derived from:
 *   positionId → position.tasks (stored directly in DB)
 *
 * Per-member overrides are stored inline in `specialPermissions`.
 */
export const membershipsTable = defineTable({
  userId: v.id("users"),
  orgId: v.id("orgs"),

  // Position-based role — links to position → tasks (stored in DB)
  positionId: v.optional(v.id("positions")),

  // Per-member permission overrides (grant/deny specific task codes)
  specialPermissions: v.optional(v.array(v.object({
    taskCode: taskCodeValidator,
    effect: permissionEffectValidator, // "grant" | "deny"
  }))),

  // Override per-membership des modules. Si renseigné, prend le pas sur
  // position.moduleAccess (cf. getTasksForMembership). Absent = hérite de la
  // position. Permet aux admins d'attribuer un jeu de modules + niveaux
  // (reader/editor/admin) directement à un user dans une représentation.
  moduleAccess: v.optional(v.array(v.object({
    moduleCode: moduleCodeValidator,
    accessLevel: accessLevelValidator,
  }))),

  // Per-membership agent preferences (different per org)
  settings: v.optional(v.object({
    notifyOnNewRequest: v.optional(v.boolean()),    // Notify when new request arrives
    notifyOnAssignment: v.optional(v.boolean()),    // Notify when assigned a request
    dailyDigest: v.optional(v.boolean()),           // Daily summary email
  })),

  // Contact
  isPublicContact: v.optional(v.boolean()), // Visible in public contact directory

  // Profil métier diplomatique (iProfil)
  diplomaticProfile: v.optional(v.object({
    // Statut professionnel
    status: v.optional(v.union(
      v.literal("en_poste"),
      v.literal("en_mission"),
      v.literal("en_conge"),
      v.literal("en_formation"),
      v.literal("rapatrie"),
      v.literal("detache"),
    )),
    startDate: v.optional(v.number()),

    // Contact professionnel
    officePhone: v.optional(v.string()),
    officeExtension: v.optional(v.string()),
    officialEmail: v.optional(v.string()),

    // Compétences linguistiques
    languages: v.optional(v.array(v.object({
      code: v.string(),
      level: v.union(
        v.literal("native"),
        v.literal("fluent"),
        v.literal("advanced"),
        v.literal("intermediate"),
        v.literal("basic"),
      ),
    }))),

    // Accréditations
    credentials: v.optional(v.object({
      lettersOfCredence: v.optional(v.object({
        presentedDate: v.optional(v.number()),
        documentId: v.optional(v.id("documents")),
      })),
      diplomaticCard: v.optional(v.object({
        number: v.optional(v.string()),
        issuedAt: v.optional(v.number()),
        expiresAt: v.optional(v.number()),
      })),
      diplomaticPassport: v.optional(v.object({
        number: v.optional(v.string()),
        expiresAt: v.optional(v.number()),
      })),
      exequatur: v.optional(v.object({
        grantedDate: v.optional(v.number()),
      })),
    })),

    // Historique des affectations
    previousPostings: v.optional(v.array(v.object({
      position: v.string(),
      orgName: v.string(),
      country: v.string(),
      startDate: v.number(),
      endDate: v.optional(v.number()),
    }))),

    // Signature officielle (pour iCorrespondance + iDocument).
    // Les champs additionnels (uploadedAt, positionCodeAtUpload, displayName)
    // sont utilisés par le workflow de signature des documents officiels pour
    // tracer l'apposition historique même après mobilité de l'agent.
    officialSignature: v.optional(v.object({
      imageStorageId: v.optional(v.id("_storage")),
      title: v.optional(v.string()),
      uploadedAt: v.optional(v.number()),
      positionCodeAtUpload: v.optional(v.string()),
      displayName: v.optional(v.string()),
    })),

    // Photo officielle protocolaire
    officialPhotoStorageId: v.optional(v.id("_storage")),

    // Bio résumée
    bio: v.optional(v.string()),
  })),

  deletedAt: v.optional(v.number()), // Soft delete
})
  // Note: by_user_org can be used for "by_user" queries via prefix matching
  .index("by_user_org", ["userId", "orgId"])
  .index("by_org", ["orgId"])
  .index("by_user_org_deletedAt", ["userId", "orgId", "deletedAt"])
  .index("by_org_deletedAt", ["orgId", "deletedAt"]);
