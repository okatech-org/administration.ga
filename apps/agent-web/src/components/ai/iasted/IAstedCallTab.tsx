/**
 * IAstedCallTab — Onglet iAppel unifié.
 *
 * 3 sous-sections : Audio, Vidéo, iRéunion
 * Fusionne les anciens IAstedCallsTab + IAstedMeetingsTab.
 */

import { api } from "@convex/_generated/api";
// Pas d'import Id nécessaire ici (détaché vers IAstedMeetingTab)
import {
	Building2,
	Globe,
	Loader2,
	Phone,
	PhoneCall,
	PhoneMissed,
	Search,
	Shield,
	Users,
	Video,
} from "lucide-react";
import { useMemo, useState } from "react";
// toast non utilisé ici (appels ne sont pas encore implémentés côté backend)
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOrg } from "@/components/org/org-provider";
import { useContactSearch, type ContactSource } from "@/hooks/useContactSearch";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

type SubTab = "audio" | "video";

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
	const { activeOrgId } = useOrg();
	const [subTab, setSubTab] = useState<SubTab>("audio");

	// Recherche intelligente cross-org
	const {
		groups,
		isPending: contactsLoading,
		filters,
		setSearch,
		setSource,
	} = useContactSearch();

	// Données historique d'appels
	const { data: rawMeetings, isPending } = useAuthenticatedConvexQuery(
		api.functions.meetings.listByOrg,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	const meetingsArray = Array.isArray(rawMeetings) ? rawMeetings : [];

	// Historique filtré par type (audio/video calls only)
	const callHistory = useMemo(() => {
		return meetingsArray.filter((m: any) => m.type === "call").slice(0, 15);
	}, [meetingsArray]);

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

			{(
				/* ═══ Audio / Vidéo ═══ */
				<>
					{/* Recherche contacts + segments */}
					<div className="p-2 border-b space-y-1.5">
						<div className="relative">
							<Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
							<Input value={filters.searchTerm} onChange={(e) => setSearch(e.target.value)}
								placeholder="Rechercher (nom, poste, org)..." className="h-7 pl-7 text-xs" />
						</div>
						<div className="flex items-center gap-1">
							{CALL_SOURCE_SEGMENTS.map((seg) => (
								<button
									key={seg.id}
									type="button"
									onClick={() => setSource(seg.id)}
									className={cn(
										"text-[9px] px-1.5 py-0.5 rounded-md font-medium transition-colors",
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

					<ScrollArea className="flex-1">
						{/* Contacts groupés par org */}
						{contactsLoading ? (
							<div className="flex items-center justify-center py-6">
								<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
							</div>
						) : groups.length > 0 ? (
							<div className="divide-y">
								{groups.map((group: any) => (
									<div key={group.org.id} className="py-1">
										<div className="flex items-center gap-2 px-3 py-1">
											<Building2 className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
											<span className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
												{group.org.name}
											</span>
											{group.org.country && (
												<span className="text-[7px] text-muted-foreground/60">{group.org.country}</span>
											)}
										</div>
										{group.contacts.map((c: any) => (
											<div key={c.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/30">
												<Avatar className="h-7 w-7">
													<AvatarImage src={c.avatar} />
													<AvatarFallback className={cn("text-[8px]",
														c.source === "team" ? "bg-primary/10 text-primary" : "bg-blue-500/10 text-blue-600",
													)}>
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
												<Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-500 hover:bg-emerald-500/10">
													{subTab === "audio" ? <Phone className="h-3 w-3" /> : <Video className="h-3 w-3" />}
												</Button>
											</div>
										))}
									</div>
								))}
							</div>
						) : (
							<div className="flex flex-col items-center py-6 text-center">
								<Users className="h-6 w-6 text-muted-foreground/30 mb-2" />
								<p className="text-[11px] text-muted-foreground">
									{filters.searchTerm ? "Aucun résultat" : "Aucun contact"}
								</p>
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
