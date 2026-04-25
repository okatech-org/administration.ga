/**
 * Management — supervision opérationnelle d'équipe
 *
 * Permet aux postes ayant `team.supervise` (capability `supervise` activée
 * sur le module `team` côté org) de voir les membres de leur sous-arbre,
 * leurs statistiques, leurs RDV et les demandes qu'ils ont traitées.
 *
 * Lecture seule — aucune mutation. La gestion administrative reste sur
 * `team.manage` / `team.assign_roles`.
 *
 * Scope : résolu via `position.ministryGroupId` du superviseur + tous les
 * `ministryGroups` descendants (chaîne `parentCode`). Si le superviseur n'a
 * pas de groupe (ex. chef de poste / admin), il voit toute l'org.
 */

import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { authQuery } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";
import { RequestStatus } from "../lib/constants";
import { requestStatusValidator } from "../lib/validators";

// ─── Scope helpers ────────────────────────────────────────────────────────

type SupervisorScope =
  | { kind: "all" }
  | { kind: "groups"; ministryGroupIds: Set<Id<"ministryGroups">> };

/**
 * Résout les ministryGroups visibles depuis la position du superviseur :
 * son groupe + tous les groupes dont la chaîne `parentCode` mène à lui.
 *
 * Si la position n'a pas de `ministryGroupId`, scope = "all" (org entière).
 */
async function resolveSupervisorScope(
  ctx: QueryCtx,
  membership: Doc<"memberships"> | null,
  orgId: Id<"orgs">,
): Promise<SupervisorScope> {
  if (!membership?.positionId) {
    return { kind: "all" };
  }
  const position = await ctx.db.get(membership.positionId);
  if (!position?.ministryGroupId) {
    return { kind: "all" };
  }

  const rootGroup = await ctx.db.get(position.ministryGroupId);
  if (!rootGroup) {
    return { kind: "groups", ministryGroupIds: new Set([position.ministryGroupId]) };
  }

  // Charger tous les groupes actifs de l'org pour résoudre l'arbre de descendants.
  // Petit volume (rarement > qq dizaines), pas besoin d'index dédié.
  const allGroups = await ctx.db
    .query("ministryGroups")
    .withIndex("by_org", (q) => q.eq("orgId", orgId).eq("isActive", true))
    .collect();

  // BFS : à partir du groupe racine, suit les enfants via parentCode === root.code
  const includedCodes = new Set<string>([rootGroup.code]);
  const includedIds = new Set<Id<"ministryGroups">>([rootGroup._id]);
  let frontier = [rootGroup.code];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const g of allGroups) {
      if (g.parentCode && frontier.includes(g.parentCode) && !includedCodes.has(g.code)) {
        includedCodes.add(g.code);
        includedIds.add(g._id);
        next.push(g.code);
      }
    }
    frontier = next;
  }

  return { kind: "groups", ministryGroupIds: includedIds };
}

/**
 * Vrai si la position cible est dans le scope du superviseur.
 * Réutilisé par les autres modules (ex. relâchement de la garde sur
 * `listAppointmentsForPrint`).
 */
export async function isPositionInSupervisorScope(
  ctx: QueryCtx,
  scope: SupervisorScope,
  positionId: Id<"positions"> | undefined,
): Promise<boolean> {
  if (scope.kind === "all") return true;
  if (!positionId) return false;
  const position = await ctx.db.get(positionId);
  if (!position?.ministryGroupId) return false;
  return scope.ministryGroupIds.has(position.ministryGroupId);
}

/**
 * Vrai si la membership cible (un agent) est supervisable par le caller.
 * Helper consommé par `slots.listAppointmentsForPrint` pour autoriser
 * l'impression du planning d'un agent du sous-arbre.
 */
export async function canSuperviseAgent(
  ctx: QueryCtx,
  callerMembership: Doc<"memberships"> | null,
  targetMembership: Doc<"memberships"> | null,
): Promise<boolean> {
  if (!callerMembership || !targetMembership) return false;
  if (callerMembership.orgId !== targetMembership.orgId) return false;
  const scope = await resolveSupervisorScope(ctx, callerMembership, callerMembership.orgId);
  return isPositionInSupervisorScope(ctx, scope, targetMembership.positionId);
}

