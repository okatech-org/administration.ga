import { v } from "convex/values";
import { query } from "../_generated/server";
import { authQuery } from "../lib/customFunctions";

/**
 * Get complete card data for rendering a consular card preview.
 * Used by citizen-web, agent-web, and backoffice-web to render the card.
 * Returns: profile identity, card info, org info, card design, and identity photo URL.
 */
export const getCardRenderData = authQuery({
  args: {
    profileId: v.optional(v.id("profiles")),
  },
  handler: async (ctx, args) => {
    // Get profile (own profile if no profileId specified)
    let profile;
    if (args.profileId) {
      profile = await ctx.db.get(args.profileId);
    } else {
      profile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
        .unique();
    }

    if (!profile?.consularCard) {
      return null;
    }

    const card = profile.consularCard;

    // Get the issuing org
    const org = await ctx.db.get(card.orgId);
    if (!org) return null;

    // Get the active card design for this org
    const designs = await ctx.db
      .query("cardDesigns")
      .withIndex("by_org", (q) => q.eq("orgId", card.orgId).eq("isActive", true))
      .take(5);

    // Use default design from settings or first active design
    const defaultDesignId = org.settings?.defaultCardDesignId;
    const design = defaultDesignId
      ? designs.find((d) => d._id === defaultDesignId) ?? designs[0]
      : designs[0];

    // Get identity photo
    let identityPhotoUrl: string | null = null;
    const identityPhotoDocId = profile.documents?.identityPhoto;
    if (identityPhotoDocId) {
      const doc = await ctx.db.get(identityPhotoDocId);
      if (doc?.files?.length && doc.files[0].mimeType.startsWith("image/")) {
        identityPhotoUrl = await ctx.storage.getUrl(doc.files[0].storageId);
      }
    }

    // Get consular registration for this org
    const registration = await ctx.db
      .query("consularRegistrations")
      .withIndex("by_profile", (q) => q.eq("profileId", profile!._id))
      .collect();
    const activeReg = registration.find(
      (r) => r.orgId === card.orgId && r.cardNumber === card.cardNumber,
    );

    return {
      // Card info
      cardNumber: card.cardNumber,
      cardIssuedAt: card.cardIssuedAt,
      cardExpiresAt: card.cardExpiresAt,
      printedAt: activeReg?.printedAt ?? null,

      // Profile identity
      identity: {
        firstName: profile.identity?.firstName ?? null,
        lastName: profile.identity?.lastName ?? null,
        birthDate: profile.identity?.birthDate ?? null,
        birthPlace: profile.identity?.birthPlace ?? null,
        gender: profile.identity?.gender ?? null,
        nationality: profile.identity?.nationality ?? null,
      },

      // Contact
      addresses: profile.addresses,

      // Identity photo
      identityPhotoUrl,

      // Org info
      org: {
        _id: org._id,
        name: org.name,
        shortName: org.shortName ?? null,
        type: org.type,
        country: org.country,
        address: org.address,
        logoUrl: org.logoUrl ?? null,
        headOfMission: org.headOfMission ?? null,
        headOfMissionTitle: org.headOfMissionTitle ?? null,
      },

      // Card design (front/back background images)
      cardDesign: design
        ? {
            _id: design._id,
            name: design.name,
            frontBackgroundImage: design.frontBackgroundImage,
            backBackgroundImage: design.backBackgroundImage,
            backgroundColor: design.backgroundColor,
            backgroundOpacity: design.backgroundOpacity,
            frontElements: design.frontElements,
            backElements: design.backElements,
          }
        : null,

      // Verification URL
      verificationUrl: `https://consulat.ga/verify/${card.cardNumber}`,
    };
  },
});

/**
 * Get attestation data for generating the official PDF certificate.
 * Returns all data needed to render the attestation.
 */
