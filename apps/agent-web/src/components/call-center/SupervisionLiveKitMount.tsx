"use client";

/**
 * SupervisionLiveKitMount — Sprint 6
 *
 * LiveKitRoom invisible dédié au superviseur pour les modes listen/whisper/barge.
 * Gère le mic local selon le mode :
 *  - listen : mic forcé off (écoute seule)
 *  - whisper : mic on (le superviseur parle à l'agent)
 *  - barge : mic on (participant normal)
 *
 * Le token est obtenu via `requestSupervisionToken` et stocké localement.
 * `onEnd` est appelé quand la session se ferme (ex. superviseur clique End).
 */

import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useEffect } from "react";

export type SupervisionMode = "listen" | "whisper" | "barge";

export function SupervisionLiveKitMount({
  token,
  wsUrl,
  mode,
  onDisconnected,
}: {
  token: string;
  wsUrl: string;
  mode: SupervisionMode;
  onDisconnected: () => void;
}) {
  if (!token || !wsUrl) return null;

  return (
    <LiveKitRoom
      token={token}
      serverUrl={wsUrl}
      connect={true}
      audio={false}
      video={false}
      onDisconnected={onDisconnected}
      className="sr-only"
    >
      <SupervisionMicController mode={mode} />
      {/* Rendu audio : le superviseur entend tout. Citoyen/agent ne reçoivent
          le superviseur que si whisper (agent) ou barge (agent + citoyen). */}
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function SupervisionMicController({ mode }: { mode: SupervisionMode }) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    if (!room || !localParticipant) return;
    let cancelled = false;

    // listen : mic OFF ; whisper + barge : mic ON
    const shouldPublish = mode !== "listen";
    localParticipant.setMicrophoneEnabled(shouldPublish).catch((err) => {
      if (!cancelled) {
        console.warn("[SupervisionLiveKit] setMicrophoneEnabled failed:", err);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mode, room, localParticipant]);

  return null;
}
