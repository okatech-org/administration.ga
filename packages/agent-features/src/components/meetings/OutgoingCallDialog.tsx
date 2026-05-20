"use client";

/**
 * OutgoingCallDialog — Dialog/Sheet partagé pour les appels SORTANTS.
 *
 * Bug 9 (Ronde 2) — extrait de `call-button.tsx` pour permettre la
 * réutilisation par 2 points d'entrée distincts :
 *   1. Manuel : <CallButton> lance `meetings.callUser` puis ouvre la fenêtre
 *      via `callStore.openOutgoingCall(...)`.
 *   2. Vocal : `useIAstedHost` reçoit `uiAction: open_active_call` du tool
 *      vocal `launch_call_with_contact` et appelle la même méthode.
 * Dans les deux cas, c'est `<GlobalOutgoingCallWindow>` (monté dans l'AppShell)
 * qui rend ce composant en lisant le slice `outgoingCallWindow` du store.
 *
 * Responsabilités locales :
 *   - Connexion LiveKit (via `useMeeting`),
 *   - Transition `callStatus: initiating → ringing` (via `setCallRinging`,
 *     idempotent — voir [meetings.ts:1265-1285]),
 *   - Détection raccrochage distant (auto-close on `meeting.status === "ended"`),
 *   - Ringtone côté appelant,
 *   - Rendu Dialog (desktop) ou Sheet plein écran (mobile),
 *   - Callback `onClose` à la fermeture (volontaire ou distante).
 */

import type { Id } from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";
import { LiveKitRoom } from "@livekit/components-react";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { LIVEKIT_CALL_ROOM_OPTIONS } from "@workspace/livekit/room-options";
import { useConvexMutationQuery } from "@workspace/api/hooks";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@workspace/ui/components/dialog";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetTitle,
} from "@workspace/ui/components/sheet";
import { DirectCallView } from "./DirectCallView";
import { useMeeting } from "../../hooks/use-meeting";
import { useIsMobile } from "../../hooks/use-mobile";
import { useRingtone } from "../../hooks/use-ringtone";
import { captureEvent } from "../../lib/analytics";

interface OutgoingCallDialogProps {
	meetingId: Id<"meetings">;
	/** Titre affiché dans la barre de l'appel. Défaut : t("meetings.call"). */
	title?: string;
	/** Appelé à la fermeture (raccrochage volontaire OU coupure distante). */
	onClose: () => void;
}

