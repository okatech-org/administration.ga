import {
	LiveKitRoom,
} from "@livekit/components-react";
import { LIVEKIT_CALL_ROOM_OPTIONS } from "@workspace/livekit/room-options";
import { useLiveKitDisconnectGuard } from "@workspace/livekit/use-livekit-disconnect-guard";

import { DirectCallView } from "../meetings/DirectCallView";
import { MeetingChatPanel } from "./MeetingChatPanel";
import { MeetingStageView } from "./MeetingStageView";
import { AlertCircle, Loader2, MessageSquare, Phone, Users, Video, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";
import { cn } from "@workspace/ui/lib/utils";

// ============================================
// Types
// ============================================

interface MeetingRoomProps {
	token: string;
	wsUrl: string;
	onDisconnect: () => void;
	/** Meeting ID — requis pour activer le bouton d'enregistrement. */
	meetingId?: Id<"meetings">;
	mediaType?: "audio" | "video";
}

// ============================================
// Main Component
// ============================================

/**
 * MeetingRoom — Full-featured audio/video conferencing room.
 * Wraps LiveKit's VideoConference with custom controls and styling.
 */
export function MeetingRoom({
	token,
	wsUrl,
	onDisconnect,
	meetingId,
	mediaType,
}: MeetingRoomProps) {
	const { data: meetingDoc } = useAuthenticatedConvexQuery(
		api.functions.meetings.get,
		meetingId ? { meetingId } : "skip",
	);
	const isMeeting = (meetingDoc as any)?.type === "meeting";
	const isVideo = mediaType === "video" || isMeeting;
	const cleanupOnDisconnect = useCallback(() => {
		onDisconnect();
	}, [onDisconnect]);

	const {
		onConnected,
		onDisconnected,
		markUserHangUp,
	} = useLiveKitDisconnectGuard(cleanupOnDisconnect);

	const handleUserHangUp = useCallback(() => {
		markUserHangUp();
		onDisconnect();
	}, [markUserHangUp, onDisconnect]);

	// ── Recording state (agent-only — citizens n'ont pas `meetingId` passé)
	const { data: activeRecording } = useAuthenticatedConvexQuery(
		api.functions.callRecordings.getActiveForMeeting,
		meetingId ? { meetingId } : "skip",
	);
	const { mutateAsync: startRecordingMut } = useConvexMutationQuery(
		api.functions.callRecordings.startRecording,
	);
	const { mutateAsync: stopRecordingMut } = useConvexMutationQuery(
		api.functions.callRecordings.stopRecording,
	);
	const [recordingPending, setRecordingPending] = useState(false);
	const isRecording = !!activeRecording;

	// Toggle chat side panel — visible uniquement pour les sessions vidéo
	// (réunions) où le chat textuel a une vraie valeur.
	const [chatOpen, setChatOpen] = useState(false);
	const showChatToggle = isVideo;

	const handleToggleRecording = useCallback(async () => {
		if (!meetingId) return;
		setRecordingPending(true);
		try {
			if (activeRecording) {
				await stopRecordingMut({ recordingId: activeRecording._id });
				toast.success("Enregistrement arrêté");
			} else {
				await startRecordingMut({ meetingId });
				toast.success("Enregistrement démarré");
			}
		} catch (e: any) {
			toast.error(e?.data ?? e?.message ?? "Opération impossible");
		} finally {
			setRecordingPending(false);
		}
	}, [meetingId, activeRecording, startRecordingMut, stopRecordingMut]);

	return (
		<div className="flex flex-col h-full w-full bg-zinc-950 rounded-xl overflow-hidden">
			<LiveKitRoom
				token={token}
				serverUrl={wsUrl}
				connect={true}
				audio={true}
				video={isVideo}
				options={LIVEKIT_CALL_ROOM_OPTIONS}
				onConnected={onConnected}
				onDisconnected={onDisconnected}
				className="flex flex-col flex-1"
				style={{ height: "100%" }}
			>
				<div className="flex flex-1 min-h-0 relative">
					<div className={cn(
						"flex flex-col flex-1 min-w-0",
						chatOpen && showChatToggle && "md:mr-[320px]",
					)}>
						{isMeeting ? (
							<MeetingStageView
								meetingTitle={(meetingDoc as any)?.title ?? "Réunion"}
								onHangUp={handleUserHangUp}
								recording={
									meetingId
										? {
											isRecording,
											isPending: recordingPending,
											onToggle: handleToggleRecording,
										}
										: undefined
								}
							/>
						) : (
							<DirectCallView
								onHangUp={handleUserHangUp}
								title={(meetingDoc as any)?.title}
							/>
						)}
					</div>

					{/* Chat side panel (réunion vidéo uniquement) */}
					{showChatToggle && (
						<>
							{/* Toggle button (top-right of room) — discret */}
							<Button
								type="button"
								onClick={() => setChatOpen((v) => !v)}
								variant="ghost"
								size="icon"
								aria-pressed={chatOpen}
								aria-label={chatOpen ? "Fermer la discussion" : "Ouvrir la discussion"}
								className="absolute top-2.5 right-2.5 z-30 h-8 w-8 rounded-lg bg-white/8 hover:bg-white/14 text-white"
							>
								{chatOpen ? <X className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
							</Button>

							{/* Panel */}
							{chatOpen && (
								<aside className="absolute right-0 top-0 bottom-0 w-full md:w-[320px] z-20 p-2.5 pt-12 md:pt-2.5 bg-zinc-950/95 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none">
									<MeetingChatPanel onClose={() => setChatOpen(false)} />
								</aside>
							)}
						</>
					)}
				</div>
			</LiveKitRoom>
		</div>
	);
}

// ============================================
// Pre-Join Screen
// ============================================

interface PreJoinScreenProps {
	meetingTitle: string;
	participantCount: number;
	isConnecting: boolean;
	error: string | null;
	onJoin: () => void;
	onCancel: () => void;
}

/**
 * PreJoinScreen — Shown before entering a call.
 * Allows user to preview and confirm joining.
 */
export function PreJoinScreen({
	meetingTitle,
	participantCount,
	isConnecting,
	error,
	onJoin,
	onCancel,
}: PreJoinScreenProps) {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-8">
			{/* Meeting info */}
			<div className="text-center space-y-2">
				<div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
					<Video className="w-8 h-8 text-rose-500" />
				</div>
				<h2 className="text-xl font-semibold">{meetingTitle}</h2>
				<p className="text-sm text-muted-foreground flex items-center gap-1.5 justify-center">
					<Users className="w-4 h-4" />
					{participantCount} participant{participantCount !== 1 ? "s" : ""}
				</p>
			</div>

			{/* Error */}
			{error && (
				<div className="flex items-center gap-2 text-destructive bg-destructive/10 px-4 py-2 rounded-lg text-sm">
					<AlertCircle className="w-4 h-4 shrink-0" />
					{error}
				</div>
			)}

			{/* Actions */}
			<div className="flex gap-3">
				<Button variant="outline" onClick={onCancel} disabled={isConnecting}>
					{t("common.cancel")}
				</Button>
				<Button
					onClick={onJoin}
					disabled={isConnecting}
					className="bg-rose-600 hover:bg-rose-700 text-white gap-2"
				>
					{isConnecting ? (
						<Loader2 className="w-4 h-4 animate-spin" />
					) : (
						<Phone className="w-4 h-4" />
					)}
					{isConnecting ? t("meetings.connecting") : t("meetings.join")}
				</Button>
			</div>
		</div>
	);
}

// ============================================
// Call Button (to be placed on request detail pages)
// ============================================

interface StartCallButtonProps {
	onClick: () => void;
	variant?: "default" | "outline" | "ghost";
	size?: "default" | "sm" | "lg" | "icon";
	className?: string;
}

/**
 * StartCallButton — Simple button to initiate a call.
 * Can be placed on request detail pages, profiles, etc.
 */
export function StartCallButton({
	onClick,
	variant = "outline",
	size = "sm",
	className,
}: StartCallButtonProps) {
	const { t } = useTranslation();

	return (
		<Button
			variant={variant}
			size={size}
			onClick={onClick}
			className={className}
		>
			<Video className="w-4 h-4 mr-1.5" />
			{t("meetings.startCall")}
		</Button>
	);
}
