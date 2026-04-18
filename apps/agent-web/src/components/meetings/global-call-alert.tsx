import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	LiveKitRoom,
} from "@livekit/components-react";
import { CustomCallUI } from "@/components/meetings/custom-call-ui";

import { useQuery } from "convex/react";
import { Loader2, Phone, PhoneCall, PhoneOff } from "lucide-react";
import { usePathname } from "next/navigation";
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
import { useAuthenticatedConvexQuery, useConvexMutationQuery } from "@/integrations/convex/hooks";
import { useCallStore } from "@/stores/call-store";
import { FEATURES } from "@/lib/feature-flags";
import { LIVEKIT_CALL_ROOM_OPTIONS } from "@/lib/livekit-config";

/**
 * Feature flag Centre d'Appels — doit utiliser la même source que IAstedCallTab
 * (`FEATURES.callCenter`, opt-out via `NEXT_PUBLIC_FEATURE_CALL_CENTER=0`).
 *
 * Avant, ce fichier exigeait `=1|true` explicitement : le flag par défaut
 * basculait IAstedCallTab en mode Centre d'Appels mais LAISSAIT GlobalCallAlert
 * ouvrir son Dialog CustomCallUI plein écran — double UI superposée.
 */
const CALL_CENTER_ENABLED = FEATURES.callCenter;

/**
 * GlobalCallAlert - Listens for incoming calls across the entire app.
 * If there is an active call where the user is a participant but hasn't joined,
 * this shows a floating notification and rings.
 *
 * Wrapper qui désactive l'alerte dans /iasted quand le Centre d'Appels est actif :
 * respecte les Règles des Hooks en laissant le composant interne se démonter
 * proprement plutôt qu'un early-return au milieu d'un arbre de hooks.
 */
export function GlobalCallAlert() {
	const pathname = usePathname();
	const shouldSuppressForCallCenter =
		CALL_CENTER_ENABLED && pathname?.startsWith("/iasted");
	if (shouldSuppressForCallCenter) return null;
	return <GlobalCallAlertInner />;
}

