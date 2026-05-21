"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import {
	ChevronLeft,
	Headset,
	LifeBuoy,
	Loader2,
	Send,
	User,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PageHeader } from "@/components/my-space/page-header";
import { ContentDetailSkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/my-space/flat-card";
import { Textarea } from "@/components/ui/textarea";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";

export default function TicketDetailPage() {
	const { t, i18n } = useTranslation();
	const { ticketId } = useParams<{ ticketId: string }>();
	const dateLocale = i18n.language === "en" ? enUS : fr;

	const [replyMessage, setReplyMessage] = useState("");

	const { data: ticket, isPending } = useAuthenticatedConvexQuery(
		api.functions.tickets.get,
		{ ticketId: ticketId as Id<"tickets"> },
	);

	const { mutateAsync: addMessage, isPending: isSending } =
		useConvexMutationQuery(api.functions.tickets.addMessage);

	const handleSendReply = async () => {
		if (!replyMessage.trim()) return;

		try {
			await addMessage({
				ticketId: ticketId as Id<"tickets">,
				content: replyMessage.trim(),
			});
			setReplyMessage("");
			toast.success(t("support.tickets.messageSent"));
		} catch (error) {
			console.error("Failed to send reply", error);
			toast.error(
				t("support.tickets.messageError"),
			);
		}
	};

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

	if (isPending) {
		return <ContentDetailSkeleton />;
	}

	if (!ticket) {
		return (
			<div className="p-8 text-center text-muted-foreground">
				Ticket introuvable
			</div>
		);
	}

	return (
		<div className="space-y-6 max-w-4xl mx-auto">
			<Button
				variant="ghost"
				asChild
				className="mb-2 -ml-4 text-muted-foreground hover:text-foreground"
			>
				<Link href="/my-space/support">
					<ChevronLeft className="mr-2 h-4 w-4" />
					Retour
				</Link>
			</Button>

			<div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
				<div className="flex-1">
					<div className="flex items-center gap-3 mb-2">
						<Badge
							variant="outline"
							className="font-mono text-sm bg-background"
						>
							{ticket.reference}
						</Badge>
						{getStatusBadge(ticket.status)}
					</div>
					<h1 className="text-2xl font-bold">{ticket.subject}</h1>
					<p className="text-muted-foreground mt-1 text-sm">
						{t("support.tickets.detail.createdAt")}{" "}
						{format(new Date(ticket._creationTime), "dd MMMM yyyy HH:mm", {
							locale: dateLocale,
						})}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Badge variant="secondary">
						{t(`support.ticketCategory.${ticket.category}`)}
					</Badge>
					<Badge variant="outline">
						{t(`support.ticketPriority.${ticket.priority}`)}
					</Badge>
				</div>
			</div>

			<div className="space-y-4 pt-4">
				{/* Initial message */}
				<FlatCard>
					<div className="py-4 px-5 bg-muted/40 border-b flex flex-row items-center gap-3">
						<div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
							<User className="h-4 w-4" />
						</div>
						<div className="flex-1">
							<div className="text-sm font-medium">Vous</div>
							<div className="text-xs text-muted-foreground mt-0.5">
								{format(new Date(ticket._creationTime), "dd MMM yyyy HH:mm", {
									locale: dateLocale,
								})}
							</div>
						</div>
					</div>
					<div className="p-3 lg:p-4 pt-5 text-sm whitespace-pre-wrap leading-relaxed">
						{ticket.description}
					</div>
				</FlatCard>

				{/* Conversation thread */}
				{ticket.messages?.map((msg) => (
					<FlatCard
						key={msg.id}
						className={msg.isStaff ? "bg-primary/5" : ""}
					>
						<div
							className={`py-3 px-5 border-b flex flex-row items-center gap-3 ${msg.isStaff ? "bg-primary/10" : "bg-muted/40"}`}
						>
							<div
								className={`h-8 w-8 rounded-full flex items-center justify-center ${msg.isStaff ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}
							>
								{msg.isStaff ? (
									<Headset className="h-4 w-4" />
								) : (
									<User className="h-4 w-4" />
								)}
							</div>
							<div className="flex-1">
								<div className="text-sm font-medium">
									{msg.isStaff ? "Support Consulaire" : "Vous"}
								</div>
								<div className="text-xs text-muted-foreground mt-0.5">
									{format(new Date(msg.createdAt), "dd MMM yyyy HH:mm", {
										locale: dateLocale,
									})}
								</div>
							</div>
						</div>
						<div className="p-3 lg:p-4 pt-4 pb-5 text-sm whitespace-pre-wrap leading-relaxed">
							{msg.content}
						</div>
					</FlatCard>
				))}
			</div>

			{/* Reply box */}
			{ticket.status !== "closed" && ticket.status !== "resolved" && (
				<FlatCard className="mt-8">
					<div className="p-3 lg:p-4 pb-0 py-4">
						<div className="text-base flex items-center gap-2 font-semibold">
							<Send className="h-4 w-4 text-primary" />
							{t("support.tickets.detail.reply")}
						</div>
					</div>
					<div className="p-3 lg:p-4">
						<Textarea
							placeholder={t("support.tickets.detail.replyPlaceholder")}
							value={replyMessage}
							onChange={(e) => setReplyMessage(e.target.value)}
							className="min-h-[120px] resize-none"
						/>
					</div>
					<div className="flex justify-end pt-0 pb-4 pr-6">
						<Button
							onClick={handleSendReply}
							disabled={isSending || !replyMessage.trim()}
						>
							{isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							{t("support.tickets.detail.sendReply")}
						</Button>
					</div>
				</FlatCard>
			)}

			{(ticket.status === "closed" || ticket.status === "resolved") && (
				<div className="mt-8 p-6 text-center border rounded-lg bg-muted/40">
					<LifeBuoy className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
					<h3 className="text-lg font-medium">
						{t("support.tickets.closedTitle")}
					</h3>
					<p className="text-muted-foreground mt-1">
						{t(
							"support.tickets.closedDesc",
							"Vous ne pouvez plus repondre a ce ticket. Si le probleme persiste, veuillez ouvrir un nouveau ticket.",
						)}
					</p>
					<Button variant="outline" className="mt-4" asChild>
						<Link href="/my-space/support/new">{t("support.new")}</Link>
					</Button>
				</div>
			)}
		</div>
	);
}
