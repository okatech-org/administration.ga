"use client";

import { ListFilter, PhoneOff, User } from "lucide-react";
import { useRouter } from "@workspace/routing";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import { Sheet, SheetContent, SheetTrigger } from "@workspace/ui/components/sheet";
import { useIsMobile } from "../../hooks/use-mobile";
import { useOrg } from "../../shell/org-provider";
import { useCallCenter } from "../../hooks/use-call-center";
import { useRingtone } from "../../hooks/use-ringtone";
import { ActiveCallsBar, type ActiveCallSlot } from "./ActiveCallsBar";
import { ActiveConversationView } from "./ActiveConversationView";
import { CallContextDrawer } from "./CallContextDrawer";
import { CallRoomPool } from "./CallRoomMount";
import { CollapsibleQueueBar } from "./CollapsibleQueueBar";
import { IncomingCallQueue } from "./IncomingCallQueue";
import { LineFilterRail } from "./LineFilterRail";
import {
  MissedCallsSection,
  type MissedCallRow,
} from "./MissedCallsSection";
import {
  RecentCallsSection,
  type RecentCallRow,
} from "./RecentCallsSection";
import { SupervisionPanel } from "./SupervisionPanel";

/**
 * Shell du Centre d'Appels — orchestration complète (3 colonnes + barre d'actifs).
 * Monté à l'intérieur de l'onglet iAppel de /iasted quand le feature flag est actif.
 */
