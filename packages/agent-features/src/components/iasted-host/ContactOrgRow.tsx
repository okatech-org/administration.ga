/**
 * ContactOrgRow — ligne d'organisation pliable de l'annuaire iCom.
 *
 * Comportement :
 * - À l'état replié : affiche uniquement nom, pays, type, badge "X membres".
 * - Au clic : déplie + lance la query Convex `listOrgMembers` pour cette org.
 *   Convex gère la mise en cache + la mise à jour temps réel — re-déplier
 *   la même org est instantané.
 *
 * Le déclenchement conditionnel de `useAuthenticatedConvexQuery` (via "skip")
 * garantit qu'aucune donnée n'est tirée tant que l'utilisateur n'a pas ouvert
 * la ligne — c'est ce qui évite de charger tous les contacts de toutes les
 * orgs à l'arrivée sur la page.
 */

"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	Building2,
	ChevronDown,
	ChevronRight,
	Loader2,
	Mail,
	Phone,
} from "lucide-react";
import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import type { ContactResultItem } from "../../hooks/useContactSearch";
import { useOrg } from "../../shell/org-provider";
import { ContactActions } from "./ContactActions";

export interface ContactOrgRowOrg {
	id: string;
	name: string;
	country?: string;
	type?: string;
	memberCount: number;
	isMine: boolean;
}

interface ContactOrgRowProps {
	org: ContactOrgRowOrg;
	expanded: boolean;
	onToggle: () => void;
	sort: "asc" | "desc";
	memberFilter?: string;
	onSelectContact?: (c: ContactResultItem) => void;
}

export function ContactOrgRow({
	org,
	expanded,
	onToggle,
	sort,
	memberFilter,
	onSelectContact,
}: ContactOrgRowProps) {
	// Convex ne charge la liste que lorsque l'org est dépliée — la subscription
	// reste active tant que le composant est monté, donc replier puis rouvrir
	// est instantané.
	const { data, isPending } = useAuthenticatedConvexQuery(
		api.functions.contactSearch.listOrgMembers,
		expanded
			? {
					orgId: org.id as Id<"orgs">,
					sort,
					searchTerm: memberFilter || undefined,
				}
			: "skip",
	);

	const members = (data?.contacts ?? []) as ContactResultItem[];

	return (
		<div className="border-b last:border-b-0">
			<button
				type="button"
				onClick={onToggle}
				aria-expanded={expanded}
				aria-controls={`org-members-${org.id}`}
				className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
			>
				{expanded ? (
					<ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
				) : (
					<ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
				)}
				<Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
				<span className="text-sm font-medium truncate">
					{org.name}
				</span>
				{org.isMine && (
					<Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0 border-primary/30 text-primary">
						Mon poste
					</Badge>
				)}
				{org.country && (
					<span className="text-[10px] text-muted-foreground/70 shrink-0">
						{org.country}
					</span>
				)}
				<Badge variant="outline" className="text-[10px] h-4 px-1.5 ml-auto shrink-0">
					{org.memberCount} {org.memberCount > 1 ? "membres" : "membre"}
				</Badge>
			</button>

			{expanded && (
				<div id={`org-members-${org.id}`} className="border-t bg-muted/10">
					{isPending ? (
						<div className="flex items-center justify-center py-4">
							<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
						</div>
					) : members.length === 0 ? (
						<p className="px-9 py-3 text-xs text-muted-foreground italic">
							{memberFilter
								? "Aucun membre ne correspond à la recherche dans cette organisation."
								: "Aucun membre actif dans cette organisation."}
						</p>
					) : (
						<ul className="divide-y divide-border/40">
							{members.map((c) => (
								<MemberRow
									key={c.id}
									contact={c}
									onClick={onSelectContact ? () => onSelectContact(c) : undefined}
								/>
							))}
						</ul>
					)}
				</div>
			)}
		</div>
	);
}

function MemberRow({
	contact,
	onClick,
}: {
	contact: ContactResultItem;
	onClick?: () => void;
}) {
	const { activeOrgId } = useOrg();
	const initials = contact.name
		?.split(" ")
		.map((w) => w[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);

	// Affichage des actions : équipe + réseau (pas pour les citoyens — drawer profil).
	const showActions =
		(contact.source === "team" || contact.source === "network") &&
		!!contact.userId;

	return (
		<li className="group relative flex items-center gap-2 pl-9 pr-3 py-2.5 hover:bg-muted/30 transition-colors">
			<div
				role={onClick ? "button" : undefined}
				tabIndex={onClick ? 0 : undefined}
				onClick={onClick}
				onKeyDown={
					onClick
						? (e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									onClick();
								}
							}
						: undefined
				}
				className={cn(
					"flex items-center gap-3 flex-1 min-w-0",
					onClick &&
						"cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset rounded-sm",
				)}
			>
				<Avatar className="h-8 w-8 shrink-0">
					<AvatarImage src={contact.avatar} />
					<AvatarFallback
						className={cn(
							"text-[10px]",
							contact.source === "team"
								? "bg-primary/15 text-primary"
								: "bg-muted text-muted-foreground",
						)}
					>
						{initials}
					</AvatarFallback>
				</Avatar>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-1.5">
						<p className="text-sm font-semibold truncate">{contact.lastName}</p>
						<p className="text-sm text-foreground/80 truncate">{contact.firstName}</p>
					</div>
					{contact.position && (
						<p className="text-xs text-muted-foreground truncate">
							{contact.position}
						</p>
					)}
					<div className="flex items-center gap-3 text-[11px] text-muted-foreground/70 mt-0.5">
						{contact.email && (
							<span className="flex items-center gap-1 truncate">
								<Mail className="h-3 w-3 shrink-0" />
								{contact.email}
							</span>
						)}
						{contact.phone && (
							<span className="flex items-center gap-1">
								<Phone className="h-3 w-3 shrink-0" />
								{contact.phone}
							</span>
						)}
					</div>
				</div>
			</div>
			{showActions && (
				<ContactActions
					orgId={activeOrgId}
					participantUserId={contact.userId as any}
				/>
			)}
		</li>
	);
}
