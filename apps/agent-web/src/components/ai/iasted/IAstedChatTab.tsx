/**
 * IAstedChatTab — Onglet IA du panneau iAsted.
 * Reprend la logique de chat d'AdminAIAssistant avec IntentProcessor.
 */

import { useLocation, useNavigate } from "@tanstack/react-router";
import {
	Bot,
	CalendarDays,
	ExternalLink,
	FileEdit,
	Loader2,
	MessageSquare,
	Send,
	User,
} from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { type AdminAIAction, type Message, useAdminAIChat } from "../useAdminAIChat";
import { VoiceChatContent } from "../VoiceButton";
import { parseIntent, resolveNavigationTarget } from "./IntentProcessor";
import { getSuggestions } from "./SpatialAwareness";

interface IAstedChatTabProps {
	chat: ReturnType<typeof useAdminAIChat>;
	voice: any;
}

export function IAstedChatTab({ chat, voice }: IAstedChatTabProps) {
	const location = useLocation();
	const navigate = useNavigate();
	const [input, setInput] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const suggestions = getSuggestions(location.pathname);

	// Auto-scroll vers le bas
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [chat.messages]);

	const handleSend = async () => {
		const text = input.trim();
		if (!text || chat.isLoading) return;

		// IntentProcessor — essayer le regex d'abord
		const intent = parseIntent(text);
		if (intent && intent.confidence >= 0.7 && intent.category === "navigation") {
			const route = resolveNavigationTarget(intent.target);
			if (route) {
				setInput("");
				chat.messages.push(
					{ role: "user", content: text, timestamp: Date.now() },
					{ role: "assistant", content: `Je vous emmène sur la page **${intent.target}**.`, timestamp: Date.now() },
				);
				navigate({ to: route });
				toast.success(`Navigation vers ${intent.target}`);
				return;
			}
		}

		// Fallback → LLM
		setInput("");
		await chat.sendMessage(text);
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	const handleSuggestion = (text: string) => {
		setInput(text);
	};

	// Si le mode vocal est actif, afficher l'overlay vocal
	if (voice.isOpen) {
		return <VoiceChatContent voice={voice} />;
	}

	return (
		<div className="flex flex-col flex-1 overflow-hidden">
			{/* Messages */}
			<ScrollArea className="flex-1 px-4 py-3">
				{chat.messages.length === 0 ? (
					/* Empty state */
					<div className="flex flex-col items-center justify-center h-full text-center py-8">
						<div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
							<Bot className="h-7 w-7 text-emerald-500" />
						</div>
						<h3 className="text-sm font-semibold mb-1">Bonjour, je suis iAsted</h3>
						<p className="text-xs text-muted-foreground max-w-[280px] mb-4">
							Votre conscience numérique. Posez-moi une question ou choisissez une suggestion ci-dessous.
						</p>
						{/* Suggestions */}
						<div className="flex flex-wrap gap-1.5 justify-center">
							{suggestions.map((s) => (
								<button
									key={s}
									type="button"
									onClick={() => handleSuggestion(s)}
									className="text-[11px] px-2.5 py-1 rounded-full border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
								>
									{s}
								</button>
							))}
						</div>
					</div>
				) : (
					/* Messages list */
					<div className="space-y-3">
						{chat.messages.map((msg, i) => (
							<div
								key={`${msg.role}-${i}`}
								className={cn(
									"flex gap-2",
									msg.role === "user" ? "justify-end" : "justify-start",
								)}
							>
								{msg.role === "assistant" && (
									<Avatar className="h-7 w-7 shrink-0">
										<AvatarFallback className="bg-emerald-500/10 text-emerald-600 text-xs">
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
										<Markdown className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:m-0 [&>ol]:m-0">
											{msg.content}
										</Markdown>
									) : (
										msg.content
									)}
								</div>
								{msg.role === "user" && (
									<Avatar className="h-7 w-7 shrink-0">
										<AvatarFallback className="bg-primary/10 text-primary text-xs">
											<User className="h-3.5 w-3.5" />
										</AvatarFallback>
									</Avatar>
								)}
							</div>
						))}

						{/* Loading indicator */}
						{chat.isLoading && (
							<div className="flex items-center gap-2">
								<Avatar className="h-7 w-7">
									<AvatarFallback className="bg-emerald-500/10 text-emerald-600 text-xs">
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
				)}
			</ScrollArea>

			{/* Actions en attente */}
			{chat.pendingActions.length > 0 && (
				<div className="border-t bg-amber-50 dark:bg-amber-950/20 p-2 space-y-1.5">
					<Badge variant="outline" className="text-[9px] text-amber-700 border-amber-300">
						Action(s) en attente
					</Badge>
					{chat.pendingActions.map((action, i) => (
						<div key={i} className="flex items-center justify-between bg-background rounded-md p-2 border border-amber-200 text-xs">
							<span className="font-medium">{action.reason ?? action.type}</span>
							<div className="flex gap-1">
								<Button size="sm" variant="outline" onClick={() => chat.rejectAction(action)} className="h-6 text-[10px]">
									Annuler
								</Button>
								<Button size="sm" onClick={() => chat.confirmAction(action)} className="h-6 text-[10px]">
									Confirmer
								</Button>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Input */}
			<div className="border-t p-3 flex items-end gap-2">
				<Textarea
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Posez une question à iAsted..."
					className="min-h-[36px] max-h-[120px] resize-none text-sm"
					rows={1}
				/>
				<Button
					size="icon"
					onClick={handleSend}
					disabled={!input.trim() || chat.isLoading}
					className="h-9 w-9 shrink-0 bg-emerald-600 hover:bg-emerald-700"
				>
					{chat.isLoading ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Send className="h-4 w-4" />
					)}
				</Button>
			</div>
		</div>
	);
}
