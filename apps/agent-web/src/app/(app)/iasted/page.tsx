"use client";

/**
 * iAsted — Page plein écran (inspirée WhatsApp Desktop)
 *
 * Layout :
 * [Icônes nav] | [Liste conversations/contacts] | [Zone de chat/contenu]
 */

import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { useRouter } from "next/navigation";
import { useAuthenticatedConvexQuery, useConvexMutationQuery } from "@/integrations/convex/hooks";
import {
  Bot,
  Contact,
  Loader2,
  MessageSquare,
  Minimize2,
  Phone,
  Pin,
  Search,
  Send,
  Settings,
  ShieldCheck,
  User,
  Video,
} from "lucide-react"
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react"
import Markdown from "react-markdown"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { useOrg } from "@/components/org/org-provider"
import { useAdminAIChat } from "@/components/ai/useAdminAIChat"
import { useAdminVoiceChat } from "@/components/ai/useAdminVoiceChat"
import { VoiceButton } from "@/components/ai/VoiceButton"
import {
  parseIntent,
  resolveNavigationTarget,
} from "@/components/ai/iasted/IntentProcessor"
import { getSuggestions } from "@/components/ai/iasted/SpatialAwareness"
import { IAstedContactTab } from "@/components/ai/iasted/IAstedContactTab"
import { IAstedCallTab } from "@/components/ai/iasted/IAstedCallTab"
import { IAstedMeetingTab } from "@/components/ai/iasted/IAstedMeetingTab"
import { IAstedSettingsTab } from "@/components/ai/iasted/IAstedSettingsTab"
import { cn } from "@/lib/utils"


// Contact spécial iAsted
const IASTED_CONTACT = {
  id: "__iasted__",
  name: "iAsted",
  subtitle: "Agent IA Diplomate",
  isAI: true,
}

const NAV_ITEMS = [
  { id: "ichat", icon: MessageSquare, label: "iChat" },
  { id: "icontact", icon: Contact, label: "iContact" },
  { id: "icall", icon: Phone, label: "iAppel" },
  { id: "imeeting", icon: Video, label: "iRéunion" },
  { id: "settings", icon: Settings, label: "Réglages" },
] as const

type TabId = (typeof NAV_ITEMS)[number]["id"]

