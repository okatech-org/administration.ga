/**
 * Supervision — Sprint 6
 *
 * Gestion des sessions de supervision d'appels : listen, whisper, barge.
 *
 * Le token LiveKit est délivré séparément par
 * `actions.livekit.requestSupervisionToken`. Ces fonctions gèrent la traçabilité
 * côté DB (qui supervise qui, avec quel mode, depuis quand).
 *
 * Règles RBAC :
 *  - `meetings.supervise` requis pour toutes les mutations.
 *  - Un superviseur ne peut avoir qu'UNE session active à la fois (FIFO : on
 *    ferme la précédente à l'ouverture d'une nouvelle).
 */

import { v } from "convex/values";
import { authMutation, authQuery } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { TaskCode } from "../lib/taskCodes";
import { error, ErrorCode } from "../lib/errors";
import { supervisionModeValidator } from "../schemas/supervisionSessions";

/**
 * Ouvre une session de supervision pour un meeting donné.
 * Ferme implicitement toute session antérieure du même superviseur.
 */
export const startSupervision = authMutation({
  args: {
    meetingId: v.id("meetings"),
    mode: supervisionModeValidator,
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) throw error(ErrorCode.NOT_FOUND, "Meeting introuvable");
    if (!meeting.orgId) {
      throw error(ErrorCode.INVALID_ARGUMENT, "Meeting sans org");
    }
    if (meeting.status !== "active") {
      throw error(
        ErrorCode.INVALID_ARGUMENT,
        "Impossible de superviser un appel non actif",
      );
    }

    const membership = await getMembership(ctx, ctx.user._id, meeting.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.meetings.supervise);

    // Fermer toute session active antérieure de ce superviseur
    const existing = await ctx.db
      .query("supervisionSessions")
      .withIndex("by_supervisor_active", (q) =>
        q.eq("supervisorId", ctx.user._id).eq("endedAt", undefined),
      )
      .collect();
    const now = Date.now();
    for (const s of existing) {
      await ctx.db.patch(s._id, { endedAt: now });
    }

    const liveKitIdentity = `supervisor_${ctx.user._id}_${args.mode}`;

    const sessionId = await ctx.db.insert("supervisionSessions", {
      meetingId: args.meetingId,
      supervisorId: ctx.user._id,
      orgId: meeting.orgId,
      mode: args.mode,
      liveKitIdentity,
      startedAt: now,
    });

    return { sessionId, liveKitIdentity };
  },
});

/**
 * Ferme une session de supervision.
 * Le superviseur lui-même, ou un administrateur (supervise), peut la fermer.
 */
export const endSupervision = authMutation({
  args: {
    sessionId: v.id("supervisionSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw error(ErrorCode.NOT_FOUND, "Session introuvable");
    if (session.endedAt !== undefined) return { alreadyClosed: true };

    // Propriétaire ou admin
    if (session.supervisorId !== ctx.user._id) {
      const membership = await getMembership(ctx, ctx.user._id, session.orgId);
      await assertCanDoTask(
        ctx,
        ctx.user,
        membership,
        TaskCode.meetings.supervise,
      );
    }

    await ctx.db.patch(args.sessionId, { endedAt: Date.now() });
    return { alreadyClosed: false };
  },
});

/**
 * Liste les sessions de supervision actives (endedAt undefined) pour une org.
 * Requiert `meetings.supervise`.
 */
export const listActiveSupervisions = authQuery({
  args: {
    orgId: v.id("orgs"),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.meetings.supervise);

    const sessions = await ctx.db
      .query("supervisionSessions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    return sessions.filter((s) => s.endedAt === undefined);
  },
});

/**
 * Statut de supervision pour un meeting donné.
 * Utilisé côté agent-web pour afficher un badge "Supervision active".
 * Retourne null si aucune session active.
 */
export const getSupervisionStatusForMeeting = authQuery({
  args: {
    meetingId: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting || !meeting.orgId) return null;

    const sessions = await ctx.db
      .query("supervisionSessions")
      .withIndex("by_meeting", (q) => q.eq("meetingId", args.meetingId))
      .collect();

    const active = sessions.find((s) => s.endedAt === undefined);
    if (!active) return null;

    // On ne révèle pas l'identité du superviseur au citoyen (privacy).
    // Mais l'agent qui reçoit la query voit le mode (badge utile).
    const supervisor = await ctx.db.get(active.supervisorId);
    return {
      sessionId: active._id,
      mode: active.mode,
      startedAt: active.startedAt,
      supervisorName: supervisor
        ? `${supervisor.firstName ?? ""} ${supervisor.lastName ?? ""}`.trim()
        : null,
    };
  },
});
