/**
 * Ministry — Endpoints d'agrégation cross-org
 *
 * Donnent à un organisme `type === "ministry"` une vue consolidée en lecture
 * seule sur les organismes rattachés via `parentOrgId`. Les endpoints sont
 * gardés par `requireMinistryMembership` qui vérifie l'appartenance à l'org
 * cible et son type ministry.
 *
 * Aucune mutation ici : la supervision est passive. Tout droit d'écriture sur
 * les données des orgs-enfants reste géré par le RBAC existant à l'échelle de
 * chaque org.
 */

import { v } from "convex/values"
import { authQuery } from "../lib/customFunctions"
import { requireMinistryMembership } from "../lib/permissions"
import { RequestStatus } from "../lib/constants"
import {
  requestsByOrg,
  membershipsByOrg,
  orgServicesByOrg,
  appointmentsByOrg,
} from "../lib/aggregates"
import type { Doc, Id } from "../_generated/dataModel"

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Liste les IDs des organismes rattachés au ministère (via `parentOrgId`).
 * Filtre les soft-deletés et inactifs.
 */
async function listChildOrgIds(
  ctx: { db: any },
  ministryId: Id<"orgs">,
): Promise<Id<"orgs">[]> {
  const children = await ctx.db
    .query("orgs")
    .withIndex("by_parent", (q: any) => q.eq("parentOrgId", ministryId))
    .collect()
  return children
    .filter((org: Doc<"orgs">) => !org.deletedAt && org.isActive)
    .map((org: Doc<"orgs">) => org._id)
}

// ─── Endpoint 1 : Pipeline diplomatique consolidé ───────────────────────────

/**
 * Agrège cibles + plans stratégiques + projets de coopération de tous les
 * organismes rattachés au ministère. Filtres optionnels par phase, statut,
 * priorité ou par organisme spécifique (drill-down).
 */
