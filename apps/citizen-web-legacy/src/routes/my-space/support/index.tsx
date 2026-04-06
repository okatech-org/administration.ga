import { api } from "@convex/_generated/api";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { LifeBuoy, Loader2, MessageSquare, PlusCircle } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/my-space/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthenticatedPaginatedQuery } from "@/integrations/convex/hooks";

export const Route = createFileRoute("/my-space/support/")({
	component: SupportPage,
});

function SupportPage() {
	const { t, i18n } = useTranslation();
	const dateLocale = i18n.language === "en" ? enUS : fr;

	const {
		results: tickets,
		status: paginationStatus,
		loadMore,
		isLoading: isPending,
	} = useAuthenticatedPaginatedQuery(
		api.functions.tickets.listMine,
		{},
		{ initialNumItems: 20 },
	);

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "open":
				return (
					<Badge className="bg-blue-500 hover:bg-blue-600">
						{t("support.ticketStatus.open")}
					</Badge>
				);
			case "in_progress":
				return (
					<Badge className="bg-amber-500 hover:bg-amber-600">
						{t("support.ticketStatus.in_progress")}
					</Badge>
				);
			case "waiting_for_user":
				return (
					<Badge className="bg-purple-500 hover:bg-purple-600">
						{t("support.ticketStatus.waiting_for_user")}
					</Badge>
				);
			case "resolved":
				return (
					<Badge className="bg-green-500 hover:bg-green-600">
						{t("support.ticketStatus.resolved")}
					</Badge>
				);
			case "closed":
				return (
					<Badge variant="outline" className="text-muted-foreground">
						{t("support.ticketStatus.closed")}
					</Badge>
				);
			default:
				return <Badge variant="outline">{status}</Badge>;
		}
	};

	const getCategoryLabel = (category: string) => {
		return t(`support.ticketCategory.${category}`);
	};

	if (isPending && tickets.length === 0) {
		return (
			<div className="flex justify-center p-8">
				<Loader2 className="animate-spin h-8 w-8 text-primary" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<PageHeader
				title={t("support.heading")}
				subtitle={t("support.subtitle")}
				icon={<LifeBuoy className="h-6 w-6 text-primary" />}
				actions={
					<Button asChild>
						<Link to="/my-space/support/new">
							<PlusCircle className="mr-2 h-4 w-4" />
							{t("support.new")}
						</Link>
					</Button>
				}
			/>

			{/* Content */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2, delay: 0.1 }}
			>
				{!tickets || tickets.length === 0 ? (
					<Card>
						<CardContent className="flex flex-col items-center justify-center py-16 text-center">
							<LifeBuoy className="h-16 w-16 mb-4 text-muted-foreground/30" />
							<h3 className="text-lg font-medium mb-2">
								{t("support.tickets.empty.title")}
							</h3>
							<p className="text-muted-foreground mb-6 max-w-sm">
								{t("support.tickets.empty.desc")}
							</p>
							<Button asChild>
								<Link to="/my-space/support/new">
									<PlusCircle className="mr-2 h-4 w-4" />
									{t("support.tickets.empty.action")}
								</Link>
							</Button>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{tickets.map((ticket: (typeof tickets)[0]) => (
							<Link
								key={ticket._id}
								to="/my-space/support/$ticketId"
								params={{ ticketId: ticket._id }}
								className="block transition-transform hover:scale-[1.01] active:scale-[0.99] h-full"
							>
								<Card className="h-full flex flex-col hover:border-primary/50 transition-colors">
									<div className="p-5 flex-1 flex flex-col">
										<div className="flex justify-between items-start mb-3 gap-2">
											<div className="flex gap-2 items-center flex-wrap">
												<Badge
													variant="secondary"
													className="font-mono text-xs"
												>
													{ticket.reference}
												</Badge>
												{getStatusBadge(ticket.status)}
											</div>
										</div>

										<h3 className="font-semibold text-lg line-clamp-2 mb-1">
											{ticket.subject}
										</h3>

										<p className="text-sm text-muted-foreground mb-4">
											{getCategoryLabel(ticket.category)}
										</p>

										<div className="mt-auto pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
											<span>
												{format(new Date(ticket._creationTime), "dd MMM yyyy", {
													locale: dateLocale,
												})}
											</span>

											{ticket.messages && ticket.messages.length > 0 && (
												<div className="flex items-center gap-1">
													<MessageSquare className="h-3 w-3" />
													<span>{ticket.messages.length}</span>
												</div>
											)}
										</div>
									</div>
								</Card>
							</Link>
						))}
					</div>
				)}

				{/* Load More */}
				{paginationStatus === "CanLoadMore" && (
					<div className="flex justify-center mt-6">
						<Button variant="outline" onClick={() => loadMore(20)}>
							{t("common.loadMore", "Charger plus")}
						</Button>
					</div>
				)}
				{paginationStatus === "LoadingMore" && (
					<div className="flex justify-center mt-6">
						<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
					</div>
				)}
			</motion.div>
		</div>
	);
}
