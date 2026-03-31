/**
 * IAstedCallsTab — Onglet appels VoIP.
 * Réutilise useMeeting + meetings Convex pour l'historique.
 */

import { api } from "@convex/_generated/api";
import { Loader2, Phone, PhoneCall, PhoneMissed, PhoneOff, Search, User } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOrg } from "@/components/org/org-provider";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

export function IAstedCallsTab() {
	const { activeOrgId } = useOrg();
	const [search, setSearch] = useState("");

	// Historique appels (type=call)
	const { data: rawMeetings = [], isPending } = useAuthenticatedConvexQuery(
		api.functions.meetings.listByOrg,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	const meetingsArray = Array.isArray(rawMeetings) ? rawMeetings : [];
	const recentCalls = (meetingsArray as any[])
		.filter((m) => m.type === "call")
		.sort((a, b) => (b.startedAt ?? b._creationTime) - (a.startedAt ?? a._creationTime))
		.slice(0, 20);

	// Contacts (membres org)
	const { data: orgChart } = useAuthenticatedConvexQuery(
		api.functions.orgs.getOrgChart,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	const contacts = (orgChart as any)?.positions?.flatMap((pos: any) =>
		(pos.occupants ?? []).map((occ: any) => ({
			id: occ.userId,
			name: `${occ.firstName ?? ""} ${occ.lastName ?? ""}`.trim(),
			avatar: occ.avatarUrl,
			position: pos.title?.fr ?? pos.code,
		})),
	) ?? [];

	const filteredContacts = search
		? contacts.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()))
		: contacts;

	return (
		<div className="flex flex-col flex-1 overflow-hidden">
			{/* Recherche */}
			<div className="p-2 border-b">
				<div className="relative">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Rechercher un contact..."
						className="h-8 pl-8 text-xs"
					/>
				</div>
			</div>

			<ScrollArea className="flex-1">
				{/* Contacts appelables */}
				{filteredContacts.length > 0 && (
					<div className="p-2">
						<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
							Contacts
						</p>
						<div className="space-y-0.5">
							{filteredContacts.slice(0, 8).map((contact: any) => (
								<div
									key={contact.id}
									className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted/30 transition-colors"
								>
									<Avatar className="h-7 w-7">
										<AvatarImage src={contact.avatar} />
										<AvatarFallback className="text-[9px] bg-primary/10 text-primary">
											{contact.name?.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
										</AvatarFallback>
									</Avatar>
									<div className="flex-1 min-w-0">
										<p className="text-xs font-medium truncate">{contact.name}</p>
										<p className="text-[10px] text-muted-foreground truncate">{contact.position}</p>
									</div>
									<Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10">
										<Phone className="h-3.5 w-3.5" />
									</Button>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Historique appels */}
				<div className="p-2 border-t">
					<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
						Appels récents
					</p>
					{isPending ? (
						<div className="flex items-center justify-center py-4">
							<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
						</div>
					) : recentCalls.length === 0 ? (
						<div className="flex flex-col items-center py-6 text-center">
							<Phone className="h-6 w-6 text-muted-foreground/30 mb-2" />
							<p className="text-xs text-muted-foreground">Aucun appel récent</p>
						</div>
					) : (
						<div className="space-y-0.5">
							{recentCalls.map((call: any) => {
								const isEnded = call.status === "ended";
								const duration = call.startedAt && call.endedAt
									? Math.floor((call.endedAt - call.startedAt) / 60000)
									: 0;
								const date = new Date(call.startedAt ?? call._creationTime);

								return (
									<div key={call._id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/30">
										<div className={cn("h-6 w-6 rounded-full flex items-center justify-center shrink-0",
											isEnded ? "bg-emerald-500/10" : "bg-red-500/10"
										)}>
											{isEnded ? (
												<PhoneCall className="h-3 w-3 text-emerald-500" />
											) : (
												<PhoneMissed className="h-3 w-3 text-red-500" />
											)}
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-[11px] font-medium truncate">{call.title ?? "Appel"}</p>
											<p className="text-[9px] text-muted-foreground">
												{date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} à{" "}
												{date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
												{duration > 0 && ` • ${duration}min`}
											</p>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</ScrollArea>
		</div>
	);
}
