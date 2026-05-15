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
      return { status: "offline" as const, agentsOnline: 0 };
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

    // Pas d'estimation d'attente : on n'a rien de fiable pour la calculer.
    const status: "available" | "busy" | "offline" =
      onlineCount === 0 ? "offline" : onlineCount >= 2 ? "available" : "busy";

    return { status, agentsOnline: onlineCount };
  },
});

/**
 * Lignes d'appel publiques d'une org (type "org" uniquement, pas les
 * lignes personnelles). Retourne pour chaque ligne :
 *  - identité + label + description + couleur/icone
 *  - état temps-réel : nombre d'agents en ligne (présents sur cette
 *    ligne ET avec presence "online"), basé sur agentPresence.
 */
export const publicCallLines = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (!org || isIntelligenceAgency(org)) return [];

    const lines = await ctx.db
      .query("callLines")
      .withIndex("by_org_active", (q) =>
        q.eq("orgId", args.orgId).eq("isActive", true),
      )
      .collect();

    // On ne montre que les lignes "org" (les lignes personnelles sont
    // privées par défaut côté page publique).
    const orgLines = lines.filter((l) => l.type === "org");

    // Récupère les présences "online" pour l'org en un seul lookup.
    const now = Date.now();
    const FIVE_MIN = 5 * 60 * 1000;
    let presences: Array<{ userId: string; lastHeartbeat: number }> = [];
    try {
      const raw = await ctx.db
        .query("agentPresence")
        .withIndex("by_org_and_status", (q) =>
          q.eq("orgId", args.orgId).eq("status", "online"),
        )
        .collect();
      presences = raw.filter((p) => now - p.lastHeartbeat < FIVE_MIN);
    } catch {
      // schéma indispo — pas de présence
    }
    const onlineUserIds = new Set(presences.map((p) => p.userId));

    // Pour chaque ligne, compte les agents online assignés.
    const enriched = await Promise.all(
      orgLines.map(async (line) => {
        let onlineCount = 0;
        for (const membershipId of line.membershipIds) {
          const m = await ctx.db.get(membershipId);
          if (!m || m.deletedAt) continue;
          if (onlineUserIds.has(m.userId as unknown as string)) {
            onlineCount++;
          }
        }
        return {
          _id: line._id,
          label: line.label,
          description: line.description ?? null,
          icon: line.icon ?? null,
          color: line.color ?? null,
          priority: line.priority,
          isDefault: line.isDefault === true,
          agentsOnline: onlineCount,
        };
      }),
    );

    // Tri : isDefault d'abord, puis priority asc, puis label
    return enriched.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.label.localeCompare(b.label);
    });
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
 * Stats publiques pour le bloc « La représentation en chiffres ».
 *
 * Métriques choisies pour leur lisibilité / stabilité (pas dépendantes de
 * volumes annuels qui peuvent être à zéro) :
 *  - citizensAttached : nombre total de citoyens rattachés à cette org
 *    (inscriptions consulaires non supprimées, tous statuts confondus —
 *    inclut Requested, Active, Expired). Reflète l'ancrage local.
 *  - servicesOffered : nombre de services actifs proposés par l'org.
 *  - onlineServices  : sous-ensemble end-to-end en ligne (pas de RDV requis).
 *  - publishedNews   : posts publiés par cette org.
 */
export const publicOrgStats = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (!org || isIntelligenceAgency(org)) return null;

    // Citoyens rattachés à l'org (toutes inscriptions consulaires non
    // supprimées — Requested + Active + Expired).
    const registrations = await ctx.db
      .query("consularRegistrations")
      .filter((q) => q.eq(q.field("orgId"), args.orgId))
      .collect();
    const citizensAttached = registrations.filter(
      (r) => !(r as { deletedAt?: number }).deletedAt,
    ).length;

    // Services proposés (actifs) + services en ligne (pas de RDV requis).
    const orgServices = await ctx.db
      .query("orgServices")
      .filter((q) => q.eq(q.field("orgId"), args.orgId))
      .collect();
    const activeOrgServices = orgServices.filter(
      (os) => os.isActive !== false,
    );

    let onlineServices = 0;
    for (const os of activeOrgServices) {
      const service = await ctx.db.get(os.serviceId);
      if (!service) continue;
      if (service.requiresAppointment === false) onlineServices++;
    }

    // Actualités publiées par cette org.
    const orgPosts = await ctx.db
      .query("posts")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    const publishedNews = orgPosts.filter(
      (p) => p.status === "published",
    ).length;

    return {
      citizensAttached,
      servicesOffered: activeOrgServices.length,
      onlineServices,
      publishedNews,
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
