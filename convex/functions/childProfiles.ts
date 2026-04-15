/**
 * Child Profiles Functions
 * 
 * CRUD operations for minor profiles.
 * Parents can create and manage profiles for their children.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { authQuery, authMutation } from "../lib/customFunctions";
import { error, ErrorCode } from "../lib/errors";
import { ChildProfileStatus, ServiceCategory, PublicUserType } from "../lib/constants";
import {
  genderValidator,
  childProfileStatusValidator,
  nationalityAcquisitionValidator,
  RequestStatus,
  RequestPriority,
  RegistrationType,
  RegistrationStatus,
  CountryCode,
} from "../lib/validators";
import { countryCodeValidator } from "../lib/countryCodeValidator";
import { parentInfoValidator } from "../schemas/childProfiles";
import { buildChildRegistrationFormData } from "../lib/registrationFormData";
import { logCortexAction } from "../lib/neocortex";
import { SIGNAL_TYPES, CATEGORIES_ACTION } from "../lib/types";

// ═══════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get my children profiles.
 *
 * Each child is enriched with a `links` summary so the UI can decide whether
 * to offer hard delete (no links) or soft deactivate (has linked requests or
 * a consular registration). Computed here rather than in separate queries to
 * avoid N+1 round trips.
 */
export const getMine = authQuery({
  args: {},
  handler: async (ctx) => {
    const children = await ctx.db
      .query("childProfiles")
      .withIndex("by_author", (q) => q.eq("authorUserId", ctx.user._id))
      .collect();

    // Fetch the user's requests once. Bounded set per user.
    const userRequests = await ctx.db
      .query("requests")
      .withIndex("by_user_status", (q) => q.eq("userId", ctx.user._id))
      .collect();

    return Promise.all(
      children.map(async (child) => {
        const registration = await ctx.db
          .query("consularRegistrations")
          .withIndex("by_childProfile", (q) =>
            q.eq("childProfileId", child._id),
          )
          .first();
        const linkedRequestsCount = userRequests.filter(
          (r) => r.profileId === child._id,
        ).length;
        return {
          ...child,
          links: {
            hasRegistration: !!registration,
            linkedRequestsCount,
          },
        };
      }),
    );
  },
});

/**
 * Get child profile by ID
 */