export function CallCenterShell() {
  const { t } = useTranslation();
  const router = useRouter();
  const { activeOrgId } = useOrg();
  const isMobile = useIsMobile();
  const {
    queue,
    activeCalls,
    activeSlotId,
    slots,
    pickup,
    hangup,
    decline,
    hold,
    resume,
    transfer,
    missedCalls,
    callBackMissed,
    recentCalls,
    callBackRecent,
  } = useCallCenter();

  const [selectedLineId, setSelectedLineId] = useState<string | "all">("all");
  const [focusedMeetingId, setFocusedMeetingId] =
    useState<Id<"meetings"> | null>(null);
  const [pickingUpId, setPickingUpId] = useState<Id<"meetings"> | null>(null);
  const [callingBackIds, setCallingBackIds] = useState<Set<string>>(
    () => new Set(),
  );

  // Filtrage par ligne
  const filteredQueue = useMemo(() => {
    if (selectedLineId === "all") return queue;
    if (selectedLineId === "__unassigned__") {
      return queue.filter((c: any) => !c.callLineId);
    }
    return queue.filter((c: any) => c.callLineId === selectedLineId);
  }, [queue, selectedLineId]);

  // Quand l'utilisateur clique sur une carte, on focalise le drawer sans décrocher.
  const handleFocus = (id: Id<"meetings">) => {
    setFocusedMeetingId(id);
  };

  const handlePickup = async (id: Id<"meetings">) => {
    setPickingUpId(id);
    try {
      await pickup(id);
      setFocusedMeetingId(id);
    } finally {
      setPickingUpId(null);
    }
  };

  const handleDecline = async (id: Id<"meetings">) => {
    await decline(id);
    if (focusedMeetingId === id) setFocusedMeetingId(null);
  };

  const handleEndActive = async (id: Id<"meetings">) => {
    await hangup(id);
    if (focusedMeetingId === id) setFocusedMeetingId(null);
  };

  const handleCallBackMissed = async (missedCallId: Id<"missedCalls">) => {
    setCallingBackIds((prev) => new Set(prev).add(missedCallId as string));
    try {
      const { meetingId } = await callBackMissed(missedCallId);
      setFocusedMeetingId(meetingId);
    } catch {
      // erreur déjà remontée via toast dans use-call-center
    } finally {
      setCallingBackIds((prev) => {
        const next = new Set(prev);
        next.delete(missedCallId as string);
        return next;
      });
    }
  };

  const handleCallBackRecent = async (
    targetUserId: Id<"users">,
    orgId: Id<"orgs">,
  ) => {
    const key = `${targetUserId}:${orgId}`;
    setCallingBackIds((prev) => new Set(prev).add(key));
    try {
      const { meetingId } = await callBackRecent(targetUserId, orgId);
      setFocusedMeetingId(meetingId);
    } catch {
      // toast déjà émis par use-call-center
    } finally {
      setCallingBackIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  // Détection : le citoyen a raccroché alors que son slot était parqué.
  // On nettoie le slot côté client (le backend a déjà terminé le meeting).
  const handleSlotDisconnected = (meetingId: Id<"meetings">) => {
    // On laisse le hangup wrapper du use-call-center gérer le cleanup complet
    // côté serveur si on était actif, sinon on retire juste du store local.
    void hangup(meetingId);
  };

  // Totaux pour le rail gauche
  const totalCount = queue.length;
  const urgentCount = queue.filter((q: any) => q.priority === "urgent").length;

  // Sonnerie continue tant que la file a du monde ET que l'agent n'a pas
  // d'appel actif (il est déjà en conversation). Tonalité urgente si ≥1 urgent.
  const shouldRing = totalCount > 0 && !activeSlotId;
  useRingtone(shouldRing, urgentCount > 0 ? "urgent" : "standard");

  // Drawer : on privilégie le slot actif, sinon la carte focalisée
  const drawerMeetingId =
    activeSlotId ?? focusedMeetingId ?? (queue[0]?._id as Id<"meetings"> | undefined) ?? null;

  // Appel actif à projeter dans la vue de conversation centrale.
  // Priorité : le slot que l'agent a focalisé (activeSlotId) > le premier connected > le premier actif.
  const conversationCall = useMemo(() => {
    if (activeCalls.length === 0) return null;
    const pinned = activeCalls.find((c: any) => c._id === activeSlotId);
    if (pinned) return pinned as ActiveCallSlot & { _id: string };
    const connected = activeCalls.find(
      (c: any) => c.callStatus === "connected",
    );
    return (connected ?? activeCalls[0]) as ActiveCallSlot & { _id: string };
  }, [activeCalls, activeSlotId]);

  // Rendu mutualisé de la colonne centrale — même code en mobile et desktop.
  const centerColumn = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {conversationCall ? (
        <>
          {filteredQueue.length > 0 && (
            <CollapsibleQueueBar
              calls={filteredQueue as any}
              focusedMeetingId={focusedMeetingId}
              pickingUpId={pickingUpId}
              onPickup={handlePickup}
              onDecline={handleDecline}
              onFocus={handleFocus}
            />
          )}
          <ActiveConversationView
            call={conversationCall}
            onHold={(id) => hold(id)}
            onResume={(id) => resume(id)}
            onEnd={handleEndActive}
          />
        </>
      ) : (
        <IncomingCallQueue
          calls={filteredQueue as any}
          focusedMeetingId={focusedMeetingId}
          pickingUpId={pickingUpId}
          onPickup={handlePickup}
          onDecline={handleDecline}
          onFocus={handleFocus}
        />
      )}
      {(missedCalls.length > 0 || recentCalls.length > 0) && (
        <div className="shrink-0 max-h-[50%] overflow-y-auto border-t bg-muted/10 px-3 pb-3">
          <MissedCallsSection
            rows={missedCalls as MissedCallRow[]}
            pendingIds={callingBackIds}
            onCallBack={handleCallBackMissed}
          />
          <RecentCallsSection
            rows={recentCalls as RecentCallRow[]}
            pendingIds={callingBackIds}
            onCallBack={handleCallBackRecent}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* KPIs superviseur (silent fallback si pas de permission) */}
      <SupervisionPanel orgId={activeOrgId ?? null} />

      {/* Barre des appels actifs (au-dessus des 3 colonnes) */}
      <ActiveCallsBar
        calls={activeCalls as ActiveCallSlot[]}
        activeSlotId={activeSlotId}
        onFocus={handleFocus}
        onEnd={handleEndActive}
        onHold={(id) => hold(id)}
        onResume={(id) => resume(id)}
      />

      {/* Responsive : sous md on affiche uniquement la file + 2 sheets (rail lignes / drawer contexte) */}
      {isMobile ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Barre mobile : deux triggers sheet + résumé file */}
          <div className="flex shrink-0 items-center gap-2 border-b bg-muted/10 px-3 py-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 gap-1">
                  <ListFilter className="h-3.5 w-3.5" />
                  {t("callCenter.line.filterTitle")} ({totalCount})
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-60 p-0">
                <LineFilterRail
                  queue={queue as any}
                  selectedLineId={selectedLineId}
                  onSelect={setSelectedLineId}
                  totalCount={totalCount}
                  urgentCount={urgentCount}
                />
              </SheetContent>
            </Sheet>
            <span className="flex-1 truncate text-center text-[11px] text-muted-foreground">
              {selectedLineId === "all"
                ? t("callCenter.queue.allLines")
                : selectedLineId}
            </span>
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1"
                  disabled={!drawerMeetingId}
                >
                  <User className="h-3.5 w-3.5" />
                  {t("callCenter.drawer.tabs.dossiers")}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[360px] p-0">
                <CallContextDrawer
                  meetingId={drawerMeetingId}
                  orgId={activeOrgId ?? null}
                  activeMeetingId={activeSlotId}
                  onOpenRequest={(requestId) =>
                    router.push(`/affaires-consulaires?request=${requestId}`)
                  }
                  onTransfer={transfer}
                />
              </SheetContent>
            </Sheet>
          </div>

          {centerColumn}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <LineFilterRail
            queue={queue as any}
            selectedLineId={selectedLineId}
            onSelect={setSelectedLineId}
            totalCount={totalCount}
            urgentCount={urgentCount}
          />

          {centerColumn}

          <CallContextDrawer
            meetingId={drawerMeetingId}
            orgId={activeOrgId ?? null}
            activeMeetingId={activeSlotId}
            onOpenRequest={(requestId) =>
              router.push(`/affaires-consulaires?request=${requestId}`)
            }
            onTransfer={transfer}
            onEscalate={(id) => {
              // Hook d'escalade : Sprint 6 enverra une notification au superviseur.
              // Pour Sprint 5, toast déjà émis par QuickActions.
              void id;
            }}
          />
        </div>
      )}

      {/* Pool LiveKit invisible — une room par slot avec token.
          Mic activé uniquement sur le slot actif (les held restent connectés mais silencieux). */}
      <CallRoomPool
        slots={slots}
        activeSlotId={activeSlotId}
        onDisconnected={handleSlotDisconnected}
      />

      {/* Raccroche flottant quand un appel est actif (dupliqué pour ergonomie).
          Double garde : slot actif côté client ET appel encore connu du serveur.
          Protège d'un store zombie si la réconciliation n'a pas encore eu lieu. */}
      {activeSlotId && activeCalls.length > 0 && (
        <div className="pointer-events-auto fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border bg-card px-3 py-2 shadow-lg">
          <span className="text-[11px] font-semibold text-muted-foreground">
            {t("callCenter.activeBar.title")}
          </span>
          <Button
            size="sm"
            variant="destructive"
            className="h-8 gap-1.5"
            onClick={() => handleEndActive(activeSlotId)}
          >
            <PhoneOff className="h-3.5 w-3.5" />
            {t("callCenter.action.end")}
          </Button>
        </div>
      )}
    </div>
  );
}
