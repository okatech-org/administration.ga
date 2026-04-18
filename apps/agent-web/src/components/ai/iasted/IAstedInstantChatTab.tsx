/**
 * IAstedInstantChatTab — iChat unifié (compact + fullscreen).
 *
 * Architecture partagée :
 * - `useIAstedChat(...)` : hook central (état + queries + handlers).
 * - `IAstedChatList` : colonne liste (iAsted épinglé + Standard + P2P + contacts cross-org).
 * - `IAstedChatConversation` : header + messages + pendingActions + macros + input.
 * - `IAstedChatVoiceOverlay` : mode vocal plein onglet.
 * - `IAstedInstantChatTab` (export default) : orchestrateur single-column, consommé par
 *   `IAstedWindow` (popup 420×640) et `BackofficeIAstedWindow`.
 *
 * La page fullscreen `/iasted` compose les mêmes sous-composants côte-à-côte via
 * `FullscreenShell`, en partageant une seule instance de `useIAstedChat` —
 * d'où la parité fonctionnelle exacte (mêmes contacts, macros, intents, voice).
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { usePathname, useRouter } from "next/navigation";
import {
	AlertCircle,
	Bot,
	Building2,
	Globe,
	Headset,
	Loader2,
	MessageSquare,
	Pin,
	Send,
	Shield,
	Sparkles,
	User,
	Users,
} from "lucide-react";
import {
	type KeyboardEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
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
import { VoiceButton, VoiceChatContent } from "../VoiceButton";
import { MacrosPanel, SmartSuggestionsRow } from "@workspace/iasted";
import { parseIntent, resolveNavigationTarget } from "./IntentProcessor";
import { getSuggestions } from "./SpatialAwareness";

// ════════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════════

/** Contact spécial iAsted — épinglé en haut de la liste iChat. */
export const IASTED_CONTACT = {
	id: "__iasted__",
	name: "iAsted",
	subtitle: "Agent IA Diplomate",
	isAI: true,
};

export const SOURCE_SEGMENTS: Array<{
	id: ContactSource | "all";
	label: string;
	icon: typeof Users;
}> = [
	{ id: "all", label: "Tous", icon: Users },
	{ id: "team", label: "Équipe", icon: Shield },
	{ id: "network", label: "Réseau", icon: Globe },
	{ id: "citizens", label: "Citoyens", icon: Users },
];

// ════════════════════════════════════════════════════════════
// useIAstedChat — hook central partagé (compact + fullscreen)
// ════════════════════════════════════════════════════════════

export interface UseIAstedChatOptions {
	chat: ReturnType<typeof useAdminAIChat>;
	voice: any;
	/** Contact pré-sélectionné au montage (ex : `IASTED_CONTACT` en fullscreen). */
	defaultSelectedContact?: any | null;
}

