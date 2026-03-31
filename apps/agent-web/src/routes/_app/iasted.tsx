/**
 * iAsted — Page plein écran (inspirée WhatsApp Desktop)
 *
 * Layout :
 * [Icônes nav] | [Liste conversations/contacts] | [Zone de chat/contenu]
 */

import { api } from "@convex/_generated/api";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
} from "lucide-react";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useOrg } from "@/components/org/org-provider";
import { useAdminAIChat } from "@/components/ai/useAdminAIChat";
import { useAdminVoiceChat } from "@/components/ai/useAdminVoiceChat";
import { VoiceButton } from "@/components/ai/VoiceButton";
import { parseIntent, resolveNavigationTarget } from "@/components/ai/iasted/IntentProcessor";
import { getSuggestions } from "@/components/ai/iasted/SpatialAwareness";
import { IAstedContactTab } from "@/components/ai/iasted/IAstedContactTab";
import { IAstedCallTab } from "@/components/ai/iasted/IAstedCallTab";
import { IAstedSettingsTab } from "@/components/ai/iasted/IAstedSettingsTab";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/iasted")({
	component: IAstedFullPage,
});

// Contact spécial iAsted
const IASTED_CONTACT = {
	id: "__iasted__",
	name: "iAsted",
	subtitle: "Conscience Numérique",
	isAI: true,
};

const NAV_ITEMS = [
	{ id: "ichat", icon: MessageSquare, label: "iChat" },
	{ id: "icontact", icon: Contact, label: "iContact" },
	{ id: "icall", icon: Phone, label: "iAppel" },
	{ id: "settings", icon: Settings, label: "Réglages" },
] as const;

type TabId = (typeof NAV_ITEMS)[number]["id"];

