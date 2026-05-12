/**
 * ActiveCallDialog — Dialog d'appel actif réutilisable.
 *
 * Encapsule le LiveKitRoom + CustomCallUI + le bandeau de contrôle, avec :
 *   - useMeeting   → token, wsUrl, connect/disconnect
 *   - useLiveKitDisconnectGuard → ignore les disconnect avant le premier connect
 *   - Dialog ouverte tant que `meetingId !== null`
 *
 * Utilisé par BackofficeCallTab et SuperAdminCallTrigger.
 */

"use client";

import type { Id } from "@convex/_generated/dataModel";
import { LiveKitRoom } from "@livekit/components-react";
import "@livekit/components-styles";
import { LIVEKIT_CALL_ROOM_OPTIONS } from "@workspace/livekit/room-options";
import { useLiveKitDisconnectGuard } from "@workspace/livekit/use-livekit-disconnect-guard";
import { Loader2, PhoneOff } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { DirectCallView } from "@workspace/agent-features/components/meetings";
import { useMeeting } from "@/hooks/use-meeting";

export type ActiveCallMediaType = "audio" | "video";

interface ActiveCallDialogProps {
	meetingId: Id<"meetings"> | null;
	mediaType: ActiveCallMediaType;
	onClose: () => void;
}

export function ActiveCallDialog({
	meetingId,
	mediaType,
	onClose,
}: ActiveCallDialogProps) {
	const { meeting, token, wsUrl, connect, disconnect } = useMeeting(
		meetingId ?? undefined,
	);
	const connectedRef = useRef<Id<"meetings"> | null>(null);

	const cleanup = useCallback(() => {
		connectedRef.current = null;
		onClose();
	}, [onClose]);

	const {
		onConnected,
		onDisconnected,
		markUserHangUp,
		reset: resetGuard,
	} = useLiveKitDisconnectGuard(cleanup);

	useEffect(() => {
		if (!meetingId) return;
		if (connectedRef.current === meetingId) return;
		connectedRef.current = meetingId;
		resetGuard();
		void connect(meetingId);
	}, [meetingId, connect, resetGuard]);

	const handleHangUp = useCallback(async () => {
		markUserHangUp();
		if (meetingId) await disconnect(meetingId);
		cleanup();
	}, [markUserHangUp, meetingId, disconnect, cleanup]);

	const isOpen = meetingId !== null;

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) void handleHangUp();
			}}
		>
			<DialogContent className="sm:max-w-[420px] w-full h-[680px] max-h-[90vh] p-0 flex flex-col overflow-hidden bg-zinc-950 border-zinc-800">
				<DialogTitle className="sr-only">
					{mediaType === "audio" ? "Appel audio" : "Appel vidéo"}
				</DialogTitle>
				<DialogDescription className="sr-only">
					Interface d'appel active. Utilisez les commandes pour poursuivre la conversation ou raccrocher.
				</DialogDescription>
				{token && wsUrl ? (
					<div className="flex flex-col flex-1 bg-zinc-950">
						<div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
							<div className="flex items-center gap-2">
								<Badge className="text-[9px] bg-red-500/15 text-red-400">
									En direct
								</Badge>
								<span className="text-xs text-zinc-400">
									{mediaType === "audio" ? "Appel audio" : "Appel vidéo"}
								</span>
							</div>
							<Button
								variant="destructive"
								size="sm"
								onClick={handleHangUp}
								className="h-7 text-[10px] gap-1"
							>
								<PhoneOff className="h-3 w-3" />
								Raccrocher
							</Button>
						</div>
						<LiveKitRoom
							token={token}
							serverUrl={wsUrl}
							connect={true}
							audio={true}
							video={mediaType === "video"}
							options={LIVEKIT_CALL_ROOM_OPTIONS}
							onConnected={onConnected}
							onDisconnected={onDisconnected}
							className="flex flex-col flex-1"
						>
							<DirectCallView
								onHangUp={handleHangUp}
								title={
									// Le titre Convex est de la forme "Appel — Prénom Nom".
									// On retire le préfixe pour ne montrer que le nom propre
									// dans l'UI d'appel.
									(meeting as { title?: string } | null)?.title?.replace(
										/^Appel\s+[—-]\s+/,
										"",
									) ?? undefined
								}
							/>
						</LiveKitRoom>
					</div>
				) : (
					<div className="flex flex-col items-center justify-center flex-1 gap-4 text-white bg-zinc-950">
						<Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
						<p className="text-sm text-zinc-400">Connexion en cours…</p>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
