/**
 * iCorrespondance — Dashboard & Statistics Functions
 *
 * Provides aggregated stats, recent activity feeds, and KPIs
 * for both correspondance items and dossiers de procédure.
 */

import { v } from "convex/values";
import { authQuery } from "../lib/customFunctions";
import { requireCorrespondanceAccess } from "../lib/correspondanceHelpers";

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD STATS
// ═════════════════════════════════════════════════════════════════════════════

/** Get combined dashboard statistics for an org */
export const getDashboardStats = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    await requireCorrespondanceAccess(ctx, ctx.user, args.orgId, "view");
    const now = Date.now();

    // Correspondance items stats
    const corrItems = await ctx.db
      .query("correspondanceItems")
      .withIndex("by_org_deleted", (q: any) =>
        q.eq("orgId", args.orgId).eq("deletedAt", undefined),
      )
      .collect();

    const corrByStatus: Record<string, number> = {};
    let corrOverdue = 0;
    for (const item of corrItems) {
      corrByStatus[item.status] = (corrByStatus[item.status] ?? 0) + 1;
      if (
        item.dateReponseAttendue &&
        item.dateReponseAttendue < now &&
        !["sent", "archived"].includes(item.status)
      ) {
        corrOverdue++;
      }
    }

    // Pending approvals for current user
    const pendingApprovals = corrItems.filter(
      (i: any) =>
        i.status === "pending" && i.currentHolderId === ctx.user._id,
    ).length;

    // Dossier stats
    const dossiers = await ctx.db
      .query("dossierProcedures")
      .withIndex("by_org_deleted", (q: any) =>
        q.eq("orgId", args.orgId).eq("deletedAt", undefined),
      )
      .collect();

    const dossierByStatus: Record<string, number> = {};
    let dossierOverdue = 0;
    for (const d of dossiers) {
      dossierByStatus[d.status] = (dossierByStatus[d.status] ?? 0) + 1;
      if (d.dateLimite && d.dateLimite < now && !["valide", "clos", "archive", "rejete"].includes(d.status)) {
        dossierOverdue++;
      }
    }

    // Dossiers assigned to current user
    const myDossiers = dossiers.filter(
      (d: any) => d.agentTraitantId === ctx.user._id && !["valide", "clos", "archive"].includes(d.status),
    ).length;

    return {
      correspondance: {
        total: corrItems.length,
        byStatus: corrByStatus,
        overdue: corrOverdue,
        pendingApprovals,
      },
      dossiers: {
        total: dossiers.length,
        byStatus: dossierByStatus,
        overdue: dossierOverdue,
        myDossiers,
      },
    };
  },
});

/**
 * Get recent activity across both correspondance and dossiers.
 *
 * Optimisé : utilise les N items les plus récents (via createdAt desc)
 * au lieu de scanner tous les items puis leurs workflow steps.
 * Réduit de ~300 queries à ~20 max.
 */
