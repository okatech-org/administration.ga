/**
 * iBoîte — Messagerie Consulaire Sécurisée
 *
 * Single unified Card filling full height: Sidebar | Mail list | Detail
 * Reference: Mailbox UI with border dividers, no gaps.
 * Mobile: stacked views with back navigation.
 *
 * Adapted from agent-web/src/routes/_app/iboite.tsx
 */

import { api } from "@convex/_generated/api"
import type { Doc, Id } from "@convex/_generated/dataModel"
import {
  MailFolder,
  MailOwnerType,
  MailType,
  OrganizationType,
  PackageStatus,
} from "@convex/lib/constants"
import { LiveKitRoom } from "@livekit/components-react"
import { useMutation } from "convex/react"
import type { Locale } from "date-fns"
import { format, formatDistanceToNow } from "date-fns"
import { enUS, fr } from "date-fns/locale"
import {
  Archive,
  ArrowLeft,
  BadgeCheck,
  Building2,
  Check,
  CheckCheck,
  ChevronsUpDown,
  Handshake,
  Inbox,
  Landmark,
  Loader2,
  Mail,
  MoreVertical,
  Package,
  Paperclip,
  PenLine,
  Phone,
  PhoneCall,
  PhoneMissed,
  PhoneOff,
  Reply,
  Send,
  Star,
  Trash2,
  Truck,
  User,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import React, { useCallback, useEffect, useId, useMemo, useState } from "react"
import { cn } from "../../lib/utils"

// Official org types — shown with a special badge
const OFFICIAL_ORG_TYPES = new Set([
  OrganizationType.Embassy,
  OrganizationType.HighRepresentation,
  OrganizationType.GeneralConsulate,
  OrganizationType.HighCommission,
  OrganizationType.PermanentMission,
])

const OWNER_TYPE_ICONS: Record<string, typeof User> = {
  [MailOwnerType.Profile]: User,
  [MailOwnerType.Organization]: Landmark,
  [MailOwnerType.Association]: Handshake,
  [MailOwnerType.Company]: Building2,
}

import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { ScrollArea } from "@workspace/ui/components/scroll-area"

import { Separator } from "@workspace/ui/components/separator"
import { Sheet, SheetContent } from "@workspace/ui/components/sheet"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  useAuthenticatedConvexQuery,
  useAuthenticatedPaginatedQuery,
  useConvexMutationQuery,
  useConvexActionQuery,
} from "../../hooks/useConvexHooks"

// ── Inline useIsMobile (Electron desktop — will usually return false) ───────

const MOBILE_BREAKPOINT = 768

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

// ── Inline useMeeting hook (adapted for desktop hooks) ──────────────────────

function useMeeting(meetingId?: Id<"meetings">) {
  const [token, setToken] = useState<string | null>(null)
  const [wsUrl, setWsUrl] = useState<string | null>(null)
  const [roomName, setRoomName] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: meeting } = useAuthenticatedConvexQuery(
    api.functions.meetings.get,
    meetingId ? { meetingId } : "skip"
  )

  const joinMeetingMutation = useConvexMutationQuery(
    api.functions.meetings.join
  )
  const leaveMeetingMutation = useConvexMutationQuery(
    api.functions.meetings.leave
  )
  const requestTokenAction = useConvexActionQuery(
    api.actions.livekit.requestToken
  )

  const connect = useCallback(
    async (id: Id<"meetings">) => {
      try {
        setIsConnecting(true)
        setError(null)
        await joinMeetingMutation.mutateAsync({ meetingId: id })
        const result = await requestTokenAction.mutateAsync({ meetingId: id })
        setToken(result.token)
        setWsUrl(result.wsUrl)
        setRoomName(result.roomName)
      } catch (err) {
        setError((err as Error).message)
        console.error("Failed to connect to meeting:", err)
      } finally {
        setIsConnecting(false)
      }
    },
    [joinMeetingMutation, requestTokenAction]
  )

  const disconnect = useCallback(
    async (id: Id<"meetings">) => {
      try {
        await leaveMeetingMutation.mutateAsync({ meetingId: id })
        setToken(null)
        setWsUrl(null)
        setRoomName(null)
      } catch (err) {
        console.error("Failed to leave meeting:", err)
      }
    },
    [leaveMeetingMutation]
  )

  return {
    meeting: meeting ?? null,
    token,
    wsUrl,
    roomName,
    isConnecting,
    error,
    connect,
    disconnect,
  }
}

// ── Inline CustomCallUI (from agent-web/src/components/meetings/custom-call-ui.tsx) ──

import {
  RoomAudioRenderer,
  useConnectionState,
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
  useTrackToggle,
  VideoTrack,
} from "@livekit/components-react"
import { ConnectionState, Track } from "livekit-client"
import {
  Camera,
  CameraOff,
  ChevronDown,
  ChevronUp,
  Mic,
  MicOff,
  Wifi,
  WifiOff,
} from "lucide-react"

