import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { authQuery, authMutation } from "../lib/customFunctions";
import {
  mailFolderValidator,
  mailOwnerIdValidator,
  mailOwnerTypeValidator,
} from "../lib/validators";
import { MailOwnerType } from "../lib/constants";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Verify the current user has access to the given owner entity.
 * - Profile: ownerId must match user's profile
 * - Organization: user must be a member via memberships
 * - Association: user must be a member via associationMembers
 * - Company: user must be a member via companyMembers
 */
async function verifyOwnerAccess(ctx: any, ownerId: string, ownerType: string) {
  if (ownerType === MailOwnerType.Profile) {
    const profile = await ctx.db.get(ownerId);
    if (!profile || profile.userId !== ctx.user._id) {
      throw new Error("Unauthorized: profile does not belong to current user");
    }
    return profile;
  }
  if (ownerType === MailOwnerType.Association) {
    const membership = await ctx.db
      .query("associationMembers")
      .withIndex("by_user_assoc", (q: any) =>
        q.eq("userId", ctx.user._id).eq("associationId", ownerId),
      )
      .first();
    if (!membership || membership.deletedAt) {
      throw new Error("Unauthorized: not a member of this association");
    }
    return membership;
  }
  if (ownerType === MailOwnerType.Company) {
    const membership = await ctx.db
      .query("companyMembers")
      .withIndex("by_user_company", (q: any) =>
        q.eq("userId", ctx.user._id).eq("companyId", ownerId),
      )
      .first();
    if (!membership || membership.deletedAt) {
      throw new Error("Unauthorized: not a member of this company");
    }
    return membership;
  }
  // Organization (default)
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user_org", (q: any) =>
      q.eq("userId", ctx.user._id).eq("orgId", ownerId),
    )
    .first();
  if (!membership || membership.deletedAt) {
    throw new Error("Unauthorized: not a member of this organization");
  }
  return membership;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List mail for a specific owner entity (paginated).
 * If no ownerId is provided, defaults to user's profile.
 */
