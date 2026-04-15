/**
 * GlobalActiveCallsBar — wrapper sticky pour `<ActiveCallsBar>` affiché depuis
 * le `callQueueSlot` du `WindowShell` iAsted, visible quand l'agent n'est PAS
 * déjà sur l'onglet iAppel (pour éviter le doublon avec `CallCenterShell`).
 *
 * Phase α du plan Intelligence iAsted × Sprint 6.
 * Aucune modification de `apps/agent-web/src/components/call-center/` : ce
 * composant consomme `useCallCenter()` et rend `<ActiveCallsBar>` avec les
 * mêmes handlers que `CallCenterShell`.
 */

"use client";

import type { Id } from "@convex/_generated/dataModel";
import { useCallCenter } from "@/hooks/use-call-center";
import {
	ActiveCallsBar,
	type ActiveCallSlot,
} from "@/components/call-center/ActiveCallsBar";

export function GlobalActiveCallsBar() {
	const { activeCalls, activeSlotId, hangup, hold, resume, setActiveSlot } =
		useCallCenter();

	// Rien à afficher si aucun slot actif (pas de clutter vertical).
	if (!activeCalls || activeCalls.length === 0) return null;

	return (
		<ActiveCallsBar
			calls={activeCalls as ActiveCallSlot[]}
			activeSlotId={activeSlotId as Id<"meetings"> | null}
			onFocus={(id) => setActiveSlot(id)}
			onEnd={(id) => hangup(id)}
			onHold={hold ? (id) => hold(id) : undefined}
			onResume={resume ? (id) => resume(id) : undefined}
		/>
	);
}
