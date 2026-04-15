/**
 * CitizenCallTab — Onglet iAppel pour citoyens.
 *
 * Restrictions metier :
 *   - Audio uniquement (pas de video sortante)
 *   - Appels uniquement vers les lignes d'appel des representations
 *   - Pas d'appels entre citoyens
 *   - Lignes priorite <= 2 -> "Urgent", > 2 -> "Standard"
 *
 * Utilise OrgCallButton pattern existant + callLines.listByOrg.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { LiveKitRoom } from "@livekit/components-react";
import "@livekit/components-styles";
import {
	ArrowDownLeft,
	ArrowUpRight,
	Clock,
	Loader2,
	Phone,
	PhoneCall,
	PhoneMissed,
	PhoneOff,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CustomCallUI } from "@/components/meetings/custom-call-ui";
import { useMeeting } from "@/hooks/use-meeting";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

export function CitizenCallTab() {
	const [activeMeetingId, setActiveMeetingId] = useState<Id<"meetings"> | null>(null);
	const [activeCallLabel, setActiveCallLabel] = useState<string | null>(null);

	// Hook meeting lifecycle
	const { token, wsUrl, connect, disconnect } = useMeeting(activeMeetingId ?? undefined);

	// Mutation appel org
	const { mutateAsync: callOrg, isPending: isCalling } = useConvexMutationQuery(
		api.functions.meetings.callOrganization,
	);

	// Transition initiating → ringing (makes call visible to agents)
	const setCallRingingMutation = useConvexMutationQuery(
		api.functions.meetings.setCallRinging,
	);

	// Historique d'appels catégorisé
	const { data: historyData, isPending: isHistoryPending } = useAuthenticatedConvexQuery(
		api.functions.meetings.listCallHistory,
		{},
	);
	const callHistory = historyData?.calls ?? [];
	const userNames = historyData?.userNames ?? {};

	// Mes demandes (pour trouver les orgs associees)
	const { data: myRequests } = useAuthenticatedConvexQuery(
		api.functions.requests.listMine,
		{ paginationOpts: { numItems: 20, cursor: null } },
	);

	// Extraire les orgIds uniques depuis les demandes (paginated response)
	const orgIds = useMemo(() => {
		const requests = (myRequests as any)?.page ?? [];
		const ids = new Set<string>();
		for (const r of requests) {
			if (r.orgId) ids.add(r.orgId);
		}
		return Array.from(ids);
	}, [myRequests]);

	// ── Lancer un appel audio vers une org/ligne ──
	const handleCallOrg = useCallback(async (orgId: string, callLineId?: string, label?: string) => {
		if (activeMeetingId) {
			toast.error("Un appel est deja en cours");
			return;
		}
		try {
			setActiveCallLabel(label ?? null);
			const result = await callOrg({
				orgId: orgId as Id<"orgs">,
				callLineId: callLineId ? (callLineId as Id<"callLines">) : undefined,
				mediaType: "audio", // Citoyens : audio uniquement
			});
			const meetingId = result.meetingId as Id<"meetings">;
			setActiveMeetingId(meetingId);
			await connect(meetingId);
			// Transition to ringing so agents can see the call
			await setCallRingingMutation.mutateAsync({ meetingId });
			toast.success("Appel en cours... En attente d'un agent.");
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors de l'appel");
			setActiveMeetingId(null);
			setActiveCallLabel(null);
		}
	}, [activeMeetingId, callOrg, connect, setCallRingingMutation]);

	const handleHangUp = useCallback(async () => {
		if (activeMeetingId) {
			await disconnect(activeMeetingId);
		}
		setActiveMeetingId(null);
		setActiveCallLabel(null);
	}, [activeMeetingId, disconnect]);

	const isInCall = activeMeetingId !== null && token && wsUrl;

	return (
		<div className="flex flex-col flex-1 overflow-hidden">
			<ScrollArea className="flex-1">
				{/* En-tete */}
				<div className="px-4 pt-4 pb-3">
					<p className="text-base font-semibold">Appeler une représentation</p>
					<p className="text-sm text-muted-foreground">Audio uniquement — Sélectionnez une ligne</p>
				</div>

				{/* Lignes d'appel par org */}
				{orgIds.length === 0 ? (
					<div className="flex flex-col items-center py-12 text-center px-6">
						<Phone className="h-10 w-10 text-muted-foreground/30 mb-3" />
						<p className="text-sm font-medium text-muted-foreground">Aucune représentation disponible</p>
						<p className="text-sm text-muted-foreground/60 mt-1">
							Faites une demande de service pour voir les contacts
						</p>
					</div>
				) : (
					<div className="space-y-4 px-4">
						{orgIds.map((orgId) => (
							<OrgCallLines
								key={orgId}
								orgId={orgId as Id<"orgs">}
								onCall={handleCallOrg}
								isCalling={isCalling}
								isInCall={!!activeMeetingId}
							/>
						))}
					</div>
				)}

				{/* Historique d'appels catégorisé */}
				<div className="border-t mt-4">
					<div className="px-4 pt-4 pb-2">
						<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Historique récent</p>
					</div>
					{isHistoryPending ? (
						<div className="flex items-center justify-center py-6">
							<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
						</div>
					) : callHistory.length === 0 ? (
						<div className="flex flex-col items-center py-8 text-center">
							<Clock className="h-8 w-8 text-muted-foreground/20 mb-2" />
							<p className="text-sm text-muted-foreground">Aucun appel récent</p>
						</div>
					) : (
						<div className="px-4 pb-4 space-y-1">
							{callHistory.slice(0, 10).map((item: any) => {
								const catConfig = {
									incoming: { icon: ArrowDownLeft, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Entrant" },
									outgoing: { icon: ArrowUpRight, color: "text-blue-500", bg: "bg-blue-500/10", label: "Sortant" },
									missed: { icon: PhoneMissed, color: "text-red-500", bg: "bg-red-500/10", label: "Manqué" },
									declined: { icon: PhoneOff, color: "text-muted-foreground", bg: "bg-muted/30", label: "Refusé" },
								}[item.category as string] ?? { icon: Phone, color: "text-muted-foreground", bg: "bg-muted/30", label: "" };
								const CatIcon = catConfig.icon;
								const date = new Date(item._creationTime);
								const durationMs = item.duration as number | undefined;
								const durationStr = durationMs
									? durationMs < 60000 ? `${Math.floor(durationMs / 1000)}s` : `${Math.floor(durationMs / 60000)}min`
									: "";
								const otherNames = item.participants
									?.filter((p: any) => p.userId !== item.createdBy)
									.map((p: any) => userNames[p.userId] ?? "Inconnu")
									.join(", ");
								const label = item.title ?? otherNames ?? userNames[item.createdBy] ?? "Appel";

								return (
									<div key={item._id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/30">
										<div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", catConfig.bg)}>
											<CatIcon className={cn("h-4 w-4", catConfig.color)} />
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium leading-snug">{label}</p>
											<div className="flex items-center gap-2 mt-0.5">
												<span className={cn("text-xs font-medium", catConfig.color)}>{catConfig.label}</span>
												<span className="text-xs text-muted-foreground">
													{date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
													{" · "}
													{date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
													{durationStr && ` · ${durationStr}`}
												</span>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</ScrollArea>

			{/* Dialog LiveKit en appel */}
			<Dialog open={!!isInCall} onOpenChange={(open) => { if (!open) handleHangUp(); }}>
				<DialogContent className="max-w-lg w-full h-[60vh] p-0 flex flex-col overflow-hidden bg-zinc-950 border-zinc-800" aria-describedby={undefined}>
					<DialogTitle className="sr-only">{activeCallLabel ?? "Appel en cours"}</DialogTitle>
					{token && wsUrl ? (
						<div className="flex flex-col flex-1 bg-zinc-950">
							<div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
								<div className="flex items-center gap-2">
									<Badge className="text-[9px] bg-emerald-500/15 text-emerald-400">En attente</Badge>
									<span className="text-xs text-zinc-400 truncate max-w-[200px]">{activeCallLabel ?? "Appel audio"}</span>
								</div>
								<Button variant="destructive" size="sm" onClick={handleHangUp} className="h-7 text-[10px] gap-1">
									<PhoneOff className="h-3 w-3" /> Raccrocher
								</Button>
							</div>
							<LiveKitRoom
								token={token}
								serverUrl={wsUrl}
								connect={true}
								audio={true}
								video={false}
								onDisconnected={handleHangUp}
								className="flex flex-col flex-1"
							>
								<CustomCallUI onHangUp={handleHangUp} title={activeCallLabel ?? undefined} />
							</LiveKitRoom>
						</div>
					) : (
						<div className="flex flex-col items-center justify-center flex-1 gap-4 text-white bg-zinc-950">
							<Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
							<p className="text-sm text-zinc-400">En attente d'un agent...</p>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}

/**
 * Affiche les lignes d'appel d'une org.
 */
function OrgCallLines({ orgId, onCall, isCalling, isInCall }: {
	orgId: Id<"orgs">;
	onCall: (orgId: string, callLineId?: string, label?: string) => void;
	isCalling: boolean;
	isInCall: boolean;
}) {
	// Donnees org (public query, pas besoin d'auth)
	const { data: org } = useAuthenticatedConvexQuery(
		api.functions.orgs.getById,
		{ orgId },
	);

	// Lignes d'appel
	const { data: callLines, isPending } = useAuthenticatedConvexQuery(
		api.functions.callLines.listByOrg,
		{ orgId },
	);

	// Disponibilité agents
	const { data: availableCount } = useAuthenticatedConvexQuery(
		api.functions.agentPresence.countAvailableAgents,
		{ orgId },
	);
	const isOnline = (availableCount ?? 0) > 0;

	const activeLines = useMemo(() => {
		return (callLines ?? []).filter((l: any) => l.isActive && l.type === "org");
	}, [callLines]);

	if (isPending) {
		return (
			<div className="flex items-center gap-3 py-3">
				<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
				<span className="text-sm text-muted-foreground">Chargement...</span>
			</div>
		);
	}

	return (
		<div className="border rounded-xl p-4 space-y-3">
			{/* En-tete org */}
			<div className="flex items-center gap-3">
				<div className="relative h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
					<Phone className="h-5 w-5 text-primary" />
					<span className={cn(
						"absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
						isOnline ? "bg-emerald-500" : "bg-zinc-400",
					)} />
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-sm font-semibold leading-snug">{(org as any)?.name ?? "Représentation"}</p>
					<p className="text-xs text-muted-foreground">
						{isOnline
							? <span className="text-emerald-600">{availableCount} agent{(availableCount ?? 0) > 1 ? "s" : ""} disponible{(availableCount ?? 0) > 1 ? "s" : ""}</span>
							: <span className="text-zinc-400">Hors ligne</span>
						}
					</p>
				</div>
			</div>

			{/* Lignes d'appel */}
			{activeLines.length === 0 ? (
				<Button
					variant="outline"
					className="w-full gap-2 text-sm h-10"
					disabled={isCalling || isInCall}
					onClick={() => onCall(orgId, undefined, (org as any)?.name)}
				>
					{isCalling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
					Appeler
				</Button>
			) : (
				<div className="space-y-2">
					{activeLines.map((line: any) => (
						<button
							key={line._id}
							type="button"
							disabled={isCalling || isInCall}
							onClick={() => onCall(orgId, line._id, `${(org as any)?.name ?? "Organisme"} — ${line.label}`)}
							className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all text-left"
						>
							<div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 bg-primary/10">
								<PhoneCall className="h-4 w-4 text-primary" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium leading-snug">{line.label}</p>
								{line.description && (
									<p className="text-xs text-muted-foreground leading-snug line-clamp-2">{line.description}</p>
								)}
							</div>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
