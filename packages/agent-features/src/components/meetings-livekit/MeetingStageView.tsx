"use client";

/**
 * MeetingStageView — scène de réunion vidéo plein écran fidèle à la maquette
 * `meeting-vs-call.jsx > AgMeetingStage`.
 *
 * Layout :
 *   - Top bar : [REC dot · chrono] [|] [titre réunion] [participants count] [Inviter]
 *   - Stage 2-col : [hero speaker (2fr) + 3 side tiles (1fr)] [aside agenda + chat (280px)]
 *   - Bottom dock : Mic · Caméra · Partager · Participants · Discussion · Notes · Quitter
 *
 * Doit être monté À L'INTÉRIEUR d'un <LiveKitRoom>.
 */

import {
	RoomAudioRenderer,
	useLocalParticipant,
	useParticipants,
	useRemoteParticipants,
	useTrackToggle,
	useTracks,
	VideoTrack,
} from "@livekit/components-react";
import type { Participant } from "livekit-client";
import { Track } from "livekit-client";
import {
	Camera,
	CameraOff,
	FileText,
	LogOut,
	MessageSquare,
	Mic,
	MicOff,
	MonitorUp,
	MonitorX,
	UserPlus,
	Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { MeetingChatPanel } from "./MeetingChatPanel";

interface MeetingStageViewProps {
	meetingTitle: string;
	onHangUp: () => void;
	recording?: {
		isRecording: boolean;
		isPending?: boolean;
		onToggle: () => void;
	};
}

const TILE_GRADIENTS = [
	"from-[#1d3557] to-[#457b9d]",
	"from-[#5b3470] to-[#a16dc1]",
	"from-[#0d3a2c] to-[#1f8a5b]",
	"from-[#7c2d12] to-[#ea580c]",
	"from-[#581c87] to-[#9333ea]",
] as const;

function gradientForId(id: string): string {
	let hash = 0;
	for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
	return TILE_GRADIENTS[Math.abs(hash) % TILE_GRADIENTS.length]!;
}

function getInitials(name: string | null | undefined): string {
	if (!name) return "?";
	return (
		name
			.split(/\s+/)
			.map((w) => w[0])
			.filter(Boolean)
			.slice(0, 2)
			.join("")
			.toUpperCase() || "?"
	);
}

export function MeetingStageView({
	meetingTitle,
	onHangUp,
	recording,
}: MeetingStageViewProps) {
	const { t } = useTranslation();
	const allParticipants = useParticipants();
	const remoteParticipants = useRemoteParticipants();
	const { localParticipant } = useLocalParticipant();

	// Active speaker = participant with isSpeaking=true (excl. local), fallback
	// au premier remote, sinon local.
	const speaker: Participant | undefined = useMemo(() => {
		const speaking = remoteParticipants.find((p) => p.isSpeaking);
		if (speaking) return speaking;
		if (remoteParticipants.length > 0) return remoteParticipants[0];
		return localParticipant ?? undefined;
	}, [remoteParticipants, localParticipant]);

	const others = useMemo(() => {
		return allParticipants.filter((p) => p.identity !== speaker?.identity);
	}, [allParticipants, speaker]);

	const cameraTracks = useTracks(
		[{ source: Track.Source.Camera, withPlaceholder: false }],
		{ onlySubscribed: false },
	);

	const speakerVideoTrack = useMemo(
		() =>
			cameraTracks.find(
				(tr) => tr.participant.identity === speaker?.identity,
			),
		[cameraTracks, speaker],
	);

	// Track toggles
	const { toggle: toggleMic, enabled: micEnabled } = useTrackToggle({
		source: Track.Source.Microphone,
	});
	const { toggle: toggleCam, enabled: camEnabled } = useTrackToggle({
		source: Track.Source.Camera,
	});
	const { toggle: toggleScreen, enabled: screenEnabled } = useTrackToggle({
		source: Track.Source.ScreenShare,
	});

	// Activate mic on connect, camera reste sur l'état initial du LiveKitRoom.
	useEffect(() => {
		if (!localParticipant) return;
		localParticipant.setMicrophoneEnabled(true).catch(() => {});
	}, [localParticipant]);

	// Chrono depuis la connexion
	const startedAtRef = useRef<number | null>(null);
	if (startedAtRef.current === null) startedAtRef.current = Date.now();
	const [elapsed, setElapsed] = useState(0);
	useEffect(() => {
		const id = setInterval(() => {
			if (startedAtRef.current) {
				setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
			}
		}, 1000);
		return () => clearInterval(id);
	}, []);
	const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
	const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
	const ss = String(elapsed % 60).padStart(2, "0");
	const chrono = elapsed >= 3600 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;

	// Chat panel toggle
	const [chatOpen, setChatOpen] = useState(false);

	const speakerName =
		speaker?.name || speaker?.identity || t("meetings.speaker", "Intervenant");

	return (
		<div
			className="grid h-full w-full overflow-hidden bg-[#0a0d12] text-white"
			style={{ gridTemplateRows: "54px 1fr 88px" }}
		>
			{/* ═══ Top bar ═══ */}
			<header className="flex items-center justify-between gap-3 border-b border-white/5 px-5">
				<div className="flex items-center gap-3 min-w-0">
					{recording?.isRecording && (
						<div className="flex items-center gap-2 text-[13px]">
							<span className="h-2 w-2 rounded-full bg-destructive shadow-[0_0_12px_currentColor] text-destructive call-blink" />
							<span className="font-mono font-semibold">REC</span>
						</div>
					)}
					<span className="font-mono text-[13px] text-white/50">{chrono}</span>
					<span className="h-3.5 w-px bg-white/10" />
					<span className="text-[13px] text-white/70 truncate">
						{meetingTitle}
					</span>
				</div>
				<div className="flex items-center gap-2 shrink-0 text-[12px] text-white/60">
					<span className="flex items-center gap-1.5">
						<Users className="h-3.5 w-3.5" />
						{allParticipants.length}{" "}
						{allParticipants.length > 1 ? "participants" : "participant"}
					</span>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-7 gap-1.5 bg-white/6 hover:bg-white/12 text-white text-[12px]"
						disabled
						title={t("meetings.invite", "Inviter")}
					>
						<UserPlus className="h-3.5 w-3.5" />
						{t("meetings.invite", "Inviter")}
					</Button>
				</div>
			</header>

			{/* ═══ Stage ═══ */}
			<div className="grid min-h-0 gap-4 p-4" style={{ gridTemplateColumns: chatOpen ? "1fr 280px" : "1fr" }}>
				{/* Stage left : speaker hero + side tiles */}
				<div className="grid gap-3 min-h-0" style={{ gridTemplateColumns: others.length > 0 ? "2fr 1fr" : "1fr" }}>
					<SpeakerTile
						participant={speaker}
						trackRef={speakerVideoTrack}
						label={speakerName}
					/>
					{others.length > 0 && (
						<div className="grid gap-3 min-h-0" style={{ gridTemplateRows: `repeat(${Math.min(others.length, 3)}, 1fr)` }}>
							{others.slice(0, 3).map((p) => (
								<SideTile
									key={p.identity}
									participant={p}
									trackRef={cameraTracks.find((tr) => tr.participant.identity === p.identity)}
								/>
							))}
						</div>
					)}
				</div>

				{/* Right aside : agenda + chat */}
				{chatOpen && (
					<aside className="grid gap-3 min-h-0" style={{ gridTemplateRows: "auto 1fr" }}>
						<AgendaPanel />
						<MeetingChatPanel onClose={() => setChatOpen(false)} />
					</aside>
				)}
			</div>

			{/* ═══ Control dock ═══ */}
			<div className="flex items-center justify-center gap-2.5 border-t border-white/5 px-4">
				<DockButton
					icon={micEnabled ? Mic : MicOff}
					label={micEnabled ? t("meetings.microphone", "Micro") : t("meetings.muted", "Coupé")}
					onClick={() => toggleMic()}
					danger={!micEnabled}
				/>
				<DockButton
					icon={camEnabled ? Camera : CameraOff}
					label={camEnabled ? t("meetings.camera", "Caméra") : t("meetings.cameraOff", "Caméra off")}
					onClick={() => toggleCam()}
					danger={!camEnabled}
				/>
				<DockButton
					icon={screenEnabled ? MonitorX : MonitorUp}
					label={screenEnabled ? t("meetings.stopScreenShare", "Arrêter") : t("meetings.screenShare", "Partager")}
					onClick={() => toggleScreen()}
					active={screenEnabled}
				/>
				<DockButton
					icon={Users}
					label={t("meetings.participants", "Participants")}
					onClick={() => {}}
					disabled
				/>
				<DockButton
					icon={MessageSquare}
					label={t("meetings.discussion", "Discussion")}
					onClick={() => setChatOpen((v) => !v)}
					active={chatOpen}
				/>
				<DockButton
					icon={FileText}
					label={t("meetings.notes", "Notes")}
					onClick={() => {}}
					disabled
				/>
				{recording && (
					<DockButton
						icon={recording.isRecording ? MonitorX : MonitorUp}
						label={recording.isRecording ? "Arrêter REC" : "Enregistrer"}
						onClick={recording.onToggle}
						active={recording.isRecording}
						danger={recording.isRecording}
					/>
				)}
				<span className="mx-2 h-9 w-px bg-white/10" />
				<button
					type="button"
					onClick={onHangUp}
					className="h-12 px-5 rounded-xl bg-destructive text-destructive-foreground font-semibold text-[13px] flex items-center gap-2 hover:bg-destructive/90 transition-colors"
				>
					<LogOut className="h-4 w-4" />
					{t("meetings.leaveMeeting", "Quitter la réunion")}
				</button>
			</div>

			<RoomAudioRenderer />
		</div>
	);
}

// ════════════════════════════════════════════════════════════════════
// Tiles
// ════════════════════════════════════════════════════════════════════

function SpeakerTile({
	participant,
	trackRef,
	label,
}: {
	participant: Participant | undefined;
	trackRef: ReturnType<typeof useTracks>[number] | undefined;
	label: string;
}) {
	const initials = getInitials(label);
	const isSpeaking = participant?.isSpeaking ?? false;
	const micPub = participant
		?.getTrackPublications()
		.find((p) => p.source === Track.Source.Microphone);
	const micMuted = !micPub || micPub.isMuted;
	const gradient = participant
		? gradientForId(participant.identity)
		: TILE_GRADIENTS[0]!;
	const hasVideo = trackRef?.publication && !trackRef.publication.isMuted;

	return (
		<div
			className={cn(
				"relative rounded-2xl overflow-hidden bg-gradient-to-br flex items-center justify-center min-h-0",
				gradient,
			)}
		>
			{hasVideo && trackRef ? (
				<VideoTrack
					trackRef={trackRef}
					style={{
						position: "absolute",
						inset: 0,
						width: "100%",
						height: "100%",
						objectFit: "cover",
					}}
				/>
			) : (
				<div className="flex h-[172px] w-[172px] items-center justify-center rounded-full bg-gradient-to-br from-white to-[#cfe3f1] text-primary text-[54px] font-bold shadow-[0_24px_48px_rgba(0,0,0,0.35)]">
					{initials}
				</div>
			)}

			{/* Top-left : speaking pill */}
			<div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/45 backdrop-blur-sm px-2.5 py-1 text-[11px] font-medium border border-white/10">
				<span
					className={cn(
						"h-1.5 w-1.5 rounded-full",
						isSpeaking ? "bg-success" : "bg-white/40",
					)}
				/>
				{isSpeaking ? `${label.split(" ")[0]} parle` : label}
			</div>

			{/* Bottom-left : full name */}
			<div className="absolute bottom-3 left-3 text-[13px] font-semibold">
				{label}
			</div>

			{/* Bottom-right : mic indicator */}
			<div className="absolute bottom-3 right-3 rounded-full bg-black/45 backdrop-blur-sm p-1.5">
				{micMuted ? (
					<MicOff className="h-3 w-3" />
				) : (
					<Mic className="h-3 w-3" />
				)}
			</div>
		</div>
	);
}

function SideTile({
	participant,
	trackRef,
}: {
	participant: Participant;
	trackRef: ReturnType<typeof useTracks>[number] | undefined;
}) {
	const label = participant.name || participant.identity;
	const initials = getInitials(label);
	const micPub = participant
		.getTrackPublications()
		.find((p) => p.source === Track.Source.Microphone);
	const micMuted = !micPub || micPub.isMuted;
	const gradient = gradientForId(participant.identity);
	const hasVideo = trackRef?.publication && !trackRef.publication.isMuted;

	return (
		<div
			className={cn(
				"relative rounded-xl overflow-hidden bg-gradient-to-br flex items-center justify-center min-h-0",
				gradient,
			)}
		>
			{hasVideo && trackRef ? (
				<VideoTrack
					trackRef={trackRef}
					style={{
						position: "absolute",
						inset: 0,
						width: "100%",
						height: "100%",
						objectFit: "cover",
					}}
				/>
			) : (
				<div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/92 text-zinc-900 text-[18px] font-bold">
					{initials}
				</div>
			)}
			<div className="absolute bottom-2 left-2.5 text-[11px] font-semibold">
				{label}
			</div>
			<div className="absolute bottom-2 right-2.5 rounded-full bg-black/50 backdrop-blur-sm p-1">
				{micMuted ? (
					<MicOff className="h-2.5 w-2.5" />
				) : (
					<Mic className="h-2.5 w-2.5" />
				)}
			</div>
		</div>
	);
}

// ════════════════════════════════════════════════════════════════════
// Agenda panel — placeholder (pas de schéma backend)
// ════════════════════════════════════════════════════════════════════

function AgendaPanel() {
	return (
		<div className="rounded-2xl bg-white/4 border border-white/6 px-4 py-3">
			<p className="text-[11px] uppercase tracking-[0.12em] text-white/50 mb-2.5 font-medium">
				Ordre du jour
			</p>
			<p className="text-[12.5px] text-white/40 italic leading-snug">
				L'ordre du jour structuré sera disponible prochainement. En attendant,
				utilisez la discussion pour partager les points à aborder.
			</p>
		</div>
	);
}

// ════════════════════════════════════════════════════════════════════
// Dock button
// ════════════════════════════════════════════════════════════════════

function DockButton({
	icon: Icon,
	label,
	onClick,
	active = false,
	danger = false,
	disabled = false,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	onClick: () => void;
	active?: boolean;
	danger?: boolean;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className="flex flex-col items-center gap-1 disabled:opacity-50"
		>
			<span
				className={cn(
					"h-12 w-12 rounded-xl flex items-center justify-center transition-colors",
					danger
						? "bg-destructive/80 text-destructive-foreground hover:bg-destructive"
						: active
							? "bg-primary text-primary-foreground"
							: "bg-white/8 text-white hover:bg-white/14",
				)}
			>
				<Icon className="h-4.5 w-4.5" />
			</span>
			<span className="text-[10px] text-white/50">{label}</span>
		</button>
	);
}
