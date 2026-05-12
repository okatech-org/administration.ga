"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { ConnectionState } from "livekit-client";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { Id } from "@convex/_generated/dataModel";
import { callRoomRegistry } from "../../stores/call-room-registry";
import { useCallStore, type CallSlot } from "../../stores/call-store";

/**
 * Composant interne — capture la `Room` LiveKit créée par `<LiveKitRoom>` et
 * la publie dans `callRoomRegistry` pour qu'un consumer hors du sous-arbre
 * pool (ex. `ActiveConversationView` dans /icom) puisse la réutiliser via
 * `<RoomContext.Provider>`.
 */
function RoomRegistrar({ meetingId }: { meetingId: Id<"meetings"> }) {
  const room = useRoomContext();
  useEffect(() => {
    if (!room) return;
    callRoomRegistry.register(meetingId, room);
    return () => {
      callRoomRegistry.unregister(meetingId, room);
    };
  }, [meetingId, room]);
  return null;
}

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
        if (!hasConnectedRef.current) return;
        onDisconnected(slot.meetingId);
      }}
      // Toujours invisible — la `Room` est exposée via `callRoomRegistry`
      // pour que la vue iCom (ou autre consumer) la consomme via
      // `<RoomContext.Provider>` dans son propre sous-arbre.
      className="sr-only"
    >
      <RoomRegistrar meetingId={slot.meetingId} />
      <MicController isActive={isActive} />
      {isActive && <RoomAudioRenderer />}
    </LiveKitRoom>
  );
}

/**
 * Synchronise mic + caméra selon `isActive` et l'état du store.
 * - isActive=false → mic OFF + caméra OFF (slot parqué, silencieux des deux côtés)
 * - isActive=true  → mic suit `!micMuted`, caméra suit `cameraEnabled`
 */
function MicController({ isActive }: { isActive: boolean }) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const connectionState = useConnectionState();
  const { micMuted, cameraEnabled } = useCallStore();
  const micShouldBeOn = isActive && !micMuted;
  const cameraShouldBeOn = isActive && cameraEnabled;
  const isConnected = connectionState === ConnectionState.Connected;

  useEffect(() => {
    if (!room || !localParticipant || !isConnected) return;
    let cancelled = false;
    localParticipant
      .setMicrophoneEnabled(micShouldBeOn)
      .catch((err) => {
        if (!cancelled) {
          // eslint-disable-next-line no-console
          console.warn("[CallSlot] setMicrophoneEnabled failed:", err);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [micShouldBeOn, room, localParticipant, isConnected]);

  useEffect(() => {
    if (!room || !localParticipant || !isConnected) return;
    let cancelled = false;
    localParticipant
      .setCameraEnabled(cameraShouldBeOn)
      .catch((err) => {
        if (!cancelled) {
          // eslint-disable-next-line no-console
          console.warn("[CallSlot] setCameraEnabled failed:", err);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [cameraShouldBeOn, room, localParticipant, isConnected]);

  return null;
}

/**
 * Pool — monte un CallRoomMount par slot ayant un token.
 *
 * MONTÉ AU NIVEAU GLOBAL (`AppShell`) pour que l'audio survive aux
 * changements de route : un agent qui quitte /icom pendant un appel doit
 * continuer à entendre son interlocuteur jusqu'à ce qu'il raccroche.
 *
 * Le pool est invisible (`sr-only`). Les `Room` LiveKit sont publiées dans
 * `callRoomRegistry` et consommées par les vues UI dans /icom via
 * `<RoomContext.Provider>` (voir CallCenterShell).
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
    <div className="pointer-events-none fixed h-0 w-0 overflow-hidden">
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
