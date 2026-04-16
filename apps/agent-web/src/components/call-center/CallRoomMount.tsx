"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { Id } from "@convex/_generated/dataModel";
import type { CallSlot } from "@/stores/call-store";

/**
 * CallRoomMount — LiveKit invisible par slot du Centre d'Appels.
 *
 * Le pool de rooms permet aux appels parqués de rester connectés :
 *  - Si le citoyen raccroche pendant le hold → `onDisconnected` remonte
 *  - Resume = ré-activation audio (pas de reconnexion WebRTC)
 *
 * Invariant : exactement 1 slot `active` à la fois. Le composant interne
 * `<MicController>` synchronise mic + audio renderer selon le statut du slot.
 */
export function CallRoomMount({
  slot,
  isActive,
  onDisconnected,
}: {
  slot: CallSlot;
  isActive: boolean;
  onDisconnected: (meetingId: Id<"meetings">) => void;
}) {
  // On ne propage `onDisconnected` (qui termine l'appel côté serveur) QUE si
  // la session LiveKit s'est d'abord réellement établie. Sans ce garde-fou,
  // une erreur de handshake WebSocket (CSP, réseau, token expiré) terminait
  // immédiatement l'appel que l'agent venait juste de décrocher.
  const hasConnectedRef = useRef(false);

  if (!slot.token || !slot.wsUrl) return null;

  return (
    <LiveKitRoom
      token={slot.token}
      serverUrl={slot.wsUrl}
      connect={true}
      audio={false}
      video={false}
      onConnected={() => {
        hasConnectedRef.current = true;
      }}
      onError={(err) => {
        // eslint-disable-next-line no-console
        console.error("[CallSlot] LiveKit error", err);
        if (!hasConnectedRef.current) {
          toast.error(
            "Connexion audio impossible — vérifiez votre réseau ou rechargez la page.",
          );
        }
      }}
      onDisconnected={() => {
        // Connexion jamais établie → erreur de transport, pas un raccroche.
        // On laisse le slot vivre côté serveur ; la réconciliation ou un
        // nouveau décrochage s'en occupera.
        if (!hasConnectedRef.current) return;
        onDisconnected(slot.meetingId);
      }}
      // Ne sert qu'à maintenir la connexion en vie — pas d'UI
      className="sr-only"
    >
      <MicController isActive={isActive} />
      {isActive && <RoomAudioRenderer />}
    </LiveKitRoom>
  );
}

/**
 * Synchronise l'état du microphone local selon `isActive`.
 * - isActive=true  → mic on (l'agent parle et entend)
 * - isActive=false → mic off (slot en hold, silencieux des deux côtés)
 */
function MicController({ isActive }: { isActive: boolean }) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    if (!room || !localParticipant) return;
    let cancelled = false;
    // Appel idempotent : LiveKit ignore les no-ops
    localParticipant
      .setMicrophoneEnabled(isActive)
      .catch((err) => {
        if (!cancelled) {
          // eslint-disable-next-line no-console
          console.warn("[CallSlot] setMicrophoneEnabled failed:", err);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isActive, room, localParticipant]);

  return null;
}

/**
 * Pool — monte un CallRoomMount par slot ayant un token.
 * À monter une seule fois dans CallCenterShell.
 */
export function CallRoomPool({
  slots,
  activeSlotId,
  onDisconnected,
}: {
  slots: ReadonlyArray<CallSlot>;
  activeSlotId: Id<"meetings"> | null;
  onDisconnected: (meetingId: Id<"meetings">) => void;
}) {
  return (
    <div className="pointer-events-none absolute h-0 w-0 overflow-hidden">
      {slots.map((slot) => {
        if (!slot.token || !slot.wsUrl) return null;
        return (
          <CallRoomMount
            key={slot.meetingId as string}
            slot={slot}
            isActive={activeSlotId === slot.meetingId}
            onDisconnected={onDisconnected}
          />
        );
      })}
    </div>
  );
}
