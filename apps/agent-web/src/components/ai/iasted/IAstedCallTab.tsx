/**
 * IAstedCallTab — Onglet iAppel unifié.
 *
 * 3 sous-sections : Audio, Vidéo, iRéunion
 * Fusionne les anciens IAstedCallsTab + IAstedMeetingsTab.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Link } from "@tanstack/react-router";
import {
	ExternalLink,
	Loader2,
	Mic,
	Phone,
	PhoneCall,
	PhoneMissed,
	Plus,
	Search,
	Users,
	Video,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOrg } from "@/components/org/org-provider";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

type SubTab = "audio" | "video";

const SUB_TABS: Array<{ id: SubTab; label: string; icon: typeof Phone }> = [
	{ id: "audio", label: "Audio", icon: Phone },
	{ id: "video", label: "Vidéo", icon: Video },
];

export function IAstedCallTab() {
	const { activeOrgId } = useOrg();
	const [subTab, setSubTab] = useState<SubTab>("audio");
	const [search, setSearch] = useState("");
	const [newMeetingName, setNewMeetingName] = useState("");

	// Données
	const { data: rawMeetings, isPending } = useAuthenticatedConvexQuery(
		api.functions.meetings.listByOrg,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	const { data: orgChart } = useAuthenticatedConvexQuery(
		api.functions.orgs.getOrgChart,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	const { mutateAsync: createMeeting, isPending: isCreating } = useConvexMutationQuery(
		api.functions.meetings.create,
	);

	const meetingsArray = Array.isArray(rawMeetings) ? rawMeetings : [];

	const contacts = useMemo(() => {
		const raw = (orgChart as any)?.positions?.flatMap((pos: any) =>
			(pos.occupants ?? []).map((occ: any) => ({
				id: occ.userId,
				name: `${occ.firstName ?? ""} ${occ.lastName ?? ""}`.trim(),
				avatar: occ.avatarUrl,
				position: pos.title?.fr ?? pos.code,
			})),
		) ?? [];
		// Dédoublonner par nom
		return raw.filter((c: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.name === c.name) === i);
	}, [orgChart]);

	const filteredContacts = search
		? contacts.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()))
		: contacts;

	// Historique filtré par type
	const callHistory = useMemo(() => {
		if (subTab === "reunion") {
			return meetingsArray.filter((m: any) => m.type === "meeting").slice(0, 15);
		}
		return meetingsArray.filter((m: any) => m.type === "call").slice(0, 15);
	}, [meetingsArray, subTab]);

	const activeMeetings = meetingsArray.filter((m: any) => m.type === "meeting" && m.status === "active");

	const handleCreateMeeting = async () => {
		if (!activeOrgId) return;
		try {
			await createMeeting({
				orgId: activeOrgId,
				title: newMeetingName.trim() || "Réunion instantanée",
				type: "meeting" as const,
				participantIds: [] as Id<"users">[],
			});
			toast.success("Réunion créée ✓");
			setNewMeetingName("");
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur");
		}
	};

	return (
		<div className="flex flex-col flex-1 overflow-hidden">
			{/* Sous-navigation */}
			<div className="px-2 pt-2 pb-1 border-b shrink-0">
				<div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5">
					{SUB_TABS.map((tab) => {
						const Icon = tab.icon;
						const isActive = subTab === tab.id;
						return (
							<button
								key={tab.id}
								type="button"
								onClick={() => setSubTab(tab.id)}
								className={cn(
									"flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-medium transition-colors",
									isActive ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
								)}
							>
								<Icon className="h-3.5 w-3.5" />
								{tab.label}
							</button>
						);
					})}
				</div>
			</div>

			{subTab === "reunion" ? (
				/* ═══ iRéunion ═══ */
				<ScrollArea className="flex-1">
					{/* Créer une réunion */}
					<div className="p-2 border-b">
						<div className="flex items-center gap-1.5">
							<Input
								value={newMeetingName}
								onChange={(e) => setNewMeetingName(e.target.value)}
								placeholder="Nom de la réunion..."
								className="h-7 text-xs flex-1"
								onKeyDown={(e) => e.key === "Enter" && handleCreateMeeting()}
							/>
							<Button size="sm" onClick={handleCreateMeeting} disabled={isCreating} className="h-7 text-[10px] gap-1 px-2">
								{isCreating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
								Créer
							</Button>
						</div>
					</div>

					{/* Réunions en cours */}
					{activeMeetings.length > 0 && (
						<div className="p-2">
							<p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground px-1 py-1">En cours</p>
							{activeMeetings.map((m: any) => (
								<div key={m._id} className="flex items-center gap-2 px-2 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 mb-1">
									<div className="h-7 w-7 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
										<Video className="h-3.5 w-3.5 text-emerald-500" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-[11px] font-medium truncate">{m.title ?? "Réunion"}</p>
										<p className="text-[9px] text-muted-foreground">{m.participants?.length ?? 0} participants</p>
									</div>
									<Button size="sm" asChild className="h-6 text-[9px] gap-1 px-2">
										<Link to="/meetings"><ExternalLink className="h-2.5 w-2.5" />Rejoindre</Link>
									</Button>
								</div>
							))}
						</div>
					)}

					{/* Historique réunions */}
					<HistoryList items={callHistory} isPending={isPending} emptyIcon={Users} emptyText="Aucune réunion" />
				</ScrollArea>
			) : (
				/* ═══ Audio / Vidéo ═══ */
				<>
					{/* Recherche contacts */}
					<div className="p-2 border-b">
						<div className="relative">
							<Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
							<Input value={search} onChange={(e) => setSearch(e.target.value)}
								placeholder="Rechercher un contact..." className="h-7 pl-7 text-xs" />
						</div>
					</div>

					<ScrollArea className="flex-1">
						{/* Contacts */}
						{filteredContacts.length > 0 && (
							<div className="p-1.5">
								<p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground px-1.5 py-1">Contacts</p>
								{filteredContacts.slice(0, 8).map((c: any) => (
									<div key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/30">
										<Avatar className="h-7 w-7">
											<AvatarImage src={c.avatar} />
											<AvatarFallback className="text-[8px] bg-primary/10 text-primary">
												{c.name?.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
											</AvatarFallback>
										</Avatar>
										<div className="flex-1 min-w-0">
											<p className="text-[11px] font-medium truncate">{c.name}</p>
											<p className="text-[9px] text-muted-foreground truncate">{c.position}</p>
										</div>
										<Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-500 hover:bg-emerald-500/10">
											{subTab === "audio" ? <Phone className="h-3 w-3" /> : <Video className="h-3 w-3" />}
										</Button>
									</div>
								))}
							</div>
						)}

						{/* Historique */}
						<div className="border-t">
							<HistoryList items={callHistory} isPending={isPending}
								emptyIcon={subTab === "audio" ? Phone : Video}
								emptyText={subTab === "audio" ? "Aucun appel audio" : "Aucun appel vidéo"} />
						</div>
					</ScrollArea>
				</>
			)}
		</div>
	);
}

// ── Composant historique réutilisable ──
function HistoryList({ items, isPending, emptyIcon: Icon, emptyText }: {
	items: any[]; isPending: boolean; emptyIcon: typeof Phone; emptyText: string;
}) {
	if (isPending) return <div className="flex items-center justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;

	if (items.length === 0) {
		return (
			<div className="flex flex-col items-center py-6 text-center">
				<Icon className="h-6 w-6 text-muted-foreground/30 mb-2" />
				<p className="text-[11px] text-muted-foreground">{emptyText}</p>
			</div>
		);
	}

	return (
		<div className="p-1.5">
			<p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground px-1.5 py-1">Récents</p>
			{items.map((item: any) => {
				const isEnded = item.status === "ended";
				const date = new Date(item.startedAt ?? item._creationTime);
				const duration = item.startedAt && item.endedAt ? Math.floor((item.endedAt - item.startedAt) / 60000) : 0;
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
								{duration > 0 && ` · ${duration}min`}
							</p>
						</div>
					</div>
				);
			})}
		</div>
	);
}
