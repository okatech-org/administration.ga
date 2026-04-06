"use client";

import {
	RoomAudioRenderer,
	useConnectionState,
	useLocalParticipant,
	useRemoteParticipants,
	useTracks,
	useTrackToggle,
	VideoTrack,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import {
	Camera,
	CameraOff,
	ChevronDown,
	ChevronUp,
	Loader2,
	Mic,
	MicOff,
	PhoneOff,
	User,
	Wifi,
	WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

// ============================================
// Types
// ============================================

interface CustomCallUIProps {
	/** Called when the user clicks "Raccrocher" */
	onHangUp?: () => void;
	/** Optional title to display in the header */
	title?: string;
}

// ============================================
// Call Timer Hook
// ============================================

function useCallTimer(isConnected: boolean) {
	const [elapsed, setElapsed] = useState(0);
	const startRef = useRef<number | null>(null);

	useEffect(() => {
		if (!isConnected) {
			startRef.current = null;
			setElapsed(0);
			return;
		}

		startRef.current = Date.now();
		const interval = setInterval(() => {
			if (startRef.current) {
				setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
			}
		}, 1000);

		return () => clearInterval(interval);
	}, [isConnected]);

	const minutes = Math.floor(elapsed / 60);
	const seconds = elapsed % 60;
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// ============================================
// Sub-components
// ============================================

/** Avatar placeholder when camera is off */
function AvatarTile({
	name,
	isMuted,
	isLocal,
	size = "lg",
}: {
	name: string;
	isMuted: boolean;
	isLocal: boolean;
	size?: "sm" | "lg";
}) {
	const { t } = useTranslation();
	const isSmall = size === "sm";

	return (
		<div className="relative flex items-center justify-center w-full h-full">
			<div className="flex flex-col items-center gap-2">
				<div
					className={`rounded-full bg-zinc-800 flex items-center justify-center ${isSmall ? "w-12 h-12" : "w-20 h-20 md:w-24 md:h-24"}`}
				>
					<User
						className={`text-zinc-500 ${isSmall ? "w-6 h-6" : "w-10 h-10 md:w-12 md:h-12"}`}
					/>
				</div>
				{!isSmall && (
					<span className="text-sm text-zinc-300 font-medium">{name}</span>
				)}
				{!isSmall && isMuted && (
					<span className="text-xs text-rose-400 flex items-center gap-1">
						<MicOff className="w-3 h-3" />
						{t("meetings.muted", "Micro coupé")}
					</span>
				)}
			</div>
			{isLocal && !isSmall && (
				<span className="absolute top-2 left-2 text-xs bg-zinc-800/80 text-zinc-300 px-2 py-0.5 rounded-full">
					{t("meetings.you", "Vous")}
				</span>
			)}
		</div>
	);
}

/** Connection status badge */
function ConnectionBadge({
	state,
	isWaiting,
}: {
	state: ConnectionState;
	isWaiting: boolean;
}) {
	const { t } = useTranslation();

	const config: Record<
		string,
		{
			label: string;
			color: string;
			icon: React.ComponentType<{ className?: string }>;
			pulse: boolean;
		}
	> = {
		connected: isWaiting
			? {
					label: t("meetings.waiting", "En attente…"),
					color: "text-amber-400",
					icon: Loader2,
					pulse: true,
				}
			: {
					label: t("meetings.connected", "Connecté"),
					color: "text-emerald-400",
					icon: Wifi,
					pulse: false,
				},
		connecting: {
			label: t("meetings.connecting", "Connexion…"),
			color: "text-amber-400",
			icon: Loader2,
			pulse: true,
		},
		reconnecting: {
			label: t("meetings.reconnecting", "Reconnexion…"),
			color: "text-amber-400",
			icon: WifiOff,
			pulse: true,
		},
		disconnected: {
			label: t("meetings.disconnected", "Déconnecté"),
			color: "text-zinc-500",
			icon: WifiOff,
			pulse: false,
		},
	};

	const c = config[state] ?? config.disconnected;
	const StatusIcon = c.icon;

	return (
		<span
			className={`flex items-center gap-1 text-xs ${c.color} ${c.pulse ? "animate-pulse" : ""}`}
		>
			<StatusIcon
				className={`w-3 h-3 ${isWaiting && state === ConnectionState.Connected ? "animate-spin" : ""}`}
			/>
			{c.label}
		</span>
	);
}

/** Control button (mic, camera, hang up) */
function ControlButton({
	onClick,
	active,
	danger,
	icon: Icon,
	label,
	pending,
}: {
	onClick: () => void;
	active: boolean;
	danger?: boolean;
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	pending?: boolean;
}) {
	const buttonClasses = danger
		? "w-14 h-14 rounded-full flex items-center justify-center bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30"
		: active
			? "w-14 h-14 rounded-full flex items-center justify-center bg-zinc-700 hover:bg-zinc-600 text-white"
			: "w-14 h-14 rounded-full flex items-center justify-center bg-rose-600/80 hover:bg-rose-700 text-white";

	return (
		<button
			type="button"
			onClick={onClick}
			className="flex flex-col items-center gap-1.5 transition-all duration-200 active:scale-95"
		>
			<div className={buttonClasses}>
				{pending ? (
					<Loader2 className="w-5 h-5 animate-spin" />
				) : (
					<Icon className="w-5 h-5" />
				)}
			</div>
			<span className="text-[10px] text-zinc-400 font-medium">{label}</span>
		</button>
	);
}

// ============================================
// Main Component
// ============================================

/**
 * CustomCallUI — Full custom call interface in French.
 * Replaces <VideoConference /> from @livekit/components-react.
 * Must be rendered INSIDE a <LiveKitRoom>.
 *
 * RESPONSIVE:
 * - Mobile: remote video fullscreen + local PiP (bottom-right corner)
 * - Desktop: side-by-side 2-column grid
 */
export function CustomCallUI({ onHangUp, title }: CustomCallUIProps) {
	const { t } = useTranslation();
	const connectionState = useConnectionState();
	const isConnected = connectionState === ConnectionState.Connected;
	const timer = useCallTimer(isConnected);

	// Local participant
	const { localParticipant } = useLocalParticipant();

	// Remote participants
	const remoteParticipants = useRemoteParticipants();

	// Get all camera tracks
	const cameraTracks = useTracks(
		[{ source: Track.Source.Camera, withPlaceholder: true }],
		{ onlySubscribed: false },
	);

	// Track toggles
	const {
		toggle: toggleMic,
		enabled: micEnabled,
		pending: micPending,
	} = useTrackToggle({ source: Track.Source.Microphone });

	const {
		toggle: toggleCamera,
		enabled: cameraEnabled,
		pending: cameraPending,
	} = useTrackToggle({ source: Track.Source.Camera });

	// Hang up handler
	const handleHangUp = useCallback(() => {
		onHangUp?.();
	}, [onHangUp]);

	// PiP visibility toggle (mobile only)
	const [pipVisible, setPipVisible] = useState(true);

	// Separate local and remote camera tracks
	const localCameraTrack = cameraTracks.find(
		(tr) =>
			tr.participant.identity === localParticipant?.identity &&
			tr.source === Track.Source.Camera,
	);
	const remoteCameraTracks = cameraTracks.filter(
		(tr) =>
			tr.participant.identity !== localParticipant?.identity &&
			tr.source === Track.Source.Camera,
	);

	const hasRemote = remoteParticipants.length > 0;
	const currentRemoteName =
		remoteParticipants[0]?.name || remoteParticipants[0]?.identity || null;

	// Remember remote name even after they disconnect
	const lastRemoteNameRef = useRef<string | null>(null);
	if (currentRemoteName) {
		lastRemoteNameRef.current = currentRemoteName;
	}
	const remoteName =
		currentRemoteName ||
		lastRemoteNameRef.current ||
		t("meetings.participant", "Participant");

	// Compute display title for header
	const displayTitle = (() => {
		// When remote is connected, always use their LiveKit name
		if (hasRemote) return remoteName;
		// If remote was previously connected but left, keep showing their name
		if (lastRemoteNameRef.current) return lastRemoteNameRef.current;
		// If a title was provided, extract a clean name from it
		if (title) {
			// Strip common prefixes like "Appel — ", "Appel -"
			const cleaned = title.replace(/^Appel\s*[-—–]\s*/i, "").trim();
			const localName = localParticipant?.name;
			// If the cleaned name is the local user's own name, can't determine the other
			if (localName && cleaned === localName) {
				return t("meetings.yourCorrespondent", "Votre correspondant");
			}
			return cleaned || title;
		}
		return t("meetings.yourCorrespondent", "Votre correspondant");
	})();

	// Check if remote has video
	const remoteTrack = remoteCameraTracks[0];
	const remoteHasVideo =
		remoteTrack?.publication &&
		!remoteTrack.publication.isMuted &&
		remoteTrack.publication.track;
	const remoteAudioMuted = remoteTrack
		? !remoteTrack.participant
				.getTrackPublications()
				.find((p) => p.source === Track.Source.Microphone && !p.isMuted)
		: false;

	// Check if local has video
	const localHasVideo =
		localCameraTrack?.publication &&
		!localCameraTrack.publication.isMuted &&
		localCameraTrack.publication.track;

	return (
		<div className="flex flex-col h-[80dvh] md:h-full w-full bg-zinc-950 text-white select-none overflow-hidden">
			{/* ── Header ── */}
			<div className="flex items-center justify-between px-4 py-2.5 bg-zinc-950/90 backdrop-blur-sm shrink-0 z-20 border-b border-zinc-900">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
					<span className="text-sm font-semibold truncate">{displayTitle}</span>
					{isConnected && (
						<span className="text-xs text-zinc-400 tabular-nums font-mono shrink-0">
							{timer}
						</span>
					)}
				</div>
				<ConnectionBadge state={connectionState} isWaiting={!hasRemote} />
			</div>

			{/* ── Video Area ── */}
			<div className="flex-1 min-h-0 relative">
				{hasRemote ? (
					<>
						{/* REMOTE: fullscreen on mobile, left side on desktop */}
						<div className="absolute inset-0 md:relative md:h-full md:flex md:gap-2 md:p-3">
							{/* Remote video (main) */}
							<div className="w-full h-full md:flex-1 rounded-none md:rounded-2xl bg-zinc-900 overflow-hidden relative">
								{remoteHasVideo ? (
									<div style={{ position: "absolute", inset: 0 }}>
										<VideoTrack
											trackRef={remoteTrack}
											style={{
												position: "absolute",
												inset: 0,
												width: "100%",
												height: "100%",
												objectFit: "cover",
											}}
										/>
									</div>
								) : (
									<AvatarTile
										name={remoteName}
										isMuted={!!remoteAudioMuted}
										isLocal={false}
									/>
								)}
								{/* Remote name badge */}
								<div className="absolute bottom-3 left-3 flex items-center gap-2 z-10">
									<span className="text-xs bg-zinc-900/80 backdrop-blur-sm text-white px-2 py-1 rounded-lg">
										{remoteName}
									</span>
									{remoteAudioMuted && (
										<span className="bg-rose-600/80 p-1 rounded-full">
											<MicOff className="w-3 h-3 text-white" />
										</span>
									)}
								</div>
							</div>

							{/* Local video (PiP on mobile, side panel on desktop) */}
							<div className="absolute bottom-20 right-3 md:relative md:bottom-auto md:right-auto md:w-auto md:h-auto md:flex-1 z-10">
								{/* Toggle button (mobile only) */}
								<button
									type="button"
									onClick={() => setPipVisible((v) => !v)}
									className="md:hidden absolute -top-8 right-0 z-30 bg-zinc-900/80 backdrop-blur-sm text-zinc-300 rounded-t-lg px-2 py-0.5 flex items-center gap-1 text-[10px]"
								>
									{pipVisible ? (
										<ChevronDown className="w-3 h-3" />
									) : (
										<ChevronUp className="w-3 h-3" />
									)}
									{pipVisible ? t("meetings.hide", "Masquer") : t("meetings.show", "Afficher")}
								</button>
								<div
									className={`w-28 h-36 md:w-auto md:h-full rounded-xl md:rounded-2xl bg-zinc-900 overflow-hidden shadow-2xl md:shadow-none border border-zinc-800 md:border-0 transition-all duration-200 ${pipVisible ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none md:opacity-100 md:scale-100 md:pointer-events-auto"}`}
									style={{ position: "relative" }}
								>
									{localHasVideo ? (
										<div style={{ position: "absolute", inset: 0 }}>
											<VideoTrack
												trackRef={localCameraTrack}
												style={{
													position: "absolute",
													inset: 0,
													width: "100%",
													height: "100%",
													objectFit: "cover",
													transform: "scaleX(-1)",
												}}
											/>
										</div>
									) : (
										<AvatarTile
											name={localParticipant?.name || t("meetings.you", "Vous")}
											isMuted={!micEnabled}
											isLocal={true}
											size="sm"
										/>
									)}
									<span className="absolute top-1.5 left-1.5 text-[10px] bg-zinc-900/80 backdrop-blur-sm text-zinc-300 px-1.5 py-0.5 rounded-md md:text-xs md:px-2 md:py-1 md:top-2 md:left-2 z-20">
										{t("meetings.you", "Vous")}
									</span>
								</div>
							</div>
						</div>
					</>
				) : (
					/* ── Waiting State: no remote yet ── */
					<div className="h-full flex items-center justify-center p-6">
						<div className="flex flex-col items-center gap-6 text-center">
							{/* Pulsing avatar */}
							<div className="relative flex items-center justify-center">
								<div className="absolute w-32 h-32 bg-emerald-500/15 rounded-full animate-ping" />
								<div className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-emerald-500/30 flex items-center justify-center relative z-10 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
									<User className="w-12 h-12 text-emerald-400/80" />
								</div>
							</div>

							<div className="space-y-2">
								<h3 className="text-xl font-semibold text-white tracking-tight">
									{displayTitle}
								</h3>
								<p className="text-sm text-zinc-400 flex items-center justify-center gap-2">
									<Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
									{t(
										"meetings.callingStatus",
										"Appel en cours, veuillez patienter...",
									)}
								</p>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* ── Control Bar ── */}
			<div className="shrink-0 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent z-20">
				<div className="flex items-center justify-center gap-8">
					<ControlButton
						onClick={() => toggleMic()}
						active={micEnabled}
						icon={micEnabled ? Mic : MicOff}
						label={
							micEnabled
								? t("meetings.microphone", "Micro")
								: t("meetings.muted", "Coupé")
						}
						pending={micPending}
					/>
					<ControlButton
						onClick={() => toggleCamera()}
						active={cameraEnabled}
						icon={cameraEnabled ? Camera : CameraOff}
						label={
							cameraEnabled
								? t("meetings.camera", "Caméra")
								: t("meetings.cameraOff", "Caméra off")
						}
						pending={cameraPending}
					/>
					<ControlButton
						onClick={handleHangUp}
						active={false}
						danger
						icon={PhoneOff}
						label={t("meetings.hangUp", "Raccrocher")}
					/>
				</div>
			</div>

			{/* Audio renderer (hidden — required for audio to work) */}
			<RoomAudioRenderer />
		</div>
	);
}
