"use client";

import type { Id } from "@convex/_generated/dataModel";
import { LiveKitRoom } from "@livekit/components-react";
import { Loader2, Phone } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { DirectCallView } from "./DirectCallView";
import { Button } from "@workspace/ui/components/button";
import { LIVEKIT_CALL_ROOM_OPTIONS } from "@workspace/livekit/room-options";
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
import { api } from "@convex/_generated/api";
import { useConvexMutationQuery } from "@workspace/api/hooks";
import { useMeeting } from "../../hooks/use-meeting";
import { useIsMobile } from "../../hooks/use-mobile";
import { useRingtone } from "../../hooks/use-ringtone";
import { captureEvent } from "../../lib/analytics";
import { useCallStore } from "../../stores/call-store";

// ============================================
// Types
// ============================================

interface CallButtonProps {
	orgId: Id<"orgs">;
	/** UserId of the person to call */
	participantUserId: Id<"users">;
	/** Optional: link the call to a request */
	requestId?: Id<"requests">;
	/** Optional: link the call to an appointment */
	appointmentId?: Id<"appointments">;
	/** Display label — defaults to "Appeler" */
	label?: string;
	/** Button variant */
	variant?: "default" | "outline" | "ghost" | "secondary";
	size?: "default" | "sm" | "lg" | "icon";
	className?: string;
}

// ============================================
// CallButton
// ============================================

/**
 * CallButton — Creates a LiveKit call and shows it in an overlay dialog.
 * Used by agents to initiate a call (from request detail, appointment, or team page).
 * The call is linked to a requestId/appointmentId when available.
 */
