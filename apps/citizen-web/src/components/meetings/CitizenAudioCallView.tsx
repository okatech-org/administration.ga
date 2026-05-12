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
	Mic,
	MicOff,
	Pause,
	PhoneOff,
	Plus,
	Volume2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

interface CitizenAudioCallViewProps {
	onHangUp: () => void;
	/** Display name for the remote correspondent (org / agent name). */
	title?: string;
	/** Subtitle (e.g. "Ligne standard · Montréal"). */
	subtitle?: string;
	/** Optional context shown during the call (e.g. "Demande de visa long séjour"). */
	subject?: string;
	/** Caller dossier reference shown during ringing. */
	dossierRef?: string;
	/** When true, simulates the hold layout (used when agent puts citizen on hold). */
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

/**
 * CitizenAudioCallView — vue d'appel audio plein écran pour le citoyen.
 *
 * États couverts par les props :
 *  - sonnerie sortante (avant connexion) → grand avatar pulsant + carte "Vous appelez en tant que"
 *  - en communication → avatar + sujet en cours + barres "Sophie parle…"
 *  - mise en attente (isHeld) → avatar atténué + Pause overlay + estimation
 *
 * À monter dans un <LiveKitRoom>.
 */
export function CitizenAudioCallView({
	onHangUp,
	title,
	subtitle,
	subject,
	dossierRef,
	isHeld = false,
}: CitizenAudioCallViewProps) {
	const { t } = useTranslation();
	const connectionState = useConnectionState();
	const isConnected = connectionState === ConnectionState.Connected;

	const { localParticipant } = useLocalParticipant();
	const remoteParticipants = useRemoteParticipants();
	const hasRemote = remoteParticipants.length > 0;

	// Force micro ON dès la connexion établie.
	useEffect(() => {
		if (!isConnected || !localParticipant) return;
		localParticipant.setMicrophoneEnabled(true).catch(() => {});
	}, [isConnected, localParticipant]);

	const { toggle: toggleMic, enabled: micEnabled } = useTrackToggle({
		source: Track.Source.Microphone,
	});

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

	// Détecte le moment où le premier remote rejoint pour démarrer le timer.
	const answeredAtRef = useRef<number | null>(null);
	if (hasRemote && answeredAtRef.current === null) {
		answeredAtRef.current = Date.now();
	}
	if (!hasRemote && answeredAtRef.current !== null && !isHeld) {
		answeredAtRef.current = null;
	}
	const callTimer = useElapsedSince(answeredAtRef.current);

	// Timer général (depuis la connexion) pour l'état "Appel en cours…"
	const startedAtRef = useRef<number | null>(null);
	if (isConnected && startedAtRef.current === null) {
		startedAtRef.current = Date.now();
	}
	if (!isConnected) {
		startedAtRef.current = null;
	}
	const ringingTimer = useElapsedSince(startedAtRef.current);

	// Priorité au nom propre : `participant.name` puis le `title` passé par
	// le parent avant de tomber sur `participant.identity` (UUID interne
	// illisible — ex. "570rjg5chav..."). Sans cette préférence, on affichait
	// l'identity LiveKit côté UI quand le name n'était pas renseigné.
	const isLikelyIdentityHash = (v: string | undefined): boolean =>
		!!v && /^[a-z0-9_-]{16,}$/i.test(v) && !v.includes(" ");
	const candidateName = remoteParticipants[0]?.name;
	const remoteName =
		(candidateName && !isLikelyIdentityHash(candidateName) ? candidateName : null) ||
		title ||
		(candidateName ?? remoteParticipants[0]?.identity) ||
		t("meetings.yourCorrespondent", "Votre correspondant");
	const initials = getInitials(remoteName);

	// Indicateur "le remote parle"
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

			{/* Body — scène vidéo si caméra activée d'un côté ou de l'autre,
			    sinon la vue audio classique (avatar + nom + carte contextuelle). */}
			{showVideoStage ? (
				<div className="relative flex flex-1 min-h-0 overflow-hidden">
					{remoteCameraTrack ? (
						<VideoTrack
							trackRef={remoteCameraTrack}
							className="absolute inset-0 h-full w-full object-cover"
						/>
					) : (
						<div className="flex flex-1 items-center justify-center text-white/60 text-sm">
							{t("citizenCall.cameraOffRemote", "Caméra distante désactivée")}
						</div>
					)}
					<div className="absolute top-3 left-3 right-3 flex items-center justify-between">
						<span className="rounded-full bg-black/40 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
							{remoteName}
						</span>
					</div>
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

				{/* Carte contextuelle — varie selon l'état */}
				{!hasRemote && !isHeld && dossierRef && (
					<div className="mt-7 w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
						<p className="text-[10px] uppercase tracking-[0.12em] text-white/50 mb-1">
							{t("citizenCall.callingAs", "Vous appelez en tant que")}
						</p>
						<p className="text-sm font-medium text-white">{dossierRef}</p>
					</div>
				)}

				{hasRemote && !isHeld && subject && (
					<div className="mt-6 w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
						<div className="flex items-center justify-between mb-2">
							<span className="text-[10px] uppercase tracking-[0.12em] text-white/50">
								{t("citizenCall.currentSubject", "Sujet en cours")}
							</span>
							<span className="rounded-full bg-primary/25 text-primary-foreground px-2 py-0.5 text-[10px] font-medium">
								{subject}
							</span>
						</div>
						<div className="flex items-center gap-2.5 text-primary">
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
									? t("citizenCall.speakingNow", "{{name}} parle…", {
											name: remoteName.split(" ")[0],
										})
									: t("citizenCall.listening", "À l'écoute")}
							</span>
						</div>
					</div>
				)}

				{isHeld && (
					<div className="mt-7 w-full max-w-sm rounded-2xl border border-warning/30 bg-white/5 px-4 py-3">
						<div className="flex items-center justify-between mb-2">
							<span className="text-[10px] uppercase tracking-[0.12em] text-warning">
								{t("citizenCall.duringHold", "Pendant l'attente")}
							</span>
							<span className="text-[11px] text-white/60">
								{t("citizenCall.estimatedHold", "Estimation 1 min")}
							</span>
						</div>
						<div className="call-hold-shim">
							<span />
						</div>
					</div>
				)}
			</div>
			)}