export const list = authQuery({
  args: {
    ownerId: v.optional(mailOwnerIdValidator),
    ownerType: v.optional(mailOwnerTypeValidator),
    folder: v.optional(mailFolderValidator),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    // Resolve owner — default to current user's profile
    let effectiveOwnerId = args.ownerId;
    if (!effectiveOwnerId) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
        .first();
      if (!profile) {
        return { page: [], isDone: true, continueCursor: "" };
      }
      effectiveOwnerId = profile._id;
    } else {
      // Verify access to the specified owner
      await verifyOwnerAccess(
        ctx,
        effectiveOwnerId,
        args.ownerType || MailOwnerType.Profile,
      );
    }

    if (args.folder) {
      return await ctx.db
        .query("digitalMail")
        .withIndex("by_owner_folder", (q) =>
          q.eq("ownerId", effectiveOwnerId!).eq("folder", args.folder!),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return await ctx.db
      .query("digitalMail")
      .withIndex("by_owner", (q) => q.eq("ownerId", effectiveOwnerId!))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/**
 * Get unread count for a specific owner entity.
 */
export const getUnreadCount = authQuery({
  args: {
    ownerId: v.optional(mailOwnerIdValidator),
    ownerType: v.optional(mailOwnerTypeValidator),
  },
  handler: async (ctx, args) => {
    let effectiveOwnerId = args.ownerId;
    if (!effectiveOwnerId) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
        .first();
      if (!profile) return 0;
      effectiveOwnerId = profile._id;
    } else {
      await verifyOwnerAccess(
        ctx,
        effectiveOwnerId,
        args.ownerType || MailOwnerType.Profile,
      );
    }

    const unread = await ctx.db
      .query("digitalMail")
      .withIndex("by_owner_unread", (q) =>
        q.eq("ownerId", effectiveOwnerId!).eq("isRead", false),
      )
      .take(200);

    return unread.length;
  },
});

/**
 * Get all mailbox accounts for the current user with unread counts.
 * Returns: user's profile + orgs + associations + companies.
 */
export const getAccountsWithUnread = authQuery({
  args: {},
  handler: async (ctx) => {
    // countUnread borne à 50 (suffisant pour afficher "50+" dans un badge).
    // Avant : .take(200) par account → jusqu'à 4×200 = 800 rows chargées juste
    // pour afficher un nombre. Maintenant on s'arrête dès 51.
    const countUnread = async (ownerId: string) => {
      const unread = await ctx.db
        .query("digitalMail")
        .withIndex("by_owner_unread", (q: any) =>
          q.eq("ownerId", ownerId).eq("isRead", false),
        )
        .take(51);
      return unread.length;
    };

    // ── Batch 1 : résoudre toutes les sources en parallèle ──
    const [profile, orgMemberships, assocMemberships, companyMemberships] =
      await Promise.all([
        ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
          .first(),
        ctx.db
          .query("memberships")
          .withIndex("by_user_org_deletedAt", (q) =>
            q.eq("userId", ctx.user._id),
          )
          .take(50),
        ctx.db
          .query("associationMembers")
          .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
          .take(50),
        ctx.db
          .query("companyMembers")
          .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
          .take(50),
      ]);

    // ── Batch 2 : résoudre toutes les entités liées en parallèle ──
    const activeOrgMships = orgMemberships.filter(
      (m) => m.deletedAt === undefined,
    );
    const activeAssocMships = assocMemberships.filter((m) => !m.deletedAt);
    const activeCompanyMships = companyMemberships.filter((m) => !m.deletedAt);

    const [orgs, assocs, companies] = await Promise.all([
      Promise.all(activeOrgMships.map((m) => ctx.db.get(m.orgId))),
      Promise.all(activeAssocMships.map((m) => ctx.db.get(m.associationId))),
      Promise.all(activeCompanyMships.map((m) => ctx.db.get(m.companyId))),
    ]);

    // ── Batch 3 : unread counts en parallèle ──
    const profileUnread = profile ? countUnread(profile._id) : Promise.resolve(0);
    const orgsUnread = Promise.all(
      orgs.map((o) => (o ? countUnread(o._id) : Promise.resolve(0))),
    );
    const assocsUnread = Promise.all(
      assocs.map((a) => (a ? countUnread(a._id) : Promise.resolve(0))),
    );
    const companiesUnread = Promise.all(
      companies.map((c) => (c ? countUnread(c._id) : Promise.resolve(0))),
    );

    const [
      profileUnreadCount,
      orgsUnreadCounts,
      assocsUnreadCounts,
      companiesUnreadCounts,
    ] = await Promise.all([profileUnread, orgsUnread, assocsUnread, companiesUnread]);

    const accounts: Array<{
      ownerId: string;
      ownerType: string;
      name: string;
      logoUrl?: string;
      orgType?: string;
      unreadCount: number;
    }> = [];

    if (profile) {
      accounts.push({
        ownerId: profile._id,
        ownerType: MailOwnerType.Profile,
        name:
          `${profile.identity?.firstName ?? ""} ${profile.identity?.lastName ?? ""}`.trim() ||
          ctx.user.name ||
          "Mon Profil",
        unreadCount: profileUnreadCount,
      });
    }

    orgs.forEach((org, idx) => {
      if (!org || org.deletedAt) return;
      accounts.push({
        ownerId: org._id,
        ownerType: MailOwnerType.Organization,
        name: org.name,
        logoUrl: org.logoUrl,
        orgType: org.type,
        unreadCount: orgsUnreadCounts[idx] ?? 0,
      });
    });

    assocs.forEach((assoc, idx) => {
      if (!assoc || assoc.deletedAt) return;
      accounts.push({
        ownerId: assoc._id,
        ownerType: MailOwnerType.Association,
        name: assoc.name,
        logoUrl: assoc.logoUrl,
        unreadCount: assocsUnreadCounts[idx] ?? 0,
      });
    });

    companies.forEach((company, idx) => {
      if (!company || company.deletedAt) return;
      accounts.push({
        ownerId: company._id,
        ownerType: MailOwnerType.Company,
        name: company.name,
        logoUrl: company.logoUrl,
        unreadCount: companiesUnreadCounts[idx] ?? 0,
      });
    });

    return accounts;
  },
});

/**
 * Get a single mail item by ID.
 */
export const getById = authQuery({
  args: { id: v.id("digitalMail") },
  handler: async (ctx, args) => {
    const mail = await ctx.db.get(args.id);
    if (!mail) return null;

    // Verify user has access to this mail's owner
    try {
      await verifyOwnerAccess(ctx, mail.ownerId, mail.ownerType);
    } catch {
      return null;
    }
    return mail;
  },
});

/**
 * Get all messages in a thread visible to the current user.
 * Returns them in chronological order (oldest first).
 */
export const getThread = authQuery({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    if (!args.threadId) return [];

    const all = await ctx.db
      .query("digitalMail")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .take(200);

    // Resolve all owner IDs the current user has access to
    const ownedIds = new Set<string>();

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .first();
    if (profile) ownedIds.add(profile._id);

    const orgMemberships = await ctx.db
      .query("memberships")
      .withIndex("by_user_org_deletedAt", (q) => q.eq("userId", ctx.user._id))
      .take(50);
    for (const m of orgMemberships.filter((m) => m.deletedAt === undefined)) {
      ownedIds.add(m.orgId);
    }

    const assocMemberships = await ctx.db
      .query("associationMembers")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .take(50);
    for (const m of assocMemberships.filter((m) => !m.deletedAt)) {
      ownedIds.add(m.associationId);
    }

    const companyMemberships = await ctx.db
      .query("companyMembers")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .take(50);
    for (const m of companyMemberships.filter((m) => !m.deletedAt)) {
      ownedIds.add(m.companyId);
    }

    return all.filter((m) => ownedIds.has(m.ownerId));
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Mark a mail item as read.
 */
export const markRead = authMutation({
  args: { id: v.id("digitalMail") },
  handler: async (ctx, args) => {
    const mail = await ctx.db.get(args.id);
    if (!mail) throw new Error("Mail not found");
    await verifyOwnerAccess(ctx, mail.ownerId, mail.ownerType);
    if (!mail.isRead) {
      await ctx.db.patch(args.id, {
        isRead: true,
        updatedAt: Date.now(),
      });
    }
    return true;
  },
});

/**
 * Toggle starred status.
 */
export const toggleStar = authMutation({
  args: { id: v.id("digitalMail") },
  handler: async (ctx, args) => {
    const mail = await ctx.db.get(args.id);
    if (!mail) throw new Error("Mail not found");
    await verifyOwnerAccess(ctx, mail.ownerId, mail.ownerType);
    await ctx.db.patch(args.id, {
      isStarred: !mail.isStarred,
      updatedAt: Date.now(),
    });
    return !mail.isStarred;
  },
});

/**
 * Move mail to a different folder.
 */
export const move = authMutation({
  args: {
    id: v.id("digitalMail"),
    folder: mailFolderValidator,
  },
  handler: async (ctx, args) => {
    const mail = await ctx.db.get(args.id);
    if (!mail) throw new Error("Mail not found");
    await verifyOwnerAccess(ctx, mail.ownerId, mail.ownerType);
    await ctx.db.patch(args.id, {
      folder: args.folder,
      updatedAt: Date.now(),
    });
    return true;
  },
});

/**
 * Delete a mail item permanently.
 */
export const remove = authMutation({
  args: { id: v.id("digitalMail") },
  handler: async (ctx, args) => {
    const mail = await ctx.db.get(args.id);
    if (!mail) throw new Error("Mail not found");
    await verifyOwnerAccess(ctx, mail.ownerId, mail.ownerType);
    await ctx.db.delete(args.id);
    return true;
  },
});

// ============================================================================
// SEARCH
// ============================================================================

/**
 * Search for recipient entities by name.
 * Searches profiles, orgs, associations, and companies.
 * Supports optional type filter.
 */
export const searchRecipients = authQuery({
  args: {
    query: v.string(),
    typeFilter: v.optional(mailOwnerTypeValidator),
  },
  handler: async (ctx, args) => {
    const q = args.query.trim();
    if (q.length < 2) return [];

    const results: Array<{
      ownerId: string;
      ownerType: string;
      name: string;
      subtitle?: string;
      logoUrl?: string;
    }> = [];

    const filter = args.typeFilter;

    // 1. Search profiles
    if (!filter || filter === MailOwnerType.Profile) {
      const byFirstName = await ctx.db
        .query("profiles")
        .withSearchIndex("search_firstName", (s) =>
          s.search("identity.firstName", q),
        )
        .take(10);
      const byLastName = await ctx.db
        .query("profiles")
        .withSearchIndex("search_lastName", (s) =>
          s.search("identity.lastName", q),
        )
        .take(10);

      const seenProfileIds = new Set<string>();
      for (const profile of [...byFirstName, ...byLastName]) {
        if (seenProfileIds.has(profile._id)) continue;
        seenProfileIds.add(profile._id);
        const firstName = profile.identity?.firstName ?? "";
        const lastName = profile.identity?.lastName ?? "";
        const name = `${firstName} ${lastName}`.trim();
        if (!name) continue;
        results.push({
          ownerId: profile._id,
          ownerType: MailOwnerType.Profile,
          name,
          subtitle: profile.contacts?.email,
        });
      }
    }

    // 2. Search orgs (consular/diplomatic)
    if (!filter || filter === MailOwnerType.Organization) {
      const orgs = await ctx.db
        .query("orgs")
        .withSearchIndex("search_name", (s) => s.search("name", q))
        .take(15);
      for (const org of orgs) {
        if (!org.isActive || org.deletedAt) continue;
        results.push({
          ownerId: org._id,
          ownerType: MailOwnerType.Organization,
          name: org.name,
          subtitle: org.type,
          logoUrl: org.logoUrl,
        });
      }
    }

    // 3. Search associations
    if (!filter || filter === MailOwnerType.Association) {
      const assocs = await ctx.db
        .query("associations")
        .withSearchIndex("search_name", (s) => s.search("name", q))
        .take(15);
      for (const a of assocs) {
        if (!a.isActive || a.deletedAt) continue;
        results.push({
          ownerId: a._id,
          ownerType: MailOwnerType.Association,
          name: a.name,
          subtitle: a.associationType,
          logoUrl: a.logoUrl,
        });
      }
    }

    // 4. Search companies
    if (!filter || filter === MailOwnerType.Company) {
      const companies = await ctx.db
        .query("companies")
        .withSearchIndex("search_name", (s) => s.search("name", q))
        .take(15);
      for (const c of companies) {
        if (!c.isActive || c.deletedAt) continue;
        results.push({
          ownerId: c._id,
          ownerType: MailOwnerType.Company,
          name: c.name,
          subtitle: c.activitySector,
          logoUrl: c.logoUrl,
        });
      }
    }

    return results.slice(0, 20);
  },
});
