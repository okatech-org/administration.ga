/**
 * BackofficeContactTab — Recherche intelligente de contacts (backoffice).
 * Accepte orgId en prop au lieu de useOrg().
 */

import type { Id } from "@convex/_generated/dataModel";
import {
	Building2,
	Globe,
	Loader2,
	Mail,
	Phone,
	Search,
	Shield,
	Users,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	useContactSearch,
	type ContactGroup,
	type ContactResultItem,
	type ContactSource,
} from "@/hooks/useContactSearch";
import { cn } from "@/lib/utils";

const SEGMENTS: Array<{ id: ContactSource | "all"; label: string; icon: typeof Users }> = [
	{ id: "all", label: "Tous", icon: Users },
	{ id: "team", label: "Mon équipe", icon: Shield },
	{ id: "network", label: "Réseau", icon: Globe },
	{ id: "citizens", label: "Ressortissants", icon: Users },
	{ id: "administration", label: "Administration", icon: Shield },
];

const ORG_TYPES = [
	{ value: "", label: "Tous types" },
	{ value: "embassy", label: "Ambassade" },
	{ value: "general_consulate", label: "Consulat" },
	{ value: "permanent_mission", label: "Mission" },
	{ value: "high_commission", label: "Haut-Commissariat" },
];

const GRADES = [
	{ value: "", label: "Tous postes" },
	{ value: "chief", label: "Chef de mission" },
	{ value: "deputy_chief", label: "Adjoint" },
	{ value: "counselor", label: "Conseiller" },
	{ value: "agent", label: "Agent" },
	{ value: "external", label: "Externe" },
];

interface BackofficeContactTabProps {
	orgId: Id<"orgs"> | null;
}

