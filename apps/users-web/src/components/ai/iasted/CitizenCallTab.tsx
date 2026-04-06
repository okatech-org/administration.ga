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
	AlertTriangle,
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
import { Dialog, DialogContent } from "@/components/ui/dialog";
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

	// Hook meeting lifecycle
	const { token, wsUrl, connect, disconnect } = useMeeting(activeMeetingId ?? undefined);

	// Mutation appel org
	const { mutateAsync: callOrg, isPending: isCalling } = useConvexMutationQuery(
		api.functions.meetings.callOrganization,
	);

	// Mes appels (historique)
	const { data: myMeetingsRaw } = useAuthenticatedConvexQuery(
		api.functions.meetings.listMine,
		{},
	);

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

	// Historique appels (calls uniquement)
	const callHistory = useMemo(() => {
		const meetings = Array.isArray(myMeetingsRaw) ? myMeetingsRaw : (myMeetingsRaw as any)?.meetings ?? [];
		return meetings.filter((m: any) => m.type === "call").slice(0, 10);
	}, [myMeetingsRaw]);

	// ── Lancer un appel audio vers une org/ligne ──
	const handleCallOrg = useCallback(async (orgId: string, callLineId?: string) => {
		if (activeMeetingId) {
			toast.error("Un appel est deja en cours");
			return;
		}
		try {
			const result = await callOrg({
				orgId: orgId as Id<"orgs">,
				callLineId: callLineId ? (callLineId as Id<"callLines">) : undefined,
				mediaType: "audio", // Citoyens : audio uniquement
			});
			const meetingId = result.meetingId as Id<"meetings">;
			setActiveMeetingId(meetingId);
			await connect(meetingId);
			toast.success("Appel en cours... En attente d'un agent.");
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors de l'appel");
			setActiveMeetingId(null);
		}
	}, [activeMeetingId, callOrg, connect]);

	const handleHangUp = useCallback(async () => {
		if (activeMeetingId) {
			await disconnect(activeMeetingId);
		}
		setActiveMeetingId(null);
	}, [activeMeetingId, disconnect]);

	const isInCall = activeMeetingId !== null && token && wsUrl;

	return (
		<div className="flex flex-col flex-1 overflow-hidden">
			<ScrollArea className="flex-1">
				{/* En-tete */}
				<div className="px-3 pt-3 pb-2">
					<p className="text-xs font-semibold">Appeler une representation</p>
					<p className="text-[10px] text-muted-foreground">Audio uniquement - Selectionnez une ligne</p>
				</div>

				{/* Lignes d'appel par org */}
				{orgIds.length === 0 ? (
					<div className="flex flex-col items-center py-8 text-center px-4">
						<Phone className="h-8 w-8 text-muted-foreground/20 mb-2" />
						<p className="text-xs text-muted-foreground">Aucune representation disponible</p>
						<p className="text-[10px] text-muted-foreground/60 mt-1">
							Faites une demande de service pour voir les contacts
						</p>
					</div>
				) : (
					<div className="space-y-3 px-3">
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

				{/* Historique d'appels */}
				<div className="border-t mt-3">
					<div className="px-3 pt-3 pb-1">
						<p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Recents</p>
					</div>
					{callHistory.length === 0 ? (
						<div className="flex flex-col items-center py-4 text-center">
							<Clock className="h-5 w-5 text-muted-foreground/20 mb-1" />
							<p className="text-[10px] text-muted-foreground">Aucun appel recent</p>
						</div>
					) : (
						<div className="px-3 pb-3 space-y-1">
							{callHistory.map((item: any) => {
								const isEnded = item.status === "ended";
								const date = new Date(item.startedAt ?? item._creationTime);
								const duration = item.startedAt && item.endedAt
									? Math.floor((item.endedAt - item.startedAt) / 60000) : 0;
								return (
									<div key={item._id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/30">
										<div className={cn("h-5 w-5 rounded-full flex items-center justify-center shrink-0",
											isEnded ? "bg-emerald-500/10" : "bg-red-500/10")}>
											{isEnded ? <PhoneCall className="h-2.5 w-2.5 text-emerald-500" /> : <PhoneMissed className="h-2.5 w-2.5 text-red-500" />}
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-[10px] font-medium truncate">{item.title ?? "Appel"}</p>
											<p className="text-[8px] text-muted-foreground">
												{date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
												{duration > 0 && ` - ${duration}min`}
											</p>
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
				<DialogContent className="max-w-lg w-full h-[60vh] p-0 flex flex-col overflow-hidden bg-zinc-950 border-zinc-800">
					{token && wsUrl ? (
						<div className="flex flex-col flex-1 bg-zinc-950">
							<div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
								<div className="flex items-center gap-2">
									<Badge className="text-[9px] bg-emerald-500/15 text-emerald-400">En attente</Badge>
									<span className="text-xs text-zinc-400">Appel audio</span>
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
								<CustomCallUI onHangUp={handleHangUp} />
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
	onCall: (orgId: string, callLineId?: string) => void;
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

	const activeLines = useMemo(() => {
		return (callLines ?? []).filter((l: any) => l.isActive && l.type === "org");
	}, [callLines]);

	if (isPending) {
		return (
			<div className="flex items-center gap-2 py-2">
				<Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
				<span className="text-[10px] text-muted-foreground">Chargement...</span>
			</div>
		);
	}

	return (
		<div className="border rounded-xl p-3 space-y-2">
			{/* En-tete org */}
			<div className="flex items-center gap-2">
				<div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
					<Phone className="h-4 w-4 text-primary" />
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-xs font-semibold truncate">{(org as any)?.name ?? "Representation"}</p>
					<p className="text-[9px] text-muted-foreground">{(org as any)?.country}</p>
				</div>
			</div>

			{/* Lignes d'appel */}
			{activeLines.length === 0 ? (
				<Button
					variant="outline"
					size="sm"
					className="w-full gap-2 text-xs"
					disabled={isCalling || isInCall}
					onClick={() => onCall(orgId)}
				>
					{isCalling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Phone className="h-3 w-3" />}
					Appeler
				</Button>
			) : (
				<div className="space-y-1">
					{activeLines.map((line: any) => {
						const isUrgent = line.priority <= 2;
						return (
							<button
								key={line._id}
								type="button"
								disabled={isCalling || isInCall}
								onClick={() => onCall(orgId, line._id)}
								className={cn(
									"w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all text-left",
									isUrgent
										? "border-red-200 bg-red-50/50 hover:bg-red-50 dark:border-red-900 dark:bg-red-950/30"
										: "border-border hover:bg-muted/30",
								)}
							>
								<div className={cn("h-7 w-7 rounded-full flex items-center justify-center shrink-0",
									isUrgent ? "bg-red-500/10" : "bg-primary/10",
								)}>
									{isUrgent
										? <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
										: <Phone className="h-3.5 w-3.5 text-primary" />
									}
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-xs font-medium truncate">{line.label}</p>
									{line.description && (
										<p className="text-[9px] text-muted-foreground truncate">{line.description}</p>
									)}
								</div>
								<Badge variant="outline" className={cn("text-[7px] shrink-0",
									isUrgent ? "text-red-500 border-red-200" : "",
								)}>
									{isUrgent ? "Urgent" : "Standard"}
								</Badge>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}
