/**
 * Queries publiques pour la page /reps/[slug] (refonte design).
 *
 * Ces queries agrègent les données nécessaires au rendu complet de la page
 * publique d'une représentation : org enrichie, horaires, fermetures, staff
 * publié, disponibilité du standard, documents téléchargeables.
 *
 * Toutes les queries sont SANS auth (page publique). Le cloisonnement
 * `intelligence_agency` est respecté (retour null).
 */
import { v } from "convex/values";
import { query } from "../_generated/server";
import { RequestStatus } from "../lib/constants";
import { isIntelligenceAgency } from "../lib/intelligenceAgencyVisibility";
import {
  getOrgSchedule,
  getOrgAddress,
  getOrgLogoUrl,
  getOrgTimezone,
} from "../lib/orgHelpers";

/**
 * Détails complets d'une représentation pour la page publique.
 * Agrège org + calendar + closures + contact channels + logo URL.
 */
export const publicDetails = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!org || org.deletedAt || isIntelligenceAgency(org)) return null;

    const [address, schedule, logoUrl, timezone, calendar] = await Promise.all([
      Promise.resolve(getOrgAddress(org)),
      getOrgSchedule(ctx, org),
      getOrgLogoUrl(ctx, org),
      getOrgTimezone(ctx, org),
      ctx.db
        .query("orgCalendar")
        .withIndex("by_org", (q) => q.eq("orgId", org._id))
        .first(),
    ]);

    const now = Date.now();
    const upcomingClosure = calendar?.exceptionalClosures
      ?.filter((c) => c.showToPublic && c.endDate >= now)
      .sort((a, b) => a.startDate - b.startDate)[0];

    // Parent org (pour ministère de tutelle)
    const parentOrg = org.parentOrgId
      ? await ctx.db.get(org.parentOrgId)
      : null;

    return {
      ...org,
      _derived: {
        address,
        schedule,
        logoUrl,
        timezone,
        upcomingClosure: upcomingClosure ?? null,
        holidays: calendar?.holidays?.filter((h) => h.showToPublic) ?? [],
        parentOrgName: parentOrg?.name ?? null,
      },
    };
  },
});

/**
 * Liste du personnel diplomatique publiable.
 * Filtre les memberships avec `isPublicContact = true`, joint user + position.
 */
export const publicStaff = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (!org || isIntelligenceAgency(org)) return [];

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_org_deletedAt", (q) =>
        q.eq("orgId", args.orgId).eq("deletedAt", undefined),
      )
      .collect();

    const publishable = memberships.filter((m) => m.isPublicContact === true);

    const enriched = await Promise.all(
      publishable.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        if (!user) return null;
        const position = m.positionId
          ? await ctx.db.get(m.positionId)
          : null;
        const photoStorageId = m.diplomaticProfile?.officialPhotoStorageId;
        const photoUrl = photoStorageId
          ? await ctx.storage.getUrl(photoStorageId)
          : user.avatarUrl ?? null;

        return {
          membershipId: m._id,
          userId: user._id,
          name: user.name,
          titleFr: position?.title?.fr ?? null,
          titleEn: position?.title?.en ?? null,
          positionLevel: position?.level ?? 99,
          positionCode: position?.code ?? null,
          photoUrl,
          bio: m.diplomaticProfile?.bio ?? null,
          officialEmail: m.diplomaticProfile?.officialEmail ?? null,
          officePhone: m.diplomaticProfile?.officePhone ?? null,
        };
      }),
    );

    return enriched
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => a.positionLevel - b.positionLevel);
  },
});

/**
 * Disponibilité du standard téléphonique en ligne (widget « Appeler en ligne »).
 * Dérivé de `agentPresence` filtré par org.
 */
export const callAvailability = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (!org || isIntelligenceAgency(org)) {
      return { status: "offline" as const, agentsOnline: 0, estimatedWaitMinutes: null };
    }

    // Récupère les agents présents sur cette org via la table agentPresence.
    // On considère "online" : status=online et lastSeen < 5 min.
    const now = Date.now();
    const FIVE_MIN = 5 * 60 * 1000;


    // Tentative best-effort : si la table agentPresence n'existe pas encore
    // pour ces users, on retombe sur "offline".
    let onlineCount = 0;
    try {
      const presences = await ctx.db
        .query("agentPresence")
        .withIndex("by_org_and_status", (q) =>
          q.eq("orgId", args.orgId).eq("status", "online"),
        )
        .collect();
      onlineCount = presences.filter(
        (p) => now - p.lastHeartbeat < FIVE_MIN,
      ).length;
    } catch {
      // Schéma indispo / index manquant → offline
    }

    // Estimation simple : 2 min par agent si dispo, sinon null
    const estimatedWaitMinutes = onlineCount > 0 ? 2 : null;
    const status: "available" | "busy" | "offline" =
      onlineCount === 0 ? "offline" : onlineCount >= 2 ? "available" : "busy";

    return { status, agentsOnline: onlineCount, estimatedWaitMinutes };
  },
});

/**
 * Documents publics téléchargeables.
 */