			{/* Controls — 4 boutons : Micro / Caméra / Haut-parleur / Raccrocher */}
			<div className="grid grid-cols-4 gap-2 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-3 shrink-0">
				<CitizenCallControl
					icon={micEnabled ? Mic : MicOff}
					label={
						micEnabled
							? t("meetings.microphone", "Micro")
							: t("meetings.muted", "Muet")
					}
					onClick={() => toggleMic()}
					active={!micEnabled}
				/>
				<CitizenCallControl
					icon={cameraEnabled ? Camera : CameraOff}
					label={
						cameraEnabled
							? t("meetings.camera", "Caméra")
							: t("meetings.cameraOff", "Caméra off")
					}
					onClick={() => toggleCamera()}
					active={cameraEnabled}
				/>
				<CitizenCallControl
					icon={Volume2}
					label={t("citizenCall.speaker", "Haut-parleur")}
					onClick={() => {}}
					disabled
				/>
				<CitizenCallControl
					icon={PhoneOff}
					label={t("meetings.hangUp", "Raccrocher")}
					onClick={onHangUp}
					danger
				/>
			</div>

			{/* Audio renderer (required for audio playback) */}
			<RoomAudioRenderer />
		</div>
	);
}

function CitizenCallControl({
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

/**
 * Variante panneau (citizen desktop) — même information mais layout vertical
 * compact pour vivre dans un panneau 460px à droite du dashboard.
 *
 * Réutilise le même contenu hero + carte de contexte mais ajoute un état
 * "pré-appel" et "ended" (récap) gérés par CallEndedSummary.
 */
export { CitizenAudioCallView as default };
