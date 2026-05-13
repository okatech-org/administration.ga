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
import { usePathname, useRouter } from "@workspace/routing";
import {
	Bot,
	Building2,
	Download,
	Edit3,
	FileText,
	Globe,
	ImageIcon,
	Loader2,
	MessageSquare,
	MoreVertical,
	Paperclip,
	Pin,
	Send,
	Shield,
	Trash2,
	User,
	Users,
	X,
} from "lucide-react";
import {
	type KeyboardEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { InlineMessageEditor } from "@workspace/chat/inline-message-editor";
import { SafeMarkdown as Markdown } from "@workspace/chat/safe-markdown";
import {
	formatFileSize,
	useChatAttachments,
} from "@workspace/chat/use-chat-attachments";
import { useIdempotencyKey } from "@workspace/chat/use-idempotency-key";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Textarea } from "@workspace/ui/components/textarea";
import { useOrg } from "../../shell/org-provider";
import { useContactSearch, type ContactSource } from "../../hooks/useContactSearch";
import { useAuthenticatedConvexQuery, useConvexMutationQuery } from "@workspace/api/hooks";
import { cn } from "@workspace/ui/lib/utils";
import { useAdminAIChat } from "./useAdminAIChat";
import { VoiceButton, VoiceChatContent } from "./VoiceButton";
import {
	MacrosPanel,
	SmartSuggestionsRow,
	useIAstedVoiceController,
} from "@workspace/iasted";
import { parseIntent, resolveNavigationTarget } from "./IntentProcessor";
import { getSuggestions } from "./SpatialAwareness";

// ════════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════════

