/**
 * call-store — État global d'appel partagé entre les composants.
 *
 * Copie directe de agent-web.
 */

import type { Id } from "@convex/_generated/dataModel";
import { useSyncExternalStore } from "react";

let globalActiveMeetingId: Id<"meetings"> | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function getSnapshot() {
	return globalActiveMeetingId;
}

export const callStore = {
	setGlobalMeetingId: (id: Id<"meetings"> | null) => {
		if (globalActiveMeetingId !== id) {
			globalActiveMeetingId = id;
			listeners.forEach((l) => {
				l();
			});
		}
	},
	getGlobalMeetingId: () => globalActiveMeetingId,
};

export function useCallStore() {
	const currentMeetingId = useSyncExternalStore(
		subscribe,
		getSnapshot,
		getSnapshot,
	);
	return {
		globalActiveMeetingId: currentMeetingId,
		setGlobalMeetingId: callStore.setGlobalMeetingId,
	};
}
