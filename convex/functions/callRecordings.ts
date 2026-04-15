/**
 * Call Recordings — Sprint 6
 *
 * Gestion des enregistrements d'appel via LiveKit RoomCompositeEgress.
 *
 * Lifecycle :
 *  1. Agent lance `startRecording({ meetingId })` (requiert `callRecordings.start`)
 *     ET le citoyen a accepté dans la modal RGPD.
 *  2. Scheduler déclenche `startCallRecordingEgress` (action Node).
 *  3. LiveKit écrit le fichier puis POST webhook → `completeEgress`.
 *  4. Le superviseur peut écouter via `getPlaybackUrl` (audit log).
 *  5. Retention cron supprime le storage après N jours (défaut 90).
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { authMutation, authQuery } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { TaskCode } from "../lib/taskCodes";
import { error, ErrorCode } from "../lib/errors";

const DEFAULT_RETENTION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

function getRetentionDays(): number {
  const fromEnv = process.env.CALL_RECORDING_RETENTION_DAYS;
  if (!fromEnv) return DEFAULT_RETENTION_DAYS;
  const parsed = Number(fromEnv);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RETENTION_DAYS;
}

/**
 * Démarre un enregistrement pour un meeting.
 * Pré-conditions :
 *  - Meeting actif.
 *  - Consent citoyen accepté (`citizenConsent.recordingAccepted === true`).
 *  - Permission `callRecordings.start`.
 */
export const startRecording = authMutation({
  args: {
    meetingId: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) throw error(ErrorCode.NOT_FOUND, "Meeting introuvable");
    if (!meeting.orgId) throw error(ErrorCode.INVALID_ARGUMENT, "Meeting sans org");
    if (meeting.status !== "active") {
      throw error(ErrorCode.INVALID_ARGUMENT, "Impossible d'enregistrer un appel non actif");
    }

    const membership = await getMembership(ctx, ctx.user._id, meeting.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.callRecordings.start);

    // Exige consent citoyen — pas de fallback
    if (!meeting.citizenConsent?.recordingAccepted) {
      throw error(
        ErrorCode.FORBIDDEN,
        "Consentement du citoyen requis avant enregistrement",
      );
    }

    const now = Date.now();
    const retentionMs = getRetentionDays() * DAY_MS;

    const recordingId = await ctx.db.insert("callRecordings", {
      meetingId: args.meetingId,
      orgId: meeting.orgId,
      startedAt: now,
      consentBannerShown: true,
      consentAcceptedByCitizenAt: meeting.citizenConsent.recordingAcceptedAt,
      retentionUntil: now + retentionMs,
      status: "pending",
      startedBy: ctx.user._id,
    });

    // Lance l'egress côté LiveKit (stub si env absente)
    await ctx.scheduler.runAfter(
      0,
      internal.actions.livekit.startCallRecordingEgress,
      {
        roomName: meeting.roomName,
        recordingId,
      },
    );

    return { recordingId };
  },
});

/**
 * Arrête un enregistrement en cours.
 */
export const stopRecording = authMutation({
  args: {
    recordingId: v.id("callRecordings"),
  },
  handler: async (ctx, args) => {
    const rec = await ctx.db.get(args.recordingId);
    if (!rec) throw error(ErrorCode.NOT_FOUND, "Enregistrement introuvable");
    if (rec.status !== "pending") return { alreadyStopped: true };

    const membership = await getMembership(ctx, ctx.user._id, rec.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.callRecordings.stop);

    await ctx.db.patch(args.recordingId, { endedAt: Date.now() });

    if (rec.egressId) {
      await ctx.scheduler.runAfter(
        0,
        internal.actions.livekit.stopCallRecordingEgress,
        { egressId: rec.egressId },
      );
    }

    return { alreadyStopped: false };
  },
});

/**
 * Attache l'egressId à la row (appelé par l'action après startRoomCompositeEgress).
 */
export const attachEgressId = internalMutation({
  args: {
    recordingId: v.id("callRecordings"),
    egressId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.recordingId, { egressId: args.egressId });
  },
});