function GlobalCallAlertInner() {
	const { t } = useTranslation();
	const isMobile = useIsMobile();

	const [activeMeetingId, setActiveMeetingId] = useState<Id<"meetings"> | null>(
		null,
	);
	const { globalActiveMeetingId, setGlobalMeetingId } = useCallStore();
	// See citizen-web/org-call-button.tsx — guard transient LiveKit disconnects
	// (StrictMode, token refresh, network blips) from ending the call.
	const userHangUpRef = useRef(false);
	// Flag set par `onConnected` de LiveKitRoom. Les events `onDisconnected`
	// antérieurs au premier `onConnected` sont des artefacts de handshake ou
	// de double mount StrictMode et NE DOIVENT PAS fermer l'appel.
	const hasConnectedRef = useRef(false);
	// Mémorise le dernier meetingId traité (raccroché, décliné, ou terminé par
	// l'autre) pour éviter que la sonnerie ne re-sonne pendant la fenêtre de
	// latence où la query Convex n'a pas encore propagé le changement de statut.
	const dismissedMeetingIdRef = useRef<Id<"meetings"> | null>(null);

	// Get my personal meetings
	const { data: meetingsData } = useAuthenticatedConvexQuery(
		api.functions.meetings.listMine,
		{},
	);
	const meetings = meetingsData?.meetings;

	// Current user — nécessaire pour distinguer un appel sortant (que je viens
	// d'initier) d'un appel entrant auquel je dois répondre.
	const { data: me } = useAuthenticatedConvexQuery(
		api.functions.users.getMe,
		{},
	);

	// Get inbound org calls (for agents)
	const { data: inboundOrgCalls } = useAuthenticatedConvexQuery(
		api.functions.meetings.listInboundOrgCalls,
		{},
	);

	// Decline mutation
	const declineCallMutation = useConvexMutationQuery(
		api.functions.meetings.declineCall,
	);

	// Find the first active personal meeting where I haven't joined yet
	const incomingPersonalMeeting = meetings?.find((m) => {
		if (m.status !== "active") return false;
		// Skip calls that are already answered or ended via callStatus
		if (m.callStatus && m.callStatus !== "ringing" && m.callStatus !== "initiating") return false;
		if (Date.now() - m._creationTime > 120_000) return false;
		// Un appel que je viens d'initier (je suis `createdBy`) ne doit pas déclencher
		// la sonnerie chez moi — je suis le caller, pas le callee.
		if (me?._id && m.createdBy === me._id) return false;
		// Si j'ai déjà rejoint cet appel (joinedAt renseigné), ce n'est plus un
		// appel entrant : je suis en communication, pas à décrocher.
		if (
			me?._id &&
			m.participants.some((p) => p.userId === me._id && p.joinedAt && !p.leftAt)
		) {
			return false;
		}
		return true;
	});

	// Prioritize inbound org calls, then personal meetings
	const incomingOrgCall = inboundOrgCalls?.[0] ?? null;

	const candidateCall = incomingOrgCall ?? incomingPersonalMeeting ?? null;
	// Ignorer explicitement un meetingId déjà traité localement (raccroché,
	// décliné, ou terminé par l'autre) tant que la query Convex n'a pas rafraîchi.
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

	const handleJoin = useCallback(async () => {
		if (!activeCallToDisplay) return;
		userHangUpRef.current = false;
		hasConnectedRef.current = false;
		// Nouvelle intention : on autorise à nouveau la sonnerie pour cet ID.
		dismissedMeetingIdRef.current = null;
		setActiveMeetingId(activeCallToDisplay._id);
		setGlobalMeetingId(activeCallToDisplay._id);
		await connect(activeCallToDisplay._id);
	}, [activeCallToDisplay, connect, setGlobalMeetingId]);

	const handleDecline = useCallback(async () => {
		if (!activeCallToDisplay) return;
		dismissedMeetingIdRef.current = activeCallToDisplay._id;
		await declineCallMutation.mutateAsync({ meetingId: activeCallToDisplay._id });
	}, [activeCallToDisplay, declineCallMutation]);

	const handleHangUp = useCallback(async () => {
		userHangUpRef.current = true;
		if (activeMeetingId) {
			dismissedMeetingIdRef.current = activeMeetingId;
			await disconnect(activeMeetingId);
		}
		setActiveMeetingId(null);
		setGlobalMeetingId(null);
		hasConnectedRef.current = false;
	}, [activeMeetingId, disconnect, setGlobalMeetingId]);

	const handleLiveKitDisconnected = useCallback(() => {
		// Pattern en deux temps :
		//   1. Disconnect avant tout onConnected → artefact de handshake,
		//      StrictMode, ICE restart. On ignore ; LiveKit retentera.
		//   2. Disconnect après une connexion établie → soit user hangup
		//      (userHangUpRef), soit un raccrochage distant / coupure réseau
		//      définitive. On ferme l'appel côté client. Le raccrochage distant
		//      est aussi capté par le useEffect sur meeting.status === "ended".
		if (!hasConnectedRef.current) return;
		if (!userHangUpRef.current) return;
		if (activeMeetingId) {
			dismissedMeetingIdRef.current = activeMeetingId;
		}
		setActiveMeetingId(null);
		setGlobalMeetingId(null);
	}, [activeMeetingId, setGlobalMeetingId]);

	// Auto-close when the other side hangs up
	useEffect(() => {
		if (activeMeetingData?.status === "ended" && activeMeetingId) {
			dismissedMeetingIdRef.current = activeMeetingId;
			setActiveMeetingId(null);
			setGlobalMeetingId(null);
		}
	}, [activeMeetingData?.status, activeMeetingId, setGlobalMeetingId]);

	const callContent = (
		<div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
			{token && wsUrl ? (
				<LiveKitRoom
					token={token}
					serverUrl={wsUrl}
					connect={true}
					audio={true}
					video={false}
					options={LIVEKIT_CALL_ROOM_OPTIONS}
					onConnected={() => {
						hasConnectedRef.current = true;
					}}
					onDisconnected={handleLiveKitDisconnected}
					className="flex-1 min-h-0 flex flex-col"
					style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}
				>
					<CustomCallUI onHangUp={handleHangUp} title={callerName ?? activeCallToDisplay?.title} />
				</LiveKitRoom>
			) : (
				<div className="h-full flex items-center justify-center">
					<Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
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
				<div className="fixed top-4 left-1/2 -translate-x-1/2 z-100 w-[calc(100%-2rem)] max-w-xl animate-in slide-in-from-top-4 fade-in">
					<div className="flex flex-col gap-3 rounded-2xl border border-emerald-500/40 bg-zinc-950/90 px-4 py-3 text-white backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:gap-4">
						<div className="flex min-w-0 items-center gap-3">
							<div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
								<PhoneCall className="h-5 w-5 animate-pulse text-emerald-400" />
								<span className="absolute inset-0 animate-ping rounded-full border border-emerald-500 opacity-75" />
							</div>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-semibold" title={activeCallToDisplay.title ?? undefined}>
									{activeCallToDisplay.title || t("meetings.incomingCall", "Appel entrant")}
								</p>
								<p className="truncate text-xs text-zinc-400">
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
						<div className="flex shrink-0 items-center justify-end gap-2">
							<Button
								size="sm"
								variant="ghost"
								onClick={handleDecline}
								aria-label={t("meetings.decline", "Refuser")}
								className="gap-1.5 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300"
							>
								<PhoneOff className="h-4 w-4" />
								<span className="hidden sm:inline">{t("meetings.decline", "Refuser")}</span>
							</Button>
							<Button
								size="sm"
								onClick={handleJoin}
								aria-label={t("meetings.answer", "Décrocher")}
								className="gap-2 rounded-xl bg-emerald-600 text-white transition-transform hover:bg-emerald-700 active:scale-[0.97]"
							>
								<Phone className="h-4 w-4" />
								<span className="hidden sm:inline">{t("meetings.answer", "Décrocher")}</span>
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
