"use client";

/**
 * CallRecordingsList — Sprint 6
 *
 * Liste des enregistrements d'appel (playback superviseur).
 * Design System v3.0 :
 *  - FlatCard wrapper
 *  - SectionHeader avec icon Disc
 *  - Sub-cards S4 par recording
 *  - Status badges (emerald=completed, amber=pending, rose=failed)
 */

import { useState } from "react";
import {
  Disc,
  Loader2,
  Play,
  Pause,
  Trash2,
  Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { cn } from "@workspace/ui/lib/utils";

type CallRecording = Doc<"callRecordings">;

export function CallRecordingsList({ orgId }: { orgId: Id<"orgs"> | null }) {
  const { t } = useTranslation();
  const [playingId, setPlayingId] = useState<Id<"callRecordings"> | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

  const query = useAuthenticatedConvexQuery(
    api.functions.callRecordings.listForOrg,
    orgId ? { orgId, limit: 50 } : "skip",
  );
  const getPlaybackUrl = useMutation(
    api.functions.callRecordings.getPlaybackUrl,
  );
  const deleteRecording = useMutation(
    api.functions.callRecordings.deleteRecording,
  );

  if (!orgId) return null;

  const recordings = (query.data ?? []) as CallRecording[];

  const handlePlay = async (rec: CallRecording) => {
    if (playingId === rec._id) {
      setPlayingId(null);
      setPlaybackUrl(null);
      return;
    }
    if (rec.status !== "completed" || !rec.storageId) {
      toast.error(t("callCenter.recording.status.pending"));
      return;
    }
    try {
      const result = await getPlaybackUrl({ recordingId: rec._id });
      if (result?.url) {
        setPlaybackUrl(result.url);
        setPlayingId(rec._id);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de lire l'enregistrement",
      );
    }
  };

  const handleDelete = async (id: Id<"callRecordings">) => {
    if (!window.confirm(t("callCenter.recording.deleteConfirm"))) return;
    try {
      await deleteRecording({ recordingId: id });
      if (playingId === id) {
        setPlayingId(null);
        setPlaybackUrl(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur suppression");
    }
  };

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto rounded-xl bg-[#F4F3ED] dark:bg-[#171616] p-0">
        <div className="p-3 lg:p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-bold">
              <div className="rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.12] p-1">
                <Disc className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              {t("callCenter.recording.title")}
            </span>
          </div>

          {query.isPending && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}

          {!query.isPending && recordings.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <div className="rounded-full bg-[#EBE6DC] dark:bg-[#383633] p-4">
                <Disc className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {t("callCenter.recording.empty")}
              </p>
              <p className="text-xs font-medium text-muted-foreground">
                {t("callCenter.recording.emptyHint")}
              </p>
            </div>
          )}

          {recordings.length > 0 && (
            <ul className="flex flex-col gap-2">
              {recordings.map((rec) => (
                <RecordingItem
                  key={rec._id}
                  rec={rec}
                  playing={playingId === rec._id}
                  playbackUrl={playingId === rec._id ? playbackUrl : null}
                  onPlay={() => handlePlay(rec)}
                  onDelete={() => handleDelete(rec._id)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function RecordingItem({
  rec,
  playing,
  playbackUrl,
  onPlay,
  onDelete,
}: {
  rec: CallRecording;
  playing: boolean;
  playbackUrl: string | null;
  onPlay: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();

  const startedAt = new Date(rec.startedAt).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
  const durationLabel = rec.durationMs
    ? `${Math.round(rec.durationMs / 1000)}s`
    : "—";

  const retentionDays = Math.max(
    1,
    Math.floor((rec.retentionUntil - Date.now()) / (24 * 3600 * 1000)),
  );

  return (
    <li className="rounded-lg bg-[#FDFCFA] dark:bg-[#21201E]/77 p-2.5">
      <div className="flex items-start gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-xs leading-tight font-bold text-foreground">
              {startedAt}
            </p>
            <span className="font-mono text-[10px] font-medium text-muted-foreground shrink-0">
              {durationLabel}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={rec.status} />
            <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              {t("callCenter.recording.retentionNotice", {
                days: retentionDays,
              })}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={onPlay}
              disabled={rec.status !== "completed"}
              className="flex h-7 items-center gap-1.5 rounded-lg bg-[#DCD7C7] dark:bg-[#4A4744]/40 px-2.5 text-xs font-medium text-foreground transition-transform hover:bg-[#DCD7C7]/80 active:scale-[0.97] disabled:opacity-50"
            >
              {playing ? (
                <Pause className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              {t("callCenter.recording.playback")}
            </button>

            <button
              type="button"
              onClick={onDelete}
              aria-label={t("callCenter.recording.deleteConfirm")}
              className="ml-auto h-7 w-7 rounded-full hover:bg-rose-500/10 active:scale-[0.97] transition-transform flex items-center justify-center"
            >
              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400" />
            </button>
          </div>

          {playing && playbackUrl && (
            <audio
              src={playbackUrl}
              controls
              autoPlay
              className="mt-2 w-full"
            />
          )}
        </div>
      </div>
    </li>
  );
}

function StatusBadge({
  status,
}: {
  status: CallRecording["status"];
}) {
  const { t } = useTranslation();
  const cls = {
    completed:
      "bg-primary/15 text-primary",
    pending:
      "bg-warning/15 text-muted-foreground",
    failed: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  }[status];
  return (
    <span
      className={cn(
        "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
        cls,
      )}
    >
      {t(`callCenter.recording.status.${status}`)}
    </span>
  );
}
