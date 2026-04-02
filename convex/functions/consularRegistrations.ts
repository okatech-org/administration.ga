import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { authQuery, authMutation } from "../lib/customFunctions";
import { Id } from "../_generated/dataModel";
import {
  RegistrationStatus,
  RegistrationType,
  RegistrationDuration,
  registrationDurationValidator,
  registrationTypeValidator,
  registrationStatusValidator,
} from "../lib/validators";
import { PublicUserType } from "../lib/constants";
import { assertCanDoTask } from "../lib/permissions";
import { TaskCode } from "../lib/taskCodes";
import { registrationsByOrg } from "../lib/aggregates";
import { logCortexAction } from "../lib/neocortex";
import { SIGNAL_TYPES, CATEGORIES_ACTION } from "../lib/types";
import { generateMatricule } from "../lib/referenceHelpers";

/**
 * List registrations by organization with optional status filter (paginated)
 */
export const listByOrg = authQuery({
  args: {
    orgId: v.id("orgs"),
    status: v.optional(registrationStatusValidator),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    // Permission check: must be org member with consular_registrations.view
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org_deletedAt", (q) =>
        q.eq("userId", ctx.user._id).eq("orgId", args.orgId).eq("deletedAt", undefined),
      )
      .unique();
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.consular_registrations.view);

    let paginatedResult;

    if (args.status) {
      paginatedResult = await ctx.db
        .query("consularRegistrations")
        .withIndex("by_org_status", (q) =>
          q.eq("orgId", args.orgId).eq("status", args.status!),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      paginatedResult = await ctx.db
        .query("consularRegistrations")
        .withIndex("by_org_status", (q) => q.eq("orgId", args.orgId))
        .order("desc")
        .paginate(args.paginationOpts);
    }

    // Enrich with profile and user data for current page only
    // Supports both adult profiles (profileId) and child profiles (childProfileId)
    const enrichedPage = await Promise.all(
      paginatedResult.page.map(async (reg) => {
        const request = await ctx.db.get(reg.requestId);

        // Try adult profile first, then child profile
        const adultProfile = reg.profileId ? await ctx.db.get(reg.profileId) : null;
        const childProfile = !adultProfile && reg.childProfileId ? await ctx.db.get(reg.childProfileId) : null;

        // Build a unified profile shape for the frontend
        const profile = adultProfile
          ? {
              _id: adultProfile._id,
              identity: adultProfile.identity,
              contacts: adultProfile.contacts,
              addresses: adultProfile.addresses,
              passportInfo: adultProfile.passportInfo,
            }
          : childProfile
            ? {
                _id: childProfile._id,
                identity: childProfile.identity,
                contacts: undefined,
                addresses: undefined,
                passportInfo: childProfile.passportInfo,
              }
            : null;

        // Resolve the user (owner): adult profile userId or child profile authorUserId
        const userId = adultProfile?.userId ?? childProfile?.authorUserId;
        const user = userId ? await ctx.db.get(userId) : null;

        return {
          ...reg,
          requestReference: request?.reference,
          profile,
          user: user
            ? {
                _id: user._id,
                email: user.email,
                avatarUrl: user.avatarUrl,
              }
            : null,
        };
      }),
    );

    return {
      ...paginatedResult,
      page: enrichedPage,
    };
  },
});

/**
 * List registrations for a profile
 */
export const listByProfile = authQuery({
  args: {},
  handler: async (ctx) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();

    if (!profile) return [];

    return await ctx.db
      .query("consularRegistrations")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .collect();
  },
});

/**
 * Get registration by request ID
 */
export const getByRequest = query({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("consularRegistrations")
      .withIndex("by_request", (q) => q.eq("requestId", args.requestId))
      .unique();
  },
});

/**
 * Get active registrations ready for card generation (permanent, active, no card yet)
 */
export const getReadyForCard = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    // Permission check: must be org member with consular_cards.manage
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org_deletedAt", (q) =>
        q.eq("userId", ctx.user._id).eq("orgId", args.orgId).eq("deletedAt", undefined),
      )
      .unique();
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.consular_cards.manage);
    const registrations = await ctx.db
      .query("consularRegistrations")
      .withIndex("by_org_status", (q) =>
        q.eq("orgId", args.orgId).eq("status", RegistrationStatus.Active),
      )
      .collect();

    // Filter to permanent registrations without card
    const readyForCard = registrations.filter(
      (r) => r.duration === PublicUserType.LongStay && !r.cardNumber,
    );

    // Enrich with profile data
    return await Promise.all(
      readyForCard.map(async (reg) => {
        const profile = reg.profileId ? await ctx.db.get(reg.profileId) : null;
        return {
          ...reg,
          profile:
            profile ?
              {
                _id: profile._id,
                identity: profile.identity,
                passportInfo: profile.passportInfo,
                countryOfResidence: profile.countryOfResidence,
              }
            : null,
        };
      }),
    );
  },
});