export default function IAstedFullPage() {
  const [activeTab, setActiveTab] = useState<TabId>("ichat")
  const [selectedContact, setSelectedContact] = useState<any>(IASTED_CONTACT)
  const [search, setSearch] = useState("")
  const [messageInput, setMessageInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { activeOrg, activeOrgId } = useOrg()
  const router = useRouter()
  const chat = useAdminAIChat()
  const voice = useAdminVoiceChat()
  const suggestions = getSuggestions("/iasted")

  // Inbound calls count for badge
  const { data: inboundCalls } = useAuthenticatedConvexQuery(
    api.functions.meetings.listInboundOrgCalls,
    {},
  )
  const inboundCount = inboundCalls?.length ?? 0

  // Tous les threads de l'agent (P2P + standard)
  const { data: myChats } = useAuthenticatedConvexQuery(
    api.functions.chats.listMyChats,
    {},
  )

  // Threads P2P uniquement
  const p2pThreads = useMemo(() => {
    if (!myChats) return []
    return (myChats as any[]).filter((t: any) => t.type !== "standard")
  }, [myChats])

  // Total non-lus P2P pour badge sur iChat
  const totalChatUnread = useMemo(() => {
    return p2pThreads.reduce((acc: number, t: any) => acc + (t.unreadCount ?? 0), 0)
  }, [p2pThreads])

  // Contacts
  const { data: orgChart } = useAuthenticatedConvexQuery(
    api.functions.orgs.getOrgChart,
    activeOrgId ? { orgId: activeOrgId } : "skip"
  )

  const contacts = useMemo(() => {
    const raw =
      (orgChart as any)?.positions?.flatMap((pos: any) =>
        (pos.occupants ?? []).map((occ: any) => ({
          id: occ.userId,
          lastName: (occ.lastName ?? "").toUpperCase(),
          firstName: occ.firstName ?? "",
          name: `${occ.firstName ?? ""} ${occ.lastName ?? ""}`.trim(),
          email: occ.email,
          avatar: occ.avatarUrl,
          position: pos.title?.fr ?? pos.code,
          isAI: false,
        }))
      ) ?? []
    return raw.filter(
      (c: any, i: number, arr: any[]) =>
        arr.findIndex((x: any) => x.name === c.name) === i
    )
  }, [orgChart])

  const filteredContacts = search
    ? contacts.filter((c: any) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      )
    : contacts

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chat.messages])

  // Envoi IA
  const handleSendAI = async () => {
    const text = messageInput.trim()
    if (!text || chat.isLoading) return
    const intent = parseIntent(text)
    if (
      intent &&
      intent.confidence >= 0.7 &&
      intent.category === "navigation"
    ) {
      const route = resolveNavigationTarget(intent.target)
      if (route) {
        setMessageInput("")
        chat.messages.push(
          { role: "user", content: text, timestamp: Date.now() },
          {
            role: "assistant",
            content: `Je vous emmène sur **${intent.target}**.`,
            timestamp: Date.now(),
          }
        )
        router.push(route)
        toast.success(`Navigation vers ${intent.target}`)
        return
      }
    }
    setMessageInput("")
    await chat.sendMessage(text)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (selectedContact?.isAI) {
        handleSendAI()
      } else if (selectedContact) {
        window.dispatchEvent(new CustomEvent("iasted:send-human", { detail: { text: messageInput } }))
        setMessageInput("")
      }
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      {/* Header — comme iBoîte */}
      <div className="flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold">iAsted</h1>
            <p className="text-sm text-muted-foreground">
              {activeOrg?.name ?? "Agent IA Diplomate"}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/")}
          className="gap-1.5"
        >
          <Minimize2 className="h-3.5 w-3.5" />
          Réduire
        </Button>
      </div>

      {/* Card principale — comme iBoîte */}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border bg-[#FDFCFA] dark:bg-[#21201E]/77">
        {/* ── Col 1 : Icônes navigation ── */}
        <div className="flex w-14 shrink-0 flex-col items-center gap-1 border-r py-3">
          {/* Logo */}
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>

          {/* Nav icons */}
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            const showBadge = (item.id === "icall" && inboundCount > 0) || (item.id === "ichat" && totalChatUnread > 0)
            const badgeCount = item.id === "icall" ? inboundCount : totalChatUnread
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-xl transition-all",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {showBadge && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {badgeCount}
                  </span>
                )}
              </button>
            )
          })}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Réduire */}
          <button
            type="button"
            onClick={() => router.push("/")}
            title="Réduire"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground"
          >
            <Minimize2 className="h-5 w-5" />
          </button>
        </div>

        {activeTab === "ichat" ? (
          <>
            {/* ── Col 2 : Liste conversations (comme WhatsApp) ── */}
            <div className="flex w-80 shrink-0 flex-col border-r">
              {/* Header */}
              <div className="shrink-0 border-b px-4 py-3">
                <h2 className="text-base font-semibold">Discussions</h2>
              </div>

              {/* Recherche */}
              <div className="border-b p-2">
                <div className="relative">
                  <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher"
                    className="h-8 border-0 bg-muted/30 pl-8 text-xs"
                  />
                </div>
              </div>

              {/* Liste */}
              <ScrollArea className="flex-1">
                {/* iAsted épinglé */}
                <button
                  type="button"
                  onClick={() => setSelectedContact(IASTED_CONTACT)}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-border/20 px-4 py-3 text-left transition-colors",
                    selectedContact?.id === "__iasted__"
                      ? "bg-primary/5"
                      : "hover:bg-muted/30"
                  )}
                >
                  <div className="relative">
                    <Avatar className="h-11 w-11">
                      <AvatarFallback className="bg-emerald-500/15 text-emerald-500">
                        <Bot className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <Pin className="absolute -top-0.5 -right-0.5 h-3 w-3 rotate-45 text-emerald-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold">iAsted</p>
                        <Badge className="h-3.5 border-emerald-500/20 bg-emerald-500/15 px-1 text-[7px] text-emerald-500">
                          IA
                        </Badge>
                      </div>
                      {chat.messages.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(
                            chat.messages[chat.messages.length - 1].timestamp
                          ).toLocaleTimeString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {chat.messages.length > 0
                        ? chat.messages[chat.messages.length - 1].content.slice(
                            0,
                            45
                          ) + "..."
                        : "Agent IA Diplomate — Posez une question"}
                    </p>
                  </div>
                </button>

                {/* Conversations P2P actives */}
                {p2pThreads.length > 0 && !search && (
                  <div className="border-b border-border/20">
                    <div className="flex items-center gap-2 px-4 py-1.5">
                      <MessageSquare className="h-3 w-3 text-primary shrink-0" />
                      <span className="text-[9px] font-semibold text-primary uppercase tracking-wider">
                        Conversations
                      </span>
                      {totalChatUnread > 0 && (
                        <Badge className="text-[7px] h-3.5 px-1 ml-auto bg-primary text-primary-foreground">
                          {totalChatUnread}
                        </Badge>
                      )}
                    </div>
                    {p2pThreads.map((thread: any) => (
                      <button
                        key={thread._id}
                        type="button"
                        onClick={() => setSelectedContact({
                          ...thread.otherUser,
                          name: `${thread.otherUser?.firstName ?? ""} ${thread.otherUser?.lastName ?? ""}`.trim(),
                          lastName: thread.otherUser?.lastName,
                          firstName: thread.otherUser?.firstName,
                          avatar: thread.otherUser?.avatarUrl,
                          userId: thread.otherUser?.id,
                          _chatId: thread._id,
                          requestRef: thread.requestRef,
                          isAI: false,
                        })}
                        className={cn(
                          "flex w-full items-center gap-3 border-b border-border/10 px-4 py-3 text-left transition-colors",
                          selectedContact?.userId === thread.otherUser?.id
                            ? "bg-primary/5"
                            : "hover:bg-muted/30"
                        )}
                      >
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={thread.otherUser?.avatarUrl} />
                          <AvatarFallback className="bg-primary/10 text-xs text-primary">
                            {(thread.otherUser?.firstName?.[0] ?? "") + (thread.otherUser?.lastName?.[0] ?? "")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="truncate text-sm font-medium">
                              {thread.otherUser?.firstName ?? ""} {thread.otherUser?.lastName ?? ""}
                            </p>
                            {thread.requestRef && (
                              <Badge variant="outline" className="text-[7px] h-3.5 px-1 shrink-0">
                                {thread.requestRef}
                              </Badge>
                            )}
                            {thread.lastMessageAt && (
                              <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                                {new Date(thread.lastMessageAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-muted-foreground mt-0.5">
                            {thread.lastMessageText ?? "Nouvelle conversation"}
                          </p>
                        </div>
                        {thread.unreadCount > 0 && (
                          <Badge className="text-[8px] h-4 min-w-[16px] px-1 bg-primary text-primary-foreground">
                            {thread.unreadCount}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Contacts humains */}
                {filteredContacts.map((c: any) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedContact(c)}
                    className={cn(
                      "flex w-full items-center gap-3 border-b border-border/10 px-4 py-3 text-left transition-colors",
                      selectedContact?.id === c.id
                        ? "bg-primary/5"
                        : "hover:bg-muted/30"
                    )}
                  >
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={c.avatar} />
                      <AvatarFallback className="bg-primary/10 text-xs text-primary">
                        {c.name
                          ?.split(" ")
                          .map((w: string) => w[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{c.lastName}</p>
                      <p className="truncate text-xs text-foreground/80">
                        {c.firstName}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {c.position}
                      </p>
                    </div>
                  </button>
                ))}
              </ScrollArea>
            </div>

            {/* ── Col 3 : Zone de chat (comme WhatsApp) ── */}
            <div className="flex flex-1 flex-col overflow-hidden">
              {selectedContact ? (
                <>
                  {/* Header contact */}
                  <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
                    <Avatar className="h-9 w-9">
                      {selectedContact.isAI ? (
                        <AvatarFallback className="bg-emerald-500/15 text-emerald-500">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      ) : (
                        <>
                          <AvatarImage src={selectedContact.avatar} />
                          <AvatarFallback className="bg-primary/10 text-xs text-primary">
                            {selectedContact.name
                              ?.split(" ")
                              .map((w: string) => w[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </>
                      )}
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      {selectedContact.isAI ? (
                        <>
                          <p className="text-sm font-semibold">iAsted</p>
                          <p className="text-[11px] text-muted-foreground">
                            Agent IA Diplomate
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-bold">
                            {selectedContact.lastName}{" "}
                            {selectedContact.firstName}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {selectedContact.requestRef ? `Demande ${selectedContact.requestRef}` : (selectedContact.position ?? "Agent consulaire")}
                          </p>
                        </>
                      )}
                    </div>
                    {selectedContact.isAI && voice.isAvailable && (
                      <VoiceButton
                        isOpen={voice.isOpen}
                        onClick={() =>
                          voice.isOpen
                            ? voice.closeOverlay()
                            : voice.openOverlay()
                        }
                      />
                    )}
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 px-6 py-4">
                    {selectedContact.isAI ? (
                      chat.messages.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                            <Bot className="h-8 w-8 text-emerald-500" />
                          </div>
                          <h3 className="mb-1 text-base font-semibold">
                            Bonjour, je suis iAsted
                          </h3>
                          <p className="mb-6 max-w-md text-sm text-muted-foreground">
                            Votre conscience numérique. Posez-moi une question
                            ou choisissez une suggestion.
                          </p>
                          <div className="flex max-w-lg flex-wrap justify-center gap-2">
                            {suggestions.map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setMessageInput(s)}
                                className="rounded-full border border-emerald-500/20 px-3 py-1.5 text-xs text-emerald-600 transition-colors hover:bg-emerald-500/10 dark:text-emerald-400"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mx-auto max-w-3xl space-y-3">
                          {chat.messages.map((msg, i) => (
                            <div
                              key={i}
                              className={cn(
                                "flex gap-2",
                                msg.role === "user"
                                  ? "justify-end"
                                  : "justify-start"
                              )}
                            >
                              {msg.role === "assistant" && (
                                <Avatar className="mt-1 h-7 w-7 shrink-0">
                                  <AvatarFallback className="bg-emerald-500/10 text-[9px] text-emerald-600">
                                    <Bot className="h-3.5 w-3.5" />
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div
                                className={cn(
                                  "max-w-[70%] rounded-xl px-3 py-2 text-sm",
                                  msg.role === "user"
                                    ? "bg-emerald-600 text-white"
                                    : "border bg-card"
                                )}
                              >
                                {msg.role === "assistant" ? (
                                  <Markdown className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0">
                                    {msg.content}
                                  </Markdown>
                                ) : (
                                  msg.content
                                )}
                                <p
                                  className={cn(
                                    "mt-1 text-[9px]",
                                    msg.role === "user"
                                      ? "text-right text-white/60"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  {new Date(msg.timestamp).toLocaleTimeString(
                                    "fr-FR",
                                    { hour: "2-digit", minute: "2-digit" }
                                  )}
                                </p>
                              </div>
                            </div>
                          ))}
                          {chat.isLoading && (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="bg-emerald-500/10 text-[9px] text-emerald-600">
                                  <Bot className="h-3.5 w-3.5" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="rounded-xl border bg-card px-3 py-2">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              </div>
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </div>
                      )
                    ) : (
                      <FullPageHumanChat contact={selectedContact} />
                    )}
                  </ScrollArea>

                  {/* Actions IA en attente */}
                  {selectedContact.isAI && chat.pendingActions.length > 0 && (
                    <div className="space-y-1.5 border-t bg-amber-50 px-6 py-2 dark:bg-amber-950/20">
                      {chat.pendingActions.map((action, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-lg border border-amber-200 bg-background p-2 text-xs"
                        >
                          <span className="font-medium">
                            {action.reason ?? action.type}
                          </span>
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => chat.rejectAction(action)}
                              className="h-6 text-[10px]"
                            >
                              Non
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => chat.confirmAction(action)}
                              className="h-6 text-[10px]"
                            >
                              Oui
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Input — style WhatsApp */}
                  <div className="flex shrink-0 items-end gap-3 border-t px-4 py-3">
                    <Textarea
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        selectedContact.isAI
                          ? "Demandez à iAsted..."
                          : "Écrire un message..."
                      }
                      className="max-h-[120px] min-h-[40px] flex-1 resize-none text-sm"
                      rows={1}
                    />
                    <Button
                      size="icon"
                      onClick={selectedContact.isAI ? handleSendAI : () => {
                        // P2P send handled by FullPageHumanChat via custom event
                        window.dispatchEvent(new CustomEvent("iasted:send-human", { detail: { text: messageInput } }))
                        setMessageInput("")
                      }}
                      disabled={
                        !messageInput.trim() ||
                        (selectedContact.isAI && chat.isLoading)
                      }
                      className={cn(
                        "h-10 w-10 shrink-0 rounded-full",
                        selectedContact.isAI
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : ""
                      )}
                    >
                      {selectedContact.isAI && chat.isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center text-center">
                  <div>
                    <ShieldCheck className="mx-auto mb-4 h-16 w-16 text-emerald-500/20" />
                    <h2 className="text-lg font-semibold text-muted-foreground">
                      iAsted
                    </h2>
                    <p className="text-sm text-muted-foreground/60">
                      Sélectionnez une conversation
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* ── Onglets non-chat (iContact, iAppel, Réglages) ── */
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="shrink-0 border-b px-4 py-3">
              <h2 className="text-base font-semibold">
                {activeTab === "icontact"
                  ? "iContact"
                  : activeTab === "icall"
                    ? "iAppel"
                    : activeTab === "imeeting"
                      ? "iRéunion"
                      : "Réglages"}
              </h2>
            </div>
            <div className="flex-1 overflow-hidden">
              {activeTab === "icontact" && <IAstedContactTab />}
              {activeTab === "icall" && <IAstedCallTab />}
              {activeTab === "imeeting" && <IAstedMeetingTab />}
              {activeTab === "settings" && <IAstedSettingsTab />}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// Composant chat humain plein écran (P2P via Convex)
// ════════════════════════════════════════════════════════════
function FullPageHumanChat({ contact }: { contact: any }) {
  const { activeOrgId } = useOrg()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Chercher le thread existant
  const { data: existingChat } = useAuthenticatedConvexQuery(
    api.functions.chats.findChatWith,
    contact?.userId ? { targetUserId: contact.userId as Id<"users"> } : "skip",
  )

  const resolvedChatId = (contact?._chatId as Id<"chats"> | undefined) ?? existingChat?._id

  // Messages temps réel
  const { data: messages, isPending: messagesLoading } = useAuthenticatedConvexQuery(
    api.functions.chats.listMessages,
    resolvedChatId ? { chatId: resolvedChatId, limit: 50 } : "skip",
  )

  // Mutations
  const { mutateAsync: initiateChat } = useConvexMutationQuery(api.functions.chats.initiateChat)
  const { mutateAsync: sendChatMessage } = useConvexMutationQuery(api.functions.chats.sendMessage)
  const { mutateAsync: markRead } = useConvexMutationQuery(api.functions.chats.markRead)

  // Marquer lu
  useEffect(() => {
    if (resolvedChatId) {
      markRead({ chatId: resolvedChatId }).catch((e) => {
        console.warn("Failed to mark messages as read:", e)
      })
    }
  }, [resolvedChatId, markRead, messages?.length])

  // Auto-scroll
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 50)
    return () => clearTimeout(timer)
  }, [messages])

  // Écouter les événements d'envoi depuis le parent
  useEffect(() => {
    const handler = async (e: Event) => {
      const text = (e as CustomEvent).detail?.text?.trim()
      if (!text || !contact?.userId) return
      try {
        if (resolvedChatId) {
          await sendChatMessage({ chatId: resolvedChatId, content: text })
        } else {
          await initiateChat({
            targetUserId: contact.userId as Id<"users">,
            orgId: activeOrgId ?? undefined,
            initialMessage: text,
          })
        }
      } catch (err: any) {
        toast.error(err?.message ?? "Erreur d'envoi")
      }
    }
    window.addEventListener("iasted:send-human", handler)
    return () => window.removeEventListener("iasted:send-human", handler)
  }, [contact, resolvedChatId, sendChatMessage, initiateChat, activeOrgId])

  const isActuallyLoading = messagesLoading && !!resolvedChatId

  if (isActuallyLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-12">
        <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">Envoyez le premier message</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 p-4">
      {messages.map((msg: any) => {
        const isMe = msg.senderId !== contact.userId
        return (
          <div key={msg._id} className={cn("flex gap-2.5", isMe ? "justify-end" : "justify-start")}>
            {!isMe && (
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={contact.avatar} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {contact.name?.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            )}
            <div className={cn(
              "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm",
              isMe ? "bg-primary text-primary-foreground" : "bg-muted",
            )}>
              {msg.content}
              <div className={cn(
                "text-[10px] mt-1",
                isMe ? "text-primary-foreground/60" : "text-muted-foreground/60",
              )}>
                {new Date(msg._creationTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
            {isMe && (
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                  <User className="h-3.5 w-3.5" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        )
      })}
      <div ref={scrollRef} />
    </div>
  )
}
