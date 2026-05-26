/**
 * iCorrespondance — Statistiques réseau (super admin)
 *
 * Agrège les KPI cross-org pour le hub super admin :
 * - Totaux toutes représentations (correspondances ouvertes, en attente,
 *   approuvées, envoyées, en retard)
 * - Liste des représentations avec leur statut iCorrespondance (configuré,
 *   nombre d'items, nombre d'alertes)
 *
 * Performance : itère sur les orgs accessibles puis appelle l'agrégat
 * `correspondanceItemsByOrg` (O(log n) par compteur). Sur 50 orgs avec 7
 * statuts, c'est ~350 appels d'agrégat — négligeable.
 */

import { backofficeQuery } from "../lib/customFunctions";
import { correspondanceItemsByOrg } from "../lib/aggregates";

// Statuts considérés "ouverts" (non finalisés)
const OPEN_STATUSES = [
  "draft",
  "pending",
  "approved",
  "rejected",
  "received",
] as const;
const ALL_STATUSES = [
  "draft",
  "pending",
  "approved",
  "rejected",
  "sent",
  "received",
  "archived",
] as const;

// ═════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Récapitulatif global du réseau : totaux agrégés sur toutes les
 * représentations accessibles. Réservé aux comptes back-office.
 */
export const getNetworkSummary = backofficeQuery({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db
      .query("orgs")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .take(500);

    const activePrefix = { prefix: [0] as [number] };

    // On parallélise : pour chaque org, on récupère le compteur global +
    // les compteurs par statut.
    const perOrg = await Promise.all(
      orgs.map(async (org) => {
        const ns = org._id;
        const [total, ...byStatusEntries] = await Promise.all([
          correspondanceItemsByOrg.count(ctx, {
            namespace: ns,
            bounds: activePrefix,
          }),
          ...ALL_STATUSES.map((s) =>
            correspondanceItemsByOrg
              .count(ctx, { namespace: ns, bounds: { prefix: [0, s] } })
              .then((n) => [s, n] as const),
          ),
        ]);

        const byStatus = Object.fromEntries(byStatusEntries) as Record<
          (typeof ALL_STATUSES)[number],
          number
        >;
        const open = OPEN_STATUSES.reduce(
          (acc, s) => acc + (byStatus[s] ?? 0),
          0,
        );

        return {
          orgId: org._id,
          orgName: org.name,
          orgType: org.type,
          country: org.country,
          total,
          open,
          byStatus,
        };
      }),
    );

    // Agrégats globaux
    const summary = perOrg.reduce(
      (acc, o) => {
        acc.total += o.total;
        acc.open += o.open;
        for (const s of ALL_STATUSES) {
          acc.byStatus[s] = (acc.byStatus[s] ?? 0) + (o.byStatus[s] ?? 0);
        }
        return acc;
      },
      {
        total: 0,
        open: 0,
        byStatus: {} as Record<string, number>,
        orgsCount: perOrg.length,
        orgsWithoutTraffic: perOrg.filter((o) => o.total === 0).length,
      },
    );

    return { summary, perOrg };
  },
});

/**
 * État de configuration iCorrespondance par représentation.
 * Indique pour chaque org si elle a initialisé ses types, configuré la
 * référence, activé les signatures. Utilisé par le tableau "Conformité
 * réseau" du hub super admin.
 */
export const getNetworkConfigStatus = backofficeQuery({
  args: {},
  handler: async (ctx) => {
    const [orgs, allTypeConfigs, network] = await Promise.all([
      ctx.db
        .query("orgs")
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .take(500),
      ctx.db
        .query("correspondanceTypeConfigs")
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect(),
      ctx.db
        .query("correspondanceNetworkConfig")
        .withIndex("by_singleton", (q) => q.eq("isSingleton", true))
        .first(),
    ]);

    const networkReady = !!network && network.standardTypes.length > 0;

    // Regroupe les configs de types par orgId
    const typesByOrg = new Map<string, typeof allTypeConfigs>();
    for (const cfg of allTypeConfigs) {
      const list = typesByOrg.get(cfg.orgId) ?? [];
      list.push(cfg);
      typesByOrg.set(cfg.orgId, list);
    }

    return {
      networkReady,
      orgs: orgs.map((org) => {
        const orgTypes = typesByOrg.get(org._id) ?? [];
        const activeTypes = orgTypes.filter((t) => t.isActive).length;
        const settings = (org as { settings?: Record<string, unknown> })
          .settings;
        const corrConfig = (settings as
          | { correspondanceConfig?: { referencePattern?: string } }
          | undefined)?.correspondanceConfig;

        return {
          orgId: org._id,
          orgName: org.name,
          orgType: org.type,
          country: org.country,
          typesConfigured: orgTypes.length,
          typesActive: activeTypes,
          hasOwnReferencePattern: !!corrConfig?.referencePattern,
          // Score simple : 0 (vide) → 100 (tout perso)
          configCompleteness:
            (orgTypes.length > 0 ? 50 : 0) +
            (corrConfig?.referencePattern ? 25 : 0) +
            (activeTypes > 0 ? 25 : 0),
        };
      }),
    };
  },
});