function useCallTimer(isConnected: boolean) {
  const [elapsed, setElapsed] = useState(0)
  const startRef = React.useRef<number | null>(null)

  useEffect(() => {
    if (!isConnected) {
      startRef.current = null
      setElapsed(0)
      return
    }
    startRef.current = Date.now()
    const interval = setInterval(() => {
      if (startRef.current) {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [isConnected])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function AvatarTile({
  name,
  isMuted,
  isLocal,
  size = "lg",
}: {
  name: string
  isMuted: boolean
  isLocal: boolean
  size?: "sm" | "lg"
}) {
  const { t } = useTranslation()
  const isSmall = size === "sm"

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div
          className={`flex items-center justify-center rounded-full bg-zinc-800 ${isSmall ? "h-12 w-12" : "h-20 w-20 md:h-24 md:w-24"}`}
        >
          <User
            className={`text-zinc-500 ${isSmall ? "h-6 w-6" : "h-10 w-10 md:h-12 md:w-12"}`}
          />
        </div>
        {!isSmall && (
          <span className="text-sm font-medium text-zinc-300">{name}</span>
        )}
        {!isSmall && isMuted && (
          <span className="flex items-center gap-1 text-xs text-rose-400">
            <MicOff className="h-3 w-3" />
            {t("meetings.muted", "Micro coupe")}
          </span>
        )}
      </div>
      {isLocal && !isSmall && (
        <span className="absolute top-2 left-2 rounded-full bg-zinc-800/80 px-2 py-0.5 text-xs text-zinc-300">
          {t("meetings.you", "Vous")}
        </span>
      )}
    </div>
  )
}

function ConnectionBadge({
  state,
  isWaiting,
}: {
  state: ConnectionState
  isWaiting: boolean
}) {
  const { t } = useTranslation()

  const config: Record<
    string,
    {
      label: string
      color: string
      icon: React.ComponentType<{ className?: string }>
      pulse: boolean
    }
  > = {
    connected: isWaiting
      ? {
          label: t("meetings.waiting", "En attente..."),
          color: "text-amber-400",
          icon: Loader2,
          pulse: true,
        }
      : {
          label: t("meetings.connected", "Connecte"),
          color: "text-emerald-400",
          icon: Wifi,
          pulse: false,
        },
    connecting: {
      label: t("meetings.connecting", "Connexion..."),
      color: "text-amber-400",
      icon: Loader2,
      pulse: true,
    },
    reconnecting: {
      label: t("meetings.reconnecting", "Reconnexion..."),
      color: "text-amber-400",
      icon: WifiOff,
      pulse: true,
    },
    disconnected: {
      label: t("meetings.disconnected", "Deconnecte"),
      color: "text-zinc-500",
      icon: WifiOff,
      pulse: false,
    },
  }

  const c = config[state] ?? config.disconnected
  const StatusIcon = c.icon

  return (
    <span
      className={`flex items-center gap-1 text-xs ${c.color} ${c.pulse ? "animate-pulse" : ""}`}
    >
      <StatusIcon
        className={`h-3 w-3 ${isWaiting && state === ConnectionState.Connected ? "animate-spin" : ""}`}
      />
      {c.label}
    </span>
  )
}

function ControlButton({
  onClick,
  active,
  danger,
  icon: Icon,
  label,
  pending,
}: {
  onClick: () => void
  active: boolean
  danger?: boolean
  icon: React.ComponentType<{ className?: string }>
  label: string
  pending?: boolean
}) {
  const buttonClasses = danger
    ? "w-14 h-14 rounded-full flex items-center justify-center bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30"
    : active
      ? "w-14 h-14 rounded-full flex items-center justify-center bg-zinc-700 hover:bg-zinc-600 text-white"
      : "w-14 h-14 rounded-full flex items-center justify-center bg-rose-600/80 hover:bg-rose-700 text-white"

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 transition-all duration-200 active:scale-95"
    >
      <div className={buttonClasses}>
        {pending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Icon className="h-5 w-5" />
        )}
      </div>
      <span className="text-[10px] font-medium text-zinc-400">{label}</span>
    </button>
  )
}

function CustomCallUI({
  onHangUp,
  title,
}: {
  onHangUp?: () => void
  title?: string
}) {
  const { t } = useTranslation()
  const connectionState = useConnectionState()
  const isConnected = connectionState === ConnectionState.Connected
  const timer = useCallTimer(isConnected)

  const { localParticipant } = useLocalParticipant()
  const remoteParticipants = useRemoteParticipants()

  const cameraTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  )

  const {
    toggle: toggleMic,
    enabled: micEnabled,
    pending: micPending,
  } = useTrackToggle({ source: Track.Source.Microphone })

  const {
    toggle: toggleCamera,
    enabled: cameraEnabled,
    pending: cameraPending,
  } = useTrackToggle({ source: Track.Source.Camera })

  const handleHangUp = useCallback(() => {
    onHangUp?.()
  }, [onHangUp])

  const [pipVisible, setPipVisible] = useState(true)

  const localCameraTrack = cameraTracks.find(
    (tr) =>
      tr.participant.identity === localParticipant?.identity &&
      tr.source === Track.Source.Camera
  )
  const remoteCameraTracks = cameraTracks.filter(
    (tr) =>
      tr.participant.identity !== localParticipant?.identity &&
      tr.source === Track.Source.Camera
  )

  const hasRemote = remoteParticipants.length > 0
  const currentRemoteName =
    remoteParticipants[0]?.name || remoteParticipants[0]?.identity || null

  const lastRemoteNameRef = React.useRef<string | null>(null)
  if (currentRemoteName) {
    lastRemoteNameRef.current = currentRemoteName
  }
  const remoteName =
    currentRemoteName ||
    lastRemoteNameRef.current ||
    t("meetings.participant", "Participant")

  const displayTitle = (() => {
    if (hasRemote) return remoteName
    if (lastRemoteNameRef.current) return lastRemoteNameRef.current
    if (title) {
      const cleaned = title.replace(/^Appel\s*[-\u2014\u2013]\s*/i, "").trim()
      const localName = localParticipant?.name
      if (localName && cleaned === localName) {
        return t("meetings.yourCorrespondent", "Votre correspondant")
      }
      return cleaned || title
    }
    return t("meetings.yourCorrespondent", "Votre correspondant")
  })()

  const remoteTrack = remoteCameraTracks[0]
  const remoteHasVideo =
    remoteTrack?.publication &&
    !remoteTrack.publication.isMuted &&
    remoteTrack.publication.track
  const remoteAudioMuted = remoteTrack
    ? !remoteTrack.participant
        .getTrackPublications()
        .find((p) => p.source === Track.Source.Microphone && !p.isMuted)
    : false

  const localHasVideo =
    localCameraTrack?.publication &&
    !localCameraTrack.publication.isMuted &&
    localCameraTrack.publication.track

  return (
    <div className="flex h-[80dvh] w-full flex-col overflow-hidden bg-zinc-950 text-white select-none md:h-full">
      {/* Header */}
      <div className="z-20 flex shrink-0 items-center justify-between border-b border-zinc-900 bg-zinc-950/90 px-4 py-2.5 backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-400" />
          <span className="truncate text-sm font-semibold">{displayTitle}</span>
          {isConnected && (
            <span className="shrink-0 font-mono text-xs text-zinc-400 tabular-nums">
              {timer}
            </span>
          )}
        </div>
        <ConnectionBadge state={connectionState} isWaiting={!hasRemote} />
      </div>

      {/* Video Area */}
      <div className="relative min-h-0 flex-1">
        {hasRemote ? (
          <>
            <div className="absolute inset-0 md:relative md:flex md:h-full md:gap-2 md:p-3">
              {/* Remote video (main) */}
              <div className="relative h-full w-full overflow-hidden rounded-none bg-zinc-900 md:flex-1 md:rounded-2xl">
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
                <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
                  <span className="rounded-lg bg-zinc-900/80 px-2 py-1 text-xs text-white backdrop-blur-sm">
                    {remoteName}
                  </span>
                  {remoteAudioMuted && (
                    <span className="rounded-full bg-rose-600/80 p-1">
                      <MicOff className="h-3 w-3 text-white" />
                    </span>
                  )}
                </div>
              </div>

              {/* Local video (PiP on mobile, side panel on desktop) */}
              <div className="absolute right-3 bottom-20 z-10 md:relative md:right-auto md:bottom-auto md:h-auto md:w-auto md:flex-1">
                <button
                  type="button"
                  onClick={() => setPipVisible((v) => !v)}
                  className="absolute -top-8 right-0 z-30 flex items-center gap-1 rounded-t-lg bg-zinc-900/80 px-2 py-0.5 text-[10px] text-zinc-300 backdrop-blur-sm md:hidden"
                >
                  {pipVisible ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronUp className="h-3 w-3" />
                  )}
                  {pipVisible
                    ? t("meetings.hide", "Masquer")
                    : t("meetings.show", "Afficher")}
                </button>
                <div
                  className={`h-36 w-28 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl transition-all duration-200 md:h-full md:w-auto md:rounded-2xl md:border-0 md:shadow-none ${pipVisible ? "scale-100 opacity-100" : "pointer-events-none scale-75 opacity-0 md:pointer-events-auto md:scale-100 md:opacity-100"}`}
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
                  <span className="absolute top-1.5 left-1.5 z-20 rounded-md bg-zinc-900/80 px-1.5 py-0.5 text-[10px] text-zinc-300 backdrop-blur-sm md:top-2 md:left-2 md:px-2 md:py-1 md:text-xs">
                    {t("meetings.you", "Vous")}
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Waiting State: no remote yet */
          <div className="flex h-full items-center justify-center p-6">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="relative flex items-center justify-center">
                <div className="absolute h-32 w-32 animate-ping rounded-full bg-emerald-500/15" />
                <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full border-2 border-emerald-500/30 bg-zinc-800 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                  <User className="h-12 w-12 text-emerald-400/80" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold tracking-tight text-white">
                  {displayTitle}
                </h3>
                <p className="flex items-center justify-center gap-2 text-sm text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                  {t(
                    "meetings.callingStatus",
                    "Appel en cours, veuillez patienter..."
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="z-20 shrink-0 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-center gap-8">
          <ControlButton
            onClick={() => toggleMic()}
            active={micEnabled}
            icon={micEnabled ? Mic : MicOff}
            label={
              micEnabled
                ? t("meetings.microphone", "Micro")
                : t("meetings.muted", "Coupe")
            }
            pending={micPending}
          />
          <ControlButton
            onClick={() => toggleCamera()}
            active={cameraEnabled}
            icon={cameraEnabled ? Camera : CameraOff}
            label={
              cameraEnabled
                ? t("meetings.camera", "Camera")
                : t("meetings.cameraOff", "Camera off")
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

      <RoomAudioRenderer />
    </div>
  )
}

// ── Types ────────────────────────────────────────────────────────────────────

type ViewKey =
  | "inbox"
  | "starred"
  | "sent"
  | "archive"
  | "trash"
  | "packages"
  | "calls"
type MailFolderKey = Exclude<ViewKey, "packages" | "calls">

const MAIL_FOLDERS: { key: ViewKey; icon: typeof Inbox }[] = [
  { key: "inbox", icon: Inbox },
  { key: "starred", icon: Star },
  { key: "sent", icon: Send },
  { key: "archive", icon: Archive },
  { key: "trash", icon: Trash2 },
]

// ── Main Page ────────────────────────────────────────────────────────────────

export function IBoitePage() {
  const { t, i18n } = useTranslation()
  const dateFnsLocale = i18n.language === "fr" ? fr : enUS

  const [activeView, setActiveView] = useState<ViewKey>("inbox")
  const [selectedMailId, setSelectedMailId] =
    useState<Id<"digitalMail"> | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [replyData, setReplyData] = useState<{
    recipientOwnerId: string
    recipientOwnerType: string
    recipientName: string
    subject: string
    quotedContent: string
    threadId?: string
    inReplyTo?: Id<"digitalMail">
  } | null>(null)

  // Active account (mailbox entity)
  const [activeOwnerId, setActiveOwnerId] = useState<string | undefined>(
    undefined
  )
  const [activeOwnerType, setActiveOwnerType] = useState<string | undefined>(
    undefined
  )

  const isPackageView = activeView === "packages"
  const isCallsView = activeView === "calls"
  const isMailView = !isPackageView && !isCallsView

  // ── Data fetching ──────────────────────────────────────────────────────

  // Accounts with unread counts for the sidebar selector
  const { data: accounts } = useAuthenticatedConvexQuery(
    api.functions.digitalMail.getAccountsWithUnread,
    {}
  )

  const folderFilterArg = {
    ...(activeView === "starred"
      ? {}
      : isMailView
        ? { folder: activeView as MailFolder }
        : {}),
    ...(activeOwnerId
      ? {
          ownerId: activeOwnerId as any,
          ownerType: activeOwnerType as any,
        }
      : {}),
  }

  const {
    results: mailItems,
    status: mailPaginationStatus,
    loadMore: loadMoreMail,
  } = useAuthenticatedPaginatedQuery(
    api.functions.digitalMail.list,
    isMailView ? folderFilterArg : "skip",
    { initialNumItems: 30 }
  )

  const { data: unreadCount } = useAuthenticatedConvexQuery(
    api.functions.digitalMail.getUnreadCount,
    activeOwnerId
      ? {
          ownerId: activeOwnerId as any,
          ownerType: activeOwnerType as any,
        }
      : {}
  )

  const { data: packages } = useAuthenticatedConvexQuery(
    api.functions.deliveryPackages.listByUser,
    {}
  )

  // ── Mutations ──────────────────────────────────────────────────────────

  const { mutateAsync: markReadMutation } = useConvexMutationQuery(
    api.functions.digitalMail.markRead
  )
  const { mutateAsync: toggleStarMutation } = useConvexMutationQuery(
    api.functions.digitalMail.toggleStar
  )
  const { mutateAsync: moveMailMutation } = useConvexMutationQuery(
    api.functions.digitalMail.move
  )
  const { mutateAsync: removeMailMutation } = useConvexMutationQuery(
    api.functions.digitalMail.remove
  )
  const { mutateAsync: sendMailMutation } = useConvexMutationQuery(
    api.functions.sendMail.send
  )

  // ── Derived data ───────────────────────────────────────────────────────

  const filteredMail = useMemo(() => {
    if (activeView === "starred") return mailItems.filter((m) => m.isStarred)
    return mailItems
  }, [mailItems, activeView])

  const selectedMail = useMemo(() => {
    if (!selectedMailId) return null
    return filteredMail.find((m) => m._id === selectedMailId) ?? null
  }, [filteredMail, selectedMailId])

  const packageStats = useMemo(() => {
    if (!packages) return { inTransit: 0, available: 0, total: 0 }
    return {
      inTransit: packages.filter((p) => p.status === PackageStatus.InTransit)
        .length,
      available: packages.filter((p) => p.status === PackageStatus.Available)
        .length,
      total: packages.length,
    }
  }, [packages])

  // ── Actions ────────────────────────────────────────────────────────────

  const handleSelectMail = async (mailId: Id<"digitalMail">) => {
    setSelectedMailId(mailId)
    const mail = filteredMail.find((m) => m._id === mailId)
    if (mail && !mail.isRead) {
      try {
        await markReadMutation({ id: mailId })
      } catch {
        /* noop */
      }
    }
  }

  const handleToggleStar = async (mailId: Id<"digitalMail">) => {
    try {
      const result = await toggleStarMutation({ id: mailId })
      toast.success(result ? t("iboite.starred") : t("iboite.unstarred"))
    } catch {
      toast.error(t("iboite.error"))
    }
  }

  const handleArchive = async (mailId: Id<"digitalMail">) => {
    try {
      await moveMailMutation({ id: mailId, folder: MailFolder.Archive })
      if (selectedMailId === mailId) setSelectedMailId(null)
      toast.success(t("iboite.moved"))
    } catch {
      toast.error(t("iboite.error"))
    }
  }

  const handleTrash = async (mailId: Id<"digitalMail">) => {
    try {
      await moveMailMutation({ id: mailId, folder: MailFolder.Trash })
      if (selectedMailId === mailId) setSelectedMailId(null)
      toast.success(t("iboite.moved"))
    } catch {
      toast.error(t("iboite.error"))
    }
  }

  const handleDelete = async (mailId: Id<"digitalMail">) => {
    try {
      await removeMailMutation({ id: mailId })
      if (selectedMailId === mailId) setSelectedMailId(null)
      toast.success(t("iboite.deleted"))
    } catch {
      toast.error(t("iboite.error"))
    }
  }

  const switchView = (view: ViewKey) => {
    setActiveView(view)
    setSelectedMailId(null)
  }

  const isMailLoading =
    isMailView && mailPaginationStatus === "LoadingFirstPage"

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4 lg:p-6">
      <div className="shrink-0">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-start justify-between gap-4 md:flex-row"
        >
          <div className="flex items-start gap-2">
            <div>
              <h1 className="flex items-center gap-2 text-lg font-bold md:text-xl">
                <div className="rounded-lg bg-teal-500/10 p-1.5">
                  <Mail className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                iBoite
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Messagerie consulaire securisee
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Mobile: folder chips */}
      <div className="scrollbar-none flex shrink-0 gap-1 overflow-x-auto rounded-xl border border-border/50 bg-card p-1 lg:hidden">
        {MAIL_FOLDERS.map(({ key, icon: Icon }) => (
          <button
            type="button"
            key={key}
            onClick={() => switchView(key)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
              activeView === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            <Icon className="size-3.5" />
            {t(`iboite.folders.${key}`)}
            {key === "inbox" && unreadCount != null && unreadCount > 0 && (
              <span className="rounded-full bg-primary-foreground/20 px-1.5 text-[10px]">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={() => switchView("packages")}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
            activeView === "packages"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          <Package className="size-3.5" />
          {t("iboite.tabs.packages")}
          {packageStats.total > 0 && (
            <span className="rounded-full bg-primary-foreground/20 px-1.5 text-[10px]">
              {packageStats.total}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => switchView("calls")}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
            activeView === "calls"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          <Phone className="size-3.5" />
          {t("iboite.tabs.calls")}
        </button>
      </div>

      {/* Mobile: compose + account selector */}
      <div className="flex shrink-0 items-center gap-2 lg:hidden">
        <Button
          onClick={() => setComposeOpen(true)}
          size="sm"
          className="gap-2"
        >
          <PenLine className="size-4" />
          {t("iboite.actions.compose")}
        </Button>
        {accounts && accounts.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                {(() => {
                  const activeAcct = accounts.find(
                    (a) => a.ownerId === activeOwnerId
                  )
                  const Icon = activeAcct
                    ? (OWNER_TYPE_ICONS[activeAcct.ownerType] ?? User)
                    : User
                  return <Icon className="size-4" />
                })()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {accounts.map((acct) => {
                const Icon = OWNER_TYPE_ICONS[acct.ownerType] ?? Mail
                const isActive =
                  activeOwnerId === acct.ownerId ||
                  (!activeOwnerId && acct.ownerType === MailOwnerType.Profile)
                return (
                  <DropdownMenuItem
                    key={acct.ownerId}
                    onClick={() => {
                      setActiveOwnerId(acct.ownerId)
                      setActiveOwnerType(acct.ownerType)
                      setSelectedMailId(null)
                    }}
                    className={cn(isActive && "bg-primary/10 text-primary")}
                  >
                    <Icon className="mr-2 size-4" />
                    <span className="truncate">{acct.name}</span>
                    {acct.unreadCount > 0 && (
                      <Badge
                        variant="default"
                        className="ml-auto flex h-5 min-w-5 items-center justify-center text-[10px]"
                      >
                        {acct.unreadCount}
                      </Badge>
                    )}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Mobile: stacked content */}
      <div className="min-h-0 flex-1 pb-16 lg:hidden">
        {isCallsView ? (
          <CallsList dateFnsLocale={dateFnsLocale} />
        ) : isPackageView ? (
          <PackageList
            packages={packages ?? []}
            dateFnsLocale={dateFnsLocale}
          />
        ) : isMailLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {selectedMail ? (
              <motion.div
                key="detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
              >
                <MailDetail
                  mail={selectedMail}
                  dateFnsLocale={dateFnsLocale}
                  onBack={() => setSelectedMailId(null)}
                  onArchive={handleArchive}
                  onTrash={handleTrash}
                  onDelete={handleDelete}
                  onToggleStar={handleToggleStar}
                  onReply={(mail) => {
                    setReplyData({
                      recipientOwnerId: mail.sender.entityId,
                      recipientOwnerType: mail.sender.entityType,
                      recipientName: mail.sender.name,
                      subject: mail.subject?.startsWith("Re: ")
                        ? mail.subject
                        : `Re: ${mail.subject || t("iboite.mail.noSubject")}`,
                      quotedContent: `\n\n--- ${t("iboite.reply.originalMessage")} ---\n${mail.sender.name} (${format(new Date(mail.createdAt), "d MMM yyyy, HH:mm", { locale: dateFnsLocale })}):\n${mail.content}`,
                      threadId: mail.threadId || mail._id,
                      inReplyTo: mail._id,
                    })
                    setComposeOpen(true)
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <MailListInner
                  mails={filteredMail}
                  selectedMailId={selectedMailId}
                  onSelectMail={handleSelectMail}
                  onToggleStar={handleToggleStar}
                  dateFnsLocale={dateFnsLocale}
                  activeFolder={activeView as MailFolderKey}
                  paginationStatus={mailPaginationStatus}
                  onLoadMore={() => loadMoreMail(30)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Desktop: single unified card filling remaining height */}
      <Card className="hidden min-h-0 flex-1 overflow-hidden p-0 lg:flex lg:flex-row">
        {/* Sidebar */}
        <aside className="flex w-full max-w-56 flex-col border-r">
          {/* Compose button */}
          <div className="p-3">
            <Button
              className="w-full gap-2"
              onClick={() => setComposeOpen(true)}
            >
              <PenLine className="size-4" />
              {t("iboite.actions.compose")}
            </Button>
          </div>

          <Separator />

          {/* Account selector */}
          {accounts && accounts.length > 0 && (
            <>
              <div className="space-y-0.5 p-2">
                <p className="px-3 py-1 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                  {t("iboite.accounts.title")}
                </p>
                {accounts.map((acct) => (
                  <button
                    type="button"
                    key={acct.ownerId}
                    onClick={() => {
                      setActiveOwnerId(acct.ownerId)
                      setActiveOwnerType(acct.ownerType)
                      setSelectedMailId(null)
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                      activeOwnerId === acct.ownerId
                        ? "bg-primary/10 font-medium text-primary"
                        : !activeOwnerId &&
                            acct.ownerType === MailOwnerType.Profile
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {(() => {
                        const Icon = OWNER_TYPE_ICONS[acct.ownerType] ?? Mail
                        return <Icon className="size-4 shrink-0" />
                      })()}
                      <span className="truncate">{acct.name}</span>
                      {acct.orgType &&
                        OFFICIAL_ORG_TYPES.has(
                          acct.orgType as OrganizationType
                        ) && (
                          <Badge
                            variant="secondary"
                            className="h-4 shrink-0 gap-0.5 px-1 text-[9px]"
                          >
                            <BadgeCheck className="size-3" />
                            {t("iboite.accounts.official")}
                          </Badge>
                        )}
                    </span>
                    {acct.unreadCount > 0 && (
                      <Badge
                        variant="default"
                        className="flex h-5 min-w-5 items-center justify-center text-[10px]"
                      >
                        {acct.unreadCount}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
              <Separator className="mx-2" />
            </>
          )}

          <nav className="space-y-0.5 p-2">
            {MAIL_FOLDERS.map(({ key, icon: Icon }) => (
              <button
                type="button"
                key={key}
                onClick={() => switchView(key)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                  activeView === key
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="size-4" />
                  {t(`iboite.folders.${key}`)}
                </span>
                {key === "inbox" && unreadCount != null && unreadCount > 0 && (
                  <Badge
                    variant="default"
                    className="flex h-5 min-w-5 items-center justify-center text-[10px]"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </button>
            ))}
          </nav>

          <Separator className="mx-2" />

          <div className="p-2">
            <p className="px-3 py-1 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              {t("iboite.tabs.packages")}
            </p>
            <button
              type="button"
              onClick={() => switchView("packages")}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                activeView === "packages"
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <span className="flex items-center gap-2.5">
                <Package className="size-4" />
                {t("iboite.packages.title")}
              </span>
              {packageStats.total > 0 && (
                <Badge
                  variant="secondary"
                  className="flex h-5 min-w-5 items-center justify-center text-[10px]"
                >
                  {packageStats.total}
                </Badge>
              )}
            </button>

            {packageStats.total > 0 && (
              <div className="mt-2 space-y-1 px-3">
                {packageStats.inTransit > 0 && (
                  <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                    <Truck className="size-3" />
                    <span>
                      {packageStats.inTransit}{" "}
                      {t("iboite.packages.inTransit").toLowerCase()}
                    </span>
                  </div>
                )}
                {packageStats.available > 0 && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                    <Package className="size-3" />
                    <span>
                      {packageStats.available}{" "}
                      {t("iboite.packages.available").toLowerCase()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Calls section */}
          <div className="p-2">
            <p className="px-3 py-1 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              {t("iboite.tabs.calls")}
            </p>
            <button
              type="button"
              onClick={() => switchView("calls")}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                activeView === "calls"
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <span className="flex items-center gap-2.5">
                <Phone className="size-4" />
                {t("iboite.calls.title")}
              </span>
            </button>
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1">
          {/* Main content area */}
          {isCallsView ? (
            <div className="flex-1 overflow-auto p-4">
              <CallsList dateFnsLocale={dateFnsLocale} />
            </div>
          ) : isPackageView ? (
            <div className="flex-1 overflow-auto p-4">
              <PackageList
                packages={packages ?? []}
                dateFnsLocale={dateFnsLocale}
              />
            </div>
          ) : isMailLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Mail list -- fixed width column with its own scroll */}
              <div
                className={cn(
                  "flex min-h-0 flex-col border-r",
                  selectedMail ? "w-80 shrink-0" : "flex-1"
                )}
              >
                <MailListInner
                  mails={filteredMail}
                  selectedMailId={selectedMailId}
                  onSelectMail={handleSelectMail}
                  onToggleStar={handleToggleStar}
                  dateFnsLocale={dateFnsLocale}
                  activeFolder={activeView as MailFolderKey}
                  paginationStatus={mailPaginationStatus}
                  onLoadMore={() => loadMoreMail(30)}
                />
              </div>

              {/* Detail -- fills remaining space, or placeholder */}
              <div className="min-h-0 min-w-0 flex-1">
                {selectedMail ? (
                  <MailDetail
                    mail={selectedMail}
                    dateFnsLocale={dateFnsLocale}
                    onBack={() => setSelectedMailId(null)}
                    onArchive={handleArchive}
                    onTrash={handleTrash}
                    onDelete={handleDelete}
                    onToggleStar={handleToggleStar}
                    onReply={(mail) => {
                      setReplyData({
                        recipientOwnerId: mail.sender.entityId,
                        recipientOwnerType: mail.sender.entityType,
                        recipientName: mail.sender.name,
                        subject: mail.subject?.startsWith("Re: ")
                          ? mail.subject
                          : `Re: ${mail.subject || t("iboite.mail.noSubject")}`,
                        quotedContent: `\n\n--- ${t("iboite.reply.originalMessage")} ---\n${mail.sender.name} (${format(new Date(mail.createdAt), "d MMM yyyy, HH:mm", { locale: dateFnsLocale })}):\n${mail.content}`,
                        threadId: mail.threadId || mail._id,
                        inReplyTo: mail._id,
                      })
                      setComposeOpen(true)
                    }}
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                    <Mail className="mb-3 size-12 text-muted-foreground/20" />
                    <h3 className="text-sm font-medium text-muted-foreground">
                      {t("iboite.mail.selectToRead")}
                    </h3>
                    <p className="mt-1 max-w-[240px] text-xs text-muted-foreground/70">
                      {t("iboite.mail.selectToReadDesc")}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </Card>

      {/* Compose Dialog */}
      <ComposeDialog
        open={composeOpen}
        onOpenChange={(open) => {
          setComposeOpen(open)
          if (!open) setReplyData(null)
        }}
        onSend={sendMailMutation}
        accounts={accounts ?? []}
        initialData={replyData}
      />
    </div>
  )
}

// ── ComposeDialog ────────────────────────────────────────────────────────────

type Account = {
  ownerId: string
  ownerType: string
  name: string
  logoUrl?: string
  orgType?: string
  unreadCount: number
}

function ComposeDialog({
  open,
  onOpenChange,
  onSend,
  accounts,
  initialData,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSend: (args: any) => Promise<any>
  accounts: Account[]
  initialData?: {
    recipientOwnerId: string
    recipientOwnerType: string
    recipientName: string
    subject: string
    quotedContent: string
    threadId?: string
    inReplyTo?: Id<"digitalMail">
  } | null
}) {
  const { t } = useTranslation()
  const [subject, setSubject] = useState("")
  const [content, setContent] = useState("")
  const [senderAccountIdx, setSenderAccountIdx] = useState(0)
  const [sending, setSending] = useState(false)

  // Recipient search state
  const [recipientSearch, setRecipientSearch] = useState("")
  const [recipientPopoverOpen, setRecipientPopoverOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<MailOwnerType | null>(null)
  const [selectedRecipient, setSelectedRecipient] = useState<{
    ownerId: string
    ownerType: string
    name: string
  } | null>(null)
  const subjectId = useId()
  const contentId = useId()

  // Debounced search query
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleRecipientSearchChange = (value: string) => {
    setRecipientSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300)
  }

  // Pre-fill fields when opening as a reply
  React.useEffect(() => {
    if (open && initialData) {
      setSelectedRecipient({
        ownerId: initialData.recipientOwnerId,
        ownerType: initialData.recipientOwnerType,
        name: initialData.recipientName,
      })
      setSubject(initialData.subject)
      setContent(initialData.quotedContent)
    } else if (!open) {
      setSubject("")
      setContent("")
      setSelectedRecipient(null)
      setRecipientSearch("")
      setDebouncedSearch("")
      setTypeFilter(null)
    }
  }, [open, initialData])

  const searchArgs =
    debouncedSearch.trim().length >= 2
      ? { query: debouncedSearch.trim(), ...(typeFilter ? { typeFilter } : {}) }
      : ("skip" as const)
  const { data: searchResults } = useAuthenticatedConvexQuery(
    api.functions.digitalMail.searchRecipients,
    searchArgs
  )

  const senderAccount = accounts[senderAccountIdx]

  const handleSend = async () => {
    if (!selectedRecipient || !content.trim()) {
      toast.error(
        t(
          "iboite.compose.fillRequired",
          "Veuillez remplir les champs obligatoires"
        )
      )
      return
    }
    setSending(true)
    try {
      await onSend({
        senderOwnerId: senderAccount?.ownerId,
        senderOwnerType: senderAccount?.ownerType,
        recipientOwnerId: selectedRecipient.ownerId,
        recipientOwnerType: selectedRecipient.ownerType,
        type: MailType.Email,
        subject: subject.trim() || t("iboite.mail.noSubject"),
        ...(initialData?.threadId ? { threadId: initialData.threadId } : {}),
        ...(initialData?.inReplyTo ? { inReplyTo: initialData.inReplyTo } : {}),
      })

      toast.success(t("iboite.compose.sent"))
      setSubject("")
      setContent("")
      setSelectedRecipient(null)
      setRecipientSearch("")
      setDebouncedSearch("")
      setTypeFilter(null)
      onOpenChange(false)
    } catch {
      toast.error(t("iboite.error"))
    } finally {
      setSending(false)
    }
  }

  // Translate raw enum subtitles from backend
  const subtitleLabels: Record<string, string> = {
    // OrganizationType
    embassy: t("orgs.type.embassy"),
    high_representation: t("orgs.type.highRepresentation"),
    general_consulate: t("orgs.type.generalConsulate"),
    high_commission: t("orgs.type.highCommission"),
    permanent_mission: t("orgs.type.permanentMission"),
    third_party: t("orgs.type.thirdParty"),
    // AssociationType
    cultural: t("associations.type.cultural"),
    sports: t("associations.type.sports"),
    religious: t("associations.type.religious"),
    professional: t("associations.type.professional"),
    solidarity: t("associations.type.solidarity"),
    education: t("associations.type.education"),
    youth: t("associations.type.youth"),
    women: t("associations.type.women"),
    student: t("associations.type.student"),
    // ActivitySector
    technology: t("companies.sector.technology"),
    commerce: t("companies.sector.commerce"),
    services: t("companies.sector.services"),
    industry: t("companies.sector.industry"),
    agriculture: t("companies.sector.agriculture"),
    health: t("companies.sector.health"),
    culture: t("companies.sector.culture"),
    tourism: t("companies.sector.tourism"),
    transport: t("companies.sector.transport"),
    construction: t("companies.sector.construction"),
    // Common
    other: t("common.other"),
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-dvh overflow-y-auto sm:max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="size-5" />
            {t("iboite.actions.compose")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Sender selector */}
          {accounts.length > 1 && (
            <div className="space-y-2">
              <Label>{t("iboite.compose.from")}</Label>
              <select
                aria-label={t("iboite.compose.from")}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={senderAccountIdx}
                onChange={(e) => setSenderAccountIdx(Number(e.target.value))}
              >
                {accounts.map((acct, i) => (
                  <option key={acct.ownerId} value={i}>
                    {acct.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {/* Recipient picker with search */}
          <div className="space-y-2">
            <Label>{t("iboite.compose.to")}</Label>
            {/* Type filter chips */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { value: null, label: t("iboite.compose.filterAll") },
                {
                  value: MailOwnerType.Profile,
                  label: t("iboite.compose.filterProfiles"),
                  icon: User,
                },
                {
                  value: MailOwnerType.Organization,
                  label: t("iboite.compose.filterOrgs"),
                  icon: Landmark,
                },
                {
                  value: MailOwnerType.Association,
                  label: t("iboite.compose.filterAssocs"),
                  icon: Handshake,
                },
                {
                  value: MailOwnerType.Company,
                  label: t("iboite.compose.filterCompanies"),
                  icon: Building2,
                },
              ].map((chip) => {
                const isActive = typeFilter === chip.value
                const ChipIcon = chip.icon
                return (
                  <Button
                    key={chip.value ?? "all"}
                    type="button"
                    size="sm"
                    variant={isActive ? "default" : "outline"}
                    className="h-7 gap-1 rounded-full px-3 text-xs"
                    onClick={() => setTypeFilter(chip.value)}
                  >
                    {ChipIcon && <ChipIcon className="size-3" />}
                    {chip.label}
                  </Button>
                )
              })}
            </div>
            <Popover
              open={recipientPopoverOpen}
              onOpenChange={setRecipientPopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={recipientPopoverOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedRecipient ? (
                    <span className="flex items-center gap-2 truncate">
                      {(() => {
                        const Icon =
                          OWNER_TYPE_ICONS[selectedRecipient.ownerType] ?? Mail
                        return <Icon className="size-4" />
                      })()}
                      {selectedRecipient.name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {t(
                        "iboite.compose.recipientPlaceholder",
                        "Rechercher un destinataire..."
                      )}
                    </span>
                  )}
                  <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
              >
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder={t(
                      "iboite.compose.searchRecipient",
                      "Rechercher par nom..."
                    )}
                    value={recipientSearch}
                    onValueChange={handleRecipientSearchChange}
                  />
                  <CommandList>
                    {debouncedSearch.trim().length < 2 ? (
                      <CommandEmpty>
                        {t(
                          "iboite.compose.typeToSearch",
                          "Tapez au moins 2 caracteres..."
                        )}
                      </CommandEmpty>
                    ) : !searchResults ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : searchResults.length === 0 ? (
                      <CommandEmpty>
                        {t("iboite.compose.noResults")}
                      </CommandEmpty>
                    ) : (
                      <CommandGroup>
                        {searchResults.map((result: any) => {
                          const Icon =
                            OWNER_TYPE_ICONS[result.ownerType] ?? Mail
                          return (
                            <CommandItem
                              key={result.ownerId}
                              value={result.ownerId}
                              onSelect={() => {
                                setSelectedRecipient({
                                  ownerId: result.ownerId,
                                  ownerType: result.ownerType,
                                  name: result.name,
                                })
                                setRecipientPopoverOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedRecipient?.ownerId === result.ownerId
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <Icon className="mr-2 size-4 text-muted-foreground" />
                              <div className="flex min-w-0 flex-col">
                                <span className="truncate text-sm">
                                  {result.name}
                                </span>
                                {result.subtitle && (
                                  <span className="truncate text-xs text-muted-foreground">
                                    {subtitleLabels[result.subtitle] ??
                                      result.subtitle}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">{t("iboite.compose.subject")}</Label>
            <Input
              id={subjectId}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t(
                "iboite.compose.subjectPlaceholder",
                "Objet du message"
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">{t("iboite.compose.message")}</Label>
            <Textarea
              id={contentId}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t(
                "iboite.compose.messagePlaceholder",
                "Ecrivez votre message..."
              )}
              rows={8}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sending}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSend} disabled={sending} className="gap-2">
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {t("iboite.compose.send")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── MailListInner (no Card wrapper -- lives inside the unified card) ──────────

function MailListInner({
  mails,
  selectedMailId,
  onSelectMail,
  onToggleStar,
  dateFnsLocale,
  activeFolder,
  paginationStatus,
  onLoadMore,
}: {
  mails: Doc<"digitalMail">[]
  selectedMailId: Id<"digitalMail"> | null
  onSelectMail: (id: Id<"digitalMail">) => void
  onToggleStar: (id: Id<"digitalMail">) => void
  dateFnsLocale: Locale
  activeFolder: MailFolderKey
  paginationStatus: string
  onLoadMore: () => void
}) {
  const { t } = useTranslation()

  if (mails.length === 0) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-6 text-center">
        <Inbox className="mb-3 size-12 text-muted-foreground/20" />
        <h3 className="text-sm font-medium text-muted-foreground">
          {t(`iboite.empty.${activeFolder}`)}
        </h3>
        <p className="mt-1 max-w-[240px] text-xs text-muted-foreground/70">
          {t(`iboite.empty.${activeFolder}Desc`)}
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="min-h-full flex-1">
      <div className="divide-y">
        {mails.map((mail) => (
          <button
            type="button"
            key={mail._id}
            onClick={() => onSelectMail(mail._id)}
            className={cn(
              "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
              selectedMailId === mail._id && "bg-primary/5",
              !mail.isRead && "bg-primary/2"
            )}
          >
            <div className="w-2 shrink-0 pt-2">
              {!mail.isRead && (
                <div className="size-2 rounded-full bg-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    "truncate text-sm",
                    !mail.isRead && "font-semibold"
                  )}
                >
                  {mail.sender?.name ?? "\u2014"}
                </p>
                <span className="shrink-0 text-[11px] whitespace-nowrap text-muted-foreground">
                  {formatDistanceToNow(new Date(mail.createdAt), {
                    addSuffix: false,
                    locale: dateFnsLocale,
                  })}
                </span>
              </div>
              <p
                className={cn(
                  "mt-0.5 truncate text-sm",
                  !mail.isRead
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {mail.subject || t("iboite.mail.noSubject")}
              </p>
              {mail.preview && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground/70">
                  {mail.preview}
                </p>
              )}
              {mail.attachments && mail.attachments.length > 0 && (
                <div className="mt-1 flex items-center gap-1">
                  <Paperclip className="size-3 text-muted-foreground/50" />
                  <span className="text-[11px] text-muted-foreground/50">
                    {mail.attachments.length}
                  </span>
                </div>
              )}
            </div>
            <button
              type="button"
              aria-label={
                mail.isStarred ? "Retirer des favoris" : "Ajouter aux favoris"
              }
              onClick={(e) => {
                e.stopPropagation()
                onToggleStar(mail._id)
              }}
              className="shrink-0 pt-1"
            >
              <Star
                className={cn(
                  "size-4 transition-colors",
                  mail.isStarred
                    ? "fill-amber-400 text-amber-400"
                    : "text-transparent hover:text-muted-foreground/30"
                )}
              />
            </button>
          </button>
        ))}
      </div>

      {paginationStatus === "CanLoadMore" && (
        <div className="border-t p-3 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            className="text-xs"
          >
            {t("iboite.actions.loadMore")}
          </Button>
        </div>
      )}
      {paginationStatus === "LoadingMore" && (
        <div className="flex justify-center border-t p-3">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </ScrollArea>
  )
}

// ── MailDetail ───────────────────────────────────────────────────────────────

function MailDetail({
  mail,
  dateFnsLocale,
  onBack,
  onArchive,
  onTrash,
  onDelete,
  onToggleStar,
  onReply,
}: {
  mail: Doc<"digitalMail">
  dateFnsLocale: Locale
  onBack: () => void
  onArchive: (id: Id<"digitalMail">) => void
  onTrash: (id: Id<"digitalMail">) => void
  onDelete: (id: Id<"digitalMail">) => void
  onToggleStar: (id: Id<"digitalMail">) => void
  onReply: (mail: Doc<"digitalMail">) => void
}) {
  const { t } = useTranslation()

  // Thread query -- fetch all messages in the same thread
  const threadArgs = mail.threadId
    ? { threadId: mail.threadId }
    : ("skip" as const)
  const { data: threadMessages } = useAuthenticatedConvexQuery(
    api.functions.digitalMail.getThread,
    threadArgs
  )

  // If we have thread data with 2+ messages, show conversation view
  const hasThread = threadMessages && threadMessages.length > 1

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="size-4" />
          <span className="lg:hidden">{t("iboite.actions.back")}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onReply(mail)}
          className="gap-1.5"
          title={t("iboite.actions.reply")}
        >
          <Reply className="size-4" />
          <span className="hidden sm:inline">{t("iboite.actions.reply")}</span>
        </Button>

        <div className="flex items-center gap-0.5">
          {/* Desktop: individual action buttons */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden size-8 sm:inline-flex"
            onClick={() => onArchive(mail._id)}
            title={t("iboite.actions.archive")}
          >
            <Archive className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden size-8 sm:inline-flex"
            onClick={() => onTrash(mail._id)}
            title={t("iboite.actions.delete")}
          >
            <Trash2 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden size-8 sm:inline-flex"
            onClick={() => onToggleStar(mail._id)}
            title={
              mail.isStarred
                ? t("iboite.actions.unstar")
                : t("iboite.actions.star")
            }
          >
            <Star
              className={cn(
                "size-4",
                mail.isStarred && "fill-amber-400 text-amber-400"
              )}
            />
          </Button>
          {/* Dropdown: always visible, contains overflow actions on mobile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Mobile-only: archive, trash, star */}
              <DropdownMenuItem
                className="sm:hidden"
                onClick={() => onArchive(mail._id)}
              >
                <Archive className="mr-2 size-4" />
                {t("iboite.actions.archive")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="sm:hidden"
                onClick={() => onTrash(mail._id)}
              >
                <Trash2 className="mr-2 size-4" />
                {t("iboite.actions.delete")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="sm:hidden"
                onClick={() => onToggleStar(mail._id)}
              >
                <Star
                  className={cn(
                    "mr-2 size-4",
                    mail.isStarred && "fill-amber-400 text-amber-400"
                  )}
                />
                {mail.isStarred
                  ? t("iboite.actions.unstar")
                  : t("iboite.actions.star")}
              </DropdownMenuItem>
              {/* Permanent delete for trash folder */}
              {mail.folder === MailFolder.Trash && (
                <DropdownMenuItem
                  onClick={() => onDelete(mail._id)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 size-4" />
                  {t("common.delete")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {/* Body */}
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-5">
          <h2 className="text-lg leading-tight font-semibold">
            {mail.subject || t("iboite.mail.noSubject")}
          </h2>

          {mail.recipient && (
            <p className="text-xs text-muted-foreground">
              {t("iboite.mail.to")}: {mail.recipient.name}
            </p>
          )}

          {/* Thread conversation view */}
          {hasThread ? (
            <div className="space-y-3">
              {threadMessages.map((msg) => {
                const isCurrent = msg._id === mail._id
                return (
                  <div
                    key={msg._id}
                    className={cn(
                      "rounded-lg border p-4 transition-colors",
                      isCurrent
                        ? "border-primary/20 bg-primary/5"
                        : "border-muted bg-muted/30"
                    )}
                  >
                    {/* Message header */}
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {(msg.sender?.name ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <p className="truncate text-sm font-medium">
                          {msg.sender?.name}
                        </p>
                      </div>
                      <p className="shrink-0 text-[11px] whitespace-nowrap text-muted-foreground">
                        {format(new Date(msg.createdAt), "d MMM yyyy, HH:mm", {
                          locale: dateFnsLocale,
                        })}
                      </p>
                    </div>
                    {/* Message content */}
                    <div className="pl-9 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                      {msg.content}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Single message view (no thread) */
            <>
              {/* Sender row */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {(mail.sender?.name ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {mail.sender?.name}
                    </p>
                    {mail.sender?.entityType && (
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        {(() => {
                          const Icon =
                            OWNER_TYPE_ICONS[mail.sender.entityType] ?? Mail
                          return <Icon className="size-3" />
                        })()}
                        {t(
                          `iboite.ownerType.${mail.sender.entityType}`,
                          mail.sender.entityType
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <p className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
                  {format(new Date(mail.createdAt), "d MMM yyyy, HH:mm", {
                    locale: dateFnsLocale,
                  })}
                </p>
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                {mail.content}
              </div>
            </>
          )}

          {mail.attachments && mail.attachments.length > 0 && (
            <div className="border-t pt-3">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                {t("iboite.mail.attachments")}{" "}
                <span className="text-muted-foreground">
                  ({mail.attachments.length})
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {mail.attachments.map(
                  (att: { name: string; size: string; storageId?: string }) => (
                    <div
                      key={att.name}
                      className="flex items-center gap-2 rounded-lg border bg-muted/60 px-3 py-2 text-sm transition-colors hover:bg-muted"
                    >
                      <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="max-w-[180px] truncate">{att.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {att.size}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ── PackageList ───────────────────────────────────────────────────────────────

function PackageList({
  packages,
  dateFnsLocale,
}: {
  packages: Doc<"deliveryPackages">[]
  dateFnsLocale: Locale
}) {
  const { t } = useTranslation()

  if (packages.length === 0) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center py-16 text-center">
        <Package className="mb-3 size-12 text-muted-foreground/20" />
        <h3 className="text-sm font-medium text-muted-foreground">
          {t("iboite.empty.packages")}
        </h3>
        <p className="mt-1 max-w-[240px] text-xs text-muted-foreground/70">
          {t("iboite.empty.packagesDesc")}
        </p>
      </div>
    )
  }

  const statusConfig: Record<
    string,
    { label: string; color: string; icon: typeof Package }
  > = {
    [PackageStatus.InTransit]: {
      label: t("iboite.packages.inTransit"),
      color:
        "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
      icon: Truck,
    },
    [PackageStatus.Available]: {
      label: t("iboite.packages.available"),
      color:
        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
      icon: Package,
    },
    [PackageStatus.Delivered]: {
      label: t("iboite.packages.delivered"),
      color:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
      icon: CheckCheck,
    },
    [PackageStatus.Pending]: {
      label: t("iboite.packages.pending"),
      color: "bg-muted text-muted-foreground border-muted",
      icon: Package,
    },
    [PackageStatus.Returned]: {
      label: t("iboite.packages.returned"),
      color:
        "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20",
      icon: Package,
    },
  }

  return (
    <div className="min-h-full space-y-3">
      {packages.map((pkg) => {
        const status =
          statusConfig[pkg.status] ?? statusConfig[PackageStatus.Pending]
        const StatusIcon = status.icon
        return (
          <div
            key={pkg._id}
            className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/30"
          >
            <div
              className={cn("shrink-0 rounded-lg border p-2.5", status.color)}
            >
              <StatusIcon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{pkg.description}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("iboite.packages.sender")}: {pkg.sender}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn("shrink-0 text-xs", status.color)}
                >
                  {status.label}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {t("iboite.packages.tracking")}:{" "}
                  <span className="font-mono">{pkg.trackingNumber}</span>
                </span>
                {pkg.estimatedDelivery && (
                  <span>
                    {t("iboite.packages.estimatedDelivery")}:{" "}
                    {format(new Date(pkg.estimatedDelivery), "d MMM yyyy", {
                      locale: dateFnsLocale,
                    })}
                  </span>
                )}
              </div>
              {pkg.events && pkg.events.length > 0 && (
                <div className="mt-3 ml-1 space-y-1.5 border-l-2 border-muted pl-3">
                  {pkg.events
                    .slice(-3)
                    .reverse()
                    .map(
                      (
                        event: {
                          timestamp: number
                          description: string
                          location?: string
                        },
                        idx: number
                      ) => (
                        <div
                          key={`evt-${event.timestamp}-${idx}`}
                          className="text-xs"
                        >
                          <p className="text-muted-foreground">
                            {format(new Date(event.timestamp), "d MMM, HH:mm", {
                              locale: dateFnsLocale,
                            })}
                          </p>
                          <p className="text-foreground">{event.description}</p>
                          {event.location && (
                            <p className="text-muted-foreground">
                              {event.location}
                            </p>
                          )}
                        </div>
                      )
                    )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── CallsList ────────────────────────────────────────────────────────────────

function CallsList({ dateFnsLocale }: { dateFnsLocale: Locale }) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const { data: callsData } = useAuthenticatedConvexQuery(
    api.functions.meetings.listMine,
    {}
  )
  const calls = callsData?.meetings
  const participantNames = callsData?.participantNames ?? {}

  const { data: currentUser } = useAuthenticatedConvexQuery(
    api.functions.users.getMe,
    {}
  )

  // Compute display name: show the OTHER participant's name, not our own
  const getCallDisplayName = (call: Doc<"meetings">) => {
    const otherParticipant = call.participants.find(
      (p) => p.userId !== currentUser?._id
    )
    if (otherParticipant) {
      const name = participantNames[otherParticipant.userId]
      if (name) return `Appel \u2014 ${name}`
    }
    // Fallback: if we created the call, the title already shows the target
    if (call.createdBy === currentUser?._id) return call.title
    // Otherwise show the caller's name
    const callerName = participantNames[call.createdBy]
    return callerName ? `Appel \u2014 ${callerName}` : call.title
  }

  const [activeCallId, setActiveCallId] = useState<Id<"meetings"> | null>(null)

  const {
    meeting: activeMeeting,
    token,
    wsUrl,
    isConnecting,
    error: _meetingError,
    connect,
    disconnect,
  } = useMeeting(activeCallId ?? undefined)

  const handleJoin = useCallback(
    async (meetingId: Id<"meetings">) => {
      try {
        setActiveCallId(meetingId)
        await connect(meetingId)
      } catch (err) {
        console.error("Failed to join call:", err)
        setActiveCallId(null)
      }
    },
    [connect]
  )

  const handleHangUp = useCallback(async () => {
    if (activeCallId) {
      await disconnect(activeCallId)
    }
    setActiveCallId(null)
  }, [activeCallId, disconnect])

  useEffect(() => {
    if (activeMeeting?.status === "ended" && activeCallId) {
      setActiveCallId(null)
    }
  }, [activeMeeting?.status, activeCallId])

  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false)
  const [callEmail, setCallEmail] = useState("")
  const [isCalling, setIsCalling] = useState(false)
  const callCitizen = useMutation(api.functions.meetings.callCitizenByEmail)
  const callCitizenById = useMutation(api.functions.meetings.callCitizenById)
  const callOrgMutation = useMutation(api.functions.meetings.callOrganization)

  const handleRecall = async (call: Doc<"meetings">) => {
    try {
      setIsCalling(true)

      // For org calls: call the org back
      if (call.orgId && call.isOrgInbound) {
        const { meetingId } = await callOrgMutation({ orgId: call.orgId })
        toast.success(t("iboite.call.startSuccess", "Appel lance"))
        handleJoin(meetingId)
        return
      }

      // For C2C or org-outbound: find the OTHER participant
      const otherParticipant = call.participants.find(
        (p) => p.userId !== currentUser?._id
      )
      const targetUserId = otherParticipant?.userId

      if (!targetUserId) {
        toast.error("Impossible d'identifier le correspondant")
        return
      }

      const { meetingId } = await callCitizenById({ targetUserId })
      toast.success(t("iboite.call.startSuccess", "Appel lance"))
      handleJoin(meetingId)
    } catch (err: unknown) {
      console.error("Failed to recall:", err)
      const errorMessage =
        err instanceof Error
          ? (err.message.match(/Uncaught ConvexError: (.*?)(?:\n|$)/)?.[1] ??
            t("iboite.call.error", "Erreur lors de l'appel"))
          : t("iboite.call.error", "Erreur lors de l'appel")
      toast.error(errorMessage)
    } finally {
      setIsCalling(false)
    }
  }

  const handleInitiateCall = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!callEmail.trim()) return
    setIsCalling(true)
    try {
      const { meetingId } = await callCitizen({ email: callEmail.trim() })
      toast.success(t("iboite.call.startSuccess", "Appel lance"))
      setIsCallDialogOpen(false)
      setCallEmail("")
      handleJoin(meetingId)
    } catch (error: any) {
      console.error("Failed to call:", error)
      const errorMessage =
        typeof error?.data === "string"
          ? error.data
          : error?.data?.errorMessage ||
            error?.message?.match(/Uncaught ConvexError: (.*?)(?:\n|$)/)?.[1] ||
            t("iboite.call.error", "Erreur lors de l'appel")
      toast.error(errorMessage)
    } finally {
      setIsCalling(false)
    }
  }

  if (!calls) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (calls.length === 0) {
    return (
      <div className="flex h-full flex-col p-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t("iboite.calls.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                "iboite.calls.subtitle",
                "Historique de vos appels audio et video"
              )}
            </p>
          </div>
          <Button
            onClick={() => setIsCallDialogOpen(true)}
            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <PhoneCall className="size-4" />
            {t("iboite.call.newCall", "Nouvel appel")}
          </Button>

          <Dialog open={isCallDialogOpen} onOpenChange={setIsCallDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {t("iboite.call.newCallTitle", "Appeler un contact")}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleInitiateCall} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder={t(
                      "iboite.call.emailPlaceholder",
                      "Adresse email du contact"
                    )}
                    value={callEmail}
                    onChange={(e) => setCallEmail(e.target.value)}
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "iboite.call.emailHelp",
                      "Saisissez l'adresse email exacte de la personne que vous souhaitez appeler. Elle recevra une notification pour rejoindre l'appel."
                    )}
                  </p>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCallDialogOpen(false)}
                  >
                    {t("iboite.actions.cancel", "Annuler")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isCalling || !callEmail.trim()}
                    className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    {isCalling ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <PhoneCall className="size-4" />
                    )}
                    {t("iboite.call.startCall", "Appeler")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <Phone className="mb-3 size-12 text-muted-foreground/20" />
          <h3 className="text-sm font-medium text-muted-foreground">
            {t("iboite.calls.empty")}
          </h3>
          <p className="mt-1 max-w-[240px] text-xs text-muted-foreground/70">
            {t("iboite.calls.emptyDesc")}
          </p>
        </div>
      </div>
    )
  }

  const statusConfig: Record<
    string,
    { label: string; color: string; icon: typeof Phone }
  > = {
    active: {
      label: t("iboite.calls.status.active"),
      color:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
      icon: PhoneCall,
    },
    ended: {
      label: t("iboite.calls.status.ended"),
      color: "bg-muted text-muted-foreground border-muted",
      icon: PhoneOff,
    },
    scheduled: {
      label: t("iboite.calls.status.scheduled"),
      color:
        "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
      icon: Phone,
    },
    cancelled: {
      label: t("iboite.calls.status.cancelled"),
      color:
        "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20",
      icon: PhoneMissed,
    },
  }

  const callContent = (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-zinc-950">
      {token && wsUrl ? (
        <LiveKitRoom
          token={token}
          serverUrl={wsUrl}
          connect={true}
          audio={true}
          onDisconnected={handleHangUp}
          className="flex min-h-0 flex-1 flex-col"
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <CustomCallUI
            onHangUp={handleHangUp}
            title={
              activeCallId
                ? getCallDisplayName(
                    calls.find((c) => c._id === activeCallId) ?? calls[0]
                  )
                : undefined
            }
          />
        </LiveKitRoom>
      ) : (
        <div className="flex h-full items-center justify-center">
          <div className="space-y-3 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-zinc-500" />
            <p className="text-sm text-zinc-400">
              {t("meetings.connecting", "Connexion au serveur d'appel...")}
            </p>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      <div className="h-full p-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t("iboite.calls.title")}</h2>
            <div className="mt-1 text-sm text-muted-foreground">
              {t(
                "iboite.calls.subtitle",
                "Historique de vos appels audio et video"
              )}
            </div>
          </div>
          <Button
            onClick={() => setIsCallDialogOpen(true)}
            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <PhoneCall className="size-4" />
            {t("iboite.call.newCall", "Nouvel appel")}
          </Button>
        </div>

        <div className="min-h-full space-y-3">
          {calls.map((call) => {
            const status = statusConfig[call.status] ?? statusConfig.ended
            const StatusIcon = status.icon
            const isActive = call.status === "active"
            const isOutgoing = call.createdBy === currentUser?._id
            const isMissed =
              !isOutgoing &&
              call.status === "ended" &&
              call.participants.filter((p) => p.joinedAt).length <= 1

            // Calculate duration
            let duration = ""
            if (call.startedAt && call.endedAt) {
              const durationMs = call.endedAt - call.startedAt
              const minutes = Math.floor(durationMs / 60000)
              const seconds = Math.floor((durationMs % 60000) / 1000)
              duration =
                minutes > 0 ? `${minutes}min ${seconds}s` : `${seconds}s`
            }

            return (
              <div
                key={call._id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                  isActive
                    ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-500/5"
                    : "hover:bg-muted/30"
                )}
              >
                <div
                  className={cn("shrink-0 rounded-lg border p-2", status.color)}
                >
                  <StatusIcon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">
                      {getCallDisplayName(call)}
                    </p>
                    <Badge
                      variant="outline"
                      className={cn("shrink-0 text-xs", status.color)}
                    >
                      {status.label}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <span
                      className={
                        isMissed
                          ? "font-medium text-red-500"
                          : isOutgoing
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-blue-600 dark:text-blue-400"
                      }
                    >
                      {isMissed
                        ? t("iboite.calls.missed", "Manque")
                        : isOutgoing
                          ? t("iboite.calls.outgoing", "Sortant")
                          : t("iboite.calls.incoming", "Entrant")}
                    </span>
                    {" \u00B7 "}
                    {call.participants.length} {t("iboite.calls.participants")}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {call.startedAt && (
                      <span>
                        {format(new Date(call.startedAt), "d MMM, HH:mm", {
                          locale: dateFnsLocale,
                        })}
                      </span>
                    )}
                    {call.scheduledAt && !call.startedAt && (
                      <span>
                        {t("iboite.calls.scheduledFor")}{" "}
                        {format(new Date(call.scheduledAt), "d MMM, HH:mm", {
                          locale: dateFnsLocale,
                        })}
                      </span>
                    )}
                    {duration && (
                      <span>
                        {t("iboite.calls.duration")}: {duration}
                      </span>
                    )}
                  </div>
                  {/* Action buttons */}
                  <div className="mt-2 flex items-center gap-2">
                    {isActive && (
                      <Button
                        size="sm"
                        variant="default"
                        className="h-8 gap-1.5 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                        onClick={() => handleJoin(call._id)}
                        disabled={isConnecting || activeCallId === call._id}
                      >
                        {isConnecting && activeCallId === call._id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <PhoneCall className="size-3.5" />
                        )}
                        {t("iboite.calls.join")}
                      </Button>
                    )}
                    {(call.status === "ended" ||
                      call.status === "cancelled") && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => handleRecall(call)}
                        disabled={isCalling}
                      >
                        <PhoneCall className="size-3.5" />
                        {t("iboite.call.recall", "Rappeler")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Dialog open={isCallDialogOpen} onOpenChange={setIsCallDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {t("iboite.call.newCallTitle", "Appeler un contact")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInitiateCall} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder={t(
                  "iboite.call.emailPlaceholder",
                  "Adresse email du contact"
                )}
                value={callEmail}
                onChange={(e) => setCallEmail(e.target.value)}
                autoComplete="off"
              />
              <div className="text-xs text-muted-foreground">
                {t(
                  "iboite.call.emailHelp",
                  "Saisissez l'adresse email exacte de la personne que vous souhaitez appeler. Elle recevra une notification pour rejoindre l'appel."
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCallDialogOpen(false)}
              >
                {t("iboite.actions.cancel", "Annuler")}
              </Button>
              <Button
                type="submit"
                disabled={isCalling || !callEmail.trim()}
                className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {isCalling ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <PhoneCall className="size-4" />
                )}
                {t("iboite.call.startCall", "Appeler")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Call Dialog/Sheet */}
      {isMobile ? (
        <Sheet
          open={!!activeCallId && !!(token && wsUrl)}
          onOpenChange={(o) => !o && handleHangUp()}
        >
          <SheetContent
            side="bottom"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
            className="flex h-dvh w-full flex-col rounded-none border-none bg-zinc-950 p-0 pt-10 focus:outline-none"
          >
            {callContent}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog
          open={!!activeCallId && !!(token && wsUrl)}
          onOpenChange={(open) => {
            if (!open) handleHangUp()
          }}
        >
          <DialogContent
            autoFocus={false}
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
            className="flex h-[80vh] w-full max-w-5xl flex-col overflow-hidden border-zinc-800 bg-zinc-950 p-0 sm:max-w-5xl"
          >
            {callContent}
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
