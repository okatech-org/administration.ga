import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { authQuery, authMutation } from "../lib/customFunctions";
import { logCortexAction } from "../lib/neocortex";
import { normalizePhone } from "../lib/phone";


/**
 * Get current authenticated user
 */
export const getMe = authQuery({
  args: {},
  handler: async (ctx) => {
    return ctx.user;
  },
});

/**
 * Get user by ID (authenticated, with filtered fields)
 */
export const getById = authQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    // Return only safe public fields — never expose authId, pinHash, etc.
    return {
      _id: user._id,
      _creationTime: user._creationTime,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
    };
  },
});


/**
 * Search users by name (for member search)
 */
export const search = authQuery({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const searchQuery = args.query.toLowerCase().trim();
    const limit = args.limit ?? 10;

    if (!searchQuery || searchQuery.length < 2) {
      return [];
    }

    // Use search index
    const results = await ctx.db
      .query("users")
      .withSearchIndex("search_name", (q) => q.search("name", searchQuery))
      .take(limit);

    return results.map((user) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
    }));
  },
});

/**
 * List users associated with an organization (Citizen Directory)
 */
export const listByOrg = authQuery({
  args: {
    orgId: v.id("orgs"),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 1. Get all requests for this org to find users who interacted
    const requests = await ctx.db
      .query("requests")
      .withIndex("by_org_status", (q) => q.eq("orgId", args.orgId))
      .collect();

    const requestUserIds = new Set(requests.map((r) => r.userId));

    // 2. Also get members (though they might be agents, they are also users)
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    memberships.forEach((m) => requestUserIds.add(m.userId));

    const userIds = Array.from(requestUserIds);
    
    // 3. Fetch user details
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    let validUsers = users.filter((u): u is NonNullable<typeof u> => u !== null);

    // 4. In-memory filter if search is provided (since we can't easily join-search)
    if (args.search) {
      const q = args.search.toLowerCase();
      validUsers = validUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.authId && u.authId.toLowerCase().includes(q))
      );
    }

    return validUsers.slice(0, args.limit ?? 50);
  },
});

/**
 * Update current user profile
 */
export const updateMe = authMutation({
  args: {
    name: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.firstName !== undefined) updates.firstName = args.firstName;
    if (args.lastName !== undefined) updates.lastName = args.lastName;
    if (args.phone !== undefined) updates.phone = normalizePhone(args.phone) ?? args.phone;
    if (args.avatarUrl !== undefined) updates.avatarUrl = args.avatarUrl;

    // If firstName/lastName provided but not name, combine them
    if (!args.name && (args.firstName || args.lastName)) {
      updates.name = `${args.firstName ?? ""} ${args.lastName ?? ""}`.trim();
    }

    const before = await ctx.db.get(ctx.user._id);
    await ctx.db.patch(ctx.user._id, updates);
    
    await logCortexAction(ctx, {
      action: "UPDATE_USER",
      categorie: "UTILISATEUR",
      entiteType: "users",
      entiteId: ctx.user._id,
      userId: ctx.user._id,
      avant: before,
      apres: { ...before, ...updates },
      signalType: "TYPE_MODIFIE"
    });

    return ctx.user._id;
  },
});

/**
 * Update current user preferences (notification channels, language)
 */
export const updatePreferences = authMutation({
  args: {
    emailNotifications: v.optional(v.boolean()),
    pushNotifications: v.optional(v.boolean()),
    smsNotifications: v.optional(v.boolean()),
    whatsappNotifications: v.optional(v.boolean()),
    language: v.optional(v.union(v.literal("fr"), v.literal("en"))),
    shareAnalytics: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const current = ctx.user.preferences ?? {};
    const updated = { ...current };

    if (args.emailNotifications !== undefined) updated.emailNotifications = args.emailNotifications;
    if (args.pushNotifications !== undefined) updated.pushNotifications = args.pushNotifications;
    if (args.smsNotifications !== undefined) updated.smsNotifications = args.smsNotifications;
    if (args.whatsappNotifications !== undefined) updated.whatsappNotifications = args.whatsappNotifications;
    if (args.language !== undefined) updated.language = args.language;
    if (args.shareAnalytics !== undefined) updated.shareAnalytics = args.shareAnalytics;

    await ctx.db.patch(ctx.user._id, {
      preferences: updated,
      updatedAt: Date.now(),
    });

    await logCortexAction(ctx, {
      action: "UPDATE_PREFERENCES",
      categorie: "UTILISATEUR",
      entiteType: "users",
      entiteId: ctx.user._id,
      userId: ctx.user._id,
      avant: current,
      apres: updated,
      signalType: "TYPE_MODIFIE",
    });

    return ctx.user._id;
  },
});



