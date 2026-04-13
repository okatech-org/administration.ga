/**
 * Citizen Contacts — Contacts des représentations visibles par les citoyens.
 *
 * Permet aux citoyens de voir et contacter :
 *  1. Leurs représentations diplomatiques (org) — toujours contactables (mail standard)
 *  2. Les membres du corps administratif qui ont opt-in (`isPublicContact === true`)
 *
 * Business rules:
 *  - Les orgs sont toujours visibles pour les citoyens qui y sont rattachés
 *  - Les membres individuels ne sont visibles que si `membership.isPublicContact === true`
 *  - L'email officiel (`diplomaticProfile.officialEmail`) est exposé si disponible
 */

import { v } from "convex/values";
import { authQuery } from "../lib/customFunctions";
import { MailOwnerType } from "../lib/constants";
import type { Id } from "../_generated/dataModel";

// ── Types ──────────────────────────────────────────────────────────────────

export interface RepresentationContact {
  /** org._id — used as the mail recipient ownerId */
  orgId: string;
  orgName: string;
  orgType: string;
  orgSlug: string;
  orgEmail?: string;
  orgCountry: string;
  /** Public-facing members of this org */
  members: PublicMember[];
}

export interface PublicMember {
  /** membership._id — for unique keying only */
  membershipId: string;
  /** user._id — for avatar / profile lookup */
  userId: string;
  /** profile._id — used as the mail recipient ownerId (type: profile) */
  profileId: string;
  /** Display name */
  name: string;
  firstName: string;
  lastName: string;
  /** Position title (localized) */
  positionTitle?: string;
  positionGrade?: string;
  /** Official email for display */
  officialEmail?: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Official photo storage ID */
  officialPhotoStorageId?: string;
}

// ── Queries ────────────────────────────────────────────────────────────────

/**
 * Get the citizen's representations with their public contacts.
 *
 * Returns a flat list of orgs (representations linked to the citizen)
 * each with an array of public members (isPublicContact === true).
 *
 * Used in the ComposeDialog to show a "Postes diplomatiques" section.
 */
