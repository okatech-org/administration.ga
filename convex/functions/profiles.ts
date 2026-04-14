import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { authQuery, authMutation } from "../lib/customFunctions";
import { error, ErrorCode } from "../lib/errors";
import { calculateCompletionScore } from "../lib/utils";
import { legacyProfiles } from "../lib/legacyProfilesMap";
import {
  genderValidator,
  passportInfoValidator,
  EventType,
  profileAddressesValidator,
  profileContactsValidator,
  profileFamilyValidator,
  professionValidator,
  nationalityAcquisitionValidator,
  RequestStatus,
  RequestPriority,
  RegistrationType,
  RegistrationStatus,
  publicUserTypeValidator,
  CountryCode,
  registrationDurationValidator,
} from "../lib/validators";
import { ServiceCategory } from "../lib/constants";
import { countryCodeValidator } from "../lib/countryCodeValidator";
import { logCortexAction } from "../lib/neocortex";
import { SIGNAL_TYPES, CATEGORIES_ACTION } from "../lib/types";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Safely format a timestamp to YYYY-MM-DD string for form display.
 */
function formatDate(ts: number | undefined | null): string | undefined {
  if (!ts) return undefined;
  try {
    return new Date(ts).toISOString().split("T")[0];
  } catch {
    return undefined;
  }
}

/**
 * Build formData that maps profile fields to the consular registration
 * form template section/field IDs. This is the data that gets stored
 * with the request so the admin can see all submitted information.
 *
 * Keys follow the pattern: "sectionId.fieldId" matching formTemplates.ts
 * consular-card-registration template.
 */
export function buildRegistrationFormData(
  profile: Record<string, any>,
  duration: string,
): Record<string, unknown> {
  const identity = profile.identity ?? {};
  const passportInfo = profile.passportInfo ?? {};
  const family = profile.family ?? {};
  const addresses = profile.addresses ?? {};
  const contacts = profile.contacts ?? {};
  const profession = profile.profession ?? {};
  const residence = addresses.residence ?? {};
  const homeland = addresses.homeland ?? {};
  // Support both new array format and legacy fields
  const emergencyContacts = contacts.emergencyContacts ?? [];
  const emergencyRes = emergencyContacts[0] ?? contacts.emergencyResidence ?? {};
  const emergencyHome = emergencyContacts[1] ?? contacts.emergencyHomeland ?? {};

  return {
    // Meta
    type: "registration",
    profileId: profile._id,
    duration,

    // Section: basic_info
    basic_info: {
      last_name: identity.lastName || undefined,
      first_name: identity.firstName || undefined,
      nip: identity.nip || undefined,
      gender: identity.gender || undefined,
      birth_date: formatDate(identity.birthDate),
      birth_place: identity.birthPlace || undefined,
      birth_country: identity.birthCountry || undefined,
      nationality: identity.nationality || undefined,
      nationality_acquisition: identity.nationalityAcquisition || undefined,
    },

    // Section: passport_info
    passport_info: {
      passport_number: passportInfo.number || undefined,
      passport_issue_date: formatDate(passportInfo.issueDate),
      passport_expiry_date: formatDate(passportInfo.expiryDate),
      passport_issuing_authority: passportInfo.issuingAuthority || undefined,
    },

    // Section: family_info
    family_info: {
      marital_status: family.maritalStatus || undefined,
      father_last_name: family.father?.lastName || undefined,
      father_first_name: family.father?.firstName || undefined,
      mother_last_name: family.mother?.lastName || undefined,
      mother_first_name: family.mother?.firstName || undefined,
      spouse_last_name: family.spouse?.lastName || undefined,
      spouse_first_name: family.spouse?.firstName || undefined,
    },

    // Section: contact_info
    contact_info: {
      email: contacts.email || profile.email || undefined,
      phone: contacts.phone || profile.phone || undefined,
    },

    // Section: residence_address
    residence_address: {
      residence_street: residence.street || undefined,
      residence_city: residence.city || undefined,
      residence_postal_code: residence.postalCode || undefined,
      residence_country: residence.country || undefined,
    },

    // Section: homeland_address
    homeland_address: {
      homeland_street: homeland.street || undefined,
      homeland_city: homeland.city || undefined,
      homeland_postal_code: homeland.postalCode || undefined,
      homeland_country: homeland.country || undefined,
    },

    // Section: emergency contacts
    emergency_contacts: emergencyContacts.map((c: any) => ({
      last_name: c.lastName || undefined,
      first_name: c.firstName || undefined,
      phone: c.phone || undefined,
      email: c.email || undefined,
      country: c.country || undefined,
    })),

    // Section: professional_info
    professional_info: {
      work_status: profession.status || undefined,
      profession: profession.title || undefined,
      employer: profession.employer || undefined,
    },
  };
}

/**
 * Get current user's profile
 */
export const getMine = authQuery({
  args: {},
  handler: async (ctx) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();

    return profile;
  },
});

/**
 * Get profile by user ID
 */
export const getByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

/**
 * Update full profile (bulk)
 */
