"use client";

import {
  useChat,
  useConnectionState,
  useLocalParticipant,
  useRemoteParticipants,
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

interface MeetingChatPanelProps {
  onClose?: () => void;
  /** Si true, rend le chat en panneau plein-hauteur (réunion). Sinon en mode embedded. */
  variant?: "panel" | "embedded";
}

/**
 * MeetingChatPanel — chat éphémère pendant une réunion (LiveKit DataChannel).
 *
 * - Pas de persistance Convex (les messages disparaissent à la fin de la session).
 * - Utilise `useChat()` de @livekit/components-react.
 * - Doit être monté à l'intérieur d'un <LiveKitRoom>.
 *
 * Couleur pseudo participant : déterministe via hashing du sid pour cohérence
 * entre messages d'un même expéditeur (fallback : palette d'accents OKLCh).
 */
export function MeetingChatPanel({
  onClose,
  variant = "panel",
}: MeetingChatPanelProps) {
  const { t } = useTranslation();
  const { chatMessages, send, isSending } = useChat();
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const connectionState = useConnectionState();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll vers le bas à chaque nouveau message
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatMessages.length]);

  // Warmup data channel — voir agent-web/MeetingChatPanel.tsx pour l'explication.
  // Sans ce ping initial, le tout 1er `send` part avant que les peers n'aient
  // négocié l'abonnement au topic 'lk.chat' → message vu localement uniquement.
  const warmedUpRef = useRef(false);
  useEffect(() => {
    if (warmedUpRef.current) return;
    if (connectionState !== ConnectionState.Connected) return;
    if (!localParticipant) return;
    if (remoteParticipants.length === 0) return;
    warmedUpRef.current = true;
    const encoder = new TextEncoder();
    const data = encoder.encode("warmup");
    localParticipant
      .publishData(data, { reliable: true, topic: "lk.chat-warmup" })
      .catch(() => {});
  }, [connectionState, localParticipant, remoteParticipants.length]);

  const isConnected = connectionState === ConnectionState.Connected;

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const text = draft.trim();
      if (!text || isSending) return;
      if (!isConnected) return;
      try {
        await send(text);
        setDraft("");
      } catch {
        // Silencieux : si la room est déconnectée, le bouton sera quand même actif.
      }
    },
    [draft, send, isSending, isConnected],
  );

  const myIdentity = localParticipant?.identity;

  return (
    <div
      className={cn(
        "flex flex-col min-h-0 bg-white/4 border border-white/6 rounded-2xl",
        variant === "panel" ? "h-full" : "h-[420px]",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2 shrink-0">
        <span className="text-[11px] uppercase tracking-[0.12em] text-white/50 font-medium">
          {t("meetings.chat.title", "Discussion")}
        </span>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/10"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 pb-3 flex flex-col gap-2 text-[12.5px] text-white/90"
      >
        {chatMessages.length === 0 ? (
          <p className="text-center text-white/40 italic mt-6">
            {t(
              "meetings.chat.empty",
              "Aucun message pour l'instant. Écrivez le premier !",
            )}
          </p>
        ) : (
          chatMessages.map((msg, i) => {
            const senderIdentity = msg.from?.identity;
            const isMine = senderIdentity === myIdentity;
            const senderName =
              msg.from?.name ?? senderIdentity ?? t("meetings.chat.anonymous", "Anonyme");
            const color = colorForSid(senderIdentity ?? `idx-${i}`);
            return (
              <div key={msg.timestamp + ":" + i} className="leading-snug">
                <strong style={{ color }}>
                  {isMine ? t("meetings.chat.me", "Moi") : senderName}
                </strong>{" "}
                <span>{msg.message}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-white/6 px-3 py-2.5 shrink-0"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("meetings.chat.placeholder", "Écrire un message…")}
          className="flex-1 bg-white/6 text-white placeholder:text-white/35 text-[12.5px] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/60"
          maxLength={500}
        />
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-primary hover:bg-primary/15 shrink-0"
          disabled={!draft.trim() || isSending}
          aria-label={t("meetings.chat.send", "Envoyer")}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

/** Palette d'accents pour pseudo participants — OKLCh, cohérente charte. */
const PARTICIPANT_COLORS = [
  "#7fc1eb", // primary tint
  "#a29bfe", // purple
  "#7fdca4", // green
  "#f7c873", // amber
  "#f4a8b6", // pink
  "#9bd6e0", // teal
] as const;

function colorForSid(sid: string): string {
  let hash = 0;
  for (let i = 0; i < sid.length; i++) {
    hash = (hash * 31 + sid.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % PARTICIPANT_COLORS.length;
  return PARTICIPANT_COLORS[idx]!;
}
