/**
 * iAsted — Assistant Consulaire Intelligent
 *
 * AI-powered assistant for citizens with audio/video call features.
 * Helps with consular services: passeport, visa, état civil, etc.
 * Includes quick actions for support, appointments, and ticket management.
 *
 * Tab 1: Assistant — Chat interface with audio/video call simulation.
 * Tab 2: Mes Tickets — Support ticket list with pagination.
 */

import { api } from "@convex/_generated/api";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import {
	Bot,
	Calendar,
	Clock,
	LifeBuoy,
	Loader2,
	MessageCircle,
	MessageSquare,
	Mic,
	MicOff,
	Phone,
	PlusCircle,
	Send,
	Ticket,
	Video,
} from "lucide-react";
import { motion } from "motion/react";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { EmptyState } from "@/components/my-space/empty-state";
import { FlatCard } from "@/components/my-space/flat-card";
import { PageHeader } from "@/components/my-space/page-header";
import { TabSwitcher } from "@/components/my-space/tab-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthenticatedPaginatedQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

interface Message {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: Date;
}

interface CallSession {
	active: boolean;
	type?: "audio" | "video";
	startTime?: Date;
	duration: number;
}

type ActiveTab = "assistant" | "tickets";

const IAstedPage = () => {
	const { t, i18n } = useTranslation();
	const dateLocale = i18n.language === "en" ? enUS : fr;

	const [activeTab, setActiveTab] = useState<ActiveTab>("assistant");

	const [messages, setMessages] = useState<Message[]>([
		{
			id: "1",
			role: "assistant",
			content:
				"Bonjour ! Je suis iAsted, votre assistant consulaire. Je peux vous aider avec vos démarches de passeport, visa, état civil et bien plus.",
			timestamp: new Date(),
		},
	]);

	const [inputValue, setInputValue] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [callSession, setCallSession] = useState<CallSession>({
		active: false,
		duration: 0,
	});
	const [isMuted, setIsMuted] = useState(false);
	const [elapsedTime, setElapsedTime] = useState(0);

	// Fetch tickets — used for both the badge count AND the full list in the Tickets tab
	const {
		results: tickets,
		status: paginationStatus,
		loadMore,
		isLoading: isTicketsLoading,
	} = useAuthenticatedPaginatedQuery(
		api.functions.tickets.listMine,
		{},
		{ initialNumItems: 20 },
	);

	const openTicketsCount = (tickets ?? []).filter(
		(t) =>
			t.status === "open" ||
			t.status === "in_progress" ||
			t.status === "waiting_for_user",
	).length;

	// Simulate call duration timer
	React.useEffect(() => {
		let interval: NodeJS.Timeout;
		if (callSession.active) {
			interval = setInterval(() => {
				setElapsedTime((prev) => prev + 1);
			}, 1000);
		}
		return () => clearInterval(interval);
	}, [callSession.active]);

	const handleSendMessage = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!inputValue.trim()) return;

		const userMessage: Message = {
			id: Date.now().toString(),
			role: "user",
			content: inputValue,
			timestamp: new Date(),
		};

		setMessages((prev) => [...prev, userMessage]);
		setInputValue("");
		setIsLoading(true);

		// Simulate AI response delay
		setTimeout(() => {
			const assistantResponses = [
				"Pour renouveler votre passeport, vous devez prendre rendez-vous via iAgenda. Les délais actuels sont de 15 jours ouvrables.",
				"Un visa de résidence nécessite un dossier complet incluant un extrait de naissance, preuve de résidence, et justificatifs financiers.",
				"L'état civil électronique est maintenant disponible. Vous pouvez télécharger vos documents depuis iDocument.",
				"Notre horaire d'ouverture est du lundi au vendredi, 8h00 à 17h00. Les urgences diplomatiques sont traitées 24h/24.",
				"Vous pouvez explorer vos documents personnels dans la section iDocument. Tous vos documents importants y sont archivés de manière sécurisée.",
			];

			const randomResponse =
				assistantResponses[
					Math.floor(Math.random() * assistantResponses.length)
				];

			const assistantMessage: Message = {
				id: (Date.now() + 1).toString(),
				role: "assistant",
				content: randomResponse,
				timestamp: new Date(),
			};

			setMessages((prev) => [...prev, assistantMessage]);
			setIsLoading(false);
		}, 1500);
	};

	const startAudioCall = () => {
		setCallSession({
			active: true,
			type: "audio",
			startTime: new Date(),
			duration: 0,
		});
		setElapsedTime(0);
		setIsMuted(false);
		toast.success("Appel audio établi");
	};

	const startVideoCall = () => {
		setCallSession({
			active: true,
			type: "video",
			startTime: new Date(),
			duration: 0,
		});
		setElapsedTime(0);
		setIsMuted(false);
		toast.success("Appel vidéo établi");
	};

	const endCall = () => {
		setCallSession({ active: false, duration: 0 });
		setElapsedTime(0);
		toast.success(`Appel terminé (durée: ${formatTime(elapsedTime)})`);
	};

	const toggleMute = () => {
		setIsMuted(!isMuted);
		toast.success(isMuted ? "Microphone activé" : "Microphone désactivé");
	};

	const formatTime = (seconds: number): string => {
		const hrs = Math.floor(seconds / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
	};

	// --- Status badge helper for the Tickets tab ---
	const ticketStatusConfig: Record<string, { label: string; className: string }> = {
		open: { label: t("support.ticketStatus.open"), className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
		in_progress: { label: t("support.ticketStatus.in_progress"), className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
		waiting_for_user: { label: t("support.ticketStatus.waiting_for_user"), className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
		resolved: { label: t("support.ticketStatus.resolved"), className: "bg-green-500/10 text-green-600 border-green-500/20" },
		closed: { label: t("support.ticketStatus.closed"), className: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20" },
	};

	const getStatusBadge = (status: string) => {
		const config = ticketStatusConfig[status] ?? { label: status, className: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20" };
		return (
			<Badge variant="outline" className={cn("text-[10px] border", config.className)}>
				{config.label}
			</Badge>
		);
	};

	const getCategoryLabel = (category: string) => {
		return t(`support.ticketCategory.${category}`);
	};

	return (
		<div className="h-full flex flex-col bg-background">
			<PageHeader
				title="iAsted"
				subtitle="Assistant Consulaire Intelligent"
				icon={<MessageCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
				iconBgClass="bg-purple-500/10"
			/>

			{/* Tab Switcher */}
			<div className="px-4 pt-4 pb-4">
				<TabSwitcher
					tabs={[
						{ key: "assistant", label: "Assistant", icon: Bot },
						{ key: "tickets", label: "Mes Tickets", icon: LifeBuoy, count: openTicketsCount },
					]}
					activeTab={activeTab}
					onTabChange={(key) => setActiveTab(key as ActiveTab)}
				/>
			</div>

			{/* ============================== */}
			{/* Tab 1: Assistant               */}
			{/* ============================== */}
			{activeTab === "assistant" && (
				<div className="flex-1 flex flex-col lg:flex-row gap-4 px-4 pb-4 overflow-hidden">
					{/* Main Chat Area */}
					<div className="flex-1 flex flex-col overflow-hidden">
						{/* Call Status Card */}
						{callSession.active && (
							<FlatCard className="bg-linear-to-r from-blue-600/10 to-blue-700/10 border-blue-600/20 p-4 mb-4">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
										<div>
											<p className="text-sm font-semibold">
												Appel{" "}
												{callSession.type === "audio"
													? "audio"
													: "vidéo"}{" "}
												en cours
											</p>
											<p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
												<Clock className="w-3 h-3" />
												{formatTime(elapsedTime)}
											</p>
										</div>
									</div>
									<Button
										size="sm"
										variant="destructive"
										onClick={endCall}
										className="gap-1"
									>
										Terminer
									</Button>
								</div>
							</FlatCard>
						)}

						{/* Chat Messages */}
						<FlatCard className="flex-1 flex flex-col overflow-hidden">
							<ScrollArea className="flex-1 p-4 overflow-y-auto">
								<div className="space-y-4">
									{messages.map((msg) => (
										<div
											key={msg.id}
											className={cn(
												"flex gap-2 animate-in fade-in",
												msg.role === "user"
													? "justify-end"
													: "justify-start",
											)}
										>
											{msg.role === "assistant" && (
												<div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
													<Bot className="w-4 h-4 text-primary" />
												</div>
											)}
											<div
												className={cn(
													"max-w-xs lg:max-w-md px-3 py-2 rounded-lg text-sm leading-relaxed",
													msg.role === "user"
														? "bg-primary text-primary-foreground"
														: "bg-muted text-foreground",
												)}
											>
												{msg.content}
											</div>
										</div>
									))}
									{isLoading && (
										<div className="flex gap-2 items-center justify-start">
											<div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
												<Bot className="w-4 h-4 text-primary" />
											</div>
											<div className="bg-muted text-foreground px-3 py-2 rounded-lg">
												<Loader2 className="w-4 h-4 animate-spin" />
											</div>
										</div>
									)}
								</div>
							</ScrollArea>

							{/* Input Area */}
							<div className="border-t border-border p-4 space-y-3">
								{/* Call Buttons */}
								<div className="flex gap-2">
									<Button
										size="sm"
										variant={
											callSession.active
												? "default"
												: "outline"
										}
										onClick={
											callSession.active
												? endCall
												: startAudioCall
										}
										className="gap-1 flex-1"
										disabled={callSession.type === "video"}
									>
										<Phone className="w-4 h-4" />
										{callSession.active &&
										callSession.type === "audio"
											? "En appel"
											: "Appel audio"}
									</Button>

									<Button
										size="sm"
										variant={
											callSession.active
												? "default"
												: "outline"
										}
										onClick={
											callSession.active
												? endCall
												: startVideoCall
										}
										className="gap-1 flex-1"
										disabled={callSession.type === "audio"}
									>
										<Video className="w-4 h-4" />
										{callSession.active &&
										callSession.type === "video"
											? "En appel"
											: "Appel vidéo"}
									</Button>

									{callSession.active && (
										<Button
											size="sm"
											variant={
												isMuted ? "default" : "outline"
											}
											onClick={toggleMute}
											className="gap-1"
										>
											{isMuted ? (
												<MicOff className="w-4 h-4" />
											) : (
												<Mic className="w-4 h-4" />
											)}
										</Button>
									)}
								</div>

								{/* Message Input */}
								<form
									onSubmit={handleSendMessage}
									className="flex gap-2"
								>
									<Input
										placeholder="Posez votre question..."
										value={inputValue}
										onChange={(e) =>
											setInputValue(e.target.value)
										}
										disabled={isLoading}
										className="text-sm"
									/>
									<Button
										type="submit"
										size="icon"
										disabled={
											isLoading || !inputValue.trim()
										}
									>
										<Send className="w-4 h-4" />
									</Button>
								</form>

								{/* Info Badge */}
								<div className="flex items-center justify-between">
									<Badge
										variant="secondary"
										className="text-xs"
									>
										Assistant IA disponible 24h/24
									</Badge>
								</div>
							</div>
						</FlatCard>
					</div>

					{/* Quick Actions Sidebar */}
					<div className="lg:w-64 flex flex-col gap-3 shrink-0">
						<h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
							Actions rapides
						</h4>

						{/* Create Support Ticket */}
						<Link to="/my-space/support/new" className="block">
							<FlatCard className="p-3 hover:border-primary/40 transition-colors cursor-pointer group">
								<div className="flex items-center gap-3">
									<div className="p-2 rounded-lg bg-rose-500/10 group-hover:bg-rose-500/20 transition-colors">
										<PlusCircle className="w-4 h-4 text-rose-600" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium">
											Créer un ticket
										</p>
										<p className="text-xs text-muted-foreground">
											Support consulaire
										</p>
									</div>
								</div>
							</FlatCard>
						</Link>

						{/* View Open Tickets — switches to the Tickets tab */}
						<button
							type="button"
							onClick={() => setActiveTab("tickets")}
							className="block w-full text-left"
						>
							<FlatCard className="p-3 hover:border-primary/40 transition-colors cursor-pointer group">
								<div className="flex items-center gap-3">
									<div className="p-2 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
										<Ticket className="w-4 h-4 text-amber-600" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium">
											Mes tickets
										</p>
										<p className="text-xs text-muted-foreground">
											Suivre mes demandes
										</p>
									</div>
									{openTicketsCount > 0 && (
										<Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] h-5 px-1.5">
											{openTicketsCount}
										</Badge>
									)}
								</div>
							</FlatCard>
						</button>

						{/* Schedule Appointment */}
						<Link
							to="/my-space/appointments/new"
							className="block"
						>
							<FlatCard className="p-3 hover:border-primary/40 transition-colors cursor-pointer group">
								<div className="flex items-center gap-3">
									<div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
										<Calendar className="w-4 h-4 text-blue-600" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium">
											Rendez-vous
										</p>
										<p className="text-xs text-muted-foreground">
											Prendre un créneau
										</p>
									</div>
								</div>
							</FlatCard>
						</Link>

						{/* Escalation Banner */}
						<FlatCard className="p-3 bg-muted/50 border-dashed mt-2">
							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<LifeBuoy className="w-4 h-4 text-muted-foreground" />
									<p className="text-xs font-medium">
										Besoin d'un agent humain ?
									</p>
								</div>
								<p className="text-xs text-muted-foreground">
									Si l'assistant ne répond pas à votre
									question, créez un ticket pour être pris en
									charge par un agent.
								</p>
								<Button
									size="sm"
									variant="outline"
									className="w-full text-xs h-7"
									asChild
								>
									<Link to="/my-space/support/new">
										<LifeBuoy className="w-3 h-3 mr-1.5" />
										Contacter le support
									</Link>
								</Button>
							</div>
						</FlatCard>
					</div>
				</div>
			)}

			{/* ============================== */}
			{/* Tab 2: Mes Tickets             */}
			{/* ============================== */}
			{activeTab === "tickets" && (
				<div className="flex-1 overflow-y-auto px-4 pb-4">
					{/* Header with create button */}
					<div className="flex items-center justify-between mb-4">
						<div>
							<h2 className="text-lg font-semibold">
								{t("support.heading", "Support")}
							</h2>
							<p className="text-sm text-muted-foreground">
								{t(
									"support.subtitle",
									"Gérez vos tickets de support",
								)}
							</p>
						</div>
						<Button asChild>
							<Link to="/my-space/support/new">
								<PlusCircle className="mr-2 h-4 w-4" />
								{t("support.new", "Créer un ticket")}
							</Link>
						</Button>
					</div>

					{/* Loading state */}
					{isTicketsLoading && (!tickets || tickets.length === 0) ? (
						<div className="flex justify-center p-8">
							<Loader2 className="animate-spin h-8 w-8 text-primary" />
						</div>
					) : (
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.2, delay: 0.1 }}
						>
							{!tickets || tickets.length === 0 ? (
								<FlatCard>
									<EmptyState
										icon={<LifeBuoy />}
										title={t("support.tickets.empty.title", "Aucun ticket")}
										description={t("support.tickets.empty.desc", "Vous n'avez aucun ticket de support pour le moment.")}
										action={
											<Button asChild>
												<Link to="/my-space/support/new">
													<PlusCircle className="mr-2 h-4 w-4" />
													{t("support.tickets.empty.action", "Créer un ticket")}
												</Link>
											</Button>
										}
									/>
								</FlatCard>
							) : (
								<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
									{tickets.map(
										(ticket: (typeof tickets)[0]) => (
											<Link
												key={ticket._id}
												to="/my-space/support/$ticketId"
												params={{
													ticketId: ticket._id,
												}}
												className="block transition-transform hover:scale-[1.01] active:scale-[0.99] h-full"
											>
												<FlatCard className="h-full flex flex-col hover:border-primary/50 transition-colors">
													<div className="p-5 flex-1 flex flex-col">
														<div className="flex justify-between items-start mb-3 gap-2">
															<div className="flex gap-2 items-center flex-wrap">
																<Badge
																	variant="secondary"
																	className="font-mono text-xs"
																>
																	{
																		ticket.reference
																	}
																</Badge>
																{getStatusBadge(
																	ticket.status,
																)}
															</div>
														</div>

														<h3 className="font-semibold text-lg line-clamp-2 mb-1">
															{ticket.subject}
														</h3>

														<p className="text-sm text-muted-foreground mb-4">
															{getCategoryLabel(
																ticket.category,
															)}
														</p>

														<div className="mt-auto pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
															<span>
																{format(
																	new Date(
																		ticket._creationTime,
																	),
																	"dd MMM yyyy",
																	{
																		locale: dateLocale,
																	},
																)}
															</span>

															{ticket.messages &&
																ticket.messages
																	.length >
																	0 && (
																	<div className="flex items-center gap-1">
																		<MessageSquare className="h-3 w-3" />
																		<span>
																			{
																				ticket
																					.messages
																					.length
																			}
																		</span>
																	</div>
																)}
														</div>
													</div>
												</FlatCard>
											</Link>
										),
									)}
								</div>
							)}

							{/* Load More */}
							{paginationStatus === "CanLoadMore" && (
								<div className="flex justify-center mt-6">
									<Button
										variant="outline"
										onClick={() => loadMore(20)}
									>
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
					)}
				</div>
			)}
		</div>
	);
};

export const Route = createFileRoute("/my-space/iasted")({
	component: IAstedPage,
});