export function useIAstedChat({
	chat,
	voice: _voice,
	defaultSelectedContact = null,
}: UseIAstedChatOptions) {
	const { activeOrgId } = useOrg();
	const pathname = usePathname();
	const router = useRouter();
	const [selectedContact, setSelectedContact] = useState<any>(defaultSelectedContact);
	const [messageInput, setMessageInput] = useState("");
	const [showMacros, setShowMacros] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const suggestions = getSuggestions(pathname);

	// ── Macros ──
	const { data: macrosRaw } = useAuthenticatedConvexQuery(
		api.functions.orgIAstedConfig.listMacros,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);
	const macros = (macrosRaw ?? []) as Array<{
		id: string;
		label: string;
		content: string;
		category?: string;
		usageCount?: number;
	}>;
	const { mutateAsync: incrementMacro } = useConvexMutationQuery(
		api.functions.orgIAstedConfig.incrementMacroUsage,
	);

	// ── Recherche cross-org (team + network + citizens) — chargement exhaustif ──
	const {
		groups,
		total,
		isPending: contactsLoading,
		filters,
		setSearch,
		setSource,
	} = useContactSearch();
	const allContacts = useMemo(
		() => groups.flatMap((g: any) => g.contacts),
		[groups],
	);

	// ── Contacts prioritaires (citoyens avec demandes actives) ──
	// Calculés côté serveur à partir du score PRIORITY + STATUS + recency.
	// Ce sont les contacts qu'iAsted propose par défaut — le reste se trouve
	// via la recherche.
	const { data: priorityResult, isPending: priorityLoading } =
		useAuthenticatedConvexQuery(
			api.functions.contactSearch.listPriorityContacts,
			activeOrgId ? { orgId: activeOrgId, limit: 200 } : "skip",
		);
	const priorityContacts = useMemo(
		() => ((priorityResult as any)?.contacts ?? []) as any[],
		[priorityResult],
	);

	// ── Threads Standard (Mr Ray) ──
	const { data: standardChatsRaw } = useAuthenticatedConvexQuery(
		api.functions.chats.listStandardChats,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);
	const standardChats = (standardChatsRaw ?? []) as any[];

	// ── Threads P2P (exclure standard) ──
	const { data: myChats } = useAuthenticatedConvexQuery(
		api.functions.chats.listMyChats,
		{},
	);
	const p2pThreads = useMemo(() => {
		if (!myChats) return [];
		return (myChats as any[]).filter((t: any) => t.type !== "standard");
	}, [myChats]);
	const totalP2PUnread = useMemo(() => {
		return p2pThreads.reduce(
			(acc: number, t: any) => acc + (t.unreadCount ?? 0),
			0,
		);
	}, [p2pThreads]);

	// ── Mutations chat ──
	const { mutateAsync: initiateChat } = useConvexMutationQuery(
		api.functions.chats.initiateChat,
	);
	const { mutateAsync: sendChatMessage } = useConvexMutationQuery(
		api.functions.chats.sendMessage,
	);

	// ── Chat actif avec contact sélectionné ──
	const selectedUserId =
		selectedContact && !selectedContact.isAI ? selectedContact.userId : undefined;
	const { data: existingChat } = useAuthenticatedConvexQuery(
		api.functions.chats.findChatWith,
		selectedUserId ? { targetUserId: selectedUserId as Id<"users"> } : "skip",
	);

	// ── Envoi message humain ──
	const handleSendHuman = useCallback(
		async (text: string) => {
			const trimmed = text.trim();
			if (!trimmed || !selectedContact?.userId) return;
			try {
				if (existingChat) {
					await sendChatMessage({ chatId: existingChat._id, content: trimmed });
				} else {
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
		},
		[selectedContact, existingChat, sendChatMessage, initiateChat, activeOrgId],
	);

	// ── Auto-scroll chat IA ──
	useEffect(() => {
		if (selectedContact?.isAI) {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [chat.messages, selectedContact]);

	// ── Auto-scroll à l'ouverture d'un chat P2P ──
	useEffect(() => {
		if (selectedContact && !selectedContact.isAI && existingChat) {
			setTimeout(
				() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
				100,
			);
		}
	}, [selectedContact, existingChat]);

	// ── Recherche contact via intent ──
	const handleSearchContact = useCallback(
		(searchTerm: string) => {
			setSearch(searchTerm);
			const matchingContacts = allContacts.filter(
				(c: any) =>
					c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
					c.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
					c.orgName?.toLowerCase().includes(searchTerm.toLowerCase()),
			);
			if (matchingContacts.length > 0) {
				const contactList = matchingContacts
					.slice(0, 5)
					.map(
						(c: any) =>
							`• **${c.lastName} ${c.firstName}** — ${c.position ?? "N/A"} _(${c.orgName})_`,
					)
					.join("\n");
				return `J'ai trouvé **${matchingContacts.length}** contact(s) pour "${searchTerm}" :\n\n${contactList}${matchingContacts.length > 5 ? `\n\n_...et ${matchingContacts.length - 5} autres. Consultez l'onglet iContact._` : ""}`;
			}
			return `Aucun contact trouvé pour "${searchTerm}". Essayez avec un autre terme.`;
		},
		[allContacts, setSearch],
	);

	// ── Envoi message IA (avec IntentProcessor 5 catégories) ──
	const handleSendAI = useCallback(async () => {
		const text = messageInput.trim();
		if (!text || chat.isLoading) return;

		const intent = parseIntent(text);
		if (intent && intent.confidence >= 0.7) {
			// Navigation
			if (intent.category === "navigation") {
				const route = resolveNavigationTarget(intent.target);
				if (route) {
					setMessageInput("");
					chat.messages.push(
						{ role: "user", content: text, timestamp: Date.now() },
						{
							role: "assistant",
							content: `Je vous emmène sur **${intent.target}**.`,
							timestamp: Date.now(),
						},
					);
					router.push(route);
					toast.success(`Navigation vers ${intent.target}`);
					return;
				}
			}

			// Recherche de contact
			if (intent.category === "contact_search" && intent.target) {
				setMessageInput("");
				chat.messages.push({
					role: "user" as const,
					content: text,
					timestamp: Date.now(),
				});
				const result = handleSearchContact(intent.target);
				chat.messages.push({
					role: "assistant" as const,
					content: result,
					timestamp: Date.now(),
				});
				return;
			}

			// Appel contact
			if (intent.category === "call_contact" && intent.target) {
				setMessageInput("");
				chat.messages.push({
					role: "user" as const,
					content: text,
					timestamp: Date.now(),
				});
				const match = allContacts.find(
					(c: any) =>
						c.name.toLowerCase().includes(intent.target!.toLowerCase()) ||
						c.position?.toLowerCase().includes(intent.target!.toLowerCase()),
				);
				if (match) {
					chat.messages.push({
						role: "assistant" as const,
						content: ` Lancement de l'appel vers **${match.lastName} ${match.firstName}** (${match.position ?? "N/A"} — ${match.orgName}).\n\n_Basculez sur l'onglet iAppel pour continuer._`,
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
				chat.messages.push({
					role: "user" as const,
					content: text,
					timestamp: Date.now(),
				});
				const searchTerms = intent.target
					.split(/\s+(?:et|,)\s+/)
					.map((t) => t.trim());
				const matchedContacts = allContacts.filter((c: any) =>
					searchTerms.some(
						(term) =>
							c.name.toLowerCase().includes(term.toLowerCase()) ||
							c.orgName?.toLowerCase().includes(term.toLowerCase()),
					),
				);
				if (matchedContacts.length > 0) {
					const names = matchedContacts
						.slice(0, 5)
						.map((c: any) => `**${c.lastName} ${c.firstName}**`)
						.join(", ");
					chat.messages.push({
						role: "assistant" as const,
						content: ` Je prépare une réunion avec ${names}.\n\n_Basculez sur l'onglet iRéunion pour finaliser et démarrer._`,
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
					{
						role: "assistant" as const,
						content: "Compris, j'arrête. Comment puis-je vous aider ?",
						timestamp: Date.now(),
					},
				);
				return;
			}
		}

		setMessageInput("");
		await chat.sendMessage(text);
	}, [messageInput, chat, router, allContacts, handleSearchContact]);

	// ── Gestion clavier (Enter = envoi) ──
	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				if (selectedContact?.isAI) {
					handleSendAI();
				} else if (selectedContact) {
					handleSendHuman(messageInput);
				}
			}
		},
		[selectedContact, handleSendAI, handleSendHuman, messageInput],
	);

	return {
		// Core
		chat,
		voice: _voice,
		activeOrgId,

		// Selection
		selectedContact,
		setSelectedContact,

		// Input
		messageInput,
		setMessageInput,
		showMacros,
		setShowMacros,

		// Macros
		macros,
		incrementMacro,

		// Contacts
		groups,
		total,
		contactsLoading,
		filters,
		setSearch,
		setSource,
		allContacts,

		// Threads
		standardChats,
		p2pThreads,
		totalP2PUnread,
		existingChat,

		// Priorité IA (demandes actives)
		priorityContacts,
		priorityLoading,

		// Handlers
		handleSendAI,
		handleSendHuman,
		handleKeyDown,

		// Misc
		suggestions,
		messagesEndRef,
	};
}

export type IAstedChatState = ReturnType<typeof useIAstedChat>;

// ════════════════════════════════════════════════════════════
// IAstedChatVoiceOverlay — mode vocal plein onglet
// ════════════════════════════════════════════════════════════

export function IAstedChatVoiceOverlay({ voice }: { voice: any }) {
	return (
		<VoiceChatContent
			state={voice.state}
			error={voice.error}
			onClose={voice.closeOverlay}
			pendingConfirmation={voice.pendingConfirmation}
			isConfirming={voice.isConfirming}
			onConfirm={voice.confirmPending}
			onReject={voice.rejectPending}
		/>
	);
}

// ════════════════════════════════════════════════════════════
// IAstedChatConversation — colonne conversation
// ════════════════════════════════════════════════════════════

export interface IAstedChatConversationProps {
	state: IAstedChatState;
	/**
	 * Afficher le bouton `←` pour désélectionner le contact.
	 * - `true` en compact (single-column : on doit revenir à la liste).
	 * - `false` en fullscreen (la liste reste visible à côté).
	 */
	showBackButton?: boolean;
}

export function IAstedChatConversation({
	state,
	showBackButton = true,
}: IAstedChatConversationProps) {
	const {
		selectedContact,
		setSelectedContact,
		messageInput,
		setMessageInput,
		showMacros,
		setShowMacros,
		macros,
		incrementMacro,
		chat,
		voice,
		activeOrgId,
		suggestions,
		messagesEndRef,
		handleSendAI,
		handleSendHuman,
		handleKeyDown,
	} = state;

	// État vide — fullscreen sans sélection.
	if (!selectedContact) {
		return (
			<div className="flex flex-1 items-center justify-center min-h-0 text-center p-6">
				<div>
					<MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground/20" />
					<p className="text-sm text-muted-foreground">
						Sélectionnez une conversation
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col flex-1 min-h-0">
			{/* Header contact */}
			<div className="border-b px-3 py-2.5 flex items-center gap-2.5 shrink-0">
				{showBackButton && (
					<button
						type="button"
						onClick={() => setSelectedContact(null)}
						className="text-sm text-muted-foreground hover:text-foreground p-1"
					>
						←
					</button>
				)}
				<Avatar className="h-9 w-9">
					{selectedContact.isAI ? (
						<AvatarFallback className="bg-emerald-500/15 text-emerald-500">
							<Bot className="h-4 w-4" />
						</AvatarFallback>
					) : (
						<>
							<AvatarImage src={selectedContact.avatar} />
							<AvatarFallback className="text-xs bg-primary/10 text-primary">
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
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-1.5">
						<p className="text-sm font-medium truncate">{selectedContact.name}</p>
						{selectedContact.isAI && (
							<Badge className="text-[10px] h-4 px-1.5 bg-emerald-500/15 text-emerald-500 border-emerald-500/20">
								IA
							</Badge>
						)}
					</div>
					<p className="text-xs text-muted-foreground truncate">
						{selectedContact.isAI
							? "Agent IA Diplomate"
							: selectedContact.requestRef
								? `Demande ${selectedContact.requestRef}`
								: (selectedContact.position ?? "Agent consulaire")}
					</p>
				</div>
				{/* Voice toggle — actif uniquement pour le chat IA */}
				{selectedContact.isAI && voice?.isAvailable && (
					<VoiceButton
						isOpen={voice.isOpen}
						onClick={() =>
							voice.isOpen ? voice.closeOverlay() : voice.openOverlay()
						}
					/>
				)}
			</div>

			{/* Messages */}
			<ScrollArea className="flex-1 min-h-0 px-3 py-3">
				{selectedContact.isAI ? (
					// ── Chat IA ──
					chat.messages.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-full text-center py-6">
							<div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
								<Bot className="h-7 w-7 text-emerald-500" />
							</div>
							<h3 className="text-sm font-semibold mb-1">Bonjour, je suis iAsted</h3>
							<p className="text-xs text-muted-foreground max-w-[280px] mb-4">
								Posez-moi une question ou choisissez une suggestion.
							</p>
							<div className="flex flex-wrap gap-1.5 justify-center">
								{suggestions.map((s) => (
									<button
										key={s}
										type="button"
										onClick={() => setMessageInput(s)}
										className="text-xs px-3 py-1 rounded-full border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
									>
										{s}
									</button>
								))}
							</div>
						</div>
					) : (
						<div className="space-y-3">
							{chat.messages.map((msg, i) => (
								<div
									key={i}
									className={cn(
										"flex gap-2",
										msg.role === "user" ? "justify-end" : "justify-start",
									)}
								>
									{msg.role === "assistant" && (
										<Avatar className="h-7 w-7 shrink-0">
											<AvatarFallback className="bg-emerald-500/10 text-emerald-600">
												<Bot className="h-3.5 w-3.5" />
											</AvatarFallback>
										</Avatar>
									)}
									<div
										className={cn(
											"max-w-[80%] rounded-xl px-3 py-2 text-sm",
											msg.role === "user"
												? "bg-primary text-primary-foreground"
												: "bg-muted",
										)}
									>
										{msg.role === "assistant" ? (
											<div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0">
												<Markdown>{msg.content}</Markdown>
											</div>
										) : (
											msg.content
										)}
									</div>
									{msg.role === "user" && (
										<Avatar className="h-7 w-7 shrink-0">
											<AvatarFallback className="bg-primary/10 text-primary">
												<User className="h-3.5 w-3.5" />
											</AvatarFallback>
										</Avatar>
									)}
								</div>
							))}
							{chat.isLoading && (
								<div className="flex items-center gap-2">
									<Avatar className="h-7 w-7">
										<AvatarFallback className="bg-emerald-500/10 text-emerald-600">
											<Bot className="h-3.5 w-3.5" />
										</AvatarFallback>
									</Avatar>
									<div className="bg-muted rounded-xl px-3 py-2">
										<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
									</div>
								</div>
							)}
							<div ref={messagesEndRef} />
						</div>
					)
				) : (
					// ── Chat humain temps réel (Convex subscription) ──
					<HumanChatView contact={selectedContact} />
				)}
			</ScrollArea>

			{/* Actions IA en attente (confirmations) */}
			{selectedContact.isAI && chat.pendingActions.length > 0 && (
				<div className="border-t bg-amber-50 dark:bg-amber-950/20 p-2.5 space-y-1.5">
					{chat.pendingActions.map((action, i) => (
						<div
							key={i}
							className="flex items-center justify-between bg-background rounded-md p-2 border border-amber-200 text-xs"
						>
							<span className="font-medium truncate">
								{action.reason ?? action.type}
							</span>
							<div className="flex gap-1.5">
								<Button
									size="sm"
									variant="outline"
									onClick={() => chat.rejectAction(action)}
									className="h-7 text-xs px-2.5"
								>
									Non
								</Button>
								<Button
									size="sm"
									onClick={() => chat.confirmAction(action)}
									className="h-7 text-xs px-2.5"
								>
									Oui
								</Button>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Smart Suggestions contextuelles */}
			{suggestions.length > 0 && !messageInput.trim() && (
				<SmartSuggestionsRow
					suggestions={suggestions.slice(0, 3).map((s, i) => ({
						id: `suggestion-${i}`,
						label: s,
						onClick: () => setMessageInput(s),
					}))}
					title="Suggestions"
				/>
			)}

			{/* MacrosPanel — slash-command popover (chat humain uniquement) */}
			{showMacros && !selectedContact?.isAI && (
				<div className="border-t bg-card">
					<MacrosPanel
						macros={macros}
						variables={{}}
						searchPlaceholder="Rechercher une macro..."
						onSelect={(content, macro) => {
							setMessageInput(content);
							setShowMacros(false);
							if (activeOrgId) {
								void incrementMacro({ orgId: activeOrgId, macroId: macro.id });
							}
						}}
						className="max-h-48"
					/>
				</div>
			)}

			{/* Input */}
			<div className="border-t p-2.5 flex items-end gap-2 shrink-0">
				<Textarea
					value={messageInput}
					onChange={(e) => {
						const v = e.target.value;
						setMessageInput(v);
						// `/` en début → ouvre MacrosPanel (humain uniquement).
						if (v === "/" && !selectedContact?.isAI) {
							setShowMacros(true);
						} else if (showMacros && !v.startsWith("/")) {
							setShowMacros(false);
						}
					}}
					onKeyDown={(e) => {
						if (e.key === "Escape" && showMacros) {
							setShowMacros(false);
							setMessageInput("");
							return;
						}
						handleKeyDown(e);
					}}
					placeholder={
						selectedContact.isAI
							? "Demandez à iAsted..."
							: "/ pour macros · Écrire un message..."
					}
					className="min-h-[40px] max-h-[100px] resize-none text-sm"
					rows={1}
				/>
				<Button
					size="icon"
					className={cn(
						"h-10 w-10 shrink-0",
						selectedContact.isAI && "bg-emerald-600 hover:bg-emerald-700",
					)}
					disabled={
						!messageInput.trim() || (selectedContact.isAI && chat.isLoading)
					}
					onClick={
						selectedContact.isAI ? handleSendAI : () => handleSendHuman(messageInput)
					}
				>
					{selectedContact.isAI && chat.isLoading ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Send className="h-4 w-4" />
					)}
				</Button>
			</div>
		</div>
	);
}

// ════════════════════════════════════════════════════════════
// IAstedChatList — colonne liste (iAsted + Standard + P2P + contacts)
// ════════════════════════════════════════════════════════════

export interface IAstedChatListProps {
	state: IAstedChatState;
}

export function IAstedChatList({ state }: IAstedChatListProps) {
	const {
		chat,
		selectedContact,
		setSelectedContact,
		filters,
		setSearch,
		setSource,
		standardChats,
		p2pThreads,
		totalP2PUnread,
		groups,
		total,
		contactsLoading,
		priorityContacts,
		priorityLoading,
	} = state;

	// Helper pour souligner le contact actif (fullscreen 2 colonnes).
	const isActive = (key: string | undefined): boolean =>
		!!key && selectedContact?.id === key;

	/**
	 * Mode par défaut (pas de recherche, segment "Tous") : on ne montre QUE les
	 * contacts prioritaires (citoyens avec demandes actives). Le reste du
	 * répertoire est accessible via la recherche ou via un changement de segment.
	 */
	const isDefaultView = !filters.searchTerm && filters.source === "all";

	return (
		<div className="flex flex-col flex-1 min-h-0">
			{/* Recherche + segments */}
			<div className="p-3 border-b space-y-2 shrink-0">
				<Input
					value={filters.searchTerm}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Rechercher (nom, email, poste, org)..."
					className="h-10 text-sm"
				/>
				<div className="flex items-center gap-1.5 flex-wrap">
					{SOURCE_SEGMENTS.map((seg) => (
						<button
							key={seg.id}
							type="button"
							onClick={() => setSource(seg.id)}
							className={cn(
								"text-xs px-3 py-1 rounded-md font-medium transition-colors",
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

			<ScrollArea className="flex-1 min-h-0">
				{/* iAsted — Contact IA épinglé */}
				{(!filters.searchTerm ||
					"iasted ia assistant".includes(filters.searchTerm.toLowerCase())) && (
					<button
						type="button"
						onClick={() => setSelectedContact(IASTED_CONTACT)}
						className={cn(
							"w-full flex items-center gap-3 px-3 py-3.5 transition-colors text-left border-b border-border/30",
							isActive(IASTED_CONTACT.id)
								? "bg-primary/5"
								: "hover:bg-emerald-500/5",
						)}
					>
						<div className="relative">
							<Avatar className="h-11 w-11">
								<AvatarFallback className="bg-emerald-500/15 text-emerald-500">
									<Bot className="h-5 w-5" />
								</AvatarFallback>
							</Avatar>
							<Pin className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 text-emerald-500 rotate-45" />
						</div>
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-1.5">
								<p className="text-sm font-semibold">iAsted</p>
								<Badge className="text-[10px] h-4 px-1.5 bg-emerald-500/15 text-emerald-500 border-emerald-500/20">
									IA
								</Badge>
							</div>
							<p className="text-xs text-muted-foreground truncate">
								{chat.messages.length > 0
									? chat.messages[chat.messages.length - 1].content.slice(0, 45) + "..."
									: "Agent IA Diplomate — Posez une question"}
							</p>
						</div>
						{chat.messages.length > 0 && (
							<span className="text-[11px] text-muted-foreground shrink-0">
								{new Date(
									chat.messages[chat.messages.length - 1].timestamp,
								).toLocaleTimeString("fr-FR", {
									hour: "2-digit",
									minute: "2-digit",
								})}
							</span>
						)}
					</button>
				)}

				{/* Threads Standard (Mr Ray) — visibles uniquement en mode défaut. */}
				{isDefaultView && standardChats.length > 0 && (
					<div className="border-b border-border/30">
						<div className="flex items-center gap-2 px-3 py-2">
							<Headset className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
							<span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
								Standard
							</span>
							<Badge
								variant="outline"
								className="text-[10px] h-4 px-1.5 ml-auto border-teal-500/30 text-teal-600 dark:text-teal-400"
							>
								{standardChats.length}
							</Badge>
						</div>
						{standardChats.map((thread: any) => (
							<button
								key={thread._id}
								type="button"
								onClick={() =>
									setSelectedContact({
										...thread.otherUser,
										name: `${thread.otherUser?.firstName ?? ""} ${thread.otherUser?.lastName ?? ""}`.trim(),
										userId: thread.otherUser?.id,
										_chatId: thread._id,
										isAI: false,
										isStandard: true,
									})
								}
								className={cn(
									"w-full flex items-center gap-3 px-3 py-3 transition-colors text-left",
									selectedContact?.userId === thread.otherUser?.id
										? "bg-primary/5"
										: "hover:bg-teal-500/5",
								)}
							>
								<Avatar className="h-10 w-10">
									<AvatarImage src={thread.otherUser?.avatarUrl} />
									<AvatarFallback className="text-xs bg-teal-500/10 text-teal-600 dark:text-teal-400">
										{(thread.otherUser?.firstName?.[0] ?? "") +
											(thread.otherUser?.lastName?.[0] ?? "")}
									</AvatarFallback>
								</Avatar>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-1.5">
										<p className="text-sm font-medium truncate flex-1 min-w-0">
											{thread.otherUser?.firstName ?? ""} {thread.otherUser?.lastName ?? ""}
										</p>
										{!thread.claimedBy && (
											<Badge className="text-[10px] h-4 px-1.5 shrink-0 bg-amber-500/15 text-amber-600 border-amber-500/20">
												En attente
											</Badge>
										)}
									</div>
									<p className="text-xs text-muted-foreground truncate">
										{thread.lastMessageText ?? "Conversation Standard"}
									</p>
								</div>
								{thread.unreadCount > 0 && (
									<Badge className="text-[10px] h-5 min-w-[20px] px-1.5 bg-teal-600 text-white">
										{thread.unreadCount}
									</Badge>
								)}
							</button>
						))}
					</div>
				)}

				{/* Conversations P2P — visibles uniquement en mode défaut. */}
				{isDefaultView && p2pThreads.length > 0 && (
					<div className="border-b border-border/30">
						<div className="flex items-center gap-2 px-3 py-2">
							<MessageSquare className="h-3.5 w-3.5 text-primary shrink-0" />
							<span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
								Conversations
							</span>
							{totalP2PUnread > 0 && (
								<Badge className="text-[10px] h-4 px-1.5 ml-auto bg-primary text-primary-foreground">
									{totalP2PUnread}
								</Badge>
							)}
						</div>
						{p2pThreads.map((thread: any) => (
							<button
								key={thread._id}
								type="button"
								onClick={() =>
									setSelectedContact({
										...thread.otherUser,
										name: `${thread.otherUser?.firstName ?? ""} ${thread.otherUser?.lastName ?? ""}`.trim(),
										userId: thread.otherUser?.id,
										_chatId: thread._id,
										requestRef: thread.requestRef,
										isAI: false,
									})
								}
								className={cn(
									"w-full flex items-center gap-3 px-3 py-3 transition-colors text-left",
									selectedContact?.userId === thread.otherUser?.id
										? "bg-primary/5"
										: "hover:bg-muted/30",
								)}
							>
								<Avatar className="h-10 w-10">
									<AvatarImage src={thread.otherUser?.avatarUrl} />
									<AvatarFallback className="text-xs bg-primary/10 text-primary">
										{(thread.otherUser?.firstName?.[0] ?? "") +
											(thread.otherUser?.lastName?.[0] ?? "")}
									</AvatarFallback>
								</Avatar>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-1.5">
										<p className="text-sm font-medium truncate flex-1 min-w-0">
											{thread.otherUser?.firstName ?? ""} {thread.otherUser?.lastName ?? ""}
										</p>
										{thread.requestRef && (
											<Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0">
												{thread.requestRef}
											</Badge>
										)}
									</div>
									<p className="text-xs text-muted-foreground truncate">
										{thread.lastMessageText ?? "Nouvelle conversation"}
									</p>
								</div>
								{thread.unreadCount > 0 && (
									<Badge className="text-[10px] h-5 min-w-[20px] px-1.5 bg-primary text-primary-foreground">
										{thread.unreadCount}
									</Badge>
								)}
							</button>
						))}
					</div>
				)}

				{/* ── Priorité IA — citoyens avec demandes actives (vue par défaut) ── */}
				{isDefaultView && priorityContacts.length > 0 && (
					<div className="border-b border-border/30">
						<div className="flex items-center gap-2 px-3 py-2">
							<Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
							<span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
								Priorité IA
							</span>
							<span className="text-[10px] text-muted-foreground">
								· Demandes en cours
							</span>
							<Badge
								variant="outline"
								className="text-[10px] h-4 px-1.5 ml-auto border-amber-500/30 text-amber-600 dark:text-amber-400"
							>
								{priorityContacts.length}
							</Badge>
						</div>
						{priorityContacts.map((contact: any) => (
							<button
								key={contact.id}
								type="button"
								onClick={() => setSelectedContact({ ...contact, isAI: false })}
								className={cn(
									"w-full flex items-center gap-3 px-3 py-3 transition-colors text-left",
									isActive(contact.id)
										? "bg-primary/5"
										: "hover:bg-amber-500/5",
								)}
							>
								<div className="relative">
									<Avatar className="h-10 w-10">
										<AvatarImage src={contact.avatar} />
										<AvatarFallback className="text-xs bg-amber-500/10 text-amber-600">
											{contact.name
												?.split(" ")
												.map((w: string) => w[0])
												.join("")
												.toUpperCase()
												.slice(0, 2)}
										</AvatarFallback>
									</Avatar>
									{contact.highestPriority === "critical" && (
										<AlertCircle className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 text-red-500 bg-background rounded-full" />
									)}
									{contact.highestPriority === "urgent" && (
										<span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-background" />
									)}
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-1">
										<p className="text-sm font-bold truncate">{contact.lastName}</p>
										<p className="text-sm text-foreground/80 truncate">
											{contact.firstName}
										</p>
									</div>
									<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
										{contact.latestRequestRef && (
											<span className="font-mono text-[10px] truncate">
												{contact.latestRequestRef}
											</span>
										)}
										{contact.activeRequestCount > 1 && (
											<Badge
												variant="outline"
												className="text-[9px] h-3.5 px-1 shrink-0"
											>
												×{contact.activeRequestCount}
											</Badge>
										)}
									</div>
								</div>
								<MessageSquare className="h-4 w-4 text-muted-foreground/30 shrink-0" />
							</button>
						))}
					</div>
				)}

				{/* État vide du mode par défaut : pas encore de demandes actives. */}
				{isDefaultView && !priorityLoading && priorityContacts.length === 0 && (
					<div className="flex flex-col items-center justify-center py-8 text-center px-6">
						<Sparkles className="h-8 w-8 text-amber-500/30 mb-2" />
						<p className="text-sm text-muted-foreground">
							Aucune demande active
						</p>
						<p className="text-xs text-muted-foreground/70 mt-1">
							Recherchez un contact ou changez de segment pour voir le répertoire.
						</p>
					</div>
				)}

				{/* ── Répertoire complet cross-org — UNIQUEMENT en mode recherche ── */}
				{!isDefaultView && contactsLoading ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
					</div>
				) : !isDefaultView && groups.length === 0 && filters.searchTerm ? (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<User className="h-8 w-8 text-muted-foreground/30 mb-2" />
						<p className="text-sm text-muted-foreground">Aucun résultat</p>
					</div>
				) : !isDefaultView ? (
					<div className="divide-y">
						{groups.map((group: any) => (
							<div key={group.org.id} className="py-1">
								<div className="flex items-center gap-2 px-3 py-1.5">
									<Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
									<span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
										{group.org.name}
									</span>
									{group.org.country && (
										<span className="text-[10px] text-muted-foreground/60">
											{group.org.country}
										</span>
									)}
									<Badge
										variant="outline"
										className="text-[10px] h-4 px-1.5 ml-auto shrink-0"
									>
										{group.contacts.length}
									</Badge>
								</div>
								{group.contacts.map((contact: any) => (
									<button
										key={contact.id}
										type="button"
										onClick={() => setSelectedContact({ ...contact, isAI: false })}
										className={cn(
											"w-full flex items-center gap-3 px-3 py-3 transition-colors text-left",
											isActive(contact.id)
												? "bg-primary/5"
												: "hover:bg-muted/30",
										)}
									>
										<Avatar className="h-10 w-10">
											<AvatarImage src={contact.avatar} />
											<AvatarFallback
												className={cn(
													"text-xs",
													contact.source === "team"
														? "bg-primary/10 text-primary"
														: contact.source === "citizen"
															? "bg-amber-500/10 text-amber-600"
															: "bg-blue-500/10 text-blue-600",
												)}
											>
												{contact.name
													?.split(" ")
													.map((w: string) => w[0])
													.join("")
													.toUpperCase()
													.slice(0, 2)}
											</AvatarFallback>
										</Avatar>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-1">
												<p className="text-sm font-bold truncate">{contact.lastName}</p>
												<p className="text-sm text-foreground/80 truncate">
													{contact.firstName}
												</p>
											</div>
											{contact.position && (
												<p className="text-xs text-muted-foreground truncate">
													{contact.position}
												</p>
											)}
										</div>
										<MessageSquare className="h-4 w-4 text-muted-foreground/30 shrink-0" />
									</button>
								))}
							</div>
						))}
					</div>
				) : null}
			</ScrollArea>

			{/* Footer stats — dépend du mode actif. */}
			<div className="border-t px-3 py-1.5 text-xs text-muted-foreground flex items-center justify-between shrink-0">
				{isDefaultView ? (
					<>
						<span>
							{priorityContacts.length} priorité{priorityContacts.length > 1 ? "s" : ""}
						</span>
						<span className="text-muted-foreground/60">
							Recherchez pour voir le répertoire
						</span>
					</>
				) : (
					<>
						<span>
							{total} contact{total > 1 ? "s" : ""}
						</span>
						<span>
							{groups.length} org{groups.length > 1 ? "s" : ""}
						</span>
					</>
				)}
			</div>
		</div>
	);
}

// ════════════════════════════════════════════════════════════
// IAstedInstantChatTab — orchestrateur single-column (compact)
// ════════════════════════════════════════════════════════════

interface IAstedInstantChatTabProps {
	chat: ReturnType<typeof useAdminAIChat>;
	voice: any;
}

export function IAstedInstantChatTab({ chat, voice }: IAstedInstantChatTabProps) {
	const state = useIAstedChat({ chat, voice });

	// Mode vocal actif → prise complète de l'onglet.
	if (state.selectedContact?.isAI && voice.isOpen) {
		return <IAstedChatVoiceOverlay voice={voice} />;
	}

	// Un contact sélectionné → vue conversation (la liste n'est plus visible).
	if (state.selectedContact) {
		return <IAstedChatConversation state={state} showBackButton />;
	}

	// Sinon → vue liste.
	return <IAstedChatList state={state} />;
}

// ════════════════════════════════════════════════════════════
// HumanChatView — composant interne (chat humain temps réel)
// ════════════════════════════════════════════════════════════

function HumanChatView({ contact }: { contact: any }) {
	const chatId = contact._chatId as Id<"chats"> | undefined;

	const { data: existingChat } = useAuthenticatedConvexQuery(
		api.functions.chats.findChatWith,
		contact.userId ? { targetUserId: contact.userId as Id<"users"> } : "skip",
	);

	const resolvedChatId = chatId ?? existingChat?._id;

	const { data: messages, isPending: messagesLoading } = useAuthenticatedConvexQuery(
		api.functions.chats.listMessages,
		resolvedChatId ? { chatId: resolvedChatId, limit: 50 } : "skip",
	);

	const { mutateAsync: markRead } = useConvexMutationQuery(
		api.functions.chats.markRead,
	);

	useEffect(() => {
		if (resolvedChatId) {
			markRead({ chatId: resolvedChatId }).catch((e) => {
				console.warn("Failed to mark messages as read:", e);
			});
		}
	}, [resolvedChatId, markRead, messages?.length]);

	const scrollRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const timer = setTimeout(() => {
			scrollRef.current?.scrollIntoView({ behavior: "smooth" });
		}, 50);
		return () => clearTimeout(timer);
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
		<div className="space-y-3">
			{messages.map((msg: any) => {
				const isMe = msg.senderId !== contact.userId;
				return (
					<div
						key={msg._id}
						className={cn(
							"flex gap-2",
							isMe ? "justify-end" : "justify-start",
						)}
					>
						{!isMe && (
							<Avatar className="h-7 w-7 shrink-0">
								<AvatarImage src={contact.avatar} />
								<AvatarFallback className="text-xs bg-primary/10 text-primary">
									{contact.name
										?.split(" ")
										.map((w: string) => w[0])
										.join("")
										.toUpperCase()
										.slice(0, 2)}
								</AvatarFallback>
							</Avatar>
						)}
						<div
							className={cn(
								"max-w-[80%] rounded-xl px-3 py-2 text-sm",
								isMe
									? "bg-primary text-primary-foreground"
									: "bg-muted",
							)}
						>
							{msg.content}
						</div>
						{isMe && (
							<Avatar className="h-7 w-7 shrink-0">
								<AvatarFallback className="bg-primary/10 text-primary">
									<User className="h-3.5 w-3.5" />
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
