"use client";

/**
 * iAsted Citoyen — Layout WhatsApp Desktop 3 colonnes
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import dynamic from "next/dynamic";
import "@livekit/components-styles";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useMeeting } from "@/hooks/use-meeting";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { useCallStore } from "@/stores/call-store";
import { cn } from "@/lib/utils";

const LiveKitRoom = dynamic(
	() => import("@livekit/components-react").then((mod) => mod.LiveKitRoom),
	{ ssr: false },
);

const CustomCallUI = dynamic(
	() => import("@/components/meetings/custom-call-ui").then((mod) => mod.CustomCallUI),
	{ ssr: false },
);

// ─────────────────────────────────────────────
// Types & constantes
// ─────────────────────────────────────────────

type TabId = "ichat" | "icall" | "icontact";

const NAV_ITEMS: Array<{ id: TabId; icon: typeof Phone; label: string }> = [
	{ id: "ichat", icon: MessageSquare, label: "iChat" },
	{ id: "icall", icon: Phone, label: "iAppel" },
	{ id: "icontact", icon: Contact, label: "iContact" },
];

const MR_RAY_CONTACT = {
	id: "__mr_ray__",
	name: "Mr Ray",
	subtitle: "Standard — Assistance Consulaire",
	isAI: true,
	isStandard: true,
};

// ─────────────────────────────────────────────
// Page principale — Layout WhatsApp Desktop
// ─────────────────────────────────────────────

export default function IAstedCitizenPage() {
	const [activeTab, setActiveTab] = useState<TabId>("ichat");
	const [selectedContact, setSelectedContact] = useState<any>(MR_RAY_CONTACT);
	const [search, setSearch] = useState("");
	const [messageInput, setMessageInput] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const router = useRouter();

	// En mobile, rediriger vers le dashboard et ouvrir la fenêtre chat
	useEffect(() => {
		const isMobile = window.innerWidth < 1024;
		if (isMobile) {
			router.push("/my-space");
			setTimeout(() => window.dispatchEvent(new CustomEvent("iasted:open")), 150);
		}
	}, [router]);

	// ── Threads agents (temps réel) ──
	const { data: chatThreads, isPending: threadsLoading } =
		useAuthenticatedConvexQuery(api.functions.chats.listMyChats, {});

	// Inscription consulaire → orgId pour initiateStandardChat
	const { data: registrations } = useAuthenticatedConvexQuery(
		api.functions.consularRegistrations.listByProfile,
		{},
	);
	const orgId = (registrations as any[])?.[0]?.orgId as Id<"orgs"> | undefined;

	// Thread Standard (Mr Ray) existant
	const mrRayThread = useMemo(() => {
		if (!chatThreads) return null;
		return (chatThreads as any[]).find((t: any) => t.type === "standard") ?? null;
	}, [chatThreads]);

	// Messages du thread sélectionné (Mr Ray = thread standard, sinon P2P)
	const selectedChatId = useMemo(() => {
		if (!selectedContact) return undefined;
		if (selectedContact.isStandard && mrRayThread) return mrRayThread._id;
		if (selectedContact.isStandard) return undefined;
		return selectedContact._id;
	}, [selectedContact, mrRayThread]);

	const { data: threadMessages, isPending: messagesLoading } =
		useAuthenticatedConvexQuery(
			api.functions.chats.listMessages,
			selectedChatId
				? { chatId: selectedChatId as Id<"chats">, limit: 50 }
				: "skip",
		);

	const { mutateAsync: sendChatMessage } = useConvexMutationQuery(
		api.functions.chats.sendMessage,
	);
	const { mutateAsync: initiateStandard } = useConvexMutationQuery(
		api.functions.chats.initiateStandardChat,
	);
	const { mutateAsync: markRead } = useConvexMutationQuery(
		api.functions.chats.markRead,
	);

	// Marquer comme lu
	useEffect(() => {
		if (selectedChatId) {
			markRead({ chatId: selectedChatId as Id<"chats"> }).catch(() => {});
		}
	}, [selectedChatId, markRead, threadMessages?.length]);

	// Auto-scroll
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [threadMessages]);

	// ── Envoi message Mr Ray (Standard) ──
	const handleSendStandard = async () => {
		const text = messageInput.trim();
		if (!text) return;
		try {
			if (mrRayThread) {
				await sendChatMessage({ chatId: mrRayThread._id as Id<"chats">, content: text });
			} else if (orgId) {
				await initiateStandard({ orgId, initialMessage: text });
			} else {
				toast.error("Vous devez être inscrit à une représentation pour utiliser le Standard.");
				return;
			}
			setMessageInput("");
		} catch (e: any) {
			toast.error(e?.data ?? e?.message ?? "Erreur d'envoi");
		}
	};

	// ── Envoi message humain ──
	const handleSendHuman = async () => {
		const text = messageInput.trim();
		if (!text || !selectedChatId) return;
		try {
			await sendChatMessage({
				chatId: selectedChatId as Id<"chats">,
				content: text,
			});
			setMessageInput("");
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur d'envoi");
		}
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			if (selectedContact?.isStandard) handleSendStandard();
			else handleSendHuman();
		}
	};

	// Filtrage threads — exclure le thread standard (Mr Ray est affiché séparément)
	const filteredThreads = useMemo(() => {
		if (!chatThreads) return [];
		const p2p = (chatThreads as any[]).filter((t: any) => t.type !== "standard");
		const q = search.trim().toLowerCase();
		if (!q) return p2p;
		return p2p.filter(
			(t: any) =>
				(t.otherUser?.firstName ?? "").toLowerCase().includes(q) ||
				(t.otherUser?.lastName ?? "").toLowerCase().includes(q),
		);
	}, [chatThreads, search]);

	return (
		<div className="flex flex-col gap-4 h-full p-4 lg:p-6 overflow-hidden">
			{/* Header */}
			<div className="flex items-center justify-between shrink-0">
				<div className="flex items-center gap-3">
					<div className="p-2 rounded-lg bg-foreground/[0.08] dark:bg-foreground/[0.05]">
						<ShieldCheck className="h-5 w-5" />
					</div>
					<div>
						<h1 className="text-lg font-bold tracking-tight">iAsted</h1>
						<p className="text-xs text-muted-foreground">
							Espace de communication consulaire
						</p>
					</div>
				</div>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => {
						router.push("/my-space");
						setTimeout(() => window.dispatchEvent(new CustomEvent("iasted:open")), 100);
					}}
					className="h-8 px-3 text-xs font-medium text-foreground bg-muted hover:bg-muted/70 active:scale-[0.97] transition-transform rounded-full gap-1.5"
				>
					<Minimize2 className="h-3.5 w-3.5" />
					Réduire
				</Button>
			</div>

			{/* Card principale — 3 colonnes */}
			<div className="flex flex-1 min-h-0 overflow-hidden rounded-xl bg-card border flat-card-border">
				{/* ── Col 1 : Icônes navigation ── */}
				<div className="w-14 border-r border-foreground/5 flex flex-col items-center py-3 gap-1 shrink-0">
					<div className="p-1.5 rounded-lg bg-foreground/[0.08] dark:bg-foreground/[0.05] flex items-center justify-center mb-4">
						<ShieldCheck className="h-4 w-4" />
					</div>

					{NAV_ITEMS.map((item) => {
						const Icon = item.icon;
						const isActive = activeTab === item.id;
						return (
							<button
								key={item.id}
								type="button"
								onClick={() => setActiveTab(item.id)}
								title={item.label}
								className={cn(
									"h-10 w-10 rounded-lg flex items-center justify-center transition-all",
									isActive
										? "bg-foreground/[0.08] dark:bg-foreground/[0.05] text-foreground font-medium"
										: "text-muted-foreground hover:bg-muted hover:text-foreground",
								)}
							>
								<Icon className="h-5 w-5" />
							</button>
						);
					})}

					<div className="flex-1" />

					<button
						type="button"
						onClick={() => router.push("/my-space")}
						title="Réduire"
						className="h-10 w-10 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
					>
						<Minimize2 className="h-5 w-5" />
					</button>
				</div>

				{activeTab === "ichat" ? (
					<>
						{/* ── Col 2 : Liste conversations ── */}
						<div className="w-80 border-r border-foreground/5 flex flex-col shrink-0">
							<div className="px-4 py-3 border-b border-foreground/5 shrink-0">
								<span className="text-sm font-semibold flex items-center gap-2.5 text-muted-foreground">
									<div className="p-1 rounded-md bg-foreground/[0.08] dark:bg-foreground/[0.05]">
										<MessageSquare className="h-3.5 w-3.5" />
									</div>
									Discussions
								</span>
							</div>

							<div className="p-2 border-b border-foreground/5">
								<div className="relative">
									<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
									<Input
										value={search}
										onChange={(e) => setSearch(e.target.value)}
										placeholder="Rechercher"
										className="h-8 pl-8 text-xs bg-muted/50 border-0 rounded-lg"
									/>
								</div>
							</div>

							<ScrollArea className="flex-1">
								{/* Mr Ray — Standard épinglé */}
								<button
									type="button"
									onClick={() => setSelectedContact(MR_RAY_CONTACT)}
									className={cn(
										"w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-foreground/5",
										selectedContact?.id === "__mr_ray__"
											? "bg-primary/5"
											: "hover:bg-muted",
									)}
								>
									<div className="relative">
										<Avatar className="h-11 w-11">
											<AvatarFallback className="bg-primary/10 text-primary">
												<Headset className="h-5 w-5" />
											</AvatarFallback>
										</Avatar>
										<Pin className="absolute -top-0.5 -right-0.5 h-3 w-3 text-primary rotate-45" />
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-1.5">
												<p className="text-sm font-semibold">Mr Ray</p>
												<Badge className="text-[7px] h-3.5 px-1 badge-info">
													Standard
												</Badge>
											</div>
											{mrRayThread?.lastMessageAt && (
												<span className="text-[10px] text-muted-foreground">
													{new Date(
														mrRayThread.lastMessageAt,
													).toLocaleTimeString("fr-FR", {
														hour: "2-digit",
														minute: "2-digit",
													})}
												</span>
											)}
										</div>
										<p className="text-xs text-muted-foreground truncate mt-0.5">
											{mrRayThread?.lastMessageText
												? mrRayThread.lastMessageText.slice(0, 45) + "..."
												: "Standard Consulaire — Posez une question"}
										</p>
									</div>
									{(mrRayThread?.unreadCount ?? 0) > 0 && (
										<Badge className="text-[8px] h-4 min-w-[16px] px-1 bg-primary text-primary-foreground">
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
												"w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-foreground/5",
												selectedContact?._id === thread._id
													? "bg-primary/5"
													: "hover:bg-muted",
											)}
										>
											<Avatar className="h-11 w-11">
												<AvatarImage
													src={thread.otherUser?.avatarUrl}
												/>
												<AvatarFallback className="text-xs bg-primary/10 text-primary">
													{(
														(thread.otherUser?.firstName?.[0] ?? "") +
														(thread.otherUser?.lastName?.[0] ?? "")
													).toUpperCase()}
												</AvatarFallback>
											</Avatar>
											<div className="flex-1 min-w-0">
												<div className="flex items-center justify-between">
													<p className="text-sm font-bold truncate">
														{(
															thread.otherUser?.lastName ?? ""
														).toUpperCase()}
													</p>
													{thread.lastMessageAt && (
														<span className="text-[10px] text-muted-foreground shrink-0 ml-2">
															{new Date(
																thread.lastMessageAt,
															).toLocaleTimeString("fr-FR", {
																hour: "2-digit",
																minute: "2-digit",
															})}
														</span>
													)}
												</div>
												<p className="text-xs text-foreground/80 truncate">
													{thread.otherUser?.firstName ?? ""}
												</p>
												<p className="text-[10px] text-muted-foreground truncate">
													{thread.lastMessageText ??
														"Agent consulaire"}
												</p>
											</div>
											{thread.unreadCount > 0 && (
												<Badge className="text-[8px] h-4 min-w-[16px] px-1 bg-primary text-primary-foreground">
													{thread.unreadCount}
												</Badge>
											)}
										</button>
									))
								) : (
									<div className="flex flex-col items-center justify-center py-8 text-center px-4">
										<MessageSquare className="h-8 w-8 text-muted-foreground/20 mb-2" />
										<p className="text-xs text-muted-foreground">
											Aucune conversation avec un agent
										</p>
										<p className="text-[10px] text-muted-foreground/60 mt-1">
											Les agents vous contacteront ici
										</p>
									</div>
								)}
							</ScrollArea>
						</div>

						{/* ── Col 3 : Zone de chat ── */}
						<div className="flex-1 flex flex-col overflow-hidden">
							{selectedContact ? (
								<>
									{/* Header contact */}
									<div className="px-4 py-3 border-b border-foreground/5 flex items-center gap-3 shrink-0">
										<Avatar className="h-9 w-9">
											{selectedContact.isStandard ? (
												<AvatarFallback className="bg-foreground/[0.08] dark:bg-foreground/[0.05] text-muted-foreground">
													<Headset className="h-4 w-4" />
												</AvatarFallback>
											) : (
												<>
													<AvatarImage
														src={
															selectedContact.otherUser
																?.avatarUrl
														}
													/>
													<AvatarFallback className="text-xs bg-primary/10 text-primary">
														{(
															(selectedContact.otherUser
																?.firstName?.[0] ?? "") +
															(selectedContact.otherUser
																?.lastName?.[0] ?? "")
														).toUpperCase()}
													</AvatarFallback>
												</>
											)}
										</Avatar>
										<div className="flex-1 min-w-0">
											{selectedContact.isStandard ? (
												<>
													<p className="text-sm font-semibold">
														Mr Ray
													</p>
													<p className="text-[11px] text-muted-foreground">
														Standard — Assistance Consulaire
													</p>
												</>
											) : (
												<>
													<p className="text-sm font-bold">
														{selectedContact.otherUser
															?.lastName ?? ""}{" "}
														{selectedContact.otherUser
															?.firstName ?? ""}
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
											!threadMessages || (threadMessages as any[]).length === 0 ? (
												<div className="flex flex-col items-center justify-center h-full text-center py-12">
													<div className="rounded-full bg-muted p-4 mb-4">
														<Headset className="h-8 w-8 text-muted-foreground" />
													</div>
													<h3 className="text-sm font-semibold text-foreground mb-1">
														Bonjour, je suis Mr Ray
													</h3>
													<p className="text-sm text-muted-foreground max-w-sm mb-6">
														Votre assistant au Standard consulaire. Posez-moi
														vos questions sur les démarches, passeports, visas...
													</p>
													<div className="flex flex-wrap gap-2 justify-center max-w-lg">
														{[
															"Carte consulaire",
															"Mon passeport",
															"Rendez-vous",
															"Horaires",
														].map((s) => (
															<button
																key={s}
																type="button"
																onClick={() =>
																	setMessageInput(s)
																}
																className="text-xs px-4 py-2 rounded-full border border-foreground/10 text-foreground hover:bg-muted active:scale-[0.97] transition-all"
															>
																{s}
															</button>
														))}
													</div>
												</div>
											) : (
												<div className="space-y-3 max-w-3xl mx-auto">
													{(threadMessages as any[]).map((msg: any) => {
														const isMrRay = msg.senderName?.includes("Ray") || msg.senderName?.includes("NGOMONDAMI");
														return (
															<div
																key={msg._id}
																className={cn(
																	"flex gap-2",
																	!isMrRay
																		? "justify-end"
																		: "justify-start",
																)}
															>
																{isMrRay && (
																	<Avatar className="h-7 w-7 shrink-0 mt-1">
																		<AvatarFallback className="bg-foreground/[0.06] text-muted-foreground text-[9px]">
																			<Bot className="h-3.5 w-3.5" />
																		</AvatarFallback>
																	</Avatar>
																)}
																<div
																	className={cn(
																		"max-w-[70%] rounded-xl px-3 py-2 text-sm",
																		!isMrRay
																			? "bg-primary text-primary-foreground"
																			: "bg-card border",
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
																			"text-[9px] mt-1",
																			!isMrRay
																				? "text-primary-foreground/60 text-right"
																				: "text-muted-foreground",
																		)}
																	>
																		{new Date(
																			msg.createdAt,
																		).toLocaleTimeString(
																			"fr-FR",
																			{
																				hour: "2-digit",
																				minute: "2-digit",
																			},
																		)}
																	</p>
																</div>
															</div>
														);
													})}
													<div ref={messagesEndRef} />
												</div>
											)
										) : /* ── Messages agent (temps réel) ── */
										messagesLoading ? (
											<div className="flex items-center justify-center py-8">
												<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
											</div>
										) : !threadMessages ||
										  threadMessages.length === 0 ? (
											<div className="flex flex-col items-center justify-center h-full text-center py-12">
												<MessageSquare className="h-12 w-12 text-muted-foreground/20 mb-3" />
												<p className="text-sm text-muted-foreground">
													Démarrez la conversation avec{" "}
													{selectedContact.otherUser
														?.firstName ?? "l'agent"}
												</p>
											</div>
										) : (
											<div className="space-y-3 max-w-3xl mx-auto">
												{(threadMessages as any[]).map(
													(msg: any) => {
														const isMe =
															msg.senderId !==
															selectedContact.otherUser
																?.id;
														return (
															<div
																key={msg._id}
																className={cn(
																	"flex gap-2",
																	isMe
																		? "justify-end"
																		: "justify-start",
																)}
															>
																{!isMe && (
																	<Avatar className="h-7 w-7 shrink-0 mt-1">
																		<AvatarFallback className="text-[9px] bg-primary/10 text-primary">
																			{(
																				(selectedContact
																					.otherUser
																					?.firstName?.[0] ??
																					"") +
																				(selectedContact
																					.otherUser
																					?.lastName?.[0] ??
																					"")
																			).toUpperCase()}
																		</AvatarFallback>
																	</Avatar>
																)}
																<div
																	className={cn(
																		"max-w-[70%] rounded-xl px-3 py-2 text-sm",
																		isMe
																			? "bg-primary text-primary-foreground"
																			: "bg-card border",
																	)}
																>
																	{msg.content}
																	<p
																		className={cn(
																			"text-[9px] mt-1",
																			isMe
																				? "text-primary-foreground/60 text-right"
																				: "text-muted-foreground",
																		)}
																	>
																		{new Date(
																			msg._creationTime,
																		).toLocaleTimeString(
																			"fr-FR",
																			{
																				hour: "2-digit",
																				minute: "2-digit",
																			},
																		)}
																	</p>
																</div>
															</div>
														);
													},
												)}
												<div ref={messagesEndRef} />
											</div>
										)}
									</ScrollArea>

									{/* Input */}
									<div className="border-t border-foreground/5 px-4 py-3 flex items-end gap-3 shrink-0">
										<Textarea
											value={messageInput}
											onChange={(e) =>
												setMessageInput(e.target.value)
											}
											onKeyDown={handleKeyDown}
											placeholder={
												selectedContact.isStandard
													? "Écrivez au Standard..."
													: "Écrire un message..."
											}
											className="min-h-[40px] max-h-[120px] resize-none text-sm flex-1 rounded-xl"
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
											className="h-10 w-10 rounded-xl shrink-0"
										>
											<Send className="h-4 w-4" />
										</Button>
									</div>
								</>
							) : (
								<div className="flex-1 flex items-center justify-center text-center">
									<div>
										<div className="rounded-full bg-muted p-4 mx-auto mb-4">
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
					<div className="flex-1 flex flex-col overflow-hidden">
						<div className="px-4 py-3 border-b border-foreground/5 shrink-0">
							<span className="text-sm font-semibold flex items-center gap-2.5 text-muted-foreground">
								<div className="p-1 rounded-md bg-foreground/[0.08] dark:bg-foreground/[0.05]">
									{activeTab === "icall" ? <Phone className="h-3.5 w-3.5" /> : <Contact className="h-3.5 w-3.5" />}
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
	);
}