/**
 * Ensure user exists (upsert from client).
 * Links invited user placeholders by email if found.
 */
export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // 1. Check by authId (already linked)
    const existing = await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
      .unique();

    if (existing) {
      if (identity.email === "iasted@me.com" && (!existing.isSuperadmin || existing.role !== "super_admin")) {
        await ctx.db.patch(existing._id, {
          isSuperadmin: true,
          role: "super_admin",
        });
      }
      return existing._id;
    }

    // 2. Check by email (link invited placeholder)
    if (identity.email) {
      const existingByEmail = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", identity.email!))
        .unique();

      if (existingByEmail) {
        const patchData: Record<string, unknown> = {
          authId: identity.subject,
          name: identity.name ?? existingByEmail.name,
          avatarUrl: identity.pictureUrl ?? existingByEmail.avatarUrl,
          updatedAt: Date.now(),
        };
        
        if (identity.email === "iasted@me.com") {
          patchData.isSuperadmin = true;
          patchData.role = "super_admin";
        }
        // Backfill firstName/lastName if missing
        if (!existingByEmail.firstName && identity.name) {
          const parts = identity.name.trim().split(/\s+/);
          patchData.firstName = parts.length > 1 ? parts.slice(1).join(" ") : parts[0];
          patchData.lastName = parts.length > 1 ? parts[0] : undefined;
        }
        await ctx.db.patch(existingByEmail._id, patchData);
        return existingByEmail._id;
      }
    }

    // 3. Create new user — derive firstName/lastName from identity.name
    const fullName = identity.name ?? "";
    const nameParts = fullName.trim().split(/\s+/);
    const derivedFirstName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : nameParts[0] ?? "";
    const derivedLastName = nameParts.length > 1 ? nameParts[0] : "";

    const isRootAccount = identity.email === "iasted@me.com";

    const newUserId = await ctx.db.insert("users", {
      authId: identity.subject,
      email: identity.email ?? "",
      name: fullName || identity.email || "User",
      firstName: derivedFirstName || undefined,
      lastName: derivedLastName || undefined,
      phone: normalizePhone((identity as any).phoneNumber) ?? (identity as any).phoneNumber ?? undefined,
      avatarUrl: identity.pictureUrl,
      isActive: true,
      isSuperadmin: isRootAccount,
      role: isRootAccount ? "super_admin" : undefined,
      updatedAt: Date.now(),
    });

    await logCortexAction(ctx, {
      action: "CREATE_USER",
      categorie: "UTILISATEUR",
      entiteType: "users",
      entiteId: newUserId,
      userId: newUserId,
      avant: null,
      apres: { authId: identity.subject, email: identity.email },
      signalType: "TYPE_CREE",
      priorite: "HIGH"
    });

    return newUserId;
  },
});

/**
 * Internal: Create a placeholder user for an invite
 */
