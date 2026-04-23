import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { authQuery, authMutation } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";
import {
  missedCallsByOrgStatus,
  missedCallsByOrgReason,
} from "../lib/aggregates";

/**
 * Missed Calls — Gestion des appels manqués et des rappels associés
 *
 * Cycle de vie :
 *   1. Un appel entrant expire sans réponse → création missedCall (reason="timeout")
 *   2. Agent assigne le rappel (callbackStatus="assigned")
 *   3. Agent lance le rappel (callbackStatus="in_progress")
 *   4. Rappel terminé (callbackStatus="completed")
 *
 * Permission requise : meetings.view_history (lecture) / meetings.manage (modifs)
 */

// ─── Queries ──────────────────────────────────────────────

/**
 * Liste les appels manqués d'une org (paginé par statut).
 */
export const listByOrg = authQuery({
  args: {
    orgId: v.id("orgs"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("assigned"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("ignored"),
      ),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "meetings.view_history");

    const limit = args.limit ?? 50;

    let missedCalls;
    if (args.status) {
      missedCalls = await ctx.db
        .query("missedCalls")
        .withIndex("by_org_status", (q) =>
          q.eq("orgId", args.orgId).eq("callbackStatus", args.status!),
        )
        .order("desc")
        .take(limit);
    } else {
      missedCalls = await ctx.db
        .query("missedCalls")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .order("desc")
        .take(limit);
    }

    // Enrichir avec user + callLine
    const enriched = await Promise.all(
      missedCalls.map(async (mc) => {
        const [callerUser, callLine, assignedMembership] = await Promise.all([
          mc.caller.userId ? ctx.db.get(mc.caller.userId) : null,
          mc.callLineId ? ctx.db.get(mc.callLineId) : null,
          mc.callbackAssignedTo ? ctx.db.get(mc.callbackAssignedTo) : null,
        ]);

        return {
          ...mc,
          callerUser: callerUser
            ? {
                _id: callerUser._id,
                firstName: (callerUser as any).firstName,
                lastName: (callerUser as any).lastName,
                email: callerUser.email,
              }
            : null,
          callLine: callLine
            ? { _id: callLine._id, label: callLine.label, color: callLine.color }
            : null,
          assignedMembership: assignedMembership
            ? { _id: assignedMembership._id, userId: assignedMembership.userId }
            : null,
        };
      }),
    );

    return enriched;
  },
});

/**
 * Statistiques d'appels manqués (dernières 30 jours).
 */
export const statsByOrg = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "meetings.view_history");

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const ns = args.orgId;
    const MAX_TIME = Number.MAX_SAFE_INTEGER;

    const rangeByStatus = (status: string) => ({
      namespace: ns,
      bounds: {
        lower: { key: [status, thirtyDaysAgo] as [string, number], inclusive: true },
        upper: { key: [status, MAX_TIME] as [string, number], inclusive: true },
      },
    });
    const rangeByReason = (reason: string) => ({
      namespace: ns,
      bounds: {
        lower: { key: [reason, thirtyDaysAgo] as [string, number], inclusive: true },
        upper: { key: [reason, MAX_TIME] as [string, number], inclusive: true },
      },
    });

    const [
      pending,
      assigned,
      inProgress,
      completed,
      ignored,
      timeout,
      no_agent,
      rejected,
      abandoned,
    ] = await Promise.all([
      missedCallsByOrgStatus.count(ctx, rangeByStatus("pending")),
      missedCallsByOrgStatus.count(ctx, rangeByStatus("assigned")),
      missedCallsByOrgStatus.count(ctx, rangeByStatus("in_progress")),
      missedCallsByOrgStatus.count(ctx, rangeByStatus("completed")),
      missedCallsByOrgStatus.count(ctx, rangeByStatus("ignored")),
      missedCallsByOrgReason.count(ctx, rangeByReason("timeout")),
      missedCallsByOrgReason.count(ctx, rangeByReason("no_agent")),
      missedCallsByOrgReason.count(ctx, rangeByReason("rejected")),
      missedCallsByOrgReason.count(ctx, rangeByReason("abandoned")),
    ]);

    return {
      total: pending + assigned + inProgress + completed + ignored,
      pending,
      completed,
      ignored,
      byReason: { timeout, no_agent, rejected, abandoned },
    };
  },
});

// ─── Mutations ────────────────────────────────────────────

/**
 * Assigne un appel manqué à un agent pour rappel.
 */
export const assignCallback = authMutation({
  args: {
    missedCallId: v.id("missedCalls"),
    membershipId: v.id("memberships"),
  },
  handler: async (ctx, args) => {
    const missedCall = await ctx.db.get(args.missedCallId);
    if (!missedCall) {
      throw error(ErrorCode.NOT_FOUND, "Appel manqué introuvable");
    }

    const membership = await getMembership(
      ctx,
      ctx.user._id,
      missedCall.orgId,
    );
    await assertCanDoTask(ctx, ctx.user, membership, "meetings.manage");

    // Validation : membership à assigner doit être de la même org
    const targetMembership = await ctx.db.get(args.membershipId);
    if (!targetMembership || targetMembership.orgId !== missedCall.orgId) {
      throw error(
        ErrorCode.VALIDATION_ERROR,
        "L'agent doit appartenir à la même représentation",
      );
    }

    await ctx.db.patch(args.missedCallId, {
      callbackStatus: "assigned",
      callbackAssignedTo: args.membershipId,
      callbackAssignedAt: Date.now(),
    });

    return args.missedCallId;
  },
});

/**
 * Marque un appel manqué comme rappelé avec succès.
 */
