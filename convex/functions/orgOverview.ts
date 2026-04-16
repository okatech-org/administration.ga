import { v } from "convex/values";
import { authQuery } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask, canDoTask, isSuperAdmin } from "../lib/permissions";
import { TaskCode } from "../lib/taskCodes";
import { RegistrationStatus, RequestStatus } from "../lib/constants";
import { error, ErrorCode } from "../lib/errors";
import type { Doc, Id } from "../_generated/dataModel";

// ============================================================================
// Types partagés — exposés aux composants React via le retour des queries
// ============================================================================

export type AlertSeverity = "critical" | "warning" | "info";

export type AlertType =
  | "sla_breach"
  | "vacant_critical"
  | "registry_expiring"
  | "cards_pending"
  | "correspondance_overdue"
  | "approval_pending";

export type ActivityEvent = {
  _id: string;
  timestamp: number;
  actor: {
    _id: Id<"users"> | null;
    name: string;
    avatarUrl?: string;
  } | null;
  targetType: string;
  targetId: string;
  operation: "insert" | "update" | "delete" | "read";
  summary: string;
  raw?: {
    table: string;
    changes?: unknown;
  };
};

// ============================================================================
// Query 1 — getOrgAlerts
// Retourne les signaux opérationnels nécessitant une action (SLA, postes
// vacants critiques, cartes à imprimer, expirations de registre, correspondance
// en retard, approbations en attente).
// ============================================================================