// ─────────────────────────────────────────────
// iAppel — Appels audio vers représentations
// ─────────────────────────────────────────────

function IAppelContent() {
	const [activeMeetingId, setActiveMeetingId] = useState<Id<"meetings"> | null>(
		null,
	);
	const [selectedOrg, setSelectedOrg] = useState<any>(null);
	const [searchOrg, setSearchOrg] = useState("");
	const [isCalling, setIsCalling] = useState(false);
	const { globalActiveMeetingId, setGlobalMeetingId } = useCallStore();

	const { data: allOrgs, isPending: orgsLoading } =
		useAuthenticatedConvexQuery(api.functions.orgs.list, {});
	const { data: myMeetingsData, isPending: historyLoading } =
		useAuthenticatedConvexQuery(api.functions.meetings.listMine, {});

	const myMeetings = (myMeetingsData as any)?.meetings ?? [];
	const participantNames = (myMeetingsData as any)?.participantNames ?? {};

	const incomingCalls = useMemo(() => {
		const now = Date.now();
		return myMeetings.filter((m: any) => {
			if (m.status !== "active") return false;
			if (m.type !== "call" && m.type !== "meeting") return false;
			if (now - m._creationTime > 75_000) return false;
			const myParticipant = m.participants?.find(
				(p: any) => p.role !== "host",
			);
			return !!myParticipant && !myParticipant.joinedAt;
		});
	}, [myMeetings]);

	const callHistory = useMemo(() => {
		return myMeetings
			.filter((m: any) => m.type === "call" || m.type === "meeting")
			.slice(0, 25);
	}, [myMeetings]);

	const {
		token,
		wsUrl,
		error: meetingError,
		connect,
		disconnect,
	} = useMeeting(activeMeetingId ?? undefined);

	const { mutateAsync: callOrganization } = useConvexMutationQuery(
		api.functions.meetings.callOrganization,
	);

	const filteredOrgs = useMemo(() => {
		if (!allOrgs) return [];
		const q = searchOrg.trim().toLowerCase();
		if (!q) return (allOrgs as any[]).slice(0, 12);
		return (allOrgs as any[])
			.filter(
				(org) =>
					org.name.toLowerCase().includes(q) ||
					(org.country ?? "").toLowerCase().includes(q),
			)
			.slice(0, 12);
	}, [allOrgs, searchOrg]);

	const handleCallOrg = async (org: any) => {
		if (globalActiveMeetingId) {
			toast.error("Un appel est déjà en cours");
			return;
		}
		setIsCalling(true);
		try {
			const result = await callOrganization({
				orgId: org._id,
				mediaType: "audio",
			});
			const meetingId = result.meetingId as Id<"meetings">;
			setActiveMeetingId(meetingId);
			setSelectedOrg(org);
			setGlobalMeetingId(meetingId);
			await connect(meetingId);
			toast.success(`Appel vers ${org.name}...`);
		} catch (e: any) {
			const msg =
				e?.data?.errorMessage ||
				e?.message?.match(/Uncaught ConvexError: (.*?)(?:\n|$)/)?.[1] ||
				"Erreur lors de l'appel";
			toast.error(msg);
			setActiveMeetingId(null);
			setGlobalMeetingId(null);
		} finally {
			setIsCalling(false);
		}
	};

	const handleAnswer = async (meetingId: Id<"meetings">) => {
		setActiveMeetingId(meetingId);
		setSelectedOrg(null);
		setGlobalMeetingId(meetingId);
		try {
			await connect(meetingId);
		} catch {
			toast.error("Impossible de rejoindre l'appel");
			setActiveMeetingId(null);
			setGlobalMeetingId(null);
		}
	};

	const handleHangUp = async () => {
		if (activeMeetingId) await disconnect(activeMeetingId);
		setActiveMeetingId(null);
		setGlobalMeetingId(null);
	};

	const isInCall = activeMeetingId !== null && token && wsUrl;

	return (
		<div className="h-full flex flex-col gap-4 overflow-hidden">
			{/* Appels entrants */}
			{incomingCalls.length > 0 && (
				<div className="rounded-xl border border-success/30 bg-success/10 p-3 space-y-2 shrink-0">
					<div className="flex items-center gap-2">
						<PhoneIncoming className="h-4 w-4 text-success animate-pulse" />
						<span className="text-sm font-semibold text-success">
							Appel entrant
						</span>
					</div>
					{incomingCalls.map((call: any) => {
						const callerName =
							participantNames[call.createdBy] ?? "Agent consulaire";
						const isVideo =
							call.mediaType === "video" || call.type === "meeting";
						return (
							<div
								key={call._id}
								className="flex items-center justify-between bg-background rounded-xl p-3 border"
							>
								<div className="flex items-center gap-3">
									<div className="relative h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
										<PhoneCall className="h-5 w-5 text-success" />
										<span className="absolute inset-0 rounded-full border border-success animate-ping opacity-40" />
									</div>
									<div>
										<p className="text-sm font-medium">
											{callerName}
										</p>
										<p className="text-xs text-muted-foreground">
											{call.title ?? "Appel"}{" "}
											{isVideo && (
												<Badge className="text-[9px] h-3.5 badge-info ml-1">
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
										className="h-8 gap-1 text-destructive border-destructive/30"
										onClick={handleHangUp}
									>
										<PhoneOff className="h-3.5 w-3.5" />
										Refuser
									</Button>
									<Button
										size="sm"
										className="h-8 gap-1 bg-success hover:bg-success/90 text-white"
										onClick={() => handleAnswer(call._id)}
									>
										<Phone className="h-3.5 w-3.5" />
										Répondre
									</Button>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Sélecteur org */}
			<div className="rounded-xl bg-card border flat-card-border p-4 space-y-3 shrink-0">
				<span className="text-sm font-semibold flex items-center gap-2.5 text-muted-foreground">
					<div className="p-1 rounded-md bg-foreground/[0.08] dark:bg-foreground/[0.05]">
						<Building2 className="h-3.5 w-3.5" />
					</div>
					Appeler une représentation
				</span>
				<div className="relative">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
					<Input
						value={searchOrg}
						onChange={(e) => setSearchOrg(e.target.value)}
						placeholder="Rechercher une représentation..."
						className="pl-8 h-8 text-sm"
					/>
				</div>

				{orgsLoading ? (
					<div className="flex items-center justify-center py-3">
						<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
					</div>
				) : (
					<div className="space-y-1 max-h-44 overflow-y-auto pr-0.5">
						{filteredOrgs.length === 0 ? (
							<p className="text-xs text-muted-foreground text-center py-2">
								Aucune représentation trouvée
							</p>
						) : (
							filteredOrgs.map((org: any) => (
								<button
									key={org._id}
									type="button"
									onClick={() =>
										setSelectedOrg(
											selectedOrg?._id === org._id ? null : org,
										)
									}
									className={cn(
										"w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors",
										selectedOrg?._id === org._id
											? "bg-primary/10 text-primary"
											: "hover:bg-muted/50",
									)}
								>
									<div className="p-1 rounded-md bg-foreground/[0.08] dark:bg-foreground/[0.05] flex items-center justify-center shrink-0">
										<Building2 className="h-3.5 w-3.5 text-muted-foreground" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-xs font-medium truncate">
											{org.name}
										</p>
										{org.country && (
											<p className="text-[10px] text-muted-foreground">
												{org.country}
											</p>
										)}
									</div>
									{selectedOrg?._id === org._id && (
										<Badge className="text-[9px] h-4 bg-primary/15 text-primary border-primary/20 shrink-0">
											
										</Badge>
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
				<p className="text-[10px] text-muted-foreground text-center">
					Audio uniquement — Les citoyens peuvent recevoir des appels vidéo
					d'un agent
				</p>
			</div>

			{/* Historique */}
			<div className="flex-1 min-h-0 overflow-y-auto">
				<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">
					Historique récent
				</p>
				{historyLoading ? (
					<div className="flex items-center justify-center py-4">
						<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
					</div>
				) : callHistory.length === 0 ? (
					<div className="flex flex-col items-center py-6 text-center">
						<PhoneMissed className="h-8 w-8 text-muted-foreground/20 mb-2" />
						<p className="text-xs text-muted-foreground">
							Aucun appel récent
						</p>
					</div>
				) : (
					<div className="space-y-1">
						{callHistory.map((call: any) => {
							const isOutgoing = call.isOrgInbound === true;
							const duration =
								call.startedAt && call.endedAt
									? Math.floor(
											(call.endedAt - call.startedAt) / 60000,
										)
									: null;
							const date = new Date(
								call.startedAt ?? call._creationTime,
							);
							const isMissed =
								call.status === "ended" &&
								call.participants.filter((p: any) => p.joinedAt)
									.length <= 1;

							return (
								<div
									key={call._id}
									className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/30"
								>
									<div
										className={cn(
											"h-8 w-8 rounded-full flex items-center justify-center shrink-0",
											isMissed
												? "bg-destructive/10"
												: isOutgoing
													? "bg-success/10"
													: "bg-primary/10",
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
									<div className="flex-1 min-w-0">
										<p className="text-xs font-medium truncate">
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
											{duration !== null &&
												duration > 0 &&
												` · ${duration}min`}
										</p>
									</div>
									{isMissed && (
										<Badge className="text-[9px] h-4 badge-destructive">
											Manqué
										</Badge>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* Dialog LiveKit */}
			<Dialog
				open={!!isInCall}
				onOpenChange={(open) => {
					if (!open) handleHangUp();
				}}
			>
				<DialogContent
					onInteractOutside={(e) => e.preventDefault()}
					onEscapeKeyDown={(e) => e.preventDefault()}
					className="max-w-4xl w-full h-[85vh] p-0 flex flex-col overflow-hidden bg-card border flat-card-border"
				>
					{token && wsUrl ? (
						<LiveKitRoom
							token={token}
							serverUrl={wsUrl}
							connect={true}
							audio={true}
							video={false}
							onDisconnected={handleHangUp}
							className="flex flex-col flex-1 min-h-0"
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
								title={
									selectedOrg?.name ??
									"Représentation consulaire"
								}
							/>
						</LiveKitRoom>
					) : (
						<div className="flex-1 flex items-center justify-center bg-card">
							<div className="text-center space-y-3">
								<Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
								<p className="text-sm text-muted-foreground">
									Connexion en cours...
								</p>
								{meetingError && (
									<p className="text-xs text-destructive max-w-xs">
										{meetingError}
									</p>
								)}
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ─────────────────────────────────────────────
// iContact — Annuaire des représentations
// ─────────────────────────────────────────────

function IContactContent() {
	const [search, setSearch] = useState("");

	const { data: allOrgs, isPending } = useAuthenticatedConvexQuery(
		api.functions.orgs.list,
		{},
	);

	const filteredOrgs = useMemo(() => {
		if (!allOrgs) return [];
		const q = search.trim().toLowerCase();
		const orgs = allOrgs as any[];
		if (!q) return orgs;
		return orgs.filter(
			(org) =>
				org.name.toLowerCase().includes(q) ||
				(org.country ?? "").toLowerCase().includes(q) ||
				(org.city ?? "").toLowerCase().includes(q),
		);
	}, [allOrgs, search]);

	return (
		<div className="h-full flex flex-col gap-3 overflow-hidden">
			<div className="relative shrink-0">
				<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
				<Input
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Rechercher une représentation..."
					className="pl-8 text-sm"
				/>
			</div>

			<div className="shrink-0 rounded-xl bg-muted px-3 py-2.5">
				<p className="text-[11px] text-muted-foreground leading-relaxed flex items-center gap-1.5">
					<Shield className="h-3 w-3 shrink-0" />
					Contacts officiels des représentations diplomatiques — urgence
					et standard uniquement.
				</p>
			</div>

			<ScrollArea className="flex-1">
				{isPending ? (
					<div className="flex items-center justify-center py-10">
						<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
					</div>
				) : filteredOrgs.length === 0 ? (
					<div className="flex flex-col items-center py-10 text-center">
						<Building2 className="h-8 w-8 text-muted-foreground/30 mb-2" />
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
	);
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
};

function OrgContactCard({ org }: { org: any }) {
	const [expanded, setExpanded] = useState(false);

	const contactInfo = org.contactInfo ?? org.contacts ?? {};
	const emergency =
		contactInfo.emergency ?? org.emergencyPhone ?? org.emergencyContact;
	const phone = contactInfo.phone ?? org.phone ?? org.mainPhone;
	const email = contactInfo.email ?? org.email ?? org.mainEmail;
	const website = contactInfo.website ?? org.website;
	const address = contactInfo.address ?? org.address;

	const hasContacts = emergency || phone || email || website || address;
	const typeLabel =
		ORG_TYPE_LABELS[org.type] ?? org.type ?? "Représentation";

	return (
		<div className="rounded-xl bg-card border flat-card-border overflow-hidden">
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-muted transition-colors"
			>
				<div className="h-10 w-10 rounded-lg bg-foreground/[0.08] dark:bg-foreground/[0.05] flex items-center justify-center shrink-0">
					{org.flagUrl || org.logo ? (
						<img
							src={org.flagUrl ?? org.logo}
							alt={org.name}
							className="h-7 w-7 object-contain rounded"
						/>
					) : (
						<Building2 className="h-5 w-5 text-primary" />
					)}
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-sm font-semibold truncate">{org.name}</p>
					<div className="flex items-center gap-1.5 mt-0.5">
						<Badge
							variant="outline"
							className="text-[9px] h-4 px-1.5 text-muted-foreground"
						>
							{typeLabel}
						</Badge>
						{org.country && (
							<span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
								<Globe className="h-2.5 w-2.5" />
								{org.country}
							</span>
						)}
					</div>
				</div>
				<div className="flex flex-col items-end gap-1 shrink-0">
					{emergency && (
						<Badge className="text-[9px] h-4 badge-destructive">
							Urgence
						</Badge>
					)}
					<Badge
						variant="outline"
						className="text-[9px] h-4 text-muted-foreground"
					>
						{hasContacts
							? expanded
								? "Fermer ↑"
								: "Voir ↓"
							: "N/A"}
					</Badge>
				</div>
			</button>

			{expanded && hasContacts && (
				<div className="px-3.5 pb-3.5 border-t border-foreground/5 pt-3 space-y-2">
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
	);
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
};

function ContactLine({
	icon: Icon,
	label,
	value,
	href,
	accent = "blue",
}: {
	icon: typeof Phone;
	label: string;
	value: string;
	href?: string;
	accent?: string;
}) {
	const colors = ACCENT_CLASSES[accent] ?? ACCENT_CLASSES.blue;

	return (
		<div className="flex items-center gap-2.5">
			<div
				className={cn(
					"p-1.5 rounded-md flex items-center justify-center shrink-0",
					colors.bg,
				)}
			>
				<Icon className={cn("h-3 w-3", colors.text)} />
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-[10px] text-muted-foreground">{label}</p>
				{href ? (
					<a
						href={href}
						target={href.startsWith("http") ? "_blank" : undefined}
						rel="noopener noreferrer"
						className={cn(
							"text-xs font-medium hover:underline truncate block",
							colors.text,
						)}
					>
						{value}
					</a>
				) : (
					<p className="text-xs font-medium truncate">{value}</p>
				)}
			</div>
		</div>
	);
}
