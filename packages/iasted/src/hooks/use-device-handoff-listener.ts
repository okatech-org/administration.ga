/**
 * useDeviceHandoffListener — Subscribe à la presence multi-device et détecte
 * quand le device courant reçoit un handoff (Sprint 10 — A4 wiring).
 *
 * Le hook accepte 2 callbacks que le host iAsted câble côté app :
 *   - `onHandoffReceived(sourceLabel)` : démarrer auto la session vocale,
 *     puis appeler `completeHandoff(thisDeviceId)` côté backend.
 *   - `onSourceLabel(label)` : pour afficher un toast « Session transférée
 *     depuis [LABEL] ».
 *
 * Le hook ne fait PAS le subscribe Convex lui-même (pour éviter d'importer
 * `convex/react` dans le package iasted — chaque app a son propre client
 * Convex). À la place, il accepte les devices courants en props (que le
 * host iAsted obtient via `useQuery((api as any).ai.iastedDevicePresence.listMyDevices)`).
 *
 * Pattern d'usage côté host :
 *   const devices = useQuery(api.ai.iastedDevicePresence.listMyDevices);
 *   useDeviceHandoffListener({
 *     devices,
 *     thisDeviceId: deviceIdRef.current,
 *     onHandoffReceived: async (sourceLabel) => {
 *       toast.info(`Session transférée depuis ${sourceLabel}`);
 *       await activateVoice();
 *       await completeHandoff({ thisDeviceId: deviceIdRef.current });
 *     },
 *   });
 */

"use client";

import { useEffect, useRef } from "react";

interface DeviceListEntry {
	deviceId: string;
	label: string;
	state: "idle" | "active" | "handoff_pending" | "handoff_received";
	peerDeviceId?: string;
}

interface UseDeviceHandoffListenerOptions {
	devices: DeviceListEntry[] | null | undefined;
	thisDeviceId: string;
	onHandoffReceived: (sourceLabel: string, sourceDeviceId: string) => void | Promise<void>;
}

export function useDeviceHandoffListener({
	devices,
	thisDeviceId,
	onHandoffReceived,
}: UseDeviceHandoffListenerOptions): void {
	// Track le state précédent du device courant pour ne déclencher onHandoffReceived
	// qu'à la TRANSITION (idle → handoff_received), pas à chaque render.
	const lastStateRef = useRef<string | null>(null);
	useEffect(() => {
		if (!devices || !thisDeviceId) return;
		const me = devices.find((d) => d.deviceId === thisDeviceId);
		if (!me) return;
		const prevState = lastStateRef.current;
		lastStateRef.current = me.state;
		// Trigger uniquement à la transition vers handoff_received.
		if (prevState !== "handoff_received" && me.state === "handoff_received") {
			const source = devices.find(
				(d) => d.deviceId === me.peerDeviceId,
			);
			const sourceLabel = source?.label ?? "un autre device";
			const sourceId = me.peerDeviceId ?? "";
			void onHandoffReceived(sourceLabel, sourceId);
		}
	}, [devices, thisDeviceId, onHandoffReceived]);
}
