/**
 * CitizenCallTab — Onglet iAppel pour citoyens.
 *
 * Refonte UX (sprint 2026-05) : pré-appel orienté carte de contact, écran d'appel
 * audio plein écran (mobile) ou panneau (desktop), résumé post-appel.
 *
 * Restrictions metier :
 *   - Audio uniquement (pas de video sortante)
 *   - Appels uniquement vers les lignes d'appel des representations
 *   - Pas d'appels entre citoyens
 *   - Lignes priorité <= 2 → "Urgent", > 2 → "Standard"
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { LiveKitRoom } from "@livekit/components-react";
import "@livekit/components-styles";
import { LIVEKIT_CALL_ROOM_OPTIONS } from "@workspace/livekit/room-options";
import { useLiveKitDisconnectGuard } from "@workspace/livekit/use-livekit-disconnect-guard";
import {
	ArrowDownLeft,
	ArrowUpRight,
	ChevronRight,
	Clock,
	Loader2,
	Phone,
	PhoneMissed,
	PhoneOff,
	ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetTitle,
} from "@/components/ui/sheet";
import { CitizenAudioCallView } from "@/components/meetings/CitizenAudioCallView";
import { CallEndedSummary } from "@/components/meetings/CallEndedSummary";
import { RecordingConsentBanner } from "@/components/meetings/recording-consent-banner";
import { useMeeting } from "@/hooks/use-meeting";
import { useIsMobile } from "@/hooks/use-mobile";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

type EndedCallSnapshot = {
	correspondentName: string;
	correspondentRole?: string;
	durationLabel?: string;
};

export function CitizenCallTab() {
	const isMobile = useIsMobile();
	const [activeMeetingId, setActiveMeetingId] = useState<Id<"meetings"> | null>(
		null,
	);
	const [activeCallLabel, setActiveCallLabel] = useState<string | null>(null);
	const [activeCallSubtitle, setActiveCallSubtitle] = useState<string | null>(
		null,
	);
	const [endedCall, setEndedCall] = useState<EndedCallSnapshot | null>(null);
	const callStartRef = useRef<number | null>(null);

	// Hook meeting lifecycle
	const { token, wsUrl, connect, disconnect } = useMeeting(
		activeMeetingId ?? undefined,
	);

	// RGPD consent surveillance
	const { data: activeMeeting } = useAuthenticatedConvexQuery(
		api.functions.meetings.get,
		activeMeetingId ? { meetingId: activeMeetingId } : "skip",
	);
	const consent = activeMeeting?.citizenConsent;
	const shouldShowConsentBanner = Boolean(
		activeMeetingId &&
			consent?.recordingConsentRequestedAt &&
			consent?.recordingAccepted === undefined &&
			!consent?.recordingDeclinedAt,
	);

	// Mutation appel org
	const { mutateAsync: callOrg, isPending: isCalling } = useConvexMutationQuery(
		api.functions.meetings.callOrganization,
	);

	// Transition initiating → ringing (makes call visible to agents)
	const setCallRingingMutation = useConvexMutationQuery(
		api.functions.meetings.setCallRinging,
	);

	// Historique d'appels catégorisé
	const { data: historyData, isPending: isHistoryPending } =
		useAuthenticatedConvexQuery(api.functions.meetings.listCallHistory, {});
	const callHistory = historyData?.calls ?? [];
	const userNames = historyData?.userNames ?? {};

	// Mes demandes (pour trouver les orgs associées)
	const { data: myRequests } = useAuthenticatedConvexQuery(
		api.functions.requests.listMine,
		{ paginationOpts: { numItems: 20, cursor: null } },
	);

	const orgIds = useMemo(() => {
		const requests = (myRequests as any)?.page ?? [];
		const ids = new Set<string>();
		for (const r of requests) {
			if (r.orgId) ids.add(r.orgId);
		}
		return Array.from(ids);
	}, [myRequests]);

	const cleanupCallState = useCallback(() => {
		// Capture snapshot avant cleanup pour afficher l'écran "ended"
		if (activeCallLabel && callStartRef.current) {
			const elapsedSec = Math.floor((Date.now() - callStartRef.current) / 1000);
			const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
			const ss = String(elapsedSec % 60).padStart(2, "0");
			setEndedCall({
				correspondentName: activeCallLabel,
				correspondentRole: activeCallSubtitle ?? undefined,
				durationLabel: `${mm}:${ss}`,
			});
		}
		callStartRef.current = null;
		setActiveMeetingId(null);
		setActiveCallLabel(null);
		setActiveCallSubtitle(null);
	}, [activeCallLabel, activeCallSubtitle, callStartRef]);

	const {
		onConnected: onLiveKitConnected,
		onDisconnected: onLiveKitDisconnected,
		markUserHangUp,
		reset: resetDisconnectGuard,
	} = useLiveKitDisconnectGuard(cleanupCallState);

	const handleCallOrg = useCallback(
		async (
			orgId: string,
			callLineId?: string,
			label?: string,
			subtitle?: string,
		) => {
			if (activeMeetingId) {
				toast.error("Un appel est déjà en cours");
				return;
			}
			try {
				setActiveCallLabel(label ?? null);
				setActiveCallSubtitle(subtitle ?? null);
				resetDisconnectGuard();
				const result = await callOrg({
					orgId: orgId as Id<"orgs">,
					callLineId: callLineId
						? (callLineId as Id<"callLines">)
						: undefined,
					mediaType: "audio",
				});
				const meetingId = result.meetingId as Id<"meetings">;
				setActiveMeetingId(meetingId);
				callStartRef.current = Date.now();
				await connect(meetingId);
				await setCallRingingMutation.mutateAsync({ meetingId });
			} catch (e: any) {
				toast.error(e?.message ?? "Erreur lors de l'appel");
				setActiveMeetingId(null);
				setActiveCallLabel(null);
				setActiveCallSubtitle(null);
				callStartRef.current = null;
			}
		},
		[
			activeMeetingId,
			callOrg,
			connect,
			setCallRingingMutation,
			resetDisconnectGuard,
			callStartRef,
		],
	);

	const handleHangUp = useCallback(async () => {
		markUserHangUp();
		if (activeMeetingId) {
			await disconnect(activeMeetingId);
		}
		cleanupCallState();
	}, [activeMeetingId, disconnect, markUserHangUp, cleanupCallState]);

	const isInCall = activeMeetingId !== null && token && wsUrl;
	const callStatus = activeMeeting?.callStatus;
	const meetingStatus = activeMeeting?.status;
	const isHeld = callStatus === "on_hold";

	// Auto-cleanup quand l'agent met fin à l'appel (raccroche, refuse,
	// missed/timeout). Source de vérité = serveur Convex.
	useEffect(() => {
		if (!activeMeetingId) return;
		const isTerminalCallStatus =
			callStatus === "ended" ||
			callStatus === "declined" ||
			callStatus === "missed";
		const isTerminalMeetingStatus =
			meetingStatus === "ended" || meetingStatus === "cancelled";
		if (isTerminalCallStatus || isTerminalMeetingStatus) {
			markUserHangUp();
			void disconnect(activeMeetingId).catch(() => {
				/* room peut déjà être fermée côté LK */
			});
			cleanupCallState();
			if (callStatus === "declined") {
				toast.error("L'agent n'est pas disponible pour le moment.");
			} else if (callStatus === "missed") {
				toast.error("Aucun agent n'a répondu — appel manqué.");
			}
		}
	}, [
		activeMeetingId,
		callStatus,
		meetingStatus,
		disconnect,
		markUserHangUp,
		cleanupCallState,
	]);

	// Live call view (mounted within Dialog/Sheet)
	const liveCallView = isInCall ? (
		<LiveKitRoom
			token={token}
			serverUrl={wsUrl}
			connect={true}
			audio={true}
			video={false}
			options={LIVEKIT_CALL_ROOM_OPTIONS}
			onConnected={onLiveKitConnected}
			onDisconnected={onLiveKitDisconnected}
			className="flex flex-col flex-1 h-full"
			style={{ height: "100%", width: "100%" }}
		>
			<CitizenAudioCallView
				onHangUp={handleHangUp}
				title={activeCallLabel ?? undefined}
				subtitle={activeCallSubtitle ?? undefined}
				isHeld={isHeld}
			/>
		</LiveKitRoom>
	) : (
		<div className="flex flex-1 items-center justify-center call-hero-dark">
			<Loader2 className="h-8 w-8 animate-spin text-white/50" />
		</div>
	);

	return (
		<div className="flex flex-col flex-1 min-h-0 overflow-hidden">
			<ScrollArea className="flex-1 min-h-0">
				{/* En-tête */}
				<div className="px-4 pt-4 pb-3">
					<p className="text-base font-semibold">Appeler une représentation</p>
					<p className="text-sm text-muted-foreground">
						Audio uniquement — Sélectionnez une ligne
					</p>
				</div>

				{/* Trust badge — identité vérifiée */}
				<div className="mx-4 mb-3 flex items-start gap-2.5 rounded-xl bg-secondary/60 px-3 py-2.5 text-xs text-muted-foreground">
					<ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
					<span>
						Votre identité est <strong className="text-foreground">déjà vérifiée</strong>.
						L'agent verra votre dossier dès le décrochage.
					</span>
				</div>

				{/* Lignes d'appel par org */}
				{orgIds.length === 0 ? (
					<div className="flex flex-col items-center py-12 text-center px-6">
						<Phone className="h-10 w-10 text-muted-foreground/30 mb-3" />
						<p className="text-sm font-medium text-muted-foreground">
							Aucune représentation disponible
						</p>
						<p className="text-sm text-muted-foreground/60 mt-1">
							Faites une demande de service pour voir les contacts
						</p>
					</div>
				) : (
					<div className="space-y-4 px-4">
						{orgIds.map((orgId) => (
							<OrgCallLines
								key={orgId}
								orgId={orgId as Id<"orgs">}
								onCall={handleCallOrg}
								isCalling={isCalling}
								isInCall={!!activeMeetingId}
							/>
						))}
					</div>
				)}

				{/* Historique d'appels catégorisé */}
				<div className="border-t mt-4">
					<div className="px-4 pt-4 pb-2">
						<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							Historique récent
						</p>
					</div>
					{isHistoryPending ? (
						<div className="flex items-center justify-center py-6">
							<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
						</div>
					) : callHistory.length === 0 ? (
						<div className="flex flex-col items-center py-8 text-center">
							<Clock className="h-8 w-8 text-muted-foreground/20 mb-2" />
							<p className="text-sm text-muted-foreground">Aucun appel récent</p>
						</div>
					) : (
						<div className="px-4 pb-4 space-y-1">
							{callHistory.slice(0, 10).map((item: any) => {
								const catConfig = {
									incoming: {
										icon: ArrowDownLeft,
										color: "text-success",
										bg: "bg-success/10",
										label: "Entrant",
									},
									outgoing: {
										icon: ArrowUpRight,
										color: "text-primary",
										bg: "bg-primary/10",
										label: "Sortant",
									},
									missed: {
										icon: PhoneMissed,
										color: "text-destructive",
										bg: "bg-destructive/10",
										label: "Manqué",
									},
									declined: {
										icon: PhoneOff,
										color: "text-muted-foreground",
										bg: "bg-muted/30",
										label: "Refusé",
									},
								}[item.category as string] ?? {
									icon: Phone,
									color: "text-muted-foreground",
									bg: "bg-muted/30",
									label: "",
								};
								const CatIcon = catConfig.icon;
								const date = new Date(item._creationTime);
								const durationMs = item.duration as number | undefined;
								const durationStr = durationMs
									? durationMs < 60000
										? `${Math.floor(durationMs / 1000)}s`
										: `${Math.floor(durationMs / 60000)}min`
									: "";
								const otherNames = item.participants
									?.filter((p: any) => p.userId !== item.createdBy)
									.map((p: any) => userNames[p.userId] ?? "Inconnu")
									.join(", ");
								const label =
									item.title ??
									otherNames ??
									userNames[item.createdBy] ??
									"Appel";

								return (
									<div
										key={item._id}
										className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/30"
									>
										<div
											className={cn(
												"h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
												catConfig.bg,
											)}
										>
											<CatIcon className={cn("h-4 w-4", catConfig.color)} />
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium leading-snug">{label}</p>
											<div className="flex items-center gap-2 mt-0.5">
												<span
													className={cn(
														"text-xs font-medium",
														catConfig.color,
													)}
												>
													{catConfig.label}
												</span>
												<span className="text-xs text-muted-foreground">
													{date.toLocaleDateString("fr-FR", {
														day: "2-digit",
														month: "short",
													})}
													{" · "}
													{date.toLocaleTimeString("fr-FR", {
														hour: "2-digit",
														minute: "2-digit",
													})}
													{durationStr && ` · ${durationStr}`}
												</span>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</ScrollArea>

			{/* Live call — Sheet sur mobile (fullscreen), Dialog sur desktop */}
			{isMobile ? (
				<Sheet
					open={!!isInCall}
					onOpenChange={(open) => {
						if (!open) handleHangUp();
					}}
				>
					<SheetContent
						side="bottom"
						onInteractOutside={(e) => e.preventDefault()}
						onEscapeKeyDown={(e) => e.preventDefault()}
						className="p-0 h-dvh w-full bg-zinc-950 border-none rounded-none focus:outline-none flex flex-col"
					>
						<SheetTitle className="sr-only">
							{activeCallLabel ?? "Appel en cours"}
						</SheetTitle>
						<SheetDescription className="sr-only">
							Appel audio avec une représentation. Utilisez les commandes pour
							raccrocher ou couper le micro.
						</SheetDescription>
						{liveCallView}
					</SheetContent>
				</Sheet>
			) : (
				<Dialog
					open={!!isInCall}
					onOpenChange={(open) => {
						if (!open) handleHangUp();
					}}
				>
					<DialogContent
						autoFocus={false}
						onInteractOutside={(e) => e.preventDefault()}
						onEscapeKeyDown={(e) => e.preventDefault()}
						className="max-w-md sm:max-w-md w-full h-[640px] p-0 flex flex-col overflow-hidden bg-zinc-950 border-none"
					>
						<DialogTitle className="sr-only">
							{activeCallLabel ?? "Appel en cours"}
						</DialogTitle>
						<DialogDescription className="sr-only">
							Appel audio avec une représentation. Utilisez les commandes pour
							raccrocher ou couper le micro.
						</DialogDescription>
						{liveCallView}
					</DialogContent>
				</Dialog>
			)}

			{/* Résumé post-appel */}
			{endedCall && (
				<Dialog
					open={!!endedCall}
					onOpenChange={(open) => {
						if (!open) setEndedCall(null);
					}}
				>
					<DialogContent
						className="max-w-md sm:max-w-md w-full p-0 overflow-hidden"
					>
						<DialogTitle className="sr-only">Résumé de l'appel</DialogTitle>
						<DialogDescription className="sr-only">
							Résumé de l'appel terminé.
						</DialogDescription>
						<div className="h-[600px]">
							<CallEndedSummary
								correspondentName={endedCall.correspondentName}
								correspondentRole={endedCall.correspondentRole}
								durationLabel={endedCall.durationLabel}
								onClose={() => setEndedCall(null)}
								variant="panel"
							/>
						</div>
					</DialogContent>
				</Dialog>
			)}

			{shouldShowConsentBanner && activeMeetingId && (
				<RecordingConsentBanner meetingId={activeMeetingId} />
			)}
		</div>
	);
}

/**
 * Carte org + lignes d'appel (style maquette : ligne standard / ligne urgence).
 */
function OrgCallLines({
	orgId,
	onCall,
	isCalling,
	isInCall,
}: {
	orgId: Id<"orgs">;
	onCall: (
		orgId: string,
		callLineId?: string,
		label?: string,
		subtitle?: string,
	) => void;
	isCalling: boolean;
	isInCall: boolean;
}) {
	const { data: org } = useAuthenticatedConvexQuery(
		api.functions.orgs.getById,
		{ orgId },
	);

	const { data: callLines, isPending } = useAuthenticatedConvexQuery(
		api.functions.callLines.listByOrg,
		{ orgId },
	);

	const { data: availableCount } = useAuthenticatedConvexQuery(
		api.functions.agentPresence.countAvailableAgents,
		{ orgId },
	);
	const isOnline = (availableCount ?? 0) > 0;

	const activeLines = useMemo(() => {
		return (callLines ?? []).filter(
			(l: any) => l.isActive && l.type === "org",
		);
	}, [callLines]);

	if (isPending) {
		return (
			<div className="flex items-center gap-3 py-3">
				<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
				<span className="text-sm text-muted-foreground">Chargement...</span>
			</div>
		);
	}

	const orgName = (org as any)?.name ?? "Représentation";
	const orgLocation = (org as any)?.address?.city ?? null;

	return (
		<div className="space-y-2.5">
			{/* Titre org */}
			<div className="flex items-baseline justify-between px-1">
				<h2 className="text-[15px] font-semibold tracking-tight">{orgName}</h2>
				{orgLocation && (
					<span className="text-[11px] text-muted-foreground">{orgLocation}</span>
				)}
			</div>

			{/* Lignes — chaque ligne en carte standalone */}
			{activeLines.length === 0 ? (
				<Button
					variant="outline"
					className="w-full gap-2 text-sm h-12"
					disabled={isCalling || isInCall}
					onClick={() => onCall(orgId, undefined, orgName)}
				>
					{isCalling ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Phone className="h-4 w-4" />
					)}
					Appeler
				</Button>
			) : (
				activeLines.map((line: any) => {
					const lineColor: string | undefined = line.color;
					return (
						<button
							key={line._id}
							type="button"
							disabled={isCalling || isInCall}
							onClick={() =>
								onCall(
									orgId,
									line._id,
									orgName,
									`${line.label}${orgLocation ? ` · ${orgLocation}` : ""}`,
								)
							}
							className={cn(
								"w-full grid grid-cols-[44px_1fr_auto] gap-3.5 items-center rounded-2xl border bg-card p-4 text-left transition-all hover:bg-secondary/40",
								(isCalling || isInCall) && "opacity-60",
							)}
							style={
								lineColor
									? { borderColor: `${lineColor}66` }
									: undefined
							}
						>
							<span
								className="h-11 w-11 rounded-xl flex items-center justify-center bg-primary/10 text-primary"
								style={
									lineColor
										? {
												backgroundColor: `${lineColor}1A`,
												color: lineColor,
										  }
										: undefined
								}
							>
								<Phone className="h-5 w-5" />
							</span>
							<div className="min-w-0">
								<p className="text-[15px] font-semibold leading-tight">
									{line.label}
								</p>
								{line.description && (
									<p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">
										{line.description}
									</p>
								)}
								<div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
									{isOnline ? (
										<Badge
											variant="outline"
											className="h-5 px-2 text-[10px] font-medium border-success/40 text-success bg-success/5 gap-1"
										>
											<span className="h-1.5 w-1.5 rounded-full bg-success" />
											Ouvert · {availableCount} agent
											{(availableCount ?? 0) > 1 ? "s" : ""}{" "}
											disponible
											{(availableCount ?? 0) > 1 ? "s" : ""}
										</Badge>
									) : (
										<Badge
											variant="outline"
											className="h-5 px-2 text-[10px] font-medium border-muted-foreground/30 text-muted-foreground"
										>
											Hors ligne
										</Badge>
									)}
								</div>
							</div>
							<ChevronRight
								className="h-5 w-5 text-primary"
								style={lineColor ? { color: lineColor } : undefined}
							/>
						</button>
					);
				})
			)}
		</div>
	);
}