export const update = authMutation({
  args: {
    id: v.id("profiles"),
    countryOfResidence: v.optional(countryCodeValidator),
    identity: v.optional(
      v.object({
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
        birthDate: v.optional(v.number()),
        birthPlace: v.optional(v.string()),
        birthCountry: v.optional(countryCodeValidator),
        gender: v.optional(genderValidator),
        nationality: v.optional(countryCodeValidator),
        nationalityAcquisition: v.optional(nationalityAcquisitionValidator),
      }),
    ),
    contacts: v.optional(profileContactsValidator),
    family: v.optional(profileFamilyValidator),
    profession: v.optional(professionValidator),
    addresses: v.optional(profileAddressesValidator),
    passportInfo: v.optional(passportInfoValidator),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.id);

    if (!profile) {
      throw error(ErrorCode.PROFILE_NOT_FOUND);
    }

    const { id, ...rest } = args;

    const updates: Record<string, unknown> = {
      ...rest,
      updatedAt: Date.now(),
    };

    // Recalculate completion score
    const updatedProfile = { ...profile, ...updates };
    updates.completionScore = calculateCompletionScore(updatedProfile as any);

    await ctx.db.patch(profile._id, updates);

    // Log event
    await ctx.db.insert("events", {
      targetType: "profile",
      targetId: profile._id,
      actorId: ctx.user._id,
      type: EventType.ProfileUpdate,
      data: { method: "bulk_update" },
    });

    // NEOCORTEX: Signal profil modifié
    await logCortexAction(ctx, {
      action: "UPDATE_PROFILE",
      categorie: CATEGORIES_ACTION.UTILISATEUR,
      entiteType: "profiles",
      entiteId: profile._id,
      userId: ctx.user._id,
      signalType: SIGNAL_TYPES.PROFIL_MODIFIE,
    });

    return profile._id;
  },
});

/**
 * Get profile with auth status for frontend routing
 */
export const getMyProfileSafe = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { status: "unauthenticated", profile: null };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
      .unique();

    if (!user) {
      return { status: "user_not_synced", profile: null };
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    return { status: "ready", profile };
  },
});

/**
 * Request consular registration
 */
export const requestRegistration = authMutation({
  args: {
    orgId: v.id("orgs"),
    duration: registrationDurationValidator,
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();

    if (!profile) {
      throw error(ErrorCode.PROFILE_NOT_FOUND);
    }

    // Check existing registrations in consularRegistrations table
    const existingRegistrations = await ctx.db
      .query("consularRegistrations")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .collect();

    const activeAtOrg = existingRegistrations.find(
      (r) => r.orgId === args.orgId && r.status === "active",
    );

    if (activeAtOrg) {
      throw new Error("Déjà immatriculé auprès de cet organisme");
    }

    // Check for pending request at this org
    const pendingAtOrg = existingRegistrations.find(
      (r) => r.orgId === args.orgId && r.status === "requested",
    );

    if (pendingAtOrg) {
      // Already have pending request, return success
      return profile._id;
    }

    // Get registration service for this org
    const orgServices = await ctx.db
      .query("orgServices")
      .withIndex("by_org_active", (q) =>
        q.eq("orgId", args.orgId).eq("isActive", true),
      )
      .collect();

    // Find the registration category service
    let registrationOrgService = null;
    for (const os of orgServices) {
      const service = await ctx.db.get(os.serviceId);
      if (service?.category === "registration" && service.isActive) {
        registrationOrgService = os;
        break;
      }
    }

    if (!registrationOrgService) {
      throw error(ErrorCode.SERVICE_NOT_AVAILABLE);
    }

    // Generate reference number
    const now = Date.now();
    const year = new Date(now).getFullYear();
    const random = crypto.randomUUID().replace(/-/g, "").substring(0, 8).toUpperCase();
    const reference = `REG-${year}-${random}`;

    // Create actual request in requests table
    // Auto-attach documents from profile's Document Vault (convert typed object to array)
    const profileDocs = profile.documents ?? {};
    const documentIds = Object.values(profileDocs).filter(
      (id): id is typeof id & string => id !== undefined,
    );

    const requestId = await ctx.db.insert("requests", {
      userId: ctx.user._id,
      profileId: profile._id,
      orgId: args.orgId,
      orgServiceId: registrationOrgService._id,
      reference,
      status: RequestStatus.Submitted,
      priority: RequestPriority.Normal,
      formData: buildRegistrationFormData(profile as any, args.duration || "permanent"),
      // Auto-attach documents from profile vault
      documents: documentIds,
      submittedAt: now,
      updatedAt: now,
    });

    // Create entry in consularRegistrations table
    await ctx.db.insert("consularRegistrations", {
      profileId: profile._id,
      orgId: args.orgId,
      requestId: requestId,
      duration: args.duration,
      type: RegistrationType.Inscription,
      status: RegistrationStatus.Requested,
      registeredAt: now,
    });

    // Log event
    await ctx.db.insert("events", {
      targetType: "request",
      targetId: requestId as unknown as string,
      actorId: ctx.user._id,
      type: EventType.RequestSubmitted,
      data: {
        orgId: args.orgId,
        serviceCategory: "registration",
      },
    });

    // NEOCORTEX: Signal inscription consulaire
    await logCortexAction(ctx, {
      action: "REQUEST_REGISTRATION",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "profiles",
      entiteId: profile._id,
      userId: ctx.user._id,
      signalType: SIGNAL_TYPES.INSCRIPTION_CONSULAIRE_CREEE,
    });

    return profile._id;
  },
});

/**
 * Find the appropriate org for consular registration (read-only).
 * Does NOT create any request — just checks if an org exists.
 */
