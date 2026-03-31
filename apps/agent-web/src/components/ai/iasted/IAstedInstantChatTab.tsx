/**
 * IAstedInstantChatTab — Onglet iChat unifié.
 *
 * iAsted apparaît comme un contact épinglé en haut de la liste.
 * Clic sur iAsted → chat IA (LLM). Clic sur un autre contact → chat inter-utilisateurs.
 */

import { api } from "@convex/_generated/api";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
	Bot,
	Loader2,
	MessageSquare,
	Pin,
	Search,
	Send,
	User,
} from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useOrg } from "@/components/org/org-provider";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";
import { type AdminAIAction, useAdminAIChat } from "../useAdminAIChat";
import { VoiceChatContent } from "../VoiceButton";
import { parseIntent, resolveNavigationTarget } from "./IntentProcessor";
import { getSuggestions } from "./SpatialAwareness";

// Contact spécial iAsted
const IASTED_CONTACT = {
	id: "__iasted__",
	name: "iAsted",
	subtitle: "Conscience Numérique",
	isAI: true,
};

interface IAstedInstantChatTabProps {
	chat: ReturnType<typeof useAdminAIChat>;
	voice: any;
}

export function IAstedInstantChatTab({ chat, voice }: IAstedInstantChatTabProps) {
	const { activeOrgId } = useOrg();
	const location = useLocation();
	const navigate = useNavigate();
	const [search, setSearch] = useState("");
	const [selectedContact, setSelectedContact] = useState<any>(null);
	const [messageInput, setMessageInput] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const suggestions = getSuggestions(location.pathname);

	// Membres de l'org comme contacts
	const { data: orgChart } = useAuthenticatedConvexQuery(
		api.functions.orgs.getOrgChart,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	const rawContacts = (orgChart as any)?.positions?.flatMap((pos: any) =>
		(pos.occupants ?? []).map((occ: any) => ({
			id: occ.userId,
			name: `${occ.firstName ?? ""} ${occ.lastName ?? ""}`.trim(),
			email: occ.email,
			avatar: occ.avatarUrl,
			position: pos.title?.fr ?? pos.code,
			isAI: false,
		})),
	) ?? [];
	// Dédoublonner par userId (un utilisateur peut occuper plusieurs postes)
	const contacts = rawContacts.filter(
		(c: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === c.id) === i,
	);

	const filteredContacts = search
		? contacts.filter((c: any) =>
			c.name.toLowerCase().includes(search.toLowerCase()) ||
			c.email?.toLowerCase().includes(search.toLowerCase()),
		)
		: contacts;

	// Auto-scroll chat IA
	useEffect(() => {
		if (selectedContact?.isAI) {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [chat.messages, selectedContact]);

	// ── Envoi message IA ──
	const handleSendAI = async () => {
		const text = messageInput.trim();
		if (!text || chat.isLoading) return;

		// IntentProcessor
		const intent = parseIntent(text);
		if (intent && intent.confidence >= 0.7 && intent.category === "navigation") {
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

		setMessageInput("");
		await chat.sendMessage(text);
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			if (selectedContact?.isAI) handleSendAI();
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
							{selectedContact.isAI ? "Conscience Numérique" : selectedContact.position}
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
						/* ── Chat humain (placeholder) ── */
						<div className="flex flex-col items-center justify-center h-full text-center py-6">
							<MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
							<p className="text-xs text-muted-foreground">Démarrez la conversation</p>
						</div>
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
						onClick={selectedContact.isAI ? handleSendAI : undefined}>
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
			{/* Recherche */}
			<div className="p-2 border-b">
				<div className="relative">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Rechercher une conversation..."
						className="h-8 pl-8 text-xs"
					/>
				</div>
			</div>

			<ScrollArea className="flex-1">
				{/* iAsted — Contact IA épinglé */}
				{(!search || "iasted ia assistant".includes(search.toLowerCase())) && (
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
									: "Conscience Numérique — Posez une question"}
							</p>
						</div>
						{chat.messages.length > 0 && (
							<span className="text-[9px] text-muted-foreground shrink-0">
								{new Date(chat.messages[chat.messages.length - 1].timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
							</span>
						)}
					</button>
				)}

				{/* Contacts humains */}
				{filteredContacts.length === 0 && search ? (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<User className="h-8 w-8 text-muted-foreground/30 mb-2" />
						<p className="text-xs text-muted-foreground">Aucun résultat</p>
					</div>
				) : (
					<div className="divide-y divide-border/30">
						{filteredContacts.map((contact: any) => (
							<button
								key={contact.id}
								type="button"
								onClick={() => setSelectedContact(contact)}
								className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors text-left"
							>
								<Avatar className="h-9 w-9">
									<AvatarImage src={contact.avatar} />
									<AvatarFallback className="text-[10px] bg-primary/10 text-primary">
										{contact.name?.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
									</AvatarFallback>
								</Avatar>
								<div className="flex-1 min-w-0">
									<p className="text-xs font-medium truncate">{contact.name}</p>
									<p className="text-[10px] text-muted-foreground truncate">{contact.position}</p>
								</div>
								<MessageSquare className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
							</button>
						))}
					</div>
				)}
			</ScrollArea>
		</div>
	);
}