/** Message en attente d'envoi (rendu instantanément avant le retour serveur). */
export interface OptimisticMessage {
	tempId: string;
	content: string;
	createdAt: number;
	status: "sending" | "failed";
	error?: string;
	attachmentLabels?: string[];
}

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
	const [selectedContact, setSelectedContactRaw] = useState<any>(defaultSelectedContact);
	// Drafts per contact — chaque thread garde son brouillon en mémoire pour
	// que l'agent puisse switcher de conversation sans perdre ce qu'il avait
	// commencé à écrire. Mr Ray a son propre draft (clé = "ai").
	const draftsRef = useRef<Map<string, string>>(new Map());
	const [messageInput, setMessageInputState] = useState("");
	const draftKey = useCallback(
		(c: any | null | undefined): string | null => {
			if (!c) return null;
			if (c.isAI) return "ai";
			return c.userId ?? c.id ?? null;
		},
		[],
	);
	const setSelectedContact = useCallback(
		(next: any) => {
			setSelectedContactRaw((prev: any) => {
				const prevKey = draftKey(prev);
				const nextKey = draftKey(next);
				if (prevKey && prevKey !== nextKey) {
					// Persist the current draft on the leaving contact.
					setMessageInputState((current) => {
						draftsRef.current.set(prevKey, current);
						return current;
					});
				}
				if (nextKey) {
					setMessageInputState(draftsRef.current.get(nextKey) ?? "");
				} else {
					setMessageInputState("");
				}
				return next;
			});
		},
		[draftKey],
	);
	const setMessageInput = useCallback(
		(v: string | ((prev: string) => string)) => {
			setMessageInputState((prev) => {
				const next = typeof v === "function" ? v(prev) : v;
				const key = draftKey(selectedContact);
				if (key) draftsRef.current.set(key, next);
				return next;
			});
		},
		[selectedContact, draftKey],
	);
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

	// ── Threads P2P (exclure standard — la liste Standard a été retirée
	//    pour ne garder que Mr Ray + les conversations P2P réelles) ──
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
	const { mutateAsync: setTypingMut } = useConvexMutationQuery(
		api.functions.chats.setTyping,
	);
	const { mutateAsync: clearTypingMut } = useConvexMutationQuery(
		api.functions.chats.clearTyping,
	);
	const { mutateAsync: generateAttachmentUploadUrl } = useConvexMutationQuery(
		api.functions.chats.generateAttachmentUploadUrl,
	);
	// Déduplique les doubles envois côté backend.
	const { getKey: getIdempotencyKey, rotate: rotateIdempotencyKey } =
		useIdempotencyKey();

	// ── Attachments (chat humain uniquement) ──
	const {
		attachments: pendingAttachments,
		addFiles,
		remove: removeAttachment,
		consumeForUpload,
	} = useChatAttachments({ onValidationError: (m) => toast.error(m) });
	const [isUploading, setIsUploading] = useState(false);

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

	// ── Chat actif avec contact sélectionné ──
	const selectedUserId =
		selectedContact && !selectedContact.isAI ? selectedContact.userId : undefined;
	const { data: existingChat } = useAuthenticatedConvexQuery(
		api.functions.chats.findChatWith,
		selectedUserId ? { targetUserId: selectedUserId as Id<"users"> } : "skip",
	);

	// ── Typing indicator ──
	// Chat humain uniquement — skip pour iAsted (pas d'interlocuteur humain).
	const typingChatId = useMemo(
		() =>
			selectedContact && !selectedContact.isAI
				? ((selectedContact._chatId ?? existingChat?._id) as
						| Id<"chats">
						| undefined)
				: undefined,
		[selectedContact, existingChat],
	);

	const { data: typingUsers } = useAuthenticatedConvexQuery(
		api.functions.chats.listTyping,
		typingChatId ? { chatId: typingChatId } : "skip",
	);

	// Throttle : on ne ping `setTyping` qu'au plus toutes les 2s. Le TTL backend
	// (6s) prend le relais quand l'utilisateur s'arrête. `clearTyping` au send
	// + unmount + changement de thread.
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

	// ── Optimistic updates P2P ─────────────────────────────────
	// Map<contactKey, OptimisticMessage[]>. Une entrée est ajoutée dès le clic
	// "Envoyer" pour un rendu instantané. Elle est retirée une fois la
	// subscription Convex remontée du message persisté ; en cas d'échec on
	// la marque "failed" et on offre le retry.
	const [optimisticByContact, setOptimisticByContact] = useState<
		Map<string, OptimisticMessage[]>
	>(() => new Map());

	const removeOptimistic = useCallback(
		(contactKey: string, tempId: string) => {
			setOptimisticByContact((prev) => {
				const next = new Map(prev);
				const list = next.get(contactKey) ?? [];
				const filtered = list.filter((m) => m.tempId !== tempId);
				if (filtered.length === 0) next.delete(contactKey);
				else next.set(contactKey, filtered);
				return next;
			});
		},
		[],
	);

	const markOptimisticFailed = useCallback(
		(contactKey: string, tempId: string, errorMessage?: string) => {
			setOptimisticByContact((prev) => {
				const next = new Map(prev);
				const list = next.get(contactKey) ?? [];
				next.set(
					contactKey,
					list.map((m) =>
						m.tempId === tempId
							? { ...m, status: "failed", error: errorMessage }
							: m,
					),
				);
				return next;
			});
		},
		[],
	);

	// ── Envoi message humain (avec optimistic UI) ──────────────
	const handleSendHuman = useCallback(
		async (text: string) => {
			const trimmed = text.trim();
			const hasAttachments = pendingAttachments.length > 0;
			if ((!trimmed && !hasAttachments) || !selectedContact?.userId) return;
			if (isUploading) return;
			const contactKey = selectedContact.userId as string;
			const tempId = `optim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
			const optimistic: OptimisticMessage = {
				tempId,
				content: trimmed,
				createdAt: Date.now(),
				status: "sending",
				attachmentLabels: pendingAttachments.map((a) => a.file.name),
			};
			setOptimisticByContact((prev) => {
				const next = new Map(prev);
				const list = next.get(contactKey) ?? [];
				next.set(contactKey, [...list, optimistic]);
				return next;
			});
			setIsUploading(true);
			// On vide l'input tout de suite pour signaler l'envoi.
			setMessageInput("");
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
						orgId: activeOrgId ?? undefined,
						initialMessage: trimmed,
						initialAttachmentFiles: attachmentFiles,
					});
				}
				rotateIdempotencyKey();
				stopTyping();
				// Le message persisté arrive via la subscription `listMessages`.
				// On laisse 200ms pour que le re-render réactif l'inclue, puis on
				// dégage l'optimistic. Ça évite un flash "double message".
				setTimeout(() => removeOptimistic(contactKey, tempId), 200);
			} catch (e: any) {
				markOptimisticFailed(
					contactKey,
					tempId,
					e?.message ?? "Erreur d'envoi",
				);
				toast.error(e?.message ?? "Erreur d'envoi");
				// Réinjecte le draft pour permettre une correction rapide.
				setMessageInput(trimmed);
			} finally {
				setIsUploading(false);
			}
		},
		[
			selectedContact,
			existingChat,
			sendChatMessage,
			initiateChat,
			activeOrgId,
			getIdempotencyKey,
			rotateIdempotencyKey,
			stopTyping,
			pendingAttachments,
			isUploading,
			uploadPendingAttachments,
			removeOptimistic,
			markOptimisticFailed,
			setMessageInput,
		],
	);

	const optimisticForActive = useMemo(() => {
		if (!selectedContact?.userId) return [] as OptimisticMessage[];
		return optimisticByContact.get(selectedContact.userId as string) ?? [];
	}, [optimisticByContact, selectedContact?.userId]);

	const retryOptimistic = useCallback(
		(tempId: string) => {
			if (!selectedContact?.userId) return;
			const list =
				optimisticByContact.get(selectedContact.userId as string) ?? [];
			const target = list.find((m) => m.tempId === tempId);
			if (!target) return;
			removeOptimistic(selectedContact.userId as string, tempId);
			void handleSendHuman(target.content);
		},
		[optimisticByContact, selectedContact?.userId, removeOptimistic, handleSendHuman],
	);

	const dismissOptimistic = useCallback(
		(tempId: string) => {
			if (!selectedContact?.userId) return;
			removeOptimistic(selectedContact.userId as string, tempId);
		},
		[selectedContact?.userId, removeOptimistic],
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
		p2pThreads,
		totalP2PUnread,
		existingChat,

		// Optimistic P2P
		optimisticForActive,
		retryOptimistic,
		dismissOptimistic,

		// Handlers
		handleSendAI,
		handleSendHuman,
		handleKeyDown,

		// Typing indicator (chat humain uniquement — skip côté iAsted).
		pingTyping,
		stopTyping,
		typingText,

		// Attachments (chat humain uniquement).
		pendingAttachments,
		addFiles,
		removeAttachment,
		isUploading,

		// Misc
		suggestions,
		messagesEndRef,
	};
}

export type IAstedChatState = ReturnType<typeof useIAstedChat>;

// ════════════════════════════════════════════════════════════
// IAstedChatVoiceOverlay — mode vocal plein onglet
//
// DÉPRÉCIÉ (mai 2026) : la session vocale est désormais portée par
// OpenAI Realtime (cf. `useIAstedHost` côté agent-web + `VoiceFloatingTranscription`
// au niveau du shell). Le composant reste exporté en stub vide pour
// préserver les imports existants — il ne rend rien.
// ════════════════════════════════════════════════════════════

export function IAstedChatVoiceOverlay(_props: { voice: unknown }) {
	return null;
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
	/**
	 * Afficher le header contact interne (avatar + nom + badge IA + mic).
	 * - `true` (défaut) : usage dans la fenêtre flottante / fullscreen.
	 * - `false` : usage embarqué (side panel) où l'enrobage fournit déjà
	 *   son propre header — évite la duplication.
	 */
	showHeader?: boolean;
}

export function IAstedChatConversation({
	state,
	showBackButton = true,
	showHeader = true,
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
		pingTyping,
		stopTyping,
		typingText,
		pendingAttachments,
		addFiles,
		removeAttachment,
		isUploading,
	} = state;
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	// Controller Realtime (OpenAI). Le bouton micro de la conversation IA
	// active/désactive la session vocale via ce controller. L'ancien
	// `voice` (state Gemini) est conservé pour compatibilité mais ne pilote
	// plus le bouton.
	const realtimeVoice = useIAstedVoiceController();

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
			{showHeader && (
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
							<AvatarFallback className="bg-primary/15 text-primary">
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
								<Badge className="text-[10px] h-4 px-1.5 bg-primary/15 text-primary border-primary/20">
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
					{/* Voice toggle — active la session vocale OpenAI Realtime
					    (anciennement Gemini Live, migré en mai 2026). Le visuel
					    `VoiceButton` reste, mais le clic appelle désormais le
					    controller Realtime exposé via `useIAstedVoiceController`. */}
					{selectedContact.isAI && realtimeVoice?.available && (
						<VoiceButton
							isOpen={realtimeVoice.isConnected}
							onClick={() => {
								if (realtimeVoice.isConnected) {
									void realtimeVoice.deactivateVoice();
								} else {
									void realtimeVoice.activateVoice();
								}
							}}
						/>
					)}
				</div>
			)}

			{/* Messages */}
			<ScrollArea className="flex-1 min-h-0 px-3 py-3">
				{selectedContact.isAI ? (
					// ── Chat IA ──
					chat.messages.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-full text-center py-6 px-4">
							<div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
								<Bot className="h-7 w-7 text-primary" />
							</div>
							<h3 className="text-sm font-semibold mb-1">Bonjour, je suis iAsted</h3>
							<p className="text-xs text-muted-foreground max-w-[300px] mb-3">
								Posez-moi une question, lancez une commande ou activez la voix pour piloter la plateforme.
							</p>
							<div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-muted-foreground/80">
								<span className="inline-flex items-center gap-1 rounded-full border bg-background/50 px-2 py-0.5">
									<MessageSquare className="h-2.5 w-2.5" /> Texte
								</span>
								<span className="inline-flex items-center gap-1 rounded-full border bg-background/50 px-2 py-0.5">
									Suggestions
								</span>
								<span className="inline-flex items-center gap-1 rounded-full border bg-background/50 px-2 py-0.5">
									Voix
								</span>
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
											<AvatarFallback className="bg-primary/10 text-primary">
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
										<AvatarFallback className="bg-primary/10 text-primary">
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
					<HumanChatView
						contact={selectedContact}
						optimisticMessages={state.optimisticForActive}
						onRetryOptimistic={state.retryOptimistic}
						onDismissOptimistic={state.dismissOptimistic}
					/>
				)}
			</ScrollArea>

			{/* Cartes de confirmation supprimées (mai 2026) : la confirmation
			    se fait désormais en langage naturel — l'IA demande
			    « Voulez-vous que je… ? » et l'utilisateur répond. La défense
			    en profondeur reste dans les mutations Convex. */}

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

			{/* Typing indicator — ligne fine au-dessus du composer (chat humain). */}
			{!selectedContact.isAI && typingText && (
				<div className="px-3 py-1 text-[10px] text-muted-foreground italic shrink-0">
					{typingText}
				</div>
			)}

			{/* Pending attachments — chips au-dessus du composer (chat humain). */}
			{!selectedContact.isAI && pendingAttachments.length > 0 && (
				<div className="border-t px-2.5 py-2 flex flex-wrap gap-1.5 shrink-0">
					{pendingAttachments.map((att) => (
						<div
							key={att.localId}
							className="flex items-center gap-1.5 bg-muted rounded-md px-2 py-1 text-xs max-w-[240px]"
						>
							{att.file.type.startsWith("image/") ? (
								<ImageIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
							) : (
								<FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
							)}
							<span className="truncate">{att.file.name}</span>
							<span className="text-muted-foreground/60 shrink-0 text-[10px]">
								{formatFileSize(att.file.size)}
							</span>
							<button
								type="button"
								onClick={() => removeAttachment(att.localId)}
								className="ml-0.5 hover:text-destructive shrink-0"
								aria-label="Retirer"
							>
								<X className="h-3.5 w-3.5" />
							</button>
						</div>
					))}
				</div>
			)}

			{/* Input */}
			<div className="border-t p-2.5 flex items-end gap-2 shrink-0">
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
						className="h-10 w-10 shrink-0"
						onClick={() => fileInputRef.current?.click()}
						disabled={isUploading}
						aria-label="Joindre un fichier"
					>
						<Paperclip className="h-4 w-4" />
					</Button>
				)}
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
						// Typing indicator : ping pendant la frappe, clear si champ vidé.
						// Skip pour iAsted (pas d'interlocuteur humain).
						if (!selectedContact?.isAI) {
							if (v.trim()) pingTyping();
							else stopTyping();
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
						selectedContact.isAI && "bg-primary hover:bg-primary/90",
					)}
					disabled={
						(!messageInput.trim() &&
							(selectedContact.isAI || pendingAttachments.length === 0)) ||
						(selectedContact.isAI && chat.isLoading) ||
						(!selectedContact.isAI && isUploading)
					}
					onClick={
						selectedContact.isAI ? handleSendAI : () => handleSendHuman(messageInput)
					}
				>
					{(selectedContact.isAI && chat.isLoading) ||
					(!selectedContact.isAI && isUploading) ? (
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
		p2pThreads,
		totalP2PUnread,
		groups,
		total,
		contactsLoading,
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
								: "hover:bg-primary/5",
						)}
					>
						<div className="relative">
							<Avatar className="h-11 w-11">
								<AvatarFallback className="bg-primary/15 text-primary">
									<Bot className="h-5 w-5" />
								</AvatarFallback>
							</Avatar>
							<Pin className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 text-primary rotate-45" />
						</div>
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-1.5">
								<p className="text-sm font-semibold">iAsted</p>
								<Badge className="text-[10px] h-4 px-1.5 bg-primary/15 text-primary border-primary/20">
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

				{/* État vide du mode par défaut : pas encore de conversations P2P. */}
				{isDefaultView && p2pThreads.length === 0 && (
					<div className="flex flex-col items-center justify-center py-8 text-center px-6">
						<MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
						<p className="text-sm text-muted-foreground">
							Aucune conversation
						</p>
						<p className="text-xs text-muted-foreground/70 mt-1">
							Recherchez un collègue ou un contact pour démarrer une discussion.
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
															? "bg-secondary text-secondary-foreground"
															: "bg-muted text-muted-foreground",
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
							{p2pThreads.length} conversation{p2pThreads.length > 1 ? "s" : ""}
						</span>
						<span className="text-muted-foreground/60">
							Recherchez pour démarrer une discussion
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

	// Vue principale : conversation OU liste. La voix est désormais rendue
	// au-dessus en mini-overlay flottant pour ne plus bloquer la lecture
	// des messages pendant un appel vocal Mr Ray.
	const main = state.selectedContact ? (
		<IAstedChatConversation state={state} showBackButton />
	) : (
		<IAstedChatList state={state} />
	);
	return (
		<div className="relative flex flex-col flex-1 min-h-0">
			{main}
			{/* `FloatingVoiceOverlay` retiré (mai 2026) : la transcription
			    vocale est maintenant rendue par `VoiceFloatingTranscription`
			    au niveau du shell (cf. iasted-window.tsx). */}
		</div>
	);
}

// ════════════════════════════════════════════════════════════
// FloatingVoiceOverlay — mini-encart vocal en bas de l'onglet
// ════════════════════════════════════════════════════════════

/**
 * Affiche un encart compact (statut, niveau audio, raccrocher) qui flotte
 * au-dessus de la liste/conversation. L'agent garde le contexte écrit
 * sous les yeux pendant qu'il parle à Mr Ray.
 */
function FloatingVoiceOverlay({ voice }: { voice: any }) {
	const stateLabel = (() => {
		switch (voice.state) {
			case "connecting":
				return "Connexion…";
			case "listening":
				return "À l'écoute";
			case "processing":
				return "Réflexion…";
			case "speaking":
				return "Mr Ray parle";
			case "error":
				return "Erreur vocale";
			default:
				return "Voix active";
		}
	})();

	return (
		<div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 w-[min(92%,360px)]">
			<div className="flex items-center gap-3 rounded-full border bg-background/95 backdrop-blur-md shadow-lg px-3 py-2">
				<div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
					<Bot className="h-4 w-4 text-primary" />
					{(voice.state === "listening" || voice.state === "speaking") && (
						<span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
					)}
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-xs font-semibold leading-tight truncate">Mode vocal</p>
					<p className="text-[10px] text-muted-foreground truncate">{stateLabel}</p>
				</div>
				<button
					type="button"
					onClick={() => voice.stopVoice?.()}
					className="rounded-full bg-destructive/15 hover:bg-destructive/25 text-destructive px-2.5 py-1 text-xs font-medium shrink-0"
					aria-label="Terminer l'appel vocal"
				>
					Raccrocher
				</button>
			</div>
		</div>
	);
}

// ════════════════════════════════════════════════════════════
// HumanChatView — composant interne (chat humain temps réel)
// ════════════════════════════════════════════════════════════

const MESSAGE_EDIT_WINDOW_MS = 15 * 60 * 1000;

interface HumanChatViewProps {
	contact: any;
	optimisticMessages?: OptimisticMessage[];
	onRetryOptimistic?: (tempId: string) => void;
	onDismissOptimistic?: (tempId: string) => void;
}

const PAGE_SIZE = 50;
const MAX_LIMIT = 500; // Plafond de sécurité (au-delà → utiliser un cursor)

const TIME_FMT = new Intl.DateTimeFormat("fr-FR", {
	hour: "2-digit",
	minute: "2-digit",
});
const FULL_DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
	weekday: "long",
	day: "numeric",
	month: "long",
	year: "numeric",
});

function formatTime(ts: number): string {
	return TIME_FMT.format(new Date(ts));
}

function isSameDay(a: number, b: number): boolean {
	const da = new Date(a);
	const db = new Date(b);
	return (
		da.getFullYear() === db.getFullYear() &&
		da.getMonth() === db.getMonth() &&
		da.getDate() === db.getDate()
	);
}

function formatDayLabel(ts: number): string {
	const now = Date.now();
	const today = new Date(now);
	const target = new Date(ts);
	const diffDays = Math.floor(
		(today.setHours(0, 0, 0, 0) - new Date(target).setHours(0, 0, 0, 0)) /
			(1000 * 60 * 60 * 24),
	);
	if (diffDays === 0) return "Aujourd'hui";
	if (diffDays === 1) return "Hier";
	return FULL_DATE_FMT.format(new Date(ts));
}

function HumanChatView({
	contact,
	optimisticMessages = [],
	onRetryOptimistic,
	onDismissOptimistic,
}: HumanChatViewProps) {
	const chatId = contact._chatId as Id<"chats"> | undefined;

	const { data: existingChat } = useAuthenticatedConvexQuery(
		api.functions.chats.findChatWith,
		contact.userId ? { targetUserId: contact.userId as Id<"users"> } : "skip",
	);

	const resolvedChatId = chatId ?? existingChat?._id;

	// Pagination réactive : chaque clic "Charger plus" augmente la limite ; la
	// query se ré-exécute et renvoie les messages plus anciens. Convex gère
	// la subscription temps réel pour le top de la fenêtre.
	const [loadedLimit, setLoadedLimit] = useState(PAGE_SIZE);
	// Reset la pagination quand on change de conversation.
	useEffect(() => {
		setLoadedLimit(PAGE_SIZE);
	}, [resolvedChatId]);

	const { data: messages, isPending: messagesLoading } = useAuthenticatedConvexQuery(
		api.functions.chats.listMessages,
		resolvedChatId ? { chatId: resolvedChatId, limit: loadedLimit } : "skip",
	);
	const hasMore =
		!!messages && (messages as any[]).length === loadedLimit && loadedLimit < MAX_LIMIT;
	const canLoadMore = hasMore && !messagesLoading;
	const handleLoadMore = useCallback(() => {
		setLoadedLimit((prev) => Math.min(prev + PAGE_SIZE, MAX_LIMIT));
	}, []);

	const { mutateAsync: markRead } = useConvexMutationQuery(
		api.functions.chats.markRead,
	);
	const { mutateAsync: deleteMessageMut } = useConvexMutationQuery(
		api.functions.chats.deleteMessage,
	);
	const { mutateAsync: editMessageMut } = useConvexMutationQuery(
		api.functions.chats.editMessage,
	);

	// ID du message en cours d'édition (null = aucun).
	const [editingMessageId, setEditingMessageId] =
		useState<Id<"chatMessages"> | null>(null);

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

	const handleDeleteMessage = useCallback(
		async (messageId: Id<"chatMessages">) => {
			if (!window.confirm("Supprimer ce message ?")) return;
			try {
				await deleteMessageMut({ messageId });
			} catch (e: any) {
				toast.error(e?.data ?? e?.message ?? "Suppression impossible.");
			}
		},
		[deleteMessageMut],
	);

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

	const messageList = (messages ?? []) as any[];
	if (messagesLoading && messageList.length === 0) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (messageList.length === 0 && optimisticMessages.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-full text-center py-6">
				<MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
				<p className="text-xs text-muted-foreground">Envoyez le premier message</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{/* "Charger les messages précédents" — pagination cursor via limit. */}
			{canLoadMore && (
				<div className="flex justify-center pb-1">
					<button
						type="button"
						onClick={handleLoadMore}
						className="text-xs text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 transition-colors"
					>
						{messagesLoading ? (
							<Loader2 className="h-3 w-3 animate-spin" />
						) : null}
						Charger les messages précédents
					</button>
				</div>
			)}
			{messageList.map((msg: any, idx: number) => {
				const isMe = msg.senderId !== contact.userId;
				const isDeleted = !!msg.deletedAt;
				const isEdited = !!msg.editedAt && !isDeleted;
				const canMutate =
					isMe && !isDeleted && Date.now() - msg.createdAt < MESSAGE_EDIT_WINDOW_MS;
				const prev = messageList[idx - 1];
				const showDayLabel = !prev || !isSameDay(prev.createdAt, msg.createdAt);
				return (
					<div key={msg._id}>
						{showDayLabel && (
							<div className="flex justify-center my-3">
								<span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full">
									{formatDayLabel(msg.createdAt)}
								</span>
							</div>
						)}
					<div
						className={cn(
							"flex gap-2 group",
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
						{canMutate && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button
										type="button"
										aria-label="Actions"
										className="opacity-0 group-hover:opacity-100 transition-opacity self-center h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
									>
										<MoreVertical className="h-4 w-4" />
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="min-w-[9rem]">
									<DropdownMenuItem onClick={() => handleStartEdit(msg._id)}>
										<Edit3 className="h-3.5 w-3.5 mr-2" />
										<span className="text-xs">Modifier</span>
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => handleDeleteMessage(msg._id)}
										className="text-destructive focus:text-destructive"
									>
										<Trash2 className="h-3.5 w-3.5 mr-2" />
										<span className="text-xs">Supprimer</span>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
						<div
							className={cn(
								"max-w-[80%] rounded-xl px-3 py-2 text-sm",
								isMe
									? "bg-primary text-primary-foreground"
									: "bg-muted",
								isDeleted && "italic opacity-60",
							)}
						>
							{isDeleted ? (
								<span>[Message supprimé]</span>
							) : msg._id === editingMessageId ? (
								<InlineMessageEditor
									initialValue={msg.content}
									onSave={(next) => handleSaveEdit(msg._id, next)}
									onCancel={handleCancelEdit}
									textareaClassName="w-full bg-transparent outline-none resize-none text-sm text-inherit placeholder:opacity-50"
									buttonClassName="px-2 py-0.5 text-xs rounded"
									saveButtonClassName="bg-background/20 hover:bg-background/30 font-medium"
									cancelButtonClassName="opacity-70 hover:opacity-100"
									rows={2}
								/>
							) : (
								<>
									{msg.content && <div>{msg.content}</div>}
									{msg.attachmentFiles && msg.attachmentFiles.length > 0 && (
										<div className={cn("space-y-1", msg.content ? "mt-2" : "")}>
											{msg.attachmentFiles.map((f: any) => (
												<a
													key={f.storageId}
													href={f.url ?? "#"}
													target="_blank"
													rel="noopener noreferrer"
													download={f.filename}
													className={cn(
														"flex items-center gap-2 px-2 py-1.5 rounded text-xs bg-black/10 dark:bg-white/10 hover:bg-black/15 dark:hover:bg-white/15 transition-colors",
														!f.url && "pointer-events-none opacity-50",
													)}
												>
													{f.mimeType?.startsWith("image/") ? (
														<ImageIcon className="h-4 w-4 shrink-0 opacity-80" />
													) : (
														<FileText className="h-4 w-4 shrink-0 opacity-80" />
													)}
													<span className="truncate flex-1 min-w-0">{f.filename}</span>
													<span className="opacity-60 shrink-0 text-[10px]">
														{formatFileSize(f.sizeBytes)}
													</span>
													<Download className="h-3.5 w-3.5 shrink-0 opacity-60" />
												</a>
											))}
										</div>
									)}
									<div className="flex items-center gap-1 mt-1 text-[10px] opacity-70">
										<span>{formatTime(msg.createdAt)}</span>
										{isEdited && (
											<>
												<span aria-hidden="true">·</span>
												<span title={`Modifié à ${formatTime(msg.editedAt)}`}>
													modifié
												</span>
											</>
										)}
									</div>
								</>
							)}
						</div>
						{isMe && (
							<Avatar className="h-7 w-7 shrink-0">
								<AvatarFallback className="bg-primary/10 text-primary">
									<User className="h-3.5 w-3.5" />
								</AvatarFallback>
							</Avatar>
						)}
					</div>
					</div>
				);
			})}
			{/* Messages optimistes — affichés instantanément, avant retour serveur. */}
			{optimisticMessages.map((opt) => (
				<div key={opt.tempId} className="flex gap-2 group justify-end">
					<div
						className={cn(
							"max-w-[80%] rounded-xl px-3 py-2 text-sm",
							opt.status === "failed"
								? "bg-destructive/10 text-destructive border border-destructive/30"
								: "bg-primary/70 text-primary-foreground",
						)}
					>
						<div className="whitespace-pre-wrap">{opt.content}</div>
						{opt.attachmentLabels && opt.attachmentLabels.length > 0 && (
							<div className="mt-1 text-[10px] opacity-70">
								{opt.attachmentLabels.length} pièce
								{opt.attachmentLabels.length > 1 ? "s" : ""} jointe
								{opt.attachmentLabels.length > 1 ? "s" : ""}
							</div>
						)}
						<div className="flex items-center gap-2 mt-1 text-[10px] opacity-80">
							<span>{formatTime(opt.createdAt)}</span>
							<span aria-hidden="true">·</span>
							{opt.status === "sending" ? (
								<>
									<Loader2 className="h-2.5 w-2.5 animate-spin" />
									<span>Envoi…</span>
								</>
							) : (
								<>
									<span>Échec d'envoi</span>
									{onRetryOptimistic && (
										<button
											type="button"
											onClick={() => onRetryOptimistic(opt.tempId)}
											className="underline hover:opacity-100 opacity-90"
										>
											Réessayer
										</button>
									)}
									{onDismissOptimistic && (
										<button
											type="button"
											onClick={() => onDismissOptimistic(opt.tempId)}
											className="underline hover:opacity-100 opacity-90"
										>
											Annuler
										</button>
									)}
								</>
							)}
						</div>
					</div>
					<Avatar className="h-7 w-7 shrink-0">
						<AvatarFallback className="bg-primary/10 text-primary">
							<User className="h-3.5 w-3.5" />
						</AvatarFallback>
					</Avatar>
				</div>
			))}
			<div ref={scrollRef} />
		</div>
	);
}