/**
 * Complétion egress : appelée par le webhook handler après upload du fichier.
 * Renseigne storageId, durée, status=completed.
 */
export const completeEgress = internalMutation({
  args: {
    egressId: v.string(),
    storageId: v.optional(v.id("_storage")),
    durationMs: v.optional(v.number()),
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rec = await ctx.db
      .query("callRecordings")
      .withIndex("by_egress_id", (q) => q.eq("egressId", args.egressId))
      .unique();
    if (!rec) {
      console.warn("[SPRINT6] callRecordings.completeEgress: egressId not found");
      return { found: false };
    }

    const now = Date.now();
    if (args.failureReason) {
      await ctx.db.patch(rec._id, {
        status: "failed",
        failureReason: args.failureReason,
        endedAt: rec.endedAt ?? now,
      });
    } else {
      await ctx.db.patch(rec._id, {
        status: "completed",
        storageId: args.storageId,
        durationMs: args.durationMs,
        endedAt: rec.endedAt ?? now,
      });
    }
    return { found: true };
  },
});

/**
 * Liste les enregistrements d'une org (récents d'abord).
 * Requiert `callRecordings.listen`.
 */
export const listForOrg = authQuery({
  args: {
    orgId: v.id("orgs"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.callRecordings.listen);

    const recordings = await ctx.db
      .query("callRecordings")
      .withIndex("by_org_started", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(args.limit ?? 50);

    // Exclure les deleted (retention reached)
    return recordings.filter((r) => r.deletedAt === undefined);
  },
});

/**
 * Retourne une URL signée pour lire un enregistrement.
 * Mutation (pas query) pour permettre un audit log côté serveur.
 */
export const getPlaybackUrl = authMutation({
  args: {
    recordingId: v.id("callRecordings"),
  },
  handler: async (ctx, args) => {
    const rec = await ctx.db.get(args.recordingId);
    if (!rec) throw error(ErrorCode.NOT_FOUND, "Enregistrement introuvable");
    if (rec.status !== "completed" || !rec.storageId) {
      throw error(ErrorCode.INVALID_ARGUMENT, "Enregistrement non disponible");
    }
    if (rec.deletedAt !== undefined) {
      throw error(ErrorCode.NOT_FOUND, "Enregistrement expiré (rétention)");
    }

    const membership = await getMembership(ctx, ctx.user._id, rec.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.callRecordings.listen);

    const url = await ctx.storage.getUrl(rec.storageId);
    return { url };
  },
});

/**
 * Supprime manuellement un enregistrement (audit log).
 */
export const deleteRecording = authMutation({
  args: {
    recordingId: v.id("callRecordings"),
  },
  handler: async (ctx, args) => {
    const rec = await ctx.db.get(args.recordingId);
    if (!rec) throw error(ErrorCode.NOT_FOUND, "Enregistrement introuvable");

    const membership = await getMembership(ctx, ctx.user._id, rec.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.callRecordings.delete);

    if (rec.storageId) {
      await ctx.storage.delete(rec.storageId);
    }
    await ctx.db.patch(args.recordingId, {
      deletedAt: Date.now(),
      storageId: undefined,
    });
    return { ok: true };
  },
});

/**
 * Cron daily : purge des enregistrements dont la rétention est atteinte.
 * Supprime uniquement le storage, garde la row pour audit.
 */
export const cleanupExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("callRecordings")
      .withIndex("by_retention", (q) => q.lt("retentionUntil", now))
      .take(200);

    let purged = 0;
    for (const rec of expired) {
      if (rec.deletedAt) continue; // déjà purgé
      if (rec.storageId) {
        try {
          await ctx.storage.delete(rec.storageId);
        } catch (e) {
          console.warn("[SPRINT6] cleanupExpired: storage.delete failed", e);
        }
      }
      await ctx.db.patch(rec._id, {
        deletedAt: now,
        storageId: undefined,
      });
      purged++;
    }
    return { purged, scanned: expired.length };
  },
});