export function BackofficeContactTab({ orgId }: BackofficeContactTabProps) {
	const {
		groups,
		total,
		availableCountries,
		isPending,
		hasMore,
		loadMore,
		filters,
		setSearch,
		setSource,
		setCountry,
		setOrgType,
		setPositionGrade,
	} = useContactSearch(orgId);

	// En backoffice, l'absence d'org active ne bloque pas : on affiche toujours
	// la vue globale (tous les comptes créés sur la plateforme).

	// Infinite scroll : sentinelle en bas de la liste, observée RELATIVEMENT au
	// viewport interne de Radix ScrollArea (pas au document viewport — c'est
	// pour ça que la pagination restait bloquée à la première page).
	const viewportRef = useRef<HTMLDivElement | null>(null);
	const loadMoreRef = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		const target = loadMoreRef.current;
		const root = viewportRef.current;
		if (!target || !root || !hasMore || isPending) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) loadMore();
			},
			{ root, rootMargin: "200px" },
		);
		observer.observe(target);
		return () => observer.disconnect();
	}, [hasMore, isPending, loadMore]);

	return (
		<div className="flex flex-col flex-1 min-h-0 overflow-hidden">
			<div className="p-2 border-b space-y-2 shrink-0">
				<div className="relative">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
					<Input
						value={filters.searchTerm}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Rechercher (nom, email, poste, org)..."
						className="h-8 pl-8 text-xs"
					/>
				</div>

				<div className="flex items-center gap-1">
					{SEGMENTS.map((seg) => (
						<button
							key={seg.id}
							type="button"
							onClick={() => setSource(seg.id)}
							className={cn(
								"text-[10px] px-2 py-1 rounded-md font-medium transition-colors",
								filters.source === seg.id
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground hover:bg-muted",
							)}
						>
							{seg.label}
						</button>
					))}
				</div>

				<div className="flex items-center gap-1.5 overflow-x-auto">
					<select value={filters.country} onChange={(e) => setCountry(e.target.value)} className="text-[10px] px-2 py-1 rounded-md border bg-background text-foreground h-6">
						<option value=""> Tous pays</option>
						{availableCountries.map((c) => (<option key={c.code} value={c.code}>{c.code} ({c.count})</option>))}
					</select>
					<select value={filters.orgType} onChange={(e) => setOrgType(e.target.value)} className="text-[10px] px-2 py-1 rounded-md border bg-background text-foreground h-6">
						{ORG_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
					</select>
					<select value={filters.positionGrade} onChange={(e) => setPositionGrade(e.target.value)} className="text-[10px] px-2 py-1 rounded-md border bg-background text-foreground h-6">
						{GRADES.map((g) => (<option key={g.value} value={g.value}>{g.label}</option>))}
					</select>
				</div>
			</div>

			<ScrollArea viewportRef={viewportRef} className="flex-1 min-h-0">
				{isPending ? (
					<div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
				) : groups.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
						<p className="text-xs text-muted-foreground">{filters.searchTerm ? "Aucun résultat" : "Aucun contact"}</p>
					</div>
				) : (
					<div className="divide-y">
						{groups.map((group: ContactGroup) => (
							<div key={group.org.id} className="py-2">
								<div className="flex items-center gap-2 px-3 py-1.5">
									<Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
									<span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{group.org.name}</span>
									{group.org.country && <span className="text-[9px] text-muted-foreground/60">{group.org.country}</span>}
									<Badge variant="outline" className="text-[7px] h-3.5 px-1 ml-auto shrink-0">{group.contacts.length}</Badge>
								</div>
								{group.contacts.map((contact: ContactResultItem) => (
									<div key={contact.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 transition-colors">
										<Avatar className="h-8 w-8 shrink-0">
											<AvatarImage src={contact.avatar} />
											<AvatarFallback className={cn(
												"text-[10px]",
												contact.source === "team"
													? "bg-primary/10 text-primary"
													: contact.source === "citizen"
														? "bg-amber-500/10 text-amber-600"
														: contact.source === "administration"
															? "bg-slate-600/10 text-slate-700"
															: "bg-blue-500/10 text-blue-600",
											)}>
												{contact.name?.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
											</AvatarFallback>
										</Avatar>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-1.5">
												<p className="text-xs font-bold truncate">{contact.lastName}</p>
												<p className="text-xs text-foreground/80 truncate">{contact.firstName}</p>
												<Badge variant="outline" className={cn(
													"text-[7px] h-3.5 px-1 shrink-0",
													contact.source === "team"
														? "text-primary border-primary/20"
														: contact.source === "citizen"
															? "text-amber-600 border-amber-500/20"
															: contact.source === "administration"
																? "text-slate-700 border-slate-500/30"
																: "text-blue-600 border-blue-500/20",
												)}>
													{contact.source === "team"
														? "Équipe"
														: contact.source === "citizen"
															? "Citoyen"
															: contact.source === "administration"
																? "Admin"
																: "Réseau"}
												</Badge>
											</div>
											{contact.position && <p className="text-[10px] text-muted-foreground truncate">{contact.position}</p>}
											<div className="flex items-center gap-3 text-[9px] text-muted-foreground/70 mt-0.5">
												{contact.email && <span className="flex items-center gap-0.5 truncate"><Mail className="h-2.5 w-2.5 shrink-0" />{contact.email}</span>}
												{contact.phone && <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5 shrink-0" />{contact.phone}</span>}
											</div>
										</div>
									</div>
								))}
							</div>
						))}
					</div>
				)}

				{/* Sentinelle infinite scroll + bouton fallback "Charger plus" */}
				{groups.length > 0 && (
					<div ref={loadMoreRef} className="flex items-center justify-center py-3">
						{isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
						{hasMore && !isPending && (
							<button
								type="button"
								onClick={loadMore}
								className="text-[11px] px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors"
							>
								Charger plus
							</button>
						)}
					</div>
				)}
			</ScrollArea>

			<div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground flex items-center justify-between shrink-0">
				<span>{total} contact{total > 1 ? "s" : ""}</span>
				<span>{groups.length} organisation{groups.length > 1 ? "s" : ""}</span>
			</div>
		</div>
	);
}
