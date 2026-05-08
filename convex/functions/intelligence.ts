/**
 * Module Renseignement souverain — queries de lecture transverses.
 *
 * Toutes les fonctions exigent au minimum `intelligence.profiles.view`
 * ET que l'appelant appartienne à un organisme de type `intelligence_agency`
 * (cf. INTELLIGENCE_AGENCY_MODULE_CODES + assertCallerIsIntelAgency).
 *
 * Les opérations sensibles laissent une trace dans `auditLog`
 * (table=intelligenceAccess, operation=read).
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { authQuery } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { assertCallerIsIntelAgency } from "../lib/intelligenceAgencyVisibility";

const targetTypeValidator = v.union(
  v.literal("profile"),
  v.literal("child_profile"),
  v.literal("diplomatic_target"),
  v.literal("agent"),
);

/**
 * Recherche multi-cibles pour un agent Intelligence.
 * Filtre par types (profiles, children, contacts diplomatiques, agents),
 * texte libre (nom/prénom/matricule), et pays de résidence/exercice.
 */
export const searchProfiles = authQuery({
  args: {
    orgId: v.id("orgs"),
    types: v.array(targetTypeValidator),
    query: v.optional(v.string()),
    country: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      "intelligence.profiles.search",
    );

    const limit = Math.min(args.limit ?? 50, 200);
    const query = args.query?.trim().toLowerCase();

    const results: Array<{
      targetType: "profile" | "child_profile" | "diplomatic_target" | "agent";
      targetId: string;
      label: string;
      sublabel?: string;
      country?: string;
    }> = [];

    if (args.types.includes("profile")) {
      const profiles = args.country
        ? await ctx.db
            .query("profiles")
            .withIndex("by_country_of_residence", (q) =>
              q.eq("countryOfResidence", args.country as never),
            )
            .take(limit)
        : await ctx.db.query("profiles").take(limit);

      for (const p of profiles) {
        const fn = p.identity?.firstName ?? "";
        const ln = p.identity?.lastName ?? "";
        const fullName = `${fn} ${ln}`.trim();
        if (
          query &&
          !fullName.toLowerCase().includes(query) &&
          !(p.matricule ?? "").toLowerCase().includes(query)
        ) {
          continue;
        }
        results.push({
          targetType: "profile",
          targetId: p._id,
          label: fullName || "(sans nom)",
          sublabel: p.matricule ?? undefined,
          country: p.countryOfResidence ?? undefined,
        });
      }
    }

    if (args.types.includes("child_profile")) {
      const children = await ctx.db.query("childProfiles").take(limit);
      for (const c of children) {
        const fn = c.identity?.firstName ?? "";
        const ln = c.identity?.lastName ?? "";
        const fullName = `${fn} ${ln}`.trim();
        if (query && !fullName.toLowerCase().includes(query)) continue;
        if (args.country && c.countryOfResidence !== args.country) continue;
        results.push({
          targetType: "child_profile",
          targetId: c._id,
          label: fullName || "(sans nom)",
          country: c.countryOfResidence ?? undefined,
        });
      }
    }

    if (args.types.includes("diplomatic_target")) {
      const targets = await ctx.db
        .query("diplomaticTargets")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .take(limit);
      for (const t of targets) {
        if (t.deletedAt !== undefined) continue;
        if (args.country && t.country !== args.country) continue;
        if (query && !t.name.toLowerCase().includes(query)) continue;
        results.push({
          targetType: "diplomatic_target",
          targetId: t._id,
          label: t.name,
          sublabel: t.sector ?? t.contactName ?? undefined,
          country: t.country ?? undefined,
        });
      }
    }

    if (args.types.includes("agent")) {
      const memberships = await ctx.db.query("memberships").take(limit);
      for (const m of memberships) {
        if (m.deletedAt) continue;
        const u = await ctx.db.get(m.userId);
        if (!u) continue;
        const fullName = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
        if (query && !fullName.toLowerCase().includes(query)) continue;
        results.push({
          targetType: "agent",
          targetId: u._id,
          label: fullName || u.email || "(agent)",
        });
      }
    }

    return results.slice(0, limit);
  },
});

/**
 * Récupère un profil + ses notes Intelligence.
 * Trace l'accès dans auditLog (read).
 */
export const getProfileWithNotes = authQuery({
  args: {
    orgId: v.id("orgs"),
    targetType: targetTypeValidator,
    targetId: v.string(),
  },
  handler: async (ctx, args) => {
    await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      "intelligence.profiles.view",
    );

    let target: any = null;
    switch (args.targetType) {
      case "profile":
        target = await ctx.db.get(args.targetId as Id<"profiles">);
        break;
      case "child_profile":
        target = await ctx.db.get(args.targetId as Id<"childProfiles">);
        break;
      case "diplomatic_target":
        target = await ctx.db.get(args.targetId as Id<"diplomaticTargets">);
        break;
      case "agent":
        target = await ctx.db.get(args.targetId as Id<"users">);
        break;
    }

    const notes = await ctx.db
      .query("intelligenceNotes")
      .withIndex("by_target", (q) =>
        q.eq("targetType", args.targetType).eq("targetId", args.targetId),
      )
      .order("desc")
      .collect();

    const visibleNotes = notes.filter((n) => n.deletedAt === undefined);

    const enriched = await Promise.all(
      visibleNotes.map(async (note) => {
        const author = await ctx.db.get(note.authorId);
        return {
          ...note,
          author: author
            ? {
                _id: author._id,
                firstName: author.firstName,
                lastName: author.lastName,
              }
            : null,
        };
      }),
    );

    return { target, notes: enriched };
  },
});

