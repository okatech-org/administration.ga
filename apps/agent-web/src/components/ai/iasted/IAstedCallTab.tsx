/**
 * IAstedCallTab — Onglet iAppel unifié.
 *
 * Sous-sections : Audio, Vidéo
 * Appels réels via LiveKit (callUser mutation + useMeeting hook).
 * Contacts cross-org via useContactSearch.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { LiveKitRoom } from "@livekit/components-react";
import "@livekit/components-styles";
import {
	ArrowDownLeft,
	ArrowUpRight,
	Building2,
	Globe,
	Loader2,
	Phone,
	PhoneIncoming,
	PhoneMissed,
	PhoneOff,
	Shield,
	Users,
	Video,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PostCallNoteDrawer } from "@workspace/iasted";
import { CallCenterShell } from "@/components/call-center/CallCenterShell";
import { CustomCallUI } from "@/components/meetings/custom-call-ui";
import { useOrg } from "@/components/org/org-provider";
import { useContactSearch, type ContactSource } from "@/hooks/useContactSearch";
import { useCallCenter } from "@/hooks/use-call-center";
import { useMeeting } from "@/hooks/use-meeting";
import { useAuthenticatedConvexQuery, useConvexMutationQuery } from "@/integrations/convex/hooks";
import { useCallStore } from "@/stores/call-store";
import { FEATURES } from "@/lib/feature-flags";
import { cn } from "@/lib/utils";

type SubTab = "audio" | "video";

/**
 * Feature flag Centre d'Appels multi-lignes.
 *
 * Plan Intelligence iAsted × Sprint 6 (Phase α) : `FEATURES.callCenter` est
 * `true` par défaut (activé sauf si `NEXT_PUBLIC_FEATURE_CALL_CENTER=0`).
 * Le fallback `<LegacyCallTab />` reste disponible comme disjoncteur
 * d'urgence mais n'est plus le chemin principal.
 */
const CALL_CENTER_ENABLED = FEATURES.callCenter;

const SUB_TABS: Array<{ id: SubTab; label: string; icon: typeof Phone }> = [
	{ id: "audio", label: "Audio", icon: Phone },
	{ id: "video", label: "Vidéo", icon: Video },
];

const CALL_SOURCE_SEGMENTS: Array<{ id: ContactSource | "all"; label: string; icon: typeof Users }> = [
	{ id: "all", label: "Tous", icon: Users },
	{ id: "team", label: "Équipe", icon: Shield },
	{ id: "network", label: "Réseau", icon: Globe },
];

export function IAstedCallTab() {
	// Centre d'Appels multi-lignes (feature flag) — remplace intégralement l'UX historique.
	if (CALL_CENTER_ENABLED) {
		return <CallCenterWithPostCallNote />;
	}
	return <LegacyCallTab />;
}

/**
 * Wrapper Phase ζ : détecte la fin d'un appel et ouvre le drawer PostCallNote.
 * NE MODIFIE PAS CallCenterShell (Sprint 6 verrouillé).
 */
function CallCenterWithPostCallNote() {
	const { activeOrgId } = useOrg();
	const { activeCalls } = useCallCenter();
	const prevCountRef = useRef<number>(activeCalls?.length ?? 0);
	const [lastEndedMeetingId, setLastEndedMeetingId] = useState<string | null>(null);
	const [showPostCallNote, setShowPostCallNote] = useState(false);

	const { mutateAsync: upsertNote } = useConvexMutationQuery(
		api.functions.callNotes.upsertCallNote,
	);

	// Détecte une diminution du nombre d'appels actifs (un appel vient de se terminer)
	useEffect(() => {
		const currentCount = activeCalls?.length ?? 0;
		if (prevCountRef.current > 0 && currentCount < prevCountRef.current) {
			// Un appel a terminé — proposer la note post-call
			setShowPostCallNote(true);
		}
		prevCountRef.current = currentCount;
	}, [activeCalls?.length]);

	return (
		<>
			<CallCenterShell />
			<PostCallNoteDrawer
				open={showPostCallNote}
				onOpenChange={setShowPostCallNote}
				meetingLabel="Documentez cet appel avant de passer à la suite."
				onSave={async (payload) => {
					if (!activeOrgId) return;
					await upsertNote({
						meetingId: (lastEndedMeetingId ?? "placeholder") as Id<"meetings">,
						orgId: activeOrgId,
						content: payload.content,
						actionItems: payload.actionItems,
						sentiment: payload.sentiment,
					});
				}}
			/>
		</>
	);
}

