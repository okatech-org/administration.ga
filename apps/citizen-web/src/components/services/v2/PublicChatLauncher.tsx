"use client"

import { Loader2, Send, Sparkles, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useAction } from "convex/react"
import { toast } from "sonner"
import { api } from "@convex/_generated/api"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

type Msg = { role: "user" | "assistant"; content: string }

const SESSION_KEY = "publicChatSessionId"

function getSessionId(): string {
  if (typeof window === "undefined") return ""
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

export function PublicChatLauncher({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const session = authClient.useSession()
  const isAuthed = !!session.data?.user
  const ask = useAction(api.ai.publicChat.askMrRayPublic)

  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const dailyLimit = isAuthed ? 10 : 1

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setLoading(true)
    setMessages((prev) => [...prev, { role: "user", content: text }])
    setInput("")

    try {
      const result = await ask({
        message: text,
        sessionId: getSessionId(),
        history: messages.slice(-6),
      })
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.reply },
      ])
      if (typeof result.remaining === "number") setRemaining(result.remaining)
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erreur lors de l'envoi"
      if (msg.includes("RATE_LIMIT") || msg.includes("RateLimit")) {
        toast.error(
          t("services.chat.limitReached", {
            limit: dailyLimit,
            defaultValue:
              "Limite atteinte ({{limit}}/jour). Connectez-vous pour 10 questions/jour.",
          }),
        )
      } else {
        toast.error(msg)
      }
      // Roll back the optimistic user message
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="public-chat-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 backdrop-blur-sm md:items-center md:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex h-[80dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[28px] border border-[var(--pub-border)] bg-[var(--pub-surface)] shadow-[0_18px_50px_-22px_rgba(20,19,15,.4)] md:h-[640px] md:rounded-[28px]">
        <div className="flex items-center justify-between border-b border-[var(--pub-border)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-full bg-[var(--pub-gabon-blue-tint)] text-[var(--pub-gabon-blue)]">
              <Sparkles className="size-4" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="public-chat-title"
                className="text-[15px] font-semibold text-[var(--pub-text)]"
              >
                {t("services.chat.title", "Mr Ray, assistant Consulat.ga")}
              </h2>
              <p className="text-[12px] text-[var(--pub-text-muted)]">
                {isAuthed
                  ? t("services.chat.subtitleUser", {
                      remaining: remaining ?? dailyLimit,
                      defaultValue: "{{remaining}} questions restantes / 10 par jour",
                    })
                  : t("services.chat.subtitleGuest", {
                      remaining: remaining ?? dailyLimit,
                      defaultValue:
                        "{{remaining}}/1 question gratuite — connectez-vous pour 10/jour",
                    })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close", "Fermer")}
            className="grid size-9 place-items-center rounded-full text-[var(--pub-text-muted)] hover:bg-[var(--pub-surface-2)]"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto px-5 py-5"
        >
          {messages.length === 0 && (
            <div className="rounded-[14px] bg-[var(--pub-surface-2)] p-4 text-[14px] leading-[1.55] text-[var(--pub-text-muted)]">
              {t(
                "services.chat.greeting",
                "Bonjour ! Je suis Mr Ray, du Standard du Consulat. Demandez-moi quelle démarche vous concerne, quels documents préparer, ou comment prendre rendez-vous.",
              )}
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-[14px] px-4 py-3 text-[14px] leading-[1.55]",
                  m.role === "user"
                    ? "bg-[var(--pub-gabon-blue)] text-white"
                    : "bg-[var(--pub-surface-2)] text-[var(--pub-text)]",
                )}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 rounded-[14px] bg-[var(--pub-surface-2)] px-4 py-3 text-[14px] text-[var(--pub-text-muted)]">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {t("services.chat.thinking", "Mr Ray réfléchit…")}
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
          className="border-t border-[var(--pub-border)] p-4"
        >
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              rows={1}
              placeholder={t(
                "services.chat.placeholder",
                "Quelle démarche vous concerne ?",
              )}
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-[10px] border border-[var(--pub-border)] bg-[var(--pub-surface)] px-3.5 py-3 text-[14px] text-[var(--pub-text)] placeholder:text-[var(--pub-text-faint)] focus:border-[var(--pub-gabon-blue)] focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label={t("services.chat.send", "Envoyer")}
              className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-[var(--pub-gabon-blue)] text-white transition-colors hover:bg-[var(--pub-gabon-blue-deep)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="size-4" aria-hidden="true" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