export const getRepresentationContacts = authQuery({
  args: {},
  handler: async (ctx): Promise<RepresentationContact[]> => {
    // 1. Get citizen's profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();

    if (!profile) return [];

    // 2. Collect org IDs linked to this citizen
    const orgIds = new Set<string>();

    // 2a. Managed org
    if (profile.managedByOrgId) {
      orgIds.add(profile.managedByOrgId);
    }

    // 2b. Consular registrations
    const registrations = await ctx.db
      .query("consularRegistrations")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .take(20);

    for (const reg of registrations) {
      if (reg.status === "active" || reg.status === "requested") {
        orgIds.add(reg.orgId);
      }
    }

    // 2c. Residence country orgs (jurisdiction)
    const residenceCountry =
      profile.countryOfResidence || profile.addresses?.residence?.country;

    if (residenceCountry) {
      const allOrgs = await ctx.db
        .query("orgs")
        .withIndex("by_active_notDeleted", (q) =>
          q.eq("isActive", true).eq("deletedAt", undefined),
        )
        .take(200);

      const diplomaticTypes = new Set([
        "embassy",
        "high_representation",
        "general_consulate",
        "high_commission",
        "permanent_mission",
      ]);

      for (const org of allOrgs) {
        if (!diplomaticTypes.has(org.type)) continue;
        if (
          org.jurisdictionCountries?.includes(residenceCountry as any)
        ) {
          orgIds.add(org._id);
        }
      }
    }

    // 2d. Signaled org
    if (profile.signaledToOrgId) {
      orgIds.add(profile.signaledToOrgId);
    }

    if (orgIds.size === 0) return [];

    // 3. For each org, load the org + public members
    const results: RepresentationContact[] = [];

    for (const orgId of orgIds) {
      const org = await ctx.db.get(orgId as Id<"orgs">);
      if (!org || !org.isActive || org.deletedAt) continue;

      // Load memberships where isPublicContact === true
      const memberships = await ctx.db
        .query("memberships")
        .withIndex("by_org_deletedAt", (q) =>
          q.eq("orgId", org._id).eq("deletedAt", undefined),
        )
        .take(100);

      const publicMembers: PublicMember[] = [];

      for (const membership of memberships) {
        if (!membership.isPublicContact) continue;

        // Load user
        const user = await ctx.db.get(membership.userId);
        if (!user || !user.isActive) continue;

        // Load position title
        let positionTitle: string | undefined;
        let positionGrade: string | undefined;
        if (membership.positionId) {
          const position = await ctx.db.get(membership.positionId);
          if (position) {
            positionTitle = (position.title as any)?.fr ?? (position.title as any)?.en ?? position.code;
            positionGrade = position.grade ?? undefined;
          }
        }

        // Load profile for profileId
        const memberProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .first();

        if (!memberProfile) continue;

        publicMembers.push({
          membershipId: membership._id,
          userId: user._id,
          profileId: memberProfile._id,
          name: user.name ?? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
          firstName: user.firstName ?? user.name?.split(" ").slice(0, -1).join(" ") ?? "",
          lastName: user.lastName ?? user.name?.split(" ").pop() ?? "",
          positionTitle,
          positionGrade,
          officialEmail: membership.diplomaticProfile?.officialEmail,
          avatarUrl: user.avatarUrl ?? undefined,
          officialPhotoStorageId: membership.diplomaticProfile?.officialPhotoStorageId
            ? (membership.diplomaticProfile.officialPhotoStorageId as string)
            : undefined,
        });
      }

      // Sort members by position grade (chief first)
      const gradeOrder: Record<string, number> = {
        chief: 0,
        counselor: 1,
        agent: 2,
        external: 3,
      };
      publicMembers.sort(
        (a, b) =>
          (gradeOrder[a.positionGrade ?? "external"] ?? 99) -
          (gradeOrder[b.positionGrade ?? "external"] ?? 99),
      );

      results.push({
        orgId: org._id,
        orgName: org.name,
        orgType: org.type,
        orgSlug: org.slug,
        orgEmail: org.email,
        orgCountry: org.country,
        members: publicMembers,
      });
    }

    return results;
  },
});

/**
 * Search for recipients available to a citizen in the compose dialog.
 *
 * Merges:
 *  - Citizen's representations (org-level, always contactable)
 *  - Public members of those representations (individual, opt-in)
 *  - Standard searchRecipients results (profiles, associations, companies)
 *
 * When no search query provided, returns the citizen's representations
 * and public members as "suggested contacts".
 */