export const getOrgAlerts = authQuery({
  args: {
    orgId: v.id("orgs"),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      TaskCode.statistics.view,
    );

    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    // ── SLA breach : demandes non terminées dont l'âge dépasse le SLA du service
    const activeRequests = await ctx.db
      .query("requests")
      .withIndex("by_org_status", (q) => q.eq("orgId", args.orgId))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), RequestStatus.Completed),
          q.neq(q.field("status"), RequestStatus.Cancelled),
          q.neq(q.field("status"), RequestStatus.Rejected),
        ),
      )
      .take(500);

    // Batch-load org services pour récupérer le SLA sans N+1
    const orgServiceIds = Array.from(
      new Set(activeRequests.map((r) => r.orgServiceId)),
    );
    const orgServices = await Promise.all(
      orgServiceIds.map((id) => ctx.db.get(id)),
    );
    const orgServiceMap = new Map<string, Doc<"orgServices">>();
    orgServices.forEach((os) => {
      if (os) orgServiceMap.set(os._id.toString(), os);
    });

    const serviceIds = Array.from(
      new Set(
        orgServices.filter(Boolean).map((os) => (os as Doc<"orgServices">).serviceId),
      ),
    );
    const services = await Promise.all(serviceIds.map((id) => ctx.db.get(id)));
    const serviceMap = new Map<string, Doc<"services">>();
    services.forEach((s) => {
      if (s) serviceMap.set(s._id.toString(), s);
    });

    let slaBreachCount = 0;
    for (const req of activeRequests) {
      const os = orgServiceMap.get(req.orgServiceId.toString());
      if (!os) continue;
      const svc = serviceMap.get(os.serviceId.toString());
      const sla =
        (os as { estimatedDays?: number }).estimatedDays ??
        (svc && (svc as { estimatedDays?: number }).estimatedDays) ??
        null;
      if (!sla || sla <= 0) continue;
      const ageDays = (now - req._creationTime) / (24 * 60 * 60 * 1000);
      if (ageDays - sla > 0) slaBreachCount++;
    }

    // ── Postes critiques vacants : positions isRequired=true sans membre actif
    const positions = await ctx.db
      .query("positions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId).eq("isActive", true))
      .collect();

    const requiredPositions = positions.filter(
      (p) => p.isRequired && !p.deletedAt,
    );

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_org_deletedAt", (q) =>
        q.eq("orgId", args.orgId).eq("deletedAt", undefined),
      )
      .collect();

    const occupiedPositionIds = new Set(
      memberships
        .map((m) => m.positionId?.toString())
        .filter((id): id is string => typeof id === "string"),
    );
    const vacantCriticalCount = requiredPositions.filter(
      (p) => !occupiedPositionIds.has(p._id.toString()),
    ).length;

    // ── Registre consulaire : cartes/inscriptions expirant sous 30 jours
    const activeRegistrations = await ctx.db
      .query("consularRegistrations")
      .withIndex("by_org_status", (q) =>
        q.eq("orgId", args.orgId).eq("status", RegistrationStatus.Active),
      )
      .take(2000);

    const registryExpiringCount = activeRegistrations.filter((r) => {
      const expires = (r as { expiresAt?: number }).expiresAt;
      if (!expires) return false;
      return expires > now && expires - now < THIRTY_DAYS_MS;
    }).length;

    // ── Cartes à imprimer : printJobs en queued + printing
    const printQueued = await ctx.db
      .query("printJobs")
      .withIndex("by_org_status", (q) =>
        q.eq("orgId", args.orgId).eq("status", "queued"),
      )
      .take(500);
    const printPrinting = await ctx.db
      .query("printJobs")
      .withIndex("by_org_status", (q) =>
        q.eq("orgId", args.orgId).eq("status", "printing"),
      )
      .take(500);
    const cardsPendingCount = printQueued.length + printPrinting.length;

    // ── Correspondance en retard : dateReponseAttendue dépassée + status ouvert
    const correspondanceAll = await ctx.db
      .query("correspondanceItems")
      .withIndex("by_org_deleted", (q) =>
        q.eq("orgId", args.orgId).eq("deletedAt", undefined),
      )
      .take(1000);

    const correspondanceOverdueCount = correspondanceAll.filter(
      (i) =>
        i.dateReponseAttendue &&
        i.dateReponseAttendue < now &&
        !["sent", "archived"].includes(i.status),
    ).length;

    // ── Approbations en attente : items en pending assignés au user courant sur l'org
    const approvalPending = await ctx.db
      .query("correspondanceItems")
      .withIndex("by_holder", (q) => q.eq("currentHolderId", ctx.user._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("orgId"), args.orgId),
          q.eq(q.field("deletedAt"), undefined),
        ),
      )
      .take(500);
    const approvalPendingCount = approvalPending.length;

    // ── Construction du résultat
    const alerts: Array<{
      type: AlertType;
      severity: AlertSeverity;
      count: number;
      label: string;
      ctaHref: string;
    }> = [];

    if (slaBreachCount > 0) {
      alerts.push({
        type: "sla_breach",
        severity: "critical",
        count: slaBreachCount,
        label: "Demandes en retard SLA",
        ctaHref: `/reps/${args.orgId}?tab=requests&filter=overdue`,
      });
    }

    if (vacantCriticalCount > 0) {
      alerts.push({
        type: "vacant_critical",
        severity: "critical",
        count: vacantCriticalCount,
        label: "Postes critiques vacants",
        ctaHref: `/reps/${args.orgId}?tab=positions`,
      });
    }

    if (registryExpiringCount > 0) {
      alerts.push({
        type: "registry_expiring",
        severity: "warning",
        count: registryExpiringCount,
        label: "Inscriptions expirant sous 30 jours",
        ctaHref: `/admin/consular-registry?orgId=${args.orgId}&filter=expiring`,
      });
    }

    if (cardsPendingCount > 0) {
      alerts.push({
        type: "cards_pending",
        severity: "warning",
        count: cardsPendingCount,
        label: "Cartes consulaires à imprimer",
        ctaHref: `/admin/print-queue?orgId=${args.orgId}`,
      });
    }

    if (correspondanceOverdueCount > 0) {
      alerts.push({
        type: "correspondance_overdue",
        severity: "warning",
        count: correspondanceOverdueCount,
        label: "Correspondances en retard",
        ctaHref: `/correspondance?orgId=${args.orgId}&filter=overdue`,
      });
    }

    if (approvalPendingCount > 0) {
      alerts.push({
        type: "approval_pending",
        severity: "info",
        count: approvalPendingCount,
        label: "Documents en attente de votre approbation",
        ctaHref: `/correspondance?orgId=${args.orgId}&filter=pending-approval`,
      });
    }

    return {
      alerts,
      counts: {
        slaBreach: slaBreachCount,
        vacantCritical: vacantCriticalCount,
        registryExpiring: registryExpiringCount,
        cardsPending: cardsPendingCount,
        correspondanceOverdue: correspondanceOverdueCount,
        approvalPending: approvalPendingCount,
      },
      generatedAt: now,
    };
  },
});

