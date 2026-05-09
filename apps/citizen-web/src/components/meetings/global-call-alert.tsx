import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	LiveKitRoom,
} from "@livekit/components-react";
import { LIVEKIT_CALL_ROOM_OPTIONS } from "@workspace/livekit/room-options";
import { useLiveKitDisconnectGuard } from "@workspace/livekit/use-livekit-disconnect-guard";
import { CitizenAudioCallView } from "@/components/meetings/CitizenAudioCallView";
import { MeetingStageView } from "@/components/meetings/MeetingStageView";

import { useQuery } from "convex/react";
import { Loader2, Phone, PhoneCall, PhoneOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { useUserData } from "@/hooks/use-user-data";
import { useAuthenticatedConvexQuery, useConvexMutationQuery } from "@/integrations/convex/hooks";
import { useCallStore } from "@/stores/call-store";

/**
 * GlobalCallAlert - Listens for incoming calls across the entire app.
 * If there is an active call where the user is a participant but hasn't joined,
 * this shows a floating notification and rings.
 */
export function GlobalCallAlert() {
	const { t } = useTranslation();
	const isMobile = useIsMobile();
	const { userData: user } = useUserData();
	const [activeMeetingId, setActiveMeetingId] = useState<Id<"meetings"> | null>(
		null,
	);
	const { globalActiveMeetingId, setGlobalMeetingId } = useCallStore();
	// Mémorise le dernier meetingId traité pour éviter que la sonnerie ne
	// re-sonne pendant la fenêtre de latence où la query Convex n'a pas encore
	// propagé le changement de statut post-raccrochage.
	const dismissedMeetingIdRef = useRef<Id<"meetings"> | null>(null);

	// Get my personal meetings
	const { data: meetingsData } = useAuthenticatedConvexQuery(
		api.functions.meetings.listMine,
		{},
	);
	const meetings = meetingsData?.meetings;

	// Get inbound org calls (for agents)
	const { data: inboundOrgCalls } = useAuthenticatedConvexQuery(
		api.functions.meetings.listInboundOrgCalls,
		{},
	);

	// Find the first active personal meeting where I haven't joined yet
	const incomingPersonalMeeting = meetings?.find((m) => {
		if (m.status !== "active") return false;
		if (user && m.createdBy === user._id) return false;
		// Ignore stale calls (> 2 min old)
		if (Date.now() - m._creationTime > 120_000) return false;
		if (user) {
			const me = m.participants.find((p) => p.userId === user._id);
			// Déjà rejoint (en communication) → ce n'est plus un appel entrant.
			if (me?.joinedAt && !me?.leftAt) return false;
			if (me?.leftAt) return false;
		}
		return true;
	});

	// Prioritize inbound org calls, then personal meetings
	const incomingOrgCall =
		inboundOrgCalls?.find((m) => {
			if (user) {
				const me = m.participants.find((p) => p.userId === user._id);
				if (me?.joinedAt && !me?.leftAt) return false;
				if (me?.leftAt) return false;
			}
			return true;
		}) ?? null;

	const candidateCall = incomingOrgCall ?? incomingPersonalMeeting ?? null;
	// Bloque la ré-émission de sonnerie pendant la latence Convex post-hangup.
	const activeCallToDisplay =
		candidateCall && candidateCall._id === dismissedMeetingIdRef.current
			? null
			: candidateCall;
	const isOrgCall =
		activeCallToDisplay === incomingOrgCall && incomingOrgCall !== null;

	// We are locally in the call if activeMeetingId !== null
	const isCurrentlyInCall = activeMeetingId !== null;
	// We should suppress alerts if we are in ANY call globally
	const isBusyGlobally = globalActiveMeetingId !== null;

	const { meeting: activeMeetingData, token, wsUrl, connect, disconnect } = useMeeting(
		activeMeetingId ?? undefined,
	);

	// Ring tone plays if there is an active call, we haven't joined yet, AND we aren't in another call
	useRingtone(!!activeCallToDisplay && !isCurrentlyInCall && !isBusyGlobally);

	// Look up the caller's name for the notification
	const callerUser = useQuery(
		api.functions.users.getById,
		activeCallToDisplay && !isCurrentlyInCall
			? { userId: activeCallToDisplay.createdBy }
			: "skip",
	);
	const callerName = callerUser
		? [callerUser.firstName, callerUser.lastName].filter(Boolean).join(" ")
		: null;

	// Decline mutation
	const declineCallMutation = useConvexMutationQuery(
		api.functions.meetings.declineCall,
	);

	const handleDecline = useCallback(async () => {
		if (!activeCallToDisplay) return;
		dismissedMeetingIdRef.current = activeCallToDisplay._id;
		// `declineCall` côté Convex ne s'applique qu'aux appels org-inbound
		// (citoyen → org). Pour les réunions (type="meeting") ou les appels
		// directs (callUser, qui ne sont pas isOrgInbound), on se contente
		// de dismisser localement — le toast disparaît, l'invitation reste
		// dans listMine et l'agent voit que le citoyen n'a pas rejoint.
		const isOrgInbound =
			(activeCallToDisplay as any).type === "call" &&
			(activeCallToDisplay as any).isOrgInbound === true;
		if (!isOrgInbound) return;
		try {
			await declineCallMutation.mutateAsync({ meetingId: activeCallToDisplay._id });
		} catch {
			// ignore — call may already have ended
		}
	}, [activeCallToDisplay, declineCallMutation]);

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

	const handleHangUp = useCallback(async () => {
		markUserHangUp();
		if (activeMeetingId) {
			dismissedMeetingIdRef.current = activeMeetingId;
			await disconnect(activeMeetingId);
		}
		cleanupCallState();
	}, [activeMeetingId, disconnect, markUserHangUp, cleanupCallState]);

	// Auto-close when the other side hangs up (source de vérité : statut serveur)
	useEffect(() => {
		if (activeMeetingData?.status === "ended" && activeMeetingId) {
			dismissedMeetingIdRef.current = activeMeetingId;
			cleanupCallState();
		}
	}, [activeMeetingData?.status, activeMeetingId, cleanupCallState]);

	// Détecte si c'est une réunion (visioconférence multi-participants) ou
	// un appel 1:1 — la vue rendue est radicalement différente.
	const isMeeting = (activeMeetingData as any)?.type === "meeting";
	const callContent = (
		<div className="flex flex-col h-full overflow-hidden">
			{token && wsUrl ? (
				<LiveKitRoom
					token={token}
					serverUrl={wsUrl}
					connect={true}
					audio={true}
					video={isMeeting}
					options={LIVEKIT_CALL_ROOM_OPTIONS}
					onConnected={onLiveKitConnected}
					onDisconnected={onLiveKitDisconnected}
					className="flex-1 min-h-0 flex flex-col"
					style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}
				>
					{isMeeting ? (
						<MeetingStageView
							meetingTitle={
								(activeMeetingData as any)?.title ?? activeCallToDisplay?.title ?? "Réunion"
							}
							onHangUp={handleHangUp}
						/>
					) : (
						<CitizenAudioCallView
							onHangUp={handleHangUp}
							title={callerName ?? activeCallToDisplay?.title ?? undefined}
						/>
					)}
				</LiveKitRoom>
			) : (
				<div className="h-full flex items-center justify-center call-hero-dark">
					<Loader2 className="w-8 h-8 animate-spin text-white/40" />
				</div>
			)}
		</div>
	);

	// Do not render anything if no active call exists
	if (!activeCallToDisplay && !isCurrentlyInCall) return null;

	return (
		<>
			{/* Floating Banner when a call is coming in but not yet joined globally */}
			{!isCurrentlyInCall && !isBusyGlobally && activeCallToDisplay && (
				<div className="fixed top-4 left-1/2 -translate-x-1/2 z-100 w-[90%] max-w-md animate-in slide-in-from-top-4 fade-in">
					<div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-emerald-500/40 bg-zinc-950/90 backdrop-blur-xl shadow-2xl text-white">
						<div className="flex items-center gap-3">
							<div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20">
								<PhoneCall className="w-5 h-5 text-emerald-400 animate-pulse" />
								<span className="absolute inset-0 rounded-full border border-emerald-500 animate-ping opacity-75" />
							</div>
							<div>
								<p className="font-semibold text-sm">
									{activeCallToDisplay.title || t("meetings.incomingCall")}
								</p>
								<p className="text-xs text-zinc-400">
									{callerName
										? callerName
										: isOrgCall
											? t(
													"meetings.citizenCalling",
													"Un usager cherche à vous joindre",
												)
											: t(
													"meetings.agentCalling",
													"Un agent cherche à vous joindre",
												)}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Button
								onClick={handleDecline}
								variant="ghost"
								size="icon"
								className="text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-xl"
							>
								<PhoneOff className="w-4 h-4" />
							</Button>
							<Button
								onClick={handleJoin}
								className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2 shadow-lg shadow-emerald-900/20"
							>
								<Phone className="w-4 h-4" />
								{t("meetings.answer")}
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* The full screen / modal interface */}
			{isCurrentlyInCall && isMobile ? (
				<Sheet
					open={isCurrentlyInCall}
					onOpenChange={(o) => !o && handleHangUp()}
				>
					<SheetContent
						side="bottom"
						onInteractOutside={(e) => e.preventDefault()}
						onEscapeKeyDown={(e) => e.preventDefault()}
						className="p-0 h-dvh w-full bg-zinc-950 border-none rounded-none focus:outline-none flex flex-col pt-10"
					>
						<SheetTitle className="sr-only">
							{callerName ?? activeCallToDisplay?.title ?? t("meetings.callInProgress", "Appel en cours")}
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
			) : isCurrentlyInCall && !isMobile ? (
				<Dialog
					open={isCurrentlyInCall}
					onOpenChange={(o) => !o && handleHangUp()}
				>
					<DialogContent
						autoFocus={false}
						onInteractOutside={(e) => e.preventDefault()}
						onEscapeKeyDown={(e) => e.preventDefault()}
						className="max-w-5xl sm:max-w-5xl w-full h-[80vh] p-0 flex flex-col overflow-hidden bg-zinc-950 border-zinc-800"
					>
						<DialogTitle className="sr-only">
							{callerName ?? activeCallToDisplay?.title ?? t("meetings.callInProgress", "Appel en cours")}
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
			) : null}
		</>
	);
}
