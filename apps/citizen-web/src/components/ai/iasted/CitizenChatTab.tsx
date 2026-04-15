/**
 * CitizenChatTab — Onglet iChat pour citoyens.
 *
 * - Mr Ray (Standard IA) epingle en haut : premier repondeur, thread P2P partage avec agents
 * - Dessous : threads de chat avec les agents (temps reel Convex)
 * - Le citoyen peut ecrire a Mr Ray (Standard) et repondre aux threads agents
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	AlertTriangle,
	Bot,
	Calendar,
	CreditCard,
	FileText,
	Headset,
	Loader2,
	MessageSquare,
	Pin,
	Send,
	User,
} from "lucide-react";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
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
} from "@/integrations/convex/hooks";
import { SmartSuggestionsRow } from "@workspace/iasted";
import { cn } from "@/lib/utils";

// Email de Mr Ray pour identifier ses messages
const MR_RAY_EMAIL = "assistant-admin2@consulatdugabon.fr";

// Contact Mr Ray — Standard consulaire
const MR_RAY_CONTACT = {
	id: "__mr_ray__",
	name: "Mr Ray",
	subtitle: "Standard — Assistance Consulaire",
	isAI: true,
	isStandard: true,
};

export function CitizenChatTab() {
	const [selectedThread, setSelectedThread] = useState<any>(null);
	const [messageInput, setMessageInput] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Threads avec agents (temps reel)
	const { data: chatThreads, isPending: threadsLoading } = useAuthenticatedConvexQuery(
		api.functions.chats.listMyChats,
		{},
	);

	// Mutations
	const { mutateAsync: initiateStandard } = useConvexMutationQuery(
		api.functions.chats.initiateStandardChat,
	);
	const { mutateAsync: sendChatMessage } = useConvexMutationQuery(
		api.functions.chats.sendMessage,
	);
	const { mutateAsync: markRead } = useConvexMutationQuery(
		api.functions.chats.markRead,
	);

	// Profil utilisateur pour les suggestions contextuelles
	const { data: profile } = useAuthenticatedConvexQuery(api.functions.profiles.getMine, {});
	const { data: appointments } = useAuthenticatedConvexQuery(api.functions.appointments.listByUser, {});

	// Inscriptions consulaires pour trouver l'orgId du citoyen
	const { data: registrations } = useAuthenticatedConvexQuery(
		api.functions.consularRegistrations.listByProfile,
		{},
	);
	const orgId = (registrations as any[])?.[0]?.orgId as Id<"orgs"> | undefined;

	// Suggestions contextuelles basees sur le profil
	const contextSuggestions = useMemo(() => {
		const suggestions: { label: string; message: string; icon: typeof FileText; color: string; priority: number }[] = [];
		const p = profile as any;
		if (!p) return suggestions;

		// Passeport expire ou bientot
		if (p.passportInfo?.expiryDate) {
			const daysLeft = Math.ceil((new Date(p.passportInfo.expiryDate).getTime() - Date.now()) / 86400000);
			if (daysLeft < 0) {
				suggestions.push({ label: "Renouveler mon passeport", message: "Mon passeport est expire, comment le renouveler ?", icon: AlertTriangle, color: "text-rose-500 bg-rose-500/10 border-rose-500/20", priority: 1 });
			} else if (daysLeft < 90) {
				suggestions.push({ label: "Passeport bientot expire", message: `Mon passeport expire dans ${daysLeft} jours, que dois-je faire ?`, icon: FileText, color: "text-amber-600 bg-amber-500/10 border-amber-500/20", priority: 2 });
			}
		}

		// Pas de carte consulaire
		if (!p.consularCard?.cardNumber) {
			suggestions.push({ label: "Demander ma carte", message: "Comment obtenir ma carte consulaire ?", icon: CreditCard, color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20", priority: 3 });
		}

		// Prochain RDV
		if (appointments && (appointments as any[]).length > 0) {
			const next = (appointments as any[])[0];
			if (next?.date) {
				const rdvDate = new Date(next.date);
				if (rdvDate > new Date()) {
					suggestions.push({ label: "Mon prochain RDV", message: `Quelles sont les informations de mon rendez-vous du ${rdvDate.toLocaleDateString("fr-FR")} ?`, icon: Calendar, color: "text-blue-600 bg-blue-500/10 border-blue-500/20", priority: 4 });
				}
			}
		}

		// Suggestions generiques toujours presentes
		suggestions.push(
			{ label: "Carte consulaire", message: "Quels sont les documents necessaires pour la carte consulaire ?", icon: CreditCard, color: "text-teal-600 bg-teal-500/10 border-teal-500/20", priority: 10 },
			{ label: "Horaires d'ouverture", message: "Quels sont les horaires d'ouverture du consulat ?", icon: Calendar, color: "text-teal-600 bg-teal-500/10 border-teal-500/20", priority: 11 },
		);

		return suggestions.sort((a, b) => a.priority - b.priority).slice(0, 4);
	}, [profile, appointments]);

	// Trouver le thread standard existant dans les threads
	const mrRayThread = useMemo(() => {
		if (!chatThreads) return null;
		return (chatThreads as any[]).find((t: any) => t.type === "standard") ?? null;
	}, [chatThreads]);

	// Quand le thread Mr Ray est selectionne, utiliser le vrai chatId
	const selectedChatId = useMemo(() => {
		if (!selectedThread) return undefined;
		if (selectedThread.isStandard && mrRayThread) return mrRayThread._id;
		if (selectedThread.isStandard) return undefined; // pas encore de thread
		return selectedThread._id;
	}, [selectedThread, mrRayThread]);

	// Messages du thread selectionne (temps reel)
	const { data: threadMessages, isPending: messagesLoading } = useAuthenticatedConvexQuery(
		api.functions.chats.listMessages,
		selectedChatId ? { chatId: selectedChatId as Id<"chats">, limit: 50 } : "skip",
	);

	// Marquer comme lu
	useEffect(() => {
		if (selectedChatId) {
			markRead({ chatId: selectedChatId as Id<"chats"> }).catch((e) => {
				console.warn("Failed to mark messages as read:", e);
			});
		}
	}, [selectedChatId, markRead, threadMessages?.length]);

	// Auto-scroll — delayed to let ScrollArea render
	useEffect(() => {
		const timer = setTimeout(() => {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}, 50);
		return () => clearTimeout(timer);
	}, [threadMessages]);

	// ── Envoi message Mr Ray (Standard) ──
	const handleSendStandard = async () => {
		const text = messageInput.trim();
		if (!text) return;

		try {
			if (mrRayThread) {
				// Thread existant — envoyer dans le thread P2P
				await sendChatMessage({ chatId: mrRayThread._id as Id<"chats">, content: text });
			} else if (orgId) {
				// Pas de thread — en creer un via initiateStandardChat
				await initiateStandard({ orgId, initialMessage: text });
			} else {
				toast.error("Vous devez etre inscrit a une representation consulaire pour utiliser le Standard.");
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
			await sendChatMessage({ chatId: selectedChatId as Id<"chats">, content: text });
			setMessageInput("");
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur d'envoi");
		}
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			if (selectedThread?.isStandard) handleSendStandard();
			else handleSendHuman();
		}
	};

	// Filtrer les threads : separer Mr Ray des threads P2P
	const p2pThreads = useMemo(() => {
		if (!chatThreads) return [];
		return (chatThreads as any[]).filter((t: any) => t.type !== "standard");
	}, [chatThreads]);

	// Compteur non-lus Mr Ray
	const mrRayUnread = mrRayThread?.unreadCount ?? 0;

	// ════════════════════════════════════════════════════════
	// VUE CONVERSATION
	// ════════════════════════════════════════════════════════
	if (selectedThread) {
		const isStandard = selectedThread.isStandard;
		const hasMessages = threadMessages && (threadMessages as any[]).length > 0;
		// Only show loading spinner when the query is actively running (not when skipped)
		const isActuallyLoading = messagesLoading && !!selectedChatId;

		return (
			<div className="flex flex-col flex-1 overflow-hidden">
				{/* Header */}
				<div className="border-b px-3 py-2 flex items-center gap-2 shrink-0">
					<button type="button" onClick={() => setSelectedThread(null)} className="text-xs text-muted-foreground hover:text-foreground">
						&larr;
					</button>
					<Avatar className="h-7 w-7">
						{isStandard ? (
							<AvatarFallback className="bg-teal-500/15 text-teal-600 dark:text-teal-400">
								<Headset className="h-3.5 w-3.5" />
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
								{isStandard ? "Mr Ray" : `${selectedThread.otherUser?.firstName ?? ""} ${selectedThread.otherUser?.lastName ?? ""}`}
							</p>
							{isStandard && <Badge className="text-[7px] h-3.5 px-1 bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/20">Standard</Badge>}
						</div>
						<p className="text-[10px] text-muted-foreground truncate">
							{isStandard ? "Assistance Consulaire" : selectedThread.requestRef ? `Demande ${selectedThread.requestRef}` : "Agent consulaire"}
						</p>
					</div>
				</div>

				{/* Messages */}
				<ScrollArea className="flex-1 px-3 py-3">
					{isActuallyLoading && !hasMessages ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
						</div>
					) : !hasMessages && isStandard ? (
						/* Onboarding personnalise Mr Ray */
						<div className="flex flex-col items-center justify-center h-full text-center px-4 py-6">
							<div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
								<Bot className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
							</div>
							<h3 className="text-sm font-bold mb-1">
								Bonjour{(profile as any)?.identity?.firstName ? ` ${(profile as any).identity.firstName}` : ""} !
							</h3>
							<p className="text-xs text-muted-foreground max-w-[280px] mb-5 leading-relaxed">
								Je suis votre assistant consulaire. Je peux vous aider avec vos demarches, passeports, rendez-vous et bien plus.
							</p>

							{/* Suggestions contextuelles */}
							<div className="w-full space-y-2">
								{contextSuggestions.map((s) => (
									<button
										key={s.label}
										type="button"
										onClick={() => setMessageInput(s.message)}
										className={cn(
											"w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all hover:scale-[1.01] active:scale-[0.99]",
											s.color,
										)}
									>
										<s.icon className="h-4 w-4 shrink-0" />
										<span className="text-xs font-semibold">{s.label}</span>
									</button>
								))}
							</div>
						</div>
					) : !hasMessages ? (
						<div className="flex flex-col items-center justify-center h-full text-center py-6">
							<MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
							<p className="text-xs text-muted-foreground">Aucun message encore</p>
						</div>
					) : (
						/* Messages temps reel */
						<div className="space-y-2.5">
							{(threadMessages as any[]).map((msg: any) => {
								const isMrRay = msg.senderEmail === MR_RAY_EMAIL || msg.senderName?.includes("Ray");
								const isMe = !isMrRay && msg.senderId !== selectedThread.otherUser?.id;
								const isBotMessage = isStandard && isMrRay;

								return (
									<div key={msg._id} className={cn("flex gap-2", isMe ? "justify-end" : "justify-start")}>
										{!isMe && (
											<Avatar className="h-6 w-6 shrink-0">
												{isBotMessage ? (
													<AvatarFallback className="bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[9px]">
														<Bot className="h-3 w-3" />
													</AvatarFallback>
												) : (
													<AvatarFallback className="text-[9px] bg-primary/10 text-primary">
														{(msg.senderName?.[0] ?? "A")}
													</AvatarFallback>
												)}
											</Avatar>
										)}
										<div className={cn("max-w-[80%] rounded-xl px-3 py-1.5 text-xs",
											isMe ? "bg-primary text-primary-foreground" : "bg-muted")}>
											{isBotMessage ? (
												<div className="prose prose-xs dark:prose-invert max-w-none [&>p]:m-0"><Markdown>{msg.content}</Markdown></div>
											) : msg.content}
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
					)}
				</ScrollArea>

				{/* Phase δ : Smart Suggestions pour citoyens */}
				{!messageInput.trim() && isStandard && (
					<SmartSuggestionsRow
						suggestions={[
							{ id: "passport", label: "Renouveler passeport", onClick: () => setMessageInput("J'aimerais renouveler mon passeport") },
							{ id: "rdv", label: "Prendre RDV", onClick: () => setMessageInput("Je souhaite prendre un rendez-vous") },
							{ id: "docs", label: "Mes documents", onClick: () => setMessageInput("Quels documents dois-je fournir ?") },
						]}
						title="Suggestions"
					/>
				)}

				{/* Input */}
				<div className="border-t p-2 flex items-end gap-1.5 shrink-0">
					<Textarea
						value={messageInput}
						onChange={(e) => setMessageInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={isStandard ? "Ecrivez au Standard..." : "Repondre..."}
						className="min-h-[32px] max-h-[80px] resize-none text-xs"
						rows={1}
					/>
					<Button
						size="icon"
						className={cn("h-8 w-8 shrink-0", isStandard && "bg-teal-600 hover:bg-teal-700")}
						disabled={!messageInput.trim()}
						onClick={isStandard ? handleSendStandard : handleSendHuman}
					>
						<Send className="h-3.5 w-3.5" />
					</Button>
				</div>
			</div>
		);
	}

	// ════════════════════════════════════════════════════════
	// VUE LISTE (Mr Ray epingle + threads agents)
	// ════════════════════════════════════════════════════════

	return (
		<div className="flex flex-col flex-1 overflow-hidden">
			<ScrollArea className="flex-1">
				{/* Mr Ray — Contact Standard epingle */}
				<button
					type="button"
					onClick={() => setSelectedThread(MR_RAY_CONTACT)}
					className="w-full flex items-center gap-3 px-3 py-3 hover:bg-teal-500/5 transition-colors text-left border-b border-border/30"
				>
					<div className="relative">
						<Avatar className="h-10 w-10">
							<AvatarFallback className="bg-teal-500/15 text-teal-600 dark:text-teal-400">
								<Headset className="h-5 w-5" />
							</AvatarFallback>
						</Avatar>
						<Pin className="absolute -top-0.5 -right-0.5 h-3 w-3 text-teal-500 rotate-45" />
					</div>
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-1.5">
							<p className="text-sm font-semibold">Mr Ray</p>
							<Badge className="text-[7px] h-3.5 px-1 bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/20">Standard</Badge>
						</div>
						<p className="text-[11px] text-muted-foreground truncate">
							{mrRayThread?.lastMessageText
								? mrRayThread.lastMessageText.slice(0, 50) + (mrRayThread.lastMessageText.length > 50 ? "..." : "")
								: "Standard Consulaire — Posez une question"}
						</p>
					</div>
					{mrRayUnread > 0 && (
						<Badge className="text-[8px] h-4 min-w-[16px] px-1 bg-teal-600 text-white">
							{mrRayUnread}
						</Badge>
					)}
				</button>

				{/* Threads avec agents */}
				{threadsLoading ? (
					<div className="flex items-center justify-center py-6">
						<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
					</div>
				) : p2pThreads.length > 0 ? (
					<div className="divide-y divide-border/30">
						{p2pThreads.map((thread: any) => (
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
						<p className="text-xs text-muted-foreground">Aucune conversation agent</p>
						<p className="text-[10px] text-muted-foreground/60 mt-1">
							Les agents vous contacteront ici
						</p>
					</div>
				)}
			</ScrollArea>
		</div>
	);
}
