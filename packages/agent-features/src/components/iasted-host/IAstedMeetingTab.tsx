/**
 * IAstedMeetingTab — Module iRéunion complet.
 *
 * 3 états : liste → prejoin → incall
 * Fonctionnalités : créer, inviter, planifier, lien de partage,
 * enregistrement, terminer pour tous, rejoindre.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { LiveKitRoom } from "@livekit/components-react";
import "@livekit/components-styles";
import { LIVEKIT_CALL_ROOM_OPTIONS } from "@workspace/livekit/room-options";
import { useLiveKitDisconnectGuard } from "@workspace/livekit/use-livekit-disconnect-guard";
import {
	Calendar,
	Check,
	ClipboardCopy,
	Loader2,
	Mic,
	PhoneOff,
	Plus,
	Users,
	Video,
	X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "@workspace/routing";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Switch } from "@workspace/ui/components/switch";
import { CustomCallUI } from "../meetings/custom-call-ui";
import { useOrg } from "../../shell/org-provider";
import { useMeeting } from "../../hooks/use-meeting";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";
import { cn } from "@workspace/ui/lib/utils";
import { ParticipantPicker } from "./ParticipantPicker";

type ViewState = "list" | "create" | "prejoin" | "incall";

/** Formate la liste des participants pour l'affichage en card. */
function formatParticipants(
	participants: Array<{ userId: string }> | undefined,
	names: Record<string, string>,
): string {
	if (!participants || participants.length === 0) return "Aucun participant";
	const labels = participants.map((p) => names[p.userId] ?? "—").filter(Boolean);
	if (labels.length === 0) return `${participants.length} participant${participants.length > 1 ? "s" : ""}`;
	if (labels.length <= 3) return labels.join(", ");
	return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
}

