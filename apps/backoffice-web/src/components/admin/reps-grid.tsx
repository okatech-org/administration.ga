"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import type { Doc } from "@convex/_generated/dataModel";
import { Building2, ChevronLeft, ChevronRight, Inbox, MapPin, Search, Settings, Eye, Edit, Power, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FlatCard } from "@/components/design-system/flat-card";
import { Combobox } from "@/components/ui/combobox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useConvexMutationQuery } from "@/integrations/convex/hooks";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import Link from "next/link";
import { getCountryFlag, getCountryName } from "@/lib/country-utils";
import { OrganizationType } from "@convex/lib/constants";


const ORG_TYPE_LABELS: Record<string, string> = {
	[OrganizationType.Embassy]: "Ambassade",
	[OrganizationType.HighRepresentation]: "Haute Représentation",
	[OrganizationType.GeneralConsulate]: "Consulat Général",
	[OrganizationType.PermanentMission]: "Mission Permanente",
	[OrganizationType.HighCommission]: "Haut-Commissariat",
	[OrganizationType.ThirdParty]: "Partenaire Tiers",
};
function getOrgTypeLabel(type: string): string {
	return ORG_TYPE_LABELS[type] || type;
}

function formatOrgName(name: string | undefined) {
	if (!name) return "";
	const upperName = name.toUpperCase();
	const splitIndex = upperName.indexOf(" DU GABON");
	if (splitIndex !== -1) {
		const line1 = upperName.substring(0, splitIndex).trim();
		const line2 = upperName.substring(splitIndex).trim();
		return (
			<>
				<span className="block font-bold tracking-tight text-foreground text-[13px]">{line1}</span>
				<span className="block text-[11px] font-semibold text-foreground/60 leading-tight">{line2}</span>
			</>
		);
	}
	return <span className="block font-bold tracking-tight text-[13px]">{upperName}</span>;
}

