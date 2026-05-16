/**
 * BackofficeChatTab — Onglet iChat unifié (backoffice).
 *
 * iAsted en contact épinglé (chat IA) + P2P messaging.
 * Adapté pour backoffice : orgId en prop, pas de voice mode.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import {
	Bot,
	Building2,
	Download,
	Edit3,
	FileText,
	ImageIcon,
	Loader2,
	MessageSquare,
	MoreVertical,
	Paperclip,
	Pin,
	Search,
	Send,
	Trash2,
	User,
	Users,
	X,
} from "lucide-react";
import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InlineMessageEditor } from "@workspace/chat/inline-message-editor";
import { SafeMarkdown as Markdown } from "@workspace/chat/safe-markdown";
import {
	formatFileSize,
	useChatAttachments,
} from "@workspace/chat/use-chat-attachments";
import { useIdempotencyKey } from "@workspace/chat/use-idempotency-key";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useContactSearch } from "@/hooks/useContactSearch";
import type { useBackofficeAIChat } from "@/hooks/useBackofficeAIChat";
import { useAuthenticatedConvexQuery, useConvexMutationQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";
import { parseIntent, resolveNavigationTarget } from "../IntentProcessor";
import { getSuggestions } from "../SpatialAwareness";
import { BO_SEGMENTS } from "./segments";

const IASTED_CONTACT = { id: "__iasted__", name: "iAsted", subtitle: "Agent IA Diplomate", isAI: true };

interface BackofficeChatTabProps {
	orgId: Id<"orgs"> | null;
	chat: ReturnType<typeof useBackofficeAIChat>;
}

export function BackofficeChatTab({ orgId, chat }: BackofficeChatTabProps) {
	const pathname = usePathname();
	const router = useRouter();
	const [selectedContact, setSelectedContact] = useState<any>(null);
	const [messageInput, setMessageInput] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const suggestions = getSuggestions(pathname);

	const { groups, total, isPending: contactsLoading, filters, setSearch, setSource } = useContactSearch(orgId);
	const allContacts = groups.flatMap((g: any) => g.contacts);

	// Écoute l'event bus `iasted:select-contact` émis par iContact pour ouvrir
	// directement la conversation avec un contact.
	useEffect(() => {
		const handler = (e: Event) => {
			const detail = (e as CustomEvent<{ userId?: string; contact?: any }>).detail;
			if (!detail?.contact) return;
			setSelectedContact({ ...detail.contact, isAI: false });
		};
		window.addEventListener("iasted:select-contact", handler);
		return () => window.removeEventListener("iasted:select-contact", handler);
	}, []);

	// Chargement exhaustif : plus de pagination. Ref conservée sur le viewport
	// pour d'éventuels auto-scrolls conservés dans ce fichier.
	const viewportRef = useRef<HTMLDivElement | null>(null);

	const { mutateAsync: initiateChat } = useConvexMutationQuery(api.functions.chats.initiateChat);
	const { mutateAsync: sendChatMessage } = useConvexMutationQuery(api.functions.chats.sendMessage);
	const { mutateAsync: setTypingMut } = useConvexMutationQuery(api.functions.chats.setTyping);
	const { mutateAsync: clearTypingMut } = useConvexMutationQuery(api.functions.chats.clearTyping);
	const { mutateAsync: generateAttachmentUploadUrl } = useConvexMutationQuery(api.functions.chats.generateAttachmentUploadUrl);
	const { getKey: getIdempotencyKey, rotate: rotateIdempotencyKey } = useIdempotencyKey();

	// ── Attachments (chat humain uniquement) ──
	const {
		attachments: pendingAttachments,
		addFiles,
		remove: removeAttachment,
		consumeForUpload,
	} = useChatAttachments({ onValidationError: (m) => toast.error(m) });
	const [isUploading, setIsUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const uploadPendingAttachments = useCallback(async () => {
		const files = consumeForUpload();
		if (files.length === 0) return undefined;
		return await Promise.all(
			files.map(async (file) => {
				const uploadUrl = await generateAttachmentUploadUrl({});
				const res = await fetch(uploadUrl as string, {
					method: "POST",
					headers: { "Content-Type": file.type },
					body: file,
				});
				if (!res.ok) throw new Error(`Upload échoué pour ${file.name}`);
				const { storageId } = (await res.json()) as { storageId: string };
				return {
					storageId: storageId as Id<"_storage">,
					filename: file.name,
					mimeType: file.type || "application/octet-stream",
					sizeBytes: file.size,
				};
			}),
		);
	}, [consumeForUpload, generateAttachmentUploadUrl]);

	const selectedUserId = selectedContact && !selectedContact.isAI ? selectedContact.userId : undefined;
	const { data: existingChat } = useAuthenticatedConvexQuery(
		api.functions.chats.findChatWith,
		selectedUserId ? { targetUserId: selectedUserId as Id<"users"> } : "skip",
	);

	// ── Typing indicator (chat humain uniquement) ──
	// Skip pour iAsted : pas d'interlocuteur humain de l'autre côté.
	const typingChatId = useMemo(
		() =>
			selectedContact && !selectedContact.isAI
				? ((selectedContact._chatId ?? existingChat?._id) as Id<"chats"> | undefined)
				: undefined,
		[selectedContact, existingChat],
	);

	const { data: typingUsers } = useAuthenticatedConvexQuery(
		api.functions.chats.listTyping,
		typingChatId ? { chatId: typingChatId } : "skip",
	);

	// Throttle : ping au plus toutes les 2s pendant la frappe. TTL backend (6s)
	// prend le relais quand l'utilisateur s'arrête.
	const typingThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const pingTyping = useCallback(() => {
		if (!typingChatId) return;
		if (typingThrottleRef.current) return;
		void setTypingMut({ chatId: typingChatId });
		typingThrottleRef.current = setTimeout(() => {
			typingThrottleRef.current = null;
		}, 2_000);
	}, [typingChatId, setTypingMut]);

	const stopTyping = useCallback(() => {
		if (typingThrottleRef.current) {
			clearTimeout(typingThrottleRef.current);
			typingThrottleRef.current = null;
		}
		if (typingChatId) {
			void clearTypingMut({ chatId: typingChatId });
		}
	}, [typingChatId, clearTypingMut]);

	useEffect(() => {
		return () => {
			if (typingThrottleRef.current) {
				clearTimeout(typingThrottleRef.current);
				typingThrottleRef.current = null;
			}
		};
	}, [typingChatId]);

	const typingText = useMemo(() => {
		if (!typingUsers || typingUsers.length === 0) return "";
		if (typingUsers.length === 1) {
			return `${typingUsers[0].displayName} est en train d'écrire…`;
		}
		return `${typingUsers.length} personnes sont en train d'écrire…`;
	}, [typingUsers]);

	const handleSendHuman = useCallback(async (text: string) => {
		const trimmed = text.trim();
		const hasAttachments = pendingAttachments.length > 0;
		if ((!trimmed && !hasAttachments) || !selectedContact?.userId) return;
		if (isUploading) return;
		setIsUploading(true);
		try {
			const attachmentFiles = hasAttachments
				? await uploadPendingAttachments()
				: undefined;
			if (existingChat) {
				await sendChatMessage({
					chatId: existingChat._id,
					content: trimmed,
					attachmentFiles,
					idempotencyKey: getIdempotencyKey(),
				});
			} else {
				await initiateChat({
					targetUserId: selectedContact.userId as Id<"users">,
					orgId: orgId ?? undefined,
					initialMessage: trimmed,
					initialAttachmentFiles: attachmentFiles,
				});
			}
			setMessageInput("");
			rotateIdempotencyKey();
			stopTyping();
		} catch (e: any) { toast.error(e?.message ?? "Erreur d'envoi"); }
		finally { setIsUploading(false); }
	}, [selectedContact, existingChat, sendChatMessage, initiateChat, orgId, getIdempotencyKey, rotateIdempotencyKey, stopTyping, pendingAttachments.length, isUploading, uploadPendingAttachments]);

	useEffect(() => {
		if (selectedContact?.isAI) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [chat.messages, selectedContact]);

	const handleSearchContact = (searchTerm: string) => {
		setSearch(searchTerm);
		const matching = allContacts.filter((c: any) =>
			c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.position?.toLowerCase().includes(searchTerm.toLowerCase()));
		if (matching.length > 0) {
			const list = matching.slice(0, 5).map((c: any) => `- **${c.lastName} ${c.firstName}** — ${c.position ?? "N/A"} _(${c.orgName})_`).join("\n");
			return `**${matching.length}** contact(s) pour "${searchTerm}" :\n\n${list}`;
		}
		return `Aucun contact pour "${searchTerm}".`;
	};

	const handleSendAI = async () => {
		const text = messageInput.trim();
		if (!text || chat.isLoading) return;

		const intent = parseIntent(text);
		if (intent && intent.confidence >= 0.7) {
			if (intent.category === "navigation") {
				const route = resolveNavigationTarget(intent.target);
				if (route) {
					setMessageInput("");
					chat.messages.push({ role: "user", content: text, timestamp: Date.now() }, { role: "assistant", content: `Navigation vers **${intent.target}**.`, timestamp: Date.now() });
					router.push(route);
					return;
				}
			}
			if (intent.category === "contact_search" && intent.target) {
				setMessageInput("");
				chat.messages.push({ role: "user", content: text, timestamp: Date.now() });
				chat.messages.push({ role: "assistant", content: handleSearchContact(intent.target), timestamp: Date.now() });
				return;
			}
			if (intent.category === "control") {
				setMessageInput("");
				chat.messages.push({ role: "user", content: text, timestamp: Date.now() }, { role: "assistant", content: "Compris. Comment puis-je vous aider ?", timestamp: Date.now() });
				return;
			}
		}
		setMessageInput("");
		await chat.sendMessage(text);
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			if (selectedContact?.isAI) handleSendAI();
			else if (selectedContact) handleSendHuman(messageInput);
		}
	};

	// ── Conversation view ──
	if (selectedContact) {
		return (
			<div className="flex flex-col flex-1 min-h-0 overflow-hidden">
				<div className="border-b px-3 py-2 flex items-center gap-2 shrink-0">
					<button type="button" onClick={() => setSelectedContact(null)} className="text-xs text-muted-foreground hover:text-foreground">←</button>
					<Avatar className="h-7 w-7">
						{selectedContact.isAI ? (<AvatarFallback className="bg-emerald-500/15 text-emerald-500"><Bot className="h-3.5 w-3.5" /></AvatarFallback>) : (<><AvatarImage src={selectedContact.avatar} /><AvatarFallback className="text-[9px] bg-primary/10 text-primary">{selectedContact.name?.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}</AvatarFallback></>)}
					</Avatar>
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-1.5">
							<p className="text-xs font-medium truncate">{selectedContact.name}</p>
							{selectedContact.isAI && <Badge className="text-[7px] h-3.5 px-1 bg-emerald-500/15 text-emerald-500 border-emerald-500/20">IA</Badge>}
						</div>
						<p className="text-[10px] text-muted-foreground truncate">{selectedContact.isAI ? "Agent IA Diplomate" : selectedContact.position}</p>
					</div>
				</div>

				<ScrollArea className="flex-1 min-h-0 px-3 py-3">
					{selectedContact.isAI ? (
						chat.messages.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-full text-center py-6">
								<div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3"><Bot className="h-6 w-6 text-emerald-500" /></div>
								<h3 className="text-xs font-semibold mb-1">Bonjour, je suis iAsted</h3>
								<p className="text-[10px] text-muted-foreground max-w-[250px] mb-3">Posez-moi une question ou choisissez une suggestion.</p>
								<div className="flex flex-wrap gap-1 justify-center">
									{suggestions.map((s) => (<button key={s} type="button" onClick={() => setMessageInput(s)} className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors">{s}</button>))}
								</div>
							</div>
						) : (
							<div className="space-y-2.5">
								{chat.messages.map((msg, i) => (
									<div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
										{msg.role === "assistant" && <Avatar className="h-6 w-6 shrink-0"><AvatarFallback className="bg-emerald-500/10 text-emerald-600 text-[9px]"><Bot className="h-3 w-3" /></AvatarFallback></Avatar>}
										<div className={cn("max-w-[80%] rounded-xl px-3 py-1.5 text-xs", msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
											{msg.role === "assistant" ? <div className="prose prose-xs dark:prose-invert max-w-none [&>p]:m-0"><Markdown>{msg.content}</Markdown></div> : msg.content}
										</div>
										{msg.role === "user" && <Avatar className="h-6 w-6 shrink-0"><AvatarFallback className="bg-primary/10 text-primary text-[9px]"><User className="h-3 w-3" /></AvatarFallback></Avatar>}
									</div>
								))}
								{chat.isLoading && (<div className="flex items-center gap-2"><Avatar className="h-6 w-6"><AvatarFallback className="bg-emerald-500/10 text-emerald-600 text-[9px]"><Bot className="h-3 w-3" /></AvatarFallback></Avatar><div className="bg-muted rounded-xl px-3 py-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /></div></div>)}
								<div ref={messagesEndRef} />
							</div>
						)
					) : (
						<HumanChatView contact={selectedContact} />
					)}
				</ScrollArea>

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

				{/* Typing indicator — ligne fine au-dessus du composer (chat humain). */}
				{!selectedContact.isAI && typingText && (
					<div className="px-3 py-1 text-[10px] text-muted-foreground italic shrink-0">
						{typingText}
					</div>
				)}

				{/* Pending attachments — chips au-dessus du composer. */}
				{!selectedContact.isAI && pendingAttachments.length > 0 && (
					<div className="border-t px-2 py-1.5 flex flex-wrap gap-1 shrink-0">
						{pendingAttachments.map((att) => (
							<div
								key={att.localId}
								className="flex items-center gap-1 bg-muted rounded-md px-1.5 py-0.5 text-[10px] max-w-[200px]"
							>
								{att.file.type.startsWith("image/") ? (
									<ImageIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
								) : (
									<FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
								)}
								<span className="truncate">{att.file.name}</span>
								<span className="text-muted-foreground/60 shrink-0">
									{formatFileSize(att.file.size)}
								</span>
								<button
									type="button"
									onClick={() => removeAttachment(att.localId)}
									className="ml-0.5 hover:text-destructive shrink-0"
									aria-label="Retirer"
								>
									<X className="h-3 w-3" />
								</button>
							</div>
						))}
					</div>
				)}

				<div className="border-t p-2 flex items-end gap-1.5 shrink-0">
					<input
						ref={fileInputRef}
						type="file"
						multiple
						className="hidden"
						onChange={(e) => {
							if (e.target.files) addFiles(e.target.files);
							e.target.value = "";
						}}
					/>
					{!selectedContact.isAI && (
						<Button
							size="icon"
							variant="ghost"
							className="h-8 w-8 shrink-0"
							onClick={() => fileInputRef.current?.click()}
							disabled={isUploading}
							aria-label="Joindre un fichier"
						>
							<Paperclip className="h-3.5 w-3.5" />
						</Button>
					)}
					<Textarea
						value={messageInput}
						onChange={(e) => {
							const v = e.target.value;
							setMessageInput(v);
							// Typing indicator : ping pendant la frappe, clear si vidé.
							// Skip pour iAsted (pas d'interlocuteur humain).
							if (!selectedContact?.isAI) {
								if (v.trim()) pingTyping();
								else stopTyping();
							}
						}}
						onKeyDown={handleKeyDown}
						placeholder={selectedContact.isAI ? "Demandez à iAsted..." : "Écrire un message..."}
						className="min-h-[32px] max-h-[80px] resize-none text-xs"
						rows={1}
					/>
					<Button
						size="icon"
						className={cn("h-8 w-8 shrink-0", selectedContact.isAI && "bg-emerald-600 hover:bg-emerald-700")}
						disabled={
							(!messageInput.trim() &&
								(selectedContact.isAI || pendingAttachments.length === 0)) ||
							(selectedContact.isAI && chat.isLoading) ||
							(!selectedContact.isAI && isUploading)
						}
						onClick={selectedContact.isAI ? handleSendAI : () => handleSendHuman(messageInput)}
					>
						{(selectedContact.isAI && chat.isLoading) ||
						(!selectedContact.isAI && isUploading) ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : (
							<Send className="h-3.5 w-3.5" />
						)}
					</Button>
				</div>
			</div>
		);
	}

	// ── Contact list view ──
	return (
		<div className="flex flex-col flex-1 min-h-0 overflow-hidden">
			<div className="p-2 border-b space-y-1.5 shrink-0">
				<div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input value={filters.searchTerm} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher (nom, email, poste, org)..." className="h-8 pl-8 text-xs" /></div>
				<div className="flex items-center gap-1 overflow-x-auto">{BO_SEGMENTS.map((seg) => (<button key={seg.id} type="button" onClick={() => setSource(seg.id)} title={seg.hint} className={cn("text-xs px-2.5 py-1 rounded-md font-medium transition-colors shrink-0", filters.source === seg.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>{seg.label}</button>))}</div>
			</div>

			<ScrollArea viewportRef={viewportRef} className="flex-1 min-h-0">
				{(!filters.searchTerm || "iasted ia assistant".includes(filters.searchTerm.toLowerCase())) && (
					<button type="button" onClick={() => setSelectedContact(IASTED_CONTACT)} className="w-full flex items-center gap-3 px-3 py-3 hover:bg-emerald-500/5 transition-colors text-left border-b border-border/30">
						<div className="relative"><Avatar className="h-10 w-10"><AvatarFallback className="bg-emerald-500/15 text-emerald-500"><Bot className="h-5 w-5" /></AvatarFallback></Avatar><Pin className="absolute -top-0.5 -right-0.5 h-3 w-3 text-emerald-500 rotate-45" /></div>
						<div className="flex-1 min-w-0"><div className="flex items-center gap-1.5"><p className="text-sm font-semibold">iAsted</p><Badge className="text-[7px] h-3.5 px-1 bg-emerald-500/15 text-emerald-500 border-emerald-500/20">IA</Badge></div><p className="text-[11px] text-muted-foreground truncate">{chat.messages.length > 0 ? chat.messages[chat.messages.length - 1].content.slice(0, 50) + "..." : "Agent IA Diplomate"}</p></div>
						{chat.messages.length > 0 && <span className="text-[9px] text-muted-foreground shrink-0">{new Date(chat.messages[chat.messages.length - 1].timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>}
					</button>
				)}

				{contactsLoading ? (<div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>) : groups.length === 0 && filters.searchTerm ? (<div className="flex flex-col items-center justify-center py-8 text-center"><User className="h-8 w-8 text-muted-foreground/30 mb-2" /><p className="text-xs text-muted-foreground">Aucun résultat</p></div>) : (
					<div className="divide-y">
						{groups.map((group: any) => (
							<div key={group.org.id} className="py-1">
								<div className="flex items-center gap-2 px-3 py-1"><Building2 className="h-3 w-3 text-muted-foreground shrink-0" /><span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{group.org.name}</span>{group.org.country && <span className="text-[8px] text-muted-foreground/60">{group.org.country}</span>}<Badge variant="outline" className="text-[7px] h-3.5 px-1 ml-auto shrink-0">{group.contacts.length}</Badge></div>
								{group.contacts.map((contact: any) => (
									<button key={contact.id} type="button" onClick={() => setSelectedContact({ ...contact, isAI: false })} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/30 transition-colors text-left">
										<Avatar className="h-9 w-9"><AvatarImage src={contact.avatar} /><AvatarFallback className={cn("text-[10px]", contact.source === "team" ? "bg-primary/10 text-primary" : contact.source === "citizen" ? "bg-amber-500/10 text-amber-600" : "bg-blue-500/10 text-blue-600")}>{contact.name?.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}</AvatarFallback></Avatar>
										<div className="flex-1 min-w-0"><div className="flex items-center gap-1"><p className="text-xs font-bold truncate">{contact.lastName}</p><p className="text-xs text-foreground/80 truncate">{contact.firstName}</p></div>{contact.position && <p className="text-[10px] text-muted-foreground truncate">{contact.position}</p>}</div>
										<MessageSquare className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
									</button>
								))}
							</div>
						))}
					</div>
				)}

				{/* Spinner discret pendant le chargement initial */}
				{contactsLoading && groups.length === 0 && (
					<div className="flex items-center justify-center py-6">
						<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
					</div>
				)}
			</ScrollArea>

			<div className="border-t px-3 py-1 text-[9px] text-muted-foreground flex items-center justify-between shrink-0">
				<span>{total} contact{total > 1 ? "s" : ""}</span>
				<span>{groups.length} org{groups.length > 1 ? "s" : ""}</span>
			</div>
		</div>
	);
}

const MESSAGE_EDIT_WINDOW_MS = 15 * 60 * 1000;

// ── Chat humain temps réel ──
function HumanChatView({ contact }: { contact: any }) {
	const { data: existingChat } = useAuthenticatedConvexQuery(api.functions.chats.findChatWith, contact.userId ? { targetUserId: contact.userId as Id<"users"> } : "skip");
	const resolvedChatId = contact._chatId ?? existingChat?._id;
	const { data: messages, isPending: messagesLoading } = useAuthenticatedConvexQuery(api.functions.chats.listMessages, resolvedChatId ? { chatId: resolvedChatId, limit: 50 } : "skip");
	const { mutateAsync: markRead } = useConvexMutationQuery(api.functions.chats.markRead);
	const { mutateAsync: deleteMessageMut } = useConvexMutationQuery(api.functions.chats.deleteMessage);
	const { mutateAsync: editMessageMut } = useConvexMutationQuery(api.functions.chats.editMessage);

	// ID du message en cours d'édition (null = aucun).
	const [editingMessageId, setEditingMessageId] = useState<Id<"chatMessages"> | null>(null);

	useEffect(() => { if (resolvedChatId) markRead({ chatId: resolvedChatId }).catch(() => {}); }, [resolvedChatId, markRead, messages?.length]);

	const scrollRef = useRef<HTMLDivElement>(null);
	useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

	const handleDeleteMessage = useCallback(async (messageId: Id<"chatMessages">) => {
		if (!window.confirm("Supprimer ce message ?")) return;
		try { await deleteMessageMut({ messageId }); }
		catch (e: any) { toast.error(e?.data ?? e?.message ?? "Suppression impossible."); }
	}, [deleteMessageMut]);

	const handleStartEdit = useCallback((messageId: Id<"chatMessages">) => {
		setEditingMessageId(messageId);
	}, []);

	const handleCancelEdit = useCallback(() => {
		setEditingMessageId(null);
	}, []);

	const handleSaveEdit = useCallback(
		async (messageId: Id<"chatMessages">, nextContent: string) => {
			try {
				await editMessageMut({ messageId, content: nextContent });
				setEditingMessageId(null);
			} catch (e: any) {
				toast.error(e?.data ?? e?.message ?? "Modification impossible.");
				// L'éditeur reste ouvert pour laisser corriger.
			}
		},
		[editMessageMut],
	);

	if (messagesLoading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;
	if (!messages || messages.length === 0) return <div className="flex flex-col items-center justify-center h-full text-center py-6"><MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" /><p className="text-xs text-muted-foreground">Envoyez le premier message</p></div>;

	return (
		<div className="space-y-2.5">
			{messages.map((msg: any) => {
				const isMe = msg.senderId !== contact.userId;
				const isDeleted = !!msg.deletedAt;
				const isEdited = !!msg.editedAt && !isDeleted;
				const canMutate = isMe && !isDeleted && Date.now() - msg.createdAt < MESSAGE_EDIT_WINDOW_MS;
				return (
					<div key={msg._id} className={cn("flex gap-2 group", isMe ? "justify-end" : "justify-start")}>
						{!isMe && <Avatar className="h-6 w-6 shrink-0"><AvatarImage src={contact.avatar} /><AvatarFallback className="text-[9px] bg-primary/10 text-primary">{contact.name?.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}</AvatarFallback></Avatar>}
						{canMutate && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button
										type="button"
										aria-label="Actions"
										className="opacity-0 group-hover:opacity-100 transition-opacity self-center h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
									>
										<MoreVertical className="h-3.5 w-3.5" />
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="min-w-[9rem]">
									<DropdownMenuItem onClick={() => handleStartEdit(msg._id)}>
										<Edit3 className="h-3.5 w-3.5 mr-2" />
										<span className="text-xs">Modifier</span>
									</DropdownMenuItem>
									<DropdownMenuItem onClick={() => handleDeleteMessage(msg._id)} className="text-destructive focus:text-destructive">
										<Trash2 className="h-3.5 w-3.5 mr-2" />
										<span className="text-xs">Supprimer</span>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
						<div className={cn("max-w-[80%] rounded-xl px-3 py-1.5 text-xs", isMe ? "bg-primary text-primary-foreground" : "bg-muted", isDeleted && "italic opacity-60")}>
							{isDeleted ? (
								<span>[Message supprimé]</span>
							) : msg._id === editingMessageId ? (
								<InlineMessageEditor
									initialValue={msg.content}
									onSave={(next) => handleSaveEdit(msg._id, next)}
									onCancel={handleCancelEdit}
									textareaClassName="w-full bg-transparent outline-none resize-none text-xs text-inherit placeholder:opacity-50"
									buttonClassName="px-2 py-0.5 text-[10px] rounded"
									saveButtonClassName="bg-background/20 hover:bg-background/30 font-medium"
									cancelButtonClassName="opacity-70 hover:opacity-100"
									rows={2}
								/>
							) : (
								<>
									{msg.content && <div>{msg.content}</div>}
									{msg.attachmentFiles && msg.attachmentFiles.length > 0 && (
										<div className={cn("space-y-0.5", msg.content ? "mt-1.5" : "")}>
											{msg.attachmentFiles.map((f: any) => (
												<a
													key={f.storageId}
													href={f.url ?? "#"}
													target="_blank"
													rel="noopener noreferrer"
													download={f.filename}
													className={cn(
														"flex items-center gap-1.5 px-1.5 py-1 rounded text-[10px] bg-black/10 dark:bg-white/10 hover:bg-black/15 dark:hover:bg-white/15 transition-colors",
														!f.url && "pointer-events-none opacity-50",
													)}
												>
													{f.mimeType?.startsWith("image/") ? (
														<ImageIcon className="h-3 w-3 shrink-0 opacity-80" />
													) : (
														<FileText className="h-3 w-3 shrink-0 opacity-80" />
													)}
													<span className="truncate flex-1 min-w-0">{f.filename}</span>
													<span className="opacity-60 shrink-0">
														{formatFileSize(f.sizeBytes)}
													</span>
													<Download className="h-3 w-3 shrink-0 opacity-60" />
												</a>
											))}
										</div>
									)}
									{isEdited && <span className="ml-1 opacity-60 text-[9px]">(modifié)</span>}
								</>
							)}
						</div>
						{isMe && <Avatar className="h-6 w-6 shrink-0"><AvatarFallback className="bg-primary/10 text-primary text-[9px]"><User className="h-3 w-3" /></AvatarFallback></Avatar>}
					</div>
				);
			})}
			<div ref={scrollRef} />
		</div>
	);
}