/**
 * Get registrations ready for printing (has card, not printed)
 */
export const getReadyForPrint = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    // Permission check: must be org member with consular_cards.manage
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org_deletedAt", (q) =>
        q.eq("userId", ctx.user._id).eq("orgId", args.orgId).eq("deletedAt", undefined),
      )
      .unique();
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.consular_cards.manage);
    const registrations = await ctx.db
      .query("consularRegistrations")
      .withIndex("by_org_status", (q) =>
        q.eq("orgId", args.orgId).eq("status", RegistrationStatus.Active),
      )
      .collect();

    // Filter to those with card but not printed
    const readyForPrint = registrations.filter(
      (r) => r.cardNumber && !r.printedAt,
    );

    // Enrich with profile data
    return await Promise.all(
      readyForPrint.map(async (reg) => {
        const profile = reg.profileId ? await ctx.db.get(reg.profileId) : null;
        let user = null;
        if (profile?.userId) {
          const u = await ctx.db.get(profile.userId);
          if (u) {
            user = { _id: u._id, email: u.email, avatarUrl: u.avatarUrl };
          }
        }
        return {
          ...reg,
          profile:
            profile ?
              {
                _id: profile._id,
                identity: profile.identity,
                passportInfo: profile.passportInfo,
              }
            : null,
          user,
        };
      }),
    );
  },
});

/**
 * Create a new registration (called when submitting registration request)
 */
export const create = authMutation({
  args: {
    orgId: v.id("orgs"),
    requestId: v.id("requests"),
    duration: registrationDurationValidator,
    type: registrationTypeValidator,
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Check if already registered at this org with active status
    const existing = await ctx.db
      .query("consularRegistrations")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .collect();

    const activeAtOrg = existing.find(
      (r) => r.orgId === args.orgId && r.status === RegistrationStatus.Active,
    );

    if (activeAtOrg) {
      throw new Error("Already registered at this organization");
    }

    // Create registration entry
    const registrationId = await ctx.db.insert("consularRegistrations", {
      profileId: profile._id,
      orgId: args.orgId,
      requestId: args.requestId,
      duration: args.duration,
      type: args.type,
      status: RegistrationStatus.Requested,
      registeredAt: Date.now(),
    });

    // NEOCORTEX: Signal inscription consulaire créée
    await logCortexAction(ctx, {
      action: "CREATE_CONSULAR_REGISTRATION",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "consularRegistrations",
      entiteId: registrationId,
      userId: ctx.user._id,
      signalType: SIGNAL_TYPES.INSCRIPTION_CONSULAIRE_CREEE,
    });

    return registrationId;
  },
});

/**
 * Create registration from request submission (internal, called by requests.submit)
 */
export const createFromRequest = internalMutation({
  args: {
    profileId: v.id("profiles"),
    orgId: v.id("orgs"),
    requestId: v.id("requests"),
  },
  handler: async (ctx, args) => {
    // Check for existing active or pending registration
    const existing = await ctx.db
      .query("consularRegistrations")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect();

    const activeAtOrg = existing.find(
      (r) =>
        r.orgId === args.orgId &&
        (r.status === RegistrationStatus.Active ||
          r.status === RegistrationStatus.Requested),
    );

    if (activeAtOrg) {
      // Return existing registration ID
      return activeAtOrg._id;
    }

    // Create new registration entry
    const registrationId = await ctx.db.insert("consularRegistrations", {
      profileId: args.profileId,
      orgId: args.orgId,
      requestId: args.requestId,
      type: RegistrationType.Inscription,
      status: RegistrationStatus.Requested,
      registeredAt: Date.now(),
    });

    // NEOCORTEX: Signal inscription consulaire créée (internal — appel direct)
    await ctx.scheduler.runAfter(0, internal.hippocampe.loguerAction, {
      action: "CREATE_CONSULAR_REGISTRATION",
      categorie: "METIER",
      entiteType: "consularRegistrations",
      entiteId: registrationId,
      details: {
        avant: null,
        apres: {
          profileId: args.profileId,
          orgId: args.orgId,
          requestId: args.requestId,
          status: RegistrationStatus.Requested,
        },
      },
    });
    await ctx.scheduler.runAfter(0, internal.limbique.emettreSignal, {
      type: SIGNAL_TYPES.INSCRIPTION_CONSULAIRE_CREEE,
      source: "METIER",
      entiteType: "consularRegistrations",
      entiteId: registrationId,
      payload: {
        action: "CREATE_CONSULAR_REGISTRATION",
        profileId: args.profileId,
        orgId: args.orgId,
        requestId: args.requestId,
      },
      confiance: 1,
      priorite: "NORMAL" as const,
      correlationId: crypto.randomUUID(),
    });

    return registrationId;
  },
});