export const publicDocuments = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("orgPublicDocuments")
      .withIndex("by_org_active_order", (q) =>
        q.eq("orgId", args.orgId).eq("isActive", true),
      )
      .collect();

    const withUrls = await Promise.all(
      docs
        .filter((d) => !d.deletedAt)
        .filter((d) => !d.expiresAt || d.expiresAt > Date.now())
        .sort((a, b) => a.order - b.order)
        .map(async (d) => ({
          _id: d._id,
          title: d.title,
          titleI18n: d.titleI18n,
          description: d.description,
          category: d.category,
          mimeType: d.mimeType,
          sizeBytes: d.sizeBytes,
          downloadUrl: await ctx.storage.getUrl(d.storageId),
        })),
    );

    return withUrls;
  },
});

/**
 * Stats publiques pour le bloc « L'ambassade en chiffres ».
 * Toutes valeurs dérivées de la DB — pas de valeur fictive.
 */
export const publicOrgStats = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (!org || isIntelligenceAgency(org)) return null;

    // Inscriptions consulaires actives sur cette org
    const registrations = await ctx.db
      .query("consularRegistrations")
      .filter((q) => q.eq(q.field("orgId"), args.orgId))
      .collect();
    const registrationsCount = registrations.filter(
      (r) => r.status === "active",
    ).length;

    // Requests par catégorie (année courante).
    // On joint requests → orgServices → services pour récupérer la catégorie.
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1).getTime();
    const requests = await ctx.db
      .query("requests")
      .withIndex("by_org_status", (q) => q.eq("orgId", args.orgId))
      .collect();

    const inYearAndCompleted = requests.filter(
      (r) =>
        r.status === RequestStatus.Completed &&
        typeof r.completedAt === "number" &&
        r.completedAt >= yearStart,
    );

    // Cache local des catégories par orgServiceId pour éviter les fetches répétés.
    const categoryByOrgService = new Map<string, string>();
    for (const r of inYearAndCompleted) {
      const key = r.orgServiceId as unknown as string;
      if (categoryByOrgService.has(key)) continue;
      const orgService = await ctx.db.get(r.orgServiceId);
      if (!orgService) continue;
      const service = await ctx.db.get(orgService.serviceId);
      if (!service) continue;
      categoryByOrgService.set(key, service.category);
    }

    const catCount = (cats: string[]) =>
      inYearAndCompleted.filter((r) => {
        const c = categoryByOrgService.get(r.orgServiceId as unknown as string);
        return c !== undefined && cats.includes(c);
      }).length;

    const passports = catCount(["passport", "travel_document"]);
    const civilStatus = catCount(["civil_status", "transcript"]);
    const visas = catCount(["visa"]);

    return {
      registrations: registrationsCount,
      passportsYear: passports,
      civilStatusYear: civilStatus,
      visasYear: visas,
      currentYear,
    };
  },
});

/**
 * Services de l'org (pour la grille « Services proposés »).
 * Délègue à la table orgServices avec join service catalog.
 */
export const publicServices = query({
  args: { orgId: v.id("orgs"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const orgServices = await ctx.db
      .query("orgServices")
      .filter((q) => q.eq(q.field("orgId"), args.orgId))
      .collect();
    const active = orgServices.filter((s) => s.isActive !== false);

    const enriched = await Promise.all(
      active.slice(0, args.limit ?? 12).map(async (os) => {
        const service = await ctx.db.get(os.serviceId);
        if (!service) return null;
        return {
          orgServiceId: os._id,
          serviceId: os.serviceId,
          slug: service.slug,
          nameI18n: service.name, // LocalizedString
          category: service.category,
          icon: service.icon ?? null,
          estimatedDays: service.estimatedDays,
          pricing: os.pricing ?? null,
        };
      }),
    );

    return enriched.filter((s): s is NonNullable<typeof s> => s !== null);
  },
});

/**
 * Sous-juridictions (consulats honoraires, antennes) liées à l'org.
 * Renvoie depuis `jurisdiction.subJurisdictions` + les orgs enfants
 * référencées par `parentOrgId`.
 */
export const subRepresentations = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (!org || isIntelligenceAgency(org)) return [];

    // Orgs enfants
    const children = await ctx.db
      .query("orgs")
      .withIndex("by_parent", (q) => q.eq("parentOrgId", args.orgId))
      .collect();
    const childRows = children
      .filter((c) => !c.deletedAt && c.isActive)
      .map((c) => ({
        id: c._id,
        slug: c.slug,
        name: c.name,
        type: c.type,
        city: c.address?.city ?? null,
        country: c.address?.country ?? null,
        kind: "child_org" as const,
      }));

    // Sous-juridictions inline (consulats honoraires, antennes)
    const inline =
      org.jurisdiction?.subJurisdictions?.map((sj, idx) => ({
        id: `inline-${idx}` as string,
        slug: null,
        name: sj.name,
        type: "honorary_consulate" as string,
        city: sj.city ?? null,
        country: sj.countryCode,
        kind: "inline" as const,
        honoraryConsulateOrgId: sj.honoraryConsulateOrgId ?? null,
      })) ?? [];

    return [...childRows, ...inline];
  },
});
