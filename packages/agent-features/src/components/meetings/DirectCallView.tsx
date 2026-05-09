"use client";

/**
 * DirectCallView — vue d'appel direct (1:1) plein écran type téléphone iOS,
 * utilisée par CallButton (agent appelle un collègue ou un citoyen) et par
 * GlobalCallAlert pour les appels personnels (callUser).
 *
 * Style fidèle à la maquette `citizen-mobile.jsx > CitizenInCall` mais rendue
 * dans un Dialog/Sheet (donc largeur fixe, pas de fullscreen iOS).
 *
 * À monter À L'INTÉRIEUR d'un <LiveKitRoom>.
 */

import {
	RoomAudioRenderer,
	useConnectionState,
	useLocalParticipant,
	useRemoteParticipants,
	useTrackToggle,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import { Mic, MicOff, Pause, PhoneOff, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@workspace/ui/lib/utils";

interface DirectCallViewProps {
	onHangUp: () => void;
	/** Nom de la personne appelée / qui appelle (titre principal). */
	title?: string;
	/** Sous-titre (rôle, ligne, etc.). */
	subtitle?: string;
	/** Indique l'état hold (mise en attente). */
	isHeld?: boolean;
}

function useElapsedSince(startTs: number | null) {
	const [elapsed, setElapsed] = useState(0);
	useEffect(() => {
		if (!startTs) {
			setElapsed(0);
			return;
		}
		const tick = () => setElapsed(Math.floor((Date.now() - startTs) / 1000));
		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	}, [startTs]);
	const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
	const ss = String(elapsed % 60).padStart(2, "0");
	return `${mm}:${ss}`;
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

export function DirectCallView({
	onHangUp,
	title,
	subtitle,
	isHeld = false,
}: DirectCallViewProps) {
	const { t } = useTranslation();
	const connectionState = useConnectionState();
	const isConnected = connectionState === ConnectionState.Connected;

	const { localParticipant } = useLocalParticipant();
	const remoteParticipants = useRemoteParticipants();
	const hasRemote = remoteParticipants.length > 0;

	useEffect(() => {
		if (!isConnected || !localParticipant) return;
		localParticipant.setMicrophoneEnabled(true).catch(() => {});
	}, [isConnected, localParticipant]);

	const { toggle: toggleMic, enabled: micEnabled } = useTrackToggle({
		source: Track.Source.Microphone,
	});

	const answeredAtRef = useRef<number | null>(null);
	if (hasRemote && answeredAtRef.current === null) {
		answeredAtRef.current = Date.now();
	}
	if (!hasRemote && answeredAtRef.current !== null && !isHeld) {
		answeredAtRef.current = null;
	}
	const callTimer = useElapsedSince(answeredAtRef.current);

	const startedAtRef = useRef<number | null>(null);
	if (isConnected && startedAtRef.current === null) {
		startedAtRef.current = Date.now();
	}
	if (!isConnected) {
		startedAtRef.current = null;
	}
	const ringingTimer = useElapsedSince(startedAtRef.current);

	const remoteName =
		remoteParticipants[0]?.name ||
		remoteParticipants[0]?.identity ||
		title ||
		t("meetings.yourCorrespondent", "Votre correspondant");
	const initials = getInitials(remoteName);

	const remoteIsSpeaking = remoteParticipants[0]?.isSpeaking ?? false;

	const stateLabel = isHeld
		? t("meetings.onHold", "Mise en attente")
		: hasRemote
			? t("meetings.connected", "En communication")
			: t("meetings.ringing", "Appel en cours…");

	const stateDotColor = isHeld
		? "bg-warning"
		: hasRemote
			? "bg-success"
			: "bg-primary";

	return (
		<div
			className={cn(
				"flex h-full w-full flex-col overflow-hidden select-none",
				isHeld ? "call-hero-dark-warm" : "call-hero-dark",
			)}
		>
			{/* Header — état + chrono */}
			<div className="flex items-center justify-between px-6 pt-5 pb-2 shrink-0">
				<span className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] font-semibold text-white/70">
					<span
						className={cn(
							"h-1.5 w-1.5 rounded-full",
							stateDotColor,
							!hasRemote && !isHeld && "shadow-[0_0_12px_currentColor]",
						)}
					/>
					{stateLabel}
				</span>
				<span className="font-mono tabular-nums text-sm text-white/80">
					{hasRemote ? callTimer : ringingTimer}
				</span>
			</div>

			{/* Body — avatar + nom */}
			<div className="flex flex-1 flex-col items-center px-6 pt-8 pb-6 min-h-0 overflow-y-auto">
				<div
					className={cn(
						"text-white",
						!hasRemote && !isHeld && "av-ring",
					)}
				>
					<div
						className={cn(
							"relative flex items-center justify-center rounded-full text-white font-bold shadow-[inset_0_-10px_24px_rgba(0,0,0,0.25)]",
							hasRemote ? "h-[108px] w-[108px] text-[34px]" : "h-32 w-32 text-[40px]",
							"bg-gradient-to-br from-primary via-primary/70 to-primary/30",
						)}
					>
						{initials}
						{isHeld && (
							<span className="absolute inset-0 rounded-full bg-black/45 flex items-center justify-center">
								<Pause className="h-10 w-10 text-white" fill="currentColor" />
							</span>
						)}
					</div>
				</div>

				<h1 className="mt-5 text-[26px] font-semibold tracking-[-0.01em] text-center text-white">
					{remoteName}
				</h1>
				{subtitle && (
					<p className="mt-1 text-sm text-white/60 text-center">{subtitle}</p>
				)}

				{/* Indicateur "X parle…" */}
				{hasRemote && !isHeld && (
					<div className="mt-7 flex items-center gap-2.5 text-primary">
						<span
							className={cn(
								"call-bars-anim",
								!remoteIsSpeaking && "opacity-30",
							)}
						>
							{Array.from({ length: 7 }).map((_, i) => (
								<span key={i} />
							))}
						</span>
						<span className="text-[13px] text-white/70">
							{remoteIsSpeaking
								? t("directCall.speakingNow", "{{name}} parle…", {
										name: remoteName.split(" ")[0],
									})
								: t("directCall.listening", "À l'écoute")}
						</span>
					</div>
				)}
			</div>

			{/* Controls */}
			<div className="grid grid-cols-3 gap-3 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-3 shrink-0">
				<DirectCallControl
					icon={micEnabled ? Mic : MicOff}
					label={
						micEnabled
							? t("meetings.microphone", "Micro")
							: t("meetings.muted", "Muet")
					}
					onClick={() => toggleMic()}
					active={!micEnabled}
				/>
				<DirectCallControl
					icon={Volume2}
					label={t("directCall.speaker", "Haut-parleur")}
					onClick={() => {}}
					disabled
				/>
				<DirectCallControl
					icon={PhoneOff}
					label={t("meetings.hangUp", "Raccrocher")}
					onClick={onHangUp}
					danger
				/>
			</div>

			<RoomAudioRenderer />
		</div>
	);
}

function DirectCallControl({
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
			className="flex flex-col items-center gap-2 disabled:opacity-50"
		>
			<span
				className={cn(
					"h-14 w-14 rounded-full flex items-center justify-center transition-all active:scale-95",
					danger
						? "bg-destructive text-destructive-foreground"
						: active
							? "bg-white text-zinc-900"
							: "bg-white/10 text-white hover:bg-white/15",
				)}
			>
				<Icon className="h-6 w-6" />
			</span>
			<span className="text-[11px] text-white/70 font-medium">{label}</span>
		</button>
	);
}
