"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
	AlertTriangle,
	Bell,
	CheckCheck,
	Clock,
	CreditCard,
	FileText,
	MessageSquare,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	useAuthenticatedConvexQuery,
	useAuthenticatedPaginatedQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

const notificationIcons: Record<string, typeof Bell> = {
	new_message: MessageSquare,
	status_update: FileText,
	payment_success: CreditCard,
	action_required: AlertTriangle,
	reminder: Clock,
};

interface NotificationDropdownProps {
	className?: string;
}

export function NotificationDropdown({ className }: NotificationDropdownProps) {
	const { t } = useTranslation();
	const { data: unreadCount } = useAuthenticatedConvexQuery(
		api.functions.notifications.getUnreadCount,
		{},
	);
	const { results: notifications } = useAuthenticatedPaginatedQuery(
		api.functions.notifications.list,
		{},
		{ initialNumItems: 10 },
	);
	const { mutateAsync: markAsRead } = useConvexMutationQuery(
		api.functions.notifications.markAsRead,
	);
	const { mutateAsync: markAllAsRead } = useConvexMutationQuery(
		api.functions.notifications.markAllAsRead,
	);

	const handleNotificationClick = async (
		notificationId: Id<"notifications">,
	) => {
		await markAsRead({ notificationId });
	};

	const handleMarkAllRead = async () => {
		await markAllAsRead({});
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className={cn("relative rounded-full", className)}
				>
					<Bell className="size-5" />
					{(unreadCount ?? 0) > 0 && (
						<Badge
							variant="destructive"
							className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs flex items-center justify-center"
						>
							{(unreadCount ?? 0) > 99 ? "99+" : unreadCount}
						</Badge>
					)}
					<span className="sr-only">{t("notifications.title")}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-80">
				<DropdownMenuLabel className="flex items-center justify-between">
					<span>{t("notifications.title")}</span>
					{unreadCount && unreadCount > 0 && (
						<Button
							variant="ghost"
							size="sm"
							className="h-auto py-1 px-2 text-xs"
							onClick={handleMarkAllRead}
						>
							<CheckCheck className="size-3 mr-1" />
							{t("notifications.markAllRead")}
						</Button>
					)}
				</DropdownMenuLabel>
				<DropdownMenuSeparator />

				{notifications.length === 0 ? (
					<div className="py-8 text-center text-muted-foreground">
						<Bell className="size-8 mx-auto mb-2 opacity-50" />
						<p className="text-sm">{t("notifications.empty.title")}</p>
					</div>
				) : (
					<ScrollArea className="h-[300px]">
						{notifications.map((notification) => {
							const Icon = notificationIcons[notification.type] || Bell;
							const timeAgo = formatDistanceToNow(
								new Date(notification.createdAt),
								{
									addSuffix: true,
									locale: fr,
								},
							);

							return (
								<DropdownMenuItem
									key={notification._id}
									className={cn(
										"flex items-start gap-3 p-3 cursor-pointer",
										!notification.isRead && "bg-primary/5",
									)}
									onClick={() => handleNotificationClick(notification._id)}
									asChild
								>
									<Link to={notification.link || "/notifications"}>
										<div
											className={cn(
												"p-2 rounded-full shrink-0",
												notification.isRead
													? "bg-muted text-muted-foreground"
													: "bg-primary/10 text-primary",
											)}
										>
											<Icon className="size-4" />
										</div>
										<div className="flex-1 min-w-0">
											<p
												className={cn(
													"text-sm line-clamp-1",
													!notification.isRead && "font-medium",
												)}
											>
												{notification.title}
											</p>
											<p className="text-xs text-muted-foreground line-clamp-2">
												{notification.body}
											</p>
											<p className="text-xs text-muted-foreground mt-1">
												{timeAgo}
											</p>
										</div>
										{!notification.isRead && (
											<div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
										)}
									</Link>
								</DropdownMenuItem>
							);
						})}
					</ScrollArea>
				)}

				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link
						to="/my-space/notifications"
						className="w-full text-center justify-center text-primary"
					>
						{t("notifications.viewAll")}
					</Link>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
