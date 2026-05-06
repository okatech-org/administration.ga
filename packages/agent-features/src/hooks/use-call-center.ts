"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  useAuthenticatedConvexQuery,
  useConvexActionQuery,
  useConvexMutationQuery,
} from "@workspace/api/hooks";
import { callStore, useCallStore } from "../stores/call-store";

/**
 * Traces détaillées des transitions de slot pour le debug.
 * Activer via `NEXT_PUBLIC_DEBUG_CALLS=1` dans `.env.local`.
 */
const DEBUG_CALLS =
  process.env.NEXT_PUBLIC_DEBUG_CALLS === "1" ||
  process.env.NEXT_PUBLIC_DEBUG_CALLS === "true";
const trace = (...args: unknown[]) => {
  if (DEBUG_CALLS) {
    // eslint-disable-next-line no-console
    console.debug("[CallSlot]", ...args);
  }
};

/**
 * Orchestrateur principal du Centre d'Appels.
 */
export function useCallCenter() {
  const { slots, activeSlotId, upsertSlot, removeSlot } = useCallStore();

  const { data: queueRaw, isPending: queuePending } = useAuthenticatedConvexQuery(
    api.functions.callCenter.listQueuedCallsForAgent,
    {},
  );
  const queue = queueRaw ?? [];

  const { data: activeCallsRaw } = useAuthenticatedConvexQuery(
    api.functions.callCenter.listActiveCallsForUser,
    {},
  );
  const activeCalls = activeCallsRaw ?? [];

  const { data: missedRaw } = useAuthenticatedConvexQuery(
    api.functions.callCenter.listMissedCallsForAgent,
    {},
  );
  const missedCalls = missedRaw ?? [];

  const { data: recentRaw } = useAuthenticatedConvexQuery(
    api.functions.callCenter.listRecentCallsForAgent,
    {},
  );
  const recentCalls = recentRaw ?? [];

  const { mutateAsync: pickupMutation } = useConvexMutationQuery(
    api.functions.callCenter.pickupCall,
  );
  const { mutateAsync: holdMutation } = useConvexMutationQuery(
    api.functions.callCenter.putCallOnHold,
  );
  const { mutateAsync: resumeMutation } = useConvexMutationQuery(
    api.functions.callCenter.resumeCall,
  );
  const { mutateAsync: endCallSlotMutation } = useConvexMutationQuery(
    api.functions.callCenter.endCallSlot,
  );
  const { mutateAsync: transferMutation } = useConvexMutationQuery(
    api.functions.callCenter.transferCall,
  );
  const { mutateAsync: callBackMissedMutation } = useConvexMutationQuery(
    api.functions.callCenter.callBackMissedCall,
  );
  const { mutateAsync: callUserMutation } = useConvexMutationQuery(
    api.functions.meetings.callUser,
  );
  const { mutateAsync: setCallRingingMutation } = useConvexMutationQuery(
    api.functions.meetings.setCallRinging,
  );
  const { mutateAsync: declineMutation } = useConvexMutationQuery(
    api.functions.meetings.declineCall,
  );
  const { mutateAsync: endMutation } = useConvexMutationQuery(
    api.functions.meetings.end,
  );
  const { mutateAsync: requestTokenAction } = useConvexActionQuery(
    api.actions.livekit.requestToken,
  );

  // Cache des tokens LiveKit par meetingId. Évite de redemander un token au
  // serveur à chaque hold/resume ou à chaque switch d'appel. Les tokens
  // LiveKit ont typiquement un TTL de 1h ; on garde un buffer de sécurité
  // (50 min) pour éviter d'utiliser un token expiré.
  const TOKEN_TTL_MS = 50 * 60 * 1000;
  const tokenCacheRef = useRef<
    Map<
      string,
      { token: string; wsUrl: string; roomName: string; expiresAt: number }
    >
  >(new Map());

  const getOrFetchToken = useCallback(
    async (meetingId: Id<"meetings">) => {
      const cached = tokenCacheRef.current.get(meetingId as string);
      if (cached && cached.expiresAt > Date.now()) {
        return {
          token: cached.token,
          wsUrl: cached.wsUrl,
          roomName: cached.roomName,
        };
      }
      const fresh = await requestTokenAction({ meetingId });
      tokenCacheRef.current.set(meetingId as string, {
        token: fresh.token,
        wsUrl: fresh.wsUrl,
        roomName: fresh.roomName,
        expiresAt: Date.now() + TOKEN_TTL_MS,
      });
      return fresh;
    },
    [requestTokenAction],
  );

  const invalidateToken = useCallback((meetingId: Id<"meetings">) => {
    tokenCacheRef.current.delete(meetingId as string);
  }, []);

  const pickup = useCallback(
    async (meetingId: Id<"meetings">) => {
      trace("pickup:start", meetingId);
      try {
        upsertSlot({ meetingId, status: "connecting" });
        const picked = await pickupMutation({ meetingId });
        const tokenResult = await getOrFetchToken(meetingId);
        upsertSlot({
          meetingId,
          status: "active",
          token: tokenResult.token,
          wsUrl: tokenResult.wsUrl,
          roomName: tokenResult.roomName ?? picked.roomName,
          joinedAt: Date.now(),
        });
        trace("pickup:ok", meetingId);
        return { meetingId, token: tokenResult.token, wsUrl: tokenResult.wsUrl };
      } catch (err: any) {
        removeSlot(meetingId);
        const msg: string =
          err?.data?.message ?? err?.message ?? "Impossible de décrocher";
        trace("pickup:error", meetingId, msg);
        toast.error(msg);
        throw err;
      }
    },
    [pickupMutation, getOrFetchToken, upsertSlot, removeSlot],
  );

  const hangup = useCallback(
    async (meetingId?: Id<"meetings">) => {
      const target = meetingId ?? activeSlotId;
      if (!target) return;
      let resumedMeetingId: Id<"meetings"> | null = null;
      try {
        const result = await endCallSlotMutation({
          meetingId: target,
          reason: "normal",
        });
        resumedMeetingId = result?.resumedMeetingId ?? null;
      } catch {
        // L'autre partie peut avoir déjà raccroché → pas bloquant
      }
      removeSlot(target);

      // Le slot terminé a été retiré : on invalide aussi sa valeur en cache
      // pour éviter d'utiliser un token périmé si le même meetingId revient.
      invalidateToken(target);

      if (resumedMeetingId) {
        try {
          const tokenResult = await getOrFetchToken(resumedMeetingId);
          upsertSlot({
            meetingId: resumedMeetingId,
            status: "active",
            token: tokenResult.token,
            wsUrl: tokenResult.wsUrl,
            roomName: tokenResult.roomName,
            joinedAt: Date.now(),
          });
        } catch (err: any) {
          toast.error(err?.message ?? "Impossible de reprendre l'appel parqué");
        }
      }
    },
    [
      activeSlotId,
      endCallSlotMutation,
      removeSlot,
      getOrFetchToken,
      invalidateToken,
      upsertSlot,
    ],
  );

  const hold = useCallback(
    async (meetingId: Id<"meetings">) => {
      trace("hold", meetingId);
      try {
        await holdMutation({ meetingId });
        upsertSlot({
          meetingId,
          status: "held",
          heldSince: Date.now(),
        });
      } catch (err: any) {
        toast.error(err?.message ?? "Impossible de mettre en attente");
      }
    },
    [holdMutation, upsertSlot],
  );

  const resume = useCallback(
    async (meetingId: Id<"meetings">) => {
      trace("resume", meetingId);
      try {
        await resumeMutation({ meetingId });
        const tokenResult = await getOrFetchToken(meetingId);
        upsertSlot({
          meetingId,
          status: "active",
          token: tokenResult.token,
          wsUrl: tokenResult.wsUrl,
          roomName: tokenResult.roomName,
          joinedAt: Date.now(),
          heldSince: null,
        });
      } catch (err: any) {
        toast.error(err?.message ?? "Impossible de reprendre l'appel");
      }
    },
    [resumeMutation, getOrFetchToken, upsertSlot],
  );

  const callBackMissed = useCallback(
    async (missedCallId: Id<"missedCalls">) => {
      try {
        const { meetingId } = await callBackMissedMutation({ missedCallId });
        const tokenResult = await getOrFetchToken(meetingId);
        upsertSlot({
          meetingId,
          status: "active",
          token: tokenResult.token,
          wsUrl: tokenResult.wsUrl,
          roomName: tokenResult.roomName,
          joinedAt: Date.now(),
        });
        // Transition initiating → ringing so the callee's GlobalCallAlert
        // picks up the call and rings.
        await setCallRingingMutation({ meetingId });
        toast.success("Rappel en cours…");
        return { meetingId };
      } catch (err: any) {
        toast.error(err?.message ?? "Impossible de rappeler");
        throw err;
      }
    },
    [callBackMissedMutation, getOrFetchToken, upsertSlot, setCallRingingMutation],
  );

  const callBackRecent = useCallback(
    async (targetUserId: Id<"users">, orgId: Id<"orgs">) => {
      try {
        const { meetingId } = await callUserMutation({
          orgId,
          targetUserId,
          mediaType: "video",
        });
        const tokenResult = await getOrFetchToken(meetingId);
        upsertSlot({
          meetingId,
          status: "active",
          token: tokenResult.token,
          wsUrl: tokenResult.wsUrl,
          roomName: tokenResult.roomName,
          joinedAt: Date.now(),
        });
        // Transition initiating → ringing so the callee's GlobalCallAlert
        // picks up the call and rings.
        await setCallRingingMutation({ meetingId });
        toast.success("Rappel en cours…");
        return { meetingId };
      } catch (err: any) {
        toast.error(err?.message ?? "Impossible de rappeler");
        throw err;
      }
    },
    [callUserMutation, getOrFetchToken, upsertSlot, setCallRingingMutation],
  );

  const transfer = useCallback(
    async (
      meetingId: Id<"meetings">,
      target: { userId?: Id<"users">; lineId?: Id<"callLines"> },
    ) => {
      try {
        await transferMutation({
          meetingId,
          targetUserId: target.userId,
          targetLineId: target.lineId,
        });
        removeSlot(meetingId);
        toast.success("Appel transféré");
      } catch (err: any) {
        toast.error(err?.message ?? "Transfert impossible");
      }
    },
    [transferMutation, removeSlot],
  );

  const decline = useCallback(
    async (meetingId: Id<"meetings">) => {
      try {
        await declineMutation({ meetingId });
      } catch (err: any) {
        // L'appel peut déjà être terminé côté serveur (raccrochage de
        // l'appelant juste avant le clic décline). On surface l'erreur
        // pour les autres cas (permission, validation), où le silence
        // donnait l'impression que le bouton était cassé.
        const msg: string = err?.data?.message ?? err?.message ?? "";
        if (msg && !/non trouvé|already|déjà/i.test(msg)) {
          toast.error(msg);
        }
      }
    },
    [declineMutation],
  );

  const forceEnd = useCallback(
    async (meetingId: Id<"meetings">) => {
      try {
        await endMutation({ meetingId });
      } catch (err: any) {
        toast.error(err?.message ?? "Impossible de terminer l'appel");
      }
      removeSlot(meetingId);
    },
    [endMutation, removeSlot],
  );

  useEffect(() => {
    const serverIds = new Set(activeCalls.map((c: any) => c._id as string));
    for (const slot of slots) {
      if (slot.status === "connecting") continue;
      if (!serverIds.has(slot.meetingId as string)) {
        trace("reconcile:removeStaleSlot", slot.meetingId);
        callStore.removeSlot(slot.meetingId);
      }
    }
    if (activeSlotId && !serverIds.has(activeSlotId as string)) {
      const firstConnected = activeCalls.find(
        (c: any) => c.callStatus === "connected",
      );
      trace("reconcile:realignActive", {
        stale: activeSlotId,
        next: firstConnected?._id ?? null,
      });
      callStore.setActiveSlot(
        (firstConnected?._id as Id<"meetings"> | undefined) ?? null,
      );
    }
  }, [activeCalls, slots, activeSlotId]);

  const urgentCount = queue.filter((q: any) => q.priority === "urgent").length;

  return {
    queue,
    queuePending,
    activeCalls,
    activeSlotId,
    slots,
    urgentCount,
    missedCalls,
    recentCalls,

    pickup,
    hangup,
    decline,
    forceEnd,
    hold,
    resume,
    transfer,
    callBackMissed,
    callBackRecent,

    setActiveSlot: callStore.setActiveSlot,
  };
}