export const markAsCompleted = authMutation({
  args: {
    missedCallId: v.id("missedCalls"),
    notes: v.optional(v.string()),
    callbackMeetingId: v.optional(v.id("meetings")),
  },
  handler: async (ctx, args) => {
    const missedCall = await ctx.db.get(args.missedCallId);
    if (!missedCall) {
      throw error(ErrorCode.NOT_FOUND, "Appel manqué introuvable");
    }

    const membership = await getMembership(
      ctx,
      ctx.user._id,
      missedCall.orgId,
    );
    await assertCanDoTask(ctx, ctx.user, membership, "meetings.manage");
    if (!membership) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Membership requis pour cette action",
      );
    }

    await ctx.db.patch(args.missedCallId, {
      callbackStatus: "completed",
      callbackCompletedAt: Date.now(),
      callbackByMembershipId: membership._id,
      callbackNotes: args.notes,
      callbackMeetingId: args.callbackMeetingId,
    });

    return args.missedCallId;
  },
});

/**
 * Ignore un appel manqué (marqué comme traité sans rappel).
 */
export const markAsIgnored = authMutation({
  args: {
    missedCallId: v.id("missedCalls"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const missedCall = await ctx.db.get(args.missedCallId);
    if (!missedCall) {
      throw error(ErrorCode.NOT_FOUND, "Appel manqué introuvable");
    }

    const membership = await getMembership(
      ctx,
      ctx.user._id,
      missedCall.orgId,
    );
    await assertCanDoTask(ctx, ctx.user, membership, "meetings.manage");
    if (!membership) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Membership requis pour cette action",
      );
    }

    await ctx.db.patch(args.missedCallId, {
      callbackStatus: "ignored",
      callbackNotes: args.notes,
      callbackByMembershipId: membership._id,
      callbackCompletedAt: Date.now(),
    });

    return args.missedCallId;
  },
});

// ─── Internal (pour cron / callbacks LiveKit) ──────────────

/**
 * Création interne d'un appel manqué. Appelée par :
 *   - Cron qui détecte les meetings actifs > ringTimeout
 *   - Webhook LiveKit (room_ended sans join)
 *   - Mutation `end` dans meetings.ts quand le meeting se termine sans répondeur
 */
export const createInternal = internalMutation({
  args: {
    orgId: v.id("orgs"),
    callLineId: v.optional(v.id("callLines")),
    meetingId: v.id("meetings"),
    caller: v.object({
      userId: v.optional(v.id("users")),
      profileId: v.optional(v.id("profiles")),
      phoneNumber: v.optional(v.string()),
      displayName: v.optional(v.string()),
      email: v.optional(v.string()),
    }),
    startedAt: v.number(),
    endedAt: v.number(),
    reason: v.union(
      v.literal("timeout"),
      v.literal("no_agent"),
      v.literal("rejected"),
      v.literal("abandoned"),
    ),
    notifiedAgentIds: v.optional(v.array(v.id("memberships"))),
  },
  handler: async (ctx, args) => {
    // Éviter les doublons : vérifier qu'un missedCall n'existe pas déjà pour ce meeting
    const existing = await ctx.db
      .query("missedCalls")
      .withIndex("by_meeting", (q) => q.eq("meetingId", args.meetingId))
      .first();
    if (existing) return existing._id;

    return await ctx.db.insert("missedCalls", {
      orgId: args.orgId,
      callLineId: args.callLineId,
      meetingId: args.meetingId,
      caller: args.caller,
      startedAt: args.startedAt,
      endedAt: args.endedAt,
      durationSeconds: Math.floor((args.endedAt - args.startedAt) / 1000),
      reason: args.reason,
      notifiedAgentIds: args.notifiedAgentIds,
      callbackStatus: "pending",
    });
  },
});

/**
 * Cron — Détecte les appels entrants actifs > ringTimeout et crée les missedCalls.
 * Doit être appelé périodiquement (ex: toutes les 30 secondes).
 */
export const detectTimedOutCalls = internalMutation({
  args: {
    defaultRingTimeoutSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const defaultTimeout = args.defaultRingTimeoutSeconds ?? 60;
    const now = Date.now();

    // Meetings entrants actifs sans participant (personne n'a décroché)
    const active = await ctx.db
      .query("meetings")
      .filter((q) =>
        q.and(
          q.eq(q.field("isOrgInbound"), true),
          q.eq(q.field("status"), "active"),
        ),
      )
      .collect();

    let createdCount = 0;
    for (const meeting of active) {
      if (!meeting.orgId) continue;

      // Détermine le ringTimeout : spécifique à la ligne ou défaut
      let ringTimeout = defaultTimeout;
      if (meeting.callLineId) {
        const line = await ctx.db.get(meeting.callLineId);
        if (line?.ringTimeoutSeconds) ringTimeout = line.ringTimeoutSeconds;
      }

      const startedAt = meeting.startedAt ?? meeting._creationTime;
      const ageSeconds = (now - startedAt) / 1000;

      // Timeout dépassé ET personne n'a décroché (seul le créateur = citoyen)
      const noAgentJoined = meeting.participants.length < 2;

      if (ageSeconds > ringTimeout && noAgentJoined) {
        // Clôture le meeting
        await ctx.db.patch(meeting._id, {
          status: "ended",
          endedAt: now,
          endReason: "timeout",
        });

        // Crée le missedCall
        await ctx.db.insert("missedCalls", {
          orgId: meeting.orgId,
          callLineId: meeting.callLineId,
          meetingId: meeting._id,
          caller: {
            userId: meeting.createdBy,
          },
          startedAt,
          endedAt: now,
          durationSeconds: Math.floor(ageSeconds),
          reason: "timeout",
          callbackStatus: "pending",
        });
        createdCount++;
      }
    }

    return { createdCount };
  },
});
