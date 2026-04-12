"use client"

/**
 * iAsted Citoyen — Layout WhatsApp Desktop 3 colonnes
 */

import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import dynamic from "next/dynamic"
import "@livekit/components-styles"
import { useRouter } from "next/navigation"
import {
  Bot,
  Building2,
  Contact,
  Globe,
  Headset,
  Loader2,
  Mail,
  MessageSquare,
  Minimize2,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  Pin,
  Search,
  Send,
  Shield,
  ShieldCheck,
} from "lucide-react"
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react"
import Markdown from "react-markdown"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { useMeeting } from "@/hooks/use-meeting"
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks"
import { useCallStore } from "@/stores/call-store"
import { PageHeader } from "@/components/my-space/page-header"
import { cn } from "@/lib/utils"

const LiveKitRoom = dynamic(
  () => import("@livekit/components-react").then((mod) => mod.LiveKitRoom),
  { ssr: false }
)

const CustomCallUI = dynamic(
  () =>
    import("@/components/meetings/custom-call-ui").then(
      (mod) => mod.CustomCallUI
    ),
  { ssr: false }
)

// ─────────────────────────────────────────────
// Types & constantes
// ─────────────────────────────────────────────

type TabId = "ichat" | "icall" | "icontact"

const NAV_ITEMS: Array<{ id: TabId; icon: typeof Phone; label: string }> = [
  { id: "ichat", icon: MessageSquare, label: "iChat" },
  { id: "icall", icon: Phone, label: "iAppel" },
  { id: "icontact", icon: Contact, label: "iContact" },
]

const MR_RAY_CONTACT = {
  id: "__mr_ray__",
  name: "Mr Ray",
  subtitle: "Standard — Assistance Consulaire",
  isAI: true,
  isStandard: true,
}

// ─────────────────────────────────────────────
// Page principale — Layout WhatsApp Desktop
// ─────────────────────────────────────────────