// ─── Stats helper (single-agent) ──────────────────────────────────────────

async function computeAgentStats(
  ctx: QueryCtx,
  membershipId: Id<"memberships">,
): Promise<{
  assigned: number;
  completed: number;
  completionRate: number;
}> {
  // by_assigned indexe `requests.assignedTo` (membership ID).
  // On prend jusqu'à 1000 entrées — au-delà la métrique perd en sens pour V1.
  const requests = await ctx.db
    .query("requests")
    .withIndex("by_assigned", (q) => q.eq("assignedTo", membershipId))
    .take(1000);

  let completed = 0;
  for (const r of requests) {
    if (r.status === RequestStatus.Completed) completed++;
  }
  const assigned = requests.length;
  return {
    assigned,
    completed,
    completionRate: assigned > 0 ? Math.round((completed / assigned) * 100) : 0,
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────

/**
 * Liste les membres de l'org dans le scope de supervision du caller,
 * enrichis avec poste, groupe et KPI light (assigned/completed/rate +
 * RDV à venir).
 */
export const listSupervisableMembers = authQuery({
  args: {
    orgId: v.id("orgs"),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "team.supervise");

    const scope = await resolveSupervisorScope(ctx, membership, args.orgId);

    const allMemberships = await ctx.db
      .query("memberships")
      .withIndex("by_org_deletedAt", (q) =>
        q.eq("orgId", args.orgId).eq("deletedAt", undefined),
      )
      .collect();

    // Filtre par scope
    const positionsCache = new Map<Id<"positions">, Doc<"positions"> | null>();
    const inScope: Array<{ m: Doc<"memberships">; position: Doc<"positions"> | null }> = [];
    for (const m of allMemberships) {
      let position: Doc<"positions"> | null = null;
      if (m.positionId) {
        const cached = positionsCache.get(m.positionId);
        if (cached !== undefined) {
          position = cached;
        } else {
          position = await ctx.db.get(m.positionId);
          positionsCache.set(m.positionId, position);
        }
      }
      const inside =
        scope.kind === "all"
          ? true
          : !!position?.ministryGroupId &&
            scope.ministryGroupIds.has(position.ministryGroupId);
      if (inside) inScope.push({ m, position });
    }

    // Hydrate users + ministry groups + stats + upcoming appointments
    const today = new Date();
    const isoToday = today.toISOString().slice(0, 10);

    const groupsCache = new Map<Id<"ministryGroups">, Doc<"ministryGroups"> | null>();

    const enriched = await Promise.all(
      inScope.map(async ({ m, position }) => {
        const [user, stats, upcoming] = await Promise.all([
          ctx.db.get(m.userId),
          computeAgentStats(ctx, m._id),
          ctx.db
            .query("appointments")
            .withIndex("by_agent_date", (q) =>
              q.eq("agentId", m._id).gte("date", isoToday),
            )
            .take(50),
        ]);

        let group: Doc<"ministryGroups"> | null = null;
        if (position?.ministryGroupId) {
          const cached = groupsCache.get(position.ministryGroupId);
          if (cached !== undefined) {
            group = cached;
          } else {
            group = await ctx.db.get(position.ministryGroupId);
            groupsCache.set(position.ministryGroupId, group);
          }
        }

        const fullName =
          [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
          user?.name ||
          user?.email ||
          "Agent";

        return {
          membershipId: m._id,
          userId: m.userId,
          name: fullName,
          firstName: user?.firstName,
          lastName: user?.lastName,
          email: user?.email,
          avatarUrl: user?.avatarUrl,
          positionId: position?._id,
          positionTitle: position?.title,
          positionGrade: position?.grade,
          ministryGroupId: group?._id,
          ministryGroupCode: group?.code,
          ministryGroupLabel: group?.label,
          assigned: stats.assigned,
          completed: stats.completed,
          completionRate: stats.completionRate,
          upcomingAppointmentsCount: upcoming.length,
        };
      }),
    );

    enriched.sort((a, b) => a.name.localeCompare(b.name));

    return {
      scope: scope.kind,
      members: enriched,
    };
  },
});

/**
 * Détail d'un agent : profil, poste, groupe, stats détaillées.
 * Vérifie que la membership cible est bien dans le scope du caller.
 */
export const getAgentSupervisionDetail = authQuery({
  args: {
    membershipId: v.id("memberships"),
  },
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.membershipId);
    if (!target || target.deletedAt !== undefined) {
      throw error(ErrorCode.MEMBER_NOT_FOUND);
    }

    const callerMembership = await getMembership(ctx, ctx.user._id, target.orgId);
    await assertCanDoTask(ctx, ctx.user, callerMembership, "team.supervise");

    const allowed = await canSuperviseAgent(ctx, callerMembership, target);
    if (!allowed) {
      throw error(ErrorCode.FORBIDDEN);
    }

    const [user, position, stats] = await Promise.all([
      ctx.db.get(target.userId),
      target.positionId ? ctx.db.get(target.positionId) : null,
      computeAgentStats(ctx, target._id),
    ]);

    const group = position?.ministryGroupId
      ? await ctx.db.get(position.ministryGroupId)
      : null;

    const fullName =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
      user?.name ||
      user?.email ||
      "Agent";

    return {
      member: {
        membershipId: target._id,
        userId: target.userId,
        name: fullName,
        firstName: user?.firstName,
        lastName: user?.lastName,
        email: user?.email,
        avatarUrl: user?.avatarUrl,
        positionId: position?._id,
        positionTitle: position?.title,
        positionGrade: position?.grade,
        ministryGroupId: group?._id,
        ministryGroupCode: group?.code,
        ministryGroupLabel: group?.label,
        diplomaticProfile: target.diplomaticProfile,
      },
      stats,
      orgId: target.orgId,
    };
  },
});

