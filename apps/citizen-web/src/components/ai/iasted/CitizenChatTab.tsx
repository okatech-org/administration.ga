/**
 * CitizenChatTab — Onglet iChat pour citoyens.
 *
 * - iAsted IA épinglé en haut (chat avec l'assistant)
 * - Dessous : threads de chat avec les agents (temps réel Convex)
 * - Le citoyen peut répondre mais PAS initier de nouveaux threads
 * - Pas de bouton "Nouvelle conversation"
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	Bot,
	Loader2,
	MessageSquare,
	Pin,
	Send,
	User,
} from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
	useConvexActionQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

// Contact IA
const IASTED_CONTACT = {
	id: "__iasted__",
	name: "iAsted",
	subtitle: "Assistant Consulaire Intelligent",
	isAI: true,
};

export function CitizenChatTab() {
	const [selectedThread, setSelectedThread] = useState<any>(null);
	const [messageInput, setMessageInput] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Chat IA
	const [aiMessages, setAiMessages] = useState<Array<{ role: string; content: string; timestamp: number }>>([]);
	const [aiLoading, setAiLoading] = useState(false);

	// Threads avec agents (temps réel)
	const { data: chatThreads, isPending: threadsLoading } = useAuthenticatedConvexQuery(
		api.functions.chats.listMyChats,
		{},
	);

	// Chat IA backend
	const { mutateAsync: chatAction } = useConvexActionQuery(
		api.ai.chat.chat,
	);

	// Envoi message dans thread existant
	const { mutateAsync: sendChatMessage } = useConvexMutationQuery(
		api.functions.chats.sendMessage,
	);
	const { mutateAsync: markRead } = useConvexMutationQuery(
		api.functions.chats.markRead,
	);

	// Messages du thread sélectionné (temps réel)
	const selectedChatId = selectedThread && !selectedThread.isAI ? selectedThread._id : undefined;
	const { data: threadMessages, isPending: messagesLoading } = useAuthenticatedConvexQuery(
		api.functions.chats.listMessages,
		selectedChatId ? { chatId: selectedChatId as Id<"chats">, limit: 50 } : "skip",
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
	}, [aiMessages, threadMessages]);

	// ── Envoi message IA ──
	const handleSendAI = async () => {
		const text = messageInput.trim();
		if (!text || aiLoading) return;

		const userMsg = { role: "user", content: text, timestamp: Date.now() };
		setAiMessages((prev) => [...prev, userMsg]);
		setMessageInput("");
		setAiLoading(true);

		try {
			const response = await chatAction({ message: text });
			setAiMessages((prev) => [
				...prev,
				{ role: "assistant", content: response.message, timestamp: Date.now() },
			]);
		} catch {
			setAiMessages((prev) => [
				...prev,
				{ role: "assistant", content: "Désolé, une erreur s'est produite. Réessayez.", timestamp: Date.now() },
			]);
		} finally {
			setAiLoading(false);
		}
	};

	// ── Envoi message humain ──
	const handleSendHuman = async () => {
		const text = messageInput.trim();
		if (!text || !selectedChatId) return;

		try {
			await sendChatMessage({ chatId: selectedChatId as Id<"chats">, content: text });
			setMessageInput("");
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur d'envoi");
		}
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			if (selectedThread?.isAI) handleSendAI();
			else handleSendHuman();
		}
	};

	// ════════════════════════════════════════════════════════
	// VUE CONVERSATION
	// ════════════════════════════════════════════════════════
	if (selectedThread) {
		const isAI = selectedThread.isAI;

		return (
			<div className="flex flex-col flex-1 overflow-hidden">
				{/* Header */}
				<div className="border-b px-3 py-2 flex items-center gap-2 shrink-0">
					<button type="button" onClick={() => setSelectedThread(null)} className="text-xs text-muted-foreground hover:text-foreground">
						←
					</button>
					<Avatar className="h-7 w-7">
						{isAI ? (
							<AvatarFallback className="bg-emerald-500/15 text-emerald-500">
								<Bot className="h-3.5 w-3.5" />
							</AvatarFallback>
						) : (
							<>
								<AvatarImage src={selectedThread.otherUser?.avatarUrl} />
								<AvatarFallback className="text-[9px] bg-primary/10 text-primary">
									{(selectedThread.otherUser?.firstName?.[0] ?? "") + (selectedThread.otherUser?.lastName?.[0] ?? "")}
								</AvatarFallback>
							</>
						)}
					</Avatar>
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-1.5">
							<p className="text-xs font-medium truncate">
								{isAI ? "iAsted" : `${selectedThread.otherUser?.firstName ?? ""} ${selectedThread.otherUser?.lastName ?? ""}`}
							</p>
							{isAI && <Badge className="text-[7px] h-3.5 px-1 bg-emerald-500/15 text-emerald-500">IA</Badge>}
						</div>
						<p className="text-[10px] text-muted-foreground truncate">
							{isAI ? "Assistant Consulaire" : "Agent consulaire"}
						</p>
					</div>
				</div>

				{/* Messages */}
				<ScrollArea className="flex-1 px-3 py-3">
					{isAI ? (
						/* ── Chat IA ── */
						aiMessages.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-full text-center py-6">
								<div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
									<Bot className="h-6 w-6 text-emerald-500" />
								</div>
								<h3 className="text-xs font-semibold mb-1">Bonjour, je suis iAsted</h3>
								<p className="text-[10px] text-muted-foreground max-w-[250px] mb-3">
									Votre assistant consulaire. Posez-moi vos questions sur les démarches, passeports, visas...
								</p>
								<div className="flex flex-wrap gap-1 justify-center">
									{["Mon passeport", "Rendez-vous", "État civil", "Visa"].map((s) => (
										<button key={s} type="button" onClick={() => setMessageInput(s)}
											className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10 transition-colors">
											{s}
										</button>
									))}
								</div>
							</div>
						) : (
							<div className="space-y-2.5">
								{aiMessages.map((msg, i) => (
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
								{aiLoading && (
									<div className="flex items-center gap-2">
										<Avatar className="h-6 w-6"><AvatarFallback className="bg-emerald-500/10 text-emerald-600 text-[9px]"><Bot className="h-3 w-3" /></AvatarFallback></Avatar>
										<div className="bg-muted rounded-xl px-3 py-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /></div>
									</div>
								)}
								<div ref={messagesEndRef} />
							</div>
						)
					) : (
						/* ── Chat agent (temps réel) ── */
						messagesLoading ? (
							<div className="flex items-center justify-center py-8">
								<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
							</div>
						) : !threadMessages || threadMessages.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-full text-center py-6">
								<MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
								<p className="text-xs text-muted-foreground">Aucun message encore</p>
							</div>
						) : (
							<div className="space-y-2.5">
								{(threadMessages as any[]).map((msg: any) => {
									const isMe = msg.senderId !== selectedThread.otherUser?.id;
									return (
										<div key={msg._id} className={cn("flex gap-2", isMe ? "justify-end" : "justify-start")}>
											{!isMe && (
												<Avatar className="h-6 w-6 shrink-0">
													<AvatarFallback className="text-[9px] bg-primary/10 text-primary">
														{(selectedThread.otherUser?.firstName?.[0] ?? "") + (selectedThread.otherUser?.lastName?.[0] ?? "")}
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
								<div ref={messagesEndRef} />
							</div>
						)
					)}
				</ScrollArea>

				{/* Input */}
				<div className="border-t p-2 flex items-end gap-1.5 shrink-0">
					<Textarea
						value={messageInput}
						onChange={(e) => setMessageInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={isAI ? "Posez votre question..." : "Répondre..."}
						className="min-h-[32px] max-h-[80px] resize-none text-xs"
						rows={1}
					/>
					<Button
						size="icon"
						className={cn("h-8 w-8 shrink-0", isAI && "bg-emerald-600 hover:bg-emerald-700")}
						disabled={!messageInput.trim() || (isAI && aiLoading)}
						onClick={isAI ? handleSendAI : handleSendHuman}
					>
						{isAI && aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
					</Button>
				</div>
			</div>
		);
	}

	// ════════════════════════════════════════════════════════
	// VUE LISTE (iAsted épinglé + threads agents)
	// ════════════════════════════════════════════════════════
	return (
		<div className="flex flex-col flex-1 overflow-hidden">
			<ScrollArea className="flex-1">
				{/* iAsted — Contact IA épinglé */}
				<button
					type="button"
					onClick={() => setSelectedThread(IASTED_CONTACT)}
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
							{aiMessages.length > 0
								? aiMessages[aiMessages.length - 1].content.slice(0, 50) + "..."
								: "Assistant Consulaire — Posez une question"}
						</p>
					</div>
				</button>

				{/* Threads avec agents */}
				{threadsLoading ? (
					<div className="flex items-center justify-center py-6">
						<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
					</div>
				) : (chatThreads as any[])?.length > 0 ? (
					<div className="divide-y divide-border/30">
						{(chatThreads as any[]).map((thread: any) => (
							<button
								key={thread._id}
								type="button"
								onClick={() => setSelectedThread(thread)}
								className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors text-left"
							>
								<Avatar className="h-9 w-9">
									<AvatarImage src={thread.otherUser?.avatarUrl} />
									<AvatarFallback className="text-[10px] bg-primary/10 text-primary">
										{(thread.otherUser?.firstName?.[0] ?? "") + (thread.otherUser?.lastName?.[0] ?? "")}
									</AvatarFallback>
								</Avatar>
								<div className="flex-1 min-w-0">
									<div className="flex items-center justify-between">
										<p className="text-xs font-medium truncate">
											{thread.otherUser?.firstName ?? ""} {thread.otherUser?.lastName ?? ""}
										</p>
										{thread.lastMessageAt && (
											<span className="text-[9px] text-muted-foreground shrink-0 ml-2">
												{new Date(thread.lastMessageAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
											</span>
										)}
									</div>
									<p className="text-[10px] text-muted-foreground truncate">
										{thread.lastMessageText ?? "Nouvelle conversation"}
									</p>
								</div>
								{thread.unreadCount > 0 && (
									<Badge className="text-[8px] h-4 min-w-[16px] px-1 bg-emerald-600 text-white">
										{thread.unreadCount}
									</Badge>
								)}
							</button>
						))}
					</div>
				) : (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<MessageSquare className="h-8 w-8 text-muted-foreground/20 mb-2" />
						<p className="text-xs text-muted-foreground">Aucune conversation</p>
						<p className="text-[10px] text-muted-foreground/60 mt-1">
							Les agents vous contacteront ici
						</p>
					</div>
				)}
			</ScrollArea>
		</div>
	);
}
