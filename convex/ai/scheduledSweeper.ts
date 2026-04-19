/**
 * Scheduled sweeper : detecte les demandes/dossiers stagnants et pousse
 * des suggestions de triage proactives.
 *
 * Execute toutes les 30 min via cron. Defensive par design :
 *   - Limite le nombre d'orgs traitees par sweep (MAX_ORGS)
 *   - Limite le nombre de jobs enfiles par org (MAX_JOBS_PER_ORG)
 *   - Deduplique via aiSuggestions.by_target (evite le spam si une
 *     suggestion pending existe deja pour la meme cible)
 *
 * NOTE: contrairement aux triggers qui reagissent a un changement,
 * le sweeper reagit a l'*absence* de changement (idle > TTL).
 */

import { v } from "convex/values";
import { internalAction, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id, Doc } from "../_generated/dataModel";

/** Seuil d'inactivite avant de pousser une suggestion de triage (48h). */
const IDLE_THRESHOLD_MS = 48 * 60 * 60 * 1000;

/** Nombre max d'orgs scannees par sweep (eviter fan-out explosion). */
const MAX_ORGS_PER_SWEEP = 20;

/** Nombre max de jobs IA enfiles par org et par sweep. */
const MAX_JOBS_PER_ORG = 10;

/** Statuts "actifs" susceptibles de stagner — terminal states exclus. */
const IDLE_ELIGIBLE_STATUSES = new Set([
  "pending",
  "under_review",
  "in_production",
  "appointment_scheduled",
  "ready_for_pickup",
]);

// ═══════════════════════════════════════════════════════════════
// Internal queries
// ═══════════════════════════════════════════════════════════════

/** Recupere les orgs qui ont le module ai_assistant actif. */
export const listOrgsWithAIAssistant = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, { limit }) => {
    // Pas d'index sur modules[] — on scanne une page raisonnable.
    // Le LIMIT sur ce collect() reste volontairement bas (1k) : si la plateforme
    // depasse cette limite il faudra refondre via un index dedie.
    const orgs = await ctx.db.query("orgs").take(1000);
    const filtered = orgs.filter((o) =>
      Array.isArray(o.modules) && o.modules.includes("ai_assistant" as never),
    );
    return filtered.slice(0, limit).map((o) => o._id);
  },
});

/**
 * Pour un org donne, liste les requests idle eligibles au triage IA.
 * - status IN (pending|under_review|in_production|appointment_scheduled|ready_for_pickup)
 * - updatedAt < now - IDLE_THRESHOLD_MS
 * - assignedTo defini (sinon rien a suggerer a personne)
 * - pas de suggestion pending deja en base pour cette request
 */
export const listIdleRequestsForOrg = internalQuery({
  args: {
    orgId: v.id("orgs"),
    idleBefore: v.number(),
    limit: v.number(),
  },
  handler: async (ctx, { orgId, idleBefore, limit }) => {
    const candidates: Doc<"requests">[] = [];

    // Scanne chaque statut eligible via by_org_status (index existant).
    for (const status of IDLE_ELIGIBLE_STATUSES) {
      const rows = await ctx.db
        .query("requests")
        .withIndex("by_org_status", (q) =>
          q.eq("orgId", orgId).eq("status", status as any),
        )
        .take(100);

      for (const r of rows) {
        if (!r.assignedTo) continue;
        const lastTouched = r.updatedAt ?? r._creationTime;
        if (lastTouched >= idleBefore) continue;
        candidates.push(r);
        if (candidates.length >= limit * 3) break;
      }
      if (candidates.length >= limit * 3) break;
    }

    // Deduplique : ne pas repousser si une suggestion pending existe deja.
    const result: Array<{
      requestId: Id<"requests">;
      membershipId: Id<"memberships">;
      userId: Id<"users">;
      status: string;
      idleHours: number;
    }> = [];

    for (const r of candidates) {
      if (result.length >= limit) break;

      const existing = await ctx.db
        .query("aiSuggestions")
        .withIndex("by_target", (q) =>
          q.eq("targetType", "request").eq("targetId", r._id),
        )
        .filter((q) => q.eq(q.field("status"), "pending"))
        .first();

      if (existing) continue;

      const membership = await ctx.db.get(r.assignedTo as Id<"memberships">);
      if (!membership || membership.deletedAt) continue;

      const lastTouched = r.updatedAt ?? r._creationTime;
      const idleHours = (Date.now() - lastTouched) / 3_600_000;

      result.push({
        requestId: r._id,
        membershipId: membership._id,
        userId: membership.userId,
        status: r.status,
        idleHours,
      });
    }

    return result;
  },
});

// ═══════════════════════════════════════════════════════════════
// Main sweep action
// ═══════════════════════════════════════════════════════════════

export const sweep = internalAction({
  args: {},
  handler: async (ctx) => {
    // Kill switch global
    if (process.env.AI_ASSISTANT_GLOBAL_KILL_SWITCH === "true") {
      return { skipped: true, reason: "global_kill_switch" };
    }

    const idleBefore = Date.now() - IDLE_THRESHOLD_MS;

    const orgIds = await ctx.runQuery(
      internal.ai.scheduledSweeper.listOrgsWithAIAssistant,
      { limit: MAX_ORGS_PER_SWEEP },
    );

    let dispatched = 0;
    let orgsScanned = 0;

    for (const orgId of orgIds) {
      orgsScanned++;

      const idleRequests = await ctx.runQuery(
        internal.ai.scheduledSweeper.listIdleRequestsForOrg,
        { orgId, idleBefore, limit: MAX_JOBS_PER_ORG },
      );

      for (const { requestId, membershipId, userId, status, idleHours } of idleRequests) {
        const allowed = await ctx.runQuery(
          internal.ai.preferences.checkPermissionInternal,
          {
            userId,
            membershipId,
            requiredTask: "ai_assistant.view",
          },
        );
        if (!allowed) continue;

        await ctx.scheduler.runAfter(0, internal.ai.dispatcher.dispatchEvent, {
          orgId,
          membershipId,
          userId,
          eventType: "request.idle",
          entityType: "request",
          entityId: requestId,
          entitySummary: `Request ${requestId} stuck in status=${status} for ${idleHours.toFixed(0)}h`,
          contextHints: [`status:${status}`, `idleHours:${idleHours.toFixed(0)}`],
          overrideCapabilityCode: "request_triage",
        });
        dispatched++;
      }
    }

    return { skipped: false, orgsScanned, dispatched };
  },
});
