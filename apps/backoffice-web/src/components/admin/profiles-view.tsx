/**
 * ProfilesView — Composant réutilisable pour afficher les profils consulaires.
 * Extrait de profiles/index.tsx pour être utilisé dans la page unifiée /users.
 */

import { api } from "@convex/_generated/api";
import {
	Building2,
	LayoutGrid,
	List,
	Loader2,
	Search,
	Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/ui/data-table";
import { ProfileCard } from "@/components/dashboard/ProfileCard";
import { profileColumns } from "@/components/admin/profiles-columns";
import { Badge } from "@/components/ui/badge";
import { useAuthenticatedPaginatedQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";
import {
	type Continent,
	getActiveContinents,
	getContinent,
	getContinentEmoji,
	getContinentLabel,
	getCountryFlag,
	getCountryName,
	getOrgTypeEmoji,
	getOrgTypeLabel,
} from "@/lib/country-utils";

function useDebounce<T>(value: T, delay: number): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);
	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);
		return () => clearTimeout(handler);
	}, [value, delay]);
	return debouncedValue;
}

export function ProfilesView() {
	useTranslation();
	const [searchTerm, setSearchTerm] = useState("");
	const debouncedSearch = useDebounce(searchTerm, 500);
	const [activeContinent, setActiveContinent] = useState<Continent | null>(null);
	const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<"table" | "grid">("table");

	const {
		results: profiles,
		status: paginationStatus,
		loadMore,
		isLoading,
	} = useAuthenticatedPaginatedQuery(
		api.functions.profiles.searchProfiles,
		{ searchTerm: debouncedSearch },
		{ initialNumItems: 100 },
	);

	// Get country from profile
	const getProfileCountry = useCallback((profile: any): string | undefined => {
		return profile.countryOfResidence || profile.addresses?.residence?.country;
	}, []);

	// Continent detection + counts + filtering
	const { continents, continentCounts, filteredProfiles, countryOptions } = useMemo(() => {
		const countryCodes = profiles
			.map((p: any) => getProfileCountry(p))
			.filter(Boolean) as string[];

		const activeContinents = getActiveContinents(countryCodes);

		// Count per continent
		const countMap = new Map<Continent | "all", number>();
		countMap.set("all", profiles.length);
		for (const c of activeContinents) {
			countMap.set(c, 0);
		}
		for (const profile of profiles) {
			const code = getProfileCountry(profile);
			const continent = code ? getContinent(code) : null;
			if (continent && countMap.has(continent)) {
				countMap.set(continent, (countMap.get(continent) || 0) + 1);
			}
		}

		// Country options for selected continent
		const countries = new Map<string, { code: string; label: string; count: number }>();
		for (const profile of profiles) {
			const code = getProfileCountry(profile);
			if (!code) continue;
			const continent = getContinent(code);
			if (activeContinent && continent !== activeContinent) continue;
			if (!countries.has(code)) {
				countries.set(code, {
					code,
					label: `${getCountryFlag(code)} ${getCountryName(code)}`,
					count: 0,
				});
			}
			countries.get(code)!.count++;
		}
		const countryOpts = [...countries.values()]
			.sort((a, b) => a.label.localeCompare(b.label));

		// Filter profiles
		let filtered = profiles;
		if (debouncedSearch) {
			const lowerQuery = debouncedSearch.toLowerCase();
			filtered = filtered.filter((p: any) => {
				const searchStr = `${p.identity?.firstName || ""} ${p.identity?.lastName || ""} ${p.user?.email || ""}`.toLowerCase();
				return searchStr.includes(lowerQuery);
			});
		}
		if (activeContinent) {
			filtered = filtered.filter((p: any) => {
				const code = getProfileCountry(p);
				return code ? getContinent(code) === activeContinent : false;
			});
		}
		if (selectedCountry) {
			filtered = filtered.filter((p: any) => {
				return getProfileCountry(p) === selectedCountry;
			});
		}

		return {
			continents: activeContinents,
			continentCounts: countMap,
			filteredProfiles: filtered,
			countryOptions: countryOpts,
		};
	}, [profiles, activeContinent, selectedCountry, getProfileCountry, debouncedSearch]);

	// Stats
	const stats = useMemo(() => {
		const total = filteredProfiles.length;
		const attached = filteredProfiles.filter((p: any) => p.managedByOrg || p.signaledToOrg).length;
		return { total, attached, unattached: total - attached };
	}, [filteredProfiles]);

	// Reset country filter when continent changes
	useEffect(() => {
		setSelectedCountry(null);
	}, [activeContinent]);

	// Dynamic filter options for DataTable
	const filterableColumns = useMemo(() => {
		const opts: { id: string; title: string; options: { label: string; value: string }[] }[] = [];

		// User type filter
		const userTypes = new Set<string>();
		for (const p of filteredProfiles) {
			if ((p as any).userType) userTypes.add((p as any).userType);
		}
		if (userTypes.size > 1) {
			const USER_TYPE_LABELS: Record<string, string> = {
				long_stay: " Résident",
				short_stay: " De passage",
				visa_tourism: " Visa tourisme",
				visa_business: " Visa affaires",
				visa_long_stay: " Visa long séjour",
				admin_services: " Services admin",
			};
			opts.push({
				id: "userType",
				title: "Statut",
				options: [...userTypes].map((t) => ({
					value: t,
					label: USER_TYPE_LABELS[t] ?? t,
				})),
			});
		}

		// Country filter
		if (countryOptions.length > 1) {
			opts.push({
				id: "country",
				title: "Pays",
				options: countryOptions.map((c) => ({
					value: c.code,
					label: c.label,
				})),
			});
		}

		return opts;
	}, [filteredProfiles, countryOptions]);

	// Load more when available
	useEffect(() => {
		if (paginationStatus === "CanLoadMore") {
			loadMore(100);
		}
	}, [paginationStatus, loadMore]);

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-6">
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">
						Profils Citoyens
					</h1>
					<p className="text-muted-foreground">
						Recherchez et consultez les profils consulaires.
					</p>
				</div>

				{/* Stats badges */}
				{profiles.length > 0 && (
					<div className="flex items-center gap-4 flex-wrap">
						{/* View Toggles */}
						<div className="flex items-center p-1 bg-muted/50 rounded-lg shrink-0">
							<button
								type="button"
								onClick={() => setViewMode("table")}
								className={cn(
									"p-1.5 rounded-md text-sm transition-all focus:outline-none",
									viewMode === "table"
										? "bg-background text-foreground"
										: "text-muted-foreground hover:text-foreground hover:bg-muted/80",
								)}
								title="Vue tableau"
							>
								<List className="h-4 w-4" />
							</button>
							<button
								type="button"
								onClick={() => setViewMode("grid")}
								className={cn(
									"p-1.5 rounded-md text-sm transition-all focus:outline-none",
									viewMode === "grid"
										? "bg-background text-foreground"
										: "text-muted-foreground hover:text-foreground hover:bg-muted/80",
								)}
								title="Vue grille"
							>
								<LayoutGrid className="h-4 w-4" />
							</button>
						</div>

						<div className="flex items-center gap-2 flex-wrap">
							<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 text-sm">
								<Users className="h-3.5 w-3.5 text-muted-foreground" />
								<span className="font-medium">{stats.total}</span>
								<span className="text-muted-foreground">profils</span>
							</div>
							{stats.attached > 0 && (
								<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-sm border border-green-500/20">
									<Building2 className="h-3.5 w-3.5 text-green-600" />
									<span className="font-medium text-green-700">{stats.attached}</span>
									<span className="text-green-600">rattachés</span>
								</div>
							)}
							{stats.unattached > 0 && (
								<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 text-sm border border-orange-500/20">
									<span className="font-medium text-orange-700">{stats.unattached}</span>
									<span className="text-orange-600">non rattachés</span>
								</div>
							)}
						</div>
					</div>
				)}
			</div>

			{/* Continent Tabs */}
			{continents.length > 0 && (
				<div className="flex flex-wrap gap-1.5 p-1 bg-muted/50 rounded-xl">
					<button
						type="button"
						onClick={() => setActiveContinent(null)}
						className={cn(
							"flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
							activeContinent === null
								? "bg-background text-foreground"
								: "text-muted-foreground hover:text-foreground hover:bg-background/50",
						)}
					>
						<span></span>
						<span>Tous</span>
						<Badge
							variant="secondary"
							className={cn(
								"ml-0.5 h-5 min-w-[20px] px-1.5 text-[10px]",
								activeContinent === null && "bg-primary/10 text-primary",
							)}
						>
							{continentCounts.get("all") || 0}
						</Badge>
					</button>

					{continents.map((continent) => (
						<button
							key={continent}
							type="button"
							onClick={() => setActiveContinent(continent)}
							className={cn(
								"flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
								activeContinent === continent
									? "bg-background text-foreground"
									: "text-muted-foreground hover:text-foreground hover:bg-background/50",
							)}
						>
							<span>{getContinentEmoji(continent)}</span>
							<span className="hidden sm:inline">{getContinentLabel(continent)}</span>
							<Badge
								variant="secondary"
								className={cn(
									"ml-0.5 h-5 min-w-[20px] px-1.5 text-[10px]",
									activeContinent === continent && "bg-primary/10 text-primary",
								)}
							>
								{continentCounts.get(continent) || 0}
							</Badge>
						</button>
					))}
				</div>
			)}

			{/* Country Sub-Tabs */}
			{countryOptions.length > 0 && (
				<div className="flex flex-wrap gap-1 px-1">
					<button
						type="button"
						onClick={() => setSelectedCountry(null)}
						className={cn(
							"flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
							!selectedCountry
								? "bg-primary/10 text-primary border border-primary/20"
								: "text-muted-foreground hover:text-foreground hover:bg-muted/80",
						)}
					>
						<span></span>
						<span>Tous les pays</span>
						<span className="text-[10px] opacity-70 ml-0.5">
							{activeContinent ? continentCounts.get(activeContinent) || 0 : profiles.length}
						</span>
					</button>
					{countryOptions.map((opt) => (
						<button
							key={opt.code}
							type="button"
							onClick={() => setSelectedCountry(opt.code)}
							className={cn(
								"flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
								selectedCountry === opt.code
									? "bg-primary/10 text-primary border border-primary/20"
									: "text-muted-foreground hover:text-foreground hover:bg-muted/80",
							)}
						>
							<span>{opt.label}</span>
							<span className="text-[10px] opacity-70 ml-0.5">{opt.count}</span>
						</button>
					))}
				</div>
			)}

			{/* Content View */}
			{viewMode === "table" ? (
				<DataTable
					columns={profileColumns}
					data={filteredProfiles as any[]}
					searchKeys={["name"]}
					searchPlaceholder="Rechercher par nom..."
					filterableColumns={filterableColumns}
					isLoading={isLoading && profiles.length === 0}
				/>
			) : (
				<div className="flex flex-col gap-4">
					{/* Search Bar for Grid View */}
					<div className="relative max-w-sm">
						<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
						<input
							type="search"
							placeholder="Rechercher par nom..."
							className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</div>

					{isLoading && profiles.length === 0 ? (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
							{Array.from({ length: 8 }).map((_, i) => (
								<div
									key={i}
									className="h-48 rounded-xl bg-muted/50 animate-pulse"
								/>
							))}
						</div>
					) : filteredProfiles.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl bg-muted/20 border-dashed">
							<Users className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
							<h3 className="text-lg font-medium">Aucun profil trouvé</h3>
							<p className="text-muted-foreground mt-1">
								{debouncedSearch
									? `Aucun résultat pour "${debouncedSearch}"`
									: activeContinent
										? "Aucun profil dans cette région."
										: "La base de données des profils est vide."}
							</p>
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
							{filteredProfiles.map((profile: any) => (
								<ProfileCard key={profile._id} profile={profile} />
							))}
						</div>
					)}
				</div>
			)}

			{/* Load more indicator */}
			{paginationStatus === "LoadingMore" && (
				<div className="flex justify-center py-4">
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						<span>Chargement des profils...</span>
					</div>
				</div>
			)}
		</div>
	);
}