// ============================================================================
// Query 2 — getRecentActivity
// Feed des derniers événements touchant l'org (audit log + events immutables).
// ============================================================================

const AUDIT_TABLES_TRACKED = new Set([
  "requests",
  "memberships",
  "orgs",
  "appointments",
  "consularRegistrations",
  "orgServices",
  "positions",
  "correspondanceItems",
]);

const CONFIG_TABLES = new Set(["orgs", "orgServices", "positions"]);

export const getRecentActivity = authQuery({
  args: {
    orgId: v.id("orgs"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      TaskCode.statistics.view,
    );

    const limit = Math.min(args.limit ?? 15, 50);
    const isSA = isSuperAdmin(ctx.user);

    // Lecture du flux `auditLog` en ordre descendant, filtré manuellement
    // sur orgId — la table n'a pas d'index `by_org_timestamp` (tradeoff documenté).
    const recent = await ctx.db
      .query("auditLog")
      .withIndex("by_timestamp")
      .order("desc")
      .take(800);

    const filtered = recent.filter((log) => {
      if (!AUDIT_TABLES_TRACKED.has(log.table)) return false;

      // Chef de mission : masquer les modifications de config/permissions
      if (!isSA && CONFIG_TABLES.has(log.table) && log.operation === "update") {
        const changes = log.changes as
          | { newDoc?: Record<string, unknown> }
          | undefined;
        const newDoc = changes?.newDoc;
        const sensitiveKeys = [
          "orgModuleConfig",
          "modules",
          "settings",
          "tasks",
          "moduleAccess",
        ];
        if (
          newDoc &&
          Object.keys(newDoc).some((k) => sensitiveKeys.includes(k))
        ) {
          return false;
        }
      }

      // Filtre orgId : match sur changes.orgId, changes.newDoc.orgId, ou id direct
      const changes = log.changes as
        | {
            orgId?: string;
            newDoc?: { orgId?: string; _id?: string };
            oldDoc?: { orgId?: string; _id?: string };
          }
        | undefined;

      if (log.table === "orgs") {
        return log.docId === args.orgId;
      }

      return (
        changes?.orgId === args.orgId ||
        changes?.newDoc?.orgId === args.orgId ||
        changes?.oldDoc?.orgId === args.orgId
      );
    });

    const sliced = filtered.slice(0, limit);

    // Enrichissement batch des acteurs
    const actorIds = Array.from(
      new Set(
        sliced
          .map((log) => log.actorId?.toString())
          .filter((id): id is string => typeof id === "string"),
      ),
    );
    const actors = await Promise.all(
      actorIds.map((id) => ctx.db.get(id as Id<"users">)),
    );
    const actorMap = new Map<string, Doc<"users">>();
    actors.forEach((u) => {
      if (u) actorMap.set(u._id.toString(), u);
    });

    const events: ActivityEvent[] = sliced.map((log) => {
      const actor = log.actorId
        ? actorMap.get(log.actorId.toString()) ?? null
        : null;

      return {
        _id: log._id.toString(),
        timestamp: log.timestamp,
        actor: actor
          ? {
              _id: actor._id,
              name:
                actor.name ||
                `${(actor as { firstName?: string }).firstName ?? ""} ${(actor as { lastName?: string }).lastName ?? ""}`.trim() ||
                actor.email ||
                "Acteur inconnu",
              avatarUrl: (actor as { avatarUrl?: string }).avatarUrl,
            }
          : null,
        targetType: log.table,
        targetId: log.docId,
        operation: log.operation,
        summary: buildEventSummary(log),
        raw: {
          table: log.table,
          changes: log.changes,
        },
      };
    });

    return events;
  },
});