export const getMinistryDiplomaticPipeline = authQuery({
  args: {
    ministryId: v.id("orgs"),
    filters: v.optional(
      v.object({
        childOrgId: v.optional(v.id("orgs")),
        pipelinePhase: v.optional(v.string()),
        priority: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await requireMinistryMembership(ctx, ctx.user, args.ministryId)

    const childOrgIds = await listChildOrgIds(ctx, args.ministryId)
    const scopedOrgIds = args.filters?.childOrgId
      ? childOrgIds.filter((id) => id === args.filters!.childOrgId)
      : childOrgIds

    if (scopedOrgIds.length === 0) {
      return { targets: [], plans: [], projects: [], childOrgIds: [] }
    }

    // Fan-out parallèle sur chaque org-enfant.
    const [targetsByOrg, plansByOrg, projectsByOrg] = await Promise.all([
      Promise.all(
        scopedOrgIds.map((orgId) =>
          ctx.db
            .query("diplomaticTargets")
            .withIndex("by_org", (q) => q.eq("orgId", orgId))
            .collect(),
        ),
      ),
      Promise.all(
        scopedOrgIds.map((orgId) =>
          ctx.db
            .query("diplomaticPlans")
            .withIndex("by_org", (q) => q.eq("orgId", orgId))
            .collect(),
        ),
      ),
      Promise.all(
        scopedOrgIds.map((orgId) =>
          ctx.db
            .query("diplomaticProjects")
            .withIndex("by_org", (q) => q.eq("orgId", orgId))
            .collect(),
        ),
      ),
    ])

    let targets = targetsByOrg.flat()
    const plans = plansByOrg.flat()
    const projects = projectsByOrg.flat()

    if (args.filters?.pipelinePhase) {
      targets = targets.filter(
        (t) => t.pipelinePhase === args.filters!.pipelinePhase,
      )
    }
    if (args.filters?.priority) {
      targets = targets.filter((t) => t.priority === args.filters!.priority)
    }

    return {
      targets,
      plans,
      projects,
      childOrgIds: scopedOrgIds,
    }
  },
})

// ─── Endpoint 2 : Correspondance réseau (lecture seule) ─────────────────────

/**
 * Liste les courriers du réseau (toutes orgs-enfants confondues), lecture seule.
 * Filtres : par organisme, statut, direction (entrant/sortant), type.
 */
export const getMinistryCorrespondence = authQuery({
  args: {
    ministryId: v.id("orgs"),
    filters: v.optional(
      v.object({
        childOrgId: v.optional(v.id("orgs")),
        status: v.optional(v.string()),
        direction: v.optional(v.string()),
      }),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireMinistryMembership(ctx, ctx.user, args.ministryId)

    const childOrgIds = await listChildOrgIds(ctx, args.ministryId)
    const scopedOrgIds = args.filters?.childOrgId
      ? childOrgIds.filter((id) => id === args.filters!.childOrgId)
      : childOrgIds

    if (scopedOrgIds.length === 0) {
      return { items: [], childOrgIds: [] }
    }

    const limit = Math.min(args.limit ?? 100, 500)

    const itemsByOrg = await Promise.all(
      scopedOrgIds.map((orgId) =>
        ctx.db
          .query("correspondanceItems")
          .withIndex("by_org_created", (q) => q.eq("orgId", orgId))
          .order("desc")
          .take(limit),
      ),
    )

    let items = itemsByOrg.flat()

    if (args.filters?.status) {
      items = items.filter((i) => i.status === args.filters!.status)
    }
    if (args.filters?.direction) {
      items = items.filter((i: any) => i.direction === args.filters!.direction)
    }

    // Tri global par date de création décroissante puis cap au limit demandé.
    items.sort((a, b) => {
      const aT = (a as any).createdAt ?? a._creationTime
      const bT = (b as any).createdAt ?? b._creationTime
      return bT - aT
    })

    return {
      items: items.slice(0, limit),
      childOrgIds: scopedOrgIds,
    }
  },
})

// ─── Endpoint 3 : Intelligence (KPI agrégés + breakdown par poste) ──────────

/**
 * Tableau de bord exécutif : KPI agrégés sur tout le réseau + breakdown par
 * organisme. Permet de comparer la charge entre les postes et d'identifier
 * les goulots d'étranglement.
 */
export const getMinistryStats = authQuery({
  args: { ministryId: v.id("orgs") },
  handler: async (ctx, args) => {
    await requireMinistryMembership(ctx, ctx.user, args.ministryId)

    const childOrgIds = await listChildOrgIds(ctx, args.ministryId)

    if (childOrgIds.length === 0) {
      return {
        totals: {
          memberCount: 0,
          pendingRequests: 0,
          activeServices: 0,
          upcomingAppointments: 0,
        },
        breakdown: [],
        updatedAt: Date.now(),
      }
    }

    // Per-org stats via Aggregate component (O(log n) chacun).
    const breakdown = await Promise.all(
      childOrgIds.map(async (orgId) => {
        const ns = orgId as string
        const [
          memberCount,
          pendingRequests,
          activeServices,
          scheduledAppointments,
        ] = await Promise.all([
          membershipsByOrg.count(ctx, { namespace: ns }),
          requestsByOrg.count(ctx, {
            namespace: ns,
            bounds: { prefix: [RequestStatus.Pending] },
          }),
          orgServicesByOrg.count(ctx, {
            namespace: ns,
            bounds: { eq: 1 },
          }),
          appointmentsByOrg.count(ctx, {
            namespace: ns,
            bounds: { prefix: ["scheduled"] },
          }),
        ])

        const org = await ctx.db.get(orgId)

        return {
          orgId,
          orgName: org?.name ?? "?",
          orgType: org?.type ?? "?",
          memberCount,
          pendingRequests,
          activeServices,
          upcomingAppointments: scheduledAppointments,
        }
      }),
    )

    const totals = breakdown.reduce(
      (acc, row) => ({
        memberCount: acc.memberCount + row.memberCount,
        pendingRequests: acc.pendingRequests + row.pendingRequests,
        activeServices: acc.activeServices + row.activeServices,
        upcomingAppointments: acc.upcomingAppointments + row.upcomingAppointments,
      }),
      {
        memberCount: 0,
        pendingRequests: 0,
        activeServices: 0,
        upcomingAppointments: 0,
      },
    )

    return {
      totals,
      breakdown,
      updatedAt: Date.now(),
    }
  },
})
