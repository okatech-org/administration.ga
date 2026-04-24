import { v } from "convex/values";
import { query } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

/**
 * Public services API — unauthenticated, designed for cross-deployment
 * consumption by trusted partner sites (e.g. france.consulat.ga).
 *
 * These queries only return fields safe to display on a public website.
 * Never expose internal notes, access control, or auto-generation rules.
 *
 * CORS / origin whitelisting is handled upstream via TRUSTED_ORIGINS
 * (convex/http.ts) — Convex queries themselves accept any origin.
 */

type PublicOrgService = {
  orgServiceId: string;
  orgId: string;
  serviceId: string;
  serviceSlug: string;
  serviceCode: string;
  name: Doc<"services">["name"];
  description: Doc<"services">["description"];
  category: Doc<"services">["category"];
  icon?: string;
  estimatedDays: number;
  requiresAppointment: boolean;
  pricing: Doc<"orgServices">["pricing"];
  isActive: boolean;
  joinedDocuments: NonNullable<Doc<"services">["joinedDocuments"]>;
};

function toPublicOrgService(
  os: Doc<"orgServices">,
  service: Doc<"services">,
): PublicOrgService {
  return {
    orgServiceId: os._id,
    orgId: os.orgId,
    serviceId: os.serviceId,
    serviceSlug: service.slug,
    serviceCode: service.code,
    name: service.name,
    description: service.description,
    category: service.category,
    icon: service.icon,
    estimatedDays: os.estimatedDays ?? service.estimatedDays,
    requiresAppointment:
      os.requiresAppointment ?? service.requiresAppointment ?? false,
    pricing: os.pricing,
    isActive: os.isActive,
    joinedDocuments:
      service.formSchema?.joinedDocuments ?? service.joinedDocuments ?? [],
  };
}

type PublicOrgInfo = {
  orgId: string;
  slug: string;
  name: string;
  shortName?: string;
  type: Doc<"orgs">["type"];
  country: Doc<"orgs">["country"];
  timezone: string;
  email?: string;
  phone?: string;
  website?: string;
  description?: string;
  logoUrl?: string;
  address?: Doc<"orgs">["address"];
  jurisdictionCountries?: Doc<"orgs">["jurisdictionCountries"];
};

function toPublicOrg(org: Doc<"orgs">): PublicOrgInfo {
  return {
    orgId: org._id,
    slug: org.slug,
    name: org.name,
    shortName: org.shortName,
    type: org.type,
    country: org.country,
    timezone: org.timezone,
    email: org.email,
    phone: org.phone,
    website: org.website,
    description: org.description,
    logoUrl: org.logoUrl,
    address: org.address,
    jurisdictionCountries: org.jurisdictionCountries,
  };
}

/**
 * List every orgService of a given organization — active AND inactive.
 * Callers decide whether to show a "Faire la demande" CTA based on
 * `isActive`; inactive services still return with their informational
 * metadata so partner sites can display them as "coming soon".
 */
export const listByOrgSlug = query({
  args: { orgSlug: v.string() },
  handler: async (ctx, args): Promise<PublicOrgService[]> => {
    const org = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", args.orgSlug))
      .unique();

    if (!org || !org.isActive || org.deletedAt) return [];

    const orgServices = await ctx.db
      .query("orgServices")
      .withIndex("by_org_service", (q) => q.eq("orgId", org._id))
      .take(200);

    if (orgServices.length === 0) return [];

    const serviceIds = [...new Set(orgServices.map((os) => os.serviceId))];
    const services = await Promise.all(serviceIds.map((id) => ctx.db.get(id)));
    const serviceMap = new Map(
      services.filter((s): s is Doc<"services"> => Boolean(s)).map((s) => [s._id, s]),
    );

    return orgServices
      .map((os) => {
        const service = serviceMap.get(os.serviceId);
        if (!service || !service.isActive) return null;
        return toPublicOrgService(os, service);
      })
      .filter((s): s is PublicOrgService => s !== null);
  },
});

/**
 * Detailed view of a single (org, service) pair, joined on slugs.
 * Returns null if the org or the service does not exist. Returns the
 * service with `isActive: false` so the calling site can render the
 * information page without a CTA.
 */
export const getByOrgAndServiceSlug = query({
  args: {
    orgSlug: v.string(),
    serviceSlug: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<(PublicOrgService & { org: PublicOrgInfo }) | null> => {
    const org = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", args.orgSlug))
      .unique();

    if (!org || !org.isActive || org.deletedAt) return null;

    const service = await ctx.db
      .query("services")
      .withIndex("by_slug", (q) => q.eq("slug", args.serviceSlug))
      .unique();

    if (!service || !service.isActive) return null;

    const orgService = await ctx.db
      .query("orgServices")
      .withIndex("by_org_service", (q) =>
        q.eq("orgId", org._id).eq("serviceId", service._id),
      )
      .unique();

    if (!orgService) return null;

    return {
      ...toPublicOrgService(orgService, service),
      org: toPublicOrg(org),
    };
  },
});

/**
 * Public-facing org information — identity, contact, jurisdiction.
 * Safe to expose on any partner website.
 */
export const getOrgPublicInfo = query({
  args: { orgSlug: v.string() },
  handler: async (ctx, args): Promise<PublicOrgInfo | null> => {
    const org = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", args.orgSlug))
      .unique();

    if (!org || !org.isActive || org.deletedAt) return null;
    return toPublicOrg(org);
  },
});
