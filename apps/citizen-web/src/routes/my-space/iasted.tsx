/**
 * iAsted Citoyen — Espace de communication consulaire
 *
 * Basé sur le même backend que iAsted agent (LiveKit + Convex),
 * adapté aux droits citoyens :
 *
 * Onglets :
 *  - iChat     : Support consulaire (tickets)
 *  - iAppel    : Appelez vos représentations (audio seulement)
 *                Recevez des appels audio/vidéo d'agents
 *  - iContact  : Contacts urgence & standard des représentations
 *
 * Restrictions citoyens :
 *  ✔ Peut initier appels AUDIO vers une org (callOrganization)
 *  ✔ Peut RECEVOIR appels/réunions d'un agent (via GlobalCallAlert + meetings.tsx)
 *  ✗ Ne peut PAS initier d'appels vidéo
 *  ✗ Ne peut PAS appeler un autre citoyen
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { LiveKitRoom } from "@livekit/components-react";
import "@livekit/components-styles";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Building2,
	Contact,
	Globe,
	Loader2,
	Mail,
	MessageSquare,
	Mic,
	Phone,
	PhoneCall,
	PhoneIncoming,
	PhoneMissed,
	PhoneOff,
	PlusCircle,
	Search,
	Shield,
	TicketCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CustomCallUI } from "@/components/meetings/custom-call-ui";
import { FlatCard } from "@/components/my-space/flat-card";
import { PageHeader } from "@/components/my-space/page-header";
import { useMeeting } from "@/hooks/use-meeting";
import {
	useAuthenticatedConvexQuery,
	useAuthenticatedPaginatedQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { useCallStore } from "@/stores/call-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/my-space/iasted")({
	component: IAstedCitizenPage,
});

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type TabId = "ichat" | "icall" | "icontact";

const NAV_ITEMS: Array<{ id: TabId; icon: typeof Phone; label: string }> = [
	{ id: "ichat", icon: MessageSquare, label: "iChat" },
	{ id: "icall", icon: Phone, label: "iAppel" },
	{ id: "icontact", icon: Contact, label: "iContact" },
];

// ─────────────────────────────────────────────
// Page principale
// ─────────────────────────────────────────────

function IAstedCitizenPage() {
	const [activeTab, setActiveTab] = useState<TabId>("ichat");

	return (
		<div className="h-full flex flex-col bg-background">
			<PageHeader
				title="iAsted"
				subtitle="Espace de communication consulaire"
				icon={<Mic className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
				iconBgClass="bg-blue-500/10"
			/>

			{/* Navigation tabs */}
			<div className="px-4 pb-1 flex-shrink-0">
				<div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1">
					{NAV_ITEMS.map((item) => {
						const Icon = item.icon;
						const isActive = activeTab === item.id;
						return (
							<button
								key={item.id}
								type="button"
								onClick={() => setActiveTab(item.id)}
								className={cn(
									"flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
									isActive
										? "bg-background shadow text-foreground"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								<Icon className="h-4 w-4" />
								<span className="hidden sm:inline">{item.label}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 min-h-0 overflow-hidden px-4 pb-4">
				{activeTab === "ichat" && (
					<IChatTab onSwitchToCall={() => setActiveTab("icall")} />
				)}
				{activeTab === "icall" && <IAppelTab />}
				{activeTab === "icontact" && <IContactTab />}
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────
// Tab 1 — iChat (Support & tickets consulaires)
// ─────────────────────────────────────────────

function IChatTab({ onSwitchToCall }: { onSwitchToCall: () => void }) {
	// Tickets paginés
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

	const ticketStatusConfig: Record<string, { label: string; className: string }> = {
		open: { label: "Ouvert", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
		in_progress: { label: "En cours", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
		waiting_for_user: { label: "Votre réponse", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
		resolved: { label: "Résolu", className: "bg-green-500/10 text-green-600 border-green-500/20" },
		closed: { label: "Fermé", className: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20" },
	};

	return (
		<div className="h-full flex flex-col gap-3 overflow-hidden mt-3">
			{/* Header */}
			<div className="flex items-center justify-between flex-shrink-0">
				<div>
					<h2 className="text-base font-semibold">Support consulaire</h2>
					<p className="text-xs text-muted-foreground">
						{openTicketsCount > 0
							? `${openTicketsCount} ticket${openTicketsCount > 1 ? "s" : ""} actif${openTicketsCount > 1 ? "s" : ""}`
							: "Aucun ticket actif"}
					</p>
				</div>
				<Button asChild size="sm" className="gap-1.5">
					<Link to="/my-space/support/new">
						<PlusCircle className="h-3.5 w-3.5" />
						Nouveau ticket
					</Link>
				</Button>
			</div>

			{/* Tickets list */}
			<ScrollArea className="flex-1">
				{isTicketsLoading && (!tickets || tickets.length === 0) ? (
					<div className="flex justify-center py-8">
						<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
					</div>
				) : !tickets || tickets.length === 0 ? (
					<FlatCard className="mt-2">
						<div className="flex flex-col items-center py-10 text-center">
							<TicketCheck className="h-10 w-10 text-muted-foreground/30 mb-3" />
							<p className="text-sm font-medium">Aucun ticket de support</p>
							<p className="text-xs text-muted-foreground mt-1 mb-4 max-w-xs">
								Créez un ticket pour être pris en charge par un agent consulaire.
							</p>
							<Button asChild size="sm">
								<Link to="/my-space/support/new">
									<PlusCircle className="h-3.5 w-3.5 mr-1.5" />
									Créer un ticket
								</Link>
							</Button>
						</div>
					</FlatCard>
				) : (
					<div className="space-y-2 mt-1">
						{(tickets ?? []).map((ticket) => {
							const config =
								ticketStatusConfig[ticket.status] ?? ticketStatusConfig.closed;
							return (
								<Link
									key={ticket._id}
									to="/my-space/support/$ticketId"
									params={{ ticketId: ticket._id }}
									className="block"
								>
									<FlatCard className="p-4 hover:border-primary/40 transition-colors cursor-pointer">
										<div className="flex items-start gap-3">
											<div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
												<MessageSquare className="h-4 w-4 text-primary" />
											</div>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 mb-1">
													<Badge
														variant="outline"
														className={cn("text-[10px] border", config.className)}
													>
														{config.label}
													</Badge>
													<span className="text-[10px] text-muted-foreground font-mono">
														{ticket.reference}
													</span>
												</div>
												<p className="text-sm font-medium truncate">
													{ticket.subject}
												</p>
												<p className="text-xs text-muted-foreground mt-0.5">
													{new Date(ticket._creationTime).toLocaleDateString("fr-FR", {
														day: "2-digit",
														month: "short",
														year: "numeric",
													})}
													{ticket.messages && ticket.messages.length > 0 && (
														<span className="ml-1.5">
															·{" "}{ticket.messages.length} message
															{ticket.messages.length > 1 ? "s" : ""}
														</span>
													)}
												</p>
											</div>
										</div>
									</FlatCard>
								</Link>
							);
						})}

						{paginationStatus === "CanLoadMore" && (
							<div className="flex justify-center pt-2">
								<Button variant="outline" size="sm" onClick={() => loadMore(20)}>
									Charger plus
								</Button>
							</div>
						)}
					</div>
				)}
			</ScrollArea>

			{/* Escalation card */}
			<FlatCard className="p-3 bg-muted/30 border-dashed flex-shrink-0">
				<div className="flex items-start gap-3">
					<Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
					<div className="flex-1 min-w-0">
						<p className="text-xs font-medium">Besoin d'un appel urgent ?</p>
						<p className="text-[11px] text-muted-foreground mt-0.5">
							Appelez directement votre représentation consulaire.
						</p>
					</div>
					<button
						type="button"
						onClick={onSwitchToCall}
						className="text-[11px] text-primary underline underline-offset-2 hover:no-underline shrink-0 font-medium"
					>
						iAppel →
					</button>
				</div>
			</FlatCard>
		</div>
	);
}

// ─────────────────────────────────────────────
// Tab 2 — iAppel
// ─────────────────────────────────────────────

function IAppelTab() {
	const [activeMeetingId, setActiveMeetingId] = useState<Id<"meetings"> | null>(null);
	const [selectedOrg, setSelectedOrg] = useState<any>(null);
	const [searchOrg, setSearchOrg] = useState("");
	const [isCalling, setIsCalling] = useState(false);
	const { globalActiveMeetingId, setGlobalMeetingId } = useCallStore();

	// Liste publique des orgs
	const { data: allOrgs, isPending: orgsLoading } = useAuthenticatedConvexQuery(
		api.functions.orgs.list,
		{},
	);

	// Historique des appels/réunions du citoyen
	const { data: myMeetingsData, isPending: historyLoading } = useAuthenticatedConvexQuery(
		api.functions.meetings.listMine,
		{},
	);

	const myMeetings = (myMeetingsData as any)?.meetings ?? [];
	const participantNames = (myMeetingsData as any)?.participantNames ?? {};

	// Appels entrants actifs (agent → citoyen)
	const incomingCalls = useMemo(() => {
		const now = Date.now();
		return myMeetings.filter((m: any) => {
			if (m.status !== "active") return false;
			if (m.type !== "call" && m.type !== "meeting") return false;
			// Ignore old calls (> 75s)
			if (now - m._creationTime > 75_000) return false;
			// Les appels entrants sont ceux où le citoyen est participant (pas host/creator)
			const myParticipant = m.participants?.find((p: any) => p.role !== "host");
			return !!myParticipant && !myParticipant.joinedAt;
		});
	}, [myMeetings]);

	// Historique (appels terminés ou actifs)
	const callHistory = useMemo(() => {
		return myMeetings.filter((m: any) => m.type === "call" || m.type === "meeting").slice(0, 25);
	}, [myMeetings]);

	// Hook LiveKit
	const { token, wsUrl, isConnecting, error: meetingError, connect, disconnect } =
		useMeeting(activeMeetingId ?? undefined);

	// Mutation appel org (audio uniquement pour citoyens)
	const { mutateAsync: callOrganization } = useConvexMutationQuery(
		api.functions.meetings.callOrganization,
	);

	// Filtrage orgs
	const filteredOrgs = useMemo(() => {
		if (!allOrgs) return [];
		const q = searchOrg.trim().toLowerCase();
		if (!q) return (allOrgs as any[]).slice(0, 12);
		return (allOrgs as any[]).filter(
			(org) =>
				org.name.toLowerCase().includes(q) ||
				(org.country ?? "").toLowerCase().includes(q),
		).slice(0, 12);
	}, [allOrgs, searchOrg]);

	// ── Lancer un appel audio ──
	const handleCallOrg = async (org: any) => {
		if (globalActiveMeetingId) {
			toast.error("Un appel est déjà en cours");
			return;
		}
		setIsCalling(true);
		try {
			const result = await callOrganization({
				orgId: org._id,
				mediaType: "audio",
			});
			const meetingId = result.meetingId as Id<"meetings">;
			setActiveMeetingId(meetingId);
			setSelectedOrg(org);
			setGlobalMeetingId(meetingId);
			await connect(meetingId);
			toast.success(`Appel vers ${org.name}...`);
		} catch (e: any) {
			const msg =
				e?.data?.errorMessage ||
				e?.message?.match(/Uncaught ConvexError: (.*?)(?:\n|$)/)?.[1] ||
				"Erreur lors de l'appel";
			toast.error(msg);
			setActiveMeetingId(null);
			setGlobalMeetingId(null);
		} finally {
			setIsCalling(false);
		}
	};

	// ── Répondre à un appel entrant ──
	const handleAnswer = async (meetingId: Id<"meetings">, meeting: any) => {
		setActiveMeetingId(meetingId);
		setSelectedOrg(null);
		setGlobalMeetingId(meetingId);
		try {
			await connect(meetingId);
		} catch (e: any) {
			toast.error("Impossible de rejoindre l'appel");
			setActiveMeetingId(null);
			setGlobalMeetingId(null);
		}
	};

	// ── Raccrocher ──
	const handleHangUp = async () => {
		if (activeMeetingId) {
			await disconnect(activeMeetingId);
		}
		setActiveMeetingId(null);
		setGlobalMeetingId(null);
	};

	const isInCall = activeMeetingId !== null && token && wsUrl;

	return (
		<div className="h-full flex flex-col gap-3 mt-3 overflow-hidden">
			{/* ── Appels entrants ── */}
			{incomingCalls.length > 0 && (
				<FlatCard className="border-emerald-500/30 bg-emerald-500/5 flex-shrink-0">
					<div className="p-3 space-y-2">
						<div className="flex items-center gap-2">
							<PhoneIncoming className="h-4 w-4 text-emerald-500 animate-pulse" />
							<span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
								Appel entrant
							</span>
						</div>
						{incomingCalls.map((call: any) => {
							const callerName =
								participantNames[call.createdBy] ?? "Agent consulaire";
							const isVideo = call.mediaType === "video" || call.type === "meeting";
							return (
								<div
									key={call._id}
									className="flex items-center justify-between bg-background rounded-xl p-3 border"
								>
									<div className="flex items-center gap-3">
										<div className="relative h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
											{isVideo ? (
												<PhoneCall className="h-5 w-5 text-emerald-500" />
											) : (
												<PhoneCall className="h-5 w-5 text-emerald-500" />
											)}
											<span className="absolute inset-0 rounded-full border border-emerald-500 animate-ping opacity-40" />
										</div>
										<div>
											<p className="text-sm font-medium">{callerName}</p>
											<p className="text-xs text-muted-foreground">
												{call.title ?? "Appel"}{" "}
												{isVideo && (
													<Badge className="text-[9px] h-3.5 bg-blue-500/10 text-blue-500 ml-1">
														Vidéo
													</Badge>
												)}
											</p>
										</div>
									</div>
									<div className="flex gap-2">
										<Button
											size="sm"
											variant="outline"
											className="h-8 gap-1 text-destructive border-destructive/30"
											onClick={handleHangUp}
										>
											<PhoneOff className="h-3.5 w-3.5" />
											Refuser
										</Button>
										<Button
											size="sm"
											className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
											onClick={() => handleAnswer(call._id, call)}
										>
											<Phone className="h-3.5 w-3.5" />
											Répondre
										</Button>
									</div>
								</div>
							);
						})}
					</div>
				</FlatCard>
			)}

			{/* ── Sélecteur d'organisation ── */}
			<FlatCard className="flex-shrink-0">
				<div className="p-3 space-y-2.5">
					<h3 className="text-sm font-semibold flex items-center gap-1.5">
						<Building2 className="h-3.5 w-3.5 text-muted-foreground" />
						Appeler une représentation
					</h3>
					<div className="relative">
						<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
						<Input
							value={searchOrg}
							onChange={(e) => setSearchOrg(e.target.value)}
							placeholder="Rechercher une représentation..."
							className="pl-8 h-8 text-sm"
						/>
					</div>

					{orgsLoading ? (
						<div className="flex items-center justify-center py-3">
							<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
						</div>
					) : (
						<div className="space-y-1 max-h-44 overflow-y-auto pr-0.5">
							{filteredOrgs.length === 0 ? (
								<p className="text-xs text-muted-foreground text-center py-2">
									Aucune représentation trouvée
								</p>
							) : (
								filteredOrgs.map((org: any) => (
									<button
										key={org._id}
										type="button"
										onClick={() =>
											setSelectedOrg(
												selectedOrg?._id === org._id ? null : org,
											)
										}
										className={cn(
											"w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors",
											selectedOrg?._id === org._id
												? "bg-primary/10 text-primary"
												: "hover:bg-muted/50",
										)}
									>
										<div className="h-7 w-7 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
											<Building2 className="h-3.5 w-3.5 text-muted-foreground" />
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-xs font-medium truncate">{org.name}</p>
											{org.country && (
												<p className="text-[10px] text-muted-foreground">
													{org.country}
												</p>
											)}
										</div>
										{selectedOrg?._id === org._id && (
											<Badge className="text-[9px] h-4 bg-primary/15 text-primary border-primary/20 shrink-0">
												✓
											</Badge>
										)}
									</button>
								))
							)}
						</div>
					)}

					<Button
						className="w-full gap-2"
						disabled={!selectedOrg || isCalling || !!globalActiveMeetingId}
						onClick={() => selectedOrg && handleCallOrg(selectedOrg)}
					>
						{isCalling ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" />
								Connexion...
							</>
						) : (
							<>
								<Phone className="h-4 w-4" />
								{selectedOrg
									? `Appeler ${selectedOrg.name}`
									: "Sélectionner une représentation"}
							</>
						)}
					</Button>
					<p className="text-[10px] text-muted-foreground text-center">
						🔒 Audio uniquement · Les citoyens peuvent recevoir des appels vidéo d'un agent
					</p>
				</div>
			</FlatCard>

			{/* ── Historique des appels ── */}
			<div className="flex-1 min-h-0 overflow-y-auto">
				<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">
					Historique récent
				</p>
				{historyLoading ? (
					<div className="flex items-center justify-center py-4">
						<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
					</div>
				) : callHistory.length === 0 ? (
					<div className="flex flex-col items-center py-6 text-center">
						<PhoneMissed className="h-8 w-8 text-muted-foreground/20 mb-2" />
						<p className="text-xs text-muted-foreground">Aucun appel récent</p>
					</div>
				) : (
					<div className="space-y-1">
						{callHistory.map((call: any) => {
							const isOutgoing = call.isOrgInbound === true;
							const duration =
								call.startedAt && call.endedAt
									? Math.floor((call.endedAt - call.startedAt) / 60000)
									: null;
							const date = new Date(call.startedAt ?? call._creationTime);
							const isMissed =
								call.status === "ended" &&
								call.participants.filter((p: any) => p.joinedAt).length <= 1;

							return (
								<div
									key={call._id}
									className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/30"
								>
									<div
										className={cn(
											"h-8 w-8 rounded-full flex items-center justify-center shrink-0",
											isMissed
												? "bg-red-500/10"
												: isOutgoing
													? "bg-emerald-500/10"
													: "bg-blue-500/10",
										)}
									>
										{isMissed ? (
											<PhoneMissed className="h-3.5 w-3.5 text-red-500" />
										) : isOutgoing ? (
											<PhoneCall className="h-3.5 w-3.5 text-emerald-500" />
										) : (
											<PhoneIncoming className="h-3.5 w-3.5 text-blue-500" />
										)}
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-xs font-medium truncate">
											{call.title ?? "Appel"}
										</p>
										<p className="text-[10px] text-muted-foreground">
											{date.toLocaleDateString("fr-FR", {
												day: "2-digit",
												month: "short",
											})}{" "}
											à{" "}
											{date.toLocaleTimeString("fr-FR", {
												hour: "2-digit",
												minute: "2-digit",
											})}
											{duration !== null && duration > 0 && ` · ${duration}min`}
										</p>
									</div>
									{isMissed && (
										<Badge className="text-[9px] h-4 bg-red-500/10 text-red-500 border-red-500/20">
											Manqué
										</Badge>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* ── Dialog LiveKit pendant l'appel ── */}
			<Dialog
				open={!!isInCall}
				onOpenChange={(open) => {
					if (!open) handleHangUp();
				}}
			>
				<DialogContent
					onInteractOutside={(e) => e.preventDefault()}
					onEscapeKeyDown={(e) => e.preventDefault()}
					className="max-w-4xl w-full h-[85vh] p-0 flex flex-col overflow-hidden bg-zinc-950 border-zinc-800"
				>
					{token && wsUrl ? (
						<LiveKitRoom
							token={token}
							serverUrl={wsUrl}
							connect={true}
							audio={true}
							video={false}
							onDisconnected={handleHangUp}
							className="flex flex-col flex-1 min-h-0"
							style={{
								height: "100%",
								width: "100%",
								display: "flex",
								flexDirection: "column",
								minHeight: 0,
							}}
						>
							<CustomCallUI
								onHangUp={handleHangUp}
								title={selectedOrg?.name ?? "Représentation consulaire"}
							/>
						</LiveKitRoom>
					) : (
						<div className="flex-1 flex items-center justify-center bg-zinc-950">
							<div className="text-center space-y-3">
								<Loader2 className="h-8 w-8 animate-spin text-zinc-500 mx-auto" />
								<p className="text-sm text-zinc-400">Connexion en cours...</p>
								{meetingError && (
									<p className="text-xs text-red-400 max-w-xs">{meetingError}</p>
								)}
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ─────────────────────────────────────────────
// Tab 3 — iContact (contacts urgence & standard)
// ─────────────────────────────────────────────

function IContactTab() {
	const [search, setSearch] = useState("");

	const { data: allOrgs, isPending } = useAuthenticatedConvexQuery(
		api.functions.orgs.list,
		{},
	);

	const filteredOrgs = useMemo(() => {
		if (!allOrgs) return [];
		const q = search.trim().toLowerCase();
		const orgs = allOrgs as any[];
		if (!q) return orgs;
		return orgs.filter(
			(org) =>
				org.name.toLowerCase().includes(q) ||
				(org.country ?? "").toLowerCase().includes(q) ||
				(org.city ?? "").toLowerCase().includes(q),
		);
	}, [allOrgs, search]);

	return (
		<div className="h-full flex flex-col gap-3 mt-3 overflow-hidden">
			{/* Recherche */}
			<div className="relative flex-shrink-0">
				<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
				<Input
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Rechercher une représentation..."
					className="pl-8 text-sm"
				/>
			</div>

			{/* Notice */}
			<div className="flex-shrink-0 rounded-lg bg-blue-500/5 border border-blue-500/20 px-3 py-2">
				<p className="text-[11px] text-blue-600 dark:text-blue-400 leading-relaxed">
					<Shield className="h-3 w-3 inline mr-1 mb-0.5" />
					Contacts officiels des représentations diplomatiques — urgence et standard uniquement.
				</p>
			</div>

			{/* Liste */}
			<ScrollArea className="flex-1">
				{isPending ? (
					<div className="flex items-center justify-center py-10">
						<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
					</div>
				) : filteredOrgs.length === 0 ? (
					<div className="flex flex-col items-center py-10 text-center">
						<Building2 className="h-8 w-8 text-muted-foreground/30 mb-2" />
						<p className="text-xs text-muted-foreground">
							{search ? "Aucun résultat" : "Aucune représentation"}
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{filteredOrgs.map((org: any) => (
							<OrgContactCard key={org._id} org={org} />
						))}
					</div>
				)}
			</ScrollArea>
		</div>
	);
}

// ─────────────────────────────────────────────
// Carte contact org
// ─────────────────────────────────────────────

const ORG_TYPE_LABELS: Record<string, string> = {
	embassy: "Ambassade",
	general_consulate: "Consulat Général",
	consulate: "Consulat",
	permanent_mission: "Mission Permanente",
	high_commission: "Haut-Commissariat",
	trade_mission: "Mission Commerciale",
};

function OrgContactCard({ org }: { org: any }) {
	const [expanded, setExpanded] = useState(false);

	const contactInfo = org.contactInfo ?? org.contacts ?? {};
	const emergency = contactInfo.emergency ?? org.emergencyPhone ?? org.emergencyContact;
	const phone = contactInfo.phone ?? org.phone ?? org.mainPhone;
	const email = contactInfo.email ?? org.email ?? org.mainEmail;
	const website = contactInfo.website ?? org.website;
	const address = contactInfo.address ?? org.address;

	const hasContacts = emergency || phone || email || website || address;
	const typeLabel = ORG_TYPE_LABELS[org.type] ?? org.type ?? "Représentation";

	return (
		<FlatCard className="overflow-hidden">
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-muted/20 transition-colors"
			>
				<div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
					{org.flagUrl || org.logo ? (
						<img
							src={org.flagUrl ?? org.logo}
							alt={org.name}
							className="h-7 w-7 object-contain rounded"
						/>
					) : (
						<Building2 className="h-5 w-5 text-primary" />
					)}
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-sm font-semibold truncate">{org.name}</p>
					<div className="flex items-center gap-1.5 mt-0.5">
						<Badge variant="outline" className="text-[9px] h-4 px-1.5 text-muted-foreground">
							{typeLabel}
						</Badge>
						{org.country && (
							<span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
								<Globe className="h-2.5 w-2.5" />
								{org.country}
							</span>
						)}
					</div>
				</div>
				<div className="flex flex-col items-end gap-1 shrink-0">
					{emergency && (
						<Badge className="text-[9px] h-4 bg-red-500/10 text-red-500 border-red-500/20">
							Urgence
						</Badge>
					)}
					<Badge variant="outline" className="text-[9px] h-4 text-muted-foreground">
						{hasContacts ? (expanded ? "Fermer ↑" : "Voir ↓") : "N/A"}
					</Badge>
				</div>
			</button>

			{expanded && hasContacts && (
				<div className="px-3.5 pb-3.5 border-t border-border/40 pt-3 space-y-2">
					{emergency && (
						<ContactLine
							icon={Phone}
							label="Urgence 🚨"
							value={emergency}
							href={`tel:${emergency}`}
							accent="red"
						/>
					)}
					{phone && (
						<ContactLine
							icon={Phone}
							label="Standard"
							value={phone}
							href={`tel:${phone}`}
							accent="blue"
						/>
					)}
					{email && (
						<ContactLine
							icon={Mail}
							label="Email"
							value={email}
							href={`mailto:${email}`}
							accent="green"
						/>
					)}
					{address && (
						<ContactLine icon={Globe} label="Adresse" value={address} accent="purple" />
					)}
					{website && (
						<ContactLine
							icon={Globe}
							label="Site web"
							value={website}
							href={website}
							accent="teal"
						/>
					)}
				</div>
			)}
		</FlatCard>
	);
}

// ─────────────────────────────────────────────
// ContactLine helper
// ─────────────────────────────────────────────

const ACCENT_CLASSES: Record<string, { bg: string; text: string }> = {
	red: { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400" },
	blue: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
	green: { bg: "bg-green-500/10", text: "text-green-600 dark:text-green-400" },
	purple: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400" },
	teal: { bg: "bg-teal-500/10", text: "text-teal-600 dark:text-teal-400" },
};

function ContactLine({
	icon: Icon,
	label,
	value,
	href,
	accent = "blue",
}: {
	icon: typeof Phone;
	label: string;
	value: string;
	href?: string;
	accent?: string;
}) {
	const colors = ACCENT_CLASSES[accent] ?? ACCENT_CLASSES.blue;

	return (
		<div className="flex items-center gap-2.5">
			<div className={cn("h-6 w-6 rounded-full flex items-center justify-center shrink-0", colors.bg)}>
				<Icon className={cn("h-3 w-3", colors.text)} />
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-[10px] text-muted-foreground">{label}</p>
				{href ? (
					<a
						href={href}
						target={href.startsWith("http") ? "_blank" : undefined}
						rel="noopener noreferrer"
						className={cn("text-xs font-medium hover:underline truncate block", colors.text)}
					>
						{value}
					</a>
				) : (
					<p className="text-xs font-medium truncate">{value}</p>
				)}
			</div>
		</div>
	);
}
