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
	useTracks,
	useTrackToggle,
	VideoTrack,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import { Camera, CameraOff, Mic, MicOff, Pause, PhoneOff, Volume2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@workspace/ui/lib/utils";

function describeCameraError(err: unknown): string {
	const name = (err as { name?: string } | null)?.name ?? "";
	if (name === "NotAllowedError" || name === "PermissionDeniedError") {
		return "Accès à la caméra refusé — autorisez-la dans la barre d'adresse du navigateur.";
	}
	if (name === "NotFoundError" || name === "DevicesNotFoundError") {
		return "Aucune caméra détectée — branchez un périphérique vidéo.";
	}
	if (name === "NotReadableError" || name === "TrackStartError") {
		return "Caméra indisponible — un autre logiciel l'utilise peut-être.";
	}
	return "Impossible d'activer la caméra. Vérifiez les permissions du navigateur.";
}

function describeMicError(err: unknown): string {
	const name = (err as { name?: string } | null)?.name ?? "";
	if (name === "NotAllowedError" || name === "PermissionDeniedError") {
		return "Accès au micro refusé — autorisez-le dans la barre d'adresse du navigateur, puis rechargez la page.";
	}
	if (name === "NotFoundError" || name === "DevicesNotFoundError") {
		return "Aucun micro détecté — branchez un périphérique audio.";
	}
	if (name === "NotReadableError" || name === "TrackStartError") {
		return "Micro indisponible — un autre logiciel l'utilise peut-être.";
	}
	return "Impossible d'activer le micro. Vérifiez les permissions du navigateur.";
}

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

	// Suit la dernière erreur micro pour n'afficher qu'un seul toast par cause
	// (NotAllowedError → message permission, etc.) et éviter le spam.
	const lastMicErrorRef = useRef<string | null>(null);
	const surfaceMicError = useCallback((err: unknown) => {
		const msg = describeMicError(err);
		if (lastMicErrorRef.current === msg) return;
		lastMicErrorRef.current = msg;
		toast.error(msg);
	}, []);

	useEffect(() => {
		if (!isConnected || !localParticipant) return;
		localParticipant
			.setMicrophoneEnabled(true)
			.then(() => {
				lastMicErrorRef.current = null;
			})
			.catch((err) => surfaceMicError(err));
	}, [isConnected, localParticipant, surfaceMicError]);

	const { toggle: toggleMicRaw, enabled: micEnabled } = useTrackToggle({
		source: Track.Source.Microphone,
	});
	const toggleMic = useCallback(async () => {
		try {
			await toggleMicRaw();
			lastMicErrorRef.current = null;
		} catch (err) {
			surfaceMicError(err);
		}
	}, [toggleMicRaw, surfaceMicError]);

	// Caméra — initialement OFF, activable à la volée par l'utilisateur.
	const { toggle: toggleCameraRaw, enabled: cameraEnabled } = useTrackToggle({
		source: Track.Source.Camera,
	});
	const lastCameraErrorRef = useRef<string | null>(null);
	const toggleCamera = useCallback(async () => {
		try {
			await toggleCameraRaw();
			lastCameraErrorRef.current = null;
		} catch (err) {
			const msg = describeCameraError(err);
			if (lastCameraErrorRef.current === msg) return;
			lastCameraErrorRef.current = msg;
			toast.error(msg);
		}
	}, [toggleCameraRaw]);

	// Détecte la piste vidéo du correspondant — si elle existe on bascule la
	// vue body en "mode vidéo" : grand écran cam distante + PiP cam locale.
	const cameraTracks = useTracks([Track.Source.Camera], {
		onlySubscribed: false,
	});
	const remoteCameraTrack = useMemo(
		() =>
			cameraTracks.find(
				(t) =>
					t.participant.identity !== localParticipant?.identity &&
					!t.publication.isMuted,
			),
		[cameraTracks, localParticipant?.identity],
	);
	const localCameraTrack = useMemo(
		() =>
			cameraTracks.find(
				(t) => t.participant.identity === localParticipant?.identity,
			),
		[cameraTracks, localParticipant?.identity],
	);
	const showVideoStage = !!remoteCameraTrack || cameraEnabled;

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

	// Priorité au nom propre : LiveKit `participant.name` puis le `title`
	// passé par le parent (ex. "Berny Itoutou") avant de tomber sur
	// `participant.identity` qui est un UUID interne illisible. Sans cette
	// préférence, on affichait des chaînes type "570rjg5chav..." côté UI.
	const isLikelyIdentityHash = (v: string | undefined): boolean =>
		!!v && /^[a-z0-9_-]{16,}$/i.test(v) && !v.includes(" ");
	const candidateName = remoteParticipants[0]?.name;
	const remoteName =
		(candidateName && !isLikelyIdentityHash(candidateName) ? candidateName : null) ||
		title ||
		(candidateName ?? remoteParticipants[0]?.identity) ||
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

			{/* Body — avatar/nom OU scène vidéo (cam distante grand format + PiP local) */}
			{showVideoStage ? (
				<div className="relative flex flex-1 min-h-0 overflow-hidden">
					{remoteCameraTrack ? (
						<VideoTrack
							trackRef={remoteCameraTrack}
							className="absolute inset-0 h-full w-full object-cover"
						/>
					) : (
						<div className="flex flex-1 items-center justify-center text-white/60 text-sm">
							{t("directCall.cameraOffRemote", "Caméra distante désactivée")}
						</div>
					)}

					{/* Overlay nom du correspondant */}
					<div className="absolute top-3 left-3 right-3 flex items-center justify-between">
						<span className="rounded-full bg-black/40 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
							{remoteName}
						</span>
					</div>

					{/* PiP caméra locale */}
					{localCameraTrack && cameraEnabled && (
						<div className="absolute bottom-3 right-3 h-28 w-20 overflow-hidden rounded-xl border border-white/20 shadow-lg">
							<VideoTrack
								trackRef={localCameraTrack}
								className="h-full w-full object-cover -scale-x-100"
							/>
						</div>
					)}
				</div>
			) : (
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
			)}

			{/* Controls — 4 boutons : Micro / Caméra / Haut-parleur / Raccrocher */}
			<div className="grid grid-cols-4 gap-2 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-3 shrink-0">
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
					icon={cameraEnabled ? Camera : CameraOff}
					label={
						cameraEnabled
							? t("meetings.camera", "Caméra")
							: t("meetings.cameraOff", "Caméra off")
					}
					onClick={() => toggleCamera()}
					active={cameraEnabled}
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
			<span className="text-[10px] text-white/70 font-medium text-center leading-tight">{label}</span>
		</button>
	);
}
