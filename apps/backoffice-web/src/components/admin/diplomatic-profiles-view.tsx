"use client"

/**
 * DiplomaticProfilesView — Vue du Corps Diplomatique.
 *
 * Filtrage hiérarchique intelligent :
 *   Continent → Pays → Représentation → Grade → Statut
 *
 * Affiche les membres du corps administratif avec leur profil diplomatique.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import Link from "next/link";
import { SuperAdminCallTrigger } from "./super-admin-call-trigger";
import { BulkMemberModulesDialog } from "./bulk-member-modules-dialog";
import {
	Award,
	Briefcase,
	Building2,
	CheckSquare,
	ExternalLink,
	Globe,
	Languages,
	Layers,
	Loader2,
	MapPin,
	Search,
	Shield,
	X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FlatCard } from "@/components/design-system/flat-card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import {
	type Continent,
	getContinent,
	getCountryFlag,
	getCountryName,
	CONTINENT_META,
} from "@/lib/country-utils";
import { cn } from "@/lib/utils";

// ─── Config ────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
	en_poste: { label: "En poste", color: "text-emerald-600", bg: "bg-emerald-500/10" },
	en_mission: { label: "En mission", color: "text-blue-600", bg: "bg-blue-500/10" },
	en_conge: { label: "En congé", color: "text-amber-600", bg: "bg-amber-500/10" },
	en_formation: { label: "En formation", color: "text-purple-600", bg: "bg-purple-500/10" },
	rapatrie: { label: "Rapatrié", color: "text-gray-600", bg: "bg-gray-500/10" },
	detache: { label: "Détaché", color: "text-orange-600", bg: "bg-orange-500/10" },
};

const GRADE_CONFIG: Record<string, { label: string; color: string }> = {
	chief: { label: "Chef de mission", color: "text-red-600" },
	deputy_chief: { label: "Adjoint", color: "text-amber-600" },
	counselor: { label: "Conseiller", color: "text-blue-600" },
	agent: { label: "Agent", color: "text-green-600" },
	external: { label: "Externe", color: "text-gray-600" },
};

const LANG_LEVELS: Record<string, string> = {
	native: "Maternelle", fluent: "Courant", advanced: "Avancé",
	intermediate: "Intermédiaire", basic: "Notions",
};

// ─── Main Component ────────────────────────────────────────
export function DiplomaticProfilesView() {
	const [search, setSearch] = useState("");
	const [activeContinent, setActiveContinent] = useState<Continent | null>(null);
	const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
	const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
	const [gradeFilter, setGradeFilter] = useState<string | null>(null);
	const [statusFilter, setStatusFilter] = useState<string | null>(null);

	// Sélection multiple pour l'action bulk "Modules"
	const [selected, setSelected] = useState<Set<Id<"memberships">>>(new Set());
	const [showBulkDialog, setShowBulkDialog] = useState(false);

	const { data: members = [], isPending } = useAuthenticatedConvexQuery(
		api.functions.admin.listDiplomaticMembers,
		{},
	);

	// ── Données dérivées pour les filtres ──
	const allMembers = members as any[];

	// Continents disponibles
	const continentData = useMemo(() => {
		const counts = new Map<Continent, number>();
		for (const m of allMembers) {
			const country = m.org?.country;
			if (country) {
				const cont = getContinent(country);
				if (cont) counts.set(cont, (counts.get(cont) ?? 0) + 1);
			}
		}
		const continents = [...counts.keys()].sort();
		return { continents, counts };
	}, [allMembers]);

	// Pays disponibles (filtrés par continent)
	const countryData = useMemo(() => {
		const counts = new Map<string, number>();
		for (const m of allMembers) {
			const country = m.org?.country;
			if (!country) continue;
			if (activeContinent && getContinent(country) !== activeContinent) continue;
			counts.set(country, (counts.get(country) ?? 0) + 1);
		}
		return [...counts.entries()]
			.map(([code, count]) => ({ code, name: getCountryName(code), flag: getCountryFlag(code), count }))
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [allMembers, activeContinent]);

	// Représentations disponibles (filtrées par continent + pays)
	const orgData = useMemo(() => {
		const orgs = new Map<string, { name: string; type: string; country: string; count: number }>();
		for (const m of allMembers) {
			const org = m.org;
			if (!org) continue;
			if (activeContinent && getContinent(org.country) !== activeContinent) continue;
			if (selectedCountry && org.country !== selectedCountry) continue;
			const existing = orgs.get(org._id);
			if (existing) {
				existing.count++;
			} else {
				orgs.set(org._id, { name: org.name, type: org.type, country: org.country, count: 1 });
			}
		}
		return [...orgs.entries()]
			.map(([id, data]) => ({ id, ...data }))
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [allMembers, activeContinent, selectedCountry]);

	// ── Filtrage progressif ──
	const filtered = useMemo(() => {
		let result = allMembers;

		// Recherche textuelle
		if (search.trim()) {
			const q = search.toLowerCase();
			result = result.filter(
				(m: any) =>
					(m.user?.name ?? "").toLowerCase().includes(q) ||
					(m.user?.firstName ?? "").toLowerCase().includes(q) ||
					(m.user?.lastName ?? "").toLowerCase().includes(q) ||
					(m.user?.email ?? "").toLowerCase().includes(q) ||
					(m.position?.title?.fr ?? "").toLowerCase().includes(q) ||
					(m.org?.name ?? "").toLowerCase().includes(q),
			);
		}

		// Continent
		if (activeContinent) {
			result = result.filter((m: any) => getContinent(m.org?.country) === activeContinent);
		}

		// Pays
		if (selectedCountry) {
			result = result.filter((m: any) => m.org?.country === selectedCountry);
		}

		// Représentation
		if (selectedOrg) {
			result = result.filter((m: any) => m.org?._id === selectedOrg);
		}

		// Grade
		if (gradeFilter) {
			result = result.filter((m: any) => m.position?.grade === gradeFilter);
		}

		// Statut
		if (statusFilter) {
			result = result.filter((m: any) => (m.diplomaticProfile?.status ?? "en_poste") === statusFilter);
		}

		return result;
	}, [allMembers, search, activeContinent, selectedCountry, selectedOrg, gradeFilter, statusFilter]);

	// Stats par grade (sur les résultats filtrés)
	const gradeDistribution = useMemo(() => {
		const counts: Record<string, number> = {};
		for (const m of filtered) {
			const grade = (m as any).position?.grade ?? "agent";
			counts[grade] = (counts[grade] ?? 0) + 1;
		}
		return counts;
	}, [filtered]);

	// Reset handlers
	const resetFilters = useCallback(() => {
		setActiveContinent(null);
		setSelectedCountry(null);
		setSelectedOrg(null);
		setGradeFilter(null);
		setStatusFilter(null);
		setSearch("");
	}, []);

	const toggleSelect = useCallback((membershipId: Id<"memberships">) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(membershipId)) next.delete(membershipId);
			else next.add(membershipId);
			return next;
		});
	}, []);

	const filteredIds = useMemo(
		() => filtered.map((m: any) => m.membershipId as Id<"memberships">),
		[filtered],
	);

	const allFilteredSelected =
		filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));

	const toggleSelectAll = useCallback(() => {
		setSelected((prev) => {
			if (filteredIds.length === 0) return prev;
			if (filteredIds.every((id) => prev.has(id))) {
				const next = new Set(prev);
				for (const id of filteredIds) next.delete(id);
				return next;
			}
			const next = new Set(prev);
			for (const id of filteredIds) next.add(id);
			return next;
		});
	}, [filteredIds]);

	const clearSelection = useCallback(() => setSelected(new Set()), []);

	if (isPending) {
		return (
			<div className="flex items-center justify-center py-20">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const hasActiveFilters = !!(activeContinent || selectedCountry || selectedOrg || gradeFilter || statusFilter || search.trim());

	return (
		<div className="space-y-3">
			{/* ── Barre de filtres compacte : 1 ligne de selects + search ── */}
			<div className="flex items-center gap-2 flex-wrap">
				<div className="relative flex-1 min-w-[220px]">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Rechercher par nom, poste ou organisation..."
						className="pl-10 md:pl-10 h-10"
					/>
				</div>
				{continentData.continents.length > 1 && (
					<select
						value={activeContinent ?? ""}
						onChange={(e) => {
							const v = e.target.value;
							setActiveContinent((v || null) as Continent | null);
							setSelectedCountry(null);
							setSelectedOrg(null);
						}}
						className="h-10 w-[180px] rounded-md border border-input bg-card px-2.5 text-sm text-foreground"
					>
						<option value="">Tous les continents ({allMembers.length})</option>
						{continentData.continents.map((cont) => (
							<option key={cont} value={cont}>
								{CONTINENT_META[cont]?.label ?? cont} ({continentData.counts.get(cont) ?? 0})
							</option>
						))}
					</select>
				)}
				{orgData.length > 1 && (
					<select
						value={selectedOrg ?? ""}
						onChange={(e) => setSelectedOrg(e.target.value || null)}
						className="h-10 w-[180px] rounded-md border border-input bg-card px-2.5 text-sm text-foreground"
					>
						<option value="">Toutes les représentations</option>
						{orgData.map(({ id, name, count }) => (
							<option key={id} value={id}>
								{name} ({count})
							</option>
						))}
					</select>
				)}
				<select
					value={gradeFilter ?? ""}
					onChange={(e) => setGradeFilter(e.target.value || null)}
					className="h-10 w-[180px] rounded-md border border-input bg-card px-2.5 text-sm text-foreground"
				>
					<option value="">Tous les grades</option>
					{Object.entries(GRADE_CONFIG).map(([key, { label }]) => (
						<option key={key} value={key}>
							{label} ({gradeDistribution[key] ?? 0})
						</option>
					))}
				</select>
				<select
					value={statusFilter ?? ""}
					onChange={(e) => setStatusFilter(e.target.value || null)}
					className="h-10 w-[180px] rounded-md border border-input bg-card px-2.5 text-sm text-foreground"
				>
					<option value="">Tous les statuts</option>
					{Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
						<option key={key} value={key}>
							{label}
						</option>
					))}
				</select>
			</div>

			{/* ── Filtre rapide par pays (chips drapeaux) ── */}
			{countryData.length > 1 && (
				<div className="flex flex-wrap gap-1.5 p-1 bg-muted/50 rounded-xl">
					<button
						type="button"
						onClick={() => {
							setSelectedCountry(null);
							setSelectedOrg(null);
						}}
						className={cn(
							"flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
							selectedCountry === null
								? "bg-background text-foreground"
								: "text-muted-foreground hover:text-foreground hover:bg-background/50",
						)}
					>
						<span>Tous les pays</span>
						<Badge
							variant="secondary"
							className={cn(
								"ml-0.5 h-5 min-w-[20px] px-1.5 text-[10px]",
								selectedCountry === null && "bg-primary/10 text-primary",
							)}
						>
							{countryData.reduce((sum, c) => sum + c.count, 0)}
						</Badge>
					</button>
					{countryData.map(({ code, name, flag, count }) => {
						const isActive = selectedCountry === code;
						return (
							<button
								key={code}
								type="button"
								onClick={() => {
									setSelectedCountry(isActive ? null : code);
									setSelectedOrg(null);
								}}
								className={cn(
									"flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
									isActive
										? "bg-background text-foreground"
										: "text-muted-foreground hover:text-foreground hover:bg-background/50",
								)}
							>
								<span aria-hidden>{flag}</span>
								<span>{name}</span>
								<Badge
									variant="secondary"
									className={cn(
										"ml-0.5 h-5 min-w-[20px] px-1.5 text-[10px]",
										isActive && "bg-primary/10 text-primary",
									)}
								>
									{count}
								</Badge>
							</button>
						);
					})}
				</div>
			)}

			{/* ── Résultats ── */}
			<div className="flex items-center justify-between gap-3 flex-wrap">
				<span className="text-xs text-muted-foreground flex items-center gap-2">
					{filtered.length > 0 && (
						<label className="inline-flex items-center gap-1.5 text-foreground hover:text-primary cursor-pointer select-none">
							<Checkbox
								checked={allFilteredSelected}
								onCheckedChange={toggleSelectAll}
								aria-label="Tout sélectionner"
							/>
							<span>
								{allFilteredSelected ? "Tout désélectionner" : "Tout sélectionner"}
							</span>
						</label>
					)}
					<span>
						{filtered.length} membre{filtered.length !== 1 ? "s" : ""}
					</span>
					{hasActiveFilters && (
						<button
							type="button"
							onClick={resetFilters}
							className="text-primary hover:underline"
						>
							Réinitialiser les filtres
						</button>
					)}
				</span>
			</div>

			{/* ── Liste des cartes (scroll naturel de la page) ── */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
				{filtered.map((member: any) => (
					<DiplomaticMemberCard
						key={member.membershipId}
						member={member}
						isSelected={selected.has(member.membershipId as Id<"memberships">)}
						onToggleSelect={() => toggleSelect(member.membershipId as Id<"memberships">)}
					/>
				))}
				{filtered.length === 0 && (
					<div className="col-span-full text-center py-12 text-muted-foreground text-sm">
						Aucun membre trouvé
					</div>
				)}
			</div>

			{/* ── Toolbar bulk sticky (visible si sélection) ── */}
			{selected.size > 0 && (
				<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2.5 rounded-full border bg-card shadow-lg">
					<CheckSquare className="h-4 w-4 text-primary" />
					<span className="text-sm font-medium">
						{selected.size} membre{selected.size > 1 ? "s" : ""} sélectionné
						{selected.size > 1 ? "s" : ""}
					</span>
					<div className="w-px h-5 bg-border mx-1" />
					<Button
						size="sm"
						onClick={() => setShowBulkDialog(true)}
						className="h-8"
					>
						<Layers className="h-3.5 w-3.5 mr-1.5" />
						Modifier les modules
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={clearSelection}
						className="h-8"
					>
						<X className="h-3.5 w-3.5" />
					</Button>
				</div>
			)}

			{showBulkDialog && (
				<BulkMemberModulesDialog
					open={showBulkDialog}
					onOpenChange={setShowBulkDialog}
					membershipIds={Array.from(selected)}
					onApplied={() => {
						setSelected(new Set());
					}}
				/>
			)}
		</div>
	);
}

