/**
 * diplomaticProfile — Queries et mutations pour iProfil métier
 *
 * Gère le profil diplomatique des membres du corps administratif :
 * identité, poste, accréditations, langues, signature officielle.
 */

import { v } from "convex/values";
import { authQuery, authMutation, backofficeMutation } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";

// ═══════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════

/**
 * Lire son profil diplomatique complet
 * Retourne user + toutes ses memberships enrichies (position + org)
 */
export const getMyDiplomaticProfile = authQuery({
  args: {},
  handler: async (ctx) => {
    const user = ctx.user;

    // Récupérer toutes les memberships actives
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) => q.eq("userId", user._id))
      .collect();

    const activeMemberships = memberships.filter((m) => !m.deletedAt);

    // Enrichir chaque membership avec position + org
    const enriched = await Promise.all(
      activeMemberships.map(async (m) => {
        const org = await ctx.db.get(m.orgId);
        const position = m.positionId ? await ctx.db.get(m.positionId) : null;

        return {
          _id: m._id,
          orgId: m.orgId,
          positionId: m.positionId,
          diplomaticProfile: (m as any).diplomaticProfile ?? null,
          isPublicContact: m.isPublicContact,
          settings: m.settings,
          org: org
            ? {
                _id: org._id,
                name: org.name,
                type: org.type,
                country: org.country,
                slug: org.slug,
                logoUrl: org.logoUrl,
              }
            : null,
          position: position
            ? {
                _id: position._id,
                code: position.code,
                title: position.title,
                grade: position.grade,
                level: position.level,
                moduleAccess: (position as any).moduleAccess,
              }
            : null,
        };
      }),
    );

    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        firstName: (user as any).firstName,
        lastName: (user as any).lastName,
        phone: (user as any).phone,
        avatarUrl: (user as any).avatarUrl,
        role: (user as any).role,
        preferences: (user as any).preferences,
      },
      memberships: enriched,
    };
  },
});

// ═══════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Mettre à jour son profil diplomatique
 * L'utilisateur peut modifier : status, contact pro, langues, bio
 */
export const updateMyDiplomaticProfile = authMutation({
  args: {
    membershipId: v.id("memberships"),
    diplomaticProfile: v.object({
      status: v.optional(v.string()),
      officePhone: v.optional(v.string()),
      officeExtension: v.optional(v.string()),
      officialEmail: v.optional(v.string()),
      languages: v.optional(
        v.array(
          v.object({
            code: v.string(),
            level: v.string(),
          }),
        ),
      ),
      bio: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db.get(args.membershipId);
    if (!membership || membership.userId !== ctx.user._id) {
      throw new Error("Unauthorized");
    }

    const existing = (membership as any).diplomaticProfile ?? {};
    await ctx.db.patch(args.membershipId, {
      diplomaticProfile: {
        ...existing,
        ...args.diplomaticProfile,
      },
    } as any);
  },
});

/**
 * Mettre à jour les accréditations (admin ou l'utilisateur lui-même)
 */
export const updateCredentials = authMutation({
  args: {
    membershipId: v.id("memberships"),
    credentials: v.object({
      lettersOfCredence: v.optional(
        v.object({
          presentedDate: v.optional(v.number()),
        }),
      ),
      diplomaticCard: v.optional(
        v.object({
          number: v.optional(v.string()),
          issuedAt: v.optional(v.number()),
          expiresAt: v.optional(v.number()),
        }),
      ),
      diplomaticPassport: v.optional(
        v.object({
          number: v.optional(v.string()),
          expiresAt: v.optional(v.number()),
        }),
      ),
      exequatur: v.optional(
        v.object({
          grantedDate: v.optional(v.number()),
        }),
      ),
    }),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) throw new Error("Membership not found");

    // L'utilisateur peut modifier ses propres accréditations
    // ou un admin peut modifier celles d'un autre membre
    const isOwn = membership.userId === ctx.user._id;
    if (!isOwn) {
      const callerMembership = await getMembership(ctx, ctx.user._id, membership.orgId);
      await assertCanDoTask(ctx, ctx.user, callerMembership, "team.manage");
    }

    const existing = (membership as any).diplomaticProfile ?? {};
    await ctx.db.patch(args.membershipId, {
      diplomaticProfile: {
        ...existing,
        credentials: {
          ...(existing.credentials ?? {}),
          ...args.credentials,
        },
      },
    } as any);
  },
});

/**
 * Uploader sa signature officielle
 */
export const uploadOfficialSignature = authMutation({
  args: {
    membershipId: v.id("memberships"),
    storageId: v.id("_storage"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db.get(args.membershipId);
    if (!membership || membership.userId !== ctx.user._id) {
      throw new Error("Unauthorized");
    }

    const existing = (membership as any).diplomaticProfile ?? {};
    await ctx.db.patch(args.membershipId, {
      diplomaticProfile: {
        ...existing,
        officialSignature: {
          imageStorageId: args.storageId,
          title: args.title,
        },
      },
    } as any);
  },
});

/**
 * Ajouter une affectation précédente à l'historique
 */
export const addPreviousPosting = authMutation({
  args: {
    membershipId: v.id("memberships"),
    posting: v.object({
      position: v.string(),
      orgName: v.string(),
      country: v.string(),
      startDate: v.number(),
      endDate: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) throw new Error("Membership not found");

    // Seul un admin ou l'utilisateur lui-même
    const isOwn = membership.userId === ctx.user._id;
    if (!isOwn) {
      const callerMembership = await getMembership(ctx, ctx.user._id, membership.orgId);
      await assertCanDoTask(ctx, ctx.user, callerMembership, "team.manage");
    }

    const existing = (membership as any).diplomaticProfile ?? {};
    const postings = existing.previousPostings ?? [];

    await ctx.db.patch(args.membershipId, {
      diplomaticProfile: {
        ...existing,
        previousPostings: [...postings, args.posting],
      },
    } as any);
  },
});

// ═══════════════════════════════════════════════════════════════
// ADMIN — Édition complète depuis le backoffice
// ═══════════════════════════════════════════════════════════════

/**
 * Mise à jour complète du profil diplomatique par le SuperAdmin.
 * Peut modifier TOUS les champs : statut, contact, langues, bio, credentials.
 */
export const adminUpdateDiplomaticProfile = backofficeMutation({
  args: {
    membershipId: v.id("memberships"),
    diplomaticProfile: v.object({
      status: v.optional(v.string()),
      startDate: v.optional(v.number()),
      officePhone: v.optional(v.string()),
      officeExtension: v.optional(v.string()),
      officialEmail: v.optional(v.string()),
      languages: v.optional(v.array(v.object({
        code: v.string(),
        level: v.string(),
      }))),
      bio: v.optional(v.string()),
      credentials: v.optional(v.object({
        lettersOfCredence: v.optional(v.object({
          presentedDate: v.optional(v.number()),
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
      previousPostings: v.optional(v.array(v.object({
        position: v.string(),
        orgName: v.string(),
        country: v.string(),
        startDate: v.number(),
        endDate: v.optional(v.number()),
      }))),
    }),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) throw new Error("Membership introuvable");

    const existing = (membership as any).diplomaticProfile ?? {};
    await ctx.db.patch(args.membershipId, {
      diplomaticProfile: {
        ...existing,
        ...args.diplomaticProfile,
      },
    } as any);

    return args.membershipId;
  },
});
