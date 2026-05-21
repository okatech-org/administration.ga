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

/**
 * Hook to share the active meeting ID across disparate call triggers
 * (like CallButton, CallsPage, GlobalCallAlert) to prevent multi-ringing
 * and overlapping call logic.
 */
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
