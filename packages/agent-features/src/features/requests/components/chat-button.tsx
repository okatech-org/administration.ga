"use client";

import type { Id } from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Textarea } from "@workspace/ui/components/textarea";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";

interface ChatButtonProps {
	orgId: Id<"orgs">;
	/** UserId of the person to chat with */
	participantUserId: Id<"users">;
	/** Optional: link the chat to a request */
	requestId?: Id<"requests">;
	/** Display label */
	label?: string;
	/** Button variant */
	variant?: "default" | "outline" | "ghost" | "secondary";
	size?: "default" | "sm" | "lg" | "icon";
	className?: string;
}

/**
 * ChatButton — Initiates a P2P chat with a user.
 * Used by agents to start a conversation from the request detail page.
 * Opens a dialog to compose the first message, then creates the chat thread.
 */
export function ChatButton({
	orgId,
	participantUserId,
	requestId,
	label,
	variant = "outline",
	size = "sm",
	className,
}: ChatButtonProps) {
	const { t } = useTranslation();
	const displayLabel = label ?? t("chat.action", "Chatter");

	const [dialogOpen, setDialogOpen] = useState(false);
	const [messageInput, setMessageInput] = useState("");

	// Check if a chat already exists
	const { data: existingChat } = useAuthenticatedConvexQuery(
		api.functions.chats.findChatWith,
		{ targetUserId: participantUserId },
	);

	const { mutateAsync: initiateChat, isPending: isInitiating } =
		useConvexMutationQuery(api.functions.chats.initiateChat);
	const { mutateAsync: sendMessage, isPending: isSending } =
		useConvexMutationQuery(api.functions.chats.sendMessage);

	const isBusy = isInitiating || isSending;

	const handleClick = useCallback(() => {
		setDialogOpen(true);
	}, []);

	const handleSend = useCallback(async () => {
		const text = messageInput.trim();
		if (!text) return;

		try {
			if (existingChat) {
				await sendMessage({ chatId: existingChat._id, content: text });
			} else {
				await initiateChat({
					targetUserId: participantUserId,
					orgId,
					requestId,
					initialMessage: text,
				});
			}
			setMessageInput("");
			setDialogOpen(false);
			toast.success(t("chat.sent", "Message envoyé"));
		} catch (e: any) {
			toast.error(e?.data ?? e?.message ?? t("chat.error", "Erreur d'envoi"));
		}
	}, [messageInput, existingChat, sendMessage, initiateChat, participantUserId, orgId, requestId, t]);

	return (
		<>
			<Button
				variant={variant}
				size={size}
				onClick={handleClick}
				className={className}
			>
				<MessageSquare className="w-4 h-4 mr-1.5" />
				{displayLabel}
			</Button>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="text-sm">
							{existingChat
								? t("chat.continueConversation", "Envoyer un message")
								: t("chat.startConversation", "Démarrer une conversation")}
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<Textarea
							value={messageInput}
							onChange={(e) => setMessageInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									handleSend();
								}
							}}
							placeholder={t("chat.placeholder", "Écrivez votre message...")}
							className="min-h-[80px] resize-none text-sm"
							rows={3}
							autoFocus
						/>
						<div className="flex justify-end">
							<Button
								onClick={handleSend}
								disabled={!messageInput.trim() || isBusy}
								size="sm"
							>
								{isBusy ? (
									<Loader2 className="w-4 h-4 animate-spin mr-1.5" />
								) : (
									<Send className="w-4 h-4 mr-1.5" />
								)}
								{t("chat.send", "Envoyer")}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
