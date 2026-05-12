"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { LiveKitRoom } from "@livekit/components-react";
import { DirectCallView } from "@workspace/agent-features/components/meetings";
import { LIVEKIT_CALL_ROOM_OPTIONS } from "@workspace/livekit/room-options";
import { useLiveKitDisconnectGuard } from "@workspace/livekit/use-livekit-disconnect-guard";
import { useRingtone } from "@workspace/livekit/use-ringtone";
import { useQuery } from "convex/react";
import { Loader2, Phone, PhoneCall, PhoneOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { useMeeting } from "@/hooks/use-meeting";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { useCallStore } from "@/stores/call-store";

/**
 * GlobalCallAlert — écoute les appels entrants pour un utilisateur backoffice.
 * Affiche un toast flottant avec Décrocher / Refuser, puis un Dialog plein
 * écran avec DirectCallView une fois l'appel décroché.
 */
export function GlobalCallAlert() {
	const [activeMeetingId, setActiveMeetingId] = useState<Id<"meetings"> | null>(
		null,
	);
	const { globalActiveMeetingId, setGlobalMeetingId } = useCallStore();
	const dismissedMeetingIdRef = useRef<Id<"meetings"> | null>(null);

	const { data: meetingsData } = useAuthenticatedConvexQuery(
		api.functions.meetings.listMine,
		{},
	);
	const meetings = meetingsData?.meetings;

	const { data: me } = useAuthenticatedConvexQuery(
		api.functions.users.getMe,
		{},
	);

	const declineCallMutation = useConvexMutationQuery(
		api.functions.meetings.declineCall,
	);

	// biome-ignore lint/suspicious/noExplicitAny: meeting shape from Convex
	const incomingMeeting = meetings?.find((m: any) => {
		if (m.status !== "active") return false;
		if (m.callStatus && m.callStatus !== "ringing" && m.callStatus !== "initiating")
			return false;
		if (Date.now() - m._creationTime > 120_000) return false;
		if (m.type === "meeting") return false;
		if (me?._id && m.createdBy === me._id) return false;
		if (
			me?._id &&
			// biome-ignore lint/suspicious/noExplicitAny: participant shape
			m.participants.some((p: any) => {
				if (p.userId !== me._id) return false;
				if (p.joinedAt && !p.leftAt) return true;
				if (p.leftAt) return true;
				return false;
			})
		) {
			return false;
		}
		return true;
	});

	const activeCallToDisplay =
		incomingMeeting && incomingMeeting._id === dismissedMeetingIdRef.current
			? null
			: (incomingMeeting ?? null);

	const isCurrentlyInCall = activeMeetingId !== null;
	const isBusyGlobally = globalActiveMeetingId !== null;

	const { meeting: activeMeetingData, token, wsUrl, connect, disconnect } =
		useMeeting(activeMeetingId ?? undefined);

	useRingtone(
		!!activeCallToDisplay && !isCurrentlyInCall && !isBusyGlobally,
	);

	const callerUser = useQuery(
		api.functions.users.getById,
		activeCallToDisplay && !isCurrentlyInCall
			? { userId: activeCallToDisplay.createdBy }
			: "skip",
	);
	const callerName = callerUser
		? [callerUser.firstName, callerUser.lastName].filter(Boolean).join(" ")
		: null;

	const cleanupCallState = useCallback(() => {
		setActiveMeetingId(null);
		setGlobalMeetingId(null);
	}, [setGlobalMeetingId]);

	const {
		onConnected: onLiveKitConnected,
		onDisconnected: onLiveKitDisconnected,
		markUserHangUp,
		reset: resetDisconnectGuard,
	} = useLiveKitDisconnectGuard(cleanupCallState);

	const handleJoin = useCallback(async () => {
		if (!activeCallToDisplay) return;
		dismissedMeetingIdRef.current = null;
		resetDisconnectGuard();
		setActiveMeetingId(activeCallToDisplay._id);
		setGlobalMeetingId(activeCallToDisplay._id);
		await connect(activeCallToDisplay._id);
	}, [activeCallToDisplay, connect, setGlobalMeetingId, resetDisconnectGuard]);

	const handleDecline = useCallback(async () => {
		if (!activeCallToDisplay) return;
		dismissedMeetingIdRef.current = activeCallToDisplay._id;
		await declineCallMutation.mutateAsync({
			meetingId: activeCallToDisplay._id,
		});
	}, [activeCallToDisplay, declineCallMutation]);

	const handleHangUp = useCallback(async () => {
		markUserHangUp();
		if (activeMeetingId) {
			dismissedMeetingIdRef.current = activeMeetingId;
			await disconnect(activeMeetingId);
		}
		cleanupCallState();
	}, [activeMeetingId, disconnect, markUserHangUp, cleanupCallState]);

	useEffect(() => {
		if (activeMeetingData?.status === "ended" && activeMeetingId) {
			dismissedMeetingIdRef.current = activeMeetingId;
			cleanupCallState();
		}
	}, [activeMeetingData?.status, activeMeetingId, cleanupCallState]);

	if (!activeCallToDisplay && !isCurrentlyInCall) return null;

	return (
		<>
			{!isCurrentlyInCall && !isBusyGlobally && activeCallToDisplay && (
				<div className="fixed bottom-6 right-6 z-[100] w-[calc(100%-3rem)] max-w-md animate-in slide-in-from-bottom-4 fade-in sm:bottom-8 sm:right-8">
					<div className="grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-2xl border border-primary/30 bg-card px-3.5 py-3 shadow-xl">
						<div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
							<PhoneCall className="h-5 w-5" />
						</div>
						<div className="min-w-0">
							<p
								className="truncate text-sm font-semibold text-foreground"
								title={activeCallToDisplay.title ?? undefined}
							>
								{callerName ?? activeCallToDisplay.title ?? "Appel entrant"}
							</p>
							<p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
								Un utilisateur cherche à vous joindre
							</p>
						</div>
						<div className="flex items-center gap-1.5 pl-1">
							<Button
								size="icon"
								variant="ghost"
								onClick={handleDecline}
								aria-label="Refuser"
								title="Refuser"
								className="h-9 w-9 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
							>
								<PhoneOff className="h-4 w-4" />
							</Button>
							<Button
								size="icon"
								onClick={handleJoin}
								aria-label="Décrocher"
								title="Décrocher"
								className="h-9 w-9 rounded-full bg-success text-white hover:bg-success/90"
							>
								<Phone className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</div>
			)}

			{isCurrentlyInCall && (
				<Dialog
					open={isCurrentlyInCall}
					onOpenChange={(o) => !o && handleHangUp()}
				>
					<DialogContent
						autoFocus={false}
						onInteractOutside={(e) => e.preventDefault()}
						onEscapeKeyDown={(e) => e.preventDefault()}
						className="sm:max-w-[420px] w-full h-[680px] max-h-[90vh] p-0 flex flex-col overflow-hidden bg-zinc-950 border-zinc-800"
					>
						<DialogTitle className="sr-only">
							{callerName ?? activeCallToDisplay?.title ?? "Appel en cours"}
						</DialogTitle>
						<DialogDescription className="sr-only">
							Interface d'appel active. Utilisez les commandes pour
							poursuivre la conversation ou raccrocher.
						</DialogDescription>
						<div className="flex flex-col h-full overflow-hidden">
							{token && wsUrl ? (
								<LiveKitRoom
									token={token}
									serverUrl={wsUrl}
									connect={true}
									audio={true}
									video={false}
									options={LIVEKIT_CALL_ROOM_OPTIONS}
									onConnected={onLiveKitConnected}
									onDisconnected={onLiveKitDisconnected}
									className="flex-1 min-h-0 flex flex-col"
									style={{
										height: "100%",
										width: "100%",
										display: "flex",
										flexDirection: "column",
										minHeight: 0,
									}}
								>
									<DirectCallView
										onHangUp={handleHangUp}
										title={callerName ?? activeCallToDisplay?.title ?? undefined}
									/>
								</LiveKitRoom>
							) : (
								<div className="h-full flex items-center justify-center bg-zinc-950">
									<Loader2 className="w-8 h-8 animate-spin text-white/40" />
								</div>
							)}
						</div>
					</DialogContent>
				</Dialog>
			)}
		</>
	);
}
