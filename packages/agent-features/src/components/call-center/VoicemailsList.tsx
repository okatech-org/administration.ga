"use client";

/**
 * VoicemailsList — Sprint 6
 *
 * Affiche la liste des messages vocaux pour une organisation.
 * Respecte le Citizen Design System v3.0 :
 *  - FlatCard (rounded-xl, bg S1) comme conteneur racine
 *  - SectionHeader (icon Voicemail + title)
 *  - Sub-cards S4 par voicemail, unread = point primary + font-bold
 *  - Badge count S2
 *  - Palette achromatique + primary pour rappel CTA
 */

import { useState } from "react";
import {
  Loader2,
  Play,
  Pause,
  PhoneCall,
  Trash2,
  Voicemail as VoicemailIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { cn } from "@workspace/ui/lib/utils";

type Voicemail = Doc<"voicemails">;

export function VoicemailsList({ orgId }: { orgId: Id<"orgs"> | null }) {
  const { t } = useTranslation();
  const [playingId, setPlayingId] = useState<Id<"voicemails"> | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

  const query = useAuthenticatedConvexQuery(
    api.functions.voicemails.listForOrg,
    orgId ? { orgId, limit: 50 } : "skip",
  );
  const markAsRead = useMutation(
    api.functions.voicemails.markAsRead,
  );
  const getPlaybackUrl = useMutation(
    api.functions.voicemails.getPlaybackUrl,
  );
  const deleteVoicemail = useMutation(
    api.functions.voicemails.deleteVoicemail,
  );

  if (!orgId) return null;

  const voicemails = (query.data ?? []) as Voicemail[];
  const unreadCount = voicemails.filter((v) => !v.isRead).length;

  const handlePlay = async (vm: Voicemail) => {
    if (playingId === vm._id) {
      setPlayingId(null);
      setPlaybackUrl(null);
      return;
    }
    try {
      const result = await getPlaybackUrl({ voicemailId: vm._id });
      if (result?.url) {
        setPlaybackUrl(result.url);
        setPlayingId(vm._id);
        if (!vm.isRead) {
          await markAsRead({ voicemailId: vm._id, read: true });
        }
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de lire le message",
      );
    }
  };

  const handleDelete = async (id: Id<"voicemails">) => {
    if (!window.confirm(t("callCenter.voicemail.deleteConfirm"))) return;
    try {
      await deleteVoicemail({ voicemailId: id });
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
      {/* FlatCard root */}
      <div className="flex-1 overflow-y-auto rounded-xl bg-[#F4F3ED] dark:bg-[#171616] p-0">
        <div className="p-3 lg:p-4">
          {/* SectionHeader v3 */}
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-bold">
              <div className="rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.12] p-1">
                <VoicemailIcon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              {t("callCenter.voicemail.title")}
            </span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-[#EBE6DC] dark:bg-[#383633] px-2 py-0.5 text-xs font-bold text-muted-foreground">
                {t("callCenter.voicemail.unreadCountShort", {
                  count: unreadCount,
                })}
              </span>
            )}
          </div>

          {/* Empty state v3 */}
          {query.isPending && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
          {!query.isPending && voicemails.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <div className="rounded-full bg-[#EBE6DC] dark:bg-[#383633] p-4">
                <VoicemailIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {t("callCenter.voicemail.empty")}
              </p>
              <p className="text-xs font-medium text-muted-foreground">
                {t("callCenter.voicemail.emptyHint")}
              </p>
            </div>
          )}

          {/* Liste sub-cards S4 */}
          {voicemails.length > 0 && (
            <ul className="flex flex-col gap-2">
              {voicemails.map((vm) => (
                <VoicemailItem
                  key={vm._id}
                  vm={vm}
                  playing={playingId === vm._id}
                  playbackUrl={playingId === vm._id ? playbackUrl : null}
                  onPlay={() => handlePlay(vm)}
                  onMarkRead={() =>
                    markAsRead({ voicemailId: vm._id, read: !vm.isRead })
                  }
                  onDelete={() => handleDelete(vm._id)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function VoicemailItem({
  vm,
  playing,
  playbackUrl,
  onPlay,
  onMarkRead,
  onDelete,
}: {
  vm: Voicemail;
  playing: boolean;
  playbackUrl: string | null;
  onPlay: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const callerName =
    vm.citizenDisplayName ||
    vm.citizenPhoneOrEmail ||
    t("callCenter.voicemail.unknownCaller");
  const isUnread = !vm.isRead;
  const isPending = !vm.audioStorageId;

  const durationLabel = vm.durationMs
    ? `${Math.round(vm.durationMs / 1000)}s`
    : "—";

  return (
    <li
      className={cn(
        "rounded-lg bg-[#FDFCFA] dark:bg-[#21201E]/77 p-2.5 transition-colors",
        isUnread && "bg-[#F4F3ED] dark:bg-[#171616]",
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* Marker unread (point primary) */}
        {isUnread && (
          <span
            aria-hidden
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
          />
        )}
        {!isUnread && <span className="mt-1.5 h-2 w-2 shrink-0" />}

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p
              className={cn(
                "truncate text-xs leading-tight text-foreground",
                isUnread ? "font-bold" : "font-semibold",
              )}
            >
              {callerName}
            </p>
            <span className="font-mono text-[10px] font-medium text-muted-foreground shrink-0">
              {durationLabel}
            </span>
          </div>

          {/* Transcript preview */}
          {vm.transcript ? (
            <p className="mt-1 line-clamp-2 text-xs font-medium text-muted-foreground">
              {vm.transcript}
            </p>
          ) : (
            <p className="mt-1 text-xs font-medium text-muted-foreground italic">
              {t("callCenter.voicemail.noTranscript")}
            </p>
          )}

          {/* Actions */}
          <div className="mt-2 flex items-center gap-1.5">
            <button
              type="button"
              disabled={isPending}
              onClick={onPlay}
              className="flex h-7 items-center gap-1.5 rounded-lg bg-[#DCD7C7] dark:bg-[#4A4744]/40 px-2.5 text-xs font-medium text-foreground transition-transform hover:bg-[#DCD7C7]/80 active:scale-[0.97] disabled:opacity-50"
            >
              {playing ? (
                <Pause className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              {playing
                ? t("callCenter.voicemail.playing")
                : t("callCenter.voicemail.title")}
            </button>

            <button
              type="button"
              onClick={onMarkRead}
              className="h-7 rounded-lg bg-[#DCD7C7] dark:bg-[#4A4744]/40 px-2.5 text-xs font-medium text-foreground transition-transform hover:bg-[#DCD7C7]/80 active:scale-[0.97]"
            >
              {vm.isRead
                ? t("callCenter.voicemail.markUnread")
                : t("callCenter.voicemail.markRead")}
            </button>

            {vm.citizenUserId && (
              <button
                type="button"
                className="flex h-7 items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 text-xs font-medium text-primary transition-transform hover:bg-primary/15 active:scale-[0.97]"
              >
                <PhoneCall className="h-3 w-3" />
                {t("callCenter.voicemail.callBack")}
              </button>
            )}

            <button
              type="button"
              onClick={onDelete}
              aria-label={t("callCenter.voicemail.deleteConfirm")}
              className="ml-auto h-7 w-7 rounded-full hover:bg-rose-500/10 active:scale-[0.97] transition-transform flex items-center justify-center"
            >
              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400" />
            </button>
          </div>

          {/* Audio player natif, mount uniquement quand playing */}
          {playing && playbackUrl && (
            <audio
              src={playbackUrl}
              controls
              autoPlay
              className="mt-2 w-full"
            />
          )}

          {isPending && (
            <span className="mt-1 inline-block rounded-md bg-amber-500/15 dark:bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
              {t("callCenter.voicemail.pending")}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
