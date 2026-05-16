"use client";

/**
 * FloatingMeetingWindow — mount global du LiveKitRoom pour les réunions
 * (type="meeting"). Vit dans l'AppShell et survit aux changements de route /
 * de tab : la connexion LiveKit n'est PAS unmount quand l'utilisateur
 * navigue. Le composant a deux modes :
 *   - **Plein écran** : quand l'URL est sur la page « hôte » de la réunion
 *     (`/icom?tab=imeeting&active=<id>` côté agent, `/my-space/meetings?join=<id>`
 *     côté citoyen). Affiche `MeetingStageView` plein écran.
 *   - **PiP** : sur toute autre route. Vignette compacte bottom-right avec
 *     bouton « agrandir » qui ramène à la page hôte (et donc à `active=<id>`
 *     dans l'URL).
 *
 * La SOURCE DE VÉRITÉ de l'état actif est `activeMeetingStore`. Le composant
 * lit également les search params (`active`, `join`) pour synchroniser la
 * connexion sur reload / deep link.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { LiveKitRoom } from "@livekit/components-react";
import { LIVEKIT_CALL_ROOM_OPTIONS } from "@workspace/livekit/room-options";
import { useLiveKitDisconnectGuard } from "@workspace/livekit/use-livekit-disconnect-guard";
import { Maximize2, Minus, PhoneOff } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "@workspace/routing";
import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { MeetingStageView } from "../components/meetings-livekit/MeetingStageView";
import { IAstedLiveKitBridge } from "../components/iasted-bridge";
import { useActiveMeetingConnection } from "../hooks/use-active-meeting-connection";

interface FloatingMeetingWindowProps {
	/** Préfixe de chemin où le mode plein écran s'active (sans le query string). */
	hostPathname: string;
	/** Nom du search param qui porte l'ID actif sur la page hôte. */
	activeParamName: "active" | "join";
	/**
	 * Discriminant supplémentaire pour la page hôte agent (`tab=imeeting`).
	 * Si fourni, le mode plein écran exige aussi `searchParams.get(key) === value`.
	 */
	hostTab?: { key: string; value: string };
	/** Titre par défaut si la meeting n'a pas encore été chargée. */
	defaultTitle?: string;
}