/**
 * Sync registration status when request status changes
 */
export const syncStatus = internalMutation({
  args: {
    requestId: v.id("requests"),
    newStatus: registrationStatusValidator,
  },
  handler: async (ctx, args) => {
    const registration = await ctx.db
      .query("consularRegistrations")
      .withIndex("by_request", (q) => q.eq("requestId", args.requestId))
      .unique();

    if (!registration) return;

    const updates: Record<string, unknown> = { status: args.newStatus };

    if (args.newStatus === RegistrationStatus.Active) {
      updates.activatedAt = Date.now();
    }

    await ctx.db.patch(registration._id, updates);
  },
});

/**
 * Update registration status (agent action)
 */
export const updateStatus = authMutation({
  args: {
    registrationId: v.id("consularRegistrations"),
    status: registrationStatusValidator,
  },
  handler: async (ctx, args) => {
    // Resolve org from registration for permission check
    const reg = await ctx.db.get(args.registrationId);
    if (!reg) throw new Error("Registration not found");
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org_deletedAt", (q) =>
        q.eq("userId", ctx.user._id).eq("orgId", reg.orgId).eq("deletedAt", undefined),
      )
      .unique();
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.consular_registrations.manage);
    const now = Date.now();
    const updates: Record<string, unknown> = { status: args.status };

    if (args.status === RegistrationStatus.Active) {
      updates.activatedAt = now;
      // Set expiration 5 years from activation
      updates.expiresAt = now + 5 * 365.25 * 24 * 60 * 60 * 1000;

      // Generer le matricule consulaire si le profil n'en a pas encore
      if (reg.profileId) {
        const profile = await ctx.db.get(reg.profileId);
        if (profile && !profile.matricule) {
          const matricule = await generateMatricule(
            ctx,
            profile.countryOfResidence ?? "XX",
          );
          await ctx.db.patch(reg.profileId, { matricule });
        }
      }
    }

    await ctx.db.patch(args.registrationId, updates);

    // NEOCORTEX: Signal statut inscription consulaire modifié
    const isRejected = args.status === RegistrationStatus.Expired;
    await logCortexAction(ctx, {
      action: "UPDATE_CONSULAR_REGISTRATION_STATUS",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "consularRegistrations",
      entiteId: args.registrationId,
      userId: ctx.user._id,
      avant: { status: reg.status },
      apres: { status: args.status },
      signalType: isRejected
        ? SIGNAL_TYPES.INSCRIPTION_CONSULAIRE_REJETEE
        : SIGNAL_TYPES.INSCRIPTION_CONSULAIRE_VALIDEE,
      priorite: isRejected ? "HIGH" : "NORMAL",
    });
  },
});

/**
 * Generate consular card for a registration (manual action by agent)
 */
