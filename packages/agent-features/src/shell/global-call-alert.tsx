"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	LiveKitRoom,
} from "@livekit/components-react";
import { useQuery } from "convex/react";
import { AlertTriangle, ArrowRight, Loader2, Phone, PhoneCall, PhoneOff } from "lucide-react";
import { usePathname, useRouter } from "@workspace/routing";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@workspace/ui/components/button";
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
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";
import { LIVEKIT_CALL_ROOM_OPTIONS } from "@workspace/livekit/room-options";
import { FEATURES } from "@workspace/shared/feature-flags";
import { DirectCallView } from "../components/meetings/DirectCallView";
import { MeetingStageView } from "../components/meetings-livekit/MeetingStageView";
import { useCallCenter } from "../hooks/use-call-center";
import { useIsMobile } from "../hooks/use-mobile";
import { useMeeting } from "../hooks/use-meeting";
import { useRingtone } from "../hooks/use-ringtone";
import { useRingtoneMutedPref } from "../hooks/use-ringtone-muted-pref";
import { useCallStore } from "../stores/call-store";

const PICKUP_REDIRECT_KEY = "call-center-pickup-redirect";

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
 * Sur /icom (Centre d'Appels actif), la file d'appels org-inbound est gérée
 * par le shell : on supprime cette branche de l'alerte. En revanche, les
 * appels directs (callUser → autre agent) ne sont PAS dans la file Centre
 * d'Appels, donc on laisse passer la branche "personal meeting" pour que
 * l'agent puisse être joint en direct même sur /icom.
 */
export function GlobalCallAlert() {
	const pathname = usePathname();
	const suppressOrgCallsForCallCenter =
		CALL_CENTER_ENABLED && !!pathname && pathname.startsWith("/icom");
	return (
		<GlobalCallAlertInner
			suppressOrgCalls={suppressOrgCallsForCallCenter}
		/>
	);
}

function GlobalCallAlertInner({
	suppressOrgCalls,
}: {
	suppressOrgCalls: boolean;
}) {
	const { t } = useTranslation();
	const isMobile = useIsMobile();
	const router = useRouter();

	// Préférence "Basculer vers iCom au décrochage d'un appel inbound"
	// (org-call uniquement). Persistée en localStorage.
	const [pickupRedirect, setPickupRedirect] = useState(false);
	useEffect(() => {
		try {
			setPickupRedirect(localStorage.getItem(PICKUP_REDIRECT_KEY) === "true");
		} catch {
			/* SSR / blocked storage — par défaut Dialog */
		}
	}, []);
	const togglePickupRedirect = useCallback(() => {
		setPickupRedirect((prev) => {
			const next = !prev;
			try {
				localStorage.setItem(PICKUP_REDIRECT_KEY, String(next));
			} catch {
				/* ignore */
			}
			return next;
		});
	}, []);

	// Hook call-center — `pickup` accepte l'appel via le pool LiveKit central
	// (pas de Dialog) quand l'agent active la préférence.
	const { pickup } = useCallCenter();

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
	// biome-ignore lint/suspicious/noExplicitAny: meeting shape from Convex
	const incomingPersonalMeeting = meetings?.find((m: any) => {
		if (m.status !== "active") return false;
		// Skip calls that are already answered or ended via callStatus
		if (m.callStatus && m.callStatus !== "ringing" && m.callStatus !== "initiating") return false;
		// Pour une RÉUNION instantanée (type="meeting" sans scheduledAt), la
		// sonnerie sonne 5 min — fenêtre élargie pour absorber la latence des
		// invités qui arrivent. Pour un appel 1:1 (type="call"), 2 min suffisent.
		// Une réunion PLANIFIÉE (scheduledAt > now) ne sonne pas — l'invité a
		// déjà l'événement dans son agenda + notification ; une sonnerie serait
		// intrusive plusieurs minutes avant l'heure.
		const isMeeting = m.type === "meeting";
		if (isMeeting && m.scheduledAt && m.scheduledAt > Date.now()) return false;
		const ringWindowMs = isMeeting ? 5 * 60_000 : 2 * 60_000;
		if (Date.now() - m._creationTime > ringWindowMs) return false;
		// Un appel que je viens d'initier (je suis `createdBy`) ne doit pas déclencher
		// la sonnerie chez moi — je suis le caller, pas le callee.
		if (me?._id && m.createdBy === me._id) return false;
		// Si je suis dans le tableau et que j'ai déjà soit rejoint (joinedAt
		// + pas de leftAt = en com), soit quitté (leftAt renseigné),
		// ne pas faire ringer. Notamment pour le cas "j'ai quitté la réunion
		// mais elle est encore active côté serveur".
		if (
			me?._id &&
			// biome-ignore lint/suspicious/noExplicitAny: participant shape from Convex
			m.participants.some((p: any) => {
				if (p.userId !== me._id) return false;
				if (p.joinedAt && !p.leftAt) return true; // en communication
				if (p.leftAt) return true; // déjà quitté
				return false;
			})
		) {
			return false;
		}
		return true;
	});

	// Les appels org-inbound (file d'appels du centre d'appels) sont couverts
	// par la file d'appels visible dans /icom (col 1) et par le drawer
	// GlobalQueuePill flottant hors /icom. Ce toast ne signale donc plus que
	// les appels PERSONNELS (callUser direct, agent-à-agent) — qui ne passent
	// pas par la file org. `suppressOrgCalls` n'est plus utilisé pour gating
	// mais conservé pour compat de signature.
	void suppressOrgCalls;
	void inboundOrgCalls;
	const incomingOrgCall = null as null;

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

	// Préférence "couper la sonnerie" partagée (pill, header iAppel, toast).
	const { muted: ringtoneMuted } = useRingtoneMutedPref();

	// Ring tone plays if there is an active call, we haven't joined yet, AND
	// we aren't in another call AND la sonnerie n'est pas mutée.
	useRingtone(
		!!activeCallToDisplay &&
			!isCurrentlyInCall &&
			!isBusyGlobally &&
			!ringtoneMuted,
	);

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
		dismissedMeetingIdRef.current = null;

		// Branche bascule iCom : appel org-inbound + agent a activé la préférence.
		// Pickup via call-center (pool LiveKit centralisé) puis redirect.
		const shouldRedirect = isOrgCall && pickupRedirect;
		if (shouldRedirect) {
			try {
				await pickup((activeCallToDisplay as { _id: Id<"meetings"> })._id);
				router.push("/icom?tab=icall");
				return;
			} catch {
				// Si le pickup centralisé échoue, on retombe sur le Dialog legacy
				// pour que l'agent ne perde pas l'appel.
			}
		}

		// Branche legacy — Dialog plein écran avec CustomCallUI.
		userHangUpRef.current = false;
		hasConnectedRef.current = false;
		setActiveMeetingId(activeCallToDisplay._id);
		setGlobalMeetingId(activeCallToDisplay._id);
		await connect(activeCallToDisplay._id);
	}, [
		activeCallToDisplay,
		connect,
		setGlobalMeetingId,
		pickupRedirect,
		pickup,
		router,
		isOrgCall,
	]);

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

	// Détection du type — si la meeting créée est de type="meeting", on rend
	// la scène vidéo plein écran. Sinon, vue d'appel direct 1:1.
	const isMeetingType = (activeMeetingData as any)?.type === "meeting";
	const callContent = (
		<div className="flex flex-col h-full overflow-hidden">
			{token && wsUrl ? (
				<LiveKitRoom
					token={token}
					serverUrl={wsUrl}
					connect={true}
					audio={true}
					video={isMeetingType}
					options={LIVEKIT_CALL_ROOM_OPTIONS}
					onConnected={() => {
						hasConnectedRef.current = true;
					}}
					onDisconnected={handleLiveKitDisconnected}
					className="flex-1 min-h-0 flex flex-col"
					style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}
				>
					{isMeetingType ? (
						<MeetingStageView
							meetingTitle={
								(activeMeetingData as any)?.title ??
								activeCallToDisplay?.title ??
								"Réunion"
							}
							onHangUp={handleHangUp}
						/>
					) : (
						<DirectCallView
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
			{/* Toast bas-droite — design "AgToast"
			    URGENT : liseré rouge + badge URGENCE.
			    Standard : liseré primary, pulse subtil. */}
			{!isCurrentlyInCall && !isBusyGlobally && activeCallToDisplay && (() => {
				const isUrgent =
					(activeCallToDisplay as any).priority === "urgent" ||
					(activeCallToDisplay as any).priority === "high";
				return (
					<div className="fixed bottom-6 right-6 z-[100] w-[calc(100%-3rem)] max-w-md animate-in slide-in-from-bottom-4 fade-in sm:bottom-8 sm:right-8 flex flex-col gap-1.5">
						<div className={`grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-2xl border bg-card px-3.5 py-3 shadow-xl ${
							isUrgent ? "border-destructive/40" : "border-primary/30"
						}`}>
							{/* Icon pulse */}
							<div className={`relative flex h-11 w-11 items-center justify-center rounded-full ${
								isUrgent ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"
							}`}>
								<PhoneCall className="h-5 w-5" />
								<span
									className={`call-pulse-ping absolute inset-0 rounded-full ${
										isUrgent ? "text-destructive" : "text-primary"
									}`}
									aria-hidden
								/>
							</div>

							{/* Content */}
							<div className="min-w-0">
								<div className="flex items-center gap-1.5 flex-wrap">
									<p className="truncate text-sm font-semibold text-foreground" title={activeCallToDisplay.title ?? undefined}>
										{callerName ?? activeCallToDisplay.title ?? t("meetings.incomingCall", "Appel entrant")}
									</p>
									{isUrgent && (
										<span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
											<AlertTriangle className="h-2.5 w-2.5" />
											{t("meetings.urgent", "Urgence")}
										</span>
									)}
								</div>
								<p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
									{isOrgCall
										? t("meetings.citizenCalling", "Un usager cherche à vous joindre")
										: t("meetings.agentCalling", "Un agent cherche à vous joindre")}
								</p>
							</div>

							{/* Actions */}
							<div className="flex items-center gap-1.5 pl-1">
								<Button
									size="icon"
									variant="ghost"
									onClick={handleDecline}
									aria-label={t("meetings.decline", "Refuser")}
									title={t("meetings.decline", "Refuser")}
									className="h-9 w-9 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
								>
									<PhoneOff className="h-4 w-4" />
								</Button>
								<Button
									size="icon"
									onClick={handleJoin}
									aria-label={t("meetings.answer", "Décrocher")}
									title={t("meetings.answer", "Décrocher")}
									className="h-9 w-9 rounded-full bg-success text-white hover:bg-success/90"
								>
									<Phone className="h-4 w-4" />
								</Button>
							</div>
						</div>

						{/* Toggle bascule iCom — visible uniquement pour appels org */}
						{isOrgCall && (
							<button
								type="button"
								onClick={togglePickupRedirect}
								className="self-end rounded-md px-2 py-1 text-[10.5px] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors flex items-center gap-1"
							>
								<ArrowRight className="h-3 w-3" />
								{pickupRedirect
									? "Bascule iCom au décrochage : activée"
									: "Activer la bascule iCom au décrochage"}
							</button>
						)}
					</div>
				);
			})()}

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
						className={
							isMeetingType
								? "max-w-5xl sm:max-w-5xl w-full h-[80vh] p-0 flex flex-col overflow-hidden bg-zinc-950 border-zinc-800"
								: "sm:max-w-[420px] w-full h-[680px] max-h-[90vh] p-0 flex flex-col overflow-hidden bg-zinc-950 border-zinc-800"
						}
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
