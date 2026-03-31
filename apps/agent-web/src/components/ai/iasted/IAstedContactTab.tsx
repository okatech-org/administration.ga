/**
 * IAstedContactTab — Onglet iContact dans iAsted.
 *
 * Contacts :
 * - Collaborateurs (membres de l'org via getOrgChart)
 * - Ressortissants (profils citoyens sous l'autorité de la représentation)
 * Recherche intelligente unifiée sur les deux sources.
 */

import { api } from "@convex/_generated/api";
import { Building2, Loader2, Mail, MapPin, Phone, Search, User, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOrg } from "@/components/org/org-provider";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

type ContactSource = "all" | "team" | "citizens";

interface Contact {
	id: string;
	name: string;
	email?: string;
	phone?: string;
	avatar?: string;
	position?: string;
	org?: string;
	country?: string;
	source: "team" | "citizen";
}

export function IAstedContactTab() {
	const { activeOrgId } = useOrg();
	const [search, setSearch] = useState("");
	const [filter, setFilter] = useState<ContactSource>("all");

	// Collaborateurs (membres de l'org)
	const { data: orgChart, isPending: teamLoading } = useAuthenticatedConvexQuery(
		api.functions.orgs.getOrgChart,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	// Ressortissants (profils citoyens)
	const { data: rawProfiles, isPending: profilesLoading } = useAuthenticatedConvexQuery(
		api.functions.profiles.listByOrg,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	const isPending = teamLoading || profilesLoading;

	// Fusionner les deux sources
	const contacts: Contact[] = useMemo(() => {
		const rawTeam: Contact[] = (orgChart as any)?.positions?.flatMap((pos: any) =>
			(pos.occupants ?? []).map((occ: any) => ({
				id: `team-${occ.userId}`,
				name: `${occ.firstName ?? ""} ${occ.lastName ?? ""}`.trim() || occ.email,
				email: occ.email,
				avatar: occ.avatarUrl,
				position: pos.title?.fr ?? pos.code,
				source: "team" as const,
			})),
		) ?? [];
		// Dédoublonner par nom (un utilisateur peut avoir plusieurs postes/memberships)
		const teamContacts = rawTeam.filter(
			(c, i, arr) => arr.findIndex((x) => x.name === c.name) === i,
		);

		const citizenContacts: Contact[] = ((rawProfiles as any[]) ?? []).map((p) => ({
			id: `citizen-${p._id}`,
			name: `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.email,
			email: p.email,
			phone: p.phone,
			country: p.residenceCountry,
			source: "citizen" as const,
		}));

		return [...teamContacts, ...citizenContacts];
	}, [orgChart, rawProfiles]);

	// Filtrage par source + recherche
	const filtered = useMemo(() => {
		let list = contacts;
		if (filter === "team") list = list.filter((c) => c.source === "team");
		if (filter === "citizens") list = list.filter((c) => c.source === "citizen");

		if (search.trim()) {
			const q = search.toLowerCase();
			list = list.filter((c) =>
				c.name.toLowerCase().includes(q) ||
				c.email?.toLowerCase().includes(q) ||
				c.phone?.includes(q) ||
				c.position?.toLowerCase().includes(q),
			);
		}
		return list;
	}, [contacts, filter, search]);

	const teamCount = contacts.filter((c) => c.source === "team").length;
	const citizenCount = contacts.filter((c) => c.source === "citizen").length;

	return (
		<div className="flex flex-col flex-1 overflow-hidden">
			{/* Recherche */}
			<div className="p-2 border-b space-y-2">
				<div className="relative">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Rechercher un contact (nom, email, poste)..."
						className="h-8 pl-8 text-xs"
					/>
				</div>
				{/* Filtres */}
				<div className="flex items-center gap-1">
					{([
						{ id: "all", label: "Tous", count: contacts.length },
						{ id: "team", label: "Équipe", count: teamCount },
						{ id: "citizens", label: "Ressortissants", count: citizenCount },
					] as const).map((f) => (
						<button
							key={f.id}
							type="button"
							onClick={() => setFilter(f.id)}
							className={cn(
								"text-[10px] px-2 py-1 rounded-md font-medium transition-colors",
								filter === f.id
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground hover:bg-muted",
							)}
						>
							{f.label}
							<span className="ml-1 opacity-60">{f.count}</span>
						</button>
					))}
				</div>
			</div>

			{/* Liste contacts */}
			<ScrollArea className="flex-1">
				{isPending ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
					</div>
				) : filtered.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
						<p className="text-xs text-muted-foreground">
							{search ? "Aucun résultat pour cette recherche" : "Aucun contact disponible"}
						</p>
					</div>
				) : (
					<div className="divide-y">
						{filtered.map((contact) => (
							<div
								key={contact.id}
								className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors"
							>
								<Avatar className="h-8 w-8 shrink-0">
									<AvatarImage src={contact.avatar} />
									<AvatarFallback className={cn(
										"text-[10px]",
										contact.source === "team"
											? "bg-primary/10 text-primary"
											: "bg-amber-500/10 text-amber-600",
									)}>
										{contact.name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?"}
									</AvatarFallback>
								</Avatar>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-1.5">
										<p className="text-xs font-medium truncate">{contact.name}</p>
										<Badge
											variant="outline"
											className={cn(
												"text-[7px] h-3.5 px-1",
												contact.source === "team"
													? "text-primary border-primary/20"
													: "text-amber-600 border-amber-500/20",
											)}
										>
											{contact.source === "team" ? "Équipe" : "Citoyen"}
										</Badge>
									</div>
									{contact.position && (
										<p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
											<Building2 className="h-2.5 w-2.5 shrink-0" />
											{contact.position}
										</p>
									)}
									<div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
										{contact.email && (
											<span className="flex items-center gap-0.5 truncate">
												<Mail className="h-2.5 w-2.5 shrink-0" />
												{contact.email}
											</span>
										)}
										{contact.phone && (
											<span className="flex items-center gap-0.5">
												<Phone className="h-2.5 w-2.5 shrink-0" />
												{contact.phone}
											</span>
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</ScrollArea>

			{/* Footer stats */}
			<div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground flex items-center justify-between">
				<span>{filtered.length} contact{filtered.length > 1 ? "s" : ""}</span>
				<span>{teamCount} équipe · {citizenCount} ressortissants</span>
			</div>
		</div>
	);
}