export function RepsGrid({
	data,
}: {
	data: Doc<"orgs">[];
}) {
	const router = useRouter();
	const { t } = useTranslation();

	const [searchQuery, setSearchQuery] = useState("");
	const [typeFilter, setTypeFilter] = useState<string>("all");
	const [countryFilter, setCountryFilter] = useState<string>("all");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [currentPage, setCurrentPage] = useState(1);

	const ITEMS_PER_PAGE = 9; // 3x3 grid

	// Réinitialiser les filtres et la page quand les données changent (changement de continent)
	useEffect(() => {
		setTypeFilter("all");
		setCountryFilter("all");
		setStatusFilter("all");
		setSearchQuery("");
		setCurrentPage(1);
	}, [data]);

	// Options dérivées des données filtrées par continent
	const typeOptions = useMemo(() => {
		const types = new Set<string>();
		for (const org of data) {
			if (org.type) types.add(org.type);
		}
		return [...types].map((type) => ({
			value: type,
			label: ORG_TYPE_LABELS[type] || type,
		}));
	}, [data]);

	const countryOptions = useMemo(() => {
		const countries = new Map<string, string>();
		for (const org of data) {
			if (org.country && !countries.has(org.country)) {
				countries.set(
					org.country,
					`${getCountryFlag(org.country)} ${getCountryName(org.country)}`,
				);
			}
		}
		return [...countries.entries()]
			.map(([value, label]) => ({ value, label }))
			.sort((a, b) => a.label.localeCompare(b.label));
	}, [data]);

	const { mutate: disableOrg, isPending: isDisabling } = useConvexMutationQuery(api.functions.admin.disableOrg);
	const { mutate: enableOrg, isPending: isEnabling } = useConvexMutationQuery(api.functions.admin.enableOrg);

	const handleToggleStatus = async (e: React.MouseEvent, org: Doc<"orgs">) => {
		e.stopPropagation();
		try {
			if (org.isActive) {
				await disableOrg({ orgId: org._id });
				toast.success("Représentation désactivée");
			} else {
				await enableOrg({ orgId: org._id });
				toast.success("Représentation activée");
			}
		} catch (error) {
			toast.error("Erreur lors de la modification du statut");
		}
	};

	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, typeFilter, countryFilter, statusFilter]);

	const filteredData = useMemo(() => {
		return data.filter((org) => {
			// Search filter
			if (searchQuery) {
				const q = searchQuery.toLowerCase();
				const match =
					org.name?.toLowerCase().includes(q) ||
					org.slug?.toLowerCase().includes(q) ||
					org.address?.city?.toLowerCase().includes(q) ||
					org.email?.toLowerCase().includes(q) ||
					org.phone?.toLowerCase().includes(q);
				if (!match) return false;
			}
			// Type filter
			if (typeFilter !== "all" && org.type !== typeFilter) return false;
			// Country filter
			if (countryFilter !== "all" && org.country !== countryFilter) return false;
			// Status filter
			if (statusFilter !== "all") {
				const isActiveStr = org.isActive ? "true" : "false";
				if (isActiveStr !== statusFilter) return false;
			}
			return true;
		});
	}, [data, searchQuery, typeFilter, countryFilter, statusFilter]);

	const slicedData = filteredData.slice(
		(currentPage - 1) * ITEMS_PER_PAGE,
		currentPage * ITEMS_PER_PAGE
	);

	const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

	const statusOptions = [
		{ label: "Tous les statuts", value: "all" },
		{ label: "Actif", value: "true" },
		{ label: "Inactif", value: "false" },
	];

	return (
		<div className="flex flex-col h-full gap-3 w-full">
			{/* ── Filters ── */}
			<div className="flex flex-col xl:flex-row gap-2.5 shrink-0">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Rechercher une représentation..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-10 h-10 w-full text-sm bg-background border-border"
					/>
				</div>
				<div className="flex flex-wrap gap-3">
					<Combobox
						options={[{ label: "Tous les types", value: "all" }, ...typeOptions]}
						value={typeFilter}
						onValueChange={setTypeFilter}
						placeholder="Tous les types"
						searchPlaceholder="Rechercher un type..."
						emptyText="Aucun type trouvé"
						className="w-[180px] h-10 bg-background"
					/>
					<Combobox
						options={[{ label: "Tous les pays", value: "all" }, ...countryOptions]}
						value={countryFilter}
						onValueChange={setCountryFilter}
						placeholder="Tous les pays"
						searchPlaceholder="Rechercher un pays..."
						emptyText="Aucun pays trouvé"
						className="w-[200px] h-10 bg-background"
					/>
					<Combobox
						options={statusOptions}
						value={statusFilter}
						onValueChange={setStatusFilter}
						placeholder="Tous les statuts"
						searchPlaceholder="Rechercher un statut..."
						emptyText="Aucun statut trouvé"
						className="w-[160px] h-10 bg-background"
					/>
				</div>
			</div>

			{/* ── Grid ── */}
			{filteredData.length === 0 ? (
				<div className="flex flex-col items-center gap-3 py-16 bg-background rounded-xl border border-border/60">
					<div className="rounded-full bg-muted/60 p-4">
						<Inbox className="h-8 w-8 text-muted-foreground" />
					</div>
					<div className="text-center">
						<p className="font-medium text-foreground/80">Aucune représentation trouvée</p>
						<p className="text-sm text-muted-foreground mt-1">
							Essayez de modifier vos filtres de recherche.
						</p>
					</div>
				</div>
			) : (
				<div className="flex flex-col flex-1 w-full">
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 auto-rows-fr w-full">
						{slicedData.map((org) => {
							return (
								<FlatCard
									key={org._id}
									className="relative flex flex-row h-full cursor-pointer hover:shadow-md transition-shadow group p-0 overflow-hidden"
									onClick={() => router.push(`/reps/${org._id}`)}
								>
									{/* Main Content Area */}
									<div className="flex-1 p-3 pr-2.5 flex flex-col gap-2">
										{/* Header: Logo + Name */}
										<div className="flex items-start gap-2.5">
											<Avatar className="h-9 w-9 shrink-0 border border-border/50">
												<AvatarImage src={org.logoUrl} alt={org.name} />
												<AvatarFallback className="bg-primary/10 text-primary">
													<Building2 className="h-5 w-5" />
												</AvatarFallback>
											</Avatar>
											<div className="flex-1 min-w-0 pt-0.5">
												<div className="leading-[1.1] line-clamp-2">
													{formatOrgName(org.name)}
												</div>
											</div>
										</div>

										{/* Body: Details (Type, Country, City) */}
										<div className="flex-1 flex flex-col justify-end mt-1.5">
											<div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
												<Badge variant="secondary" className="px-1.5 py-0 h-5 text-[10px] font-medium bg-muted/60">
													{getOrgTypeLabel(org.type)}
												</Badge>
												
												<div className="flex items-center gap-1 font-medium text-foreground/80 text-[12px]">
													<span className="text-xs">{getCountryFlag(org.country)}</span>
													<span className="truncate max-w-[100px]">{getCountryName(org.country)}</span>
												</div>

												{org.address?.city && (
													<span className="flex items-center gap-1 text-muted-foreground text-[12px]">
														<MapPin className="h-3 w-3" />
														<span className="truncate max-w-[100px]">{org.address.city}</span>
													</span>
												)}
											</div>
										</div>
									</div>

									{/* Right Vertical Action Bar */}
									<div className="w-[46px] shrink-0 border-l border-border/50 bg-muted/20 flex flex-col items-center py-2">
										<div className="flex flex-col gap-1.5">
											<Button 
												variant="ghost" 
												size="icon" 
												className="h-7 w-7 text-primary hover:bg-primary/15"
												onClick={(e) => { e.stopPropagation(); router.push(`/reps/${org._id}`); }}
												title="Gérer les requêtes"
											>
												<FolderOpen className="h-4 w-4" />
											</Button>
											<Button 
												variant="ghost" 
												size="icon" 
												className="h-7 w-7 text-muted-foreground hover:text-foreground"
												onClick={(e) => { e.stopPropagation(); router.push(`/reps/${org._id}/edit`); }}
												title="Modifier la représentation"
											>
												<Edit className="h-3.5 w-3.5" />
											</Button>
										</div>

										{/* Single Visual State Button for Active/Inactive */}
										<div className="mt-auto flex flex-col items-center">
											<Button 
												variant="ghost"
												size="icon" 
												className={cn(
													"h-7 w-7 rounded-full transition-all duration-300",
													org.isActive 
														? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 hover:text-emerald-700" 
														: "bg-destructive/15 text-destructive/80 hover:bg-destructive/25 hover:text-destructive"
												)}
												disabled={isDisabling || isEnabling}
												onClick={(e) => handleToggleStatus(e, org)}
												title={org.isActive ? "Désactiver" : "Activer"}
											>
												<Power className="h-3.5 w-3.5" />
											</Button>
										</div>
									</div>
								</FlatCard>
							);
						})}
					</div>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-center gap-3 pt-4 pb-1 shrink-0">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
								disabled={currentPage === 1}
							>
								<ChevronLeft className="h-4 w-4 mr-1" />
								Précédent
							</Button>
							<div className="text-xs font-medium text-muted-foreground">
								Page {currentPage} sur {totalPages}
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
								disabled={currentPage === totalPages}
							>
								Suivant
								<ChevronRight className="h-4 w-4 ml-1" />
							</Button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
