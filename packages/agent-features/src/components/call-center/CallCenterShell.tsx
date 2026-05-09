"use client";

import {
  Phone,
  PhoneIncoming,
  Plus,
  Search,
  User,
  Voicemail as VoicemailIcon,
  X,
} from "lucide-react";
import { useRouter } from "@workspace/routing";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { Button } from "@workspace/ui/components/button";
import { Sheet, SheetContent, SheetTrigger } from "@workspace/ui/components/sheet";
import { useIsMobile } from "../../hooks/use-mobile";
import { useOrg } from "../../shell/org-provider";
import { useCallCenter } from "../../hooks/use-call-center";
import { useRingtone } from "../../hooks/use-ringtone";
import { ActiveCallsBar, type ActiveCallSlot } from "./ActiveCallsBar";
import { ActiveConversationView } from "./ActiveConversationView";
import { CallSidePane } from "./CallSidePane";
import { CallRoomPool } from "./CallRoomMount";
import { IncomingCallQueue } from "./IncomingCallQueue";
import { LineFilterDropdown } from "./LineFilterDropdown";
import { TransferDialog } from "./TransferDialog";
import type { RecentCallRow } from "./RecentCallsSection";
import { SupervisionPanel } from "./SupervisionPanel";

/**
 * Shell du Centre d'Appels — layout 2 colonnes (file/conversation + drawer
 * contexte). Le filtre de lignes est rendu par le parent (IAstedPage) dans
 * le header iAppel pour rester compact et lisible. On reçoit donc le filtre
 * via prop.
 *
 * Monté à l'intérieur de l'onglet iAppel de /icom quand le feature flag est
 * actif.
 */
interface CallCenterShellProps {
  selectedLineId?: string | "all";
  onSelectLineId?: (id: string | "all") => void;
  /** Sonnerie coupée par l'agent depuis le header iAppel. */
  ringtoneMuted?: boolean;
  /**
   * Mode compact pour la fenêtre flottante : header avec filtre de ligne +
   * bouton messagerie inlined (pas de drawer contexte, pas de KPI), un seul
   * flux vertical. Réutilise toute la logique du shell pour rester en
   * parité fonctionnelle stricte avec le fullscreen.
   */
  compact?: boolean;
  /**
   * En mode compact, le shell rend lui-même le toggle messagerie (icône
   * + badge). On lui passe le composant VoicemailsList via prop.
   */
  VoicemailsList?: React.ComponentType<{ orgId: Id<"orgs"> | null }>;
}