function LegacyCallTab() {
	const { activeOrgId } = useOrg();
	const [subTab, setSubTab] = useState<SubTab>("audio");
	const [activeMeetingId, setActiveMeetingId] = useState<Id<"meetings"> | null>(null);
	const { globalActiveMeetingId, setGlobalMeetingId } = useCallStore();

	// Recherche intelligente cross-org
	const {
		groups,
		isPending: contactsLoading,
		filters,
		setSearch,
		setSource,
	} = useContactSearch();

	// Hook meeting lifecycle (LiveKit token, connect, disconnect)
	const {
		token,
		wsUrl,
		connect,
		disconnect,
	} = useMeeting(activeMeetingId ?? undefined);

	// Mutation appel direct agent→utilisateur
	const { mutateAsync: callUser, isPending: isCallingUser } = useConvexMutationQuery(
		api.functions.meetings.callUser,
	);

	// Mutation refuser un appel entrant
	const { mutateAsync: declineCall } = useConvexMutationQuery(
		api.functions.meetings.declineCall,
	);

	// ── Appels entrants (ringing) ──
	const { data: inboundCalls } = useAuthenticatedConvexQuery(
		api.functions.meetings.listInboundOrgCalls,
		{},
	);

	// ── Historique d'appels catégorisé ──
	const { data: historyData, isPending: isHistoryPending } = useAuthenticatedConvexQuery(
		api.functions.meetings.listCallHistory,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	const callHistory = historyData?.calls ?? [];
	const userNames = historyData?.userNames ?? {};

	// ── Lancer un appel ──
	const handleCall = async (targetUserId: string) => {
		if (!activeOrgId || globalActiveMeetingId) {
			toast.error("Un appel est déjà en cours");
			return;
		}

		try {
			const result = await callUser({
				orgId: activeOrgId,
				targetUserId: targetUserId as Id<"users">,
				mediaType: subTab,
			});

			const meetingId = result.meetingId as Id<"meetings">;
			setActiveMeetingId(meetingId);
			setGlobalMeetingId(meetingId);

			await connect(meetingId);
			toast.success(subTab === "audio" ? "Appel audio en cours..." : "Appel vidéo en cours...");
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors de l'appel");
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

	// ── Répondre à un appel entrant ──
	const handleAnswerInbound = async (meetingId: Id<"meetings">) => {
		if (globalActiveMeetingId) {
			toast.error("Un appel est déjà en cours");
			return;
		}
		try {
			setActiveMeetingId(meetingId);
			setGlobalMeetingId(meetingId);
			await connect(meetingId);
			toast.success("Appel connecté");
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors de la connexion");
			setActiveMeetingId(null);
			setGlobalMeetingId(null);
		}
	};

	// ── Refuser un appel entrant ──
	const handleDeclineInbound = async (meetingId: Id<"meetings">) => {
		try {
			await declineCall({ meetingId });
		} catch {
			// ignore — call may already have ended
		}
	};

	// ── Vérifier si déjà en appel ──
	const isInCall = activeMeetingId !== null && token && wsUrl;

	return (
		<div className="flex flex-col flex-1 min-h-0">
			{/* Sous-navigation Audio / Vidéo */}
			<div className="px-3 pt-3 pb-2 border-b shrink-0">
				<div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
					{SUB_TABS.map((tab) => {
						const Icon = tab.icon;
						const isActive = subTab === tab.id;
						return (
							<button
								key={tab.id}
								type="button"
								onClick={() => setSubTab(tab.id)}
								className={cn(
									"flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
									isActive ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
								)}
							>
								<Icon className="h-4 w-4" />
								{tab.label}
							</button>
						);
					})}
				</div>
			</div>

			{/* Recherche contacts + segments */}
			<div className="p-3 border-b space-y-2 shrink-0">
				<Input
					value={filters.searchTerm}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Rechercher (nom, poste, org)..."
					className="h-10 text-sm"
				/>
				<div className="flex items-center gap-1.5">
					{CALL_SOURCE_SEGMENTS.map((seg) => (
						<button
							key={seg.id}
							type="button"
							onClick={() => setSource(seg.id)}
							className={cn(
								"text-xs px-3 py-1 rounded-md font-medium transition-colors",
								filters.source === seg.id
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground hover:bg-muted",
							)}
						>
							{seg.label}
						</button>
					))}
				</div>
			</div>

			<ScrollArea className="flex-1 min-h-0">
				{/* ── Appels entrants ── */}
				{inboundCalls && inboundCalls.length > 0 && (
					<div className="border-b bg-red-500/5">
						<div className="flex items-center gap-2 px-3 py-2">
							<PhoneIncoming className="h-4 w-4 text-red-500 animate-pulse" />
							<span className="text-[11px] font-bold uppercase tracking-wider text-red-500">
								Appels entrants ({inboundCalls.length})
							</span>
						</div>
						{inboundCalls.map((call: any) => {
							const elapsed = Math.floor((Date.now() - call._creationTime) / 1000);
							const callerName = call.createdByUser
								? [call.createdByUser.firstName, call.createdByUser.lastName].filter(Boolean).join(" ")
								: "Usager";
							return (
								<div key={call._id} className="flex items-center gap-3 px-3 py-3 hover:bg-red-500/5">
									<div className="relative">
										<div className="h-10 w-10 rounded-full bg-red-500/15 flex items-center justify-center">
											<Phone className="h-4 w-4 text-red-500" />
										</div>
										<span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 animate-pulse" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-bold truncate">{callerName}</p>
										<p className="text-xs text-muted-foreground">
											{call.callLineName ? `${call.callLineName} · ` : ""}
											Sonne depuis {elapsed}s
										</p>
									</div>
									<div className="flex items-center gap-1.5">
										<Button
											size="icon"
											variant="ghost"
											className="h-9 w-9 text-red-500 hover:bg-red-500/10"
											onClick={() => handleDeclineInbound(call._id)}
											title="Refuser"
										>
											<PhoneOff className="h-4 w-4" />
										</Button>
										<Button
											size="icon"
											className="h-9 w-9 bg-emerald-600 hover:bg-emerald-700 text-white"
											onClick={() => handleAnswerInbound(call._id)}
											disabled={!!globalActiveMeetingId}
											title="Décrocher"
										>
											<Phone className="h-4 w-4" />
										</Button>
									</div>
								</div>
							);
						})}
					</div>
				)}

				{/* Contacts groupés par org */}
				{contactsLoading ? (
					<div className="flex items-center justify-center py-6">
						<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
					</div>
				) : groups.length > 0 ? (
					<div className="divide-y">
						{groups.map((group: any) => (
							<div key={group.org.id} className="py-1">
								<div className="flex items-center gap-2 px-3 py-1.5">
									<Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
									<span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
										{group.org.name}
									</span>
									{group.org.country && (
										<span className="text-[10px] text-muted-foreground/60">{group.org.country}</span>
									)}
								</div>
								{group.contacts.map((c: any) => (
									<div key={c.id} className="flex items-center gap-3 px-3 py-3 hover:bg-muted/30">
										<Avatar className="h-10 w-10">
											<AvatarImage src={c.avatar} />
											<AvatarFallback className={cn("text-xs",
												c.source === "team" ? "bg-primary/10 text-primary" : "bg-blue-500/10 text-blue-600",
											)}>
												{c.name?.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
											</AvatarFallback>
										</Avatar>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-1">
												<p className="text-sm font-bold truncate">{c.lastName}</p>
												<p className="text-sm text-foreground/80 truncate">{c.firstName}</p>
											</div>
											<p className="text-xs text-muted-foreground truncate">{c.position}</p>
										</div>
										<Button
											size="icon"
											variant="ghost"
											className="h-10 w-10 text-emerald-500 hover:bg-emerald-500/10"
											disabled={isCallingUser || !!globalActiveMeetingId}
											onClick={() => handleCall(c.userId)}
										>
											{isCallingUser ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : subTab === "audio" ? (
												<Phone className="h-4 w-4" />
											) : (
												<Video className="h-4 w-4" />
											)}
										</Button>
									</div>
								))}
							</div>
						))}
					</div>
				) : (
					<div className="flex flex-col items-center py-6 text-center">
						<Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
						<p className="text-sm text-muted-foreground">
							{filters.searchTerm ? "Aucun résultat" : "Aucun contact"}
						</p>
					</div>
				)}

				{/* Historique catégorisé */}
				<div className="border-t">
					<HistoryList items={callHistory} userNames={userNames} isPending={isHistoryPending}
						emptyIcon={subTab === "audio" ? Phone : Video}
						emptyText={subTab === "audio" ? "Aucun appel audio" : "Aucun appel vidéo"} />
				</div>
			</ScrollArea>

			{/* ═══ Dialog LiveKit en cours d'appel ═══ */}
			<Dialog open={!!isInCall} onOpenChange={(open) => { if (!open) handleHangUp(); }}>
				<DialogContent
					className="max-w-5xl w-full h-[80vh] p-0 flex flex-col overflow-hidden bg-zinc-950 border-zinc-800"
				>
					{token && wsUrl ? (
						<div className="flex flex-col flex-1 bg-zinc-950">
							<div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
								<div className="flex items-center gap-2">
									<Badge className="text-xs bg-red-500/15 text-red-400">● En direct</Badge>
									<span className="text-sm text-zinc-400">
										{subTab === "audio" ? "Appel audio" : "Appel vidéo"}
									</span>
								</div>
								<Button
									variant="destructive"
									size="sm"
									onClick={handleHangUp}
									className="h-8 text-xs gap-1.5"
								>
									<PhoneOff className="h-3.5 w-3.5" />
									Raccrocher
								</Button>
							</div>
							<LiveKitRoom
								token={token}
								serverUrl={wsUrl}
								connect={true}
								audio={true}
								video={subTab === "video"}
								onDisconnected={handleHangUp}
								className="flex flex-col flex-1"
							>
								<CustomCallUI onHangUp={handleHangUp} />
							</LiveKitRoom>
						</div>
					) : (
						<div className="flex flex-col items-center justify-center flex-1 gap-4 text-white bg-zinc-950">
							<Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
							<p className="text-sm text-zinc-400">Connexion en cours...</p>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ── Composant historique catégorisé ──

const CATEGORY_CONFIG: Record<string, { icon: typeof Phone; color: string; bg: string; label: string }> = {
	incoming: { icon: ArrowDownLeft, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Entrant" },
	outgoing: { icon: ArrowUpRight, color: "text-blue-500", bg: "bg-blue-500/10", label: "Sortant" },
	missed: { icon: PhoneMissed, color: "text-red-500", bg: "bg-red-500/10", label: "Manqué" },
	declined: { icon: PhoneOff, color: "text-muted-foreground", bg: "bg-muted/30", label: "Refusé" },
};

function formatDuration(ms: number | undefined) {
	if (!ms) return "";
	const s = Math.floor(ms / 1000);
	if (s < 60) return `${s}s`;
	const m = Math.floor(s / 60);
	const rs = s % 60;
	return rs > 0 ? `${m}m${rs}s` : `${m}min`;
}

function HistoryList({ items, userNames, isPending, emptyIcon: Icon, emptyText }: {
	items: any[]; userNames: Record<string, string>; isPending: boolean; emptyIcon: typeof Phone; emptyText: string;
}) {
	if (isPending) return <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

	if (items.length === 0) {
		return (
			<div className="flex flex-col items-center py-6 text-center">
				<Icon className="h-8 w-8 text-muted-foreground/30 mb-2" />
				<p className="text-sm text-muted-foreground">{emptyText}</p>
			</div>
		);
	}

	return (
		<div className="p-2">
			<p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">Récents</p>
			{items.slice(0, 15).map((item: any) => {
				const config = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.outgoing;
				const CatIcon = config.icon;
				const date = new Date(item._creationTime);
				const otherParticipants = item.participants
					?.filter((p: any) => p.userId !== item.createdBy)
					.map((p: any) => userNames[p.userId] ?? "Inconnu")
					.join(", ");
				const label = item.title ?? otherParticipants ?? userNames[item.createdBy] ?? "Appel";

				return (
					<div key={item._id} className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-muted/30">
						<div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", config.bg)}>
							<CatIcon className={cn("h-4 w-4", config.color)} />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-sm font-medium truncate">{label}</p>
							<p className="text-xs text-muted-foreground">
								{date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
								{" · "}
								{date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
								{item.duration ? ` · ${formatDuration(item.duration)}` : ""}
							</p>
						</div>
						<span className={cn("text-xs font-medium shrink-0", config.color)}>{config.label}</span>
					</div>
				);
			})}
		</div>
	);
}
