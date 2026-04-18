/**
 * BackofficeCallTab — Onglet iAppel (backoffice).
 * Accepte orgId en prop au lieu de useOrg().
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { LiveKitRoom } from "@livekit/components-react";
import "@livekit/components-styles";
import { LIVEKIT_CALL_ROOM_OPTIONS } from "@workspace/livekit/room-options";
import { useLiveKitDisconnectGuard } from "@workspace/livekit/use-livekit-disconnect-guard";
import {
	Building2,
	Globe,
	Loader2,
	Phone,
	PhoneCall,
	PhoneMissed,
	PhoneOff,
	Search,
	Shield,
	Users,
	Video,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CustomCallUI } from "@/components/meetings/custom-call-ui";
import { useContactSearch, type ContactSource } from "@/hooks/useContactSearch";
import { useMeeting } from "@/hooks/use-meeting";
import { useAuthenticatedConvexQuery, useConvexMutationQuery } from "@/integrations/convex/hooks";
import { useCallStore } from "@/stores/call-store";
import { cn } from "@/lib/utils";

type SubTab = "audio" | "video";

const CALL_SOURCE_SEGMENTS: Array<{ id: ContactSource | "all"; label: string; icon: typeof Users }> = [
	{ id: "all", label: "Tous", icon: Users },
	{ id: "team", label: "Équipe", icon: Shield },
	{ id: "network", label: "Réseau", icon: Globe },
];

interface BackofficeCallTabProps {
	orgId: Id<"orgs"> | null;
}

export function BackofficeCallTab({ orgId }: BackofficeCallTabProps) {
	const [activeMeetingId, setActiveMeetingId] = useState<Id<"meetings"> | null>(null);
	const [activeMediaType, setActiveMediaType] = useState<SubTab>("audio");
	const [pendingCallUserId, setPendingCallUserId] = useState<string | null>(null);
	const { globalActiveMeetingId, setGlobalMeetingId } = useCallStore();

	const { groups, isPending: contactsLoading, filters, setSearch, setSource } = useContactSearch(orgId);
	const { token, wsUrl, connect, disconnect } = useMeeting(activeMeetingId ?? undefined);
	const { mutateAsync: callUser } = useConvexMutationQuery(api.functions.meetings.callUser);

	const { data: rawMeetings, isPending } = useAuthenticatedConvexQuery(
		api.functions.meetings.listByOrg,
		orgId ? { orgId } : "skip",
	);

	const meetingsArray = Array.isArray(rawMeetings) ? (rawMeetings as any)?.meetings ?? rawMeetings : [];
	const callHistory = useMemo(() => (meetingsArray as any[]).filter((m: any) => m.type === "call").slice(0, 15), [meetingsArray]);

	const cleanupCallState = useCallback(() => {
		setActiveMeetingId(null);
		setGlobalMeetingId(null);
	}, [setGlobalMeetingId]);

	const {
		onConnected: onLiveKitConnected,
		onDisconnected: onLiveKitDisconnected,
		markUserHangUp,
		reset: resetDisconnectGuard,
	} = useLiveKitDisconnectGuard(cleanupCallState);

	const handleCall = async (targetUserId: string, mediaType: SubTab) => {
		if (!orgId || globalActiveMeetingId) {
			toast.error("Un appel est déjà en cours");
			return;
		}
		setPendingCallUserId(targetUserId);
		try {
			resetDisconnectGuard();
			// mediaType "video" côté token permet audio+vidéo — le paramètre
			// `video` de LiveKitRoom contrôle la publication caméra initiale.
			const result = await callUser({
				orgId,
				targetUserId: targetUserId as Id<"users">,
				mediaType: "video",
			});
			const meetingId = result.meetingId as Id<"meetings">;
			setActiveMeetingId(meetingId);
			setActiveMediaType(mediaType);
			setGlobalMeetingId(meetingId);
			await connect(meetingId);
			toast.success(mediaType === "audio" ? "Appel audio en cours..." : "Appel vidéo en cours...");
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors de l'appel");
			setActiveMeetingId(null);
			setGlobalMeetingId(null);
		} finally {
			setPendingCallUserId(null);
		}
	};

	const handleHangUp = async () => {
		markUserHangUp();
		if (activeMeetingId) await disconnect(activeMeetingId);
		cleanupCallState();
	};

	const isInCall = activeMeetingId !== null && token && wsUrl;

	if (!orgId) {
		return (
			<div className="flex-1 flex items-center justify-center p-6 text-center">
				<p className="text-xs text-muted-foreground">Sélectionnez une organisation pour passer un appel.</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col flex-1 min-h-0 overflow-hidden">
			<div className="p-2 border-b space-y-1.5 shrink-0">
				<div className="relative">
					<Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
					<Input value={filters.searchTerm} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher (nom, poste, org)..." className="h-7 pl-7 text-xs" />
				</div>
				<div className="flex items-center gap-1">
					{CALL_SOURCE_SEGMENTS.map((seg) => (
						<button key={seg.id} type="button" onClick={() => setSource(seg.id)} className={cn("text-[9px] px-1.5 py-0.5 rounded-md font-medium transition-colors", filters.source === seg.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
							{seg.label}
						</button>
					))}
				</div>
			</div>

			<ScrollArea className="flex-1 min-h-0">
				{contactsLoading ? (
					<div className="flex items-center justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
				) : groups.length > 0 ? (
					<div className="divide-y">
						{groups.map((group: any) => (
							<div key={group.org.id} className="py-1">
								<div className="flex items-center gap-2 px-3 py-1">
									<Building2 className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
									<span className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{group.org.name}</span>
									{group.org.country && <span className="text-[7px] text-muted-foreground/60">{group.org.country}</span>}
								</div>
								{group.contacts.map((c: any) => {
									const isPendingThis = pendingCallUserId === c.userId;
									const disabled = !!pendingCallUserId || !!globalActiveMeetingId;
									return (
										<div key={c.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/30">
											<Avatar className="h-7 w-7">
												<AvatarImage src={c.avatar} />
												<AvatarFallback className={cn("text-[8px]", c.source === "team" ? "bg-primary/10 text-primary" : "bg-blue-500/10 text-blue-600")}>
													{c.name?.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
												</AvatarFallback>
											</Avatar>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-1">
													<p className="text-[11px] font-bold truncate">{c.lastName}</p>
													<p className="text-[11px] text-foreground/80 truncate">{c.firstName}</p>
												</div>
												<p className="text-[9px] text-muted-foreground truncate">{c.position}</p>
											</div>
											<div className="flex items-center gap-0.5 shrink-0">
												<Button
													size="icon"
													variant="ghost"
													className="h-6 w-6 text-emerald-500 hover:bg-emerald-500/10"
													disabled={disabled}
													title="Appel audio"
													onClick={() => handleCall(c.userId, "audio")}
												>
													{isPendingThis ? <Loader2 className="h-3 w-3 animate-spin" /> : <Phone className="h-3 w-3" />}
												</Button>
												<Button
													size="icon"
													variant="ghost"
													className="h-6 w-6 text-blue-500 hover:bg-blue-500/10"
													disabled={disabled}
													title="Appel vidéo"
													onClick={() => handleCall(c.userId, "video")}
												>
													<Video className="h-3 w-3" />
												</Button>
											</div>
										</div>
									);
								})}
							</div>
						))}
					</div>
				) : (
					<div className="flex flex-col items-center py-6 text-center">
						<Users className="h-6 w-6 text-muted-foreground/30 mb-2" />
						<p className="text-[11px] text-muted-foreground">{filters.searchTerm ? "Aucun résultat" : "Aucun contact"}</p>
					</div>
				)}

				<div className="border-t">
					{isPending ? (
						<div className="flex items-center justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
					) : callHistory.length === 0 ? (
						<div className="flex flex-col items-center py-6 text-center">
							<Phone className="h-6 w-6 text-muted-foreground/30 mb-2" />
							<p className="text-[11px] text-muted-foreground">Aucun appel récent</p>
						</div>
					) : (
						<div className="p-1.5">
							<p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground px-1.5 py-1">Récents</p>
							{callHistory.map((item: any) => {
								const isEnded = item.status === "ended";
								const date = new Date(item.startedAt ?? item._creationTime);
								const duration = item.startedAt && item.endedAt ? Math.floor((item.endedAt - item.startedAt) / 60000) : 0;
								return (
									<div key={item._id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/30">
										<div className={cn("h-5 w-5 rounded-full flex items-center justify-center shrink-0", isEnded ? "bg-emerald-500/10" : "bg-red-500/10")}>
											{isEnded ? <PhoneCall className="h-2.5 w-2.5 text-emerald-500" /> : <PhoneMissed className="h-2.5 w-2.5 text-red-500" />}
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-[10px] font-medium truncate">{item.title ?? "Appel"}</p>
											<p className="text-[8px] text-muted-foreground">{date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}{duration > 0 && ` · ${duration}min`}</p>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</ScrollArea>

			<Dialog open={!!isInCall} onOpenChange={(open) => { if (!open) handleHangUp(); }}>
				<DialogContent className="max-w-5xl w-full h-[80vh] p-0 flex flex-col overflow-hidden bg-zinc-950 border-zinc-800">
					<DialogTitle className="sr-only">
						{activeMediaType === "audio" ? "Appel audio" : "Appel vidéo"}
					</DialogTitle>
					<DialogDescription className="sr-only">
						Interface d'appel active. Utilisez les commandes pour poursuivre la conversation ou raccrocher.
					</DialogDescription>
					{token && wsUrl ? (
						<div className="flex flex-col flex-1 bg-zinc-950">
							<div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
								<div className="flex items-center gap-2">
									<Badge className="text-[9px] bg-red-500/15 text-red-400">En direct</Badge>
									<span className="text-xs text-zinc-400">{activeMediaType === "audio" ? "Appel audio" : "Appel vidéo"}</span>
								</div>
								<Button variant="destructive" size="sm" onClick={handleHangUp} className="h-7 text-[10px] gap-1"><PhoneOff className="h-3 w-3" />Raccrocher</Button>
							</div>
							<LiveKitRoom
								token={token}
								serverUrl={wsUrl}
								connect={true}
								audio={true}
								video={activeMediaType === "video"}
								options={LIVEKIT_CALL_ROOM_OPTIONS}
								onConnected={onLiveKitConnected}
								onDisconnected={onLiveKitDisconnected}
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
