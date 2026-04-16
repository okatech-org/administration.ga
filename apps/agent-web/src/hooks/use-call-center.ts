"use client";

import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  useAuthenticatedConvexQuery,
  useConvexActionQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { callStore, useCallStore } from "@/stores/call-store";

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
 *
 * Expose :
 * - `queue`       — appels entrants visibles par l'agent (file partagée multi-lignes)
 * - `activeCalls` — slots actifs (callStatus ∈ { connected, on_hold })
 * - `activeSlotId`, `slots` — état local mirror de la réactivité Convex
 * - `pickup(meetingId)`   — décroche un appel (first-click-wins)
 * - `hangup(meetingId?)`  — raccroche (actif par défaut)
 * - `decline(meetingId)`  — refuse un appel entrant
 *
 * Sprint 2 : ajoutera `hold`, `resume`, `transfer`.
 */
export function useCallCenter() {
  const { slots, activeSlotId, upsertSlot, removeSlot } = useCallStore();

  // Queue partagée multi-lignes
  const { data: queueRaw, isPending: queuePending } = useAuthenticatedConvexQuery(
    api.functions.callCenter.listQueuedCallsForAgent,
    {},
  );
  const queue = queueRaw ?? [];

  // Slots actifs (connected / on_hold) côté serveur
  const { data: activeCallsRaw } = useAuthenticatedConvexQuery(
    api.functions.callCenter.listActiveCallsForUser,
    {},
  );
  const activeCalls = activeCallsRaw ?? [];

  // Appels manqués à rappeler (pending + assigned + in_progress)
  const { data: missedRaw } = useAuthenticatedConvexQuery(
    api.functions.callCenter.listMissedCallsForAgent,
    {},
  );
  const missedCalls = missedRaw ?? [];

  // Derniers appels terminés (answered, abandoned, missed) — vue historique
  const { data: recentRaw } = useAuthenticatedConvexQuery(
    api.functions.callCenter.listRecentCallsForAgent,
    {},
  );
  const recentCalls = recentRaw ?? [];

  // Mutations
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
  const { mutateAsync: declineMutation } = useConvexMutationQuery(
    api.functions.meetings.declineCall,
  );
  const { mutateAsync: endMutation } = useConvexMutationQuery(
    api.functions.meetings.end,
  );
  const { mutateAsync: requestTokenAction } = useConvexActionQuery(
    api.actions.livekit.requestToken,
  );

  /**
   * Décroche un appel de la file.
   * Flux :
   *  1. Mutation serveur (first-click-wins, précondition callStatus=ringing)
   *  2. Demande de token LiveKit
   *  3. Upsert du slot local en `active`
   */
  const pickup = useCallback(
    async (meetingId: Id<"meetings">) => {
      trace("pickup:start", meetingId);
      try {
        upsertSlot({ meetingId, status: "connecting" });
        const picked = await pickupMutation({ meetingId });
        const tokenResult = await requestTokenAction({ meetingId });
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
    [pickupMutation, requestTokenAction, upsertSlot, removeSlot],
  );

  /**
   * Raccroche (actif par défaut, ou un slot spécifique).
   * Si l'appel terminé était actif, le backend auto-reprend le plus récent held.
   * On demande alors un nouveau token LiveKit pour rebrancher l'audio.
   */
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

      // Si un slot held a été auto-repris, on rebranche le token LiveKit
      if (resumedMeetingId) {
        try {
          const tokenResult = await requestTokenAction({
            meetingId: resumedMeetingId,
          });
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
    [activeSlotId, endCallSlotMutation, removeSlot, requestTokenAction, upsertSlot],
  );

  /** Parque un appel actif (audio coupé, slot conservé). */
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

  /** Reprend un appel parqué. Parque automatiquement l'actif courant côté serveur. */
  const resume = useCallback(
    async (meetingId: Id<"meetings">) => {
      trace("resume", meetingId);
      try {
        await resumeMutation({ meetingId });
        // Nouveau token LiveKit — la room est la même mais audio doit reprendre
        const tokenResult = await requestTokenAction({ meetingId });
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
    [resumeMutation, requestTokenAction, upsertSlot],
  );

  /**
   * Rappelle un citoyen depuis la liste des appels manqués.
   * Crée un outbound call côté serveur + demande un token LiveKit + upsert le slot actif.
   */
  const callBackMissed = useCallback(
    async (missedCallId: Id<"missedCalls">) => {
      try {
        const { meetingId } = await callBackMissedMutation({ missedCallId });
        const tokenResult = await requestTokenAction({ meetingId });
        upsertSlot({
          meetingId,
          status: "active",
          token: tokenResult.token,
          wsUrl: tokenResult.wsUrl,
          roomName: tokenResult.roomName,
          joinedAt: Date.now(),
        });
        toast.success("Rappel en cours…");
        return { meetingId };
      } catch (err: any) {
        toast.error(err?.message ?? "Impossible de rappeler");
        throw err;
      }
    },
    [callBackMissedMutation, requestTokenAction, upsertSlot],
  );

  /**
   * Rappelle directement un citoyen par son userId et l'org d'origine.
   * Utilisé par la section "Récents" qui n'a pas de row missedCalls.
   */
  const callBackRecent = useCallback(
    async (targetUserId: Id<"users">, orgId: Id<"orgs">) => {
      try {
        const { meetingId } = await callUserMutation({ orgId, targetUserId });
        const tokenResult = await requestTokenAction({ meetingId });
        upsertSlot({
          meetingId,
          status: "active",
          token: tokenResult.token,
          wsUrl: tokenResult.wsUrl,
          roomName: tokenResult.roomName,
          joinedAt: Date.now(),
        });
        toast.success("Rappel en cours…");
        return { meetingId };
      } catch (err: any) {
        toast.error(err?.message ?? "Impossible de rappeler");
        throw err;
      }
    },
    [callUserMutation, requestTokenAction, upsertSlot],
  );

  /** Transfère l'appel à un agent ou une ligne. */
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

  /** Refuse un appel entrant (ne l'a pas encore décroché). */
  const decline = useCallback(
    async (meetingId: Id<"meetings">) => {
      try {
        await declineMutation({ meetingId });
      } catch {
        // Peut déjà être terminé — silencieux
      }
    },
    [declineMutation],
  );

  /** Termine côté host (admin-like) — Sprint 2 réservé aux superviseurs. */
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

  /**
   * Réconciliation serveur → client.
   *
   * Le serveur est la source de vérité pour "quels slots existent dans quel état".
   * Le store local ne sert qu'à porter les tokens LiveKit + l'intent "slot actif".
   *
   * Sans ce hook, quand un appel termine côté serveur (LiveKit disconnect,
   * citoyen qui raccroche, erreur réseau sur la mutation hangup, tab fermé
   * puis rouvert…), le store gardait un `activeSlotId` fantôme et le floating
   * Raccrocher restait visible alors que `listActiveCallsForUser` renvoyait [].
   *
   * On laisse toujours vivre les slots en `connecting` : ils sont dans une
   * fenêtre de course légitime avant que la query ne les voie.
   */
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

  // Nombre d'appels urgents dans la file — utile pour badge ping dans la sidebar
  const urgentCount = queue.filter((q: any) => q.priority === "urgent").length;

  return {
    // Données
    queue,
    queuePending,
    activeCalls,
    activeSlotId,
    slots,
    urgentCount,
    missedCalls,
    recentCalls,

    // Actions
    pickup,
    hangup,
    decline,
    forceEnd,
    hold,
    resume,
    transfer,
    callBackMissed,
    callBackRecent,

    // Expose aussi le store directement pour les cas avancés
    setActiveSlot: callStore.setActiveSlot,
  };
}
