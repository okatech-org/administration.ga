import { v } from "convex/values";
import { authQuery } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";

/**
 * Suggestions intelligentes — Phase C1
 *
 * Queries qui calculent des suggestions auto pour aider l'utilisateur :
 *   - suggestHeadOfMission : top 3 candidats memberships dont le poste contient
 *     "consul", "ambassador", "chief"
 *   - suggestServicePricing : médiane / p25 / p75 du pricing pour un service
 *     donné, calculé cross-org pour aider à fixer un tarif raisonnable
 */

/**
 * Suggère les meilleurs candidats au poste de chef de mission pour une org.
 * Retourne les memberships dont la position contient "ambassador", "consul",
 * "chief", "head" ou avec le grade le plus élevé.
 */
export const suggestHeadOfMission = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const callerMembership = await getMembership(
      ctx,
      ctx.user._id,
      args.orgId,
    );
    await assertCanDoTask(ctx, ctx.user, callerMembership, "settings.view");

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_org_deletedAt", (q) =>
        q.eq("orgId", args.orgId).eq("deletedAt", undefined),
      )
      .collect();

    // Charger les positions des memberships
    const enriched = await Promise.all(
      memberships
        .filter((m) => m.positionId)
        .map(async (m) => {
          const [user, position] = await Promise.all([
            ctx.db.get(m.userId),
            m.positionId ? ctx.db.get(m.positionId) : null,
          ]);
          return { membership: m, user, position };
        }),
    );

    // Score par poste (plus c'est haut, plus c'est probable que c'est le chef)
    const KEYWORDS_HIGH = ["ambassador", "ambassadeur", "consul_general", "haut_commissaire"];
    const KEYWORDS_MEDIUM = ["consul", "head", "chief"];

    const scored = enriched
      .filter((e) => e.user && e.position)
      .map((e) => {
        const code = String((e.position as { code?: string })?.code ?? "").toLowerCase();
        const grade = String((e.position as { grade?: string })?.grade ?? "").toLowerCase();
        const level = (e.position as { level?: number })?.level ?? 99;

        let score = 0;
        if (KEYWORDS_HIGH.some((k) => code.includes(k))) score += 100;
        else if (KEYWORDS_MEDIUM.some((k) => code.includes(k))) score += 50;
        if (grade === "chief" || grade === "deputy_chief") score += 80;
        // Bonus inverse au level (level=1 = chef)
        score += Math.max(0, 20 - level * 2);

        return { ...e, score, level };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return scored.map((e) => ({
      membershipId: e.membership._id,
      userId: (e.user as { _id: string })?._id,
      firstName: (e.user as { firstName?: string })?.firstName,
      lastName: (e.user as { lastName?: string })?.lastName,
      email: (e.user as { email?: string })?.email,
      positionTitle: (e.position as { title?: { fr?: string; en?: string } })
        ?.title,
      positionCode: (e.position as { code?: string })?.code,
      positionGrade: (e.position as { grade?: string })?.grade,
      score: e.score,
    }));
  },
});

/**
 * Suggère un pricing pour un service donné en se basant sur les autres orgs
 * qui proposent le même service. Retourne médiane, p25, p75 et nombre de samples.
 */
export const suggestServicePricing = authQuery({
  args: { serviceId: v.id("services") },
  handler: async (ctx, args) => {
    // Tous les orgServices actifs pour ce service global
    const orgServices = await ctx.db
      .query("orgServices")
      .withIndex("by_service_active", (q) =>
        q.eq("serviceId", args.serviceId).eq("isActive", true),
      )
      .collect();

    // Extraire les pricings non-zéro
    const prices = orgServices
      .map((os) => os.pricing?.amount)
      .filter((p): p is number => typeof p === "number" && p > 0)
      .sort((a, b) => a - b);

    if (prices.length === 0) {
      return {
        sampleCount: 0,
        currency: "EUR",
        median: null,
        p25: null,
        p75: null,
      };
    }

    const median = prices[Math.floor(prices.length / 2)];
    const p25 = prices[Math.floor(prices.length * 0.25)];
    const p75 = prices[Math.floor(prices.length * 0.75)];

    // Devise majoritaire
    const currencies = orgServices
      .map((os) => os.pricing?.currency)
      .filter(Boolean) as string[];
    const currencyCounts: Record<string, number> = {};
    for (const c of currencies) {
      currencyCounts[c] = (currencyCounts[c] ?? 0) + 1;
    }
    const dominantCurrency =
      Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      "eur";

    return {
      sampleCount: prices.length,
      currency: dominantCurrency.toUpperCase(),
      median,
      p25,
      p75,
    };
  },
});
