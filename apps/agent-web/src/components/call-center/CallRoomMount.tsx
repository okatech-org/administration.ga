"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useEffect } from "react";
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
  if (!slot.token || !slot.wsUrl) return null;

  return (
    <LiveKitRoom
      token={slot.token}
      serverUrl={slot.wsUrl}
      connect={true}
      audio={false}
      video={false}
      onDisconnected={() => onDisconnected(slot.meetingId)}
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