export default function IAstedCitizenPage() {
  const [activeTab, setActiveTab] = useState<TabId>("ichat")
  const [selectedContact, setSelectedContact] = useState<any>(MR_RAY_CONTACT)
  const [search, setSearch] = useState("")
  const [messageInput, setMessageInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // En mobile, rediriger vers le dashboard et ouvrir la fenêtre chat
  useEffect(() => {
    const isMobile = window.innerWidth < 1024
    if (isMobile) {
      router.push("/my-space")
      setTimeout(
        () => window.dispatchEvent(new CustomEvent("iasted:open")),
        150
      )
    }
  }, [router])

  // ── Threads agents (temps réel) ──
  const { data: chatThreads, isPending: threadsLoading } =
    useAuthenticatedConvexQuery(api.functions.chats.listMyChats, {})

  // Inscription consulaire → orgId pour initiateStandardChat
  const { data: registrations } = useAuthenticatedConvexQuery(
    api.functions.consularRegistrations.listByProfile,
    {}
  )
  const orgId = (registrations as any[])?.[0]?.orgId as Id<"orgs"> | undefined

  // Thread Standard (Mr Ray) existant
  const mrRayThread = useMemo(() => {
    if (!chatThreads) return null
    return (
      (chatThreads as any[]).find((t: any) => t.type === "standard") ?? null
    )
  }, [chatThreads])

  // Messages du thread sélectionné (Mr Ray = thread standard, sinon P2P)
  const selectedChatId = useMemo(() => {
    if (!selectedContact) return undefined
    if (selectedContact.isStandard && mrRayThread) return mrRayThread._id
    if (selectedContact.isStandard) return undefined
    return selectedContact._id
  }, [selectedContact, mrRayThread])

  const { data: threadMessages, isPending: messagesLoading } =
    useAuthenticatedConvexQuery(
      api.functions.chats.listMessages,
      selectedChatId
        ? { chatId: selectedChatId as Id<"chats">, limit: 50 }
        : "skip"
    )

  const { mutateAsync: sendChatMessage } = useConvexMutationQuery(
    api.functions.chats.sendMessage
  )
  const { mutateAsync: initiateStandard } = useConvexMutationQuery(
    api.functions.chats.initiateStandardChat
  )
  const { mutateAsync: markRead } = useConvexMutationQuery(
    api.functions.chats.markRead
  )

  // Marquer comme lu
  useEffect(() => {
    if (selectedChatId) {
      markRead({ chatId: selectedChatId as Id<"chats"> }).catch(() => {})
    }
  }, [selectedChatId, markRead, threadMessages?.length])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [threadMessages])

  // ── Envoi message Mr Ray (Standard) ──
  const handleSendStandard = async () => {
    const text = messageInput.trim()
    if (!text) return
    try {
      if (mrRayThread) {
        await sendChatMessage({
          chatId: mrRayThread._id as Id<"chats">,
          content: text,
        })
      } else if (orgId) {
        await initiateStandard({ orgId, initialMessage: text })
      } else {
        toast.error(
          "Vous devez être inscrit à une représentation pour utiliser le Standard."
        )
        return
      }
      setMessageInput("")
    } catch (e: any) {
      toast.error(e?.data ?? e?.message ?? "Erreur d'envoi")
    }
  }

  // ── Envoi message humain ──
  const handleSendHuman = async () => {
    const text = messageInput.trim()
    if (!text || !selectedChatId) return
    try {
      await sendChatMessage({
        chatId: selectedChatId as Id<"chats">,
        content: text,
      })
      setMessageInput("")
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur d'envoi")
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (selectedContact?.isStandard) handleSendStandard()
      else handleSendHuman()
    }
  }

  // Filtrage threads — exclure le thread standard (Mr Ray est affiché séparément)
  const filteredThreads = useMemo(() => {
    if (!chatThreads) return []
    const p2p = (chatThreads as any[]).filter((t: any) => t.type !== "standard")
    const q = search.trim().toLowerCase()
    if (!q) return p2p
    return p2p.filter(
      (t: any) =>
        (t.otherUser?.firstName ?? "").toLowerCase().includes(q) ||
        (t.otherUser?.lastName ?? "").toLowerCase().includes(q)
    )
  }, [chatThreads, search])

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <PageHeader
          title="iAsted"
          subtitle="Espace de communication consulaire"
          icon={<ShieldCheck className="h-5 w-5" />}
          actions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                router.push("/my-space")
                setTimeout(
                  () => window.dispatchEvent(new CustomEvent("iasted:open")),
                  100
                )
              }}
              className="h-8 gap-1.5 rounded-full bg-muted px-3 text-xs font-medium text-foreground transition-transform hover:bg-muted/70 active:scale-[0.97]"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              Réduire
            </Button>
          }
        />
      </div>

      {/* Card principale — 3 colonnes */}
      <div className="flat-card-border flex min-h-0 flex-1 overflow-hidden rounded-xl border bg-card">
        {/* ── Col 1 : Icônes navigation ── */}
        <div className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-foreground/5 py-3">
          <div className="mb-4 flex items-center justify-center rounded-lg bg-foreground/8 p-1.5 dark:bg-foreground/5">
            <ShieldCheck className="h-4 w-4" />
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg transition-all",
                  isActive
                    ? "bg-foreground/8 font-medium text-foreground dark:bg-foreground/5"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
              </button>
            )
          })}

          <div className="flex-1" />

          <button
            type="button"
            onClick={() => router.push("/my-space")}
            title="Réduire"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
          >
            <Minimize2 className="h-5 w-5" />
          </button>
        </div>

        {activeTab === "ichat" ? (
          <>
            {/* ── Col 2 : Liste conversations ── */}
            <div className="flex w-80 shrink-0 flex-col border-r border-foreground/5">
              <div className="shrink-0 border-b border-foreground/5 px-4 py-3">
                <span className="flex items-center gap-2.5 text-sm font-semibold text-muted-foreground">
                  <div className="rounded-md bg-foreground/8 p-1 dark:bg-foreground/5">
                    <MessageSquare className="h-3.5 w-3.5" />
                  </div>
                  Discussions
                </span>
              </div>

              <div className="border-b border-foreground/5 p-2">
                <div className="relative">
                  <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher"
                    className="h-8 rounded-lg border-0 bg-muted/50 pl-8 text-xs"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1">
                {/* Mr Ray — Standard épinglé */}
                <button
                  type="button"
                  onClick={() => setSelectedContact(MR_RAY_CONTACT)}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-foreground/5 px-4 py-3 text-left transition-colors",
                    selectedContact?.id === "__mr_ray__"
                      ? "bg-primary/5"
                      : "hover:bg-muted"
                  )}
                >
                  <div className="relative">
                    <Avatar className="h-11 w-11">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <Headset className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <Pin className="absolute -top-0.5 -right-0.5 h-3 w-3 rotate-45 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold">Mr Ray</p>
                        <Badge className="badge-info h-3.5 px-1 text-[7px]">
                          Standard
                        </Badge>
                      </div>
                      {mrRayThread?.lastMessageAt && (
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(
                            mrRayThread.lastMessageAt
                          ).toLocaleTimeString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {mrRayThread?.lastMessageText
                        ? mrRayThread.lastMessageText.slice(0, 45) + "..."
                        : "Standard Consulaire — Posez une question"}
                    </p>
                  </div>
                  {(mrRayThread?.unreadCount ?? 0) > 0 && (
                    <Badge className="h-4 min-w-[16px] bg-primary px-1 text-[8px] text-primary-foreground">
                      {mrRayThread.unreadCount}
                    </Badge>
                  )}
                </button>

                {/* Threads agents */}
                {threadsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredThreads.length > 0 ? (
                  filteredThreads.map((thread: any) => (
                    <button
                      key={thread._id}
                      type="button"
                      onClick={() => setSelectedContact(thread)}
                      className={cn(
                        "flex w-full items-center gap-3 border-b border-foreground/5 px-4 py-3 text-left transition-colors",
                        selectedContact?._id === thread._id
                          ? "bg-primary/5"
                          : "hover:bg-muted"
                      )}
                    >
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={thread.otherUser?.avatarUrl} />
                        <AvatarFallback className="bg-primary/10 text-xs text-primary">
                          {(
                            (thread.otherUser?.firstName?.[0] ?? "") +
                            (thread.otherUser?.lastName?.[0] ?? "")
                          ).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-sm font-bold">
                            {(thread.otherUser?.lastName ?? "").toUpperCase()}
                          </p>
                          {thread.lastMessageAt && (
                            <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">
                              {new Date(
                                thread.lastMessageAt
                              ).toLocaleTimeString("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-foreground/80">
                          {thread.otherUser?.firstName ?? ""}
                        </p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {thread.lastMessageText ?? "Agent consulaire"}
                        </p>
                      </div>
                      {thread.unreadCount > 0 && (
                        <Badge className="h-4 min-w-[16px] bg-primary px-1 text-[8px] text-primary-foreground">
                          {thread.unreadCount}
                        </Badge>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                    <MessageSquare className="mb-2 h-8 w-8 text-muted-foreground/20" />
                    <p className="text-xs text-muted-foreground">
                      Aucune conversation avec un agent
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground/60">
                      Les agents vous contacteront ici
                    </p>
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* ── Col 3 : Zone de chat ── */}
            <div className="flex flex-1 flex-col overflow-hidden">
              {selectedContact ? (
                <>
                  {/* Header contact */}
                  <div className="flex shrink-0 items-center gap-3 border-b border-foreground/5 px-4 py-3">
                    <Avatar className="h-9 w-9">
                      {selectedContact.isStandard ? (
                        <AvatarFallback className="bg-foreground/8 text-muted-foreground dark:bg-foreground/5">
                          <Headset className="h-4 w-4" />
                        </AvatarFallback>
                      ) : (
                        <>
                          <AvatarImage
                            src={selectedContact.otherUser?.avatarUrl}
                          />
                          <AvatarFallback className="bg-primary/10 text-xs text-primary">
                            {(
                              (selectedContact.otherUser?.firstName?.[0] ??
                                "") +
                              (selectedContact.otherUser?.lastName?.[0] ?? "")
                            ).toUpperCase()}
                          </AvatarFallback>
                        </>
                      )}
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      {selectedContact.isStandard ? (
                        <>
                          <p className="text-sm font-semibold">Mr Ray</p>
                          <p className="text-[11px] text-muted-foreground">
                            Standard — Assistance Consulaire
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-bold">
                            {selectedContact.otherUser?.lastName ?? ""}{" "}
                            {selectedContact.otherUser?.firstName ?? ""}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Agent consulaire
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 px-6 py-4">
                    {selectedContact.isStandard ? (
                      /* ── Chat Mr Ray (temps réel via P2P) ── */
                      !threadMessages ||
                      (threadMessages as any[]).length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                          <div className="mb-4 rounded-full bg-muted p-4">
                            <Headset className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <h3 className="mb-1 text-sm font-semibold text-foreground">
                            Bonjour, je suis Mr Ray
                          </h3>
                          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
                            Votre assistant au Standard consulaire. Posez-moi
                            vos questions sur les démarches, passeports,
                            visas...
                          </p>
                          <div className="flex max-w-lg flex-wrap justify-center gap-2">
                            {[
                              "Carte consulaire",
                              "Mon passeport",
                              "Rendez-vous",
                              "Horaires",
                            ].map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setMessageInput(s)}
                                className="rounded-full border border-foreground/10 px-4 py-2 text-xs text-foreground transition-all hover:bg-muted active:scale-[0.97]"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mx-auto max-w-3xl space-y-3">
                          {(threadMessages as any[]).map((msg: any) => {
                            const isMrRay =
                              msg.senderName?.includes("Ray") ||
                              msg.senderName?.includes("NGOMONDAMI")
                            return (
                              <div
                                key={msg._id}
                                className={cn(
                                  "flex gap-2",
                                  !isMrRay ? "justify-end" : "justify-start"
                                )}
                              >
                                {isMrRay && (
                                  <Avatar className="mt-1 h-7 w-7 shrink-0">
                                    <AvatarFallback className="bg-foreground/6 text-[9px] text-muted-foreground">
                                      <Bot className="h-3.5 w-3.5" />
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                <div
                                  className={cn(
                                    "max-w-[70%] rounded-xl px-3 py-2 text-sm",
                                    !isMrRay
                                      ? "bg-primary text-primary-foreground"
                                      : "border bg-card"
                                  )}
                                >
                                  {isMrRay ? (
                                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0">
                                      <Markdown>{msg.content}</Markdown>
                                    </div>
                                  ) : (
                                    msg.content
                                  )}
                                  <p
                                    className={cn(
                                      "mt-1 text-[9px]",
                                      !isMrRay
                                        ? "text-right text-primary-foreground/60"
                                        : "text-muted-foreground"
                                    )}
                                  >
                                    {new Date(msg.createdAt).toLocaleTimeString(
                                      "fr-FR",
                                      {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      }
                                    )}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                          <div ref={messagesEndRef} />
                        </div>
                      )
                    ) : /* ── Messages agent (temps réel) ── */
                    messagesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : !threadMessages || threadMessages.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                        <MessageSquare className="mb-3 h-12 w-12 text-muted-foreground/20" />
                        <p className="text-sm text-muted-foreground">
                          Démarrez la conversation avec{" "}
                          {selectedContact.otherUser?.firstName ?? "l'agent"}
                        </p>
                      </div>
                    ) : (
                      <div className="mx-auto max-w-3xl space-y-3">
                        {(threadMessages as any[]).map((msg: any) => {
                          const isMe =
                            msg.senderId !== selectedContact.otherUser?.id
                          return (
                            <div
                              key={msg._id}
                              className={cn(
                                "flex gap-2",
                                isMe ? "justify-end" : "justify-start"
                              )}
                            >
                              {!isMe && (
                                <Avatar className="mt-1 h-7 w-7 shrink-0">
                                  <AvatarFallback className="bg-primary/10 text-[9px] text-primary">
                                    {(
                                      (selectedContact.otherUser
                                        ?.firstName?.[0] ?? "") +
                                      (selectedContact.otherUser
                                        ?.lastName?.[0] ?? "")
                                    ).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div
                                className={cn(
                                  "max-w-[70%] rounded-xl px-3 py-2 text-sm",
                                  isMe
                                    ? "bg-primary text-primary-foreground"
                                    : "border bg-card"
                                )}
                              >
                                {msg.content}
                                <p
                                  className={cn(
                                    "mt-1 text-[9px]",
                                    isMe
                                      ? "text-right text-primary-foreground/60"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  {new Date(
                                    msg._creationTime
                                  ).toLocaleTimeString("fr-FR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  {/* Input */}
                  <div className="flex shrink-0 items-end gap-3 border-t border-foreground/5 px-4 py-3">
                    <Textarea
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        selectedContact.isStandard
                          ? "Écrivez au Standard..."
                          : "Écrire un message..."
                      }
                      className="max-h-[120px] min-h-[40px] flex-1 resize-none rounded-xl text-sm"
                      rows={1}
                    />
                    <Button
                      size="icon"
                      onClick={
                        selectedContact.isStandard
                          ? handleSendStandard
                          : handleSendHuman
                      }
                      disabled={!messageInput.trim()}
                      className="h-10 w-10 shrink-0 rounded-xl"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center text-center">
                  <div>
                    <div className="mx-auto mb-4 rounded-full bg-muted p-4">
                      <ShieldCheck className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h2 className="text-sm font-semibold text-foreground">
                      iAsted
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Sélectionnez une conversation
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* ── Onglets non-chat (iAppel, iContact) — 2 colonnes ── */
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-foreground/5 px-4 py-3">
              <span className="flex items-center gap-2.5 text-sm font-semibold text-muted-foreground">
                <div className="rounded-md bg-foreground/8 p-1 dark:bg-foreground/5">
                  {activeTab === "icall" ? (
                    <Phone className="h-3.5 w-3.5" />
                  ) : (
                    <Contact className="h-3.5 w-3.5" />
                  )}
                </div>
                {activeTab === "icall" ? "iAppel" : "iContact"}
              </span>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              {activeTab === "icall" && <IAppelContent />}
              {activeTab === "icontact" && <IContactContent />}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// iAppel — Appels audio vers représentations
// ─────────────────────────────────────────────

function IAppelContent() {
  const [activeMeetingId, setActiveMeetingId] = useState<Id<"meetings"> | null>(
    null
  )
  const [selectedOrg, setSelectedOrg] = useState<any>(null)
  const [searchOrg, setSearchOrg] = useState("")
  const [isCalling, setIsCalling] = useState(false)
  const { globalActiveMeetingId, setGlobalMeetingId } = useCallStore()

  const { data: allOrgs, isPending: orgsLoading } = useAuthenticatedConvexQuery(
    api.functions.orgs.list,
    {}
  )
  const { data: myMeetingsData, isPending: historyLoading } =
    useAuthenticatedConvexQuery(api.functions.meetings.listMine, {})

  const myMeetings = (myMeetingsData as any)?.meetings ?? []
  const participantNames = (myMeetingsData as any)?.participantNames ?? {}

  const incomingCalls = useMemo(() => {
    const now = Date.now()
    return myMeetings.filter((m: any) => {
      if (m.status !== "active") return false
      if (m.type !== "call" && m.type !== "meeting") return false
      if (now - m._creationTime > 75_000) return false
      const myParticipant = m.participants?.find((p: any) => p.role !== "host")
      return !!myParticipant && !myParticipant.joinedAt
    })
  }, [myMeetings])

  const callHistory = useMemo(() => {
    return myMeetings
      .filter((m: any) => m.type === "call" || m.type === "meeting")
      .slice(0, 25)
  }, [myMeetings])

  const {
    token,
    wsUrl,
    error: meetingError,
    connect,
    disconnect,
  } = useMeeting(activeMeetingId ?? undefined)

  const { mutateAsync: callOrganization } = useConvexMutationQuery(
    api.functions.meetings.callOrganization
  )

  const filteredOrgs = useMemo(() => {
    if (!allOrgs) return []
    const q = searchOrg.trim().toLowerCase()
    if (!q) return (allOrgs as any[]).slice(0, 12)
    return (allOrgs as any[])
      .filter(
        (org) =>
          org.name.toLowerCase().includes(q) ||
          (org.country ?? "").toLowerCase().includes(q)
      )
      .slice(0, 12)
  }, [allOrgs, searchOrg])

  const handleCallOrg = async (org: any) => {
    if (globalActiveMeetingId) {
      toast.error("Un appel est déjà en cours")
      return
    }
    setIsCalling(true)
    try {
      const result = await callOrganization({
        orgId: org._id,
        mediaType: "audio",
      })
      const meetingId = result.meetingId as Id<"meetings">
      setActiveMeetingId(meetingId)
      setSelectedOrg(org)
      setGlobalMeetingId(meetingId)
      await connect(meetingId)
      toast.success(`Appel vers ${org.name}...`)
    } catch (e: any) {
      const msg =
        e?.data?.errorMessage ||
        e?.message?.match(/Uncaught ConvexError: (.*?)(?:\n|$)/)?.[1] ||
        "Erreur lors de l'appel"
      toast.error(msg)
      setActiveMeetingId(null)
      setGlobalMeetingId(null)
    } finally {
      setIsCalling(false)
    }
  }

  const handleAnswer = async (meetingId: Id<"meetings">) => {
    setActiveMeetingId(meetingId)
    setSelectedOrg(null)
    setGlobalMeetingId(meetingId)
    try {
      await connect(meetingId)
    } catch {
      toast.error("Impossible de rejoindre l'appel")
      setActiveMeetingId(null)
      setGlobalMeetingId(null)
    }
  }

  const handleHangUp = async () => {
    if (activeMeetingId) await disconnect(activeMeetingId)
    setActiveMeetingId(null)
    setGlobalMeetingId(null)
  }

  const isInCall = activeMeetingId !== null && token && wsUrl

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      {/* Appels entrants */}
      {incomingCalls.length > 0 && (
        <div className="shrink-0 space-y-2 rounded-xl border border-success/30 bg-success/10 p-3">
          <div className="flex items-center gap-2">
            <PhoneIncoming className="h-4 w-4 animate-pulse text-success" />
            <span className="text-sm font-semibold text-success">
              Appel entrant
            </span>
          </div>
          {incomingCalls.map((call: any) => {
            const callerName =
              participantNames[call.createdBy] ?? "Agent consulaire"
            const isVideo =
              call.mediaType === "video" || call.type === "meeting"
            return (
              <div
                key={call._id}
                className="flex items-center justify-between rounded-xl border bg-background p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
                    <PhoneCall className="h-5 w-5 text-success" />
                    <span className="absolute inset-0 animate-ping rounded-full border border-success opacity-40" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{callerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {call.title ?? "Appel"}{" "}
                      {isVideo && (
                        <Badge className="badge-info ml-1 h-3.5 text-[9px]">
                          Vidéo
                        </Badge>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 border-destructive/30 text-destructive"
                    onClick={handleHangUp}
                  >
                    <PhoneOff className="h-3.5 w-3.5" />
                    Refuser
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 gap-1 bg-success text-white hover:bg-success/90"
                    onClick={() => handleAnswer(call._id)}
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Répondre
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Sélecteur org */}
      <div className="flat-card-border shrink-0 space-y-3 rounded-xl border bg-card p-4">
        <span className="flex items-center gap-2.5 text-sm font-semibold text-muted-foreground">
          <div className="rounded-md bg-foreground/8 p-1 dark:bg-foreground/5">
            <Building2 className="h-3.5 w-3.5" />
          </div>
          Appeler une représentation
        </span>
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchOrg}
            onChange={(e) => setSearchOrg(e.target.value)}
            placeholder="Rechercher une représentation..."
            className="h-8 pl-8 text-sm"
          />
        </div>

        {orgsLoading ? (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="max-h-44 space-y-1 overflow-y-auto pr-0.5">
            {filteredOrgs.length === 0 ? (
              <p className="py-2 text-center text-xs text-muted-foreground">
                Aucune représentation trouvée
              </p>
            ) : (
              filteredOrgs.map((org: any) => (
                <button
                  key={org._id}
                  type="button"
                  onClick={() =>
                    setSelectedOrg(selectedOrg?._id === org._id ? null : org)
                  }
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                    selectedOrg?._id === org._id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex shrink-0 items-center justify-center rounded-md bg-foreground/8 p-1 dark:bg-foreground/5">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{org.name}</p>
                    {org.country && (
                      <p className="text-[10px] text-muted-foreground">
                        {org.country}
                      </p>
                    )}
                  </div>
                  {selectedOrg?._id === org._id && (
                    <Badge className="h-4 shrink-0 border-primary/20 bg-primary/15 text-[9px] text-primary"></Badge>
                  )}
                </button>
              ))
            )}
          </div>
        )}

        <Button
          className="w-full gap-2"
          disabled={!selectedOrg || isCalling || !!globalActiveMeetingId}
          onClick={() => selectedOrg && handleCallOrg(selectedOrg)}
        >
          {isCalling ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connexion...
            </>
          ) : (
            <>
              <Phone className="h-4 w-4" />
              {selectedOrg
                ? `Appeler ${selectedOrg.name}`
                : "Sélectionner une représentation"}
            </>
          )}
        </Button>
        <p className="text-center text-[10px] text-muted-foreground">
          Audio uniquement — Les citoyens peuvent recevoir des appels vidéo d'un
          agent
        </p>
      </div>

      {/* Historique */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <p className="mb-2 px-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          Historique récent
        </p>
        {historyLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : callHistory.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <PhoneMissed className="mb-2 h-8 w-8 text-muted-foreground/20" />
            <p className="text-xs text-muted-foreground">Aucun appel récent</p>
          </div>
        ) : (
          <div className="space-y-1">
            {callHistory.map((call: any) => {
              const isOutgoing = call.isOrgInbound === true
              const duration =
                call.startedAt && call.endedAt
                  ? Math.floor((call.endedAt - call.startedAt) / 60000)
                  : null
              const date = new Date(call.startedAt ?? call._creationTime)
              const isMissed =
                call.status === "ended" &&
                call.participants.filter((p: any) => p.joinedAt).length <= 1

              return (
                <div
                  key={call._id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/30"
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      isMissed
                        ? "bg-destructive/10"
                        : isOutgoing
                          ? "bg-success/10"
                          : "bg-primary/10"
                    )}
                  >
                    {isMissed ? (
                      <PhoneMissed className="h-3.5 w-3.5 text-destructive" />
                    ) : isOutgoing ? (
                      <PhoneCall className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <PhoneIncoming className="h-3.5 w-3.5 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">
                      {call.title ?? "Appel"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {date.toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                      })}{" "}
                      à{" "}
                      {date.toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {duration !== null && duration > 0 && ` · ${duration}min`}
                    </p>
                  </div>
                  {isMissed && (
                    <Badge className="badge-destructive h-4 text-[9px]">
                      Manqué
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Dialog LiveKit */}
      <Dialog
        open={!!isInCall}
        onOpenChange={(open) => {
          if (!open) handleHangUp()
        }}
      >
        <DialogContent
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          aria-describedby={undefined}
          className="flat-card-border flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden border bg-card p-0"
        >
          <DialogTitle className="sr-only">Appel en cours</DialogTitle>
          {token && wsUrl ? (
            <LiveKitRoom
              token={token}
              serverUrl={wsUrl}
              connect={true}
              audio={true}
              video={false}
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
                title={selectedOrg?.name ?? "Représentation consulaire"}
              />
            </LiveKitRoom>
          ) : (
            <div className="flex flex-1 items-center justify-center bg-card">
              <div className="space-y-3 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Connexion en cours...
                </p>
                {meetingError && (
                  <p className="max-w-xs text-xs text-destructive">
                    {meetingError}
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─────────────────────────────────────────────
// iContact — Annuaire des représentations
// ─────────────────────────────────────────────

function IContactContent() {
  const [search, setSearch] = useState("")

  const { data: allOrgs, isPending } = useAuthenticatedConvexQuery(
    api.functions.orgs.list,
    {}
  )

  const filteredOrgs = useMemo(() => {
    if (!allOrgs) return []
    const q = search.trim().toLowerCase()
    const orgs = allOrgs as any[]
    if (!q) return orgs
    return orgs.filter(
      (org) =>
        org.name.toLowerCase().includes(q) ||
        (org.country ?? "").toLowerCase().includes(q) ||
        (org.city ?? "").toLowerCase().includes(q)
    )
  }, [allOrgs, search])

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden">
      <div className="relative shrink-0">
        <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une représentation..."
          className="pl-8 text-sm"
        />
      </div>

      <div className="shrink-0 rounded-xl bg-muted px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <Shield className="h-3 w-3 shrink-0" />
          Contacts officiels des représentations diplomatiques — urgence et
          standard uniquement.
        </p>
      </div>

      <ScrollArea className="flex-1">
        {isPending ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredOrgs.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Building2 className="mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">
              {search ? "Aucun résultat" : "Aucune représentation"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrgs.map((org: any) => (
              <OrgContactCard key={org._id} org={org} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

// ─────────────────────────────────────────────
// Carte contact org
// ─────────────────────────────────────────────

const ORG_TYPE_LABELS: Record<string, string> = {
  embassy: "Ambassade",
  general_consulate: "Consulat Général",
  consulate: "Consulat",
  permanent_mission: "Mission Permanente",
  high_commission: "Haut-Commissariat",
  trade_mission: "Mission Commerciale",
}

function OrgContactCard({ org }: { org: any }) {
  const [expanded, setExpanded] = useState(false)

  const contactInfo = org.contactInfo ?? org.contacts ?? {}
  const emergency =
    contactInfo.emergency ?? org.emergencyPhone ?? org.emergencyContact
  const phone = contactInfo.phone ?? org.phone ?? org.mainPhone
  const email = contactInfo.email ?? org.email ?? org.mainEmail
  const website = contactInfo.website ?? org.website
  const address = contactInfo.address ?? org.address

  const hasContacts = emergency || phone || email || website || address
  const typeLabel = ORG_TYPE_LABELS[org.type] ?? org.type ?? "Représentation"

  return (
    <div className="flat-card-border overflow-hidden rounded-xl border bg-card">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-3.5 text-left transition-colors hover:bg-muted"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-foreground/8 dark:bg-foreground/5">
          {org.flagUrl || org.logo ? (
            <img
              src={org.flagUrl ?? org.logo}
              alt={org.name}
              className="h-7 w-7 rounded object-contain"
            />
          ) : (
            <Building2 className="h-5 w-5 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{org.name}</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="h-4 px-1.5 text-[9px] text-muted-foreground"
            >
              {typeLabel}
            </Badge>
            {org.country && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Globe className="h-2.5 w-2.5" />
                {org.country}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {emergency && (
            <Badge className="badge-destructive h-4 text-[9px]">Urgence</Badge>
          )}
          <Badge
            variant="outline"
            className="h-4 text-[9px] text-muted-foreground"
          >
            {hasContacts ? (expanded ? "Fermer ↑" : "Voir ↓") : "N/A"}
          </Badge>
        </div>
      </button>

      {expanded && hasContacts && (
        <div className="space-y-2 border-t border-foreground/5 px-3.5 pt-3 pb-3.5">
          {emergency && (
            <ContactLine
              icon={Phone}
              label="Urgence"
              value={emergency}
              href={`tel:${emergency}`}
              accent="red"
            />
          )}
          {phone && (
            <ContactLine
              icon={Phone}
              label="Standard"
              value={phone}
              href={`tel:${phone}`}
              accent="blue"
            />
          )}
          {email && (
            <ContactLine
              icon={Mail}
              label="Email"
              value={email}
              href={`mailto:${email}`}
              accent="green"
            />
          )}
          {address && (
            <ContactLine
              icon={Globe}
              label="Adresse"
              value={address}
              accent="purple"
            />
          )}
          {website && (
            <ContactLine
              icon={Globe}
              label="Site web"
              value={website}
              href={website}
              accent="teal"
            />
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// ContactLine helper
// ─────────────────────────────────────────────

const ACCENT_CLASSES: Record<string, { bg: string; text: string }> = {
  red: { bg: "bg-destructive/10", text: "text-destructive" },
  blue: { bg: "bg-primary/10", text: "text-primary" },
  green: { bg: "bg-success/10", text: "text-success" },
  purple: { bg: "stat-icon-purple", text: "text-[oklch(0.55_0.20_290)]" },
  teal: { bg: "bg-primary/10", text: "text-primary" },
}

function ContactLine({
  icon: Icon,
  label,
  value,
  href,
  accent = "blue",
}: {
  icon: typeof Phone
  label: string
  value: string
  href?: string
  accent?: string
}) {
  const colors = ACCENT_CLASSES[accent] ?? ACCENT_CLASSES.blue

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md p-1.5",
          colors.bg
        )}
      >
        <Icon className={cn("h-3 w-3", colors.text)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        {href ? (
          <a
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            className={cn(
              "block truncate text-xs font-medium hover:underline",
              colors.text
            )}
          >
            {value}
          </a>
        ) : (
          <p className="truncate text-xs font-medium">{value}</p>
        )}
      </div>
    </div>
  )
}
