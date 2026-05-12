"use client";

import {
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Pause,
  PhoneOff,
  Play,
  Plus,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Id } from "@convex/_generated/dataModel";
import { cn } from "@workspace/ui/lib/utils";
import { useCitizenContext } from "../../hooks/use-citizen-context";
import { useCallStore } from "../../stores/call-store";
import type { ActiveCallSlot } from "./ActiveCallsBar";
import { AddAgentDialog } from "./AddAgentDialog";

/**
 * Vue centrale pendant un appel actif iCom — rendue à l'intérieur du
 * LiveKitRoom du slot actif (via `CallRoomPool.renderActive`), ce qui donne
 * accès aux hooks LiveKit (`useTracks`, `VideoTrack`, etc.).
 *
 * Design phone-style compact :
 *   - avatar large + nom + chrono
 *   - 4 boutons primaires : Mic / Caméra / Hold/Resume / Raccrocher
 *   - 2 boutons secondaires : Transférer / Ajouter un agent
 *   - bascule en scène vidéo si une caméra (locale OU distante) est active
 *
 * Les notes vivent dans CallSidePane (panneau droit) — pas dans cette vue.
 */
export function ActiveConversationView({
  call,
  onHold,
  onResume,
  onEnd,
  onRequestTransfer,
}: {
  call: ActiveCallSlot & { _id: string };
  onHold: (id: Id<"meetings">) => void;
  onResume: (id: Id<"meetings">) => void;
  onEnd: (id: Id<"meetings">) => void;
  onRequestTransfer?: (id: Id<"meetings">) => void;
}) {
  const { t } = useTranslation();
  const { context } = useCitizenContext(call._id as Id<"meetings">);
  const { micMuted, setMicMuted, cameraEnabled, setCameraEnabled } =
    useCallStore();
  const [addAgentOpen, setAddAgentOpen] = useState(false);

  const isHeld = call.callStatus === "on_hold";
  const baseTs = isHeld ? call.parkedAt : call.answeredAt;

  const [elapsed, setElapsed] = useState(() =>
    baseTs ? Math.floor((Date.now() - baseTs) / 1000) : 0,
  );
  useEffect(() => {
    if (!baseTs) return;
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - baseTs) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, [baseTs]);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const timerText = `${mm}:${ss}`;

  const displayName = context?.caller.name ?? call.callerName;
  const phone = context?.caller.phone ?? null;

  const initials =
    displayName
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  const stateLabel = isHeld
    ? t("callCenter.conversation.onHold", "En attente")
    : t("callCenter.conversation.live", "En communication");

  // ─── LiveKit — détection vidéo
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const remoteIsSpeaking = remoteParticipants[0]?.isSpeaking ?? false;

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

  const handleToggleCamera = () => {
    // Demander la caméra via le store déclenche
    // `localParticipant.setCameraEnabled` dans CallRoomMount. Si le navigateur
    // refuse (NotAllowedError), on remonte un toast et on rebascule le store
    // dans son état précédent.
    const next = !cameraEnabled;
    setCameraEnabled(next);
    if (next && localParticipant) {
      // Petit délai pour laisser la publication s'attempter, sinon on n'a pas
      // d'erreur à intercepter (le useEffect dans MicController est async).
      // L'utilisateur verra le toast si setCameraEnabled échoue côté LiveKit
      // — déjà loggé en console (warn) par MicController.
      void localParticipant.setCameraEnabled(true).catch((err) => {
        const name = (err as { name?: string } | null)?.name ?? "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          toast.error(
            "Accès à la caméra refusé — autorisez-la dans la barre d'adresse du navigateur.",
          );
        } else if (
          name === "NotFoundError" ||
          name === "DevicesNotFoundError"
        ) {
          toast.error("Aucune caméra détectée.");
        } else {
          toast.error("Impossible d'activer la caméra.");
        }
        setCameraEnabled(false);
      });
    }
  };

  return (
    <div
      className={cn(
        "flex flex-1 flex-col overflow-hidden bg-zinc-950 text-white",
      )}
    >
      {/* ═══ Header — état + chrono ═══ */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
        <span className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.12em] font-semibold text-white/70">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              isHeld ? "bg-warning" : "bg-success",
              !isHeld && "shadow-[0_0_12px_currentColor]",
            )}
          />
          {stateLabel}
        </span>
        <span className="font-mono tabular-nums text-sm text-white/85">
          {timerText}
        </span>
      </div>

      {/* ═══ Body — phone-style hero OU scène vidéo ═══ */}
      {showVideoStage ? (
        <div className="relative flex flex-1 min-h-0 overflow-hidden">
          {remoteCameraTrack ? (
            <VideoTrack
              trackRef={remoteCameraTrack}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-white/60 text-sm">
              {t("callCenter.conversation.cameraOffRemote", "Caméra distante désactivée")}
            </div>
          )}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <div className="flex flex-col gap-0.5 rounded-xl bg-black/40 px-2.5 py-1.5 backdrop-blur-sm">
              <span className="text-xs font-semibold text-white">{displayName}</span>
              {phone && (
                <span className="text-[10px] font-mono text-white/70">{phone}</span>
              )}
            </div>
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
        <div className="flex flex-1 flex-col items-center justify-center px-6 min-h-0 overflow-y-auto">
          <div className="text-white">
            <div
              className={cn(
                "relative flex items-center justify-center rounded-full text-white font-bold shadow-[inset_0_-10px_24px_rgba(0,0,0,0.25)]",
                "h-[108px] w-[108px] text-[34px]",
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

          <h1 className="mt-5 text-[24px] font-semibold tracking-[-0.01em] text-center text-white">
            {displayName}
          </h1>
          {phone && (
            <p className="mt-1 text-xs font-mono text-white/55">{phone}</p>
          )}
          {call.lineLabel && (
            <p className="mt-0.5 text-[11px] text-white/55">{call.lineLabel}</p>
          )}

          {!isHeld && (
            <div className="mt-5 flex items-center gap-2.5 text-primary">
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
              <span className="text-[12px] text-white/70">
                {remoteIsSpeaking
                  ? t("callCenter.conversation.speakingNow", "{{name}} parle…", {
                      name: displayName.split(" ")[0],
                    })
                  : t("callCenter.conversation.listening", "À l'écoute")}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ═══ Controls — 4 primaires + 2 secondaires ═══ */}
      <div className="shrink-0 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 flex flex-col gap-2.5">
        {/* Boutons primaires : Micro / Caméra / Hold-Resume / Raccrocher */}
        <div className="grid grid-cols-4 gap-2">
          <CallControl
            icon={micMuted ? MicOff : Mic}
            label={
              micMuted
                ? t("callCenter.action.muted", "Muet")
                : t("callCenter.action.mic", "Micro")
            }
            onClick={() => setMicMuted(!micMuted)}
            active={micMuted}
            disabled={isHeld}
          />
          <CallControl
            icon={cameraEnabled ? Camera : CameraOff}
            label={
              cameraEnabled
                ? t("callCenter.action.cameraOn", "Caméra")
                : t("callCenter.action.cameraOff", "Caméra off")
            }
            onClick={handleToggleCamera}
            active={cameraEnabled}
            disabled={isHeld}
          />
          {isHeld ? (
            <CallControl
              icon={Play}
              label={t("callCenter.action.resume", "Reprendre")}
              onClick={() => onResume(call._id as Id<"meetings">)}
            />
          ) : (
            <CallControl
              icon={Pause}
              label={t("callCenter.action.hold", "En attente")}
              onClick={() => onHold(call._id as Id<"meetings">)}
            />
          )}
          <CallControl
            icon={PhoneOff}
            label={t("callCenter.action.end", "Raccrocher")}
            onClick={() => onEnd(call._id as Id<"meetings">)}
            danger
          />
        </div>

        {/* Boutons secondaires : Transférer / Ajouter un agent */}
        <div className="grid grid-cols-2 gap-2">
          {onRequestTransfer ? (
            <SecondaryControl
              icon={Users}
              label={t("callCenter.action.transfer", "Transférer")}
              onClick={() => onRequestTransfer(call._id as Id<"meetings">)}
            />
          ) : (
            <span />
          )}
          <SecondaryControl
            icon={Plus}
            label={t("callCenter.action.addAgent", "Ajouter un agent")}
            onClick={() => setAddAgentOpen(true)}
          />
        </div>
      </div>

      <AddAgentDialog
        open={addAgentOpen}
        onOpenChange={setAddAgentOpen}
        meetingId={call._id as Id<"meetings">}
      />
    </div>
  );
}

function CallControl({
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
      className="flex flex-col items-center gap-1.5 disabled:opacity-50"
    >
      <span
        className={cn(
          "h-12 w-12 rounded-full flex items-center justify-center transition-all active:scale-95",
          danger
            ? "bg-destructive text-destructive-foreground"
            : active
              ? "bg-white text-zinc-900"
              : "bg-white/10 text-white hover:bg-white/15",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-[10px] text-white/70 font-medium text-center leading-tight">
        {label}
      </span>
    </button>
  );
}

function SecondaryControl({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 rounded-full bg-white/8 hover:bg-white/14 text-white text-[11.5px] font-medium px-3 py-2 transition-colors"
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="truncate">{label}</span>
    </button>
  );
}