export function FloatingMeetingWindow({
	hostPathname,
	activeParamName,
	hostTab,
	defaultTitle = "Réunion",
}: FloatingMeetingWindowProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { state, joinMeeting, leaveMeeting, endForAll } =
		useActiveMeetingConnection();

	// Quand l'utilisateur raccroche, on nettoie l'URL (retire `active`) et on
	// reset le store. La séquence est asynchrone — on garde un flag pour que
	// la useEffect de deep-link ci-dessous N'AUTO-REJOIN PAS pendant la
	// fenêtre où le store est déjà vide mais l'URL pas encore mise à jour.
	const intentionalLeaveRef = useRef(false);

	// Deep-link → store : si l'URL porte `?active=<id>` mais que le store est
	// vide (ou sur un autre meeting), déclencher la connexion. Sauf si l'on
	// vient de raccrocher volontairement (flag ci-dessus).
	const urlMeetingId = searchParams?.get(activeParamName) ?? null;
	useEffect(() => {
		// On retire le flag dès que l'URL est nettoyée (re-render après
		// router.replace).
		if (intentionalLeaveRef.current && !urlMeetingId) {
			intentionalLeaveRef.current = false;
			return;
		}
		if (intentionalLeaveRef.current) return;
		if (!urlMeetingId) return;
		if (state.meetingId === urlMeetingId) return;
		if (state.status === "connecting") return;
		void joinMeeting(urlMeetingId as never);
	}, [urlMeetingId, state.meetingId, state.status, joinMeeting]);

	// Bascule plein écran ↔ PiP selon la route courante.
	const isHostPage = pathname === hostPathname;
	const tabMatches = hostTab
		? searchParams?.get(hostTab.key) === hostTab.value
		: true;
	const isFullscreen = isHostPage && tabMatches;

	// Meeting doc — pour titre + détection du host (createdBy === me).
	const { data: meetingDoc } = useAuthenticatedConvexQuery(
		api.functions.meetings.get,
		state.meetingId ? { meetingId: state.meetingId as Id<"meetings"> } : "skip",
	);
	const { data: me } = useAuthenticatedConvexQuery(
		api.functions.users.getMe,
		{},
	);
	const isHost =
		!!meetingDoc &&
		!!me &&
		(meetingDoc as any).createdBy === (me as any)?._id;

	const cleanupOnDisconnect = useCallback(() => {
		void leaveMeeting();
	}, [leaveMeeting]);

	const { onConnected, onDisconnected, markUserHangUp, reset } =
		useLiveKitDisconnectGuard(cleanupOnDisconnect);

	// Reset du guard à chaque nouvelle connexion (nouveau meetingId).
	useEffect(() => {
		if (state.status === "connecting") reset();
	}, [state.meetingId, state.status, reset]);

	/** Nettoie le param `active`/`join` de l'URL courante. */
	const clearActiveFromUrl = useCallback(() => {
		const params = new URLSearchParams(searchParams?.toString() ?? "");
		if (!params.has(activeParamName)) return;
		params.delete(activeParamName);
		const qs = params.toString();
		router.replace(qs ? `${pathname}?${qs}` : pathname);
	}, [activeParamName, pathname, router, searchParams]);

	const handleHangUp = useCallback(() => {
		intentionalLeaveRef.current = true;
		markUserHangUp();
		clearActiveFromUrl();
		void leaveMeeting();
	}, [clearActiveFromUrl, leaveMeeting, markUserHangUp]);

	const handleEndForAll = useCallback(() => {
		intentionalLeaveRef.current = true;
		markUserHangUp();
		clearActiveFromUrl();
		void endForAll();
	}, [clearActiveFromUrl, endForAll, markUserHangUp]);

	const handleMaximize = useCallback(() => {
		if (!state.meetingId) return;
		const params = new URLSearchParams();
		if (hostTab) params.set(hostTab.key, hostTab.value);
		params.set(activeParamName, state.meetingId);
		router.push(`${hostPathname}?${params.toString()}`);
	}, [activeParamName, hostPathname, hostTab, router, state.meetingId]);

	/** Réduit le plein écran en PiP sans quitter : on retire le discriminant
	 * de tab (l'`active=<id>` reste, donc la connexion LiveKit persiste, mais
	 * la condition `isFullscreen` devient false). */
	const handleMinimize = useCallback(() => {
		if (!hostTab) return;
		const params = new URLSearchParams(searchParams?.toString() ?? "");
		params.delete(hostTab.key);
		const qs = params.toString();
		router.replace(qs ? `${pathname}?${qs}` : pathname);
	}, [hostTab, pathname, router, searchParams]);

	if (!state.meetingId) return null;
	if (!state.token || !state.wsUrl) {
		// État de connexion intermédiaire — un loader discret en PiP (en
		// plein écran la page hôte affiche son propre placeholder).
		if (isFullscreen) return null;
		return (
			<div className="fixed bottom-6 right-6 z-[80] rounded-2xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-xl">
				Connexion à la réunion…
			</div>
		);
	}

	const isMeetingVideo =
		state.mediaType === "video" || state.mediaType === null;
	const meetingTitle = (meetingDoc as any)?.title ?? defaultTitle;

	const roomBody = (
		<LiveKitRoom
			token={state.token}
			serverUrl={state.wsUrl}
			connect={true}
			audio={true}
			video={isMeetingVideo}
			options={LIVEKIT_CALL_ROOM_OPTIONS}
			onConnected={onConnected}
			onDisconnected={onDisconnected}
			className="flex flex-col flex-1 min-h-0"
			style={{ height: "100%", width: "100%" }}
		>
			{isFullscreen ? (
				<MeetingStageView
					meetingId={state.meetingId}
					meetingTitle={meetingTitle}
					onHangUp={handleHangUp}
					onMinimize={hostTab ? handleMinimize : undefined}
					onEndForAll={isHost ? handleEndForAll : undefined}
				/>
			) : (
				<FloatingMeetingPip
					onMaximize={handleMaximize}
					onHangUp={handleHangUp}
				/>
			)}
			<IAstedLiveKitBridge />
		</LiveKitRoom>
	);

	if (isFullscreen) {
		return (
			<div className="fixed inset-0 z-[60] flex flex-col bg-[#0a0d12]">
				{roomBody}
			</div>
		);
	}

	return (
		<div
			className={cn(
				"fixed bottom-6 right-6 z-[80] flex h-[180px] w-[320px] flex-col overflow-hidden rounded-2xl border border-border bg-[#0a0d12] shadow-2xl",
			)}
		>
			{roomBody}
		</div>
	);
}

function FloatingMeetingPip({
	onMaximize,
	onHangUp,
}: {
	onMaximize: () => void;
	onHangUp: () => void;
}) {
	return (
		<div className="relative flex flex-1 flex-col">
			<div className="flex items-center justify-between border-b border-white/5 px-2.5 py-1.5">
				<span className="text-[11px] font-semibold text-white">
					● Réunion en cours
				</span>
				<div className="flex items-center gap-1">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-6 w-6 text-white/70 hover:bg-white/10 hover:text-white"
						onClick={onMaximize}
						aria-label="Agrandir la réunion"
					>
						<Maximize2 className="h-3.5 w-3.5" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-6 w-6 bg-destructive text-destructive-foreground hover:bg-destructive/90"
						onClick={onHangUp}
						aria-label="Quitter la réunion"
					>
						<PhoneOff className="h-3.5 w-3.5" />
					</Button>
				</div>
			</div>
			<button
				type="button"
				onClick={onMaximize}
				className="flex flex-1 flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#1d3557] to-[#457b9d] text-white"
			>
				<Minus className="h-5 w-5 opacity-60" />
				<span className="text-[11px] opacity-80">
					Cliquer pour revenir
				</span>
			</button>
		</div>
	);
}