export const getRecentActivity = authQuery({
  args: {
    orgId: v.id("orgs"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireCorrespondanceAccess(ctx, ctx.user, args.orgId, "view");
    const maxItems = args.limit ?? 20;
    // On prend plus d'items que nécessaire car on va trier et couper
    const fetchLimit = maxItems * 2;

    // ── Correspondance : les N items les plus récents ──
    const recentItems = await ctx.db
      .query("correspondanceItems")
      .withIndex("by_org_created", (q: any) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(fetchLimit);

    const recentCorrSteps: any[] = [];
    // Limiter à 10 items max pour les workflow steps (10 items x 2 steps = 20 queries)
    for (const item of recentItems.slice(0, 10)) {
      if (item.deletedAt) continue;
      const steps = await ctx.db
        .query("correspondanceWorkflowSteps")
        .withIndex("by_item_created", (q: any) => q.eq("itemId", item._id))
        .order("desc")
        .take(2);
      for (const step of steps) {
        recentCorrSteps.push({
          type: "correspondance" as const,
          action: step.stepType,
          actorName: step.actorName,
          targetName: step.targetName,
          comment: step.comment,
          timestamp: step.createdAt,
          itemReference: item.reference,
          itemTitle: item.title,
        });
      }
    }

    // ── Dossiers : les N dossiers les plus récents ──
    const recentDossiers = await ctx.db
      .query("dossierProcedures")
      .withIndex("by_org", (q: any) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(fetchLimit);

    const recentDossierActions: any[] = [];
    for (const dossier of recentDossiers.slice(0, 10)) {
      if ((dossier as any).deletedAt) continue;
      const actions = await ctx.db
        .query("journalActions")
        .withIndex("by_dossier_created", (q: any) => q.eq("dossierId", dossier._id))
        .order("desc")
        .take(2);
      for (const action of actions) {
        recentDossierActions.push({
          type: "dossier" as const,
          action: action.action,
          actorName: action.actorName,
          comment: undefined,
          timestamp: action.createdAt,
          itemReference: (dossier as any).reference,
          itemTitle: undefined,
        });
      }
    }

    // Merge and sort by timestamp desc
    return [...recentCorrSteps, ...recentDossierActions]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, maxItems);
  },
});

/** Get dossier-specific statistics */
export const getDossierStats = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    await requireCorrespondanceAccess(ctx, ctx.user, args.orgId, "view");
    const dossiers = await ctx.db
      .query("dossierProcedures")
      .withIndex("by_org_deleted", (q: any) =>
        q.eq("orgId", args.orgId).eq("deletedAt", undefined),
      )
      .collect();

    // Group by type
    const byType: Record<string, { total: number; byStatus: Record<string, number> }> = {};
    const processingTimes: number[] = [];

    for (const d of dossiers) {
      const typeId = d.typeDemarcheId as string;
      if (!byType[typeId]) {
        byType[typeId] = { total: 0, byStatus: {} };
      }
      byType[typeId].total++;
      byType[typeId].byStatus[d.status] = (byType[typeId].byStatus[d.status] ?? 0) + 1;

      // Calculate processing time for completed dossiers
      if (d.dateValidation && d.dateDepot) {
        processingTimes.push(d.dateValidation - d.dateDepot);
      }
    }

    // Average processing time in days
    const avgProcessingDays = processingTimes.length > 0
      ? Math.round(
          processingTimes.reduce((a, b) => a + b, 0) /
            processingTimes.length /
            86400000,
        )
      : 0;

    // Enrich with type labels
    const byTypeEnriched = await Promise.all(
      Object.entries(byType).map(async ([typeId, stats]) => {
        const td = await ctx.db.get(typeId as any) as any;
        return {
          typeId,
          typeCode: td?.code ?? "?",
          typeLabel: td?.label ?? { fr: "?" },
          ...stats,
        };
      }),
    );

    // Rejection rate
    const totalCompleted = dossiers.filter(
      (d: any) => ["valide", "rejete", "clos"].includes(d.status),
    ).length;
    const rejected = dossiers.filter((d: any) => d.status === "rejete").length;
    const rejectionRate = totalCompleted > 0
      ? Math.round((rejected / totalCompleted) * 100)
      : 0;

    // SLA compliance (completed before deadline)
    const completedWithDeadline = dossiers.filter(
      (d: any) => d.dateValidation && d.dateLimite,
    );
    const onTime = completedWithDeadline.filter(
      (d: any) => d.dateValidation! <= d.dateLimite!,
    ).length;
    const slaComplianceRate = completedWithDeadline.length > 0
      ? Math.round((onTime / completedWithDeadline.length) * 100)
      : 100;

    return {
      totalDossiers: dossiers.length,
      byType: byTypeEnriched,
      avgProcessingDays,
      rejectionRate,
      slaComplianceRate,
    };
  },
});
