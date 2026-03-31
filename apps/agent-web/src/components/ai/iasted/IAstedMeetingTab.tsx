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
import {
	Calendar,
	Check,
	ClipboardCopy,
	Loader2,
	Mic,
	PhoneOff,
	Plus,
	Search,
	Users,
	Video,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { CustomCallUI } from "@/components/meetings/custom-call-ui";
import { useOrg } from "@/components/org/org-provider";
import { useMeeting } from "@/hooks/use-meeting";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

type ViewState = "list" | "create" | "prejoin" | "incall";

export function IAstedMeetingTab() {
	const { activeOrgId } = useOrg();
	const [view, setView] = useState<ViewState>("list");
	const [activeMeetingId, setActiveMeetingId] = useState<Id<"meetings"> | null>(null);

	// Formulaire de création
	const [meetingName, setMeetingName] = useState("");
	const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
	const [scheduledDate, setScheduledDate] = useState("");
	const [scheduledTime, setScheduledTime] = useState("");
	const [recordingEnabled, setRecordingEnabled] = useState(false);
	const [contactSearch, setContactSearch] = useState("");
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
	const { data: orgChart } = useAuthenticatedConvexQuery(
		api.functions.orgs.getOrgChart,
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
	const scheduledMeetings = meetingsArray.filter((m: any) => m.type === "meeting" && m.status === "scheduled");
	const recentMeetings = meetingsArray.filter((m: any) => m.type === "meeting" && m.status === "ended").slice(0, 10);

	// Contacts (dédoublonnés)
	const contacts = useMemo(() => {
		const raw = (orgChart as any)?.positions?.flatMap((pos: any) =>
			(pos.occupants ?? []).map((occ: any) => ({
				id: occ.userId,
				name: `${occ.firstName ?? ""} ${occ.lastName ?? ""}`.trim(),
				lastName: (occ.lastName ?? "").toUpperCase(),
				firstName: occ.firstName ?? "",
				avatar: occ.avatarUrl,
				position: pos.title?.fr ?? pos.code,
			})),
		) ?? [];
		return raw.filter((c: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.name === c.name) === i);
	}, [orgChart]);

	const filteredContacts = contactSearch
		? contacts.filter((c: any) => c.name.toLowerCase().includes(contactSearch.toLowerCase()))
		: contacts;

	// Données réunion active
	const activeMeetingData = activeMeetingId
		? meetingsArray.find((m: any) => m._id === activeMeetingId)
		: null;

	// ── Handlers ──

	const resetForm = () => {
		setMeetingName("");
		setSelectedParticipants(new Set());
		setScheduledDate("");
		setScheduledTime("");
		setRecordingEnabled(false);
		setContactSearch("");
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
			});

			setActiveMeetingId(result.meetingId as Id<"meetings">);
			resetForm();

			if (scheduledAt) {
				toast.success("Réunion planifiée ✓");
				setView("list");
			} else {
				toast.success("Réunion créée ✓");
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
		await connect(activeMeetingId);
		setView("incall");
	};

	const handleDisconnect = async () => {
		if (activeMeetingId) await disconnect(activeMeetingId);
		setActiveMeetingId(null);
		setView("list");
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

	const toggleParticipant = (userId: string) => {
		setSelectedParticipants((prev) => {
			const next = new Set(prev);
			if (next.has(userId)) next.delete(userId);
			else next.add(userId);
			return next;
		});
	};

	// ════════════════════════════════════════════════════════════
	// VUE: IN CALL
	// ════════════════════════════════════════════════════════════
	if (view === "incall" && token && wsUrl) {
		return (
			<div className="flex flex-col flex-1 overflow-hidden bg-zinc-950 rounded-lg">
				{/* Barre d'actions réunion */}
				<div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
					<div className="flex items-center gap-2">
						<Badge className="text-[9px] bg-red-500/15 text-red-400">● En direct</Badge>
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
					onDisconnected={handleDisconnect}
					className="flex flex-col flex-1"
				>
					<CustomCallUI onDisconnect={handleDisconnect} />
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
				<div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
					<Video className="h-8 w-8 text-emerald-500" />
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
	// VUE: CRÉATION (formulaire complet)
	// ════════════════════════════════════════════════════════════
	if (view === "create") {
		return (
			<div className="flex flex-col flex-1 overflow-hidden">
				<div className="px-4 py-3 border-b shrink-0 flex items-center justify-between">
					<h3 className="text-sm font-semibold">Nouvelle réunion</h3>
					<Button variant="ghost" size="icon" onClick={() => { resetForm(); setView("list"); }} className="h-7 w-7">
						<X className="h-4 w-4" />
					</Button>
				</div>

				<ScrollArea className="flex-1 px-4 py-3">
					<div className="space-y-4">
						{/* Nom */}
						<div className="space-y-1.5">
							<Label className="text-xs">Nom de la réunion</Label>
							<Input
								value={meetingName}
								onChange={(e) => setMeetingName(e.target.value)}
								placeholder="Ex: Briefing hebdomadaire"
								className="h-9"
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
								/>
								<Input
									type="time"
									value={scheduledTime}
									onChange={(e) => setScheduledTime(e.target.value)}
									className="h-9 text-xs"
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

						{/* Inviter des participants */}
						<div className="space-y-2">
							<Label className="text-xs flex items-center gap-1.5">
								<Users className="h-3.5 w-3.5" />
								Inviter des participants ({selectedParticipants.size})
							</Label>
							<div className="relative">
								<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
								<Input
									value={contactSearch}
									onChange={(e) => setContactSearch(e.target.value)}
									placeholder="Rechercher..."
									className="h-8 pl-8 text-xs"
								/>
							</div>
							<div className="space-y-0.5 max-h-[200px] overflow-y-auto border rounded-lg">
								{filteredContacts.map((c: any) => {
									const isSelected = selectedParticipants.has(c.id);
									return (
										<label
											key={c.id}
											className={cn(
												"flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors",
												isSelected ? "bg-primary/5" : "hover:bg-muted/30",
											)}
										>
											<Checkbox
												checked={isSelected}
												onCheckedChange={() => toggleParticipant(c.id)}
												className="h-4 w-4"
											/>
											<Avatar className="h-7 w-7">
												<AvatarImage src={c.avatar} />
												<AvatarFallback className="text-[9px] bg-primary/10 text-primary">
													{c.name?.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
												</AvatarFallback>
											</Avatar>
											<div className="flex-1 min-w-0">
												<p className="text-xs font-medium truncate">{c.lastName} {c.firstName}</p>
												<p className="text-[10px] text-muted-foreground truncate">{c.position}</p>
											</div>
											{isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
										</label>
									);
								})}
								{filteredContacts.length === 0 && (
									<p className="text-xs text-muted-foreground text-center py-4">Aucun contact</p>
								)}
							</div>
						</div>
					</div>
				</ScrollArea>

				{/* Footer */}
				<div className="border-t px-4 py-3 flex items-center justify-between shrink-0">
					<span className="text-[10px] text-muted-foreground">
						{selectedParticipants.size} invité{selectedParticipants.size > 1 ? "s" : ""}
						{scheduledDate && ` · Planifiée`}
					</span>
					<Button onClick={handleCreate} disabled={isCreating} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
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
		<div className="flex flex-col flex-1 overflow-hidden">
			{/* Bouton créer */}
			<div className="p-3 border-b shrink-0">
				<Button onClick={() => setView("create")} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700">
					<Plus className="h-4 w-4" />
					Nouvelle réunion
				</Button>
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
										<div key={m._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
											<div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
												<Video className="h-5 w-5 text-emerald-500" />
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium truncate">{m.title ?? "Réunion"}</p>
												<div className="flex items-center gap-2 text-xs text-muted-foreground">
													<Users className="h-3 w-3" />
													{m.participants?.length ?? 0} · <Badge className="text-[8px] h-4 bg-emerald-500/15 text-emerald-500">● En direct</Badge>
												</div>
											</div>
											<Button size="sm" onClick={() => handleJoin(m._id)} className="gap-1 bg-emerald-600 hover:bg-emerald-700">
												<Video className="h-3.5 w-3.5" /> Rejoindre
											</Button>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Réunions planifiées */}
						{scheduledMeetings.length > 0 && (
							<div>
								<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">
									📅 Planifiées
								</p>
								<div className="space-y-1">
									{scheduledMeetings.map((m: any) => {
										const date = m.scheduledAt ? new Date(m.scheduledAt) : null;
										return (
											<div key={m._id} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/30 hover:bg-muted/30">
												<Calendar className="h-4 w-4 text-blue-500 shrink-0" />
												<div className="flex-1 min-w-0">
													<p className="text-xs font-medium truncate">{m.title ?? "Réunion"}</p>
													{date && (
														<p className="text-[10px] text-muted-foreground">
															{date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} à{" "}
															{date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
														</p>
													)}
												</div>
												<Button size="sm" variant="outline" onClick={() => handleJoin(m._id)} className="h-7 text-[10px]">
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
