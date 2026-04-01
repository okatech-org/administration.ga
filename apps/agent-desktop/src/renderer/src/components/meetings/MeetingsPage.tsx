import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  ArrowLeft,
  Clock,
  Loader2,
  Phone,
  PhoneOff,
  Plus,
  Users,
  Video,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { useOrg } from "../../hooks/useOrg";
import { useMeeting } from "../../hooks/useMeeting";
import { useAuthenticatedConvexQuery } from "../../hooks/useConvexHooks";

import { Button } from "@workspace/ui/components/button";

export function MeetingsPage() {
  const { t } = useTranslation();
  const { orgId } = useOrg();
  const [activeMeetingId, setActiveMeetingId] = useState<Id<"meetings"> | null>(
    null,
  );
  const [showPreJoin, setShowPreJoin] = useState(false);

  // Hook — meeting lifecycle
  const {
    meeting,
    token,
    wsUrl,
    isConnecting,
    error,
    connect,
    disconnect,
    createMeeting,
    endMeeting,
  } = useMeeting(activeMeetingId ?? undefined);

  // List of org meetings — authenticated query with error handling
  const { data: meetingsData, isLoading: isMeetingsLoading } =
    useAuthenticatedConvexQuery(
      api.functions.meetings.listByOrg,
      orgId ? { orgId } : "skip",
    );
  const meetings = meetingsData?.meetings;

  // ─── Create a quick meeting ───────────────────────────────
  const handleCreateMeeting = useCallback(async () => {
    if (!orgId) return;
    try {
      const result = await createMeeting.mutateAsync({
        title: `Réunion ${new Date().toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}`,
        type: "meeting",
        orgId,
        participantIds: [],
      });
      setActiveMeetingId(result.meetingId);
      setShowPreJoin(true);
    } catch (err) {
      console.error("Failed to create meeting:", err);
    }
  }, [orgId, createMeeting]);

  // ─── Join a meeting ───────────────────────────────────────
  const handleJoinMeeting = useCallback((meetingId: Id<"meetings">) => {
    setActiveMeetingId(meetingId);
    setShowPreJoin(true);
  }, []);

  // ─── Connect ──────────────────────────────────────────────
  const handleConnect = useCallback(async () => {
    if (!activeMeetingId) return;
    await connect(activeMeetingId);
    setShowPreJoin(false);
  }, [activeMeetingId, connect]);

  // ─── Disconnect ───────────────────────────────────────────
  const handleDisconnect = useCallback(async () => {
    if (!activeMeetingId) return;
    await disconnect(activeMeetingId);
    setActiveMeetingId(null);
  }, [activeMeetingId, disconnect]);

  // ─── Active meeting room ─────────────────────────────────
  if (token && wsUrl && activeMeetingId) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleDisconnect}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-semibold">
            {meeting?.title ?? t("meetings.activeCall", "Appel en cours")}
          </h1>
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              await endMeeting.mutateAsync({ meetingId: activeMeetingId });
              handleDisconnect();
            }}
            className="ml-auto gap-1.5"
          >
            <PhoneOff className="w-4 h-4" />
            {t("meetings.end", "Terminer")}
          </Button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-zinc-950 text-white">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Video className="w-10 h-10 text-emerald-400 animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">
              {meeting?.title ?? t("meetings.activeCall", "Réunion en cours")}
            </p>
            <p className="text-sm text-zinc-400 mt-1">
              {meeting?.participants.length ?? 0} {t("meetings.participants", "participants")}
            </p>
          </div>
          <Button
            variant="destructive"
            size="lg"
            onClick={handleDisconnect}
            className="gap-2 rounded-full px-8"
          >
            <PhoneOff className="w-5 h-5" />
            {t("meetings.leave", "Quitter")}
          </Button>
        </div>
      </div>
    );
  }

  // ─── Pre-join screen ─────────────────────────────────────
  if (showPreJoin && activeMeetingId) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center">
          <Video className="w-10 h-10 text-rose-500" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">
            {meeting?.title ?? "Réunion"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {meeting?.participants.length ?? 0} {t("meetings.participants", "participants")}
          </p>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setShowPreJoin(false);
              setActiveMeetingId(null);
            }}
          >
            {t("common.cancel", "Annuler")}
          </Button>
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="bg-rose-600 hover:bg-rose-700 text-white gap-2"
          >
            {isConnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Phone className="w-4 h-4" />
            )}
            {t("meetings.join", "Rejoindre")}
          </Button>
        </div>
      </div>
    );
  }

  // ─── Meetings list ───────────────────────────────────────
  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("meetings.title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t(
              "meetings.description",
              "Gérez vos appels audio/vidéo et réunions en ligne",
            )}
          </p>
        </div>
        <Button
          onClick={handleCreateMeeting}
          className="bg-rose-600 hover:bg-rose-700 text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          {t("meetings.create")}
        </Button>
      </div>

      {/* Meetings list */}
      <div className="space-y-2">
        {isMeetingsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !meetings || meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center">
              <Video className="w-8 h-8 text-rose-500" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{t("meetings.create")}</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                {t(
                  "meetings.empty.description",
                  "Créez une réunion ou appelez directement depuis une demande.",
                )}
              </p>
            </div>
          </div>
        ) : (
          meetings.map((m) => (
            <div
              key={m._id}
              className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    m.status === "active"
                      ? "bg-green-500/10 text-green-500"
                      : m.status === "scheduled"
                        ? "bg-blue-500/10 text-blue-500"
                        : "bg-zinc-500/10 text-zinc-500"
                  }`}
                >
                  {m.type === "call" ? (
                    <Phone className="w-5 h-5" />
                  ) : (
                    <Video className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{m.title}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {m.participants.length}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {m.startedAt
                        ? new Date(m.startedAt).toLocaleString("fr-FR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : m.scheduledAt
                          ? new Date(m.scheduledAt).toLocaleString("fr-FR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "—"}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${
                        m.status === "active"
                          ? "bg-green-500/10 text-green-600"
                          : m.status === "scheduled"
                            ? "bg-blue-500/10 text-blue-600"
                            : m.status === "ended"
                              ? "bg-zinc-500/10 text-zinc-500"
                              : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                </div>
              </div>

              {(m.status === "active" || m.status === "scheduled") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleJoinMeeting(m._id)}
                  className="gap-1.5"
                >
                  <Phone className="w-4 h-4" />
                  {t("meetings.join")}
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