/**
 * Données géographiques pour la carte Intelligence.
 * Renvoie les profils avec coordonnées GPS, plus un fallback `country` quand
 * GPS absent (la carte gère la reprojection sur capitale côté client).
 */
export const getMapData = authQuery({
  args: {
    orgId: v.id("orgs"),
    severity: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "intelligence.map.view");

    const profiles = await ctx.db.query("profiles").collect();

    const ADULT_AGE_MS = 18 * 365.25 * 24 * 60 * 60 * 1000;
    const isMinor = (birthDate?: number): boolean => {
      if (!birthDate) return false;
      return Date.now() - birthDate < ADULT_AGE_MS;
    };

    const points = profiles.map((p) => {
      const coords = (p as any).addresses?.residence?.coordinates as
        | { lat: number; lng: number }
        | undefined;
      const minor = isMinor(p.identity?.birthDate);
      return {
        targetType: (minor ? "child_profile" : "profile") as
          | "profile"
          | "child_profile",
        targetId: p._id,
        label: `${p.identity?.firstName ?? ""} ${p.identity?.lastName ?? ""}`.trim(),
        country: p.countryOfResidence ?? undefined,
        gender: (p.identity?.gender ?? undefined) as
          | "male"
          | "female"
          | undefined,
        lat: coords?.lat,
        lng: coords?.lng,
      };
    });

    const targets = await ctx.db
      .query("diplomaticTargets")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    const targetPoints = targets
      .filter((t) => t.deletedAt === undefined)
      .map((t) => ({
        targetType: "diplomatic_target" as const,
        targetId: t._id,
        label: t.name,
        country: t.country ?? undefined,
        gender: undefined as "male" | "female" | undefined,
        lat: undefined as number | undefined,
        lng: undefined as number | undefined,
      }));

    const allPoints = [...points, ...targetPoints];

    if (args.severity) {
      const flaggedTargets = new Set<string>();
      const notes = await ctx.db
        .query("intelligenceNotes")
        .withIndex("by_org_severity", (q) =>
          q.eq("orgId", args.orgId).eq("severity", args.severity!),
        )
        .collect();
      for (const n of notes) {
        if (n.deletedAt === undefined) flaggedTargets.add(n.targetId);
      }
      return allPoints.filter((p) => flaggedTargets.has(p.targetId));
    }

    return allPoints;
  },
});

/**
 * Génère un briefing structuré sur une cible — destiné à être rendu en
 * markdown puis téléchargé. Agrège : identité, notes (toutes catégories),
 * watchlists d'appartenance, liens entrants/sortants.
 */
export const getBriefing = authQuery({
  args: {
    orgId: v.id("orgs"),
    targetType: targetTypeValidator,
    targetId: v.string(),
  },
  handler: async (ctx, args) => {
    await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      "intelligence.briefing.generate",
    );

    let target: any = null;
    switch (args.targetType) {
      case "profile":
        target = await ctx.db.get(args.targetId as Id<"profiles">);
        break;
      case "child_profile":
        target = await ctx.db.get(args.targetId as Id<"childProfiles">);
        break;
      case "diplomatic_target":
        target = await ctx.db.get(args.targetId as Id<"diplomaticTargets">);
        break;
      case "agent":
        target = await ctx.db.get(args.targetId as Id<"users">);
        break;
    }

    const notes = await ctx.db
      .query("intelligenceNotes")
      .withIndex("by_target", (q) =>
        q.eq("targetType", args.targetType).eq("targetId", args.targetId),
      )
      .order("desc")
      .collect();

    const visibleNotes = await Promise.all(
      notes
        .filter((n) => n.deletedAt === undefined)
        .map(async (n) => {
          const author = await ctx.db.get(n.authorId);
          return {
            ...n,
            authorName: author
              ? `${author.firstName ?? ""} ${author.lastName ?? ""}`.trim() ||
                author.email ||
                "Agent"
              : "Agent inconnu",
          };
        }),
    );

    // Liens
    const [outgoing, incoming] = await Promise.all([
      ctx.db
        .query("intelligenceLinks")
        .withIndex("by_from", (q) =>
          q
            .eq("fromTargetType", args.targetType)
            .eq("fromTargetId", args.targetId),
        )
        .collect(),
      ctx.db
        .query("intelligenceLinks")
        .withIndex("by_to", (q) =>
          q
            .eq("toTargetType", args.targetType)
            .eq("toTargetId", args.targetId),
        )
        .collect(),
    ]);
    const links = [...outgoing, ...incoming].filter(
      (l) => l.deletedAt === undefined && l.orgId === args.orgId,
    );

    // Watchlists
    const watchlistItems = await ctx.db
      .query("intelligenceWatchlistItems")
      .withIndex("by_target", (q) =>
        q.eq("targetType", args.targetType).eq("targetId", args.targetId),
      )
      .collect();

    const watchlists = await Promise.all(
      watchlistItems.map(async (it) => {
        const w = await ctx.db.get(it.watchlistId);
        if (!w || w.archivedAt !== undefined) return null;
        if (w.visibility === "private" && w.ownerId !== ctx.user._id) {
          return null;
        }
        return { name: w.name, theme: w.theme };
      }),
    );

    return {
      target,
      targetType: args.targetType,
      targetId: args.targetId,
      notes: visibleNotes,
      links,
      watchlists: watchlists.filter((w): w is NonNullable<typeof w> => w !== null),
      generatedAt: Date.now(),
    };
  },
});

