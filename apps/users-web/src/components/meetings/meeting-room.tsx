import {
	LiveKitRoom,
} from "@livekit/components-react";

import { CustomCallUI } from "@/components/meetings/custom-call-ui";
import { AlertCircle, Loader2, Phone, Users, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

// ============================================
// Types
// ============================================

interface MeetingRoomProps {
	token: string;
	wsUrl: string;
	onDisconnect: () => void;
}

// ============================================
// Main Component
// ============================================

/**
 * MeetingRoom — Full-featured audio/video conferencing room.
 * Wraps LiveKit's VideoConference with custom controls and styling.
 */
export function MeetingRoom({ token, wsUrl, onDisconnect }: MeetingRoomProps) {
	return (
		<div className="flex flex-col h-full w-full bg-zinc-950 rounded-xl overflow-hidden">
			<LiveKitRoom
				token={token}
				serverUrl={wsUrl}
				connect={true}
				audio={true}
				onDisconnected={onDisconnect}
				className="flex flex-col flex-1"
				style={{ height: "100%" }}
			>
				<CustomCallUI onHangUp={onDisconnect} />
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
