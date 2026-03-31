/**
 * IAstedInstantChatTab — Onglet iChat unifié.
 *
 * iAsted apparaît comme un contact épinglé en haut de la liste.
 * Clic sur iAsted → chat IA (LLM). Clic sur un autre contact → chat inter-utilisateurs.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
	Bot,
	Building2,
	Globe,
	Loader2,
	MessageSquare,
	Pin,
	Search,
	Send,
	Shield,
	User,
	Users,
} from "lucide-react";
import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useOrg } from "@/components/org/org-provider";
import { useContactSearch, type ContactSource } from "@/hooks/useContactSearch";
import { useAuthenticatedConvexQuery, useConvexMutationQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";
import { useAdminAIChat } from "../useAdminAIChat";
import { VoiceChatContent } from "../VoiceButton";
import { parseIntent, resolveNavigationTarget } from "./IntentProcessor";
import { getSuggestions } from "./SpatialAwareness";

// Contact spécial iAsted
const IASTED_CONTACT = {
	id: "__iasted__",
	name: "iAsted",
	subtitle: "Agent IA Diplomate",
	isAI: true,
};

interface IAstedInstantChatTabProps {
	chat: ReturnType<typeof useAdminAIChat>;
	voice: any;
}

const SOURCE_SEGMENTS: Array<{ id: ContactSource | "all"; label: string; icon: typeof Users }> = [
	{ id: "all", label: "Tous", icon: Users },
	{ id: "team", label: "Équipe", icon: Shield },
	{ id: "network", label: "Réseau", icon: Globe },
	{ id: "citizens", label: "Citoyens", icon: Users },
];

export function IAstedInstantChatTab({ chat, voice }: IAstedInstantChatTabProps) {
	const { activeOrgId } = useOrg();
	const location = useLocation();
	const navigate = useNavigate();
	const [selectedContact, setSelectedContact] = useState<any>(null);
	const [messageInput, setMessageInput] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const suggestions = getSuggestions(location.pathname);

	// Recherche intelligente cross-org
	const {
		groups,
		total,
		isPending: contactsLoading,
		filters,
		setSearch,
		setSource,
	} = useContactSearch();

	// Aplatir les groupes pour obtenir la liste des contacts
	const allContacts = groups.flatMap((g: any) => g.contacts);

	// Chat peer-to-peer — mutations
	const { mutateAsync: initiateChat } = useConvexMutationQuery(
		api.functions.chats.initiateChat,
	);
	const { mutateAsync: sendChatMessage } = useConvexMutationQuery(
		api.functions.chats.sendMessage,
	);

	// Chat actif avec le contact sélectionné
	const selectedUserId = selectedContact && !selectedContact.isAI ? selectedContact.userId : undefined;
	const { data: existingChat } = useAuthenticatedConvexQuery(
		api.functions.chats.findChatWith,
		selectedUserId ? { targetUserId: selectedUserId as Id<"users"> } : "skip",
	);

	// ── Envoi message humain ──
	const handleSendHuman = useCallback(async (text: string) => {
		const trimmed = text.trim();
		if (!trimmed || !selectedContact?.userId) return;

		try {
			if (existingChat) {
				// Thread existant → sendMessage
				await sendChatMessage({ chatId: existingChat._id, content: trimmed });
			} else {
				// Nouveau thread → initiateChat
				await initiateChat({
					targetUserId: selectedContact.userId as Id<"users">,
					orgId: activeOrgId ?? undefined,
					initialMessage: trimmed,
				});
			}
			setMessageInput("");
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur d'envoi");
		}
	}, [selectedContact, existingChat, sendChatMessage, initiateChat, activeOrgId]);

	// Auto-scroll chat IA
	useEffect(() => {
		if (selectedContact?.isAI) {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [chat.messages, selectedContact]);

	// Callback pour basculer vers l'onglet iContact avec un terme de recherche
	const handleSearchContact = (searchTerm: string) => {
		// Afficher les résultats directement dans le chat via une recherche
		setSearch(searchTerm);
		// Construire une réponse IA avec les résultats trouvés
		const matchingContacts = allContacts.filter((c: any) =>
			c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			c.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			c.orgName?.toLowerCase().includes(searchTerm.toLowerCase()),
		);

		if (matchingContacts.length > 0) {
			const contactList = matchingContacts.slice(0, 5).map((c: any) =>
				`• **${c.lastName} ${c.firstName}** — ${c.position ?? "N/A"} _(${c.orgName})_`,
			).join("\n");
			return `J'ai trouvé **${matchingContacts.length}** contact(s) pour "${searchTerm}" :\n\n${contactList}${matchingContacts.length > 5 ? `\n\n_...et ${matchingContacts.length - 5} autres. Consultez l'onglet iContact._` : ""}`;
		}
		return `Aucun contact trouvé pour "${searchTerm}". Essayez avec un autre terme.`;
	};

	// ── Envoi message IA ──
	const handleSendAI = async () => {
		const text = messageInput.trim();
		if (!text || chat.isLoading) return;

		// IntentProcessor
		const intent = parseIntent(text);
		if (intent && intent.confidence >= 0.7) {
			// Navigation
			if (intent.category === "navigation") {
				const route = resolveNavigationTarget(intent.target);
				if (route) {
					setMessageInput("");
					chat.messages.push(
						{ role: "user", content: text, timestamp: Date.now() },
						{ role: "assistant", content: `Je vous emmène sur **${intent.target}**.`, timestamp: Date.now() },
					);
					navigate({ to: route });
					toast.success(`Navigation vers ${intent.target}`);
					return;
				}
			}

			// Recherche de contact
			if (intent.category === "contact_search" && intent.target) {
				setMessageInput("");
				const userMsg = { role: "user" as const, content: text, timestamp: Date.now() };
				chat.messages.push(userMsg);
				const result = handleSearchContact(intent.target);
				chat.messages.push({ role: "assistant" as const, content: result, timestamp: Date.now() });
				return;
			}

			// Appel contact
			if (intent.category === "call_contact" && intent.target) {
				setMessageInput("");
				const userMsg = { role: "user" as const, content: text, timestamp: Date.now() };
				chat.messages.push(userMsg);
				const match = allContacts.find((c: any) =>
					c.name.toLowerCase().includes(intent.target!.toLowerCase()) ||
					c.position?.toLowerCase().includes(intent.target!.toLowerCase()),
				);
				if (match) {
					chat.messages.push({
						role: "assistant" as const,
						content: `📞 Lancement de l'appel vers **${match.lastName} ${match.firstName}** (${match.position ?? "N/A"} — ${match.orgName}).\n\n_Basculez sur l'onglet iAppel pour continuer._`,
						timestamp: Date.now(),
					});
					toast.success(`Appel vers ${match.lastName} ${match.firstName}`);
				} else {
					chat.messages.push({
						role: "assistant" as const,
						content: `Je n'ai pas trouvé de contact correspondant à "${intent.target}". Vérifiez le nom ou consultez l'onglet iContact.`,
						timestamp: Date.now(),
					});
				}
				return;
			}

			// Création de réunion
			if (intent.category === "meeting_create" && intent.target) {
				setMessageInput("");
				const userMsg = { role: "user" as const, content: text, timestamp: Date.now() };
				chat.messages.push(userMsg);
				const searchTerms = intent.target.split(/\s+(?:et|,)\s+/).map((t) => t.trim());
				const matchedContacts = allContacts.filter((c: any) =>
					searchTerms.some((term) =>
						c.name.toLowerCase().includes(term.toLowerCase()) ||
						c.orgName?.toLowerCase().includes(term.toLowerCase()),
					),
				);
				if (matchedContacts.length > 0) {
					const names = matchedContacts.slice(0, 5).map((c: any) => `**${c.lastName} ${c.firstName}**`).join(", ");
					chat.messages.push({
						role: "assistant" as const,
						content: `🗓️ Je prépare une réunion avec ${names}.\n\n_Basculez sur l'onglet iRéunion pour finaliser et démarrer._`,
						timestamp: Date.now(),
					});
					toast.success("Réunion en préparation — onglet iRéunion");
				} else {
					chat.messages.push({
						role: "assistant" as const,
						content: `Je n'ai pas trouvé de contacts pour "${intent.target}". Essayez avec un nom ou une organisation précise.`,
						timestamp: Date.now(),
					});
				}
				return;
			}

			// Contrôle (stop, annule)
			if (intent.category === "control") {
				setMessageInput("");
				chat.messages.push(
					{ role: "user" as const, content: text, timestamp: Date.now() },
					{ role: "assistant" as const, content: "Compris, j'arrête. Comment puis-je vous aider ?", timestamp: Date.now() },
				);
				return;
			}
		}

		setMessageInput("");
		await chat.sendMessage(text);
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			if (selectedContact?.isAI) {
				handleSendAI();
			} else if (selectedContact) {
				handleSendHuman(messageInput);
			}
		}
	};

	// ── Si mode vocal actif ──
	if (selectedContact?.isAI && voice.isOpen) {
		return <VoiceChatContent voice={voice} />;
	}

	// ════════════════════════════════════════════════════════════
	// VUE CONVERSATION (iAsted IA ou humain)
	// ════════════════════════════════════════════════════════════
	if (selectedContact) {
		return (
			<div className="flex flex-col flex-1 overflow-hidden">
				{/* Header contact */}
				<div className="border-b px-3 py-2 flex items-center gap-2 shrink-0">
					<button type="button" onClick={() => setSelectedContact(null)} className="text-xs text-muted-foreground hover:text-foreground">
						←
					</button>
					<Avatar className="h-7 w-7">
						{selectedContact.isAI ? (
							<AvatarFallback className="bg-emerald-500/15 text-emerald-500">
								<Bot className="h-3.5 w-3.5" />
							</AvatarFallback>
						) : (
							<>
								<AvatarImage src={selectedContact.avatar} />
								<AvatarFallback className="text-[9px] bg-primary/10 text-primary">
									{selectedContact.name?.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
								</AvatarFallback>
							</>
						)}
					</Avatar>
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-1.5">
							<p className="text-xs font-medium truncate">{selectedContact.name}</p>
							{selectedContact.isAI && (
								<Badge className="text-[7px] h-3.5 px-1 bg-emerald-500/15 text-emerald-500 border-emerald-500/20">IA</Badge>
							)}
						</div>
						<p className="text-[10px] text-muted-foreground truncate">
							{selectedContact.isAI ? "Agent IA Diplomate" : selectedContact.position}
						</p>
					</div>
				</div>

				{/* Messages */}
				<ScrollArea className="flex-1 px-3 py-3">
					{selectedContact.isAI ? (
						/* ── Chat IA ── */
						chat.messages.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-full text-center py-6">
								<div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
									<Bot className="h-6 w-6 text-emerald-500" />
								</div>
								<h3 className="text-xs font-semibold mb-1">Bonjour, je suis iAsted</h3>
								<p className="text-[10px] text-muted-foreground max-w-[250px] mb-3">
									Posez-moi une question ou choisissez une suggestion.
								</p>
								<div className="flex flex-wrap gap-1 justify-center">
									{suggestions.map((s) => (
										<button key={s} type="button" onClick={() => setMessageInput(s)}
											className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
											{s}
										</button>
									))}
								</div>
							</div>
						) : (
							<div className="space-y-2.5">
								{chat.messages.map((msg, i) => (
									<div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
										{msg.role === "assistant" && (
											<Avatar className="h-6 w-6 shrink-0">
												<AvatarFallback className="bg-emerald-500/10 text-emerald-600 text-[9px]">
													<Bot className="h-3 w-3" />
												</AvatarFallback>
											</Avatar>
										)}
										<div className={cn("max-w-[80%] rounded-xl px-3 py-1.5 text-xs",
											msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
											{msg.role === "assistant" ? (
												<Markdown className="prose prose-xs dark:prose-invert max-w-none [&>p]:m-0">{msg.content}</Markdown>
											) : msg.content}
										</div>
										{msg.role === "user" && (
											<Avatar className="h-6 w-6 shrink-0">
												<AvatarFallback className="bg-primary/10 text-primary text-[9px]">
													<User className="h-3 w-3" />
												</AvatarFallback>
											</Avatar>
										)}
									</div>
								))}
								{chat.isLoading && (
									<div className="flex items-center gap-2">
										<Avatar className="h-6 w-6"><AvatarFallback className="bg-emerald-500/10 text-emerald-600 text-[9px]"><Bot className="h-3 w-3" /></AvatarFallback></Avatar>
										<div className="bg-muted rounded-xl px-3 py-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /></div>
									</div>
								)}
								<div ref={messagesEndRef} />
							</div>
						)
					) : (
						/* ── Chat humain temps réel ── */
						<HumanChatView contact={selectedContact} />
					)}
				</ScrollArea>

				{/* Actions IA en attente */}
				{selectedContact.isAI && chat.pendingActions.length > 0 && (
					<div className="border-t bg-amber-50 dark:bg-amber-950/20 p-2 space-y-1">
						{chat.pendingActions.map((action, i) => (
							<div key={i} className="flex items-center justify-between bg-background rounded-md p-1.5 border border-amber-200 text-[10px]">
								<span className="font-medium truncate">{action.reason ?? action.type}</span>
								<div className="flex gap-1">
									<Button size="sm" variant="outline" onClick={() => chat.rejectAction(action)} className="h-5 text-[9px] px-1.5">Non</Button>
									<Button size="sm" onClick={() => chat.confirmAction(action)} className="h-5 text-[9px] px-1.5">Oui</Button>
								</div>
							</div>
						))}
					</div>
				)}

				{/* Input */}
				<div className="border-t p-2 flex items-end gap-1.5 shrink-0">
					<Textarea
						value={messageInput}
						onChange={(e) => setMessageInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={selectedContact.isAI ? "Demandez à iAsted..." : "Écrire un message..."}
						className="min-h-[32px] max-h-[80px] resize-none text-xs"
						rows={1}
					/>
					<Button size="icon" className={cn("h-8 w-8 shrink-0", selectedContact.isAI && "bg-emerald-600 hover:bg-emerald-700")}
						disabled={!messageInput.trim() || (selectedContact.isAI && chat.isLoading)}
						onClick={selectedContact.isAI ? handleSendAI : () => handleSendHuman(messageInput)}>
						{selectedContact.isAI && chat.isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
					</Button>
				</div>
			</div>
		);
	}

	// ════════════════════════════════════════════════════════════
	// VUE LISTE DES CONTACTS (avec iAsted épinglé en premier)
	// ════════════════════════════════════════════════════════════
	return (
		<div className="flex flex-col flex-1 overflow-hidden">
			{/* Recherche + segments */}
			<div className="p-2 border-b space-y-1.5">
				<div className="relative">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
					<Input
						value={filters.searchTerm}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Rechercher (nom, email, poste, org)..."
						className="h-8 pl-8 text-xs"
					/>
				</div>
				{/* Segments source */}
				<div className="flex items-center gap-1">
					{SOURCE_SEGMENTS.map((seg) => (
						<button
							key={seg.id}
							type="button"
							onClick={() => setSource(seg.id)}
							className={cn(
								"text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors",
								filters.source === seg.id
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground hover:bg-muted",
							)}
						>
							{seg.label}
						</button>
					))}
				</div>
			</div>

			<ScrollArea className="flex-1">
				{/* iAsted — Contact IA épinglé */}
				{(!filters.searchTerm || "iasted ia assistant".includes(filters.searchTerm.toLowerCase())) && (
					<button
						type="button"
						onClick={() => setSelectedContact(IASTED_CONTACT)}
						className="w-full flex items-center gap-3 px-3 py-3 hover:bg-emerald-500/5 transition-colors text-left border-b border-border/30"
					>
						<div className="relative">
							<Avatar className="h-10 w-10">
								<AvatarFallback className="bg-emerald-500/15 text-emerald-500">
									<Bot className="h-5 w-5" />
								</AvatarFallback>
							</Avatar>
							<Pin className="absolute -top-0.5 -right-0.5 h-3 w-3 text-emerald-500 rotate-45" />
						</div>
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-1.5">
								<p className="text-sm font-semibold">iAsted</p>
								<Badge className="text-[7px] h-3.5 px-1 bg-emerald-500/15 text-emerald-500 border-emerald-500/20">IA</Badge>
							</div>
							<p className="text-[11px] text-muted-foreground truncate">
								{chat.messages.length > 0
									? chat.messages[chat.messages.length - 1].content.slice(0, 50) + "..."
									: "Agent IA Diplomate — Posez une question"}
							</p>
						</div>
						{chat.messages.length > 0 && (
							<span className="text-[9px] text-muted-foreground shrink-0">
								{new Date(chat.messages[chat.messages.length - 1].timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
							</span>
						)}
					</button>
				)}

				{/* Contacts groupés par org (cross-org) */}
				{contactsLoading ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
					</div>
				) : groups.length === 0 && filters.searchTerm ? (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<User className="h-8 w-8 text-muted-foreground/30 mb-2" />
						<p className="text-xs text-muted-foreground">Aucun résultat</p>
					</div>
				) : (
					<div className="divide-y">
						{groups.map((group: any) => (
							<div key={group.org.id} className="py-1">
								{/* En-tête org */}
								<div className="flex items-center gap-2 px-3 py-1">
									<Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
									<span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
										{group.org.name}
									</span>
									{group.org.country && (
										<span className="text-[8px] text-muted-foreground/60">{group.org.country}</span>
									)}
									<Badge variant="outline" className="text-[7px] h-3.5 px-1 ml-auto shrink-0">
										{group.contacts.length}
									</Badge>
								</div>
								{/* Contacts du groupe */}
								{group.contacts.map((contact: any) => (
									<button
										key={contact.id}
										type="button"
										onClick={() => setSelectedContact({ ...contact, isAI: false })}
										className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/30 transition-colors text-left"
									>
										<Avatar className="h-9 w-9">
											<AvatarImage src={contact.avatar} />
											<AvatarFallback className={cn("text-[10px]",
												contact.source === "team" ? "bg-primary/10 text-primary"
													: contact.source === "citizen" ? "bg-amber-500/10 text-amber-600"
													: "bg-blue-500/10 text-blue-600",
											)}>
												{contact.name?.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
											</AvatarFallback>
										</Avatar>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-1">
												<p className="text-xs font-bold truncate">{contact.lastName}</p>
												<p className="text-xs text-foreground/80 truncate">{contact.firstName}</p>
											</div>
											{contact.position && (
												<p className="text-[10px] text-muted-foreground truncate">{contact.position}</p>
											)}
										</div>
										<MessageSquare className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
									</button>
								))}
							</div>
						))}
					</div>
				)}
			</ScrollArea>

			{/* Footer stats */}
			<div className="border-t px-3 py-1 text-[9px] text-muted-foreground flex items-center justify-between shrink-0">
				<span>{total} contact{total > 1 ? "s" : ""}</span>
				<span>{groups.length} org{groups.length > 1 ? "s" : ""}</span>
			</div>
		</div>
	);
}

// ════════════════════════════════════════════════════════════
// Composant chat humain temps réel (Convex subscription)
// ════════════════════════════════════════════════════════════
function HumanChatView({ contact }: { contact: any }) {
	const chatId = contact._chatId as Id<"chats"> | undefined;

	// Chercher le thread existant
	const { data: existingChat } = useAuthenticatedConvexQuery(
		api.functions.chats.findChatWith,
		contact.userId ? { targetUserId: contact.userId as Id<"users"> } : "skip",
	);

	const resolvedChatId = chatId ?? existingChat?._id;

	// Messages temps réel (subscription Convex)
	const { data: messages, isPending: messagesLoading } = useAuthenticatedConvexQuery(
		api.functions.chats.listMessages,
		resolvedChatId ? { chatId: resolvedChatId, limit: 50 } : "skip",
	);

	// Marquer les messages comme lus
	const { mutateAsync: markRead } = useConvexMutationQuery(
		api.functions.chats.markRead,
	);

	// Auto-mark read quand on ouvre la conversation
	useEffect(() => {
		if (resolvedChatId) {
			markRead({ chatId: resolvedChatId }).catch(() => {});
		}
	}, [resolvedChatId, markRead, messages?.length]);

	// Scroll en bas
	const scrollRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		scrollRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	if (messagesLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!messages || messages.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-full text-center py-6">
				<MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
				<p className="text-xs text-muted-foreground">Envoyez le premier message</p>
			</div>
		);
	}

	return (
		<div className="space-y-2.5">
			{messages.map((msg: any) => {
				const isMe = msg.senderId !== contact.userId;
				return (
					<div key={msg._id} className={cn("flex gap-2", isMe ? "justify-end" : "justify-start")}>
						{!isMe && (
							<Avatar className="h-6 w-6 shrink-0">
								<AvatarImage src={contact.avatar} />
								<AvatarFallback className="text-[9px] bg-primary/10 text-primary">
									{contact.name?.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
								</AvatarFallback>
							</Avatar>
						)}
						<div className={cn("max-w-[80%] rounded-xl px-3 py-1.5 text-xs",
							isMe ? "bg-primary text-primary-foreground" : "bg-muted")}>
							{msg.content}
						</div>
						{isMe && (
							<Avatar className="h-6 w-6 shrink-0">
								<AvatarFallback className="bg-primary/10 text-primary text-[9px]">
									<User className="h-3 w-3" />
								</AvatarFallback>
							</Avatar>
						)}
					</div>
				);
			})}
			<div ref={scrollRef} />
		</div>
	);
}
