"use client";

/**
 * GlobalOutgoingCallWindow — mount global du Dialog d'appel SORTANT.
 *
 * Bug 9 (Ronde 2) — unifie l'UI d'appel sortant pour les commandes manuelles
 * (`<CallButton>`) et vocales (`launch_call_with_contact`). Lit le slice
 * `outgoingCallWindow` du `useCallStore` et rend `<OutgoingCallDialog>` quand
 * un appel est en cours d'établissement ou actif.
 *
 * À monter UNE SEULE FOIS au niveau de l'AppShell (au-dessus de toutes les
 * pages), comme le sont `<GlobalCallAlert>` et `<FloatingMeetingWindow>`.
 *
 * Cycle de vie :
 *   1. Caller (manuel/vocal) appelle `callStore.openOutgoingCall(...)` après
 *      `meetings.callUser`.
 *   2. Ce composant détecte le changement de slice et monte le Dialog.
 *   3. `<OutgoingCallDialog>` gère la connexion LiveKit + `setCallRinging`.
 *   4. Sur hangup (volontaire) ou raccrochage distant, le Dialog appelle
 *      `onClose` → `callStore.closeOutgoingCall()` → unmount.
 */

import { useCallback } from "react";
import { OutgoingCallDialog } from "../components/meetings/OutgoingCallDialog";
import { useCallStore } from "../stores/call-store";

export function GlobalOutgoingCallWindow() {
	const { outgoingCallWindow, closeOutgoingCall } = useCallStore();

	const onClose = useCallback(() => {
		closeOutgoingCall();
	}, [closeOutgoingCall]);

	if (!outgoingCallWindow) return null;

	return (
		<OutgoingCallDialog
			meetingId={outgoingCallWindow.meetingId}
			onClose={onClose}
		/>
	);
}
