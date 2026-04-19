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
	Download,
	Edit3,
	FileText,
	Headset,
	ImageIcon,
	Loader2,
	MessageSquare,
	MoreVertical,
	Paperclip,
	Pin,
	Send,
	Trash2,
	User,
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
	// ID du message en cours d'édition (null = aucun). L'éditeur inline prend
	// la place du contenu de la bulle concernée.
	const [editingMessageId, setEditingMessageId] =
		useState<Id<"chatMessages"> | null>(null);
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
	const { mutateAsync: deleteMessageMut } = useConvexMutationQuery(
		api.functions.chats.deleteMessage,
	);
	const { mutateAsync: editMessageMut } = useConvexMutationQuery(
		api.functions.chats.editMessage,
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

	// ── Attachments ──
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
		const uploaded = await Promise.all(
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
		return uploaded;
	}, [consumeForUpload, generateAttachmentUploadUrl]);
	// Clé d'idempotence : évite les doubles insertions côté backend si
	// l'utilisateur double-clique ou si le retry réseau refait la mutation.
	const { getKey: getIdempotencyKey, rotate: rotateIdempotencyKey } =
		useIdempotencyKey();

	// ID du thread actif (sélection) — dérivé de selectedThread pour les hooks
	// de typing indicator + actions message.
	const selectedChatIdForHooks = (selectedThread?.isStandard
		? selectedThread?._id
		: selectedThread?._id) as Id<"chats"> | undefined;

	// Liste des utilisateurs en train d'écrire dans ce thread (hors moi).
	const { data: typingUsers } = useAuthenticatedConvexQuery(
		api.functions.chats.listTyping,
		selectedChatIdForHooks ? { chatId: selectedChatIdForHooks } : "skip",
	);

	// Fenêtre d'édition autorisée côté client (miroir du backend : 15 min).
	const MESSAGE_EDIT_WINDOW_MS = 15 * 60 * 1000;

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
		const hasAttachments = pendingAttachments.length > 0;
		if (!text && !hasAttachments) return;
		if (isUploading) return;

		setIsUploading(true);
		try {
			const attachmentFiles = hasAttachments
				? await uploadPendingAttachments()
				: undefined;

			if (mrRayThread) {
				// Thread existant — envoyer dans le thread P2P
				await sendChatMessage({
					chatId: mrRayThread._id as Id<"chats">,
					content: text,
					attachmentFiles,
					idempotencyKey: getIdempotencyKey(),
				});
			} else if (orgId) {
				// Pas de thread — en creer un via initiateStandardChat
				await initiateStandard({
					orgId,
					initialMessage: text,
					initialAttachmentFiles: attachmentFiles,
				});
			} else {
				toast.error("Vous devez etre inscrit a une representation consulaire pour utiliser le Standard.");
				return;
			}
			setMessageInput("");
			rotateIdempotencyKey();
			stopTyping();
		} catch (e: any) {
			toast.error(e?.data ?? e?.message ?? "Erreur d'envoi");
			// On ne rotate PAS la clé → un retry manuel dédupliquera côté serveur.
		} finally {
			setIsUploading(false);
		}
	};

	// ── Envoi message humain ──
	const handleSendHuman = async () => {
		const text = messageInput.trim();
		const hasAttachments = pendingAttachments.length > 0;
		if ((!text && !hasAttachments) || !selectedChatId) return;
		if (isUploading) return;

		setIsUploading(true);
		try {
			const attachmentFiles = hasAttachments
				? await uploadPendingAttachments()
				: undefined;

			await sendChatMessage({
				chatId: selectedChatId as Id<"chats">,
				content: text,
				attachmentFiles,
				idempotencyKey: getIdempotencyKey(),
			});
			setMessageInput("");
			rotateIdempotencyKey();
			stopTyping();
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur d'envoi");
		} finally {
			setIsUploading(false);
		}
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			if (selectedThread?.isStandard) handleSendStandard();
			else handleSendHuman();
		}
	};

	// ── Typing indicator throttling ──
	// On ne ping `setTyping` qu'au plus toutes les 2 secondes pendant que
	// l'utilisateur écrit. Le TTL backend (6s) prend le relais quand il
	// s'arrête. `clearTyping` est appelé au send et au unmount.
	const typingThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const pingTyping = useCallback(() => {
		if (!selectedChatIdForHooks) return;
		if (typingThrottleRef.current) return; // throttle actif
		void setTypingMut({ chatId: selectedChatIdForHooks });
		typingThrottleRef.current = setTimeout(() => {
			typingThrottleRef.current = null;
		}, 2_000);
	}, [selectedChatIdForHooks, setTypingMut]);

	const stopTyping = useCallback(() => {
		if (typingThrottleRef.current) {
			clearTimeout(typingThrottleRef.current);
			typingThrottleRef.current = null;
		}
		if (selectedChatIdForHooks) {
			void clearTypingMut({ chatId: selectedChatIdForHooks });
		}
	}, [selectedChatIdForHooks, clearTypingMut]);

	// Cleanup sur unmount ou changement de thread
	useEffect(() => {
		return () => {
			if (typingThrottleRef.current) {
				clearTimeout(typingThrottleRef.current);
				typingThrottleRef.current = null;
			}
		};
	}, [selectedChatIdForHooks]);

	const handleInputChange = (value: string) => {
		setMessageInput(value);
		if (value.trim()) pingTyping();
		else if (!value) stopTyping();
	};

	// ── Actions sur un message envoyé par l'utilisateur ──
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

	// Bascule la bulle du message ciblé en mode édition inline. Le rendu de
	// la conversation détecte `editingMessageId === msg._id` et remplace le
	// contenu par <InlineMessageEditor>.
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
				// On conserve l'éditeur ouvert pour laisser l'utilisateur corriger.
			}
		},
		[editMessageMut],
	);

	// Texte "X est en train d'écrire…" (ou vide)
	const typingText = useMemo(() => {
		if (!typingUsers || typingUsers.length === 0) return "";
		if (typingUsers.length === 1) {
			return `${typingUsers[0].displayName} est en train d'écrire…`;
		}
		return `${typingUsers.length} personnes sont en train d'écrire…`;
	}, [typingUsers]);

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
			<div className="flex flex-col flex-1 min-h-0 overflow-hidden">
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
				<ScrollArea className="flex-1 min-h-0 px-3 py-3">
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
								const isDeleted = !!msg.deletedAt;
								const isEdited = !!msg.editedAt && !isDeleted;
								const canMutate =
									isMe &&
									!isDeleted &&
									!isBotMessage &&
									Date.now() - msg.createdAt < MESSAGE_EDIT_WINDOW_MS;

								return (
									<div key={msg._id} className={cn("flex gap-2 group", isMe ? "justify-end" : "justify-start")}>
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
										{/* Menu d'actions (éditer / supprimer) côté auteur uniquement,
										    fenêtre 15 min, invisible sinon. Apparaît au survol. */}
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
										<div className={cn("max-w-[80%] rounded-xl px-3 py-1.5 text-xs",
											isMe ? "bg-primary text-primary-foreground" : "bg-muted",
											isDeleted && "italic opacity-60")}>
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
											) : isBotMessage ? (
												<div className="prose prose-xs dark:prose-invert max-w-none [&>p]:m-0"><Markdown>{msg.content}</Markdown></div>
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
													{isEdited && (
														<span className="ml-1 opacity-60 text-[9px]">(modifié)</span>
													)}
												</>
											)}
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

				{/* Typing indicator — ligne fine au-dessus du composer */}
				{typingText && (
					<div className="px-3 py-1 text-[10px] text-muted-foreground italic shrink-0">
						{typingText}
					</div>
				)}

				{/* Pending attachments — chips au-dessus du composer */}
				{pendingAttachments.length > 0 && (
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

				{/* Input */}
				<div className="border-t p-2 flex items-end gap-1.5 shrink-0">
					<input
						ref={fileInputRef}
						type="file"
						multiple
						className="hidden"
						onChange={(e) => {
							if (e.target.files) addFiles(e.target.files);
							e.target.value = ""; // permet de re-sélectionner le même fichier
						}}
					/>
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
					<Textarea
						value={messageInput}
						onChange={(e) => handleInputChange(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={isStandard ? "Ecrivez au Standard..." : "Repondre..."}
						className="min-h-[32px] max-h-[80px] resize-none text-xs"
						rows={1}
					/>
					<Button
						size="icon"
						className={cn("h-8 w-8 shrink-0", isStandard && "bg-teal-600 hover:bg-teal-700")}
						disabled={
							(!messageInput.trim() && pendingAttachments.length === 0) ||
							isUploading
						}
						onClick={isStandard ? handleSendStandard : handleSendHuman}
					>
						{isUploading ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : (
							<Send className="h-3.5 w-3.5" />
						)}
					</Button>
				</div>
			</div>
		);
	}

	// ════════════════════════════════════════════════════════
	// VUE LISTE (Mr Ray epingle + threads agents)
	// ════════════════════════════════════════════════════════

	return (
		<div className="flex flex-col flex-1 min-h-0 overflow-hidden">
			<ScrollArea className="flex-1 min-h-0">
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