export const generateCard = authMutation({
  args: {
    registrationId: v.id("consularRegistrations"),
  },
  handler: async (ctx, args) => {
    const registration = await ctx.db.get(args.registrationId);
    // Permission check: resolve org from registration
    if (registration) {
      const membership = await ctx.db
        .query("memberships")
        .withIndex("by_user_org_deletedAt", (q) =>
          q.eq("userId", ctx.user._id).eq("orgId", registration.orgId).eq("deletedAt", undefined),
        )
        .unique();
      await assertCanDoTask(ctx, ctx.user, membership, TaskCode.consular_cards.manage);
    }
    if (!registration) {
      throw new Error("Registration not found");
    }

    if (registration.status !== RegistrationStatus.Active) {
      throw new Error("Registration must be active to generate card");
    }

    if (registration.cardNumber) {
      throw new Error("Card already generated for this registration");
    }

    // Get profile for card number generation
    const profile = registration.profileId ? await ctx.db.get(registration.profileId) : null;
    if (!profile) {
      throw new Error("Profile not found");
    }

    // Generate card number: [CC][YY][DDMMYY]-[NNNNN]
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const countryCode = profile.countryOfResidence || "XX";

    // Format birth date
    let birthDateStr = "010101";
    if (profile.identity?.birthDate) {
      const bd = new Date(profile.identity.birthDate);
      const day = bd.getDate().toString().padStart(2, "0");
      const month = (bd.getMonth() + 1).toString().padStart(2, "0");
      const yr = bd.getFullYear().toString().slice(-2);
      birthDateStr = `${day}${month}${yr}`;
    }

    // Get sequence number - scan only cards with cardNumber (bounded)
    const cardsWithNumbers = await ctx.db
      .query("consularRegistrations")
      .withIndex("by_org_status", (q) => q.eq("orgId", registration.orgId))
      .take(5000);
    const existingNumbers = cardsWithNumbers
      .filter((r) => r.cardNumber)
      .map((r) => {
        const match = r.cardNumber!.match(/-(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      });
    const maxSeq = Math.max(0, ...existingNumbers);
    const seq = (maxSeq + 1).toString().padStart(5, "0");

    const cardNumber = `${countryCode}${year}${birthDateStr}-${seq}`;
    const cardIssuedAt = Date.now();

    // Get org settings for duration (default: 5 years)
    const org = await ctx.db.get(registration.orgId);
    const durationYears = org?.settings?.registrationDurationYears ?? 5;
    const cardExpiresAt =
      cardIssuedAt + durationYears * 365.25 * 24 * 60 * 60 * 1000;

    // Determine duration type based on years
    const duration =
      durationYears >= 5 ? PublicUserType.LongStay : PublicUserType.ShortStay;

    // Update registration with card info and duration
    await ctx.db.patch(args.registrationId, {
      cardNumber,
      cardIssuedAt,
      cardExpiresAt,
      duration,
    });

    // Also update the profile's consularCard
    if (registration.profileId) await ctx.db.patch(registration.profileId, {
      consularCard: {
        orgId: registration.orgId,
        cardNumber,
        cardIssuedAt,
        cardExpiresAt,
      },
    });

    return { success: true, cardNumber, message: "Carte générée avec succès" };
  },
});

/**
 * Mark a card as printed (called by EasyCard or agent)
 */
export const markAsPrinted = authMutation({
  args: {
    registrationId: v.id("consularRegistrations"),
  },
  handler: async (ctx, args) => {
    // Permission check: resolve org from registration
    const reg = await ctx.db.get(args.registrationId);
    if (!reg) throw new Error("Registration not found");
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org_deletedAt", (q) =>
        q.eq("userId", ctx.user._id).eq("orgId", reg.orgId).eq("deletedAt", undefined),
      )
      .unique();
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.consular_cards.manage);

    await ctx.db.patch(args.registrationId, {
      printedAt: Date.now(),
    });

    // NEOCORTEX: Signal carte consulaire imprimée
    await logCortexAction(ctx, {
      action: "PRINT_CONSULAR_CARD",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "consularRegistrations",
      entiteId: args.registrationId,
      userId: ctx.user._id,
      signalType: SIGNAL_TYPES.CARTE_CONSULAIRE_IMPRIMEE,
    });
  },
});

/**
 * Get aggregate stats for consular registrations by org.
 * Uses the registrationsByOrg aggregate for O(log n) counts per status.
 */
export const getStatsByOrg = authQuery({
  args: {
    orgId: v.id("orgs"),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org_deletedAt", (q) =>
        q.eq("userId", ctx.user._id).eq("orgId", args.orgId).eq("deletedAt", undefined),
      )
      .unique();
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.consular_registrations.view);

    // With sortKey [profileType, status, _creationTime], to count by status
    // across all profile types, we sum adult + child counts per status.
    const [total, adultRequested, childRequested, adultActive, childActive, adultExpired, childExpired] =
      await registrationsByOrg.countBatch(ctx, [
        { namespace: args.orgId },
        { namespace: args.orgId, bounds: { prefix: ["adult", RegistrationStatus.Requested] } },
        { namespace: args.orgId, bounds: { prefix: ["child", RegistrationStatus.Requested] } },
        { namespace: args.orgId, bounds: { prefix: ["adult", RegistrationStatus.Active] } },
        { namespace: args.orgId, bounds: { prefix: ["child", RegistrationStatus.Active] } },
        { namespace: args.orgId, bounds: { prefix: ["adult", RegistrationStatus.Expired] } },
        { namespace: args.orgId, bounds: { prefix: ["child", RegistrationStatus.Expired] } },
      ]);

    return {
      total,
      requested: adultRequested + childRequested,
      active: adultActive + childActive,
      expired: adultExpired + childExpired,
    };
  },
});

