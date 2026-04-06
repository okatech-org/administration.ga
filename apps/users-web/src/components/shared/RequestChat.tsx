import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

import { MessageSquare, Paperclip, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

interface RequestChatProps {
	requestId: Id<"requests">;
	className?: string;
}

export function RequestChat({ requestId, className }: RequestChatProps) {
	const { t } = useTranslation();
	const [message, setMessage] = useState("");
	const [isSending, setIsSending] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const { data: messages, isLoading } = useAuthenticatedConvexQuery(
		api.functions.messages.listByRequest,
		{ requestId },
	);

	const { mutateAsync: sendMessage } = useConvexMutationQuery(
		api.functions.messages.send,
	);
	const { mutateAsync: markAsRead } = useConvexMutationQuery(
		api.functions.messages.markAsRead,
	);

	// Scroll to bottom when new messages arrive
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	// Mark messages as read when viewing
	useEffect(() => {
		if (messages && messages.length > 0) {
			markAsRead({ requestId }).catch(() => {
				// Silent fail for read receipts
			});
		}
	}, [messages, requestId, markAsRead]);

	const handleSend = async () => {
		if (!message.trim() || isSending) return;

		setIsSending(true);
		try {
			await sendMessage({
				requestId,
				content: message.trim(),
			});
			setMessage("");
		} catch (error) {
			console.error("Failed to send message:", error);
		} finally {
			setIsSending(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	const formatTime = (timestamp: number) => {
		return new Date(timestamp).toLocaleTimeString(undefined, {
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const formatDate = (timestamp: number) => {
		const date = new Date(timestamp);
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		if (date.toDateString() === today.toDateString()) {
			return t("common.today");
		}
		if (date.toDateString() === yesterday.toDateString()) {
			return t("common.yesterday");
		}
		return date.toLocaleDateString(undefined, {
			day: "numeric",
			month: "long",
		});
	};

	// Group messages by date
	const groupedMessages = messages?.reduce(
		(groups, msg) => {
			const dateKey = new Date(msg.createdAt).toDateString();
			if (!groups[dateKey]) {
				groups[dateKey] = [];
			}
			groups[dateKey].push(msg);
			return groups;
		},
		{} as Record<string, typeof messages>,
	);

	if (isLoading) {
		return (
			<div className={cn("flex items-center justify-center p-8", className)}>
				<div className="animate-pulse text-muted-foreground">
					{t("common.loading")}
				</div>
			</div>
		);
	}

	return (
		<div className={cn("flex flex-col h-full", className)}>
			{/* Header */}
			<div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
				<MessageSquare className="h-5 w-5 text-muted-foreground" />
				<h3 className="font-medium">{t("requests.chat.title")}</h3>
				{messages && messages.length > 0 && (
					<span className="text-sm text-muted-foreground">
						({messages.length})
					</span>
				)}
			</div>

			{/* Messages */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				{!messages || messages.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
						<MessageSquare className="h-12 w-12 mb-4 opacity-20" />
						<p className="text-sm">
							{t("requests.chat.empty")}
						</p>
						<p className="text-xs mt-1">
							{t(
								"requests.chat.emptyHint",
								"Envoyez un message pour démarrer la conversation",
							)}
						</p>
					</div>
				) : (
					Object.entries(groupedMessages || {}).map(([dateKey, msgs]) => (
						<div key={dateKey}>
							{/* Date separator */}
							<div className="flex items-center justify-center my-4">
								<div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
									{formatDate(msgs![0].createdAt)}
								</div>
							</div>

							{/* Messages for this date */}
							{msgs?.map((msg) => (
								<div
									key={msg._id}
									className={cn(
										"flex gap-3 mb-3",
										msg.senderRole === "citizen" && "flex-row-reverse",
									)}
								>
									<Avatar className="h-8 w-8 shrink-0">
										<AvatarImage src={msg.sender?.avatarUrl} />
										<AvatarFallback className="text-xs">
											{msg.sender?.firstName?.[0]}
											{msg.sender?.lastName?.[0]}
										</AvatarFallback>
									</Avatar>
									<div
										className={cn(
											"max-w-[70%] rounded-2xl px-4 py-2",
											msg.senderRole === "citizen"
												? "bg-primary text-primary-foreground rounded-br-sm"
												: "bg-muted rounded-bl-sm",
										)}
									>
										<p className="text-sm whitespace-pre-wrap break-words">
											{msg.content}
										</p>
										<div
											className={cn(
												"flex items-center gap-1 mt-1 text-xs",
												msg.senderRole === "citizen"
													? "text-primary-foreground/70 justify-end"
													: "text-muted-foreground",
											)}
										>
											<span>{formatTime(msg.createdAt)}</span>
											{msg.readAt && msg.senderRole === "citizen" && (
												<span></span>
											)}
										</div>
									</div>
								</div>
							))}
						</div>
					))
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Input */}
			<div className="border-t p-4 bg-background">
				<div className="flex gap-2 items-end">
					<Button
						variant="ghost"
						size="icon"
						className="shrink-0"
						disabled
						title={t("requests.chat.attachFile")}
					>
						<Paperclip className="h-5 w-5" />
					</Button>
					<Textarea
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={t(
							"requests.chat.placeholder",
							"Écrivez votre message...",
						)}
						className="min-h-[44px] max-h-32 resize-none"
						rows={1}
					/>
					<Button
						onClick={handleSend}
						disabled={!message.trim() || isSending}
						size="icon"
						className="shrink-0"
					>
						<Send className="h-5 w-5" />
					</Button>
				</div>
			</div>
		</div>
	);
}
