/**
 * IAstedContactTab — Recherche intelligente de contacts.
 *
 * Segmentation : Mon équipe | Réseau diplomatique | Ressortissants
 * Filtres : Pays, Type d'org, Grade/Poste
 * Groupement par organisation
 */

import {
	Building2,
	Globe,
	Loader2,
	Mail,
	Phone,
	Shield,
	Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useContactSearch, type ContactSource } from "@/hooks/useContactSearch";
import { cn } from "@/lib/utils";

const SEGMENTS: Array<{ id: ContactSource | "all"; label: string; icon: typeof Users }> = [
	{ id: "all", label: "Tous", icon: Users },
	{ id: "team", label: "Mon équipe", icon: Shield },
	{ id: "network", label: "Réseau", icon: Globe },
	{ id: "citizens", label: "Ressortissants", icon: Users },
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

export function IAstedContactTab() {
	const {
		groups,
		total,
		availableCountries,
		isPending,
		filters,
		setSearch,
		setSource,
		setCountry,
		setOrgType,
		setPositionGrade,
	} = useContactSearch();

	return (
		<div className="flex flex-col flex-1 min-h-0">
			{/* Recherche */}
			<div className="p-3 border-b space-y-2 shrink-0">
				<Input
					value={filters.searchTerm}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Rechercher (nom, email, poste, org)..."
					className="h-10 text-sm"
				/>

				{/* Segments */}
				<div className="flex items-center gap-1.5">
					{SEGMENTS.map((seg) => (
						<button
							key={seg.id}
							type="button"
							onClick={() => setSource(seg.id)}
							className={cn(
								"text-xs px-3 py-1 rounded-md font-medium transition-colors",
								filters.source === seg.id
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground hover:bg-muted",
							)}
						>
							{seg.label}
						</button>
					))}
				</div>

				{/* Filtres avancés */}
				<div className="flex items-center gap-1.5 overflow-x-auto">
					<select
						value={filters.country}
						onChange={(e) => setCountry(e.target.value)}
						className="text-xs px-2.5 py-1.5 rounded-md border bg-background text-foreground h-8"
					>
						<option value="">Tous pays</option>
						{availableCountries.map((c: any) => (
							<option key={c.code} value={c.code}>{c.code} ({c.count})</option>
						))}
					</select>

					<select
						value={filters.orgType}
						onChange={(e) => setOrgType(e.target.value)}
						className="text-xs px-2.5 py-1.5 rounded-md border bg-background text-foreground h-8"
					>
						{ORG_TYPES.map((t) => (
							<option key={t.value} value={t.value}>{t.label}</option>
						))}
					</select>

					<select
						value={filters.positionGrade}
						onChange={(e) => setPositionGrade(e.target.value)}
						className="text-xs px-2.5 py-1.5 rounded-md border bg-background text-foreground h-8"
					>
						{GRADES.map((g) => (
							<option key={g.value} value={g.value}>{g.label}</option>
						))}
					</select>
				</div>
			</div>

			{/* Résultats groupés */}
			<ScrollArea className="flex-1 min-h-0">
				{isPending ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
					</div>
				) : groups.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
						<p className="text-sm text-muted-foreground">
							{filters.searchTerm ? "Aucun résultat" : "Aucun contact"}
						</p>
					</div>
				) : (
					<div className="divide-y">
						{groups.map((group: any) => (
							<div key={group.org.id} className="py-1">
								{/* Header org */}
								<div className="flex items-center gap-2 px-3 py-1.5">
									<Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
									<span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
										{group.org.name}
									</span>
									{group.org.country && (
										<span className="text-[10px] text-muted-foreground/60">{group.org.country}</span>
									)}
									<Badge variant="outline" className="text-[10px] h-4 px-1.5 ml-auto shrink-0">
										{group.contacts.length}
									</Badge>
								</div>

								{/* Contacts */}
								{group.contacts.map((contact: any) => (
									<div
										key={contact.id}
										className="flex items-center gap-3 px-3 py-3 hover:bg-muted/30 transition-colors"
									>
										<Avatar className="h-10 w-10 shrink-0">
											<AvatarImage src={contact.avatar} />
											<AvatarFallback className={cn(
												"text-xs",
												contact.source === "team" ? "bg-primary/10 text-primary"
													: contact.source === "citizen" ? "bg-amber-500/10 text-amber-600"
													: "bg-blue-500/10 text-blue-600",
											)}>
												{contact.name?.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
											</AvatarFallback>
										</Avatar>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-1.5">
												<p className="text-sm font-bold truncate">{contact.lastName}</p>
												<p className="text-sm text-foreground/80 truncate">{contact.firstName}</p>
												<Badge
													variant="outline"
													className={cn("text-[10px] h-4 px-1.5 shrink-0",
														contact.source === "team" ? "text-primary border-primary/20"
															: contact.source === "citizen" ? "text-amber-600 border-amber-500/20"
															: "text-blue-600 border-blue-500/20",
													)}
												>
													{contact.source === "team" ? "Équipe" : contact.source === "citizen" ? "Citoyen" : "Réseau"}
												</Badge>
											</div>
											{contact.position && (
												<p className="text-xs text-muted-foreground truncate">{contact.position}</p>
											)}
											<div className="flex items-center gap-3 text-xs text-muted-foreground/70 mt-0.5">
												{contact.email && (
													<span className="flex items-center gap-1 truncate">
														<Mail className="h-3 w-3 shrink-0" />{contact.email}
													</span>
												)}
												{contact.phone && (
													<span className="flex items-center gap-1">
														<Phone className="h-3 w-3 shrink-0" />{contact.phone}
													</span>
												)}
											</div>
										</div>
									</div>
								))}
							</div>
						))}
					</div>
				)}
			</ScrollArea>

			{/* Footer stats */}
			<div className="border-t px-3 py-1.5 text-xs text-muted-foreground flex items-center justify-between shrink-0">
				<span>{total} contact{total > 1 ? "s" : ""}</span>
				<span>{groups.length} organisation{groups.length > 1 ? "s" : ""}</span>
			</div>
		</div>
	);
}