/**
 * Demandes traitées par un agent (paginé).
 * Vérifie le scope du caller. Tri décroissant par création.
 */
export const listAgentRequests = authQuery({
  args: {
    membershipId: v.id("memberships"),
    status: v.optional(requestStatusValidator),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.membershipId);
    if (!target || target.deletedAt !== undefined) {
      throw error(ErrorCode.MEMBER_NOT_FOUND);
    }

    const callerMembership = await getMembership(ctx, ctx.user._id, target.orgId);
    await assertCanDoTask(ctx, ctx.user, callerMembership, "team.supervise");

    const allowed = await canSuperviseAgent(ctx, callerMembership, target);
    if (!allowed) {
      throw error(ErrorCode.FORBIDDEN);
    }

    const paginated = await ctx.db
      .query("requests")
      .withIndex("by_assigned", (q) => q.eq("assignedTo", target._id))
      .order("desc")
      .paginate(args.paginationOpts);

    // Filtrage status post-paginate (garde la pagination simple).
    const page = args.status
      ? paginated.page.filter((r) => r.status === args.status)
      : paginated.page;

    // Hydrate orgService → service name + reference utiles à la liste.
    const orgServiceIds = [...new Set(page.map((r) => r.orgServiceId))];
    const orgServices = await Promise.all(orgServiceIds.map((id) => ctx.db.get(id)));
    const orgServiceMap = new Map(
      orgServices.filter(Boolean).map((os) => [os!._id, os!]),
    );
    const serviceIds = [
      ...new Set(orgServices.filter(Boolean).map((os) => os!.serviceId)),
    ];
    const services = await Promise.all(serviceIds.map((id) => ctx.db.get(id)));
    const serviceMap = new Map(services.filter(Boolean).map((s) => [s!._id, s!]));

    return {
      ...paginated,
      page: page.map((r) => {
        const orgService = orgServiceMap.get(r.orgServiceId);
        const service = orgService ? serviceMap.get(orgService.serviceId) : null;
        return {
          _id: r._id,
          reference: r.reference,
          status: r.status,
          createdAt: r._creationTime,
          completedAt: r.completedAt,
          serviceName: service?.name,
        };
      }),
    };
  },
});