export const searchCitizenRecipients = authQuery({
  args: {
    query: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const searchTerm = (args.query ?? "").trim().toLowerCase();

    const results: Array<{
      ownerId: string;
      ownerType: string;
      name: string;
      subtitle?: string;
      logoUrl?: string;
      badge?: string;
      section: "representation" | "member" | "other";
    }> = [];

    // 1. Get citizen representations + public members
    // Use inline logic instead of calling self to avoid function ref issues
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .first();

    if (!profile) return results;

    // Collect org IDs
    const orgIds = new Set<string>();
    if (profile.managedByOrgId) orgIds.add(profile.managedByOrgId);

    const registrations = await ctx.db
      .query("consularRegistrations")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .take(20);
    for (const reg of registrations) {
      if (reg.status === "active" || reg.status === "requested") {
        orgIds.add(reg.orgId);
      }
    }

    if (profile.signaledToOrgId) orgIds.add(profile.signaledToOrgId);

    // Residence jurisdiction
    const residenceCountry =
      profile.countryOfResidence || profile.addresses?.residence?.country;
    if (residenceCountry) {
      const allOrgs = await ctx.db
        .query("orgs")
        .withIndex("by_active_notDeleted", (q) =>
          q.eq("isActive", true).eq("deletedAt", undefined),
        )
        .take(200);
      const dipTypes = new Set([
        "embassy", "high_representation", "general_consulate",
        "high_commission", "permanent_mission",
      ]);
      for (const org of allOrgs) {
        if (dipTypes.has(org.type) && org.jurisdictionCountries?.includes(residenceCountry as any)) {
          orgIds.add(org._id);
        }
      }
    }

    // 2. For each org, add org + public members
    for (const orgId of orgIds) {
      const org = await ctx.db.get(orgId as Id<"orgs">);
      if (!org || !org.isActive || org.deletedAt) continue;

      // Add the org itself (standard contact)
      const orgNameLower = org.name.toLowerCase();
      if (!searchTerm || orgNameLower.includes(searchTerm)) {
        results.push({
          ownerId: org._id,
          ownerType: MailOwnerType.Organization,
          name: org.name,
          subtitle: org.email ?? org.type,
          logoUrl: org.logoUrl,
          badge: "standard",
          section: "representation",
        });
      }

      // Add public members
      const memberships = await ctx.db
        .query("memberships")
        .withIndex("by_org_deletedAt", (q) =>
          q.eq("orgId", org._id).eq("deletedAt", undefined),
        )
        .take(100);

      for (const m of memberships) {
        if (!m.isPublicContact) continue;

        const user = await ctx.db.get(m.userId);
        if (!user || !user.isActive) continue;

        const memberProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .first();
        if (!memberProfile) continue;

        // Get position title
        let positionTitle: string | undefined;
        if (m.positionId) {
          const pos = await ctx.db.get(m.positionId);
          if (pos) {
            positionTitle = (pos.title as any)?.fr ?? (pos.title as any)?.en ?? pos.code;
          }
        }

        const memberName = user.name ?? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
        const memberNameLower = memberName.toLowerCase();
        const positionLower = positionTitle?.toLowerCase() ?? "";

        if (
          !searchTerm ||
          memberNameLower.includes(searchTerm) ||
          positionLower.includes(searchTerm) ||
          orgNameLower.includes(searchTerm)
        ) {
          results.push({
            ownerId: memberProfile._id,
            ownerType: MailOwnerType.Profile,
            name: memberName,
            subtitle: positionTitle
              ? `${positionTitle} — ${org.name}`
              : org.name,
            logoUrl: user.avatarUrl ?? undefined,
            badge: "direct",
            section: "member",
          });
        }
      }
    }

    // 3. If user typed a search, also include standard recipient search
    if (searchTerm.length >= 2) {
      // Search profiles
      const byFirstName = await ctx.db
        .query("profiles")
        .withSearchIndex("search_firstName", (s) =>
          s.search("identity.firstName", searchTerm),
        )
        .take(10);
      const byLastName = await ctx.db
        .query("profiles")
        .withSearchIndex("search_lastName", (s) =>
          s.search("identity.lastName", searchTerm),
        )
        .take(10);

      const seenIds = new Set(results.map((r) => r.ownerId));

      for (const p of [...byFirstName, ...byLastName]) {
        if (seenIds.has(p._id)) continue;
        seenIds.add(p._id);
        const name = `${p.identity?.firstName ?? ""} ${p.identity?.lastName ?? ""}`.trim();
        if (!name) continue;
        results.push({
          ownerId: p._id,
          ownerType: MailOwnerType.Profile,
          name,
          subtitle: p.contacts?.email,
          section: "other",
        });
      }

      // Search associations
      const assocs = await ctx.db
        .query("associations")
        .withSearchIndex("search_name", (s) => s.search("name", searchTerm))
        .take(10);
      for (const a of assocs) {
        if (!a.isActive || a.deletedAt || seenIds.has(a._id)) continue;
        seenIds.add(a._id);
        results.push({
          ownerId: a._id,
          ownerType: MailOwnerType.Association,
          name: a.name,
          subtitle: a.associationType,
          logoUrl: a.logoUrl,
          section: "other",
        });
      }

      // Search companies
      const companies = await ctx.db
        .query("companies")
        .withSearchIndex("search_name", (s) => s.search("name", searchTerm))
        .take(10);
      for (const c of companies) {
        if (!c.isActive || c.deletedAt || seenIds.has(c._id)) continue;
        seenIds.add(c._id);
        results.push({
          ownerId: c._id,
          ownerType: MailOwnerType.Company,
          name: c.name,
          subtitle: c.activitySector,
          logoUrl: c.logoUrl,
          section: "other",
        });
      }
    }

    return results.slice(0, 30);
  },
});