/**
 * Aggregate-powered paginated list for server-side pagination.
 * Uses registrationsByOrg B-tree for O(log n) pagination.
 * Returns only the fields needed by the table + cursor + totalCount.
 *
 * profileType filter: since the aggregate doesn't index by profile type,
 * we over-fetch and filter post-fetch. This means some pages may be slightly
 * shorter when filtering, but it's acceptable for the UI.
 */
export const paginatedListByOrg = authQuery({
  args: {
    orgId: v.id("orgs"),
    status: v.optional(registrationStatusValidator),
    profileType: v.optional(v.union(v.literal("all"), v.literal("adult"), v.literal("child"))),
    cursor: v.optional(v.string()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org_deletedAt", (q) =>
        q.eq("userId", ctx.user._id).eq("orgId", args.orgId).eq("deletedAt", undefined),
      )
      .unique();
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.consular_registrations.view);

    const pageSize = args.pageSize ?? 10;
    const profileType = args.profileType ?? "all";

    // Build bounds using the sorted key [profileType, status, _creationTime]
    // prefix: [] = all, ["adult"] = adults only, ["child", "active"] = active children, etc.
    let prefix: string[] = [];
    if (profileType !== "all") {
      prefix.push(profileType);
      if (args.status) prefix.push(args.status);
    } else if (args.status) {
      // Status-only filter across all profile types: we need to query adult+child separately
      // and merge. For simplicity, we query adult and child with separate bounds.
    }

    // For "all profiles + status filter", we need two separate queries
    const needsSplitQuery = profileType === "all" && !!args.status;

    let totalCount: number;
    let aggregateItems: { key: [string, string, number]; id: string; sumValue: number }[];
    let nextCursor: string;
    let isDone: boolean;

    if (needsSplitQuery) {
      // Count and paginate across both profile types for a specific status.
      // We paginate each profile type separately with exact prefix bounds,
      // then merge and sort by _creationTime desc.
      const [adultCount, childCount] = await registrationsByOrg.countBatch(ctx, [
        { namespace: args.orgId, bounds: { prefix: ["adult", args.status!] } },
        { namespace: args.orgId, bounds: { prefix: ["child", args.status!] } },
      ]);
      totalCount = adultCount + childCount;

      // Decode cursors for each profile type (encoded as JSON pair)
      let adultCursor: string | undefined;
      let childCursor: string | undefined;
      if (args.cursor) {
        try {
          const parsed = JSON.parse(args.cursor);
          adultCursor = parsed.a ?? undefined;
          childCursor = parsed.c ?? undefined;
        } catch {
          // Invalid cursor, start from beginning
        }
      }

      // Paginate each profile type separately with exact prefix bounds
      const [adultResult, childResult] = await Promise.all([
        registrationsByOrg.paginate(ctx, {
          namespace: args.orgId,
          bounds: { prefix: ["adult", args.status!] as [string, string] },
          cursor: adultCursor,
          order: "desc",
          pageSize,
        }),
        registrationsByOrg.paginate(ctx, {
          namespace: args.orgId,
          bounds: { prefix: ["child", args.status!] as [string, string] },
          cursor: childCursor,
          order: "desc",
          pageSize,
        }),
      ]);

      // Merge both result sets and sort by _creationTime desc, take pageSize
      const merged = [...adultResult.page, ...childResult.page];
      merged.sort((a, b) => b.key[2] - a.key[2]); // key[2] = _creationTime
      aggregateItems = merged.slice(0, pageSize);

      // Encode both cursors for next page
      const allDone = adultResult.isDone && childResult.isDone;
      nextCursor = allDone ? "" : JSON.stringify({ a: adultResult.cursor, c: childResult.cursor });
      isDone = allDone;
    } else {
      // Direct prefix-based query (most efficient)
      const bounds = prefix.length > 0 ? { prefix: prefix as [string] | [string, string] } : undefined;

      totalCount = await registrationsByOrg.count(ctx, {
        namespace: args.orgId,
        ...(bounds && { bounds }),
      });

      const result = await registrationsByOrg.paginate(ctx, {
        namespace: args.orgId,
        ...(bounds && { bounds }),
        cursor: args.cursor,
        order: "desc",
        pageSize,
      });
      aggregateItems = result.page;
      nextCursor = result.cursor;
      isDone = result.isDone;
    }

    // Batch fetch full documents by ID
    const docs = await Promise.all(
      aggregateItems.map((item) => ctx.db.get(item.id as Id<"consularRegistrations">)),
    );
    const validDocs = docs.filter(
      (doc): doc is NonNullable<typeof doc> => doc !== null,
    );

    // Enrich from request.formData instead of fetching profiles/users
    const enrichedPage = await Promise.all(
      validDocs.map(async (reg) => {
        const request = await ctx.db.get(reg.requestId) as any;
        const formData = request?.formData as Record<string, any> | undefined;
        const basicInfo = formData?.basic_info as Record<string, string> | undefined;
        const contactInfo = formData?.contact_info as Record<string, string> | undefined;

        const isChild = !!reg.childProfileId && !reg.profileId;

        // Find identity photo from request documents
        let photoUrl: string | null = null;
        const requestDocs = request?.documents;
        if (requestDocs && Array.isArray(requestDocs)) {
          for (const docId of requestDocs) {
            const doc = await ctx.db.get(docId as Id<"documents">);
            if (
              doc &&
              doc.documentType === "identity_photo" &&
              doc.files?.length > 0 &&
              doc.files[0].mimeType.startsWith("image/")
            ) {
              photoUrl = await ctx.storage.getUrl(doc.files[0].storageId);
              break;
            }
          }
        }

        const adultProfile = reg.profileId ? await ctx.db.get(reg.profileId) : null;
        const childProfile = !adultProfile && reg.childProfileId ? await ctx.db.get(reg.childProfileId) : null;
        const userId = adultProfile?.userId ?? childProfile?.authorUserId ?? null;
        const profileId = reg.profileId ?? reg.childProfileId ?? null;

        return {
          _id: reg._id,
          requestId: reg.requestId,
          requestReference: request?.reference as string | undefined,
          type: reg.type,
          status: reg.status,
          cardNumber: reg.cardNumber,
          registeredAt: reg.registeredAt,
          printedAt: reg.printedAt,
          isChildProfile: isChild,
          profileId,
          profile: {
            identity: {
              firstName: basicInfo?.first_name ?? null,
              lastName: basicInfo?.last_name ?? null,
            },
          },
          user: {
            _id: userId,
            email: contactInfo?.email ?? null,
            photoUrl,
          },
        };
      }),
    );

    return {
      page: enrichedPage,
      nextCursor: isDone ? null : nextCursor,
      totalCount,
    };
  },
});

