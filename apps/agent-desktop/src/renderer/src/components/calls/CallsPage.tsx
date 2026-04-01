import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Loader2,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  PhoneOutgoing,
  Plus,
  Settings,
  Trash2,
  UserMinus,
  UserPlus,
} from "lucide-react";
import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useOrg } from "../../hooks/useOrg";
import { useMeeting } from "../../hooks/useMeeting";
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "../../hooks/useConvexHooks";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Dialog, DialogContent } from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Separator } from "@workspace/ui/components/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";

// ============================================
// Agent Calls Management Page
// ============================================

export function CallsPage() {
  const { t } = useTranslation();
  const { orgId } = useOrg();

  const [activeMeetingId, setActiveMeetingId] = useState<Id<"meetings"> | null>(
    null,
  );

  // Org-wide call history (ALL calls for this org)
  const { data: orgCallsData } = useAuthenticatedConvexQuery(
    api.functions.meetings.listByOrg,
    orgId ? { orgId } : "skip",
  );
  const orgCalls = orgCallsData?.meetings;
  const participantNames = orgCallsData?.participantNames ?? {};

  // Current user for display name computation
  const { data: currentUser } = useAuthenticatedConvexQuery(
    api.functions.users.getMe,
    {},
  );

  // Show the OTHER participant's name, not the current user
  const getCallDisplayName = (call: Doc<"meetings">) => {
    const otherParticipant = call.participants.find(
      (p) => p.userId !== currentUser?._id,
    );
    if (otherParticipant) {
      const name = participantNames[otherParticipant.userId];
      if (name) return `Appel — ${name}`;
    }
    if (call.createdBy === currentUser?._id) return call.title;
    const callerName = participantNames[call.createdBy];
    return callerName ? `Appel — ${callerName}` : call.title;
  };

  // New Call Dialog State
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [callSearchType, setCallSearchType] = useState<"user" | "org">("user");
  const [callSearchQuery, setCallSearchQuery] = useState("");
  const [isCalling, setIsCalling] = useState(false);

  const callUserMutation = useConvexMutationQuery(
    api.functions.meetings.callUser,
  );
  const callOrgMutation = useConvexMutationQuery(
    api.functions.meetings.callOrganization,
  );

  // Debounced search query for users
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (value: string) => {
    setCallSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  };

  // 1. Search Users (Agents/Citizens)
  const { data: searchUsers } = useAuthenticatedConvexQuery(
    api.functions.users.search,
    callSearchType === "user" && debouncedSearch.trim().length >= 2
      ? { query: debouncedSearch.trim(), limit: 10 }
      : "skip",
  );

  // 2. Fetch Orgs (Client-side filtering since there aren't many)
  const { data: allOrgs } = useAuthenticatedConvexQuery(
    api.functions.orgs.list,
    callSearchType === "org" ? {} : "skip",
  );

  const filteredOrgs = useMemo(() => {
    if (!allOrgs) return [];
    const q = debouncedSearch.trim().toLowerCase();
    if (q.length < 2) return [];
    return allOrgs
      .filter((org) => org.name.toLowerCase().includes(q))
      .slice(0, 10);
  }, [allOrgs, debouncedSearch]);

  // Active inbound org calls (unanswered, ringing)
  const { data: inboundOrgCalls } = useAuthenticatedConvexQuery(
    api.functions.meetings.listInboundOrgCalls,
    {},
  );

  // Meeting hook for active call
  const { meeting, token, wsUrl, isConnecting, connect, disconnect } =
    useMeeting(activeMeetingId ?? undefined);

  // Categorize org calls
  const { incomingCalls, outgoingCalls, missedCalls, allCalls } =
    useMemo(() => {
      if (!orgCalls) {
        return {
          incomingCalls: [] as Doc<"meetings">[],
          outgoingCalls: [] as Doc<"meetings">[],
          missedCalls: [] as Doc<"meetings">[],
          allCalls: [] as Doc<"meetings">[],
        };
      }

      const incoming: Doc<"meetings">[] = [];
      const outgoing: Doc<"meetings">[] = [];
      const missed: Doc<"meetings">[] = [];

      for (const m of orgCalls) {
        if (m.isOrgInbound) {
          incoming.push(m);
          if (
            m.status === "ended" &&
            m.participants.filter((p) => p.joinedAt).length <= 1
          ) {
            missed.push(m);
          }
        } else {
          outgoing.push(m);
        }
      }

      return {
        incomingCalls: incoming,
        outgoingCalls: outgoing,
        missedCalls: missed,
        allCalls: orgCalls,
      };
    }, [orgCalls]);

  const activeInbound = inboundOrgCalls ?? [];

  const handleAnswer = useCallback(
    async (meetingId: Id<"meetings">) => {
      setActiveMeetingId(meetingId);
      await connect(meetingId);
    },
    [connect],
  );

  const handleHangUp = useCallback(async () => {
    if (activeMeetingId) {
      await disconnect(activeMeetingId);
    }
    setActiveMeetingId(null);
  }, [activeMeetingId, disconnect]);

  // Auto-close when the other side hangs up (meeting status becomes "ended")
  useEffect(() => {
    if (meeting?.status === "ended" && activeMeetingId) {
      setActiveMeetingId(null);
    }
  }, [meeting?.status, activeMeetingId]);

  const isInCall = activeMeetingId !== null;

  const handleInitiateCall = async (
    item: { type: "user"; id: Id<"users"> } | { type: "org"; id: Id<"orgs"> },
  ) => {
    if (!orgId) return;
    setIsCalling(true);
    try {
      if (item.type === "user") {
        const { meetingId } = await callUserMutation.mutateAsync({
          orgId,
          targetUserId: item.id,
        });
        setIsCallDialogOpen(false);
        setCallSearchQuery("");
        setDebouncedSearch("");
        await handleAnswer(meetingId);
      } else {
        const { meetingId } = await callOrgMutation.mutateAsync({
          orgId: item.id,
        });
        setIsCallDialogOpen(false);
        setCallSearchQuery("");
        setDebouncedSearch("");
        await handleAnswer(meetingId);
      }
    } catch (error: any) {
      console.error("Failed to initiate call:", error);
      const errorMessage =
        typeof error?.data === "string"
          ? error.data
          : error?.data?.errorMessage ||
            error?.message?.match(/Uncaught ConvexError: (.*?)(?:\n|$)/)?.[1] ||
            "Erreur lors de l'appel";
      toast.error(errorMessage);
    } finally {
      setIsCalling(false);
    }
  };

  const handleRecall = async (call: Doc<"meetings">) => {
    try {
      if (!orgId) {
        toast.error("Organisation non trouvée");
        return;
      }

      let targetUserId: Id<"users"> | undefined;
      if (call.isOrgInbound) {
        targetUserId = call.createdBy;
      } else {
        const otherParticipant = call.participants.find(
          (p) => p.role !== "host",
        );
        targetUserId = otherParticipant?.userId;
      }

      if (!targetUserId) {
        toast.error("Impossible d'identifier le correspondant à rappeler");
        return;
      }

      setIsCalling(true);
      const { meetingId } = await callUserMutation.mutateAsync({
        orgId,
        targetUserId,
      });
      await handleAnswer(meetingId);
    } catch (e) {
      console.error("Failed to recall:", e);
      toast.error(t("meetings.error.start"));
    } finally {
      setIsCalling(false);
    }
  };

  // Call content (in-call interface)
  const callContent = (
    <div className="flex flex-col flex-1 min-h-0 h-full bg-zinc-950 overflow-hidden">
      {token && wsUrl ? (
        <div className="h-full flex flex-col items-center justify-center gap-6 text-white">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Phone className="w-10 h-10 text-emerald-400 animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">
              {meeting?.title ?? t("meetings.activeCall", "Appel en cours")}
            </p>
            <p className="text-sm text-zinc-400 mt-1">
              {t("meetings.connected", "Connecté")}
            </p>
          </div>
          <Button
            variant="destructive"
            size="lg"
            onClick={handleHangUp}
            className="gap-2 rounded-full px-8"
          >
            <PhoneOff className="w-5 h-5" />
            {t("meetings.hangUp", "Raccrocher")}
          </Button>
        </div>
      ) : isConnecting ? (
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
          <p className="text-sm text-zinc-400">
            {t("meetings.connecting", "Connexion...")}
          </p>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        </div>
      )}
    </div>
  );

  return (
    <div className="flex-1 px-6 py-8 max-w-5xl mx-auto space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Phone className="w-6 h-6 text-primary" />
            {t("meetings.callsTitle")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("meetings.callsDesc")}
          </p>
        </div>
        {orgId && (
          <Button
            onClick={() => setIsCallDialogOpen(true)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <PhoneCall className="w-4 h-4" />
            {t("iboite.call.newCall")}
          </Button>
        )}
      </div>

      {/* Active Inbound Calls Banner */}
      {activeInbound.length > 0 && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <PhoneCall className="w-5 h-5 animate-pulse" />
              {t("meetings.incomingCalls")}
              <Badge
                variant="secondary"
                className="bg-emerald-500/20 text-emerald-600"
              >
                {activeInbound.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeInbound.map((call) => (
              <div
                key={call._id}
                className="flex items-center justify-between p-3 rounded-xl bg-background border"
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <PhoneIncoming className="w-5 h-5 text-emerald-500" />
                    <span className="absolute inset-0 rounded-full border border-emerald-500 animate-ping opacity-50" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {getCallDisplayName(call)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(call._creationTime, {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAnswer(call._id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-900/20"
                >
                  <Phone className="w-4 h-4" />
                  {t("meetings.answer")}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label={t("meetings.totalCalls")}
          value={allCalls.length}
          icon={<Phone className="w-4 h-4" />}
          className="text-foreground"
        />
        <StatCard
          label={t("meetings.incomingTab")}
          value={incomingCalls.length}
          icon={<PhoneIncoming className="w-4 h-4" />}
          className="text-blue-600"
        />
        <StatCard
          label={t("meetings.outgoingTab")}
          value={outgoingCalls.length}
          icon={<PhoneOutgoing className="w-4 h-4" />}
          className="text-emerald-600"
        />
        <StatCard
          label={t("meetings.missedTab")}
          value={missedCalls.length}
          icon={<PhoneMissed className="w-4 h-4" />}
          className="text-red-500"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="all" className="gap-2">
            <Phone className="w-4 h-4" />
            {t("meetings.allTab")}
          </TabsTrigger>
          <TabsTrigger value="incoming" className="gap-2">
            <PhoneIncoming className="w-4 h-4" />
            {t("meetings.incomingTab")}
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="gap-2">
            <PhoneOutgoing className="w-4 h-4" />
            {t("meetings.outgoingTab")}
          </TabsTrigger>
          <TabsTrigger value="missed" className="gap-2">
            <PhoneMissed className="w-4 h-4" />
            {t("meetings.missedTab")}
            {missedCalls.length > 0 && (
              <Badge
                variant="destructive"
                className="text-xs px-1.5 py-0 min-w-5 h-5"
              >
                {missedCalls.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="lines" className="gap-2">
            <Settings className="w-4 h-4" />
            {t("meetings.linesTab")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <CallList
            calls={allCalls}
            emptyMessage={t("meetings.noHistory")}
            onRecall={handleRecall}
            onJoin={handleAnswer}
            getDisplayName={getCallDisplayName}
          />
        </TabsContent>

        <TabsContent value="incoming" className="mt-4">
          <CallList
            calls={incomingCalls}
            emptyMessage={t("meetings.noIncoming")}
            onRecall={handleRecall}
            onJoin={handleAnswer}
            getDisplayName={getCallDisplayName}
          />
        </TabsContent>

        <TabsContent value="outgoing" className="mt-4">
          <CallList
            calls={outgoingCalls}
            emptyMessage={t("meetings.noOutgoing")}
            onRecall={handleRecall}
            getDisplayName={getCallDisplayName}
          />
        </TabsContent>

        <TabsContent value="missed" className="mt-4">
          <CallList
            calls={missedCalls}
            emptyMessage={t("meetings.noMissed")}
            onRecall={handleRecall}
            getDisplayName={getCallDisplayName}
          />
        </TabsContent>

        <TabsContent value="lines" className="mt-4">
          {orgId && <CallLinesManager orgId={orgId} />}
        </TabsContent>
      </Tabs>

      {/* Call Interface Overlay */}
      {isInCall && (
        <Dialog open={isInCall} onOpenChange={(o) => !o && handleHangUp()}>
          <DialogContent
            autoFocus={false}
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
            className="max-w-5xl sm:max-w-5xl w-full h-[80vh] p-0 flex flex-col overflow-hidden bg-zinc-950 border-zinc-800"
          >
            {callContent}
          </DialogContent>
        </Dialog>
      )}

      {/* New Call Dialog */}
      <Dialog open={isCallDialogOpen} onOpenChange={setIsCallDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-emerald-500" />
                {t("iboite.call.newCallTitle")}
              </h2>
              <p className="text-sm border-b pb-4 text-muted-foreground">
                Recherchez un utilisateur ou un organisme pour démarrer un
                appel.
              </p>
            </div>

            <Tabs
              value={callSearchType}
              onValueChange={(v) => {
                setCallSearchType(v as "user" | "org");
                setCallSearchQuery("");
                setDebouncedSearch("");
              }}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="user">Utilisateur</TabsTrigger>
                <TabsTrigger value="org">Organisme</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-4">
              <div className="relative">
                <Input
                  placeholder={
                    callSearchType === "user"
                      ? "Rechercher par nom..."
                      : "Rechercher un organisme..."
                  }
                  value={callSearchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleSearchChange(e.target.value)
                  }
                  className="pl-9"
                  autoFocus
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>

              <div className="min-h-[200px] max-h-[300px] overflow-y-auto border rounded-md">
                {debouncedSearch.length < 2 ? (
                  <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                    Tapez au moins 2 caractères...
                  </div>
                ) : callSearchType === "user" && searchUsers === undefined ? (
                  <div className="flex items-center justify-center h-[200px]">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : callSearchType === "user" && searchUsers?.length === 0 ? (
                  <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                    Aucun utilisateur trouvé.
                  </div>
                ) : callSearchType === "org" && filteredOrgs.length === 0 ? (
                  <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                    Aucun organisme trouvé.
                  </div>
                ) : (
                  <div className="p-1">
                    {callSearchType === "user" &&
                      searchUsers?.map((u) => (
                        <div
                          key={u._id}
                          className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md transition-colors"
                        >
                          <div className="min-w-0 pr-4">
                            <p className="text-sm font-medium truncate">
                              {u.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {u.email}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            className="shrink-0 gap-1.5"
                            variant="secondary"
                            disabled={isCalling}
                            onClick={() =>
                              handleInitiateCall({ type: "user", id: u._id })
                            }
                          >
                            <Phone className="w-3.5 h-3.5" />
                            Appeler
                          </Button>
                        </div>
                      ))}
                    {callSearchType === "org" &&
                      filteredOrgs?.map((org) => (
                        <div
                          key={org._id}
                          className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md transition-colors"
                        >
                          <div className="min-w-0 pr-4">
                            <p className="text-sm font-medium truncate">
                              {org.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {org.type}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            className="shrink-0 gap-1.5"
                            variant="secondary"
                            disabled={isCalling}
                            onClick={() =>
                              handleInitiateCall({ type: "org", id: org._id })
                            }
                          >
                            <Phone className="w-3.5 h-3.5" />
                            Appeler
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// StatCard
// ============================================

function StatCard({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-2xl font-bold ${className ?? ""}`}>{value}</p>
        </div>
        <div className={`opacity-50 ${className ?? ""}`}>{icon}</div>
      </div>
    </Card>
  );
}

// ============================================
// CallList Component
// ============================================

function CallList({
  calls,
  emptyMessage,
  onRecall,
  onJoin,
  getDisplayName,
}: {
  calls: Doc<"meetings">[];
  emptyMessage: string;
  onRecall?: (call: Doc<"meetings">) => void;
  onJoin?: (meetingId: Id<"meetings">) => void;
  getDisplayName: (call: Doc<"meetings">) => string;
}) {
  const { t } = useTranslation();

  if (calls.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <PhoneOff className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {calls.map((call) => {
        const isInbound = call.isOrgInbound === true;
        const duration =
          call.startedAt && call.endedAt
            ? Math.round((call.endedAt - call.startedAt) / 1000)
            : null;

        const isMissed =
          isInbound &&
          call.status === "ended" &&
          call.participants.filter((p) => p.joinedAt).length <= 1;

        const statusConfig: Record<
          string,
          { label: string; className: string }
        > = {
          active: {
            label: t("meetings.statusActive"),
            className: "bg-emerald-500/10 text-emerald-600",
          },
          ended: {
            label: isMissed
              ? t("meetings.statusMissed")
              : t("meetings.statusEnded"),
            className: isMissed
              ? "bg-red-500/10 text-red-500"
              : "bg-zinc-500/10 text-zinc-500",
          },
          cancelled: {
            label: t("meetings.statusCancelled"),
            className: "bg-red-500/10 text-red-500",
          },
          scheduled: {
            label: t("meetings.statusScheduled"),
            className: "bg-blue-500/10 text-blue-500",
          },
        };

        const status = statusConfig[call.status] ?? statusConfig.ended;

        return (
          <div
            key={call._id}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
              call.status === "active"
                ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-900/10 hover:bg-emerald-50/60 dark:hover:bg-emerald-900/20"
                : "bg-card hover:bg-muted/40"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                isMissed
                  ? "bg-red-500/10"
                  : isInbound
                    ? "bg-blue-500/10"
                    : "bg-emerald-500/10"
              }`}
            >
              {isMissed ? (
                <PhoneMissed className="w-4 h-4 text-red-500" />
              ) : isInbound ? (
                <PhoneIncoming className="w-4 h-4 text-blue-500" />
              ) : (
                <PhoneOutgoing className="w-4 h-4 text-emerald-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {getDisplayName(call)}
              </p>
              <p className="text-xs text-muted-foreground">
                <span
                  className={
                    isMissed
                      ? "text-red-500 font-medium"
                      : isInbound
                        ? "text-blue-500"
                        : "text-emerald-500"
                  }
                >
                  {isMissed
                    ? t("meetings.missed")
                    : isInbound
                      ? t("meetings.incoming")
                      : t("meetings.outgoing")}
                </span>
                {" · "}
                {formatDistanceToNow(call._creationTime, {
                  addSuffix: true,
                  locale: fr,
                })}
                {duration !== null && (
                  <>
                    {" · "}
                    {duration < 60
                      ? `${duration}s`
                      : `${Math.floor(duration / 60)}m ${duration % 60}s`}
                  </>
                )}
                {" · "}
                {call.participants.length} {t("meetings.participants")}
              </p>
            </div>

            {/* Join button for active inbound calls */}
            {onJoin && call.status === "active" && call.isOrgInbound && (
              <Button
                size="sm"
                className="gap-2 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => onJoin(call._id)}
              >
                <Phone className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {t("meetings.join")}
                </span>
              </Button>
            )}

            {/* Recall button for ended/cancelled calls */}
            {onRecall &&
              (call.status === "ended" || call.status === "cancelled") && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-2 shrink-0"
                  onClick={() => onRecall(call)}
                >
                  <PhoneCall className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {t("meetings.recall")}
                  </span>
                </Button>
              )}

            <Badge variant="secondary" className={status!.className}>
              {status!.label}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// CallLinesManager — Manage call lines for the org
// ============================================

function CallLinesManager({ orgId }: { orgId: Id<"orgs"> }) {
  const { t } = useTranslation();
  const [newLineLabel, setNewLineLabel] = useState("");
  const [newLineDescription, setNewLineDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<string>("");

  // Fetch call lines and org members
  const { data: callLines } = useAuthenticatedConvexQuery(
    api.functions.callLines.listForAdmin,
    { orgId },
  );

  const { data: members } = useAuthenticatedConvexQuery(
    api.functions.orgs.getMembers,
    { orgId },
  );

  const createLine = useConvexMutationQuery(api.functions.callLines.create);
  const removeLine = useConvexMutationQuery(api.functions.callLines.remove);
  const addAgentMut = useConvexMutationQuery(api.functions.callLines.addAgent);
  const removeAgentMut = useConvexMutationQuery(
    api.functions.callLines.removeAgent,
  );
  const updateLine = useConvexMutationQuery(api.functions.callLines.update);

  const handleCreate = async () => {
    if (!newLineLabel.trim()) return;
    setIsCreating(true);
    try {
      await createLine.mutateAsync({
        orgId,
        label: newLineLabel.trim(),
        description: newLineDescription.trim() || undefined,
      });
      setNewLineLabel("");
      setNewLineDescription("");
      setShowCreateForm(false);
    } catch (e) {
      console.error("Failed to create call line:", e);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (callLineId: Id<"callLines">) => {
    try {
      await removeLine.mutateAsync({ callLineId });
    } catch (e) {
      console.error("Failed to delete call line:", e);
    }
  };

  const handleAddAgent = async (callLineId: Id<"callLines">) => {
    if (!selectedMembership) return;
    try {
      await addAgentMut.mutateAsync({
        callLineId,
        membershipId: selectedMembership as Id<"memberships">,
      });
      setSelectedMembership("");
    } catch (e) {
      console.error("Failed to add agent:", e);
    }
  };

  const handleRemoveAgent = async (
    callLineId: Id<"callLines">,
    membershipId: Id<"memberships">,
  ) => {
    try {
      await removeAgentMut.mutateAsync({ callLineId, membershipId });
    } catch (e) {
      console.error("Failed to remove agent:", e);
    }
  };

  const handleToggleActive = async (
    callLineId: Id<"callLines">,
    isActive: boolean,
  ) => {
    try {
      await updateLine.mutateAsync({ callLineId, isActive });
    } catch (e) {
      console.error("Failed to toggle line:", e);
    }
  };

  const orgLines = callLines?.filter((l) => l.type === "org") ?? [];
  const personalLines = callLines?.filter((l) => l.type === "personal") ?? [];

  return (
    <div className="space-y-6">
      {/* Org Lines Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">
            {t("meetings.orgLines")}
          </h3>
          <Button
            size="sm"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {t("meetings.createLine")}
          </Button>
        </div>

        {/* Create form */}
        {showCreateForm && (
          <Card className="mb-4">
            <CardContent className="pt-4 space-y-3">
              <Input
                placeholder={t("meetings.lineLabelPlaceholder")}
                value={newLineLabel}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewLineLabel(e.target.value)
                }
              />
              <Input
                placeholder={t("meetings.lineDescPlaceholder")}
                value={newLineDescription}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewLineDescription(e.target.value)
                }
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateForm(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={!newLineLabel.trim() || isCreating}
                >
                  {isCreating && (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  )}
                  {t("common.create")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Org lines list */}
        {orgLines.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Phone className="w-8 h-8 mx-auto mb-2 opacity-30" />
            {t("meetings.noLines")}
          </div>
        ) : (
          <div className="space-y-3">
            {orgLines.map((line) => (
              <CallLineCard
                key={line._id}
                line={line}
                members={members ?? []}
                selectedMembership={selectedMembership}
                onSelectMembership={setSelectedMembership}
                onAddAgent={handleAddAgent}
                onRemoveAgent={handleRemoveAgent}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
              />
            ))}
          </div>
        )}
      </div>

      {personalLines.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="text-base font-semibold mb-4">
              {t("meetings.personalLines")}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              {t("meetings.personalLinesDesc")}
            </p>
            <div className="space-y-2">
              {personalLines.map((line) => (
                <div
                  key={line._id}
                  className="flex items-center justify-between p-3 rounded-xl border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{line.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("meetings.directLine")}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={line.isActive ? "secondary" : "outline"}
                    className={
                      line.isActive ? "bg-emerald-500/10 text-emerald-600" : ""
                    }
                  >
                    {line.isActive
                      ? t("common.active")
                      : t("common.inactive")}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// CallLineCard — Individual call line management
// ============================================

function CallLineCard({
  line,
  members,
  selectedMembership,
  onSelectMembership,
  onAddAgent,
  onRemoveAgent,
  onDelete,
  onToggleActive,
}: {
  line: any;
  members: any[];
  selectedMembership: string;
  onSelectMembership: (id: string) => void;
  onAddAgent: (callLineId: Id<"callLines">) => void;
  onRemoveAgent: (
    callLineId: Id<"callLines">,
    membershipId: Id<"memberships">,
  ) => void;
  onDelete: (callLineId: Id<"callLines">) => void;
  onToggleActive: (callLineId: Id<"callLines">, isActive: boolean) => void;
}) {
  const { t } = useTranslation();

  // Members not yet on this line
  const assignedIds = new Set(
    (line.agents ?? []).map((a: any) => a.membershipId as string),
  );
  const availableMembers = members.filter(
    (m) => !assignedIds.has(m.membershipId as string),
  );

  return (
    <Card className={!line.isActive ? "opacity-60" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm">{line.label}</CardTitle>
            {line.isDefault && (
              <Badge variant="secondary" className="text-[10px]">
                {t("meetings.defaultLine")}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => onToggleActive(line._id, !line.isActive)}
            >
              {line.isActive
                ? t("meetings.deactivate")
                : t("meetings.activate")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(line._id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        {line.description && (
          <p className="text-xs text-muted-foreground">{line.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Assigned agents */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            {t("meetings.assignedAgents")} (
            {line.agents?.length ?? 0})
          </p>
          {(line.agents?.length ?? 0) === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              {t("meetings.noAgents")}
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {line.agents?.map((agent: any) => (
                <Badge
                  key={agent.membershipId}
                  variant="secondary"
                  className="gap-1 pr-1"
                >
                  {agent.name}
                  <button
                    type="button"
                    title="Retirer l'agent"
                    onClick={() => onRemoveAgent(line._id, agent.membershipId)}
                    className="ml-1 rounded-full p-0.5 hover:bg-destructive/20 transition-colors"
                  >
                    <UserMinus className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Add agent selector */}
        {availableMembers.length > 0 && (
          <div className="flex gap-2">
            <Select
              value={selectedMembership}
              onValueChange={onSelectMembership}
            >
              <SelectTrigger className="flex-1 h-8 text-xs">
                <SelectValue
                  placeholder={t("meetings.selectAgent")}
                />
              </SelectTrigger>
              <SelectContent>
                {availableMembers.map((m) => (
                  <SelectItem key={m.membershipId} value={m.membershipId}>
                    {[m.firstName, m.lastName].filter(Boolean).join(" ") ||
                      m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 gap-1"
              disabled={!selectedMembership}
              onClick={() => onAddAgent(line._id)}
            >
              <UserPlus className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
