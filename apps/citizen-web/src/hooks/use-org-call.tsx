"use client"

import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { LiveKitRoom } from "@livekit/components-react"
import { LIVEKIT_CALL_ROOM_OPTIONS } from "@workspace/livekit/room-options"
import { useLiveKitDisconnectGuard } from "@workspace/livekit/use-livekit-disconnect-guard"
import { Loader2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { CitizenAudioCallView } from "@/components/meetings/CitizenAudioCallView"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import { useMeeting } from "@/hooks/use-meeting"
import { useIsMobile } from "@/hooks/use-mobile"
import { useConvexMutationQuery } from "@/integrations/convex/hooks"

/**
 * Hook réutilisable pour lancer un appel vers une org depuis n'importe
 * quel composant UI (boutons inline, liste de lignes, etc.).
 *
 * Expose :
 *   - `initiateCall(lineId?)` : lance l'appel (avec ou sans ligne précise)
 *   - `isInCall`              : si un appel est actuellement en cours
 *   - `isStarting`            : pendant l'init (mutation pending)
 *   - `callDialog`            : JSX à insérer pour afficher l'UI d'appel
 *                                (Dialog desktop ou Sheet mobile, LiveKit)
 *   - `hangUp()`              : raccrocher manuellement
 *
 * Le composant appelant gère son propre rendu de boutons.
 */
export function useOrgCall({
  orgId,
  orgName,
}: {
  orgId: Id<"orgs">
  orgName: string
}) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()

  const [activeMeetingId, setActiveMeetingId] =
    useState<Id<"meetings"> | null>(null)

  const callOrgMutation = useConvexMutationQuery(
    api.functions.meetings.callOrganization,
  )
  const setCallRingingMutation = useConvexMutationQuery(
    api.functions.meetings.setCallRinging,
  )

  const { meeting, token, wsUrl, connect, disconnect } = useMeeting(
    activeMeetingId ?? undefined,
  )

  // Auto-close quand l'agent raccroche
  useEffect(() => {
    if (meeting?.status === "ended" && activeMeetingId) {
      void disconnect(activeMeetingId)
      setActiveMeetingId(null)
    }
  }, [meeting?.status, activeMeetingId, disconnect])

  const cleanupCallState = useCallback(() => {
    setActiveMeetingId(null)
  }, [])

  const {
    onConnected: onLiveKitConnected,
    onDisconnected: onLiveKitDisconnected,
    markUserHangUp,
    reset: resetDisconnectGuard,
  } = useLiveKitDisconnectGuard(cleanupCallState)

  const initiateCall = useCallback(
    async (callLineId?: Id<"callLines">) => {
      try {
        resetDisconnectGuard()
        const result = await callOrgMutation.mutateAsync({
          orgId,
          callLineId,
        })
        const meetingId = result.meetingId
        setActiveMeetingId(meetingId)
        await connect(meetingId)
        await setCallRingingMutation.mutateAsync({ meetingId })
      } catch (err) {
        console.error("Failed to call organization:", err)
      }
    },
    [
      orgId,
      callOrgMutation,
      setCallRingingMutation,
      connect,
      resetDisconnectGuard,
    ],
  )

  const hangUp = useCallback(async () => {
    markUserHangUp()
    if (activeMeetingId) {
      await disconnect(activeMeetingId)
    }
    setActiveMeetingId(null)
  }, [activeMeetingId, disconnect, markUserHangUp])

  const isInCall = activeMeetingId !== null

  const callContent = (
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
      {token && wsUrl ? (
        <LiveKitRoom
          token={token}
          serverUrl={wsUrl}
          connect={true}
          audio={true}
          video={false}
          options={LIVEKIT_CALL_ROOM_OPTIONS}
          onConnected={onLiveKitConnected}
          onDisconnected={onLiveKitDisconnected}
          className="flex-1 min-h-0 flex flex-col"
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <CitizenAudioCallView onHangUp={hangUp} title={orgName} />
        </LiveKitRoom>
      ) : (
        <div className="h-full flex flex-col items-center justify-center gap-4 text-white">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
          <p className="text-sm text-zinc-400">
            {t("meetings.waitingForAgent")}
          </p>
        </div>
      )}
    </div>
  )

  const callDialog =
    isInCall && isMobile ? (
      <Sheet open={isInCall} onOpenChange={(o) => !o && hangUp()}>
        <SheetContent
          side="bottom"
          className="z-[120] p-0 h-dvh w-full bg-zinc-950 border-none rounded-none focus:outline-none flex flex-col pt-10"
        >
          <SheetTitle className="sr-only">
            {orgName || t("meetings.callInProgress")}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {t(
              "meetings.callDialogDescription",
              "Interface d'appel active. Utilisez les commandes pour poursuivre la conversation ou raccrocher.",
            )}
          </SheetDescription>
          {callContent}
        </SheetContent>
      </Sheet>
    ) : isInCall && !isMobile ? (
      <Dialog open={isInCall} onOpenChange={(o) => !o && hangUp()}>
        <DialogContent
          autoFocus={false}
          className="sm:max-w-[420px] w-full h-[680px] max-h-[90vh] p-0 flex flex-col overflow-hidden bg-zinc-950 border-zinc-800"
        >
          <DialogTitle className="sr-only">
            {orgName || t("meetings.callInProgress")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t(
              "meetings.callDialogDescription",
              "Interface d'appel active.",
            )}
          </DialogDescription>
          {callContent}
        </DialogContent>
      </Dialog>
    ) : null

  return {
    initiateCall,
    hangUp,
    isInCall,
    isStarting: callOrgMutation.isPending,
    callDialog,
  }
}
