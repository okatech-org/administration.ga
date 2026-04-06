import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
	AlertTriangle,
	Bell,
	CheckCheck,
	Clock,
	CreditCard,
	FileText,
	Inbox,
	MessageSquare,
} from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/my-space/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	useAuthenticatedConvexQuery,
	useAuthenticatedPaginatedQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/my-space/notifications")({
	component: NotificationsPage,
});

const notificationIcons: Record<string, typeof Bell> = {
	new_message: MessageSquare,
	status_update: FileText,
	payment_success: CreditCard,
	action_required: AlertTriangle,
	reminder: Clock,
};

function NotificationsPage() {
	const { t } = useTranslation();
	const {
		results: notifications,
		status: paginationStatus,
		loadMore,
	} = useAuthenticatedPaginatedQuery(
		api.functions.notifications.list,
		{},
		{ initialNumItems: 50 },
	);
	const { data: unreadCount, isLoading: unreadCountLoading } =
		useAuthenticatedConvexQuery(api.functions.notifications.getUnreadCount, {});
	const { mutate: markAsRead } = useConvexMutationQuery(
		api.functions.notifications.markAsRead,
	);
	const { mutate: markAllAsRead } = useConvexMutationQuery(
		api.functions.notifications.markAllAsRead,
	);

	const handleMarkAsRead = async (notificationId: Id<"notifications">) => {
		await markAsRead({ notificationId });
	};

	const handleMarkAllRead = async () => {
		await markAllAsRead({});
	};

	return (
		<div className="space-y-6">
			<PageHeader
				title={t("mySpace.screens.notifications.heading")}
				subtitle={t(
					"mySpace.screens.notifications.subtitle",
					"Restez informé de vos activités",
				)}
				icon={<Bell className="size-6" />}
				actions={
					unreadCount && unreadCount > 0 && !unreadCountLoading ? (
						<Button variant="outline" size="sm" onClick={handleMarkAllRead}>
							<CheckCheck className="size-4 mr-2" />
							{t("notifications.markAllRead")}
						</Button>
					) : null
				}
			/>

			{notifications.length === 0 ? (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.2 }}
				>
					<Card>
						<CardContent className="flex flex-col items-center justify-center py-16 text-center">
							<div className="relative mb-6">
								<Inbox className="h-16 w-16 text-muted-foreground/30" />
							</div>
							<h3 className="text-lg font-medium mb-2">
								{t("notifications.empty.title")}
							</h3>
							<p className="text-sm text-muted-foreground max-w-sm">
								{t(
									"notifications.empty.description",
									"Vous n'avez aucune notification pour le moment. Les mises à jour de vos demandes apparaîtront ici.",
								)}
							</p>
						</CardContent>
					</Card>
				</motion.div>
			) : (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.2 }}
					className="space-y-2"
				>
					{notifications.map((notification: any, index: number) => {
						const Icon = notificationIcons[notification.type] || Bell;
						const timeAgo = formatDistanceToNow(
							new Date(notification.createdAt),
							{
								addSuffix: true,
								locale: fr,
							},
						);

						return (
							<motion.div
								key={notification._id}
								initial={{ opacity: 0, x: -10 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ duration: 0.2, delay: index * 0.03 }}
							>
								<Card
									className={cn(
										"cursor-pointer transition-all hover:shadow-md",
										!notification.isRead && "border-primary/30 bg-primary/5",
									)}
									onClick={() => handleMarkAsRead(notification._id)}
								>
									<CardContent className="p-4">
										<Link
											to={notification.link || "/notifications"}
											className="flex items-start gap-4"
										>
											<div
												className={cn(
													"p-3 rounded-full shrink-0",
													notification.isRead
														? "bg-muted text-muted-foreground"
														: "bg-primary/10 text-primary",
												)}
											>
												<Icon className="size-5" />
											</div>
											<div className="flex-1 min-w-0">
												<div className="flex items-start justify-between gap-2">
													<p
														className={cn(
															"text-sm",
															!notification.isRead && "font-semibold",
														)}
													>
														{notification.title}
													</p>
													{!notification.isRead && (
														<Badge
															variant="default"
															className="shrink-0 text-xs"
														>
															{t("notifications.new")}
														</Badge>
													)}
												</div>
												<p className="text-sm text-muted-foreground mt-1 line-clamp-2">
													{notification.body}
												</p>
												<p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
													<Clock className="size-3" />
													{timeAgo}
												</p>
											</div>
										</Link>
									</CardContent>
								</Card>
							</motion.div>
						);
					})}

					{paginationStatus === "CanLoadMore" && (
						<div className="text-center py-4">
							<Button variant="outline" onClick={() => loadMore(50)}>
								{t("notifications.loadMore")}
							</Button>
						</div>
					)}
				</motion.div>
			)}
		</div>
	);
}