export function CallCenterShell({
  selectedLineId: externalSelectedLineId,
  onSelectLineId,
  ringtoneMuted,
  compact = false,
  VoicemailsList,
}: CallCenterShellProps = {}) {
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

  const [internalLineId, setInternalLineId] = useState<string | "all">("all");
  // Mode contrôlé si IAstedPage gère le filtre dans son header.
  const selectedLineId = externalSelectedLineId ?? internalLineId;
  const setSelectedLineId = onSelectLineId ?? setInternalLineId;
  const [focusedMeetingId, setFocusedMeetingId] =
    useState<Id<"meetings"> | null>(null);
  const [pickingUpId, setPickingUpId] = useState<Id<"meetings"> | null>(null);
  const [callingBackIds, setCallingBackIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [transferTargetId, setTransferTargetId] = useState<Id<"meetings"> | null>(
    null,
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

  // Sonnerie : file > 0 + pas d'appel actif + pas mute. Le mute est piloté
  // par le parent (header iAppel) qui le persiste en localStorage.
  const shouldRing = totalCount > 0 && !activeSlotId && !ringtoneMuted;
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

  // Colonne 1 : file d'appels permanente (tabs En attente / En cours / Terminés)
  const queueColumn = (
    <div className="w-[320px] shrink-0 hidden md:flex border-r">
      <IncomingCallQueue
        calls={filteredQueue as any}
        activeCalls={activeCalls as ActiveCallSlot[]}
        recentCalls={recentCalls as RecentCallRow[]}
        focusedMeetingId={focusedMeetingId}
        pickingUpId={pickingUpId}
        onPickup={handlePickup}
        onDecline={handleDecline}
        onFocus={handleFocus}
        onSelectActive={(id) => setFocusedMeetingId(id)}
        onCallBackRecent={handleCallBackRecent}
        pendingCallbackKeys={callingBackIds}
      />
    </div>
  );

  // Colonne 2 : zone conversation (ActiveConversationView ou empty state)
  const conversationColumn = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {conversationCall ? (
        <ActiveConversationView
          call={conversationCall}
          onHold={(id) => hold(id)}
          onResume={(id) => resume(id)}
          onEnd={handleEndActive}
          onRequestTransfer={(id) => setTransferTargetId(id)}
        />
      ) : (
        <ConversationEmptyState />
      )}
    </div>
  );

  // ── Compact mode (popup flottant 420px) ──────────────────────────
  // Rend une version verticale, dense : header avec filtre lignes + icône
  // messagerie, puis le centerColumn (file + conversation actives + récents).
  // Pas de drawer contexte (pas la place), pas de SupervisionPanel.
  const [compactShowVoicemail, setCompactShowVoicemail] = useState(false);
  const { data: vmList } = useAuthenticatedConvexQuery(
    api.functions.voicemails.listForOrg,
    compact && activeOrgId && VoicemailsList ? { orgId: activeOrgId } : "skip",
  );
  const compactUnreadVm = ((vmList as any[]) ?? []).filter((v) => !v.isRead).length;

  if (compact) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 flex items-center gap-2 border-b bg-muted/10 px-3 py-2">
          {compactShowVoicemail ? (
            <span className="text-xs font-semibold flex-1">
              {t("callCenter.voicemail.title", "Messagerie vocale")}
            </span>
          ) : (
            <LineFilterDropdown
              queue={queue as any}
              selectedLineId={selectedLineId}
              onSelect={setSelectedLineId}
              totalCount={totalCount}
              urgentCount={urgentCount}
            />
          )}
          <div className="flex-1" />
          {VoicemailsList && (
            <Button
              type="button"
              variant={compactShowVoicemail ? "default" : "ghost"}
              size="icon"
              onClick={() => setCompactShowVoicemail((v) => !v)}
              className="relative h-8 w-8 shrink-0"
              aria-pressed={compactShowVoicemail}
              aria-label={
                compactShowVoicemail ? "Retour aux appels" : "Messagerie vocale"
              }
              title={
                compactShowVoicemail ? "Retour aux appels" : "Messagerie vocale"
              }
            >
              {compactShowVoicemail ? (
                <X className="h-4 w-4" />
              ) : (
                <VoicemailIcon className="h-4 w-4" />
              )}
              {!compactShowVoicemail && compactUnreadVm > 0 && (
                <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                  {compactUnreadVm}
                </span>
              )}
            </Button>
          )}
        </div>

        {/* Barre d'appels actifs (compacte, sticky en haut). */}
        {activeCalls.length > 0 && !compactShowVoicemail && (
          <ActiveCallsBar
            calls={activeCalls as ActiveCallSlot[]}
            activeSlotId={activeSlotId}
            onFocus={handleFocus}
            onEnd={handleEndActive}
            onHold={(id) => hold(id)}
            onResume={(id) => resume(id)}
          />
        )}

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {compactShowVoicemail && VoicemailsList ? (
            <div className="h-full overflow-y-auto p-3">
              <VoicemailsList orgId={activeOrgId ?? null} />
            </div>
          ) : conversationCall ? (
            <ActiveConversationView
              call={conversationCall}
              onHold={(id) => hold(id)}
              onResume={(id) => resume(id)}
              onEnd={handleEndActive}
              onRequestTransfer={(id) => setTransferTargetId(id)}
            />
          ) : (
            <IncomingCallQueue
              calls={filteredQueue as any}
              activeCalls={activeCalls as ActiveCallSlot[]}
              recentCalls={recentCalls as RecentCallRow[]}
              focusedMeetingId={focusedMeetingId}
              pickingUpId={pickingUpId}
              onPickup={handlePickup}
              onDecline={handleDecline}
              onFocus={handleFocus}
              onSelectActive={(id) => setFocusedMeetingId(id)}
            />
          )}
        </div>

        <CallRoomPool
          slots={slots}
          activeSlotId={activeSlotId}
          onDisconnected={handleSlotDisconnected}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* KPIs superviseur (silent fallback si pas de permission) */}
      <SupervisionPanel orgId={activeOrgId ?? null} />

      {/* Barre d'appels actifs concurrents (chips pour switch entre slots) */}
      {activeCalls.length > 1 && (
        <ActiveCallsBar
          calls={activeCalls as ActiveCallSlot[]}
          activeSlotId={activeSlotId}
          onFocus={handleFocus}
          onEnd={handleEndActive}
          onHold={(id) => hold(id)}
          onResume={(id) => resume(id)}
        />
      )}

      {/* Layout iCom — 3 colonnes desktop fidèle à la maquette
          `agent-desktop.jsx > AgList | AgInCall | AgContextPane`.
          Mobile : conversation prend toute la place, file + contexte dans des Sheets. */}
      {isMobile ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-muted/10 px-3 py-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {t("callCenter.queue.title", "File d'appels")}
                  {totalCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-4 h-4 rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground ml-1">
                      {totalCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[320px] p-0">
                <IncomingCallQueue
                  calls={filteredQueue as any}
                  activeCalls={activeCalls as ActiveCallSlot[]}
                  recentCalls={recentCalls as RecentCallRow[]}
                  focusedMeetingId={focusedMeetingId}
                  pickingUpId={pickingUpId}
                  onPickup={handlePickup}
                  onDecline={handleDecline}
                  onFocus={handleFocus}
                  onSelectActive={(id) => setFocusedMeetingId(id)}
                />
              </SheetContent>
            </Sheet>
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1"
                  disabled={!drawerMeetingId}
                >
                  <User className="h-3.5 w-3.5" />
                  {t("callCenter.drawer.contextPane", "Contexte")}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[360px] p-0">
                <CallSidePane
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

          {conversationColumn}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {queueColumn}
          {conversationColumn}
          <CallSidePane
            meetingId={drawerMeetingId}
            orgId={activeOrgId ?? null}
            activeMeetingId={activeSlotId}
            onOpenRequest={(requestId) =>
              router.push(`/affaires-consulaires?request=${requestId}`)
            }
            onTransfer={transfer}
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

      {/* Transfer dialog — déclenché depuis ActiveConversationView ctl-bar */}
      <TransferDialog
        open={transferTargetId !== null}
        onOpenChange={(open) => {
          if (!open) setTransferTargetId(null);
        }}
        orgId={activeOrgId ?? null}
        meetingId={transferTargetId}
        onTransfer={transfer}
      />

      {/* Pill flottant Raccrocher → désormais global (`GlobalCallPill` monté
          dans `AppShell`). Persiste sur toutes les routes et redirige vers
          /icom?tab=icall au clic. */}
    </div>
  );
}

/**
 * Empty state de la colonne centrale quand aucun appel n'est actif.
 * Suit la maquette : "Aucun appel actif · Vos prochains appels apparaîtront
 * automatiquement ici. Le toast en bas-droite signale chaque entrée."
 */
function ConversationEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center bg-background">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/40 mb-2">
        <PhoneIncoming className="h-7 w-7 text-muted-foreground/60" />
      </div>
      <p className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/80">
        iCom — En attente
      </p>
      <h3 className="text-[20px] font-semibold tracking-tight max-w-md">
        Aucun appel actif
      </h3>
      <p className="text-[13px] text-muted-foreground max-w-md leading-relaxed">
        Vos prochains appels apparaîtront automatiquement ici. Le toast en
        bas-droite signale chaque entrée, avec sonnerie.
      </p>
    </div>
  );
}
