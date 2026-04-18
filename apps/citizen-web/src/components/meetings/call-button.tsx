"use client";

import type { Id } from "@convex/_generated/dataModel";
import { LiveKitRoom } from "@livekit/components-react";
import { LIVEKIT_CALL_ROOM_OPTIONS } from "@workspace/livekit/room-options";
import { useLiveKitDisconnectGuard } from "@workspace/livekit/use-livekit-disconnect-guard";
import { Loader2, Phone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CustomCallUI } from "@/components/meetings/custom-call-ui";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetTitle,
} from "@/components/ui/sheet";
import { useMeeting } from "@/hooks/use-meeting";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRingtone } from "@/hooks/use-ringtone";
import { captureEvent } from "@/lib/analytics";
import { useCallStore } from "@/stores/call-store";

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

	const {
		meeting,
		token,
		wsUrl,
		isConnecting,
		connect,
		disconnect,
		createMeeting,
	} = useMeeting(meetingId ?? undefined);

	// Auto-close when the other side hangs up
	useEffect(() => {
		if (meeting?.status === "ended" && meetingId) {
			setDialogOpen(false);
			setMeetingId(null);
			setCallStartTime(null);
			setGlobalMeetingId(null);
		}
	}, [meeting?.status, meetingId, setGlobalMeetingId]);

	// Play ringtone while connecting
	useRingtone(isConnecting);

	const cleanupCallState = useCallback(() => {
		setDialogOpen(false);
		setMeetingId(null);
		setCallStartTime(null);
		setGlobalMeetingId(null);
	}, [setGlobalMeetingId]);

	const {
		onConnected: onLiveKitConnected,
		onDisconnected: onLiveKitDisconnected,
		markUserHangUp,
		reset: resetDisconnectGuard,
	} = useLiveKitDisconnectGuard(cleanupCallState);

	const handleCall = useCallback(async () => {
		try {
			resetDisconnectGuard();
			// Create meeting linked to context.
			// mediaType "video" autorise audio+vidéo côté token pour permettre
			// le toggle caméra dans CustomCallUI sans "insufficient permissions".
			const result = await createMeeting.mutateAsync({
				title: `Appel ${new Date().toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}`,
				type: "call",
				orgId,
				participantIds: [participantUserId],
				requestId,
				appointmentId,
				mediaType: "video",
			});
			setMeetingId(result.meetingId);
			setGlobalMeetingId(result.meetingId);
			setDialogOpen(true);
			setCallStartTime(Date.now());
			captureEvent("admin_livekit_call_started");
			// Connect to LiveKit
			await connect(result.meetingId);
		} catch (err) {
			console.error("Failed to start call:", err);
		}
	}, [
		orgId,
		participantUserId,
		requestId,
		appointmentId,
		createMeeting,
		connect,
		setGlobalMeetingId,
		resetDisconnectGuard,
	]);

	const handleHangUp = useCallback(async () => {
		markUserHangUp();
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
		cleanupCallState();
	}, [meetingId, disconnect, callStartTime, markUserHangUp, cleanupCallState]);

	const callContent = (
		<div className="flex flex-col flex-1 min-h-0 h-full bg-zinc-950 overflow-hidden">
			{token && wsUrl ? (
				<LiveKitRoom
					token={token}
					serverUrl={wsUrl}
					connect={true}
					audio={true}
					options={LIVEKIT_CALL_ROOM_OPTIONS}
					onConnected={onLiveKitConnected}
					onDisconnected={onLiveKitDisconnected}
					className="flex-1 min-h-0 flex flex-col"
					style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}
				>
					<CustomCallUI onHangUp={handleHangUp} title={displayLabel} />
				</LiveKitRoom>
			) : (
				<div className="h-full flex items-center justify-center">
					<div className="text-center space-y-3">
						<Loader2 className="w-8 h-8 animate-spin text-zinc-500 mx-auto" />
						<p className="text-zinc-400 text-sm">
							{t("meetings.connecting")}
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
				disabled={isConnecting || createMeeting.isPending}
				className={className}
			>
				{isConnecting || createMeeting.isPending ? (
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
