/**
 * ProfilesView — Profils Citoyens de la page /users (vue Profils).
 *
 * Pagination offset-based côté serveur (api.functions.profiles.listProfilesPage),
 * facets (api.functions.profiles.getProfileFacets), et état complet dans l'URL
 * (continent, country, type, attachment, search, mode, page, pageSize) via
 * `router.replace({ scroll: false })`. Pas de layout shift entre pages : la
 * dernière snapshot est conservée dans un ref pendant que la query suivante
 * est en vol.
 */

"use client"

import { api } from "@convex/_generated/api"
import {
	Building2,
	LayoutGrid,
	List,
	Loader2,
	Search,
	Users,
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import type { PaginationState } from "@tanstack/react-table"
import { useQuery } from "convex/react"
import { DataTable } from "@/components/ui/data-table"
import { ProfileCard } from "@/components/dashboard/ProfileCard"
import { profileColumns } from "@/components/admin/profiles-columns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@workspace/ui/components/button"
import {
	Combobox,
	type ComboboxOption,
} from "@workspace/ui/components/combobox"
import { useDebounce } from "@/hooks/use-debounce"
import { cn } from "@/lib/utils"
import {
	type Continent,
	CONTINENT_META,
	getContinent,
	getContinentEmoji,
	getContinentLabel,
	getCountryFlag,
	getCountryName,
} from "@/lib/country-utils"

// ── URL params owned by this view ────────────────────────────────────
const P = {
	q: "q",
	continent: "continent",
	country: "country",
	type: "type",
	attach: "attach",
	mode: "mode",
	page: "page",
	pageSize: "pageSize",
} as const

const USER_TYPE_LABELS: Record<string, string> = {
	long_stay: "Résident",
	short_stay: "De passage",
	visa_tourism: "Visa tourisme",
	visa_business: "Visa affaires",
	visa_long_stay: "Visa long séjour",
	admin_services: "Services admin",
}
const ALL_USER_TYPES = Object.keys(USER_TYPE_LABELS)

const DEFAULT_PAGE_SIZE = 10

type Mode = "table" | "grid"
type Attachment = "attached" | "unattached"

export function ProfilesView() {
	useTranslation()
	const router = useRouter()
	const searchParams = useSearchParams()

	// ── URL is the source of truth for all filters + pagination ───────
	const urlSearch = searchParams.get(P.q) ?? ""
	const activeContinent = (searchParams.get(P.continent) as Continent | null) ?? null
	const activeCountry = searchParams.get(P.country) ?? null
	const activeUserType = searchParams.get(P.type) ?? null
	const activeAttachment = (searchParams.get(P.attach) as Attachment | null) ?? null
	const mode = (searchParams.get(P.mode) as Mode | null) ?? "table"
	const urlPage = Math.max(
		0,
		Number.parseInt(searchParams.get(P.page) ?? "1", 10) - 1,
	)
	const urlPageSize = (() => {
		const raw = Number.parseInt(
			searchParams.get(P.pageSize) ?? String(DEFAULT_PAGE_SIZE),
			10,
		)
		return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_PAGE_SIZE
	})()

	// Search input mirror — keystrokes don't wait on the URL round-trip.
	const [searchInput, setSearchInput] = useState(urlSearch)
	const debouncedSearch = useDebounce(searchInput, 300)
	useEffect(() => {
		setSearchInput(urlSearch)
	}, [urlSearch])

	// Shallow URL writer. Null/empty → delete the key to keep URLs clean.
	const updateParams = useCallback(
		(updates: Record<string, string | null>) => {
			const params = new URLSearchParams(searchParams.toString())
			for (const [k, v] of Object.entries(updates)) {
				if (v === null || v === "") params.delete(k)
				else params.set(k, v)
			}
			const qs = params.toString()
			router.replace(qs ? `/users?${qs}` : "/users", { scroll: false })
		},
		[router, searchParams],
	)

	// Debounced search → URL. Resets to page 1.
	useEffect(() => {
		if (debouncedSearch !== urlSearch) {
			updateParams({ [P.q]: debouncedSearch || null, [P.page]: null })
		}
	}, [debouncedSearch, urlSearch, updateParams])

	const filters = useMemo(
		() => ({
			search: urlSearch.trim() || undefined,
			continent: activeContinent ?? undefined,
			country: activeCountry ?? undefined,
			userType: activeUserType ?? undefined,
			attachment: activeAttachment ?? undefined,
		}),
		[urlSearch, activeContinent, activeCountry, activeUserType, activeAttachment],
	)

	const pageData = useQuery(api.functions.profiles.listProfilesPage, {
		filters,
		page: urlPage,
		pageSize: urlPageSize,
	})
	const facets = useQuery(api.functions.profiles.getProfileFacets, {})

	// Stable rows: keep the last snapshot visible while the next query is
	// in flight. DataTable's `isPageTransitioning` dims the rows to signal
	// loading without shrinking the table back to zero height.
	const lastSnapshotRef = useRef<{ rows: any[]; total: number }>({
		rows: [],
		total: 0,
	})
	if (pageData !== undefined) {
		lastSnapshotRef.current = { rows: pageData.rows, total: pageData.total }
	}
	const profiles = lastSnapshotRef.current.rows
	const total = lastSnapshotRef.current.total

	const isInitialLoad = pageData === undefined && profiles.length === 0
	const isPageTransitioning = pageData === undefined && profiles.length > 0

	// ── Setters (write through URL) ────────────────────────────────────
	const setContinent = (v: Continent | null) => {
		const updates: Record<string, string | null> = {
			[P.continent]: v,
			[P.page]: null,
		}
		// Drop the country filter if it doesn't belong to the new continent.
		if (activeCountry && v && getContinent(activeCountry) !== v) {
			updates[P.country] = null
		}
		updateParams(updates)
	}
	const setCountry = (v: string | null) =>
		updateParams({ [P.country]: v, [P.page]: null })
	const setUserType = (v: string | null) =>
		updateParams({ [P.type]: v, [P.page]: null })
	const setAttachment = (v: Attachment | null) =>
		updateParams({ [P.attach]: v, [P.page]: null })
	const setMode = (v: Mode) =>
		updateParams({ [P.mode]: v === "table" ? null : v })

	const setPagination = useCallback(
		(updater: PaginationState | ((s: PaginationState) => PaginationState)) => {
			const current: PaginationState = {
				pageIndex: urlPage,
				pageSize: urlPageSize,
			}
			const next = typeof updater === "function" ? updater(current) : updater
			updateParams({
				[P.page]: next.pageIndex === 0 ? null : String(next.pageIndex + 1),
				[P.pageSize]:
					next.pageSize === DEFAULT_PAGE_SIZE ? null : String(next.pageSize),
			})
		},
		[urlPage, urlPageSize, updateParams],
	)

	// ── Filter option lists from facets ────────────────────────────────
	const continents: Continent[] = facets
		? (Object.keys(facets.continents) as Continent[]).sort(
				(a, b) =>
					(CONTINENT_META[a]?.order ?? 99) - (CONTINENT_META[b]?.order ?? 99),
			)
		: []

	const countryOptions = facets
		? Object.entries(facets.countries)
				.filter(([code]) =>
					activeContinent ? getContinent(code) === activeContinent : true,
				)
				.map(([code, count]) => ({
					code,
					label: `${getCountryFlag(code)} ${getCountryName(code)}`,
					count,
				}))
				.sort((a, b) => a.label.localeCompare(b.label))
		: []

	const userTypeOptions: ComboboxOption<string>[] = ALL_USER_TYPES
		.filter((t) => (facets?.userTypes?.[t] ?? 0) > 0)
		.map((t) => ({
			value: t,
			label: `${USER_TYPE_LABELS[t]} (${facets?.userTypes?.[t] ?? 0})`,
		}))

	const hasActiveFilter =
		urlSearch.length > 0 ||
		activeContinent !== null ||
		activeCountry !== null ||
		activeUserType !== null ||
		activeAttachment !== null

	const resetFilters = () => {
		setSearchInput("")
		const params = new URLSearchParams()
		const view = searchParams.get("view")
		if (view) params.set("view", view)
		// Keep the current view mode (table/grid is a UI preference, not a filter).
		if (mode !== "table") params.set(P.mode, mode)
		const qs = params.toString()
		router.replace(qs ? `/users?${qs}` : "/users", { scroll: false })
	}

	const pagination: PaginationState = {
		pageIndex: urlPage,
		pageSize: urlPageSize,
	}

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-6">
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Profils Citoyens</h1>
					<p className="text-muted-foreground">
						Recherchez et consultez les profils des citoyens et usagers.
					</p>
				</div>

				<div className="flex items-center gap-4 flex-wrap">
					{/* View toggle (table / grid) */}
					<div className="flex items-center p-1 bg-muted/50 rounded-lg shrink-0">
						<button
							type="button"
							onClick={() => setMode("table")}
							className={cn(
								"p-1.5 rounded-md text-sm transition-all focus:outline-none",
								mode === "table"
									? "bg-background text-foreground"
									: "text-muted-foreground hover:text-foreground hover:bg-muted/80",
							)}
							title="Vue tableau"
						>
							<List className="h-4 w-4" />
						</button>
						<button
							type="button"
							onClick={() => setMode("grid")}
							className={cn(
								"p-1.5 rounded-md text-sm transition-all focus:outline-none",
								mode === "grid"
									? "bg-background text-foreground"
									: "text-muted-foreground hover:text-foreground hover:bg-muted/80",
							)}
							title="Vue grille"
						>
							<LayoutGrid className="h-4 w-4" />
						</button>
					</div>

					{/* Stats */}
					{facets && (
						<div className="flex items-center gap-2 flex-wrap">
							<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 text-sm">
								<Users className="h-3.5 w-3.5 text-muted-foreground" />
								<span className="font-medium">{total}</span>
								<span className="text-muted-foreground">profils</span>
							</div>
							{facets.attachment.attached > 0 && (
								<button
									type="button"
									onClick={() =>
										setAttachment(
											activeAttachment === "attached" ? null : "attached",
										)
									}
									className={cn(
										"flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors",
										activeAttachment === "attached"
											? "bg-green-500/20 border-green-500/40 text-green-700"
											: "bg-green-500/10 border-green-500/20 text-green-700 hover:bg-green-500/15",
									)}
								>
									<Building2 className="h-3.5 w-3.5 text-green-600" />
									<span className="font-medium">
										{facets.attachment.attached}
									</span>
									<span>rattachés</span>
								</button>
							)}
							{facets.attachment.unattached > 0 && (
								<button
									type="button"
									onClick={() =>
										setAttachment(
											activeAttachment === "unattached" ? null : "unattached",
										)
									}
									className={cn(
										"flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors",
										activeAttachment === "unattached"
											? "bg-orange-500/20 border-orange-500/40 text-orange-700"
											: "bg-orange-500/10 border-orange-500/20 text-orange-700 hover:bg-orange-500/15",
									)}
								>
									<span className="font-medium">
										{facets.attachment.unattached}
									</span>
									<span>non rattachés</span>
								</button>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Continent tabs */}
			{continents.length > 0 && (
				<div className="flex flex-wrap gap-1.5 p-1 bg-muted/50 rounded-xl">
					<button
						type="button"
						onClick={() => setContinent(null)}
						className={cn(
							"flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
							activeContinent === null
								? "bg-background text-foreground"
								: "text-muted-foreground hover:text-foreground hover:bg-background/50",
						)}
					>
						<span>Tous</span>
						<Badge
							variant="secondary"
							className={cn(
								"ml-0.5 h-5 min-w-[20px] px-1.5 text-[10px]",
								activeContinent === null && "bg-primary/10 text-primary",
							)}
						>
							{facets?.total ?? 0}
						</Badge>
					</button>
					{continents.map((continent) => (
						<button
							key={continent}
							type="button"
							onClick={() => setContinent(continent)}
							className={cn(
								"flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
								activeContinent === continent
									? "bg-background text-foreground"
									: "text-muted-foreground hover:text-foreground hover:bg-background/50",
							)}
						>
							<span>{getContinentEmoji(continent)}</span>
							<span className="hidden sm:inline">
								{getContinentLabel(continent)}
							</span>
							<Badge
								variant="secondary"
								className={cn(
									"ml-0.5 h-5 min-w-[20px] px-1.5 text-[10px]",
									activeContinent === continent && "bg-primary/10 text-primary",
								)}
							>
								{facets?.continents?.[continent] ?? 0}
							</Badge>
						</button>
					))}
				</div>
			)}

			{/* Country sub-tabs + filters row */}
			<div className="flex flex-wrap items-center gap-3">
				{countryOptions.length > 0 && (
					<div className="flex flex-wrap gap-1">
						<button
							type="button"
							onClick={() => setCountry(null)}
							className={cn(
								"flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
								!activeCountry
									? "bg-primary/10 text-primary border border-primary/20"
									: "text-muted-foreground hover:text-foreground hover:bg-muted/80",
							)}
						>
							<span>Tous les pays</span>
							<span className="text-[10px] opacity-70 ml-0.5">
								{activeContinent
									? facets?.continents?.[activeContinent] ?? 0
									: facets?.total ?? 0}
							</span>
						</button>
						{countryOptions.map((opt) => (
							<button
								key={opt.code}
								type="button"
								onClick={() => setCountry(opt.code)}
								className={cn(
									"flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
									activeCountry === opt.code
										? "bg-primary/10 text-primary border border-primary/20"
										: "text-muted-foreground hover:text-foreground hover:bg-muted/80",
								)}
							>
								<span>{opt.label}</span>
								<span className="text-[10px] opacity-70 ml-0.5">
									{opt.count}
								</span>
							</button>
						))}
					</div>
				)}

				{userTypeOptions.length > 0 && (
					<div className="ml-auto flex items-center gap-2">
						<Combobox
							options={[
								{
									value: "__all__",
									label: `Tous les statuts (${facets?.total ?? 0})`,
								},
								...userTypeOptions,
							]}
							value={activeUserType ?? "__all__"}
							onValueChange={(v) =>
								setUserType(v === "__all__" ? null : v)
							}
							placeholder="Statut"
							searchPlaceholder="Filtrer…"
							emptyText="Aucun statut."
							className="h-9 w-[200px]"
						/>
						{hasActiveFilter && (
							<Button
								variant="outline"
								size="sm"
								className="h-9 font-normal"
								onClick={resetFilters}
							>
								Réinitialiser
							</Button>
						)}
					</div>
				)}
			</div>

			{/* Content */}
			{mode === "table" ? (
				<DataTable
					columns={profileColumns}
					data={profiles as any[]}
					searchKeys={["name"]}
					searchPlaceholder="Rechercher par nom..."
					searchValue={searchInput}
					onSearchChange={setSearchInput}
					isLoading={isInitialLoad}
					isPageTransitioning={isPageTransitioning}
					totalRowCount={total}
					pagination={pagination}
					onPaginationChange={setPagination}
				/>
			) : (
				<div className="flex flex-col gap-4">
					{/* Grid mode: independent search input + manual page nav. */}
					<div className="flex items-center justify-between gap-4 flex-wrap">
						<div className="relative max-w-sm w-full">
							<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<input
								type="search"
								placeholder="Rechercher par nom..."
								className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
							/>
						</div>
						<GridPager
							page={urlPage}
							pageSize={urlPageSize}
							total={total}
							onChange={setPagination}
							isLoading={isPageTransitioning}
						/>
					</div>

					{isInitialLoad ? (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
							{Array.from({ length: 8 }).map((_, i) => (
								<div
									// biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
									key={i}
									className="h-48 rounded-xl bg-muted/50 animate-pulse"
								/>
							))}
						</div>
					) : profiles.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl bg-muted/20 border-dashed">
							<Users className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
							<h3 className="text-lg font-medium">Aucun profil trouvé</h3>
							<p className="text-muted-foreground mt-1">
								{urlSearch
									? `Aucun résultat pour "${urlSearch}"`
									: activeContinent
										? "Aucun profil dans cette région."
										: "La base de données des profils est vide."}
							</p>
						</div>
					) : (
						<div
							className={cn(
								"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 transition-opacity duration-150",
								isPageTransitioning && "opacity-40",
							)}
						>
							{profiles.map((profile: any) => (
								<ProfileCard key={profile._id} profile={profile} />
							))}
						</div>
					)}

					<GridPager
						page={urlPage}
						pageSize={urlPageSize}
						total={total}
						onChange={setPagination}
						isLoading={isPageTransitioning}
					/>
				</div>
			)}
		</div>
	)
}

/** Compact prev/next pager used in the grid view. */
function GridPager({
	page,
	pageSize,
	total,
	onChange,
	isLoading,
}: {
	page: number
	pageSize: number
	total: number
	onChange: (s: PaginationState) => void
	isLoading: boolean
}) {
	const pageCount = Math.max(1, Math.ceil(total / pageSize))
	const display = page + 1
	const canPrev = page > 0
	const canNext = page < pageCount - 1
	return (
		<div className="flex items-center gap-2 text-sm text-muted-foreground">
			{isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
			<span>
				Page {display} sur {pageCount}
			</span>
			<Button
				variant="outline"
				size="sm"
				className="h-8"
				disabled={!canPrev || isLoading}
				onClick={() => onChange({ pageIndex: page - 1, pageSize })}
			>
				Précédent
			</Button>
			<Button
				variant="outline"
				size="sm"
				className="h-8"
				disabled={!canNext || isLoading}
				onClick={() => onChange({ pageIndex: page + 1, pageSize })}
			>
				Suivant
			</Button>
		</div>
	)
}