export const getAttestationData = authQuery({
  args: {
    profileId: v.optional(v.id("profiles")),
  },
  handler: async (ctx, args) => {
    // Get profile
    let profile;
    if (args.profileId) {
      profile = await ctx.db.get(args.profileId);
    } else {
      profile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
        .unique();
    }

    if (!profile?.consularCard) {
      return null;
    }

    const card = profile.consularCard;
    const org = await ctx.db.get(card.orgId);
    if (!org) return null;

    // Get identity photo
    let identityPhotoUrl: string | null = null;
    const identityPhotoDocId = profile.documents?.identityPhoto;
    if (identityPhotoDocId) {
      const doc = await ctx.db.get(identityPhotoDocId);
      if (doc?.files?.length && doc.files[0].mimeType.startsWith("image/")) {
        identityPhotoUrl = await ctx.storage.getUrl(doc.files[0].storageId);
      }
    }

    return {
      attestationNumber: `ATT-${card.cardNumber}-${Date.now().toString(36).toUpperCase()}`,
      generatedAt: Date.now(),

      // Card info
      cardNumber: card.cardNumber,
      cardIssuedAt: card.cardIssuedAt,
      cardExpiresAt: card.cardExpiresAt,

      // Full profile data for attestation
      identity: profile.identity,
      passportInfo: profile.passportInfo,
      addresses: profile.addresses,
      contacts: profile.contacts,
      identityPhotoUrl,

      // Org info (who issues the attestation)
      org: {
        name: org.name,
        shortName: org.shortName ?? org.name,
        type: org.type,
        country: org.country,
        address: org.address,
        phone: org.phone ?? null,
        email: org.email ?? null,
        website: org.website ?? null,
        logoUrl: org.logoUrl ?? null,
        headOfMission: org.headOfMission ?? null,
        headOfMissionTitle: org.headOfMissionTitle ?? null,
      },
    };
  },
});

/**
 * Get active card design for an org (used by agent/backoffice to select template)
 */
export const getCardDesignForOrg = authQuery({
  args: {
    orgId: v.id("orgs"),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (!org) return null;

    const designs = await ctx.db
      .query("cardDesigns")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId).eq("isActive", true))
      .collect();

    const defaultDesignId = org.settings?.defaultCardDesignId;

    return {
      designs,
      defaultDesignId,
      printEnabled: org.settings?.printEnabled ?? false,
    };
  },
});

/**
 * Check if an org has printing enabled (used to show/hide print buttons)
 */
export const isPrintEnabled = query({
  args: {
    orgId: v.id("orgs"),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (!org) return false;

    // Check both: printEnabled setting AND module enabled
    const hasPrintSetting = org.settings?.printEnabled ?? false;
    const hasModule = org.modules?.includes("consular_cards" as any) ?? false;

    return hasPrintSetting && hasModule;
  },
});

/**
 * Public card verification endpoint (for QR code scanning)
 */
export const verifyCardPublic = query({
  args: {
    cardNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Search in consularRegistrations (primary source)
    const registration = await ctx.db
      .query("consularRegistrations")
      .withIndex("by_card_number", (q) => q.eq("cardNumber", args.cardNumber))
      .first();

    if (!registration) {
      return {
        valid: false,
        message: "Carte non trouvée",
      };
    }

    // Get profile for holder info
    const profile = registration.profileId
      ? await ctx.db.get(registration.profileId)
      : null;

    // Get org for issuer info
    const org = await ctx.db.get(registration.orgId);

    return {
      valid: true,
      isExpired: registration.cardExpiresAt
        ? registration.cardExpiresAt < Date.now()
        : false,
      cardNumber: registration.cardNumber,
      cardIssuedAt: registration.cardIssuedAt,
      cardExpiresAt: registration.cardExpiresAt,
      status: registration.status,
      holder: profile?.identity
        ? {
            firstName: profile.identity.firstName,
            lastName: profile.identity.lastName,
          }
        : null,
      issuer: org
        ? {
            name: org.name,
            country: org.country,
          }
        : null,
    };
  },
});