/**
 * Search registrations server-side by name (profile) or explicit exact card number.
 */
export const searchRegistrations = authQuery({
  args: {
    orgId: v.id("orgs"),
    searchQuery: v.string(),
    status: v.optional(registrationStatusValidator),
    profileType: v.optional(v.union(v.literal("all"), v.literal("adult"), v.literal("child"))),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org_deletedAt", (q) =>
        q.eq("userId", ctx.user._id).eq("orgId", args.orgId).eq("deletedAt", undefined),
      )
      .unique();
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.consular_registrations.view);

    const term = args.searchQuery.trim();
    if (term.length < 2) {
      return { page: [], totalCount: 0, nextCursor: null };
    }

    const typeFilter = args.profileType ?? "all";
    
    // 1. Search profiles by name (adults)
    let adultProfileIds: string[] = [];
    if (typeFilter === "all" || typeFilter === "adult") {
      const byFirstName = await ctx.db
        .query("profiles")
        .withSearchIndex("search_firstName", (q) => q.search("identity.firstName", term))
        .take(25);
      const byLastName = await ctx.db
        .query("profiles")
        .withSearchIndex("search_lastName", (q) => q.search("identity.lastName", term))
        .take(25);
      adultProfileIds = [...byFirstName, ...byLastName].map((p) => p._id);
    }
    
    // 2. Search child profiles by name
    let childProfileIds: string[] = [];
    if (typeFilter === "all" || typeFilter === "child") {
      const byFirstName = await ctx.db
        .query("childProfiles")
        .withSearchIndex("search_firstName", (q) => q.search("identity.firstName", term))
        .take(25);
      const byLastName = await ctx.db
        .query("childProfiles")
        .withSearchIndex("search_lastName", (q) => q.search("identity.lastName", term))
        .take(25);
      childProfileIds = [...byFirstName, ...byLastName].map((p) => p._id);
    }

    const uniqueAdultIds = Array.from(new Set(adultProfileIds));
    const uniqueChildIds = Array.from(new Set(childProfileIds));

    // 3. Search registrations by exact card number first
    const cardMatches = await ctx.db
      .query("consularRegistrations")
      .withIndex("by_card_number", (q) => q.eq("cardNumber", term))
      .collect();

    // 4. Fetch registrations for the found profiles
    let registrations: Array<any> = [...cardMatches];
    const seenRegIds = new Set<string>(registrations.map(r => r._id));

    for (const pid of uniqueAdultIds) {
      const regs = await ctx.db
        .query("consularRegistrations")
        .withIndex("by_profile", (q) => q.eq("profileId", pid as Id<"profiles">))
        .collect();
      for (const r of regs) {
        if (!seenRegIds.has(r._id)) {
          registrations.push(r);
          seenRegIds.add(r._id);
        }
      }
    }

    for (const cid of uniqueChildIds) {
      const regs = await ctx.db
        .query("consularRegistrations")
        .withIndex("by_childProfile", (q) => q.eq("childProfileId", cid as Id<"childProfiles">))
        .collect();
      for (const r of regs) {
        if (!seenRegIds.has(r._id)) {
          registrations.push(r);
          seenRegIds.add(r._id);
        }
      }
    }

    // 5. Filter by orgId and status, and profile type
    registrations = registrations.filter((r) => {
      if (r.orgId !== args.orgId) return false;
      if (args.status && r.status !== args.status) return false;
      if (typeFilter === "adult" && !r.profileId) return false;
      if (typeFilter === "child" && !r.childProfileId) return false;
      return true;
    });

    // 6. Sort by most recently registered and limit
    registrations.sort((a, b) => b.registeredAt - a.registeredAt);
    const pageRegistrations = registrations.slice(0, 20);

    // 7. Enrich page
    const enrichedPage = await Promise.all(
      pageRegistrations.map(async (reg) => {
        const request = await ctx.db.get(reg.requestId) as any;
        const formData = request?.formData as Record<string, any> | undefined;
        const basicInfo = formData?.basic_info as Record<string, string> | undefined;
        const contactInfo = formData?.contact_info as Record<string, string> | undefined;

        const isChild = !!reg.childProfileId && !reg.profileId;

        // Find identity photo from request documents
        let photoUrl: string | null = null;
        const requestDocs = request?.documents;
        if (requestDocs && Array.isArray(requestDocs)) {
          for (const docId of requestDocs) {
            const doc = await ctx.db.get(docId as Id<"documents">);
            if (
              doc &&
              doc.documentType === "identity_photo" &&
              doc.files?.length > 0 &&
              doc.files[0].mimeType.startsWith("image/")
            ) {
              photoUrl = await ctx.storage.getUrl(doc.files[0].storageId);
              break;
            }
          }
        }

        const adultProfile = reg.profileId ? await ctx.db.get(reg.profileId as Id<"profiles">) : null;
        const childProfile = !adultProfile && reg.childProfileId ? await ctx.db.get(reg.childProfileId as Id<"childProfiles">) : null;
        const userId = adultProfile?.userId ?? childProfile?.authorUserId ?? null;

        return {
          _id: reg._id,
          requestId: reg.requestId,
          requestReference: request?.reference as string | undefined,
          type: reg.type,
          status: reg.status,
          cardNumber: reg.cardNumber,
          registeredAt: reg.registeredAt,
          printedAt: reg.printedAt,
          isChildProfile: isChild,
          profile: {
            identity: {
              firstName: basicInfo?.first_name ?? null,
              lastName: basicInfo?.last_name ?? null,
            },
          },
          user: {
            _id: userId,
            email: contactInfo?.email ?? null,
            photoUrl,
          },
        };
      })
    );

    return {
      page: enrichedPage,
      totalCount: registrations.length,
      nextCursor: null,
    };
  },
});

