"use client";

/**
 * FilteredAudioRenderer — Sprint 6
 *
 * Wrapper de RoomAudioRenderer qui peut exclure sélectivement certains
 * participants par leur identity. Utilisé :
 *  - Côté citoyen : exclure `supervisor_*_whisper` et `supervisor_*_listen`
 *    pour que le citoyen n'entende PAS le superviseur.
 *  - Côté agent : inclure tout (défaut).
 *
 * Approche : mute l'audio element d'un track remote si le predicate retourne
 * true. LiveKit auto-mount les <audio> via RoomAudioRenderer, on les patch
 * via useRemoteParticipants + useTracks.
 *
 * Note : complément au `hidden: true` serveur utilisé pour le mode listen.
 * Pour whisper, on NE PEUT PAS utiliser `hidden` car on veut que l'agent
 * reçoive le track. Ce filter côté citoyen est la défense restante.
 */

import {
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useEffect, useMemo } from "react";

export function FilteredAudioRenderer({
  excludeIdentityPattern,
}: {
  /** Pattern à exclure : si l'identity matche ce regex, le track est muté. */
  excludeIdentityPattern?: RegExp;
}) {
  const tracks = useTracks([Track.Source.Microphone], {
    onlySubscribed: true,
  });

  const mutedIdentities = useMemo(() => {
    if (!excludeIdentityPattern) return new Set<string>();
    const set = new Set<string>();
    for (const ref of tracks) {
      const id = ref.participant.identity;
      if (excludeIdentityPattern.test(id)) set.add(id);
    }
    return set;
  }, [tracks, excludeIdentityPattern]);

  useEffect(() => {
    if (mutedIdentities.size === 0) return;
    // Parcourt les tracks filtrés et mute leur audio element
    for (const ref of tracks) {
      if (!mutedIdentities.has(ref.participant.identity)) continue;
      const pub = ref.publication;
      if (!pub?.track) continue;
      const mediaElements = (pub.track as any).attachedElements as
        | HTMLMediaElement[]
        | undefined;
      if (mediaElements) {
        for (const el of mediaElements) {
          el.muted = true;
          el.volume = 0;
        }
      }
    }
  }, [tracks, mutedIdentities]);

  return <RoomAudioRenderer />;
}

/** Pattern standard pour filtrer côté citoyen : supervisor_*_whisper|listen */
export const CITIZEN_SUPERVISOR_FILTER = /^supervisor_.+_(whisper|listen)$/;
