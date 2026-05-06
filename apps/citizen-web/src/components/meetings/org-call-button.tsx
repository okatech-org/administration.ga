"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	LiveKitRoom,
} from "@livekit/components-react";
import { LIVEKIT_CALL_ROOM_OPTIONS } from "@workspace/livekit/room-options";
import { useLiveKitDisconnectGuard } from "@workspace/livekit/use-livekit-disconnect-guard";
import { CustomCallUI } from "@/components/meetings/custom-call-ui";
import type { VariantProps } from "class-variance-authority";
import { Loader2, Phone, PhoneOff, ChevronDown, MapPin, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { buttonVariants } from "@/components/ui/button";
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
import { useAuthenticatedConvexQuery, useConvexMutationQuery, useConvexQuery } from "@/integrations/convex/hooks";

interface OrgCallButtonProps {
	orgId: Id<"orgs">;
	orgName: string;
	orgAddress?: { street: string; city: string; postalCode: string; country: string };
	className?: string;
	variant?: VariantProps<typeof buttonVariants>["variant"];
	label?: string;
	/** When provided, uses callRequestAgent to link the call to this request */
	requestId?: Id<"requests">;
}

/**
 * OrgCallButton — Allows a citizen to call an organization.
 * If the org has multiple call lines, shows a line selector first.
 * Creates an inbound org call and opens the LiveKit interface.
 */
export function OrgCallButton({
	orgId,
	orgName,
	orgAddress,
	className,
	variant = "default",
	label,
	requestId,
}: OrgCallButtonProps) {
	const { t } = useTranslation();
	const isMobile = useIsMobile();
	const [activeMeetingId, setActiveMeetingId] = useState<Id<"meetings"> | null>(
		null,
	);
	const [showLineSelector, setShowLineSelector] = useState(false);

	// Fetch call lines for this org
	const { data: callLines } = useConvexQuery(
		api.functions.callLines.listByOrg,
		{ orgId },
	);

	// Agent availability
	const { data: availableCount } = useAuthenticatedConvexQuery(
		api.functions.agentPresence.countAvailableAgents,
		{ orgId },
	);
	const isOnline = (availableCount ?? 0) > 0;

	const callOrgMutation = useConvexMutationQuery(
		api.functions.meetings.callOrganization,
	);
	const callRequestAgentMutation = useConvexMutationQuery(
		api.functions.meetings.callRequestAgent,
	);
	const setCallRingingMutation = useConvexMutationQuery(
		api.functions.meetings.setCallRinging,
	);

	const { meeting, token, wsUrl, connect, disconnect } = useMeeting(
		activeMeetingId ?? undefined,
	);

	// Auto-close when the agent hangs up. The server patches meeting.status
	// to "ended" via endCallSlot/leave; the reactive query propagates it here.
	// Without this, the Dialog stayed open forever on the citizen side.
	useEffect(() => {
		if (meeting?.status === "ended" && activeMeetingId) {
			void disconnect(activeMeetingId);
			setActiveMeetingId(null);
		}
	}, [meeting?.status, activeMeetingId, disconnect]);

	const cleanupCallState = useCallback(() => {
		setActiveMeetingId(null);
	}, []);

	const {
		onConnected: onLiveKitConnected,
		onDisconnected: onLiveKitDisconnected,
		markUserHangUp,
		reset: resetDisconnectGuard,
	} = useLiveKitDisconnectGuard(cleanupCallState);

	const initiateCall = useCallback(async (callLineId?: Id<"callLines">) => {
		try {
			setShowLineSelector(false);
			resetDisconnectGuard();
			let meetingId: Id<"meetings">;

			if (requestId && !callLineId) {
				// Use contextual call — links the call to the request
				const result = await callRequestAgentMutation.mutateAsync({ requestId });
				meetingId = result.meetingId;
			} else {
				const result = await callOrgMutation.mutateAsync({
					orgId,
					callLineId,
				});
				meetingId = result.meetingId;
			}

			setActiveMeetingId(meetingId);
			await connect(meetingId);
			// Transition call to "ringing" — makes it visible to agents
			await setCallRingingMutation.mutateAsync({ meetingId });
		} catch (err) {
			console.error("Failed to call organization:", err);
		}
	}, [
		orgId,
		requestId,
		callOrgMutation,
		callRequestAgentMutation,
		setCallRingingMutation,
		connect,
		resetDisconnectGuard,
	]);

	const handleCall = useCallback(async () => {
		// If there are multiple active lines, show selector
		const activeLines = callLines?.filter((l) => l.isActive) ?? [];
		if (activeLines.length > 1) {
			setShowLineSelector(true);
			return;
		}
		// If exactly 1 line, call it directly. If 0, call without line.
		const singleLine = activeLines.length === 1 ? activeLines[0] : undefined;
		await initiateCall(singleLine?._id);
	}, [callLines, initiateCall]);

	// Explicit user-initiated hang-up (button click, dialog close).
	// Calls the server `leave` mutation which ends the call for everyone.
	const handleHangUp = useCallback(async () => {
		markUserHangUp();
		if (activeMeetingId) {
			await disconnect(activeMeetingId);
		}
		setActiveMeetingId(null);
	}, [activeMeetingId, disconnect, markUserHangUp]);

	const isInCall = activeMeetingId !== null;
	const activeLines = callLines?.filter((l) => l.isActive) ?? [];

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
					onConnected={onLiveKitConnected}
					onDisconnected={onLiveKitDisconnected}
					className="flex-1 min-h-0 flex flex-col"
					style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}
				>
					<CustomCallUI onHangUp={handleHangUp} title={orgName} />
				</LiveKitRoom>
			) : (
				<div className="h-full flex flex-col items-center justify-center gap-4 text-white">
					<Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
					<p className="text-sm text-zinc-400">
						{t("meetings.waitingForAgent")}
					</p>
				</div>
			)}
		</div>
	);

	return (
		<>
			<div className="inline-flex flex-col items-start gap-1">
				<Button
					onClick={handleCall}
					disabled={callOrgMutation.isPending || isInCall}
					className={className}
					variant={variant}
				>
					{callOrgMutation.isPending ? (
						<Loader2 className="w-4 h-4 mr-2 animate-spin" />
					) : (
						<Phone className="w-4 h-4 mr-2" />
					)}
					{label || t("meetings.callOrg")}
					{activeLines.length > 1 && (
						<ChevronDown className="w-3 h-3 ml-1 opacity-60" />
					)}
				</Button>
				{availableCount !== undefined && (
					<span className={`text-[10px] font-medium ${isOnline ? "text-emerald-600" : "text-zinc-400"}`}>
						{isOnline
							? `${availableCount} agent${availableCount > 1 ? "s" : ""} en ligne`
							: "Aucun agent en ligne"
						}
					</span>
				)}
			</div>

			{/* Line Selector Dialog */}
			<Dialog open={showLineSelector} onOpenChange={setShowLineSelector}>
				<DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
					<DialogTitle className="text-lg font-bold">{orgName}</DialogTitle>
					<div className="flex flex-col gap-4">
						{/* En-tête : nom complet de la représentation */}
						<div className="space-y-2">
							{orgAddress && (
								<div className="flex items-start gap-2 text-xs text-muted-foreground">
									<MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
									<span className="leading-tight">{orgAddress.street}, {orgAddress.postalCode} {orgAddress.city}</span>
								</div>
							)}
							<div className="border-b pt-1" />
						</div>

						{/* Lignes téléphoniques */}
						<div className="space-y-2">
							{activeLines.map((line) => {
								const isPersonal = line.type === "personal";
								return (
									<button
										type="button"
										key={line._id}
										onClick={() => initiateCall(line._id)}
										disabled={callOrgMutation.isPending}
										className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] ${
											isPersonal
												? "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800"
												: "border-primary/20 bg-primary/5 hover:bg-primary/10"
										}`}
									>
										<div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
											isPersonal ? "bg-zinc-200 dark:bg-zinc-700" : "bg-primary/10"
										}`}>
											<Phone className={`w-4 h-4 ${isPersonal ? "text-zinc-600 dark:text-zinc-300" : "text-primary"}`} />
										</div>
										<div className="flex-1 text-left min-w-0">
											<p className="text-sm font-medium truncate">{line.label}</p>
											{line.description && (
												<p className="text-xs text-muted-foreground truncate">{line.description}</p>
											)}
										</div>
										{isPersonal && (
											<span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700 shrink-0">
												{t("meetings.directLine")}
											</span>
										)}
									</button>
								);
							})}
						</div>

						{/* Bouton Chat — redirige vers iChat */}
						<Button asChild variant="outline" size="sm" className="w-full h-9 text-sm font-medium rounded-xl">
							<Link href="/my-space/iasted">
								<MessageCircle className="w-4 h-4 mr-2" />
								{t("meetings.chatWithOrg")}
							</Link>
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Call interface */}
			{isInCall && isMobile ? (
				<Sheet open={isInCall} onOpenChange={(o) => !o && handleHangUp()}>
					<SheetContent
						side="bottom"
						// z-[120] : passe au-dessus du BottomSheet "Contacter" (z-[90/91])
						// pour que l'UI d'appel ne soit jamais masquée.
						className="z-[120] p-0 h-dvh w-full bg-zinc-950 border-none rounded-none focus:outline-none flex flex-col pt-10"
					>
						<SheetTitle className="sr-only">
							{orgName || t("meetings.callInProgress")}
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
			) : isInCall && !isMobile ? (
				<Dialog open={isInCall} onOpenChange={(o) => !o && handleHangUp()}>
					<DialogContent
						autoFocus={false}
						className="max-w-5xl sm:max-w-5xl w-full h-[80vh] p-0 flex flex-col overflow-hidden bg-zinc-950 border-zinc-800"
					>
						<DialogTitle className="sr-only">
							{orgName || t("meetings.callInProgress")}
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