export const findRegistrationOrg = authQuery({
  args: {},
  handler: async (ctx) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();

    if (!profile) {
      return { status: "no_profile" as const };
    }

    if (profile.userType !== "long_stay") {
      return { status: "not_applicable" as const };
    }

    const userCountry =
      profile.countryOfResidence || profile.addresses?.residence?.country;

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

    // Find an org with this service that has jurisdiction over user's country
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
 * Submit registration request - finds appropriate org by user's country of residence
 * and creates a registration request automatically.
 * Only for long_stay and short_stay users.
 */
export const submitRegistrationRequest = authMutation({
  args: {},
  handler: async (ctx) => {
    // Get user's profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();

    if (!profile) {
      return { status: "no_profile" as const };
    }

    // Only for long_stay and short_stay
    if (profile.userType !== "long_stay" && profile.userType !== "short_stay") {
      return { status: "not_applicable" as const };
    }

    // Get user's country of residence
    const userCountry =
      profile.countryOfResidence || profile.addresses?.residence?.country;

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

    // Find an org with this service that has jurisdiction over user's country
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

          // Auto-attach documents from profile's Document Vault
          const profileDocs = profile.documents ?? {};
          const documentIds = Object.values(profileDocs).filter(
            (id): id is typeof id & string => id !== undefined,
          );

          // Create request as Draft — internalSubmit will transition to Submitted
          const requestId = await ctx.db.insert("requests", {
            userId: ctx.user._id,
            profileId: profile._id,
            orgId: org._id,
            orgServiceId: orgService._id,
            reference: "",
            status: RequestStatus.Draft,
            priority: RequestPriority.Normal,
            formData: buildRegistrationFormData(profile as any, profile.userType || "permanent"),
            documents: documentIds,
            updatedAt: now,
          });

          // Create entry in consularRegistrations table
          await ctx.db.insert("consularRegistrations", {
            profileId: profile._id,
            orgId: org._id,
            requestId: requestId,
            duration: profile.userType,
            type: RegistrationType.Inscription,
            status: RegistrationStatus.Requested,
            registeredAt: now,
          });

          // Delegate submission to centralized internalSubmit
          // (generates reference, transitions Draft→Pending, logs event, triggers AI)
          await ctx.scheduler.runAfter(0, internal.functions.requests.internalSubmit, {
            requestId,
            actorId: ctx.user._id,
            extraEventData: {
              orgId: org._id,
              serviceCategory: "registration",
            },
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

    // No org found with jurisdiction over user's country
    return { status: "no_org_found" as const, country: userCountry };
  },
});

// Note: Documents are now only attached to requests, not profiles
// Use the documents functions when creating/managing requests

// ============================================================================
// SIGNALEMENT CONSULAIRE (Short-Stay Notification)
// ============================================================================

/**
 * Find the appropriate org for consular notification / signalement (read-only).
 * User specifies the destination country they are traveling to.
 * Available to both long_stay and short_stay Gabonese citizens.
 */
export const findNotificationOrg = authQuery({
  args: {
    destinationCountry: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();

    if (!profile) {
      return { status: "no_profile" as const };
    }

    if (profile.userType !== "long_stay" && profile.userType !== "short_stay") {
      return { status: "not_applicable" as const };
    }

    const targetCountry = args.destinationCountry;

    // Find the specific consular-notification service by slug
    const notificationService = await ctx.db
      .query("services")
      .withIndex("by_slug", (q) => q.eq("slug", "consular-notification"))
      .unique();

    if (!notificationService || !notificationService.isActive) {
      return { status: "no_service" as const, country: targetCountry };
    }

    // Find an org with this service activated and jurisdiction over the destination country
    const orgServices = await ctx.db
      .query("orgServices")
      .withIndex("by_service_active", (q) =>
        q.eq("serviceId", notificationService._id).eq("isActive", true)
      )
      .collect();

    for (const orgService of orgServices) {
      const org = await ctx.db.get(orgService.orgId);
      if (!org || !org.isActive || org.deletedAt) continue;

      const jurisdictions = org.jurisdictionCountries ?? [];
      if (jurisdictions.includes(targetCountry as CountryCode)) {
        return {
          status: "found" as const,
          orgId: org._id,
          orgName: org.name,
          country: targetCountry,
        };
      }
    }

    return { status: "no_org_found" as const, country: targetCountry };
  },
});

/**
 * Submit notification (signalement) request.
 * User specifies the destination country they are traveling to.
 * Available to both long_stay and short_stay Gabonese citizens.
 */
export const submitNotificationRequest = authMutation({
  args: {
    destinationCountry: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();

    if (!profile) {
      return { status: "no_profile" as const };
    }

    if (profile.userType !== "long_stay" && profile.userType !== "short_stay") {
      return { status: "not_applicable" as const };
    }

    const targetCountry = args.destinationCountry;

    // Find the specific consular-notification service by slug
    const notificationService = await ctx.db
      .query("services")
      .withIndex("by_slug", (q) => q.eq("slug", "consular-notification"))
      .unique();

    if (!notificationService || !notificationService.isActive) {
      return { status: "no_service" as const, country: targetCountry };
    }

    // Find org with this service activated and jurisdiction over destination country
    const orgServices = await ctx.db
      .query("orgServices")
      .withIndex("by_service_active", (q) =>
        q.eq("serviceId", notificationService._id).eq("isActive", true)
      )
      .collect();

    for (const orgService of orgServices) {
      const org = await ctx.db.get(orgService.orgId);
      if (!org || !org.isActive || org.deletedAt) continue;

      const jurisdictions = org.jurisdictionCountries ?? [];
      if (jurisdictions.includes(targetCountry as CountryCode)) {
        const now = Date.now();

        // Auto-attach documents from profile vault
        const profileDocs = profile.documents ?? {};
        const documentIds = Object.values(profileDocs).filter(
          (id): id is typeof id & string => id !== undefined,
        );

        // Create request as Draft — internalSubmit will transition to Submitted
        const requestId = await ctx.db.insert("requests", {
          userId: ctx.user._id,
          profileId: profile._id,
          orgId: org._id,
          orgServiceId: orgService._id,
          reference: "",
          status: RequestStatus.Draft,
          priority: RequestPriority.Normal,
          formData: buildRegistrationFormData(profile as any, profile.userType || "short_stay"),
          documents: documentIds,
          updatedAt: now,
        });

        // Create entry in consularNotifications table
        await ctx.db.insert("consularNotifications", {
          profileId: profile._id,
          orgId: org._id,
          requestId: requestId,
          type: RegistrationType.Inscription,
          status: RegistrationStatus.Requested,
          signaledAt: now,
        });

        // Update profile with signaledToOrgId
        await ctx.db.patch(profile._id, {
          signaledToOrgId: org._id,
        });

        // Delegate submission to centralized internalSubmit
        // (generates reference, transitions Draft→Pending, logs event, triggers AI)
        await ctx.scheduler.runAfter(0, internal.functions.requests.internalSubmit, {
          requestId,
          actorId: ctx.user._id,
          extraEventData: {
            orgId: org._id,
            serviceCategory: "notification",
            notificationType: "signalement",
            destinationCountry: targetCountry,
          },
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

    return { status: "no_org_found" as const, country: targetCountry };
  },
});

/**
 * Upsert profile (create or update)
 */
export const upsert = authMutation({
  args: {
    countryOfResidence: v.optional(countryCodeValidator),
    identity: v.optional(
      v.object({
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
        birthDate: v.optional(v.number()),
        birthPlace: v.optional(v.string()),
        birthCountry: v.optional(countryCodeValidator),
        gender: v.optional(genderValidator),
        nationality: v.optional(countryCodeValidator),
        nationalityAcquisition: v.optional(nationalityAcquisitionValidator),
      }),
    ),
    contacts: v.optional(profileContactsValidator),
    family: v.optional(profileFamilyValidator),
    profession: v.optional(professionValidator),
    addresses: v.optional(profileAddressesValidator),
    passportInfo: v.optional(passportInfoValidator),
    isNational: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();

    const updates = {
      ...args,
      updatedAt: Date.now(),
    };

    if (existing) {
      // Update
      await ctx.db.patch(existing._id, { ...updates });

      // NEOCORTEX: Signal profil modifié
      await logCortexAction(ctx, {
        action: "UPDATE_PROFILE",
        categorie: CATEGORIES_ACTION.UTILISATEUR,
        entiteType: "profiles",
        entiteId: existing._id,
        userId: ctx.user._id,
        signalType: SIGNAL_TYPES.PROFIL_MODIFIE,
      });

      return existing._id;
    } else {
      // Create
      const newProfile = {
        userId: ctx.user._id,
        identity: {},
        addresses: {},
        contacts: {},
        family: {},
        ...updates,
      };
      const completionScore = calculateCompletionScore(newProfile as any);

      const id = await ctx.db.insert("profiles", {
        ...newProfile,
        completionScore,
      } as any);

      // Log event
      await ctx.db.insert("events", {
        targetType: "profile",
        targetId: id,
        actorId: ctx.user._id,
        type: EventType.ProfileCreated,
        data: { method: "upsert" },
      });

      // NEOCORTEX: Signal profil créé
      await logCortexAction(ctx, {
        action: "CREATE_PROFILE",
        categorie: CATEGORIES_ACTION.UTILISATEUR,
        entiteType: "profiles",
        entiteId: id,
        userId: ctx.user._id,
        signalType: SIGNAL_TYPES.PROFIL_CREE,
      });

      return id;
    }
  },
});

/**
 * Create profile from registration form
 * Adapts flat registration form data to profile schema
 */
export const createFromRegistration = authMutation({
  args: {
    userType: publicUserTypeValidator,
    identity: v.optional(
      v.object({
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
        nip: v.optional(v.string()),
        gender: v.optional(genderValidator),
        birthDate: v.optional(v.string()),
        birthPlace: v.optional(v.string()),
        birthCountry: v.optional(countryCodeValidator),
        nationality: v.optional(countryCodeValidator),
        nationalityAcquisition: v.optional(v.string()),
      }),
    ),
    passportInfo: v.optional(
      v.object({
        number: v.optional(v.string()),
        issueDate: v.optional(v.string()),
        expiryDate: v.optional(v.string()),
        issuingAuthority: v.optional(v.string()),
      }),
    ),
    addresses: v.optional(
      v.object({
        residence: v.optional(
          v.object({
            street: v.optional(v.string()),
            city: v.optional(v.string()),
            postalCode: v.optional(v.string()),
            country: v.optional(countryCodeValidator),
          }),
        ),
        homeland: v.optional(
          v.object({
            street: v.optional(v.string()),
            city: v.optional(v.string()),
            postalCode: v.optional(v.string()),
            country: v.optional(countryCodeValidator),
          }),
        ),
      }),
    ),
    family: v.optional(
      v.object({
        maritalStatus: v.optional(v.string()),
        father: v.optional(
          v.object({
            firstName: v.optional(v.string()),
            lastName: v.optional(v.string()),
          }),
        ),
        mother: v.optional(
          v.object({
            firstName: v.optional(v.string()),
            lastName: v.optional(v.string()),
          }),
        ),
        spouse: v.optional(
          v.object({
            firstName: v.optional(v.string()),
            lastName: v.optional(v.string()),
          }),
        ),
      }),
    ),
    profession: v.optional(
      v.object({
        status: v.optional(v.string()),
        title: v.optional(v.string()),
        employer: v.optional(v.string()),
      }),
    ),
    // Direct contact info (email & phone) — previously missing, causing data loss
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    emergencyContacts: v.optional(
      v.array(
        v.object({
          firstName: v.optional(v.string()),
          lastName: v.optional(v.string()),
          phone: v.optional(v.string()),
          email: v.optional(v.string()),
          country: v.optional(v.string()),
        }),
      ),
    ),
    // Legacy fields — kept for backward compatibility during migration
    emergencyResidence: v.optional(
      v.object({
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
        phone: v.optional(v.string()),
        email: v.optional(v.string()),
      }),
    ),
    emergencyHomeland: v.optional(
      v.object({
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
        phone: v.optional(v.string()),
        email: v.optional(v.string()),
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();

    const now = Date.now();

    // Convert birthDate string to timestamp if provided
    let birthDateTimestamp: number | undefined;
    if (args.identity?.birthDate) {
      const parsed = new Date(args.identity.birthDate);
      if (!isNaN(parsed.getTime())) {
        birthDateTimestamp = parsed.getTime();
      }
    }

    // Convert passport dates (string) to timestamps
    let passportData:
      | {
          number: string;
          issueDate: number;
          expiryDate: number;
          issuingAuthority: string;
        }
      | undefined;
    if (args.passportInfo?.number) {
      const issueDate =
        args.passportInfo.issueDate ?
          new Date(args.passportInfo.issueDate).getTime()
        : 0;
      const expiryDate =
        args.passportInfo.expiryDate ?
          new Date(args.passportInfo.expiryDate).getTime()
        : 0;
      passportData = {
        number: args.passportInfo.number,
        issueDate: isNaN(issueDate) ? 0 : issueDate,
        expiryDate: isNaN(expiryDate) ? 0 : expiryDate,
        issuingAuthority: args.passportInfo.issuingAuthority || "",
      };
    }

    const profileData = {
      identity:
        args.identity ?
          {
            firstName: args.identity.firstName || "",
            lastName: args.identity.lastName || "",
            nip: args.identity.nip,
            gender: args.identity.gender,
            birthDate: birthDateTimestamp,
            birthPlace: args.identity.birthPlace,
            birthCountry: args.identity.birthCountry,
            nationality: args.identity.nationality,
            nationalityAcquisition: args.identity.nationalityAcquisition as any,
          }
        : {},
      passportInfo: passportData,
      addresses: args.addresses || {},
      family:
        args.family ?
          {
            maritalStatus: args.family.maritalStatus as any,
            father: args.family.father,
            mother: args.family.mother,
            spouse: args.family.spouse,
          }
        : {},
      profession:
        args.profession ?
          {
            status: args.profession.status as any,
            title: args.profession.title,
            employer: args.profession.employer,
          }
        : {},
      contacts: {
        email: args.email || undefined,
        phone: args.phone || undefined,
        // New format: dynamic array of emergency contacts
        ...(args.emergencyContacts && args.emergencyContacts.length > 0
          ? {
              emergencyContacts: args.emergencyContacts
                .filter((c) => c.firstName || c.lastName || c.phone)
                .map((c) => ({
                  firstName: c.firstName || "",
                  lastName: c.lastName || "",
                  phone: c.phone || "",
                  email: c.email || undefined,
                  country: c.country || undefined,
                })),
            }
          : {}),
        // Legacy fallback for old clients
        ...(args.emergencyResidence ?
          {
            emergencyResidence: {
              firstName: args.emergencyResidence.firstName || "",
              lastName: args.emergencyResidence.lastName || "",
              phone: args.emergencyResidence.phone || "",
              email: args.emergencyResidence.email,
            },
          }
        : {}),
        ...(args.emergencyHomeland ?
          {
            emergencyHomeland: {
              firstName: args.emergencyHomeland.firstName || "",
              lastName: args.emergencyHomeland.lastName || "",
              phone: args.emergencyHomeland.phone || "",
              email: args.emergencyHomeland.email,
            },
          }
        : {}),
      },
      userType: args.userType as any,
      countryOfResidence: args.addresses?.residence?.country,
      documents: args.documents ?? undefined,
      updatedAt: now,
    };

    if (existing) {
      // Update existing profile
      await ctx.db.patch(existing._id, profileData as any);

      await ctx.db.insert("events", {
        targetType: "profile",
        targetId: existing._id,
        actorId: ctx.user._id,
        type: EventType.ProfileUpdate,
        data: { method: "registration_form" },
      });

      return existing._id;
    } else {
      const id = await ctx.db.insert("profiles", {
        userId: ctx.user._id,
        ...profileData,
      } as any);

      await ctx.db.insert("events", {
        targetType: "profile",
        targetId: id,
        actorId: ctx.user._id,
        type: EventType.ProfileCreated,
        data: { method: "registration_form" },
      });

      return id;
    }
  },
});

/**
 * Get public profile by ID (used for consular card verification)
 */
export const getPublicProfile = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) return null;

    let isAuthorizedViewer = false;
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (identity) {
        const user = await ctx.db
          .query("users")
          .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
          .unique();
          
        if (user) {
          if (user.isSuperadmin) {
            isAuthorizedViewer = true;
          } else {
            // Check if user has any active membership (not soft-deleted)
            const memberships = await ctx.db
              .query("memberships")
              .withIndex("by_user_org_deletedAt", (q) => q.eq("userId", user._id))
              .collect();
            if (memberships.some((m) => m.deletedAt === undefined)) {
              isAuthorizedViewer = true;
            }
          }
        }
      }
    } catch (e) {
      // Not authenticated, ignore
    }

    let photoUrl = undefined;
    if (profile.documents?.identityPhoto) {
      const doc = await ctx.db.get(profile.documents.identityPhoto);
      if (doc && doc.files && doc.files.length > 0) {
        const url = await ctx.storage.getUrl(doc.files[0].storageId);
        if (url) photoUrl = url;
      }
    }

    if (isAuthorizedViewer) {
      // Returns full profile with authorization flag
      return { ...profile, authorized: true, photoUrl };
    }

    // Returns limited profile
    return {
      _id: profile._id,
      identity: {
        firstName: profile.identity?.firstName,
        lastName: profile.identity?.lastName,
      },
      consularCard: profile.consularCard,
      authorized: false,
      photoUrl,
    };
  },
});

/**
 * Resolve legacy profile ID to new profile ID
 */
export const getProfilIdFromPublicId = query({
  args: { publicId: v.string() },
  handler: async (ctx, args) => {
    // 1. Try to see if it's already a valid Convex ID for profiles
    const normalizedId = ctx.db.normalizeId("profiles", args.publicId);
    if (normalizedId) {
      const isProfile = await ctx.db.get(normalizedId);
      if (isProfile) {
        return normalizedId;
      }
    }

    // 2. Check the legacy mapping
    const mapped = legacyProfiles[args.publicId];
    if (mapped) {
      return mapped;
    }

    return null;
  },
});

/**
 * Unified public verification endpoint.
 * Accepts either:
 * - A card number (e.g. "FR25280498-00407") → looks up consularRegistrations
 * - A notification number (e.g. "SIG-FR25-00001") → looks up consularNotifications
 * - A legacy/current profile ID → looks up via legacy map
 *
 * Returns profile summary + consular record info depending on type and auth level.
 */
export const verifyByIdentifier = query({
  args: { identifier: v.string() },
  handler: async (ctx, args) => {
    const { identifier } = args;

    // --- Determine auth level ---
    let isAuthorizedViewer = false;
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (identity) {
        const user = await ctx.db
          .query("users")
          .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
          .unique();
        if (user) {
          if (user.isSuperadmin) {
            isAuthorizedViewer = true;
          } else {
            const memberships = await ctx.db
              .query("memberships")
              .withIndex("by_user_org_deletedAt", (q) => q.eq("userId", user._id))
              .collect();
            if (memberships.some((m) => m.deletedAt === undefined)) {
              isAuthorizedViewer = true;
            }
          }
        }
      }
    } catch {
      // Not authenticated
    }

    // --- Helper to get profile photo ---
    async function getProfilePhoto(profileId: Id<"profiles">) {
      const profile = await ctx.db.get(profileId);
      if (!profile?.documents?.identityPhoto) return undefined;
      const doc = await ctx.db.get(profile.documents.identityPhoto);
      if (!doc?.files?.length) return undefined;
      return await ctx.storage.getUrl(doc.files[0].storageId);
    }

    // --- Route 1: Notification number (SIG-...) ---
    if (identifier.startsWith("SIG-")) {
      const notification = await ctx.db
        .query("consularNotifications")
        .withIndex("by_notification_number", (q) =>
          q.eq("notificationNumber", identifier),
        )
        .first();

      if (!notification) return { found: false, type: "notification" as const };

      const profile = await ctx.db.get(notification.profileId);
      const photoUrl = await getProfilePhoto(notification.profileId);

      return {
        found: true,
        type: "notification" as const,
        authorized: isAuthorizedViewer,
        identifier: notification.notificationNumber,
        status: notification.status,
        stayStartDate: notification.stayStartDate,
        stayEndDate: notification.stayEndDate,
        signaledAt: notification.signaledAt,
        activatedAt: notification.activatedAt,
        identity: {
          firstName: profile?.identity?.firstName,
          lastName: profile?.identity?.lastName,
        },
        photoUrl,
        // Extra fields for authorized viewers
        ...(isAuthorizedViewer && profile ? {
          fullIdentity: profile.identity,
          passportInfo: profile.passportInfo,
          contacts: profile.contacts,
        } : {}),
      };
    }

    // --- Route 2: Card number (XX00DDMMYY-NNNNN format) ---
    const registration = await ctx.db
      .query("consularRegistrations")
      .withIndex("by_card_number", (q) => q.eq("cardNumber", identifier))
      .first();

    if (registration) {
      const profile = registration.profileId ? await ctx.db.get(registration.profileId) : null;
      const photoUrl = registration.profileId ? await getProfilePhoto(registration.profileId) : null;

      const isExpired = registration.cardExpiresAt
        ? registration.cardExpiresAt < Date.now()
        : false;

      return {
        found: true,
        type: "registration" as const,
        authorized: isAuthorizedViewer,
        identifier: registration.cardNumber,
        status: registration.status,
        cardIssuedAt: registration.cardIssuedAt,
        cardExpiresAt: registration.cardExpiresAt,
        isExpired,
        duration: registration.duration,
        identity: {
          firstName: profile?.identity?.firstName,
          lastName: profile?.identity?.lastName,
        },
        photoUrl,
        // Extra fields for authorized viewers
        ...(isAuthorizedViewer && profile ? {
          fullIdentity: profile.identity,
          passportInfo: profile.passportInfo,
          contacts: profile.contacts,
        } : {}),
      };
    }

    // --- Route 3: Legacy profile ID fallback ---
    const mapped = legacyProfiles[identifier];
    const profileId = mapped
      ? ctx.db.normalizeId("profiles", mapped)
      : ctx.db.normalizeId("profiles", identifier);

    if (profileId) {
      const profile = await ctx.db.get(profileId);
      if (profile) {
        const photoUrl = await getProfilePhoto(profileId);
        return {
          found: true,
          type: "legacy" as const,
          authorized: isAuthorizedViewer,
          profileId: profile._id,
          identity: {
            firstName: profile.identity?.firstName,
            lastName: profile.identity?.lastName,
          },
          consularCard: profile.consularCard,
          photoUrl,
        };
      }
    }

    return { found: false, type: "unknown" as const };
  },
});

/**
 * Superadmin: Search profiles globally
 */
export const searchProfiles = query({
  args: {
    paginationOpts: paginationOptsValidator,
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let paginatedResult;

    if (args.searchTerm && args.searchTerm.trim() !== "") {
      const term = args.searchTerm.trim();
      
      // Perform two searches and combine (taking top results)
      const hitsLast = await ctx.db
        .query("profiles")
        .withSearchIndex("search_lastName", (q) => q.search("identity.lastName", term))
        .take(25);
        
      const hitsFirst = await ctx.db
        .query("profiles")
        .withSearchIndex("search_firstName", (q) => q.search("identity.firstName", term))
        .take(25);
        
      const seen = new Set<string>();
      const combined = [...hitsLast, ...hitsFirst].filter((p) => {
        if (seen.has(p._id)) return false;
        seen.add(p._id);
        return true;
      });

      paginatedResult = {
        page: combined,
        isDone: true,
        continueCursor: "",
      };
    } else {
      paginatedResult = await ctx.db
        .query("profiles")
        .order("desc")
        .paginate(args.paginationOpts);
    }

    // Batch-resolve orgs for managedByOrgId / signaledToOrgId
    const orgIds = new Set<string>();
    for (const p of paginatedResult.page) {
      if (p.managedByOrgId) orgIds.add(p.managedByOrgId as string);
      if (p.signaledToOrgId) orgIds.add(p.signaledToOrgId as string);
    }
    const orgMap = new Map<string, { _id: string; name: string; shortName?: string; type: string; country: string }>();
    await Promise.all(
      [...orgIds].map(async (id) => {
        const org = await ctx.db.get(id as Id<"orgs">);
        if (org && !org.deletedAt) {
          orgMap.set(id, {
            _id: org._id,
            name: org.name,
            shortName: org.shortName,
            type: org.type,
            country: org.country,
          });
        }
      }),
    );

    // Enrich with user info, org info, photo URL, and child count
    const page = await Promise.all(
      paginatedResult.page.map(async (p) => {
        // User data
        let user = null;
        let avatarUrl: string | undefined;
        if (p.userId) {
          const u = await ctx.db.get(p.userId);
          if (u) {
            user = { email: u.email, name: u.name };
            avatarUrl = u.avatarUrl;
          }
        }

        // Identity photo URL
        let photoUrl: string | undefined;
        if (p.documents?.identityPhoto) {
          try {
            const doc = await ctx.db.get(p.documents.identityPhoto);
            if (doc?.files?.length) {
              photoUrl = await ctx.storage.getUrl(doc.files[0].storageId) ?? undefined;
            }
          } catch {
            // Photo not available
          }
        }

        // Child count
        let childCount = 0;
        if (p.userId) {
          const children = await ctx.db
            .query("childProfiles")
            .withIndex("by_author", (q) => q.eq("authorUserId", p.userId))
            .collect();
          childCount = children.length;
        }

        return {
          ...p,
          user,
          avatarUrl,
          photoUrl,
          childCount,
          managedByOrg: p.managedByOrgId ? orgMap.get(p.managedByOrgId as string) ?? null : null,
          signaledToOrg: p.signaledToOrgId ? orgMap.get(p.signaledToOrgId as string) ?? null : null,
        };
      })
    );

    return { ...paginatedResult, page };
  },
});

/**
 * Superadmin & Admin: Get detailed profile data including relations
 */
export const getProfileDetail = authQuery({
  args: { profileId: v.union(v.id("profiles"), v.id("childProfiles")) },
  handler: async (ctx, args) => {
    let profile: any = await ctx.db.get(args.profileId as any);
    
    if (!profile) return null;

    const isChild = !!profile.authorUserId;

    let user: any = null;
    const userId = isChild ? profile.authorUserId : profile.userId;
    if (userId) {
      user = await ctx.db.get(userId);
    }

    // Children created by this user
    const children = (!isChild && profile.userId)
      ? await ctx.db
          .query("childProfiles")
          .withIndex("by_author", (q) => q.eq("authorUserId", profile.userId))
          .collect()
      : [];

    // Documents (owned by the profile or user)
    const docsByProfile = await ctx.db
      .query("documents")
      .withIndex("by_owner", (q) => q.eq("ownerId", profile._id))
      .collect();
      
    const docsByUser = userId
      ? await ctx.db
          .query("documents")
          .withIndex("by_owner", (q) => q.eq("ownerId", userId))
          .collect()
      : [];
      
    const allDocs = [...docsByProfile, ...docsByUser];
    const uniqueDocs = Array.from(
      new Map(allDocs.map((d) => [d._id, d])).values()
    );

    // Requests associated with this profile
    const requests = await ctx.db
      .query("requests")
      .filter((q) => q.eq(q.field("profileId"), profile._id))
      .collect();

    // Enrich requests with service details
    const enrichedRequests = await Promise.all(
      requests.map(async (r) => {
        const orgService = await ctx.db.get(r.orgServiceId);
        const service = orgService ? await ctx.db.get(orgService.serviceId) : null;
        return {
          ...r,
          serviceName: service?.name,
        };
      })
    );

    const registrations = isChild 
      ? await ctx.db
          .query("consularRegistrations")
          .withIndex("by_childProfile", (q) => q.eq("childProfileId", profile._id))
          .collect()
      : await ctx.db
          .query("consularRegistrations")
          .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
          .collect();

    // Representations: orgs with jurisdiction over the profile's country of residence
    const residenceCountry =
      profile.countryOfResidence || profile.addresses?.residence?.country;

    let representations: {
      name: string;
      type: string;
      country: string;
      slug: string;
    }[] = [];

    if (residenceCountry) {
      const allOrgs = await ctx.db
        .query("orgs")
        .withIndex("by_active_notDeleted", (q) =>
          q.eq("isActive", true).eq("deletedAt", undefined),
        )
        .take(200);

      const diplomaticTypes = [
        "embassy",
        "consulate",
        "general_consulate",
        "high_representation",
        "high_commission",
        "permanent_mission",
      ];

      representations = allOrgs
        .filter(
          (org) =>
            diplomaticTypes.includes(org.type) &&
            org.jurisdictionCountries &&
            org.jurisdictionCountries.length > 0 &&
            org.jurisdictionCountries.includes(residenceCountry as any),
        )
        .map((org) => ({
          name: org.name,
          type: org.type,
          country: org.country,
          slug: org.slug,
        }));
    }

    return {
      profile,
      user: user ? { _id: user._id, email: user.email, name: user.name } : null,
      children,
      documents: uniqueDocs,
      requests: enrichedRequests,
      registrations,
      representations,
    };
  },
});
/**
 * Agent: Search profiles related to the agent's org
 *
 * Returns profiles that have any link to this org:
 *  1. Request.profileId → profile directly linked to a request for this org
 *  2. Request.userId   → look up the user's profile (requests don't always have profileId)
 *  3. consularRegistrations.profileId linked to this org
 *  4. profiles.signaledToOrgId = this org (citizen signaled their presence)
 *  5. profiles.managedByOrgId  = this org (directly managed)
 *
 * Used by Affaires Consulaires > Profils Citoyens in agent-web ONLY.
 * NEVER exposed to citizen-web.
 */
export const searchConsularProfiles = authQuery({
  args: {
    searchTerm: v.optional(v.string()),
    orgId: v.id("orgs"),
  },
  handler: async (ctx, args) => {
    const { searchTerm, orgId } = args;

    const profileIds = new Set<string>();

    // ── Strategy 1 & 2: Requests to this org (capped at 500) ─────────────
    const orgRequests = await ctx.db
      .query("requests")
      .withIndex("by_org_status", (q) => q.eq("orgId", orgId))
      .take(500); // Guard against exceeding Convex 4096 read limit

    const userIdsFromRequests = new Set<string>();
    for (const r of orgRequests) {
      if (r.profileId) profileIds.add(r.profileId as string);
      if (r.userId) userIdsFromRequests.add(r.userId as string);
    }

    // Resolve userId → profile (batched, already unique userIds)
    if (userIdsFromRequests.size > 0) {
      const profilesByUser = await Promise.all(
        [...userIdsFromRequests].slice(0, 200).map((uid) =>
          ctx.db
            .query("profiles")
            .withIndex("by_user", (q) => q.eq("userId", uid as Id<"users">))
            .unique(),
        ),
      );
      for (const p of profilesByUser) {
        if (p) profileIds.add(p._id as string);
      }
    }

    // ── Strategy 3: Consular registrations (capped at 200) ────────────────
    const registrations = await ctx.db
      .query("consularRegistrations")
      .withIndex("by_org_status", (q) => q.eq("orgId", orgId))
      .take(200);
    for (const reg of registrations) {
      if (reg.profileId) profileIds.add(reg.profileId as string);
    }

    // ── Strategy 4: profiles.signaledToOrgId (filter scan, capped) ────────
    const signaled = await ctx.db
      .query("profiles")
      .filter((q) => q.eq(q.field("signaledToOrgId"), orgId))
      .take(500);
    for (const p of signaled) profileIds.add(p._id as string);

    // ── Strategy 5: profiles.managedByOrgId (filter scan, capped) ─────────
    const managed = await ctx.db
      .query("profiles")
      .filter((q) => q.eq(q.field("managedByOrgId"), orgId))
      .take(500);
    for (const p of managed) profileIds.add(p._id as string);

    // ── Fetch all resolved profiles (deduplicated) ─────────────────────────
    // Limit to 200 to stay safe on enrichment reads
    const cappedIds = [...profileIds].slice(0, 200);
    const allProfiles = await Promise.all(
      cappedIds.map((id) => ctx.db.get(id as Id<"profiles">)),
    );
    const validProfiles = allProfiles.filter(Boolean) as any[];


    // ── Apply text search filter ───────────────────────────────────────────
    let filtered = validProfiles;
    if (searchTerm && searchTerm.trim() !== "") {
      const term = searchTerm.trim().toLowerCase();
      filtered = validProfiles.filter((p) => {
        const first = (p.identity?.firstName || "").toLowerCase();
        const last = (p.identity?.lastName || "").toLowerCase();
        const passport = (p.passportInfo?.number || "").toLowerCase();
        const email = (p.contacts?.email || "").toLowerCase();
        return (
          first.includes(term) ||
          last.includes(term) ||
          `${first} ${last}`.includes(term) ||
          passport.includes(term) ||
          email.includes(term)
        );
      });
    }

    // ── Enrich profiles with user info, photo, request count ──────────────
    const enriched = await Promise.all(
      filtered.map(async (p) => {
        // User info
        let user = null;
        let avatarUrl: string | undefined;
        if (p.userId) {
          const u = await ctx.db.get(p.userId) as any;
          if (u) {
            user = { _id: u._id, email: u.email, name: u.name };
            avatarUrl = u.avatarUrl;
          }
        }

        // Identity photo
        let photoUrl: string | undefined;
        if (p.documents?.identityPhoto) {
          try {
            const doc = await ctx.db.get(p.documents.identityPhoto) as any;
            if (doc?.files?.length) {
              photoUrl = (await ctx.storage.getUrl(doc.files[0].storageId)) ?? undefined;
            }
          } catch {
            // Photo not available
          }
        }


        // Request count (profileId match OR userId match via orgRequests)
        const profileRequests = orgRequests.filter(
          (r) =>
            r.profileId === p._id ||
            (p.userId && r.userId === p.userId),
        );
        const requestCount = profileRequests.length;

        // Child count
        let childCount = 0;
        if (p.userId) {
          const children = await ctx.db
            .query("childProfiles")
            .withIndex("by_author", (q) => q.eq("authorUserId", p.userId))
            .collect();
          childCount = children.length;
        }

        return {
          ...p,
          user,
          avatarUrl,
          photoUrl,
          requestCount,
          childCount,
        };
      }),
    );

    // Sort: most requests → most relevant
    enriched.sort((a, b) => (b.requestCount ?? 0) - (a.requestCount ?? 0));

    return enriched;
  },
});