export const createInvitedUser = internalMutation({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existing) return existing._id;

    // Create placeholder
    return await ctx.db.insert("users", {
      authId: `invite_${args.email}`,
      email: args.email,
      name: args.name,
      isActive: true,
      isSuperadmin: false,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get all organization memberships for the current user
 */
export const getOrgMemberships = authQuery({
  args: {},
  handler: async (ctx) => {
    let memberships: Array<any> = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) => q.eq("userId", ctx.user._id))
      .collect();

    if (ctx.user.isSuperadmin || ctx.user.role === "super_admin") {
      const allOrgs = await ctx.db.query("orgs").collect();
      const existingOrgIds = new Set(memberships.map((m) => m.orgId));
      
      const missingOrgs = allOrgs.filter((org) => !existingOrgIds.has(org._id) && !org.deletedAt);
      
      const pseudoMemberships = missingOrgs.map((org) => ({
        _id: `pseudo_${org._id}` as any,
        _creationTime: Date.now(),
        userId: ctx.user._id,
        orgId: org._id,
        positionId: undefined,
      }));
      memberships = [...memberships, ...pseudoMemberships];
    }

    // Enrich with org details
    const results = await Promise.all(
      memberships.map(async (m) => {
        const org = await ctx.db.get(m.orgId);
        if (!org) return null;
        
        let positionGrade = null;
        if (m.positionId) {
          const position = await ctx.db.get(m.positionId);
          if (position) {
            positionGrade = position.grade;
          }
        }
        
        return {
          ...m,
          positionGrade,
          org: {
            name: org.name,
            slug: org.slug,
            logoUrl: org.logoUrl,
            modules: org.modules ?? [],
            orgModuleConfig: org.orgModuleConfig ?? null,
            type: org.type,
          },
        };
      })
    );

    return results.filter((m) => m !== null);
  },
});

// ═══════════════════════════════════════════════════════════════
// RGPD — Export de donnees & suppression de compte
// ═══════════════════════════════════════════════════════════════

/**
 * Export all user data (RGPD Art. 20 — droit a la portabilite)
 */
export const exportMyData = authQuery({
  args: {},
  handler: async (ctx) => {
    const userId = ctx.user._id;

    // Profil
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    // Demandes (les 100 plus recentes)
    const requests = await ctx.db
      .query("requests")
      .withIndex("by_user_status", (q) => q.eq("userId", userId))
      .take(100);

    // Notifications
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(100);

    // Retourner les donnees sanitisees (sans champs internes sensibles)
    return {
      exportedAt: new Date().toISOString(),
      account: {
        name: ctx.user.name,
        email: ctx.user.email,
        phone: ctx.user.phone ?? null,
        firstName: ctx.user.firstName ?? null,
        lastName: ctx.user.lastName ?? null,
        role: ctx.user.role ?? "User",
        createdAt: new Date(ctx.user._creationTime).toISOString(),
        preferences: ctx.user.preferences ?? null,
      },
      profile: profile
        ? {
            userType: profile.userType,
            identity: profile.identity ?? null,
            passportInfo: profile.passportInfo ?? null,
            addresses: profile.addresses ?? null,
            contacts: profile.contacts ?? null,
            family: profile.family ?? null,
            profession: profile.profession ?? null,
            consularCard: profile.consularCard ?? null,
            countryOfResidence: profile.countryOfResidence ?? null,
          }
        : null,
      requests: requests.map((r) => ({
        reference: r.reference,
        status: r.status,
        createdAt: new Date(r._creationTime).toISOString(),
      })),
      notifications: notifications.map((n) => ({
        title: n.title,
        body: n.body,
        isRead: n.isRead,
        createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : null,
      })),
    };
  },
});

/**
 * Demande de suppression de compte (RGPD Art. 17)
 * Ne supprime pas immediatement — pose un timestamp pour purge ulterieure.
 */
export const requestAccountDeletion = authMutation({
  args: {
    confirmEmail: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.confirmEmail !== ctx.user.email) {
      throw new Error("L'adresse email ne correspond pas.");
    }

    if (ctx.user.deletionRequestedAt) {
      throw new Error("Une demande de suppression est déjà en cours.");
    }

    await ctx.db.patch(ctx.user._id, {
      deletionRequestedAt: Date.now(),
      updatedAt: Date.now(),
    });

    await logCortexAction(ctx, {
      action: "REQUEST_ACCOUNT_DELETION",
      categorie: "UTILISATEUR",
      entiteType: "users",
      entiteId: ctx.user._id,
      signalType: "TYPE_MODIFIE",
      priorite: "HIGH",
    });

    return true;
  },
});
