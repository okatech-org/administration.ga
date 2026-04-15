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
import Link from "next/link";
import {
	Award,
	Briefcase,
	Building2,
	ExternalLink,
	Globe,
	Languages,
	Loader2,
	MapPin,
	Search,
	Shield,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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

	if (isPending) {
		return (
			<div className="flex items-center justify-center py-20">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const hasActiveFilters = activeContinent || selectedCountry || selectedOrg || gradeFilter || statusFilter || search.trim();

	return (
		<div className="space-y-4">
			{/* ── Stats par grade (cliquables) ── */}
			<div className="grid grid-cols-2 md:grid-cols-5 gap-2">
				{Object.entries(GRADE_CONFIG).map(([key, { label, color }]) => (
					<button
						key={key}
						type="button"
						onClick={() => setGradeFilter(gradeFilter === key ? null : key)}
						className={cn(
							"rounded-lg border p-3 text-center transition-all cursor-pointer",
							gradeFilter === key ? "border-primary bg-primary/5" : "hover:bg-muted/30",
						)}
					>
						<div className={cn("text-xl font-bold", color)}>{gradeDistribution[key] ?? 0}</div>
						<div className="text-[10px] text-muted-foreground">{label}</div>
					</button>
				))}
			</div>

			{/* ── Continents ── */}
			{continentData.continents.length > 1 && (
				<div className="flex flex-wrap items-center gap-1.5">
					<button
						type="button"
						onClick={() => { setActiveContinent(null); setSelectedCountry(null); setSelectedOrg(null); }}
						className={cn(
							"flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
							!activeContinent ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/50",
						)}
					>
						Tous
						<Badge variant="secondary" className={cn("h-5 min-w-[20px] px-1.5 text-[10px]", !activeContinent && "bg-primary/10 text-primary")}>
							{allMembers.length}
						</Badge>
					</button>
					{continentData.continents.map((cont) => {
						const meta = CONTINENT_META[cont];
						const isActive = activeContinent === cont;
						return (
							<button
								key={cont}
								type="button"
								onClick={() => { setActiveContinent(isActive ? null : cont); setSelectedCountry(null); setSelectedOrg(null); }}
								className={cn(
									"flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
									isActive ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/50",
								)}
							>
								{meta?.label ?? cont}
								<Badge variant="secondary" className={cn("h-5 min-w-[20px] px-1.5 text-[10px]", isActive && "bg-primary/10 text-primary")}>
									{continentData.counts.get(cont) ?? 0}
								</Badge>
							</button>
						);
					})}
				</div>
			)}

			{/* ── Pays (si continent sélectionné ou peu de pays) ── */}
			{(activeContinent || countryData.length <= 10) && countryData.length > 1 && (
				<div className="flex flex-wrap items-center gap-1">
					<button
						type="button"
						onClick={() => { setSelectedCountry(null); setSelectedOrg(null); }}
						className={cn(
							"flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
							!selectedCountry ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
						)}
					>
						Tous les pays
					</button>
					{countryData.map(({ code, name, flag, count }) => (
						<button
							key={code}
							type="button"
							onClick={() => { setSelectedCountry(selectedCountry === code ? null : code); setSelectedOrg(null); }}
							className={cn(
								"flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
								selectedCountry === code ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
							)}
						>
							{flag} {name}
							<span className="text-[10px] opacity-70">{count}</span>
						</button>
					))}
				</div>
			)}

			{/* ── Représentations (si pays sélectionné ou peu d'orgs) ── */}
			{(selectedCountry || orgData.length <= 6) && orgData.length > 1 && (
				<div className="flex flex-wrap items-center gap-1">
					<button
						type="button"
						onClick={() => setSelectedOrg(null)}
						className={cn(
							"flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
							!selectedOrg ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
						)}
					>
						<Building2 className="h-3 w-3" /> Toutes
					</button>
					{orgData.map(({ id, name, count }) => (
						<button
							key={id}
							type="button"
							onClick={() => setSelectedOrg(selectedOrg === id ? null : id)}
							className={cn(
								"flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
								selectedOrg === id ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
							)}
						>
							{name}
							<span className="text-[10px] opacity-70">{count}</span>
						</button>
					))}
				</div>
			)}

			{/* ── Recherche + Statuts ── */}
			<div className="flex items-center gap-2 flex-wrap">
				<div className="relative flex-1 min-w-[200px]">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Rechercher par nom, poste ou organisation..."
						className="pl-9"
					/>
				</div>
				<div className="flex items-center gap-1 flex-wrap">
					{Object.entries(STATUS_CONFIG).map(([key, { label, bg, color }]) => (
						<button
							key={key}
							type="button"
							onClick={() => setStatusFilter(statusFilter === key ? null : key)}
							className={cn(
								"text-[10px] rounded-full px-2.5 py-1 border transition-colors",
								statusFilter === key
									? "bg-primary text-primary-foreground border-primary"
									: cn("border-transparent", bg, color, "hover:opacity-80"),
							)}
						>
							{label}
						</button>
					))}
				</div>
			</div>

			{/* ── Résultats ── */}
			<div className="flex items-center justify-between">
				<span className="text-xs text-muted-foreground">
					{filtered.length} membre{filtered.length !== 1 ? "s" : ""}
					{hasActiveFilters && (
						<button type="button" onClick={resetFilters} className="ml-2 text-primary hover:underline">
							Réinitialiser les filtres
						</button>
					)}
				</span>
			</div>

			<ScrollArea className="h-[calc(100vh-480px)]">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
					{filtered.map((member: any) => (
						<DiplomaticMemberCard key={member.membershipId} member={member} />
					))}
					{filtered.length === 0 && (
						<div className="col-span-full text-center py-12 text-muted-foreground text-sm">
							Aucun membre trouvé
						</div>
					)}
				</div>
			</ScrollArea>
		</div>
	);
}

// ─── Carte diplomatique ───────────────────────────────────
function DiplomaticMemberCard({ member }: { member: any }) {
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
		<FlatCard className="hover:ring-1 hover:ring-primary/20 transition-colors cursor-pointer group">
			<div className="p-3 lg:p-4">
				<div className="flex items-start gap-3">
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