/** Produit un résumé lisible pour un enregistrement d'audit. */
function buildEventSummary(log: Doc<"auditLog">): string {
  const table = log.table;
  const op = log.operation;

  const tableLabel: Record<string, string> = {
    requests: "Demande",
    memberships: "Membre",
    orgs: "Organisation",
    appointments: "Rendez-vous",
    consularRegistrations: "Inscription consulaire",
    orgServices: "Service",
    positions: "Poste",
    correspondanceItems: "Correspondance",
  };

  const opLabel: Record<string, string> = {
    insert: "créé",
    update: "mis à jour",
    delete: "supprimé",
    read: "consulté",
  };

  return `${tableLabel[table] ?? table} ${opLabel[op] ?? op}`;
}

// ============================================================================
// Query 3 — getHealthScore
// Score pondéré 0-100 + checklist détaillée. Réservé au super-admin réseau.
// ============================================================================

export const getHealthScore = authQuery({
  args: {
    orgId: v.id("orgs"),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    const isSA = isSuperAdmin(ctx.user);

    if (!isSA) {
      // Autoriser aussi les chefs de mission possédant `settings.view`
      const allowed = await canDoTask(
        ctx,
        ctx.user,
        membership,
        TaskCode.settings.view,
      );
      if (!allowed) {
        throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
      }
    }

    const org = await ctx.db.get(args.orgId);
    if (!org) throw error(ErrorCode.NOT_FOUND);

    // Données annexes pour vérifier la complétude
    const positions = await ctx.db
      .query("positions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId).eq("isActive", true))
      .collect();
    const requiredPositions = positions.filter(
      (p) => p.isRequired && !p.deletedAt,
    );
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_org_deletedAt", (q) =>
        q.eq("orgId", args.orgId).eq("deletedAt", undefined),
      )
      .collect();
    const occupiedPositionIds = new Set(
      memberships
        .map((m) => m.positionId?.toString())
        .filter((id): id is string => typeof id === "string"),
    );

    const orgCalendar = await ctx.db
      .query("orgCalendar")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    const checks: Array<{
      key: string;
      label: string;
      passed: boolean;
      weight: number;
    }> = [
      {
        key: "contact",
        label: "Contact (e-mail + téléphone)",
        passed: Boolean(org.email && org.phone),
        weight: 15,
      },
      {
        key: "address",
        label: "Adresse principale renseignée",
        passed: Boolean(
          (org.address?.street && org.address?.city) ||
            (org as { addresses?: { main?: { city?: string } } }).addresses?.main
              ?.city,
        ),
        weight: 15,
      },
      {
        key: "branding",
        label: "Identité visuelle (logo)",
        passed: Boolean(
          (org as { logoUrl?: string }).logoUrl ||
            (org as { branding?: { logoUrl?: string } }).branding?.logoUrl,
        ),
        weight: 10,
      },
      {
        key: "modules",
        label: "Modules activés",
        passed: Boolean(org.modules && org.modules.length > 0),
        weight: 10,
      },
      {
        key: "schedule",
        label: "Calendrier opérationnel configuré",
        passed: Boolean(orgCalendar),
        weight: 15,
      },
      {
        key: "required_positions",
        label: `Postes critiques pourvus (${requiredPositions.filter((p) => occupiedPositionIds.has(p._id.toString())).length}/${requiredPositions.length})`,
        passed:
          requiredPositions.length > 0 &&
          requiredPositions.every((p) =>
            occupiedPositionIds.has(p._id.toString()),
          ),
        weight: 25,
      },
      {
        key: "jurisdiction",
        label: "Juridiction définie",
        passed: Boolean(
          org.jurisdictionCountries && org.jurisdictionCountries.length > 0,
        ),
        weight: 10,
      },
    ];

    const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
    const earnedWeight = checks
      .filter((c) => c.passed)
      .reduce((sum, c) => sum + c.weight, 0);
    const score = Math.round((earnedWeight / totalWeight) * 100);

    return {
      score,
      checks,
      generatedAt: Date.now(),
    };
  },
});