export function CallButton({
	orgId,
	participantUserId,
	requestId,
	appointmentId,
	label,
	variant = "outline",
	size = "sm",
	className,
}: CallButtonProps) {
	const { t } = useTranslation();
	const isMobile = useIsMobile();
	const displayLabel = label ?? t("meetings.call");

	const [dialogOpen, setDialogOpen] = useState(false);
	const [meetingId, setMeetingId] = useState<Id<"meetings"> | null>(null);
	const [callStartTime, setCallStartTime] = useState<number | null>(null);
	const { setGlobalMeetingId } = useCallStore();
	// Ne déclenche handleHangUp sur `onDisconnected` de LiveKit QUE si la room
	// s'est d'abord établie. Sans ce garde-fou, le double mount StrictMode,
	// un petit glitch ICE au moment du handshake, ou un token refresh ferment
	// prématurément l'appel du côté appelant et laissent le récepteur seul
	// dans la room avec le message "en attente de connexion".
	const hasConnectedRef = useRef(false);
	const userHangUpRef = useRef(false);

	const {
		meeting,
		token,
		wsUrl,
		isConnecting,
		connect,
		disconnect,
	} = useMeeting(meetingId ?? undefined);

	// Mutation `callUser` — crée une meeting avec callStatus="initiating",
	// indispensable pour que la transition vers "ringing" puisse fonctionner
	// et que le destinataire reçoive la sonnerie via GlobalCallAlert.
	const { mutateAsync: callUser, isPending: isCallingUser } =
		useConvexMutationQuery(api.functions.meetings.callUser);

	// Mutation `setCallRinging` — fait passer callStatus de "initiating" à
	// "ringing" pour que listMine fasse ringer le destinataire.
	const { mutateAsync: setCallRinging } = useConvexMutationQuery(
		api.functions.meetings.setCallRinging,
	);

	// Auto-close when the other side hangs up
	useEffect(() => {
		if (meeting?.status === "ended" && meetingId) {
			setDialogOpen(false);
			setMeetingId(null);
			setCallStartTime(null);
			setGlobalMeetingId(null);
		}
	}, [meeting?.status, meetingId, setGlobalMeetingId]);

	// Play ringtone while connecting — on coupe dès que la réunion est terminée
	// (raccrochage distant) pour éviter que la sonnerie ne se prolonge pendant
	// la fenêtre de transition d'état.
	useRingtone(isConnecting && meeting?.status !== "ended");

	const handleCall = useCallback(async () => {
		try {
			hasConnectedRef.current = false;
			userHangUpRef.current = false;
			// Crée la meeting via `callUser` (callStatus: "initiating")
			// au lieu de `meetings.create` qui ne pose pas de callStatus
			// — sans callStatus, le destinataire ne sonne pas.
			//
			// NB : `callUser` ne supporte pas requestId/appointmentId. Si on
			// veut lier l'appel à un dossier, on peut soit étendre `callUser`
			// soit faire un patch séparé après création — laissé en TODO si
			// besoin réel (le contexte du dossier reste accessible via le panneau
			// CitizenContextPanel pendant l'appel).
			void requestId;
			void appointmentId;
			const result = await callUser({
				orgId,
				targetUserId: participantUserId,
				mediaType: "video",
			});
			setMeetingId(result.meetingId);
			setGlobalMeetingId(result.meetingId);
			setDialogOpen(true);
			setCallStartTime(Date.now());
			captureEvent("admin_livekit_call_started");
			// Connect to LiveKit
			await connect(result.meetingId);
			// Transition initiating → ringing : sans cette étape, listMine côté
			// destinataire ne déclenche pas la sonnerie.
			await setCallRinging({ meetingId: result.meetingId });
		} catch (err) {
			console.error("Failed to start call:", err);
		}
	}, [
		orgId,
		participantUserId,
		requestId,
		appointmentId,
		callUser,
		setCallRinging,
		connect,
		setGlobalMeetingId,
	]);

	const handleHangUp = useCallback(async () => {
		userHangUpRef.current = true;
		if (meetingId) {
			await disconnect(meetingId);
			const duration = callStartTime
				? Math.round((Date.now() - callStartTime) / 1000)
				: undefined;
			captureEvent(
				"admin_livekit_call_ended",
				duration !== undefined ? { duration_seconds: duration } : {},
			);
		}
		setDialogOpen(false);
		setMeetingId(null);
		setCallStartTime(null);
		setGlobalMeetingId(null);
		hasConnectedRef.current = false;
	}, [meetingId, disconnect, callStartTime, setGlobalMeetingId]);

	const handleLiveKitDisconnected = useCallback(() => {
		// Disconnect transitoire (StrictMode, ICE restart, token refresh) avant
		// tout onConnected → ignorer. Le raccrochage distant est géré par le
		// useEffect sur meeting?.status === "ended".
		if (!hasConnectedRef.current) return;
		// Sinon on assimile à un raccrochage : session avait bien démarré
		// puis s'est terminée (côté serveur ou réseau permanent).
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
					onConnected={() => {
						hasConnectedRef.current = true;
					}}
					onDisconnected={handleLiveKitDisconnected}
					className="flex-1 min-h-0 flex flex-col"
					style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}
				>
					<DirectCallView onHangUp={handleHangUp} title={displayLabel} />
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

	return (
		<>
			<Button
				variant={variant}
				size={size}
				onClick={handleCall}
				disabled={isConnecting || isCallingUser}
				className={className}
			>
				{isConnecting || isCallingUser ? (
					<Loader2 className="w-4 h-4 animate-spin mr-1.5" />
				) : (
					<Phone className="w-4 h-4 mr-1.5" />
				)}
				{displayLabel}
			</Button>

			{isMobile ? (
				<Sheet open={dialogOpen} onOpenChange={(o) => !o && handleHangUp()}>
					<SheetContent
						side="bottom"
						className="p-0 h-[100dvh] w-full bg-zinc-950 border-none rounded-none focus:outline-none flex flex-col pt-10"
					>
						<SheetTitle className="sr-only">
							{displayLabel || t("meetings.callInProgress", "Appel en cours")}
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
			) : (
				<Dialog
					open={dialogOpen}
					onOpenChange={(open) => {
						if (!open) handleHangUp();
					}}
				>
					<DialogContent
						autoFocus={false}
						className="max-w-5xl sm:max-w-5xl w-full h-[80vh] p-0 flex flex-col overflow-hidden bg-zinc-950 border-zinc-800"
					>
						<DialogTitle className="sr-only">
							{displayLabel || t("meetings.callInProgress", "Appel en cours")}
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
			)}
		</>
	);
}
