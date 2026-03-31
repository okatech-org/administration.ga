/**
 * IAstedComTab — Onglet messagerie interne (iCom).
 * Contacts = membres de l'organisation, conversations temps réel Convex.
 */

import { api } from "@convex/_generated/api";
import { Loader2, MessageSquare, Search, Send, User } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useOrg } from "@/components/org/org-provider";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

export function IAstedComTab() {
	const { activeOrgId } = useOrg();
	const [search, setSearch] = useState("");
	const [selectedContact, setSelectedContact] = useState<any>(null);
	const [messageInput, setMessageInput] = useState("");

	// Charger les membres de l'org comme contacts
	const { data: orgChart } = useAuthenticatedConvexQuery(
		api.functions.orgs.getOrgChart,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	const contacts = (orgChart as any)?.positions?.flatMap((pos: any) =>
		(pos.occupants ?? []).map((occ: any) => ({
			id: occ.userId,
			name: `${occ.firstName ?? ""} ${occ.lastName ?? ""}`.trim(),
			email: occ.email,
			avatar: occ.avatarUrl,
			position: pos.title?.fr ?? pos.code,
		})),
	) ?? [];

	const filteredContacts = search
		? contacts.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()))
		: contacts;

	return (
		<div className="flex flex-col flex-1 overflow-hidden">
			{selectedContact ? (
				/* Vue conversation */
				<>
					{/* Header contact */}
					<div className="border-b px-3 py-2 flex items-center gap-2">
						<button type="button" onClick={() => setSelectedContact(null)} className="text-xs text-muted-foreground hover:text-foreground">
							← Retour
						</button>
						<Avatar className="h-6 w-6">
							<AvatarImage src={selectedContact.avatar} />
							<AvatarFallback className="text-[9px]">
								{selectedContact.name?.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
							</AvatarFallback>
						</Avatar>
						<div className="flex-1 min-w-0">
							<p className="text-xs font-medium truncate">{selectedContact.name}</p>
							<p className="text-[10px] text-muted-foreground truncate">{selectedContact.position}</p>
						</div>
					</div>

					{/* Messages (placeholder — backend iCom à venir) */}
					<ScrollArea className="flex-1 px-3 py-4">
						<div className="flex flex-col items-center justify-center h-full text-center py-8">
							<MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
							<p className="text-xs text-muted-foreground">
								Aucun message. Envoyez le premier !
							</p>
						</div>
					</ScrollArea>

					{/* Input */}
					<div className="border-t p-2 flex items-end gap-2">
						<Textarea
							value={messageInput}
							onChange={(e) => setMessageInput(e.target.value)}
							placeholder="Écrire un message..."
							className="min-h-[32px] max-h-[80px] resize-none text-xs"
							rows={1}
						/>
						<Button size="icon" className="h-8 w-8 shrink-0" disabled={!messageInput.trim()}>
							<Send className="h-3.5 w-3.5" />
						</Button>
					</div>
				</>
			) : (
				/* Vue contacts */
				<>
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
						{filteredContacts.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-8 text-center">
								<User className="h-8 w-8 text-muted-foreground/30 mb-2" />
								<p className="text-xs text-muted-foreground">
									{contacts.length === 0 ? "Aucun membre dans l'organisation" : "Aucun résultat"}
								</p>
							</div>
						) : (
							<div className="divide-y">
								{filteredContacts.map((contact: any) => (
									<button
										key={contact.id}
										type="button"
										onClick={() => setSelectedContact(contact)}
										className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors text-left"
									>
										<Avatar className="h-8 w-8">
											<AvatarImage src={contact.avatar} />
											<AvatarFallback className="text-[10px] bg-primary/10 text-primary">
												{contact.name?.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
											</AvatarFallback>
										</Avatar>
										<div className="flex-1 min-w-0">
											<p className="text-xs font-medium truncate">{contact.name}</p>
											<p className="text-[10px] text-muted-foreground truncate">{contact.position}</p>
										</div>
									</button>
								))}
							</div>
						)}
					</ScrollArea>
				</>
			)}
		</div>
	);
}
