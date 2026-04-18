/**
 * BackofficeMeetingTab — Module iRéunion (backoffice).
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
	Calendar,
	Check,
	ClipboardCopy,
	Globe,
	Loader2,
	Mic,
	PhoneOff,
	Plus,
	Search,
	Shield,
	Users,
	Video,
	X,
} from "lucide-react";
import { useCallback, useState } from "react";
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
import { useContactSearch, type ContactSource } from "@/hooks/useContactSearch";
import { useMeeting } from "@/hooks/use-meeting";
import { useAuthenticatedConvexQuery, useConvexMutationQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

type ViewState = "list" | "create" | "prejoin" | "incall";

const MEETING_SEGMENTS: Array<{ id: ContactSource | "all"; label: string; icon: typeof Users }> = [
	{ id: "all", label: "Tous", icon: Users },
	{ id: "team", label: "Équipe", icon: Shield },
	{ id: "network", label: "Réseau", icon: Globe },
];

interface BackofficeMeetingTabProps {
	orgId: Id<"orgs"> | null;
}

export function BackofficeMeetingTab({ orgId }: BackofficeMeetingTabProps) {
	const [view, setView] = useState<ViewState>("list");
	const [activeMeetingId, setActiveMeetingId] = useState<Id<"meetings"> | null>(null);
	const [meetingName, setMeetingName] = useState("");
	const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
	const [scheduledDate, setScheduledDate] = useState("");
	const [scheduledTime, setScheduledTime] = useState("");
	const [recordingEnabled, setRecordingEnabled] = useState(false);
	const [copiedLink, setCopiedLink] = useState(false);

	const { groups: contactGroups, isPending: contactsLoading, filters: contactFilters, setSearch: setContactSearch, setSource: setContactSource } = useContactSearch(orgId);
	const { token, wsUrl, isConnecting, error: meetingError, connect, disconnect } = useMeeting(activeMeetingId ?? undefined);

	const { data: rawMeetings, isPending } = useAuthenticatedConvexQuery(api.functions.meetings.listByOrg, orgId ? { orgId } : "skip");
	const { mutateAsync: createMeeting, isPending: isCreating } = useConvexMutationQuery(api.functions.meetings.create);
	const { mutateAsync: endMeeting } = useConvexMutationQuery(api.functions.meetings.end);

	const meetingsArray = Array.isArray(rawMeetings) ? rawMeetings : [];
	const activeMeetings = meetingsArray.filter((m: any) => m.type === "meeting" && m.status === "active");
	const scheduledMeetings = meetingsArray.filter((m: any) => m.type === "meeting" && m.status === "scheduled");
	const recentMeetings = meetingsArray.filter((m: any) => m.type === "meeting" && m.status === "ended").slice(0, 10);
	const activeMeetingData = activeMeetingId ? meetingsArray.find((m: any) => m._id === activeMeetingId) : null;

	const resetForm = () => { setMeetingName(""); setSelectedParticipants(new Set()); setScheduledDate(""); setScheduledTime(""); setRecordingEnabled(false); setContactSearch(""); };

	const handleCreate = async () => {
		if (!orgId) return;
		try {
			const scheduledAt = scheduledDate && scheduledTime ? new Date(`${scheduledDate}T${scheduledTime}`).getTime() : undefined;
			const result = await createMeeting({ orgId, title: meetingName.trim() || "Réunion instantanée", type: "meeting" as const, participantIds: Array.from(selectedParticipants) as Id<"users">[], scheduledAt, maxParticipants: 20 });
			setActiveMeetingId(result.meetingId as Id<"meetings">);
			resetForm();
			if (scheduledAt) { toast.success("Réunion planifiée"); setView("list"); } else { toast.success("Réunion créée"); setView("prejoin"); }
		} catch (e: any) { toast.error(e?.message ?? "Erreur lors de la création"); }
	};

	const handleJoin = (meetingId: Id<"meetings">) => { setActiveMeetingId(meetingId); setView("prejoin"); };
	const handleConnect = async () => { if (!activeMeetingId) return; await connect(activeMeetingId); setView("incall"); };
	const cleanupMeetingState = useCallback(() => {
		setActiveMeetingId(null);
		setView("list");
	}, []);

	const {
		onConnected: onLiveKitConnected,
		onDisconnected: onLiveKitDisconnected,
		markUserHangUp,
	} = useLiveKitDisconnectGuard(cleanupMeetingState);

	const handleDisconnect = async () => {
		markUserHangUp();
		if (activeMeetingId) await disconnect(activeMeetingId);
		cleanupMeetingState();
	};
	const handleEndForAll = async () => { if (!activeMeetingId) return; try { await endMeeting({ meetingId: activeMeetingId }); toast.success("Réunion terminée pour tous"); } catch {} await handleDisconnect(); };
	const handleCopyLink = () => { if (!activeMeetingId) return; navigator.clipboard.writeText(`${window.location.origin}/meetings?join=${activeMeetingId}`); setCopiedLink(true); toast.success("Lien copié !"); setTimeout(() => setCopiedLink(false), 2000); };
	const toggleParticipant = (userId: string) => { setSelectedParticipants((prev) => { const next = new Set(prev); if (next.has(userId)) next.delete(userId); else next.add(userId); return next; }); };

	if (!orgId) {
		return (<div className="flex-1 flex items-center justify-center p-6 text-center"><p className="text-xs text-muted-foreground">Sélectionnez une organisation pour gérer les réunions.</p></div>);
	}

	// ── IN CALL ──
	if (view === "incall" && token && wsUrl) {
		return (
			<div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-zinc-950 rounded-lg">
				<div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
					<div className="flex items-center gap-2">
						<Badge className="text-[9px] bg-red-500/15 text-red-400">En direct</Badge>
						<span className="text-xs text-zinc-400">{(activeMeetingData as any)?.title ?? "Réunion"}</span>
					</div>
					<div className="flex items-center gap-1.5">
						<Button variant="ghost" size="sm" onClick={handleCopyLink} className="h-7 text-[10px] text-zinc-400 hover:text-white gap-1">{copiedLink ? <Check className="h-3 w-3" /> : <ClipboardCopy className="h-3 w-3" />}{copiedLink ? "Copié" : "Lien"}</Button>
						<Button variant="destructive" size="sm" onClick={handleEndForAll} className="h-7 text-[10px] gap-1"><PhoneOff className="h-3 w-3" />Terminer</Button>
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

	// ── PRE-JOIN ──
	if (view === "prejoin") {
		return (
			<div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
				<div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4"><Video className="h-8 w-8 text-emerald-500" /></div>
				<h3 className="text-base font-semibold mb-1">{(activeMeetingData as any)?.title ?? "Réunion"}</h3>
				<p className="text-sm text-muted-foreground mb-1">{(activeMeetingData as any)?.participants?.length ?? 0} participant(s)</p>
				<button type="button" onClick={handleCopyLink} className="text-xs text-primary hover:underline flex items-center gap-1 mb-4">{copiedLink ? <Check className="h-3 w-3" /> : <ClipboardCopy className="h-3 w-3" />}{copiedLink ? "Lien copié !" : "Copier le lien d'invitation"}</button>
				{meetingError && <p className="text-xs text-destructive mb-3 bg-destructive/10 px-3 py-1.5 rounded-lg">{meetingError}</p>}
				<div className="flex items-center gap-3 mt-2">
					<Button variant="outline" onClick={() => { setActiveMeetingId(null); setView("list"); }} disabled={isConnecting}>Annuler</Button>
					<Button onClick={handleConnect} disabled={isConnecting} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
						{isConnecting ? <><Loader2 className="h-4 w-4 animate-spin" /> Connexion...</> : <><Video className="h-4 w-4" /> Rejoindre</>}
					</Button>
				</div>
			</div>
		);
	}

	// ── CREATE ──
	if (view === "create") {
		return (
			<div className="flex flex-col flex-1 min-h-0 overflow-hidden">
				<div className="px-4 py-3 border-b shrink-0 flex items-center justify-between">
					<h3 className="text-sm font-semibold">Nouvelle réunion</h3>
					<Button variant="ghost" size="icon" onClick={() => { resetForm(); setView("list"); }} className="h-7 w-7"><X className="h-4 w-4" /></Button>
				</div>
				<ScrollArea className="flex-1 min-h-0 px-4 py-3">
					<div className="space-y-4">
						<div className="space-y-1.5">
							<Label className="text-xs">Nom de la réunion</Label>
							<Input value={meetingName} onChange={(e) => setMeetingName(e.target.value)} placeholder="Ex: Briefing hebdomadaire" className="h-9" />
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Planifier (optionnel)</Label>
							<div className="grid grid-cols-2 gap-2">
								<Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="h-9 text-xs" />
								<Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="h-9 text-xs" />
							</div>
							<p className="text-[10px] text-muted-foreground">Laissez vide pour démarrer immédiatement</p>
						</div>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Mic className="h-4 w-4 text-muted-foreground" />
								<div><Label className="text-xs">Enregistrement</Label><p className="text-[10px] text-muted-foreground">Sauvegarder la réunion</p></div>
							</div>
							<Switch checked={recordingEnabled} onCheckedChange={setRecordingEnabled} />
						</div>
						<div className="space-y-2">
							<Label className="text-xs flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Inviter des participants ({selectedParticipants.size})</Label>
							<div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input value={contactFilters.searchTerm} onChange={(e) => setContactSearch(e.target.value)} placeholder="Rechercher..." className="h-8 pl-8 text-xs" /></div>
							<div className="flex items-center gap-1">
								{MEETING_SEGMENTS.map((seg) => (<button key={seg.id} type="button" onClick={() => setContactSource(seg.id)} className={cn("text-[9px] px-1.5 py-0.5 rounded-md font-medium transition-colors", contactFilters.source === seg.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>{seg.label}</button>))}
							</div>
							<div className="max-h-[200px] overflow-y-auto border rounded-lg">
								{contactsLoading ? (<div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>) : contactGroups.length > 0 ? (
									contactGroups.map((group: any) => (
										<div key={group.org.id}>
											<div className="flex items-center gap-1.5 px-3 py-1 bg-muted/20 sticky top-0"><Building2 className="h-2.5 w-2.5 text-muted-foreground shrink-0" /><span className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{group.org.name}</span></div>
											{group.contacts.map((c: any) => {
												const isSelected = selectedParticipants.has(c.userId);
												return (<label key={c.id} className={cn("flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors", isSelected ? "bg-primary/5" : "hover:bg-muted/30")}>
													<Checkbox checked={isSelected} onCheckedChange={() => toggleParticipant(c.userId)} className="h-4 w-4" />
													<Avatar className="h-7 w-7"><AvatarImage src={c.avatar} /><AvatarFallback className={cn("text-[9px]", c.source === "team" ? "bg-primary/10 text-primary" : "bg-blue-500/10 text-blue-600")}>{c.name?.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}</AvatarFallback></Avatar>
													<div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{c.lastName} {c.firstName}</p><p className="text-[10px] text-muted-foreground truncate">{c.position}</p></div>
													{isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
												</label>);
											})}
										</div>
									))
								) : (<p className="text-xs text-muted-foreground text-center py-4">{contactFilters.searchTerm ? "Aucun résultat" : "Aucun contact"}</p>)}
							</div>
						</div>
					</div>
				</ScrollArea>
				<div className="border-t px-4 py-3 flex items-center justify-between shrink-0">
					<span className="text-[10px] text-muted-foreground">{selectedParticipants.size} invité{selectedParticipants.size > 1 ? "s" : ""}{scheduledDate && " · Planifiée"}</span>
					<Button onClick={handleCreate} disabled={isCreating} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
						{isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}{scheduledDate ? "Planifier" : "Démarrer"}
					</Button>
				</div>
			</div>
		);
	}

	// ── LIST ──
	return (
		<div className="flex flex-col flex-1 min-h-0 overflow-hidden">
			<div className="p-3 border-b shrink-0"><Button onClick={() => setView("create")} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4" />Nouvelle réunion</Button></div>
			<ScrollArea className="flex-1 min-h-0">
				{isPending ? (<div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>) : (
					<div className="p-3 space-y-4">
						{activeMeetings.length > 0 && (<div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">En cours</p><div className="space-y-1.5">
							{activeMeetings.map((m: any) => (<div key={m._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5"><div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0"><Video className="h-5 w-5 text-emerald-500" /></div><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{m.title ?? "Réunion"}</p><div className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="h-3 w-3" />{m.participants?.length ?? 0} · <Badge className="text-[8px] h-4 bg-emerald-500/15 text-emerald-500">En direct</Badge></div></div><Button size="sm" onClick={() => handleJoin(m._id)} className="gap-1 bg-emerald-600 hover:bg-emerald-700"><Video className="h-3.5 w-3.5" />Rejoindre</Button></div>))}
						</div></div>)}
						{scheduledMeetings.length > 0 && (<div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">Planifiées</p><div className="space-y-1">
							{scheduledMeetings.map((m: any) => { const date = m.scheduledAt ? new Date(m.scheduledAt) : null; return (<div key={m._id} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/30 hover:bg-muted/30"><Calendar className="h-4 w-4 text-blue-500 shrink-0" /><div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{m.title ?? "Réunion"}</p>{date && <p className="text-[10px] text-muted-foreground">{date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} à {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>}</div><Button size="sm" variant="outline" onClick={() => handleJoin(m._id)} className="h-7 text-[10px]">Rejoindre</Button></div>); })}
						</div></div>)}
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">Récentes</p>
							{recentMeetings.length === 0 && activeMeetings.length === 0 && scheduledMeetings.length === 0 ? (
								<div className="flex flex-col items-center py-8 text-center"><Video className="h-8 w-8 text-muted-foreground/20 mb-2" /><p className="text-sm text-muted-foreground">Aucune réunion</p><p className="text-xs text-muted-foreground/60 mt-1">Cliquez sur "Nouvelle réunion" pour commencer</p></div>
							) : (<div className="space-y-0.5">
								{recentMeetings.map((m: any) => { const date = new Date(m.startedAt ?? m._creationTime); const duration = m.startedAt && m.endedAt ? Math.floor((m.endedAt - m.startedAt) / 60000) : 0; return (<div key={m._id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/30"><div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0"><Video className="h-4 w-4 text-muted-foreground" /></div><div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{m.title ?? "Réunion"}</p><p className="text-[10px] text-muted-foreground">{date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} à {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}{duration > 0 && ` · ${duration}min`}{m.participants && ` · ${m.participants.length} part.`}</p></div></div>); })}
							</div>)}
						</div>
					</div>
				)}
			</ScrollArea>
		</div>
	);
}