function IAstedFullPage() {
	const [activeTab, setActiveTab] = useState<TabId>("ichat");
	const [selectedContact, setSelectedContact] = useState<any>(IASTED_CONTACT);
	const [search, setSearch] = useState("");
	const [messageInput, setMessageInput] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const { activeOrg, activeOrgId } = useOrg();
	const navigate = useNavigate();
	const chat = useAdminAIChat();
	const voice = useAdminVoiceChat();
	const suggestions = getSuggestions("/iasted");

	// Contacts
	const { data: orgChart } = useAuthenticatedConvexQuery(
		api.functions.orgs.getOrgChart,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	const contacts = useMemo(() => {
		const raw = (orgChart as any)?.positions?.flatMap((pos: any) =>
			(pos.occupants ?? []).map((occ: any) => ({
				id: occ.userId,
				name: `${occ.firstName ?? ""} ${occ.lastName ?? ""}`.trim(),
				email: occ.email,
				avatar: occ.avatarUrl,
				position: pos.title?.fr ?? pos.code,
				isAI: false,
			})),
		) ?? [];
		return raw.filter((c: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.name === c.name) === i);
	}, [orgChart]);

	const filteredContacts = search
		? contacts.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()))
		: contacts;

	// Auto-scroll
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [chat.messages]);

	// Envoi IA
	const handleSendAI = async () => {
		const text = messageInput.trim();
		if (!text || chat.isLoading) return;
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

	return (
		<div className="flex h-full overflow-hidden">
			{/* ── Col 1 : Icônes navigation (comme WhatsApp) ── */}
			<div className="w-14 border-r flex flex-col items-center py-3 gap-1 shrink-0">
				{/* Logo */}
				<div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
					<ShieldCheck className="h-4 w-4 text-emerald-500" />
				</div>

				{/* Nav icons */}
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
								"h-10 w-10 rounded-xl flex items-center justify-center transition-all",
								isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
							)}
						>
							<Icon className="h-5 w-5" />
						</button>
					);
				})}

				{/* Spacer */}
				<div className="flex-1" />

				{/* Réduire */}
				<button
					type="button"
					onClick={() => navigate({ to: "/" })}
					title="Réduire"
					className="h-10 w-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
				>
					<Minimize2 className="h-5 w-5" />
				</button>
			</div>

			{activeTab === "ichat" ? (
				<>
					{/* ── Col 2 : Liste conversations (comme WhatsApp) ── */}
					<div className="w-80 border-r flex flex-col shrink-0">
						{/* Header */}
						<div className="px-4 py-3 border-b shrink-0">
							<h2 className="text-base font-semibold">Discussions</h2>
						</div>

						{/* Recherche */}
						<div className="p-2 border-b">
							<div className="relative">
								<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
								<Input
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="Rechercher"
									className="h-8 pl-8 text-xs bg-muted/30 border-0"
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
									"w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border/20",
									selectedContact?.id === "__iasted__" ? "bg-primary/5" : "hover:bg-muted/30",
								)}
							>
								<div className="relative">
									<Avatar className="h-11 w-11">
										<AvatarFallback className="bg-emerald-500/15 text-emerald-500">
											<Bot className="h-5 w-5" />
										</AvatarFallback>
									</Avatar>
									<Pin className="absolute -top-0.5 -right-0.5 h-3 w-3 text-emerald-500 rotate-45" />
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-1.5">
											<p className="text-sm font-semibold">iAsted</p>
											<Badge className="text-[7px] h-3.5 px-1 bg-emerald-500/15 text-emerald-500 border-emerald-500/20">IA</Badge>
										</div>
										{chat.messages.length > 0 && (
											<span className="text-[10px] text-muted-foreground">
												{new Date(chat.messages[chat.messages.length - 1].timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
											</span>
										)}
									</div>
									<p className="text-xs text-muted-foreground truncate mt-0.5">
										{chat.messages.length > 0
											? chat.messages[chat.messages.length - 1].content.slice(0, 45) + "..."
											: "Conscience Numérique — Posez une question"}
									</p>
								</div>
							</button>

							{/* Contacts humains */}
							{filteredContacts.map((c: any) => (
								<button
									key={c.id}
									type="button"
									onClick={() => setSelectedContact(c)}
									className={cn(
										"w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border/10",
										selectedContact?.id === c.id ? "bg-primary/5" : "hover:bg-muted/30",
									)}
								>
									<Avatar className="h-11 w-11">
										<AvatarImage src={c.avatar} />
										<AvatarFallback className="text-xs bg-primary/10 text-primary">
											{c.name?.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
										</AvatarFallback>
									</Avatar>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium truncate">{c.name}</p>
										<p className="text-xs text-muted-foreground truncate">{c.position}</p>
									</div>
								</button>
							))}
						</ScrollArea>
					</div>

					{/* ── Col 3 : Zone de chat (comme WhatsApp) ── */}
					<div className="flex-1 flex flex-col overflow-hidden">
						{selectedContact ? (
							<>
								{/* Header contact */}
								<div className="px-4 py-3 border-b flex items-center gap-3 shrink-0">
									<Avatar className="h-9 w-9">
										{selectedContact.isAI ? (
											<AvatarFallback className="bg-emerald-500/15 text-emerald-500"><Bot className="h-4 w-4" /></AvatarFallback>
										) : (
											<>
												<AvatarImage src={selectedContact.avatar} />
												<AvatarFallback className="text-xs bg-primary/10 text-primary">
													{selectedContact.name?.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
												</AvatarFallback>
											</>
										)}
									</Avatar>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-semibold">{selectedContact.name}</p>
										<p className="text-[11px] text-muted-foreground">
											{selectedContact.isAI ? "Conscience Numérique" : selectedContact.position}
										</p>
									</div>
									{selectedContact.isAI && voice.isAvailable && (
										<VoiceButton
											isOpen={voice.isOpen}
											onClick={() => voice.isOpen ? voice.closeOverlay() : voice.openOverlay()}
										/>
									)}
								</div>

								{/* Messages */}
								<ScrollArea className="flex-1 px-6 py-4">
									{selectedContact.isAI ? (
										chat.messages.length === 0 ? (
											<div className="flex flex-col items-center justify-center h-full text-center py-12">
												<div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
													<Bot className="h-8 w-8 text-emerald-500" />
												</div>
												<h3 className="text-base font-semibold mb-1">Bonjour, je suis iAsted</h3>
												<p className="text-sm text-muted-foreground max-w-md mb-6">
													Votre conscience numérique. Posez-moi une question ou choisissez une suggestion.
												</p>
												<div className="flex flex-wrap gap-2 justify-center max-w-lg">
													{suggestions.map((s) => (
														<button key={s} type="button" onClick={() => setMessageInput(s)}
															className="text-xs px-3 py-1.5 rounded-full border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
															{s}
														</button>
													))}
												</div>
											</div>
										) : (
											<div className="space-y-3 max-w-3xl mx-auto">
												{chat.messages.map((msg, i) => (
													<div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
														{msg.role === "assistant" && (
															<Avatar className="h-7 w-7 shrink-0 mt-1">
																<AvatarFallback className="bg-emerald-500/10 text-emerald-600 text-[9px]"><Bot className="h-3.5 w-3.5" /></AvatarFallback>
															</Avatar>
														)}
														<div className={cn("max-w-[70%] rounded-xl px-3 py-2 text-sm",
															msg.role === "user" ? "bg-emerald-600 text-white" : "bg-card border")}>
															{msg.role === "assistant" ? (
																<Markdown className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0">{msg.content}</Markdown>
															) : msg.content}
															<p className={cn("text-[9px] mt-1", msg.role === "user" ? "text-white/60 text-right" : "text-muted-foreground")}>
																{new Date(msg.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
															</p>
														</div>
													</div>
												))}
												{chat.isLoading && (
													<div className="flex items-center gap-2">
														<Avatar className="h-7 w-7"><AvatarFallback className="bg-emerald-500/10 text-emerald-600 text-[9px]"><Bot className="h-3.5 w-3.5" /></AvatarFallback></Avatar>
														<div className="bg-card border rounded-xl px-3 py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
													</div>
												)}
												<div ref={messagesEndRef} />
											</div>
										)
									) : (
										<div className="flex flex-col items-center justify-center h-full text-center py-12">
											<MessageSquare className="h-12 w-12 text-muted-foreground/20 mb-3" />
											<p className="text-sm text-muted-foreground">Démarrez la conversation avec {selectedContact.name}</p>
										</div>
									)}
								</ScrollArea>

								{/* Actions IA en attente */}
								{selectedContact.isAI && chat.pendingActions.length > 0 && (
									<div className="border-t bg-amber-50 dark:bg-amber-950/20 px-6 py-2 space-y-1.5">
										{chat.pendingActions.map((action, i) => (
											<div key={i} className="flex items-center justify-between bg-background rounded-lg p-2 border border-amber-200 text-xs">
												<span className="font-medium">{action.reason ?? action.type}</span>
												<div className="flex gap-1.5">
													<Button size="sm" variant="outline" onClick={() => chat.rejectAction(action)} className="h-6 text-[10px]">Non</Button>
													<Button size="sm" onClick={() => chat.confirmAction(action)} className="h-6 text-[10px]">Oui</Button>
												</div>
											</div>
										))}
									</div>
								)}

								{/* Input — style WhatsApp */}
								<div className="border-t px-4 py-3 flex items-end gap-3 shrink-0">
									<Textarea
										value={messageInput}
										onChange={(e) => setMessageInput(e.target.value)}
										onKeyDown={handleKeyDown}
										placeholder={selectedContact.isAI ? "Demandez à iAsted..." : "Écrire un message..."}
										className="min-h-[40px] max-h-[120px] resize-none text-sm flex-1"
										rows={1}
									/>
									<Button
										size="icon"
										onClick={selectedContact.isAI ? handleSendAI : undefined}
										disabled={!messageInput.trim() || (selectedContact.isAI && chat.isLoading)}
										className={cn("h-10 w-10 rounded-full shrink-0", selectedContact.isAI ? "bg-emerald-600 hover:bg-emerald-700" : "")}
									>
										{selectedContact.isAI && chat.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
									</Button>
								</div>
							</>
						) : (
							<div className="flex-1 flex items-center justify-center text-center">
								<div>
									<ShieldCheck className="h-16 w-16 text-emerald-500/20 mx-auto mb-4" />
									<h2 className="text-lg font-semibold text-muted-foreground">iAsted</h2>
									<p className="text-sm text-muted-foreground/60">Sélectionnez une conversation</p>
								</div>
							</div>
						)}
					</div>
				</>
			) : (
				/* ── Onglets non-chat (iContact, iAppel, Réglages) ── */
				<div className="flex-1 flex flex-col overflow-hidden">
					<div className="px-4 py-3 border-b shrink-0">
						<h2 className="text-base font-semibold">
							{activeTab === "icontact" ? "iContact" : activeTab === "icall" ? "iAppel" : "Réglages"}
						</h2>
					</div>
					<div className="flex-1 overflow-hidden">
						{activeTab === "icontact" && <IAstedContactTab />}
						{activeTab === "icall" && <IAstedCallTab />}
						{activeTab === "settings" && <IAstedSettingsTab />}
					</div>
				</div>
			)}
		</div>
	);
}