export function OutgoingCallDialog({
	meetingId,
	title,
	onClose,
}: OutgoingCallDialogProps) {
	const { t } = useTranslation();
	const isMobile = useIsMobile();
	const displayTitle = title ?? t("meetings.call");

	const { meeting, token, wsUrl, isConnecting, connect, disconnect } =
		useMeeting(meetingId);

	const { mutateAsync: setCallRinging } = useConvexMutationQuery(
		api.functions.meetings.setCallRinging,
	);

	// `hasConnectedRef` : évite de traiter un `onDisconnected` LiveKit
	// transitoire (StrictMode, ICE restart, token refresh) comme un raccrochage.
	const hasConnectedRef = useRef(false);
	const userHangUpRef = useRef(false);
	// Évite de re-déclencher `setCallRinging` sur reconnexion (idempotent côté
	// serveur mais coûte un round-trip).
	const ringingTriggeredRef = useRef(false);
	// Marque le ts du décrochage pour télémétrie de durée.
	const callStartedAtRef = useRef<number | null>(null);

	// Connexion auto au mount. ATTENTION : on N'APPELLE PLUS `disconnect`
	// au unmount du composant (bug iAsted vocal + StrictMode) — la mutation
	// `meetings.leave` mark immédiatement le call comme `ended` (cf.
	// `meetings.ts:629` : `isCall && status === "active"` → status=ended).
	// En React StrictMode (dev) ou en cas de re-render rapide, le double
	// mount/unmount déclenchait : mount→join, unmount→leave (kills the call),
	// re-mount→join → "Cette réunion est terminée".
	// Le `disconnect` réel reste appelé EXPLICITEMENT par `handleHangUp`
	// (clic raccroche) et par `handleLiveKitDisconnected` (raccroche distant).
	// Au unmount, on laisse juste LiveKit gérer la fermeture WebRTC via
	// son propre cleanup interne du <LiveKitRoom>.
	useEffect(() => {
		callStartedAtRef.current = Date.now();
		captureEvent("admin_livekit_call_started");
		void connect(meetingId);
		// Pas de cleanup `disconnect` — la mutation `leave` mark le call ended.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [meetingId]);

	// Raccrochage distant → fermer l'UI locale.
	useEffect(() => {
		if (meeting?.status === "ended") {
			onClose();
		}
	}, [meeting?.status, onClose]);

	// Sonnerie côté appelant tant que ce n'est pas connecté ET pas terminé.
	useRingtone(isConnecting && meeting?.status !== "ended");

	const handleHangUp = useCallback(async () => {
		userHangUpRef.current = true;
		await disconnect(meetingId);
		const duration = callStartedAtRef.current
			? Math.round((Date.now() - callStartedAtRef.current) / 1000)
			: undefined;
		captureEvent(
			"admin_livekit_call_ended",
			duration !== undefined ? { duration_seconds: duration } : {},
		);
		hasConnectedRef.current = false;
		onClose();
	}, [meetingId, disconnect, onClose]);

	const handleLiveKitConnected = useCallback(() => {
		hasConnectedRef.current = true;
		// Transition callStatus: initiating → ringing pour que le destinataire
		// reçoive effectivement la sonnerie. Idempotent côté serveur.
		if (!ringingTriggeredRef.current) {
			ringingTriggeredRef.current = true;
			void setCallRinging({ meetingId }).catch((err) => {
				console.warn("[OutgoingCallDialog] setCallRinging failed:", err);
			});
		}
	}, [meetingId, setCallRinging]);

	const handleLiveKitDisconnected = useCallback(() => {
		// Disconnect transitoire avant la première connexion réussie → ignorer.
		if (!hasConnectedRef.current) return;
		void handleHangUp();
	}, [handleHangUp]);

	const callContent = (
		<div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
			{token && wsUrl ? (
				<LiveKitRoom
					token={token}
					serverUrl={wsUrl}
					connect={true}
					audio={true}
					options={LIVEKIT_CALL_ROOM_OPTIONS}
					onConnected={handleLiveKitConnected}
					onDisconnected={handleLiveKitDisconnected}
					className="flex-1 min-h-0 flex flex-col"
					style={{
						height: "100%",
						width: "100%",
						display: "flex",
						flexDirection: "column",
						minHeight: 0,
					}}
				>
					<DirectCallView onHangUp={handleHangUp} title={displayTitle} />
				</LiveKitRoom>
			) : (
				<div className="h-full flex items-center justify-center call-hero-dark">
					<div className="text-center space-y-3">
						<Loader2 className="w-8 h-8 animate-spin text-white/40 mx-auto" />
						<p className="text-white/60 text-sm">
							{t("meetings.connecting", "Connexion au serveur d'appel...")}
						</p>
					</div>
				</div>
			)}
		</div>
	);

	if (isMobile) {
		return (
			<Sheet open onOpenChange={(o) => !o && void handleHangUp()}>
				<SheetContent
					side="bottom"
					className="p-0 h-[100dvh] w-full bg-zinc-950 border-none rounded-none focus:outline-none flex flex-col pt-10"
				>
					<SheetTitle className="sr-only">
						{displayTitle || t("meetings.callInProgress", "Appel en cours")}
					</SheetTitle>
					<SheetDescription className="sr-only">
						{t(
							"meetings.callDialogDescription",
							"Interface d'appel active. Utilisez les commandes pour poursuivre la conversation ou raccrocher.",
						)}
					</SheetDescription>
					{callContent}
				</SheetContent>
			</Sheet>
		);
	}

	return (
		<Dialog open onOpenChange={(open) => !open && void handleHangUp()}>
			<DialogContent
				autoFocus={false}
				className="sm:max-w-[420px] w-full h-[680px] max-h-[90vh] p-0 flex flex-col overflow-hidden bg-zinc-950 border-zinc-800"
			>
				<DialogTitle className="sr-only">
					{displayTitle || t("meetings.callInProgress", "Appel en cours")}
				</DialogTitle>
				<DialogDescription className="sr-only">
					{t(
						"meetings.callDialogDescription",
						"Interface d'appel active. Utilisez les commandes pour poursuivre la conversation ou raccrocher.",
					)}
				</DialogDescription>
				{callContent}
			</DialogContent>
		</Dialog>
	);
}