export const getById = authQuery({
  args: { id: v.id("childProfiles") },
  handler: async (ctx, args) => {
    const child = await ctx.db.get(args.id);
    
    if (!child) {
      return null;
    }

    // Only author can view
    if (child.authorUserId !== ctx.user._id) {
      throw error(ErrorCode.FORBIDDEN, "Access denied");
    }

    // Fetch associated documents if any
    const documents: Record<string, unknown> = {};
    if (child.documents) {
      const docKeys = Object.keys(child.documents) as Array<
        keyof typeof child.documents
      >;
      for (const key of docKeys) {
        const docId = child.documents[key];
        if (docId) {
          documents[key] = await ctx.db.get(docId);
        }
      }
    }

    return {
      ...child,
      documentsData: documents,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a child profile
 */
export const create = authMutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    birthDate: v.optional(v.number()),
    birthPlace: v.optional(v.string()),
    birthCountry: v.optional(countryCodeValidator),
    gender: v.optional(genderValidator),
    nationality: v.optional(countryCodeValidator),
    nationalityAcquisition: v.optional(nationalityAcquisitionValidator),
    countryOfResidence: v.optional(countryCodeValidator),
    parents: v.array(parentInfoValidator),
  },
  handler: async (ctx, args) => {
    const { firstName, lastName, birthDate, birthPlace, birthCountry, gender, nationality, nationalityAcquisition, countryOfResidence, parents } = args;

    return await ctx.db.insert("childProfiles", {
      authorUserId: ctx.user._id,
      status: ChildProfileStatus.Draft,
      countryOfResidence,
      identity: {
        firstName,
        lastName,
        birthDate,
        birthPlace,
        birthCountry,
        gender,
        nationality,
        nationalityAcquisition,
      },
      parents: parents.length > 0 ? parents : [],
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update child profile
 */
export const update = authMutation({
  args: {
    id: v.id("childProfiles"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    birthDate: v.optional(v.number()),
    birthPlace: v.optional(v.string()),
    birthCountry: v.optional(countryCodeValidator),
    gender: v.optional(genderValidator),
    nationality: v.optional(countryCodeValidator),
    nationalityAcquisition: v.optional(nationalityAcquisitionValidator),
    countryOfResidence: v.optional(countryCodeValidator),
    nipCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const child = await ctx.db.get(args.id);
    
    if (!child) {
      throw error(ErrorCode.NOT_FOUND, "Child profile not found");
    }

    if (child.authorUserId !== ctx.user._id) {
      throw error(ErrorCode.FORBIDDEN, "Access denied");
    }

    const { id, ...updates } = args;

    // Build identity updates
    const identityUpdates: Record<string, unknown> = { ...child.identity };
    if (updates.firstName) identityUpdates.firstName = updates.firstName;
    if (updates.lastName) identityUpdates.lastName = updates.lastName;
    if (updates.birthDate) identityUpdates.birthDate = updates.birthDate;
    if (updates.birthPlace) identityUpdates.birthPlace = updates.birthPlace;
    if (updates.birthCountry) identityUpdates.birthCountry = updates.birthCountry;
    if (updates.gender) identityUpdates.gender = updates.gender;
    if (updates.nationality) identityUpdates.nationality = updates.nationality;
    if (updates.nationalityAcquisition) identityUpdates.nationalityAcquisition = updates.nationalityAcquisition;

    await ctx.db.patch(args.id, {
      identity: identityUpdates as typeof child.identity,
      countryOfResidence: updates.countryOfResidence ?? child.countryOfResidence,
      nipCode: updates.nipCode ?? child.nipCode,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Update passport info
 */
export const updatePassport = authMutation({
  args: {
    id: v.id("childProfiles"),
    number: v.optional(v.string()),
    issueDate: v.optional(v.number()),
    expiryDate: v.optional(v.number()),
    issueAuthority: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const child = await ctx.db.get(args.id);
    
    if (!child) {
      throw error(ErrorCode.NOT_FOUND, "Child profile not found");
    }

    if (child.authorUserId !== ctx.user._id) {
      throw error(ErrorCode.FORBIDDEN, "Access denied");
    }

    const { id, ...passportInfo } = args;

    await ctx.db.patch(args.id, {
      passportInfo,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Update consular card
 */
export const updateConsularCard = authMutation({
  args: {
    id: v.id("childProfiles"),
    cardNumber: v.optional(v.string()),
    issuedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const child = await ctx.db.get(args.id);
    
    if (!child) {
      throw error(ErrorCode.NOT_FOUND, "Child profile not found");
    }

    if (child.authorUserId !== ctx.user._id) {
      throw error(ErrorCode.FORBIDDEN, "Access denied");
    }

    const { id, ...consularCard } = args;

    await ctx.db.patch(args.id, {
      consularCard,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Add/update parent info
 */
export const setParents = authMutation({
  args: {
    id: v.id("childProfiles"),
    parents: v.array(parentInfoValidator),
  },
  handler: async (ctx, args) => {
    const child = await ctx.db.get(args.id);
    
    if (!child) {
      throw error(ErrorCode.NOT_FOUND, "Child profile not found");
    }

    if (child.authorUserId !== ctx.user._id) {
      throw error(ErrorCode.FORBIDDEN, "Access denied");
    }

    await ctx.db.patch(args.id, {
      parents: args.parents,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Link document to child profile
 */
export const linkDocument = authMutation({
  args: {
    id: v.id("childProfiles"),
    documentType: v.union(
      v.literal("passport"),
      v.literal("birthCertificate"),
      v.literal("residencePermit"),
      v.literal("addressProof"),
      v.literal("photo")
    ),
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const child = await ctx.db.get(args.id);
    
    if (!child) {
      throw error(ErrorCode.NOT_FOUND, "Child profile not found");
    }

    if (child.authorUserId !== ctx.user._id) {
      throw error(ErrorCode.FORBIDDEN, "Access denied");
    }

    const documents = { ...(child.documents ?? {}) };
    documents[args.documentType] = args.documentId;

    await ctx.db.patch(args.id, {
      documents,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Submit child profile for validation
 */
export const submit = authMutation({
  args: { id: v.id("childProfiles") },
  handler: async (ctx, args) => {
    const child = await ctx.db.get(args.id);
    
    if (!child) {
      throw error(ErrorCode.NOT_FOUND, "Child profile not found");
    }

    if (child.authorUserId !== ctx.user._id) {
      throw error(ErrorCode.FORBIDDEN, "Access denied");
    }

    if (child.status !== ChildProfileStatus.Draft) {
      throw error(ErrorCode.VALIDATION_ERROR, "Profile already submitted");
    }

    await ctx.db.patch(args.id, {
      status: ChildProfileStatus.Pending,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Delete child profile (soft delete via status)
 */
/**
 * Hard-delete a child profile.
 *
 * Allowed only when the profile is not referenced by any request or consular
 * registration. If it is, we refuse the deletion so the linked records stay
 * consistent. The caller is expected to handle the VALIDATION_ERROR and prompt
 * the user accordingly.
 */
export const remove = authMutation({
  args: { id: v.id("childProfiles") },
  handler: async (ctx, args) => {
    const child = await ctx.db.get(args.id);

    if (!child) {
      throw error(ErrorCode.NOT_FOUND, "Child profile not found");
    }

    if (child.authorUserId !== ctx.user._id) {
      throw error(ErrorCode.FORBIDDEN, "Access denied");
    }

    // Block deletion when a consular registration is linked.
    const linkedRegistration = await ctx.db
      .query("consularRegistrations")
      .withIndex("by_childProfile", (q) => q.eq("childProfileId", args.id))
      .first();

    if (linkedRegistration) {
      throw error(
        ErrorCode.VALIDATION_ERROR,
        "CHILD_HAS_REGISTRATION",
      );
    }

    // Block deletion when any request is linked to this child profile.
    // No index on requests.profileId, so scan the user's requests (bounded set).
    const userRequests = await ctx.db
      .query("requests")
      .withIndex("by_user_status", (q) => q.eq("userId", ctx.user._id))
      .collect();
    const linkedRequest = userRequests.find((r) => r.profileId === args.id);

    if (linkedRequest) {
      throw error(ErrorCode.VALIDATION_ERROR, "CHILD_HAS_REQUEST");
    }

    // Cascade delete all documents uploaded for this child. Two paths to a
    // document: owned (`documents.ownerId === child._id`, i.e. via vault) or
    // referenced in `child.documents.*`. Union both so nothing leaks.
    const ownedDocs = await ctx.db
      .query("documents")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.id))
      .collect();

    const referencedIds = Object.values(child.documents ?? {}).filter(
      (id): id is Id<"documents"> => id !== undefined,
    );

    const seen = new Set<string>();
    const docsToDelete: typeof ownedDocs = [];
    for (const d of ownedDocs) {
      if (seen.has(d._id)) continue;
      seen.add(d._id);
      docsToDelete.push(d);
    }
    for (const id of referencedIds) {
      if (seen.has(id)) continue;
      const d = await ctx.db.get(id);
      if (d) {
        seen.add(id);
        docsToDelete.push(d);
      }
    }

    for (const doc of docsToDelete) {
      for (const file of doc.files) {
        try {
          await ctx.storage.delete(file.storageId);
        } catch {
          // Storage file may already be gone — continue.
        }
      }
      await ctx.db.delete(doc._id);
    }

    // Safe to hard-delete the profile itself.
    await ctx.db.delete(args.id);

    return args.id;
  },
});

/**
 * Soft-delete (archive) a child profile.
 *
 * Use when the profile is linked to a request or consular registration and
 * therefore cannot be hard-deleted. The profile is kept so historical records
 * stay consistent, but it is hidden from the default list and no longer
 * eligible for new actions.
 */
export const deactivate = authMutation({
  args: { id: v.id("childProfiles") },
  handler: async (ctx, args) => {
    const child = await ctx.db.get(args.id);

    if (!child) {
      throw error(ErrorCode.NOT_FOUND, "Child profile not found");
    }

    if (child.authorUserId !== ctx.user._id) {
      throw error(ErrorCode.FORBIDDEN, "Access denied");
    }

    if (child.status === ChildProfileStatus.Inactive) {
      // Idempotent: already archived, nothing to do.
      return args.id;
    }

    await ctx.db.patch(args.id, {
      status: ChildProfileStatus.Inactive,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Reactivate an archived child profile.
 *
 * Restores to Active if there is a linked consular registration, otherwise
 * back to Draft so the user can resume editing.
 */
export const reactivate = authMutation({
  args: { id: v.id("childProfiles") },
  handler: async (ctx, args) => {
    const child = await ctx.db.get(args.id);

    if (!child) {
      throw error(ErrorCode.NOT_FOUND, "Child profile not found");
    }

    if (child.authorUserId !== ctx.user._id) {
      throw error(ErrorCode.FORBIDDEN, "Access denied");
    }

    if (child.status !== ChildProfileStatus.Inactive) {
      // Already active in some form — make it a no-op.
      return args.id;
    }

    const linkedRegistration = await ctx.db
      .query("consularRegistrations")
      .withIndex("by_childProfile", (q) => q.eq("childProfileId", args.id))
      .first();

    await ctx.db.patch(args.id, {
      status: linkedRegistration
        ? ChildProfileStatus.Active
        : ChildProfileStatus.Draft,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// CONSULAR REGISTRATION FOR CHILDREN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Find the registration org for a child profile.
 * Uses child's countryOfResidence, falling back to parent's.
 */
export const findRegistrationOrg = authQuery({
  args: {
    childProfileId: v.id("childProfiles"),
  },
  handler: async (ctx, args) => {
    const child = await ctx.db.get(args.childProfileId);
    if (!child || child.authorUserId !== ctx.user._id) {
      return { status: "no_profile" as const };
    }

    // Determine country: child's own, or fallback to parent's
    let userCountry = child.countryOfResidence;
    if (!userCountry) {
      const parentProfile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
        .unique();
      userCountry =
        parentProfile?.countryOfResidence ||
        parentProfile?.addresses?.residence?.country;
    }

    if (!userCountry) {
      return { status: "no_country" as const };
    }

    // Find registration services
    const allServices = await ctx.db
      .query("services")
      .filter((q) =>
        q.and(
          q.eq(q.field("category"), ServiceCategory.Registration),
          q.eq(q.field("isActive"), true),
        ),
      )
      .collect();

    if (allServices.length === 0) {
      return { status: "no_service" as const, country: userCountry };
    }

    // Find an org with this service that has jurisdiction over the country
    for (const service of allServices) {
      const orgServices = await ctx.db
        .query("orgServices")
        .filter((q) =>
          q.and(
            q.eq(q.field("serviceId"), service._id),
            q.eq(q.field("isActive"), true),
          ),
        )
        .collect();

      for (const orgService of orgServices) {
        const org = await ctx.db.get(orgService.orgId);
        if (!org || !org.isActive || org.deletedAt) continue;

        const jurisdictions = org.jurisdictionCountries ?? [];
        if (jurisdictions.includes(userCountry as CountryCode)) {
          return {
            status: "found" as const,
            orgId: org._id,
            orgName: org.name,
            country: userCountry,
          };
        }
      }
    }

    return { status: "no_org_found" as const, country: userCountry };
  },
});

/**
 * Submit registration request for a child profile.
 * Finds the appropriate org, creates a request + consularRegistration entry,
 * and delegates submission to internalSubmit.
 */
export const submitRegistrationRequest = authMutation({
  args: {
    childProfileId: v.id("childProfiles"),
  },
  handler: async (ctx, args) => {
    const child = await ctx.db.get(args.childProfileId);
    if (!child || child.authorUserId !== ctx.user._id) {
      return { status: "no_profile" as const };
    }

    // Get parent profile for contact/address data and country fallback
    const parentProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();

    // Determine country
    let userCountry = child.countryOfResidence;
    if (!userCountry && parentProfile) {
      userCountry =
        parentProfile.countryOfResidence ||
        parentProfile.addresses?.residence?.country;
    }

    if (!userCountry) {
      return { status: "no_country" as const };
    }

    // Find registration services
    const allServices = await ctx.db
      .query("services")
      .filter((q) =>
        q.and(
          q.eq(q.field("category"), ServiceCategory.Registration),
          q.eq(q.field("isActive"), true),
        ),
      )
      .collect();

    if (allServices.length === 0) {
      return { status: "no_service" as const, country: userCountry };
    }

    // Find an org with this service that has jurisdiction
    for (const service of allServices) {
      const orgServices = await ctx.db
        .query("orgServices")
        .filter((q) =>
          q.and(
            q.eq(q.field("serviceId"), service._id),
            q.eq(q.field("isActive"), true),
          ),
        )
        .collect();

      for (const orgService of orgServices) {
        const org = await ctx.db.get(orgService.orgId);
        if (!org || !org.isActive || org.deletedAt) continue;

        const jurisdictions = org.jurisdictionCountries ?? [];
        if (jurisdictions.includes(userCountry as CountryCode)) {
          const now = Date.now();

          // Auto-attach documents from child's Document Vault
          const childDocs = child.documents ?? {};
          const documentIds = Object.values(childDocs).filter(
            (id): id is Id<"documents"> => id !== undefined,
          );

          // Build form data from child + parent profiles
          const durationStr = parentProfile?.userType || "long_stay";
          const formData = buildChildRegistrationFormData(
            child as any,
            (parentProfile ?? {}) as any,
            durationStr,
          );

          // Map userType to valid registration duration
          const registrationDuration =
            parentProfile?.userType === PublicUserType.ShortStay
              ? PublicUserType.ShortStay
              : PublicUserType.LongStay;

          // Create request as Draft — internalSubmit will transition to Submitted
          const requestId = await ctx.db.insert("requests", {
            userId: ctx.user._id,
            profileId: child._id,
            orgId: org._id,
            orgServiceId: orgService._id,
            reference: "",
            status: RequestStatus.Draft,
            priority: RequestPriority.Normal,
            formData,
            documents: documentIds,
            updatedAt: now,
          });

          // Create consularRegistration with childProfileId
          await ctx.db.insert("consularRegistrations", {
            childProfileId: child._id,
            orgId: org._id,
            requestId: requestId,
            duration: registrationDuration,
            type: RegistrationType.Inscription,
            status: RegistrationStatus.Requested,
            registeredAt: now,
          });

          // Update child profile with registration request reference
          await ctx.db.patch(args.childProfileId, {
            registrationRequestId: requestId,
            updatedAt: now,
          });

          // Delegate submission to centralized internalSubmit
          await ctx.scheduler.runAfter(0, internal.functions.requests.internalSubmit, {
            requestId,
            actorId: ctx.user._id,
            extraEventData: {
              orgId: org._id,
              serviceCategory: "registration",
              childProfileId: args.childProfileId,
            },
          });

          // NEOCORTEX: Signal
          await logCortexAction(ctx, {
            action: "SUBMIT_CHILD_REGISTRATION_REQUEST",
            categorie: CATEGORIES_ACTION.METIER,
            entiteType: "childProfiles",
            entiteId: args.childProfileId,
            userId: ctx.user._id,
            apres: {
              orgId: org._id,
              requestId,
              childProfileId: args.childProfileId,
            },
            signalType: SIGNAL_TYPES.INSCRIPTION_CONSULAIRE_CREEE,
          });

          return {
            status: "success" as const,
            orgId: org._id,
            orgName: org.name,
            reference: "(generating...)",
            requestId,
          };
        }
      }
    }

    return { status: "no_org_found" as const, country: userCountry };
  },
});