export function IAstedMeetingTab() {
	const { activeOrgId } = useOrg();
	const searchParams = useSearchParams();
	const [view, setView] = useState<ViewState>("list");
	const [activeMeetingId, setActiveMeetingId] = useState<Id<"meetings"> | null>(null);

	// Formulaire de création
	const [meetingName, setMeetingName] = useState("");
	const [meetingDescription, setMeetingDescription] = useState("");
	const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());

	// Pré-remplissage via `?invite=<userId>` (depuis iContact "Programmer une réunion").
	// On bascule directement sur l'écran de création avec le contact pré-sélectionné.
	useEffect(() => {
		const invite = searchParams?.get("invite");
		if (invite && view === "list") {
			setSelectedParticipants((prev) => {
				const next = new Set(prev);
				next.add(invite);
				return next;
			});
			setView("create");
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Deep link `?meeting=<id>` (depuis iAgenda "Ouvrir dans iCom →") — la
	// carte concernée reçoit un anneau primary et est scrollée à l'écran.
	const highlightedMeetingId = searchParams?.get("meeting") ?? null;
	useEffect(() => {
		if (!highlightedMeetingId) return;
		const id = window.setTimeout(() => {
			const el = document.getElementById(`meeting-card-${highlightedMeetingId}`);
			if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
		}, 250);
		return () => window.clearTimeout(id);
	}, [highlightedMeetingId]);
	const [scheduledDate, setScheduledDate] = useState("");
	const [scheduledTime, setScheduledTime] = useState("");
	const [recordingEnabled, setRecordingEnabled] = useState(false);
	const [copiedLink, setCopiedLink] = useState(false);

	// Hook meeting lifecycle
	const {
		token,
		wsUrl,
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
	const { mutateAsync: cancelMeeting } = useConvexMutationQuery(
		api.functions.meetings.cancel,
	);

	// `listByOrg` retourne `{ meetings: [...], participantNames: {...} }`, pas
	// un tableau brut. L'ancien `Array.isArray(rawMeetings)` retournait
	// toujours `false` → toutes les listes étaient vides et les réunions
	// planifiées ne s'affichaient jamais.
	const meetingsArray: any[] = Array.isArray((rawMeetings as any)?.meetings)
		? ((rawMeetings as any).meetings as any[])
		: Array.isArray(rawMeetings)
			? (rawMeetings as any[])
			: [];
	const participantNames: Record<string, string> =
		((rawMeetings as any)?.participantNames as Record<string, string>) ?? {};
	const activeMeetings = meetingsArray.filter((m: any) => m.type === "meeting" && m.status === "active");
	const scheduledMeetings = meetingsArray
		.filter((m: any) => m.type === "meeting" && m.status === "scheduled")
		.sort((a: any, b: any) => (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0));
	const recentMeetings = meetingsArray.filter((m: any) => m.type === "meeting" && m.status === "ended").slice(0, 10);

	// Données réunion active
	const activeMeetingData = activeMeetingId
		? meetingsArray.find((m: any) => m._id === activeMeetingId)
		: null;

	// ── Handlers ──

	const resetForm = () => {
		setMeetingName("");
		setMeetingDescription("");
		setSelectedParticipants(new Set());
		setScheduledDate("");
		setScheduledTime("");
		setRecordingEnabled(false);
	};

	const handleCancelMeeting = async (meetingId: Id<"meetings">) => {
		if (!window.confirm("Annuler cette réunion planifiée ? Les invités seront notifiés.")) return;
		try {
			await cancelMeeting({ meetingId });
			toast.success("Réunion annulée");
		} catch (e: any) {
			toast.error(e?.message ?? "Annulation impossible");
		}
	};

	const handleCreate = async () => {
		if (!activeOrgId) return;
		try {
			const scheduledAt = scheduledDate && scheduledTime
				? new Date(`${scheduledDate}T${scheduledTime}`).getTime()
				: undefined;

			const result = await createMeeting({
				orgId: activeOrgId,
				title: meetingName.trim() || "Réunion instantanée",
				type: "meeting" as const,
				participantIds: Array.from(selectedParticipants) as Id<"users">[],
				scheduledAt,
				maxParticipants: 20,
				recordingEnabled,
				description: meetingDescription.trim() || undefined,
			});

			setActiveMeetingId(result.meetingId as Id<"meetings">);
			resetForm();

			if (scheduledAt) {
				toast.success("Réunion planifiée ");
				setView("list");
			} else {
				toast.success("Réunion créée ");
				setView("prejoin");
			}
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors de la création");
		}
	};

	const handleJoin = (meetingId: Id<"meetings">) => {
		setActiveMeetingId(meetingId);
		setView("prejoin");
	};

	const handleConnect = async () => {
		if (!activeMeetingId) return;
		resetDisconnectGuard();
		await connect(activeMeetingId);
		setView("incall");
	};

	const cleanupMeetingState = useCallback(() => {
		setActiveMeetingId(null);
		setView("list");
	}, []);

	const {
		onConnected: onLiveKitConnected,
		onDisconnected: onLiveKitDisconnected,
		markUserHangUp,
		reset: resetDisconnectGuard,
	} = useLiveKitDisconnectGuard(cleanupMeetingState);

	const handleDisconnect = async () => {
		markUserHangUp();
		if (activeMeetingId) await disconnect(activeMeetingId);
		cleanupMeetingState();
	};

	const handleEndForAll = async () => {
		if (!activeMeetingId) return;
		try {
			await endMeeting({ meetingId: activeMeetingId });
			toast.success("Réunion terminée pour tous");
		} catch {}
		await handleDisconnect();
	};

	const handleCopyLink = () => {
		if (!activeMeetingId) return;
		const link = `${window.location.origin}/meetings?join=${activeMeetingId}`;
		navigator.clipboard.writeText(link);
		setCopiedLink(true);
		toast.success("Lien copié !");
		setTimeout(() => setCopiedLink(false), 2000);
	};

	const toggleParticipant = useCallback((userId: string) => {
		setSelectedParticipants((prev) => {
			const next = new Set(prev);
			if (next.has(userId)) next.delete(userId);
			else next.add(userId);
			return next;
		});
	}, []);

	// ════════════════════════════════════════════════════════════
	// VUE: IN CALL
	// ════════════════════════════════════════════════════════════
	if (view === "incall" && token && wsUrl) {
		return (
			<div className="flex flex-col flex-1 overflow-hidden bg-secondary rounded-lg">
				{/* Barre d'actions réunion */}
				<div className="flex items-center justify-between px-3 py-2 bg-card border-b border-border shrink-0">
					<div className="flex items-center gap-2">
						<Badge className="text-[9px] bg-destructive/15 text-destructive">● En direct</Badge>
						<span className="text-xs text-zinc-400">{(activeMeetingData as any)?.title ?? "Réunion"}</span>
					</div>
					<div className="flex items-center gap-1.5">
						<Button variant="ghost" size="sm" onClick={handleCopyLink} className="h-7 text-[10px] text-zinc-400 hover:text-white gap-1">
							{copiedLink ? <Check className="h-3 w-3" /> : <ClipboardCopy className="h-3 w-3" />}
							{copiedLink ? "Copié" : "Lien"}
						</Button>
						<Button variant="destructive" size="sm" onClick={handleEndForAll} className="h-7 text-[10px] gap-1">
							<PhoneOff className="h-3 w-3" />
							Terminer pour tous
						</Button>
					</div>
				</div>
				<LiveKitRoom
					token={token}
					serverUrl={wsUrl}
					connect={true}
					options={LIVEKIT_CALL_ROOM_OPTIONS}
					onConnected={onLiveKitConnected}
					onDisconnected={onLiveKitDisconnected}
					className="flex flex-col flex-1"
				>
					<CustomCallUI onHangUp={handleDisconnect} />
				</LiveKitRoom>
			</div>
		);
	}

	// ════════════════════════════════════════════════════════════
	// VUE: PRE-JOIN
	// ════════════════════════════════════════════════════════════
	if (view === "prejoin") {
		return (
			<div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
				<div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
					<Video className="h-8 w-8 text-primary" />
				</div>
				<h3 className="text-base font-semibold mb-1">
					{(activeMeetingData as any)?.title ?? "Réunion"}
				</h3>
				<p className="text-sm text-muted-foreground mb-1">
					{(activeMeetingData as any)?.participants?.length ?? 0} participant(s)
				</p>

				{/* Lien de partage */}
				<button
					type="button"
					onClick={handleCopyLink}
					className="text-xs text-primary hover:underline flex items-center gap-1 mb-4"
				>
					{copiedLink ? <Check className="h-3 w-3" /> : <ClipboardCopy className="h-3 w-3" />}
					{copiedLink ? "Lien copié !" : "Copier le lien d'invitation"}
				</button>

				{meetingError && (
					<p className="text-xs text-destructive mb-3 bg-destructive/10 px-3 py-1.5 rounded-lg">
						{meetingError}
					</p>
				)}
				<div className="flex items-center gap-3 mt-2">
					<Button variant="outline" onClick={() => { setActiveMeetingId(null); setView("list"); }} disabled={isConnecting}>
						Annuler
					</Button>
					<Button onClick={handleConnect} disabled={isConnecting} className="gap-2 bg-primary hover:bg-primary/90">
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
	// VUE: CRÉATION (formulaire complet)
	// ════════════════════════════════════════════════════════════
	if (view === "create") {
		return (
			<div className="flex flex-col flex-1 min-h-0 overflow-hidden">
				<div className="px-4 py-3 border-b shrink-0 flex items-center justify-between">
					<h3 className="text-sm font-semibold">Nouvelle réunion</h3>
					<Button variant="ghost" size="icon" onClick={() => { resetForm(); setView("list"); }} className="h-7 w-7">
						<X className="h-4 w-4" />
					</Button>
				</div>

				<ScrollArea className="flex-1 min-h-0 px-4 py-3">
					<div className="space-y-4">
						{/* Nom */}
						<div className="space-y-1.5">
							<Label className="text-xs" htmlFor="meeting-name">
								Nom de la réunion
							</Label>
							<Input
								id="meeting-name"
								value={meetingName}
								onChange={(e) => setMeetingName(e.target.value)}
								placeholder="Ex: Briefing hebdomadaire"
								className="h-9"
								aria-label="Nom de la réunion"
							/>
						</div>

						{/* Description / ordre du jour */}
						<div className="space-y-1.5">
							<Label className="text-xs" htmlFor="meeting-description">
								Description / ordre du jour (optionnel)
							</Label>
							<textarea
								id="meeting-description"
								value={meetingDescription}
								onChange={(e) => setMeetingDescription(e.target.value)}
								placeholder="Points à traiter, contexte, lien vers un document…"
								rows={3}
								className="w-full rounded-md border bg-background px-3 py-2 text-xs resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								aria-label="Description de la réunion"
							/>
						</div>

						{/* Planification */}
						<div className="space-y-1.5">
							<Label className="text-xs flex items-center gap-1.5">
								<Calendar className="h-3.5 w-3.5" />
								Planifier (optionnel)
							</Label>
							<div className="grid grid-cols-2 gap-2">
								<Input
									type="date"
									value={scheduledDate}
									onChange={(e) => setScheduledDate(e.target.value)}
									className="h-9 text-xs"
									aria-label="Date de la réunion"
								/>
								<Input
									type="time"
									value={scheduledTime}
									onChange={(e) => setScheduledTime(e.target.value)}
									className="h-9 text-xs"
									aria-label="Heure de la réunion"
								/>
							</div>
							<p className="text-[10px] text-muted-foreground">
								Laissez vide pour démarrer immédiatement
							</p>
						</div>

						{/* Enregistrement */}
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Mic className="h-4 w-4 text-muted-foreground" />
								<div>
									<Label className="text-xs">Enregistrement</Label>
									<p className="text-[10px] text-muted-foreground">Sauvegarder la réunion</p>
								</div>
							</div>
							<Switch checked={recordingEnabled} onCheckedChange={setRecordingEnabled} />
						</div>

						{/* Inviter des participants (cross-org) */}
						<div className="space-y-2">
							<Label className="text-xs flex items-center gap-1.5">
								<Users className="h-3.5 w-3.5" />
								Inviter des participants ({selectedParticipants.size})
							</Label>
							<ParticipantPicker
								activeOrgId={activeOrgId ?? null}
								selectedParticipants={selectedParticipants}
								onToggle={toggleParticipant}
							/>
						</div>
					</div>
				</ScrollArea>

				{/* Footer */}
				<div className="border-t px-4 py-3 flex items-center justify-between shrink-0">
					<span className="text-[10px] text-muted-foreground">
						{selectedParticipants.size} invité{selectedParticipants.size > 1 ? "s" : ""}
						{scheduledDate && ` · Planifiée`}
					</span>
					<Button onClick={handleCreate} disabled={isCreating} className="gap-1.5 bg-primary hover:bg-primary/90">
						{isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
						{scheduledDate ? "Planifier" : "Démarrer"}
					</Button>
				</div>
			</div>
		);
	}

	// ════════════════════════════════════════════════════════════
	// VUE: LISTE
	// ════════════════════════════════════════════════════════════
	return (
		<div className="flex flex-col flex-1 min-h-0 overflow-hidden">
			{/* Bouton créer */}
			<div className="p-3 border-b shrink-0">
				<Button onClick={() => setView("create")} className="w-full gap-2 bg-primary hover:bg-primary/90">
					<Plus className="h-4 w-4" />
					Nouvelle réunion
				</Button>
			</div>

			<ScrollArea className="flex-1 min-h-0">
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
									 En cours
								</p>
								<div className="space-y-1.5">
									{activeMeetings.map((m: any) => {
										const isHighlighted = m._id === highlightedMeetingId;
										const partsLabel = formatParticipants(m.participants, participantNames);
										return (
											<div
												key={m._id}
												id={`meeting-card-${m._id}`}
												className={cn(
													"px-3 py-2.5 rounded-xl border border-primary/20 bg-primary/5 min-w-0 overflow-hidden space-y-2",
													isHighlighted && "ring-2 ring-primary/60",
												)}
											>
												<div className="flex items-center gap-2.5 min-w-0">
													<div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
														<Video className="h-4 w-4 text-primary" />
													</div>
													<div className="flex-1 min-w-0">
														<div className="flex items-center gap-1.5 min-w-0">
															<p className="text-sm font-medium truncate min-w-0 flex-1">
																{m.title ?? "Réunion"}
															</p>
															<Badge className="text-[8px] h-4 px-1.5 bg-primary/15 text-primary shrink-0">
																En direct
															</Badge>
														</div>
														{m.description && (
															<p className="text-[11px] text-muted-foreground line-clamp-1">
																{m.description}
															</p>
														)}
														<div className="flex items-center gap-1 text-[11px] text-muted-foreground min-w-0">
															<Users className="h-3 w-3 shrink-0" />
															<span className="truncate">{partsLabel}</span>
														</div>
													</div>
												</div>
												<Button
													size="sm"
													onClick={() => handleJoin(m._id)}
													className="gap-1 bg-primary hover:bg-primary/90 w-full h-8 text-[11px]"
												>
													<Video className="h-3.5 w-3.5" /> Rejoindre
												</Button>
											</div>
										);
									})}
								</div>
							</div>
						)}

						{/* Réunions planifiées */}
						{scheduledMeetings.length > 0 && (
							<div>
								<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">
									 Planifiées
								</p>
								<div className="space-y-1">
									{scheduledMeetings.map((m: any) => {
										const date = m.scheduledAt ? new Date(m.scheduledAt) : null;
										const isHighlighted = m._id === highlightedMeetingId;
										const partsLabel = formatParticipants(m.participants, participantNames);
										return (
											<div
												key={m._id}
												id={`meeting-card-${m._id}`}
												className={cn(
													"px-3 py-2 rounded-lg border border-border/30 hover:bg-muted/30 min-w-0 overflow-hidden",
													isHighlighted && "ring-2 ring-primary/60 bg-primary/5",
												)}
											>
												<div className="flex items-start gap-2.5 min-w-0">
													<Calendar className="h-4 w-4 text-primary shrink-0 mt-0.5" />
													<div className="flex-1 min-w-0">
														<p className="text-xs font-medium truncate">{m.title ?? "Réunion"}</p>
														{date && (
															<p className="text-[10px] text-muted-foreground">
																{date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} à{" "}
																{date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
															</p>
														)}
														{m.description && (
															<p className="text-[10px] text-muted-foreground/80 line-clamp-1">
																{m.description}
															</p>
														)}
														{partsLabel && (
															<p className="text-[10px] text-muted-foreground/70 truncate">
																<Users className="h-2.5 w-2.5 inline-block mr-0.5" />
																{partsLabel}
															</p>
														)}
													</div>
													<Button
														size="icon"
														variant="ghost"
														onClick={() => handleCancelMeeting(m._id as Id<"meetings">)}
														className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
														aria-label="Annuler la réunion"
														title="Annuler la réunion"
													>
														<X className="h-3.5 w-3.5" />
													</Button>
												</div>
												<Button
													size="sm"
													variant="outline"
													onClick={() => handleJoin(m._id)}
													className="mt-2 w-full h-7 text-[10px]"
												>
													Rejoindre
												</Button>
											</div>
										);
									})}
								</div>
							</div>
						)}

						{/* Historique */}
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">
								Récentes
							</p>
							{recentMeetings.length === 0 && activeMeetings.length === 0 && scheduledMeetings.length === 0 ? (
								<div className="flex flex-col items-center py-8 text-center">
									<Video className="h-8 w-8 text-muted-foreground/20 mb-2" />
									<p className="text-sm text-muted-foreground">Aucune réunion</p>
									<p className="text-xs text-muted-foreground/60 mt-1">Cliquez sur "Nouvelle réunion" pour commencer</p>
								</div>
							) : (
								<div className="space-y-0.5">
									{recentMeetings.map((m: any) => {
										const date = new Date(m.startedAt ?? m._creationTime);
										const duration = m.startedAt && m.endedAt ? Math.floor((m.endedAt - m.startedAt) / 60000) : 0;
										return (
											<div key={m._id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/30">
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
