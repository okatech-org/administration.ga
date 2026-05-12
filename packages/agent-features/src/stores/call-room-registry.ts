/**
 * call-room-registry — registre des instances `Room` LiveKit en cours.
 *
 * Pourquoi : le pool `CallRoomPool` est monté GLOBALEMENT dans `AppShell`
 * pour que l'audio survive aux changements de route (le user quitte /icom
 * tout en gardant l'appel). Mais l'UI visible (`ActiveConversationView`
 * dans `CallCenterShell` quand l'agent est sur /icom) a besoin du contexte
 * LiveKit (hooks `useTracks`, `useLocalParticipant`, `VideoTrack`).
 *
 * Ce registre permet à un consumer dans un sous-arbre différent de l'UI
 * pool de réutiliser la même `Room` via `<RoomContext.Provider>`.
 *
 * API minimaliste — pas de Zustand pour ne pas alourdir la dépendance ;
 * Map + useSyncExternalStore suffisent.
 */

import type { Room } from "livekit-client";
import { useSyncExternalStore } from "react";
import type { Id } from "@convex/_generated/dataModel";

const rooms = new Map<string, Room>();
const listeners = new Set<() => void>();

function emit() {
	for (const l of listeners) l();
}

export const callRoomRegistry = {
	register(meetingId: Id<"meetings">, room: Room) {
		const prev = rooms.get(meetingId as string);
		if (prev === room) return;
		rooms.set(meetingId as string, room);
		emit();
	},

	unregister(meetingId: Id<"meetings">, room?: Room) {
		// Si un room est passé, on ne supprime que si c'est lui — évite qu'un
		// unmount tardif n'écrase un nouveau register pour le même meeting.
		const current = rooms.get(meetingId as string);
		if (room && current !== room) return;
		rooms.delete(meetingId as string);
		emit();
	},

	get(meetingId: Id<"meetings"> | null | undefined): Room | null {
		if (!meetingId) return null;
		return rooms.get(meetingId as string) ?? null;
	},
};

/**
 * Hook React : retourne la `Room` LiveKit associée à un meetingId, ou null
 * si pas encore connectée. Re-render automatique sur register/unregister.
 */
export function useCallRoom(meetingId: Id<"meetings"> | null | undefined): Room | null {
	return useSyncExternalStore(
		(listener) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		() => (meetingId ? rooms.get(meetingId as string) ?? null : null),
		() => null,
	);
}
