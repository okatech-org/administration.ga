import { authQuery } from "../lib/customFunctions";
import { CountryCode } from "../lib/countryCodeValidator";

/**
 * Representation roles for the Assistance & Représentations widget.
 * Determines the badge and description shown on each card.
 */
type RepresentationRole = "demarches" | "residence" | "sejour";

interface RepresentationResult {
  id: string;
  name: string;
  slug: string;
  type: string;
  country: string;
  role: RepresentationRole;
  badge: string;
  description: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

/**
 * Get the representations relevant to the current user.
 *
 * Business rules:
 * 1. Show the org that manages the user's dossier — badge "Démarches"
 *    Sources (in order): profile.managedByOrgId, or active consular registration org
 * 2. Show org(s) with jurisdiction over the country of residence — badge "Résidence"
 *    Sources: profile.countryOfResidence, or profile.addresses.residence.country
 * 3. If the user has signaled their presence abroad (signaledToOrgId), show that org — badge "En Séjour"
 * 4. Deduplicate: same org only appears once, first role wins
 */
export const getMyRepresentations = authQuery({
  args: {},
  handler: async (ctx): Promise<RepresentationResult[]> => {
    // 1. Get user's profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();

    if (!profile) return [];

    const results: RepresentationResult[] = [];
    const addedOrgIds = new Set<string>();

    // Helper to add an org to results without duplicates
    const addOrg = (
      org: { _id: any; name: string; slug: string; type: string; country: string; address?: any },
      role: RepresentationRole,
    ) => {
      const id = org._id as string;
      if (addedOrgIds.has(id)) return;
      addedOrgIds.add(id);

      const badgeMap: Record<RepresentationRole, string> = {
        demarches: "Démarches",
        residence: "Résidence",
        sejour: "En Séjour",
      };
      const descMap: Record<RepresentationRole, string> = {
        demarches: "Vos démarches consulaires",
        residence: "Votre juridiction de résidence",
        sejour: "Assistance lors de votre séjour",
      };

      results.push({
        id,
        name: org.name,
        slug: org.slug,
        type: org.type,
        country: org.country,
        role,
        badge: badgeMap[role],
        description: descMap[role],
        address: org.address ? {
          street: org.address.street,
          city: org.address.city,
          postalCode: org.address.postalCode,
          country: org.address.country,
        } : undefined,
      });
    };

    // ─── 2. Managed org (primary — the org that handles this citizen's admin) ───
    // Source A: profile.managedByOrgId (set explicitly)
    if (profile.managedByOrgId) {
      const managedOrg = await ctx.db.get(profile.managedByOrgId);
      if (managedOrg && managedOrg.isActive && !managedOrg.deletedAt) {
        addOrg(managedOrg, "demarches");
      }
    }

    // Source B: Fallback — look at consular registrations (active or requested)
    // This is how the "Géré par" in the header works
    if (addedOrgIds.size === 0) {
      const registrations = await ctx.db
        .query("consularRegistrations")
        .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
        .collect();

      // Find the most recent active or requested registration
      const activeReg =
        registrations.find((r) => r.status === "active") ??
        registrations.find((r) => r.status === "requested") ??
        registrations[0];

      if (activeReg) {
        const regOrg = await ctx.db.get(activeReg.orgId);
        if (regOrg && regOrg.isActive && !regOrg.deletedAt) {
          addOrg(regOrg, "demarches");
        }
      }
    }

    // ─── 3. Residence country orgs (jurisdiction match) ───
    const residenceCountry =
      profile.countryOfResidence || profile.addresses?.residence?.country;

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

      for (const org of allOrgs) {
        if (!diplomaticTypes.includes(org.type)) continue;
        if (
          !org.jurisdictionCountries ||
          org.jurisdictionCountries.length === 0
        )
          continue;
        if (
          org.jurisdictionCountries.includes(residenceCountry as CountryCode)
        ) {
          addOrg(org, "residence");
        }
      }
    }

    // ─── 4. Signaled org (temporary presence abroad) ───
    if (profile.signaledToOrgId) {
      const signaledOrg = await ctx.db.get(profile.signaledToOrgId);
      if (signaledOrg && signaledOrg.isActive && !signaledOrg.deletedAt) {
        addOrg(signaledOrg, "sejour");
      }
    }

    return results;
  },
});
