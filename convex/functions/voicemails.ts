/**
 * Voicemails — Sprint 6
 *
 * Gestion des messages vocaux laissés par les citoyens lors d'un fallback IVR
 * (finalAction: "voicemail"). Déclenché automatiquement par
 * callCenter.processCallFallbacks.
 *
 * Pipeline :
 *  1. processCallFallbacks détecte fallback → appelle startVoicemailForMeeting.
 *  2. Row voicemails créée avec status pending (audioStorageId undefined).
 *  3. Scheduler → internal.actions.livekit.startVoicemailEgress.
 *  4. Webhook egress → completeEgress : storageId + durationMs.
 *  5. Push + in-app notification aux agents de la callLine.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { authMutation, authQuery } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { TaskCode } from "../lib/taskCodes";
import { error, ErrorCode } from "../lib/errors";
import { NotificationType } from "../lib/constants";

/**
 * Crée une voicemail pending + déclenche l'egress.
 * Appelée depuis `processCallFallbacks` (internal).
 */
export const startVoicemailForMeeting = internalMutation({
  args: {
    meetingId: v.id("meetings"),
    citizenParticipantIdentity: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting || !meeting.orgId) {
      console.warn(
        "[SPRINT6] startVoicemailForMeeting: meeting introuvable ou sans org",
      );
      return null;
    }

    // Résoudre les infos citoyen depuis participants[0] non-agent
    const citizenParticipantId = meeting.participants.find(
      (p) => p.role === "participant",
    )?.userId;
    let citizenUser = null;
    if (citizenParticipantId) {
      citizenUser = await ctx.db.get(citizenParticipantId);
    }

    const voicemailId = await ctx.db.insert("voicemails", {
      meetingId: args.meetingId,
      orgId: meeting.orgId,
      callLineId: meeting.callLineId,
      citizenUserId: citizenParticipantId,
      citizenDisplayName: citizenUser
        ? `${citizenUser.firstName ?? ""} ${citizenUser.lastName ?? ""}`.trim()
        : undefined,
      citizenPhoneOrEmail: citizenUser?.email ?? citizenUser?.phone,
      isRead: false,
      createdAt: Date.now(),
    });

    // Lancer l'egress (stub si env manquante)
    await ctx.scheduler.runAfter(
      0,
      internal.actions.livekit.startVoicemailEgress,
      {
        roomName: meeting.roomName,
        voicemailId,
        participantIdentity:
          args.citizenParticipantIdentity ??
          (citizenParticipantId as string | undefined) ??
          "citizen",
      },
    );

    return { voicemailId };
  },
});

/**
 * Attache l'egressId à la voicemail (post-scheduler).
 */
export const attachEgressId = internalMutation({
  args: {
    voicemailId: v.id("voicemails"),
    egressId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.voicemailId, { egressId: args.egressId });
  },
});

/**
 * Webhook complete : renseigne storageId + durée, envoie notifications push.
 */
export const completeEgress = internalMutation({
  args: {
    egressId: v.string(),
    storageId: v.optional(v.id("_storage")),
    durationMs: v.optional(v.number()),
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const vm = await ctx.db
      .query("voicemails")
      .withIndex("by_egress_id", (q) => q.eq("egressId", args.egressId))
      .unique();
    if (!vm) return { found: false };

    if (args.failureReason) {
      await ctx.db.patch(vm._id, { failureReason: args.failureReason });
      return { found: true, status: "failed" };
    }

    await ctx.db.patch(vm._id, {
      audioStorageId: args.storageId,
      durationMs: args.durationMs,
    });

    // Notifier les agents de la ligne — in-app + push
    if (vm.callLineId) {
      const line = await ctx.db.get(vm.callLineId);
      if (line) {
        for (const membershipId of line.membershipIds) {
          const m = await ctx.db.get(membershipId);
          if (!m || m.deletedAt) continue;
          await ctx.db.insert("notifications", {
            userId: m.userId,
            type: NotificationType.VoicemailLeft,
            title: "Nouveau message vocal",
            body:
              vm.citizenDisplayName ??
              vm.citizenPhoneOrEmail ??
              "Appelant inconnu",
            link: "/iasted?tab=voicemail",
            isRead: false,
            relatedId: vm._id as string,
            relatedType: "voicemail",
            createdAt: Date.now(),
          });
          // Push parallèle (stub si VAPID absent)
          await ctx.scheduler.runAfter(
            0,
            internal.actions.push.sendPushNotification,
            {
              userId: m.userId,
              payload: {
                title: "Nouveau message vocal",
                body:
                  vm.citizenDisplayName ??
                  vm.citizenPhoneOrEmail ??
                  "Appelant inconnu",
                url: "/iasted?tab=voicemail",
                tag: "voicemail_new",
              },
            },
          );
        }
      }
    }

    return { found: true, status: "completed" };
  },
});

/**
 * Liste les voicemails d'une org (unread en tête).
 */
export const listForOrg = authQuery({
  args: {
    orgId: v.id("orgs"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.voicemails.view);

    const voicemails = await ctx.db
      .query("voicemails")
      .withIndex("by_org_created", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(args.limit ?? 100);

    return voicemails;
  },
});

/**
 * Nombre de voicemails non lus (badge).
 */
export const getUnreadCount = authQuery({
  args: {
    orgId: v.id("orgs"),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.voicemails.view);

    const unread = await ctx.db
      .query("voicemails")
      .withIndex("by_org_unread", (q) =>
        q.eq("orgId", args.orgId).eq("isRead", false),
      )
      .take(1000);

    return unread.length;
  },
});

/**
 * Marque comme lu (ou non lu).
 */
export const markAsRead = authMutation({
  args: {
    voicemailId: v.id("voicemails"),
    read: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const vm = await ctx.db.get(args.voicemailId);
    if (!vm) throw error(ErrorCode.NOT_FOUND, "Voicemail introuvable");

    const membership = await getMembership(ctx, ctx.user._id, vm.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.voicemails.listen);

    const isRead = args.read ?? true;
    await ctx.db.patch(args.voicemailId, {
      isRead,
      readAt: isRead ? Date.now() : undefined,
      readBy: isRead ? ctx.user._id : undefined,
    });
  },
});

/**
 * URL signée pour lire l'audio (audit log via mutation).
 */
export const getPlaybackUrl = authMutation({
  args: {
    voicemailId: v.id("voicemails"),
  },
  handler: async (ctx, args) => {
    const vm = await ctx.db.get(args.voicemailId);
    if (!vm) throw error(ErrorCode.NOT_FOUND, "Voicemail introuvable");
    if (!vm.audioStorageId) {
      throw error(ErrorCode.INVALID_ARGUMENT, "Audio indisponible (pending)");
    }

    const membership = await getMembership(ctx, ctx.user._id, vm.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.voicemails.listen);

    const url = await ctx.storage.getUrl(vm.audioStorageId);
    return { url };
  },
});

/**
 * Suppression définitive.
 */
export const deleteVoicemail = authMutation({
  args: {
    voicemailId: v.id("voicemails"),
  },
  handler: async (ctx, args) => {
    const vm = await ctx.db.get(args.voicemailId);
    if (!vm) throw error(ErrorCode.NOT_FOUND, "Voicemail introuvable");

    const membership = await getMembership(ctx, ctx.user._id, vm.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.voicemails.delete);

    if (vm.audioStorageId) {
      await ctx.storage.delete(vm.audioStorageId);
    }
    await ctx.db.delete(args.voicemailId);
  },
});