// ─── Carte diplomatique ───────────────────────────────────
function DiplomaticMemberCard({
	member,
	isSelected,
	onToggleSelect,
}: {
	member: any;
	isSelected: boolean;
	onToggleSelect: () => void;
}) {
	const { user, position, org, diplomaticProfile } = member;
	const status = diplomaticProfile?.status ?? "en_poste";
	const statusInfo = STATUS_CONFIG[status] ?? STATUS_CONFIG.en_poste;
	const gradeInfo = GRADE_CONFIG[position?.grade ?? "agent"] ?? GRADE_CONFIG.agent;
	const languages = diplomaticProfile?.languages ?? [];
	const credentials = diplomaticProfile?.credentials;

	return (
		<Link
			href={`/users/${user?._id}`}
			className="block"
		>
		<FlatCard className={cn(
			"hover:ring-1 hover:ring-primary/20 transition-colors cursor-pointer group",
			isSelected && "ring-2 ring-primary",
		)}>
			<div className="p-3 lg:p-4">
				<div className="flex items-start gap-3">
					<div
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onToggleSelect();
						}}
						className="shrink-0 mt-1"
					>
						<Checkbox
							checked={isSelected}
							onCheckedChange={onToggleSelect}
							aria-label="Sélectionner ce membre"
							onClick={(e) => e.stopPropagation()}
						/>
					</div>
					<Avatar className="h-12 w-12 rounded-xl shrink-0">
						<AvatarImage src={user?.avatarUrl} />
						<AvatarFallback className="rounded-xl bg-primary/10 text-primary text-sm">
							{user?.lastName?.[0]}{user?.firstName?.[0]}
						</AvatarFallback>
					</Avatar>
					<div className="flex-1 min-w-0">
						<p className="text-sm font-semibold truncate">
							{user?.lastName?.toUpperCase()} {user?.firstName}
						</p>
						<p className="text-xs text-muted-foreground truncate">
							{position?.title?.fr ?? "Poste non assigné"}
						</p>
						<div className="flex items-center gap-1.5 mt-1 flex-wrap">
							<Badge variant="outline" className={cn("text-[9px] h-4", statusInfo.bg, statusInfo.color)}>
								{statusInfo.label}
							</Badge>
							<Badge variant="outline" className={cn("text-[9px] h-4", gradeInfo.color)}>
								{gradeInfo.label}
							</Badge>
						</div>
					</div>
					{user?._id && (
						<div
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
							}}
							className="shrink-0"
						>
							<SuperAdminCallTrigger
								targetUser={{
									_id: user._id as Id<"users">,
									firstName: user.firstName,
									lastName: user.lastName,
									email: user.email,
									avatarUrl: user.avatarUrl,
								}}
								variant="icon-buttons"
							/>
						</div>
					)}
				</div>

				{/* Org */}
				{org && (
					<div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
						<Building2 className="h-3 w-3 shrink-0" />
						<span className="truncate">{org.name}</span>
						{org.country && (
							<span className="flex items-center gap-0.5 shrink-0">
								<span>{getCountryFlag(org.country)}</span>
								<span>{org.country}</span>
							</span>
						)}
					</div>
				)}

				{/* Langues */}
				{languages.length > 0 && (
					<div className="flex items-center gap-1.5 mt-2">
						<Languages className="h-3 w-3 text-muted-foreground shrink-0" />
						<div className="flex flex-wrap gap-1">
							{languages.slice(0, 3).map((lang: any, i: number) => (
								<span key={i} className="text-[9px] bg-muted/50 rounded px-1.5 py-0.5">
									{lang.code?.toUpperCase()} · {LANG_LEVELS[lang.level] ?? lang.level}
								</span>
							))}
							{languages.length > 3 && (
								<span className="text-[9px] text-muted-foreground">+{languages.length - 3}</span>
							)}
						</div>
					</div>
				)}

				{/* Accréditations */}
				{credentials && (
					<div className="flex items-center gap-1 mt-2">
						{credentials.lettersOfCredence?.presentedDate && (
							<Badge variant="outline" className="text-[8px] h-3.5 px-1 gap-0.5">
								<Award className="h-2 w-2" /> Lettres
							</Badge>
						)}
						{credentials.diplomaticCard?.number && (
							<Badge variant="outline" className="text-[8px] h-3.5 px-1 gap-0.5">
								<Shield className="h-2 w-2" /> Carte
							</Badge>
						)}
						{credentials.diplomaticPassport?.number && (
							<Badge variant="outline" className="text-[8px] h-3.5 px-1 gap-0.5">
								<Briefcase className="h-2 w-2" /> Passeport
							</Badge>
						)}
					</div>
				)}
			</div>
		</FlatCard>
		</Link>
	);
}
