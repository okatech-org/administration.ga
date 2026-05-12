"use client";

/**
 * GlobalCallRoomHost — wrapper minimaliste qui monte `CallRoomPool` au niveau
 * de l'AppShell. Lit les slots du `useCallStore` et délègue la gestion au
 * pool. Toujours invisible (sr-only) — l'UI visible vit dans /icom et
 * consomme la `Room` via `callRoomRegistry`.
 *
 * Le hangup côté serveur est délégué au hook `useCallCenter().hangup` pour
 * éviter de dupliquer la logique (mutation + cleanup store).
 */

import type { Id } from "@convex/_generated/dataModel";
import { CallRoomPool } from "../components/call-center/CallRoomMount";
import { useCallCenter } from "../hooks/use-call-center";
import { useCallStore } from "../stores/call-store";

export function GlobalCallRoomHost() {
	const { slots, activeSlotId } = useCallStore();
	const { hangup } = useCallCenter();

	const handleDisconnected = (meetingId: Id<"meetings">) => {
		void hangup(meetingId);
	};

	return (
		<CallRoomPool
			slots={slots}
			activeSlotId={activeSlotId}
			onDisconnected={handleDisconnected}
		/>
	);
}