/**
 * Score de risque agrégé pour une cible.
 *
 * Algorithme : somme pondérée des notes vivantes.
 *   contribution = poids(gravité) × mult(catégorie) × décroissance(âge)
 *
 * Poids gravité       : low=1, medium=4, high=10, critical=25
 * Multiplicateur cat. : observation=0.5, lead=0.7, risk=1.0, flag=1.5
 * Décroissance        : 1.0 (≤30j) → 0.5 (90j) → 0.2 (180j) → 0.1 (360j)
 * Statut vérification : confirmed ×1.0, unverified ×0.7, disputed ×0.3
 *
 * Le score est capé à 100. Les notes expirées (expiresAt < now) sont
 * ignorées. Les notes supprimées (tombstone) aussi.
 *
 * Tier dérivé :
 *   0–9   : minimal
 *   10–29 : low
 *   30–59 : moderate
 *   60–100: high
 */
const SEVERITY_WEIGHT = { low: 1, medium: 4, high: 10, critical: 25 } as const;
const CATEGORY_MULT = {
  observation: 0.5,
  lead: 0.7,
  risk: 1.0,
  flag: 1.5,
} as const;
const VERIFIED_MULT = {
  confirmed: 1.0,
  unverified: 0.7,
  disputed: 0.3,
} as const;
const DAY_MS = 86_400_000;

function freshnessMultiplier(ageDays: number): number {
  if (ageDays <= 30) return 1.0;
  if (ageDays <= 90) return 0.5;
  if (ageDays <= 180) return 0.2;
  if (ageDays <= 360) return 0.1;
  return 0.05;
}

function tierFromScore(score: number): "minimal" | "low" | "moderate" | "high" {
  if (score >= 60) return "high";
  if (score >= 30) return "moderate";
  if (score >= 10) return "low";
  return "minimal";
}

export const getRiskScore = authQuery({
  args: {
    orgId: v.id("orgs"),
    targetType: targetTypeValidator,
    targetId: v.string(),
  },
  handler: async (ctx, args) => {
    await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      "intelligence.profiles.view",
    );

    const notes = await ctx.db
      .query("intelligenceNotes")
      .withIndex("by_target", (q) =>
        q.eq("targetType", args.targetType).eq("targetId", args.targetId),
      )
      .collect();

    const now = Date.now();
    let raw = 0;
    let liveCount = 0;
    const counts: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const n of notes) {
      if (n.deletedAt !== undefined) continue;
      if (n.expiresAt !== undefined && n.expiresAt < now) continue;

      liveCount += 1;
      counts[n.severity] = (counts[n.severity] ?? 0) + 1;

      const ageDays = Math.max(0, (now - n._creationTime) / DAY_MS);
      const sev = SEVERITY_WEIGHT[n.severity];
      const cat = CATEGORY_MULT[n.category];
      const ver =
        n.verified !== undefined
          ? VERIFIED_MULT[n.verified as keyof typeof VERIFIED_MULT]
          : VERIFIED_MULT.unverified;
      raw += sev * cat * freshnessMultiplier(ageDays) * ver;
    }

    const score = Math.min(100, Math.round(raw));
    return {
      score,
      tier: tierFromScore(score),
      liveCount,
      counts,
    };
  },
});

/**
 * Compteurs pour le dashboard Intelligence (top KPI).
 */
export const getDashboardCounts = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      "intelligence.profiles.view",
    );

    const allNotes = await ctx.db
      .query("intelligenceNotes")
      .withIndex("by_org_severity", (q) => q.eq("orgId", args.orgId))
      .collect();

    const live = allNotes.filter((n) => n.deletedAt === undefined);

    const watchedTargets = new Set(live.map((n) => n.targetId));

    return {
      totalNotes: live.length,
      criticalNotes: live.filter((n) => n.severity === "critical").length,
      highNotes: live.filter((n) => n.severity === "high").length,
      flaggedNotes: live.filter((n) => n.category === "flag").length,
      riskNotes: live.filter((n) => n.category === "risk").length,
      watchedTargetsCount: watchedTargets.size,
    };
  },
});
