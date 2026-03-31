/**
 * IAstedMeetingTab — Module iRéunion complet.
 *
 * 3 états : liste → prejoin → incall
 * Réutilise useMeeting, MeetingRoom, PreJoinScreen, CustomCallUI.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { LiveKitRoom } from "@livekit/components-react";
import "@livekit/components-styles";
import {
	ArrowLeft,
	ExternalLink,
	Loader2,
	Plus,
	Users,
	Video,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CustomCallUI } from "@/components/meetings/custom-call-ui";
import { useOrg } from "@/components/org/org-provider";
import { useMeeting } from "@/hooks/use-meeting";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

type ViewState = "list" | "prejoin" | "incall";

export function IAstedMeetingTab() {
	const { activeOrgId } = useOrg();
	const [view, setView] = useState<ViewState>("list");
	const [activeMeetingId, setActiveMeetingId] = useState<Id<"meetings"> | null>(null);
	const [newMeetingName, setNewMeetingName] = useState("");

	// Hook de gestion du lifecycle meeting
	const {
		token,
		wsUrl,
		roomName,
		isConnecting,
		error: meetingError,
		connect,
		disconnect,
	} = useMeeting(activeMeetingId ?? undefined);

	// Queries
	const { data: rawMeetings, isPending } = useAuthenticatedConvexQuery(
		api.functions.meetings.listByOrg,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	// Mutations
	const { mutateAsync: createMeeting, isPending: isCreating } = useConvexMutationQuery(
		api.functions.meetings.create,
	);
	const { mutateAsync: endMeeting } = useConvexMutationQuery(
		api.functions.meetings.end,
	);

	const meetingsArray = Array.isArray(rawMeetings) ? rawMeetings : [];
	const activeMeetings = meetingsArray.filter((m: any) => m.type === "meeting" && m.status === "active");
	const recentMeetings = meetingsArray
		.filter((m: any) => m.type === "meeting" && m.status === "ended")
		.slice(0, 10);

	// Créer une réunion et passer en prejoin
	const handleCreate = async () => {
		if (!activeOrgId) return;
		try {
			const result = await createMeeting({
				orgId: activeOrgId,
				title: newMeetingName.trim() || "Réunion instantanée",
				type: "meeting" as const,
				participantIds: [] as Id<"users">[],
			});
			setActiveMeetingId(result.meetingId as Id<"meetings">);
			setNewMeetingName("");
			setView("prejoin");
			toast.success("Réunion créée");
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors de la création");
		}
	};

	// Rejoindre une réunion existante → prejoin
	const handleJoin = (meetingId: Id<"meetings">) => {
		setActiveMeetingId(meetingId);
		setView("prejoin");
	};

	// Connecter (obtenir token LiveKit) → incall
	const handleConnect = async () => {
		if (!activeMeetingId) return;
		await connect(activeMeetingId);
		setView("incall");
	};

	// Raccrocher → retour à la liste
	const handleDisconnect = async () => {
		if (activeMeetingId) {
			await disconnect(activeMeetingId);
		}
		setActiveMeetingId(null);
		setView("list");
	};

	// Terminer la réunion pour tous
	const handleEnd = async () => {
		if (activeMeetingId) {
			try {
				await endMeeting({ meetingId: activeMeetingId });
				toast.success("Réunion terminée");
			} catch {}
			await handleDisconnect();
		}
	};

	// Annuler (retour à la liste sans se connecter)
	const handleCancel = () => {
		setActiveMeetingId(null);
		setView("list");
	};

	// Trouver la réunion active pour les infos
	const activeMetingData = activeMeetingId
		? meetingsArray.find((m: any) => m._id === activeMeetingId)
		: null;

	// ════════════════════════════════════════════════════════════
	// VUE: IN CALL (salle de visio LiveKit)
	// ════════════════════════════════════════════════════════════
	if (view === "incall" && token && wsUrl) {
		return (
			<div className="flex flex-col flex-1 overflow-hidden bg-zinc-950">
				<LiveKitRoom
					token={token}
					serverUrl={wsUrl}
					connect={true}
					onDisconnected={handleDisconnect}
					className="flex flex-col flex-1"
				>
					<CustomCallUI onDisconnect={handleDisconnect} />
				</LiveKitRoom>
			</div>
		);
	}

	// ════════════════════════════════════════════════════════════
	// VUE: PRE-JOIN (écran pré-connexion)
	// ════════════════════════════════════════════════════════════
	if (view === "prejoin") {
		return (
			<div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
				<div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
					<Video className="h-8 w-8 text-emerald-500" />
				</div>
				<h3 className="text-base font-semibold mb-1">
					{(activeMetingData as any)?.title ?? "Réunion"}
				</h3>
				<p className="text-sm text-muted-foreground mb-1">
					{(activeMetingData as any)?.participants?.length ?? 0} participant(s)
				</p>
				{meetingError && (
					<p className="text-xs text-destructive mb-3 bg-destructive/10 px-3 py-1.5 rounded-lg">
						{meetingError}
					</p>
				)}
				<div className="flex items-center gap-3 mt-4">
					<Button variant="outline" onClick={handleCancel} disabled={isConnecting}>
						Annuler
					</Button>
					<Button onClick={handleConnect} disabled={isConnecting} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
						{isConnecting ? (
							<><Loader2 className="h-4 w-4 animate-spin" /> Connexion...</>
						) : (
							<><Video className="h-4 w-4" /> Rejoindre</>
						)}
					</Button>
				</div>
			</div>
		);
	}

	// ════════════════════════════════════════════════════════════
	// VUE: LISTE (réunions en cours + créer + historique)
	// ════════════════════════════════════════════════════════════
	return (
		<div className="flex flex-col flex-1 overflow-hidden">
			{/* Créer une réunion */}
			<div className="p-3 border-b space-y-2 shrink-0">
				<div className="flex items-center gap-2">
					<Input
						value={newMeetingName}
						onChange={(e) => setNewMeetingName(e.target.value)}
						placeholder="Nom de la réunion..."
						className="h-9 text-sm flex-1"
						onKeyDown={(e) => e.key === "Enter" && handleCreate()}
					/>
					<Button onClick={handleCreate} disabled={isCreating} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
						{isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
						Créer
					</Button>
				</div>
			</div>

			<ScrollArea className="flex-1">
				{isPending ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
					</div>
				) : (
					<div className="p-3 space-y-4">
						{/* Réunions en cours */}
						{activeMeetings.length > 0 && (
							<div>
								<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">
									🔴 En cours
								</p>
								<div className="space-y-1.5">
									{activeMeetings.map((m: any) => (
										<div
											key={m._id}
											className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors"
										>
											<div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
												<Video className="h-5 w-5 text-emerald-500" />
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium truncate">{m.title ?? "Réunion"}</p>
												<div className="flex items-center gap-2 text-xs text-muted-foreground">
													<span className="flex items-center gap-0.5">
														<Users className="h-3 w-3" />
														{m.participants?.length ?? 0}
													</span>
													<Badge className="text-[8px] h-4 bg-emerald-500/15 text-emerald-500">
														● En direct
													</Badge>
												</div>
											</div>
											<Button
												size="sm"
												onClick={() => handleJoin(m._id as Id<"meetings">)}
												className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
											>
												<Video className="h-3.5 w-3.5" />
												Rejoindre
											</Button>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Réunions récentes */}
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">
								📅 Récentes
							</p>
							{recentMeetings.length === 0 ? (
								<div className="flex flex-col items-center py-8 text-center">
									<Video className="h-8 w-8 text-muted-foreground/20 mb-2" />
									<p className="text-sm text-muted-foreground">Aucune réunion récente</p>
									<p className="text-xs text-muted-foreground/60 mt-1">
										Créez une réunion pour commencer
									</p>
								</div>
							) : (
								<div className="space-y-0.5">
									{recentMeetings.map((m: any) => {
										const date = new Date(m.startedAt ?? m._creationTime);
										const duration = m.startedAt && m.endedAt
											? Math.floor((m.endedAt - m.startedAt) / 60000)
											: 0;
										return (
											<div key={m._id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors">
												<div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
													<Video className="h-4 w-4 text-muted-foreground" />
												</div>
												<div className="flex-1 min-w-0">
													<p className="text-xs font-medium truncate">{m.title ?? "Réunion"}</p>
													<p className="text-[10px] text-muted-foreground">
														{date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} à{" "}
														{date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
														{duration > 0 && ` · ${duration}min`}
														{m.participants && ` · ${m.participants.length} part.`}
													</p>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					</div>
				)}
			</ScrollArea>
		</div>
	);
}
