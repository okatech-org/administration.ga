"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import {
	Clock,
	Headset,
	Info,
	LifeBuoy,
	Loader2,
	Mail,
	MessageSquare,
	Send,
	User,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ProfileViewSheet } from "@/components/dashboard/ProfileViewSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { SectionHeader } from "@/components/design-system/section-header";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";

export const Route = createFileRoute("/_app/support/$ticketId")({
	component: SuperadminTicketDetail,
});

function SuperadminTicketDetail() {
	const { t, i18n } = useTranslation();
	const { ticketId } = useParams({ strict: false }) as { ticketId: string };
	const dateLocale = i18n.language === "en" ? enUS : fr;

	const [replyMessage, setReplyMessage] = useState("");
	const [profileSheetOpen, setProfileSheetOpen] = useState(false);

	const { data: ticket, isPending } = useAuthenticatedConvexQuery(
		api.functions.tickets.get,
		{ ticketId: ticketId as Id<"tickets"> },
	);

	const { data: senderProfile } = useAuthenticatedConvexQuery(
		api.functions.profiles.getByUserId,
		ticket ? { userId: ticket.userId } : "skip",
	);

	const { mutateAsync: addMessage, isPending: isSending } =
		useConvexMutationQuery(api.functions.tickets.addMessage);

	const { mutateAsync: updateStatus } = useConvexMutationQuery(
		api.functions.tickets.updateStatus,
	);

	const handleSendReply = async () => {
		if (!replyMessage.trim()) return;

		try {
			await addMessage({
				ticketId: ticketId as Id<"tickets">,
				content: replyMessage.trim(),
			});
			setReplyMessage("");
			toast.success("Message envoyé avec succès");
		} catch (error) {
			console.error("Failed to send reply", error);
			toast.error("Erreur lors de l'envoi du message");
		}
	};

	const handleStatusChange = async (newStatus: string) => {
		try {
			await updateStatus({
				ticketId: ticketId as Id<"tickets">,
				status: newStatus as any,
			});
			toast.success("Statut mis à jour");
		} catch (error) {
			console.error("Failed to update status", error);
			toast.error("Erreur lors de la mise à jour du statut");
		}
	};

	if (isPending) {
		return (
			<div className="flex h-full items-center justify-center p-8">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	if (!ticket) {
		return (
			<div className="flex flex-col items-center justify-center h-[50vh] text-center">
				<LifeBuoy className="h-12 w-12 text-muted-foreground/30 mb-4" />
				<h2 className="text-xl font-semibold mb-2">Ticket introuvable</h2>
				<p className="text-muted-foreground mb-6">
					Ce ticket n'existe pas ou a été supprimé.
				</p>
				<Button variant="outline" asChild>
					<Link to="/support">Retour à la liste</Link>
				</Button>
			</div>
		);
	}

	return (
		<div className="flex min-h-full flex-col gap-4 p-3 md:p-4 max-w-5xl mx-auto w-full">
			<PageHeader
				icon={<LifeBuoy className="h-5 w-5" />}
				title={ticket.subject}
				showBackButton
			/>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				<div className="lg:col-span-2 space-y-4">
					{/* Original Message */}
					<FlatCard>
						<div className="py-4 px-5 bg-muted/40 border-b border-border/40 flex flex-row items-center gap-3 rounded-t-xl">
							<div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
								<User className="h-5 w-5" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium">
									Message initial
								</p>
								<div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
									<Clock className="h-3 w-3" />
									{format(new Date(ticket._creationTime), "dd MMM yyyy HH:mm", {
										locale: dateLocale,
									})}
								</div>
							</div>
						</div>
						<div className="p-3 lg:p-4 text-sm whitespace-pre-wrap leading-relaxed">
							{ticket.description}
						</div>
					</FlatCard>

					{/* Conversation thread */}
					{ticket.messages && ticket.messages.length > 0 && (
						<div className="space-y-4">
							<h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 px-1">
								<MessageSquare className="h-4 w-4" />
								Historique des échanges
							</h3>
							{ticket.messages.map((msg) => (
								<FlatCard
									key={msg.id}
									className={msg.isStaff ? "ring-1 ring-primary/30" : ""}
								>
									<div
										className={`py-3 px-5 border-b border-border/40 flex flex-row items-center gap-3 rounded-t-xl ${msg.isStaff ? "bg-primary/5" : "bg-muted/40"}`}
									>
										<div
											className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${msg.isStaff ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}
										>
											{msg.isStaff ? (
												<Headset className="h-4 w-4" />
											) : (
												<User className="h-4 w-4" />
											)}
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium">
												{msg.isStaff ? "Support (Vous / Équipe)" : "Citoyen"}
											</p>
											<div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
												<Clock className="h-3 w-3" />
												{format(new Date(msg.createdAt), "dd MMM yyyy HH:mm", {
													locale: dateLocale,
												})}
											</div>
										</div>
									</div>
									<div className="p-3 lg:p-4 text-sm whitespace-pre-wrap leading-relaxed">
										{msg.content}
									</div>
								</FlatCard>
							))}
						</div>
					)}

					{/* Reply box */}
					<FlatCard className="ring-1 ring-primary/20">
						<div className="py-4 px-5 bg-muted/20 border-b border-border/40 rounded-t-xl">
							<p className="text-base font-bold flex items-center gap-2">
								<Send className="h-4 w-4 text-primary" />
								Répondre
							</p>
						</div>
						<div className="p-3 lg:p-4">
							<Textarea
								placeholder="Saisissez votre message..."
								value={replyMessage}
								onChange={(e) => setReplyMessage(e.target.value)}
								className="min-h-[120px] resize-y"
							/>
						</div>
						<div className="flex justify-end px-4 pb-4">
							<Button
								onClick={handleSendReply}
								disabled={isSending || !replyMessage.trim()}
							>
								{isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								Envoyer la réponse
							</Button>
						</div>
					</FlatCard>
				</div>

				{/* Sidebar Details */}
				<div className="space-y-4">
					<FlatCard>
						<div className="p-3 lg:p-4">
							<SectionHeader
								icon={<Info className="h-4 w-4" />}
								title="Détails"
							/>
							<div className="space-y-4 text-sm">
							<div>
								<span className="text-muted-foreground block mb-1 text-xs">
									Référence
								</span>
								<Badge variant="outline" className="font-mono">
									{ticket.reference}
								</Badge>
							</div>

							<div>
								<span className="text-muted-foreground block mb-1 text-xs">
									Catégorie
								</span>
								<Badge variant="secondary" className="font-normal">
									{t(`support.ticketCategory.${ticket.category}`)}
								</Badge>
							</div>

							<div>
								<span className="text-muted-foreground block mb-1 text-xs">
									Statut
								</span>
								<Select
									value={ticket.status}
									onValueChange={handleStatusChange}
								>
									<SelectTrigger className="w-full h-8">
										<SelectValue placeholder="Statut" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="open">Ouvert</SelectItem>
										<SelectItem value="in_progress">En cours</SelectItem>
										<SelectItem value="waiting_for_user">
											En attente client
										</SelectItem>
										<SelectItem value="resolved">Résolu</SelectItem>
										<SelectItem value="closed">Fermé</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div>
								<span className="text-muted-foreground block mb-1 text-xs">
									Priorité
								</span>
								<Badge variant="outline">
									{t(`support.ticketPriority.${ticket.priority}`)}
								</Badge>
							</div>

							{/* Section Expéditeur & Messagerie */}
							<div className="pt-4 border-t mt-4">
								<span className="text-muted-foreground block mb-3 text-xs font-semibold uppercase tracking-wider">
									Expéditeur
								</span>
								<div className="bg-muted/30 rounded-lg p-3 border space-y-3">
									<div className="flex items-center gap-3">
										<div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium">
											{senderProfile?.identity?.firstName?.[0] || "?"}
											{senderProfile?.identity?.lastName?.[0] || ""}
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium truncate">
												{senderProfile
													? `${senderProfile.identity?.firstName || ""} ${senderProfile.identity?.lastName || ""}`
													: "Chargement..."}
											</p>
											<p className="text-xs text-muted-foreground truncate">
												{senderProfile?.contacts?.email || "Citoyen"}
											</p>
										</div>
									</div>
									<div className="flex flex-col gap-2 pt-1">
										<Button
											variant="secondary"
											size="sm"
											className="w-full text-xs h-8"
											onClick={() => setProfileSheetOpen(true)}
										>
											<User className="h-3.5 w-3.5 mr-2 shrink-0" />
											Voir le profil
										</Button>
										<Button
											variant="outline"
											size="sm"
											className="w-full text-xs h-8 bg-background"
											asChild
										>
											<Link to="/my-space/iboite">
												<Mail className="h-3.5 w-3.5 mr-2 shrink-0 text-primary" />
												Envoyer un message
											</Link>
										</Button>
									</div>
								</div>
							</div>
						</div>
						</div>
					</FlatCard>
				</div>
			</div>

			{senderProfile && (
				<ProfileViewSheet
					profileId={senderProfile._id}
					open={profileSheetOpen}
					onOpenChange={setProfileSheetOpen}
				/>
			)}
		</div>
	);
}
