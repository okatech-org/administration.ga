/**
 * IAstedContactTab — annuaire iCom (mode lazy-load par organisation).
 *
 * Trois modes mutuellement exclusifs :
 *
 * 1. **Browse (par défaut, sans recherche)** : la liste des organisations est
 *    rendue collapsée. L'utilisateur déplie une org → ses membres se chargent
 *    à la demande via `<ContactOrgRow>`. Aucun citoyen tiré par défaut.
 *
 * 2. **Search (terme de recherche ≥ 2 caractères)** : liste plate triée des
 *    contacts (équipe + réseau + citoyens) qui matchent. Pagination côté
 *    serveur via le `limit` dur de Convex ; tri A→Z / Z→A côté client.
 *
 * 3. **Ressortissants** : aucun chargement de masse. Tant que l'utilisateur
 *    n'a pas tapé un nom, on affiche un message expliquant qu'il faut
 *    rechercher. Une fois le terme saisi, mêmes résultats que le mode Search
 *    mais filtrés sur la source `citizen`.
 *
 * État synchronisé avec l'URL pour que la vue soit partageable et résiste au
 * refresh : `?tab=icontact&search=...&source=...&country=...&orgType=...
 * &grade=...&sort=asc|desc`.
 */

"use client";

import { api } from "@convex/_generated/api";
import {
	ArrowDownAZ,
	ArrowUpAZ,
	Globe,
	Loader2,
	Mail,
	Phone,
	Search,
	Shield,
	SlidersHorizontal,
	Users,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "@workspace/routing";
import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { CitizenProfileDrawer } from "@workspace/iasted";
import {
	usePanelContext,
	useRegisterPageAction,
} from "../../hooks/use-page-context";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { useOrg } from "../../shell/org-provider";
import {
	type ContactFilters,
	type ContactResultItem,
	type ContactSource,
} from "../../hooks/useContactSearch";
import { cn } from "@workspace/ui/lib/utils";
import { ContactActions } from "./ContactActions";
import { ContactOrgRow, type ContactOrgRowOrg } from "./ContactOrgRow";

type SortOrder = "asc" | "desc";

const SEGMENTS: Array<{
	id: ContactSource | "all";
	label: string;
	icon: typeof Users;
	hint?: string;
}> = [
	{ id: "all", label: "Tous", icon: Users },
	{ id: "team", label: "Mon équipe", icon: Shield, hint: "Collègues de votre représentation" },
	{
		id: "network",
		label: "Corps diplomatique",
		icon: Globe,
		hint: "Tous les agents de toutes les représentations diplomatiques",
	},
	{
		id: "citizens",
		label: "Ressortissants",
		icon: Users,
		hint: "Citoyens — recherche par nom requise",
	},
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

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MIN_LENGTH = 2;

// ─── URL state helpers ──────────────────────────────────────────────

const URL_KEYS = {
	search: "search",
	source: "source",
	country: "country",
	orgType: "orgType",
	grade: "grade",
	sort: "sort",
} as const;

interface IContactState {
	searchTerm: string;
	source: ContactSource | "all";
	country: string;
	orgType: string;
	positionGrade: string;
	sort: SortOrder;
}

const DEFAULT_STATE: IContactState = {
	searchTerm: "",
	source: "all",
	country: "",
	orgType: "",
	positionGrade: "",
	sort: "asc",
};

function readStateFromParams(params: URLSearchParams): IContactState {
	const out: IContactState = { ...DEFAULT_STATE };
	const search = params.get(URL_KEYS.search);
	if (search) out.searchTerm = search;
	const source = params.get(URL_KEYS.source);
	if (source === "team" || source === "network" || source === "citizens" || source === "all") {
		out.source = source;
	}
	const country = params.get(URL_KEYS.country);
	if (country) out.country = country;
	const orgType = params.get(URL_KEYS.orgType);
	if (orgType) out.orgType = orgType;
	const grade = params.get(URL_KEYS.grade);
	if (grade) out.positionGrade = grade;
	const sort = params.get(URL_KEYS.sort);
	if (sort === "asc" || sort === "desc") out.sort = sort;
	return out;
}

function useDebouncedValue<T>(value: T, delay: number): T {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const handle = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(handle);
	}, [value, delay]);
	return debounced;
}

// ─── Component ──────────────────────────────────────────────────────

export function IAstedContactTab() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { activeOrgId } = useOrg();

	// Seed once from URL
	const initialState = useMemo(
		() => readStateFromParams(searchParams),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);
	const [state, setState] = useState<IContactState>(initialState);
	const debouncedSearch = useDebouncedValue(state.searchTerm, SEARCH_DEBOUNCE_MS);
	const isSearchPending = state.searchTerm !== debouncedSearch;

	// Sync state → URL
	useEffect(() => {
		const next = new URLSearchParams(searchParams.toString());
		const setOrDelete = (key: string, value: string) => {
			if (value) next.set(key, value);
			else next.delete(key);
		};
		setOrDelete(URL_KEYS.search, state.searchTerm);
		setOrDelete(URL_KEYS.source, state.source !== "all" ? state.source : "");
		setOrDelete(URL_KEYS.country, state.country);
		setOrDelete(URL_KEYS.orgType, state.orgType);
		setOrDelete(URL_KEYS.grade, state.positionGrade);
		setOrDelete(URL_KEYS.sort, state.sort !== "asc" ? state.sort : "");
		const nextStr = next.toString();
		if (nextStr !== searchParams.toString()) {
			router.replace(`${pathname}${nextStr ? `?${nextStr}` : ""}`, { scroll: false });
		}
	}, [state, pathname, router, searchParams]);

	// ── Mode actuel ────────────────────────────────────────────────
	const hasUsableSearch =
		debouncedSearch.trim().length >= SEARCH_MIN_LENGTH;
	const isCitizenSegment = state.source === "citizens";
	const isTeamSegment = state.source === "team";
	// "team" = membres de l'org de l'agent en liste plate (pas d'org list)
	// "browse" = liste d'orgs collapsibles (Tous / Corps diplomatique)
	// "search" = liste plate de résultats de recherche
	// "citizens-prompt" = pas de chargement, prompt à la recherche
	const mode: "browse" | "search" | "citizens-prompt" | "team" =
		hasUsableSearch
			? "search"
			: isCitizenSegment
				? "citizens-prompt"
				: isTeamSegment
					? "team"
					: "browse";

	// ── Browse : liste des orgs ────────────────────────────────────
	const { data: orgsData, isPending: orgsPending } = useAuthenticatedConvexQuery(
		api.functions.contactSearch.listOrgsForContacts,
		mode === "browse"
			? {
					myOrgId: activeOrgId ?? undefined,
					country: state.country || undefined,
					orgType: state.orgType || undefined,
					scope: "all-diplomatic",
					sort: state.sort,
				}
			: "skip",
	);
	const orgs = (orgsData?.orgs ?? []) as ContactOrgRowOrg[];

	// ── Team : membres de l'org de l'agent (liste plate) ───────────
	const { data: teamData, isPending: teamPending } = useAuthenticatedConvexQuery(
		api.functions.contactSearch.listOrgMembers,
		mode === "team" && activeOrgId
			? {
					orgId: activeOrgId,
					positionGrade: state.positionGrade || undefined,
					sort: state.sort,
				}
			: "skip",
	);
	const teamMembers = (teamData?.contacts ?? []) as ContactResultItem[];

	// ── Search : recherche plate ───────────────────────────────────
	const searchScope: "org" | "jurisdiction" | "all-diplomatic" =
		state.source === "team"
			? "org"
			: state.source === "network"
				? "all-diplomatic"
				: "jurisdiction"; // all + citizens
	const { data: searchData, isPending: searchPending } = useAuthenticatedConvexQuery(
		api.functions.contactSearch.searchContacts,
		mode === "search" && activeOrgId
			? {
					myOrgId: activeOrgId,
					searchTerm: debouncedSearch,
					country: state.country || undefined,
					orgType: state.orgType || undefined,
					positionGrade: state.positionGrade || undefined,
					source: state.source !== "all" ? state.source : undefined,
					scope: searchScope,
				}
			: "skip",
	);

	const searchResults = useMemo<ContactResultItem[]>(() => {
		if (!searchData) return [];
		const flat: ContactResultItem[] = [];
		for (const g of searchData.groups ?? []) {
			for (const c of g.contacts) flat.push(c as ContactResultItem);
		}
		flat.sort((a, b) => {
			const cmp = `${a.lastName} ${a.firstName}`.localeCompare(
				`${b.lastName} ${b.firstName}`,
				"fr",
				{ sensitivity: "base" },
			);
			return state.sort === "asc" ? cmp : -cmp;
		});
		return flat;
	}, [searchData, state.sort]);

	// ── État expanded des org rows ─────────────────────────────────
	const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(() => new Set());
	const toggleOrg = useCallback((orgId: string) => {
		setExpandedOrgs((prev) => {
			const next = new Set(prev);
			if (next.has(orgId)) next.delete(orgId);
			else next.add(orgId);
			return next;
		});
	}, []);

	// ── Citoyen drawer ─────────────────────────────────────────────
	const [selectedCitizen, setSelectedCitizen] = useState<{
		id: string;
		name: string;
		firstName?: string;
		lastName?: string;
		avatar?: string;
		phone?: string;
		email?: string;
	} | null>(null);

	const openCitizen = useCallback((c: ContactResultItem) => {
		if (c.source !== "citizen") return;
		setSelectedCitizen({
			id: c.id,
			name: c.name ?? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim(),
			firstName: c.firstName,
			lastName: c.lastName,
			avatar: c.avatar,
			phone: c.phone,
			email: c.email,
		});
	}, []);

	// ── Filtres actifs ─────────────────────────────────────────────
	const activeFilterCount =
		(state.country ? 1 : 0) +
		(state.orgType ? 1 : 0) +
		(state.positionGrade ? 1 : 0) +
		(state.source !== "all" ? 1 : 0);
	const isFiltered = activeFilterCount > 0;

	// ── Helpers ────────────────────────────────────────────────────
	const setSearch = (v: string) => setState((s) => ({ ...s, searchTerm: v }));
	const setSource = (v: ContactSource | "all") => setState((s) => ({ ...s, source: v }));
	const setCountry = (v: string) => setState((s) => ({ ...s, country: v }));
	const setOrgType = (v: string) => setState((s) => ({ ...s, orgType: v }));
	const setGrade = (v: string) => setState((s) => ({ ...s, positionGrade: v }));
	const toggleSort = () =>
		setState((s) => ({ ...s, sort: s.sort === "asc" ? "desc" : "asc" }));
	const resetFilters = () =>
		setState((s) => ({ ...DEFAULT_STATE, searchTerm: s.searchTerm, sort: s.sort }));

	// ── Available countries (pour le dropdown) ─────────────────────
	const { data: availableCountries } = useAuthenticatedConvexQuery(
		api.functions.contactSearch.getAvailableCountries,
		{},
	);
	const countries = (availableCountries ?? []) as Array<{ code: string; count: number }>;

	const viewportRef = useRef<HTMLDivElement | null>(null);

	// ── Conscience iAsted : publier le contexte du panneau + actions vocales ──
	const totalVisible =
		mode === "browse"
			? orgs.length
			: mode === "team"
				? teamMembers.length
				: mode === "search"
					? searchResults.length
					: 0;
	const segmentLabel = useMemo(
		() => SEGMENTS.find((s) => s.id === state.source)?.label ?? "Tous",
		[state.source],
	);
	const panelEntities = useMemo(() => {
		const out: Array<{
			id: string;
			type: string;
			label: string;
			data?: Record<string, unknown>;
		}> = [];
		const list: ContactResultItem[] =
			mode === "search" ? searchResults : mode === "team" ? teamMembers : [];
		for (const c of list.slice(0, 40)) {
			out.push({
				id: c.userId as string,
				type: "contact",
				label: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.name || c.userId,
				data: { org: c.orgName, position: c.position ?? "", source: c.source },
			});
		}
		return out;
	}, [mode, searchResults, teamMembers]);
	usePanelContext({
		panelId: "iasted.icontact.agent",
		tabId: "icontact",
		surface: "agent",
		title: "iContact — Annuaire",
		summary: `Mode « ${mode} », segment « ${segmentLabel} », recherche « ${debouncedSearch || "(vide)"} », ${totalVisible} résultat(s).`,
		visibleEntities: panelEntities,
		availableActions: [
			{
				id: "icontact.set_segment",
				label: "Filtrer par segment",
				description:
					"Bascule sur 'all' (Tous), 'team' (Mon équipe), 'network' (Corps diplomatique), 'citizens' (Ressortissants).",
				params: { segment: { type: "string" } },
			},
			{
				id: "icontact.search",
				label: "Rechercher",
				description: "Filtre par nom, poste ou organisation.",
				params: { query: { type: "string" } },
			},
			{
				id: "icontact.clear_search",
				label: "Effacer la recherche",
				description: "Vide le champ de recherche.",
			},
			{
				id: "icontact.set_country",
				label: "Filtrer par pays",
				description: "Filtre par code ISO 2 (ex. 'FR', 'ES'). Chaîne vide pour tout afficher.",
				params: { country: { type: "string" } },
			},
			{
				id: "icontact.toggle_sort",
				label: "Inverser le tri",
				description: "Bascule entre tri A → Z et Z → A.",
			},
		],
	});

	useRegisterPageAction("icontact.set_segment", async (params) => {
		const raw = String(params?.segment ?? "");
		const next: ContactSource | "all" =
			raw === "team" || raw === "network" || raw === "citizens" || raw === "all"
				? (raw as any)
				: "all";
		setSource(next);
		return { success: true, message: `Segment basculé sur « ${next} ».` };
	});
	useRegisterPageAction("icontact.search", async (params) => {
		const q = String(params?.query ?? "").trim();
		setSearch(q);
		return { success: true, message: `Recherche : « ${q || "(vide)"} ».` };
	});
	useRegisterPageAction("icontact.clear_search", async () => {
		setSearch("");
		return { success: true, message: "Recherche effacée." };
	});
	useRegisterPageAction("icontact.set_country", async (params) => {
		const c = String(params?.country ?? "").trim().toUpperCase();
		setCountry(c);
		return { success: true, message: c ? `Pays : ${c}` : "Filtre pays effacé." };
	});
	useRegisterPageAction("icontact.toggle_sort", async () => {
		toggleSort();
		return { success: true, message: "Tri inversé." };
	});

	return (
		<div className="flex flex-col flex-1 min-h-0">
			{/* ── Recherche & filtres (sticky) ──────────────────────── */}
			<div className="p-3 border-b space-y-2 shrink-0 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
				<div className="relative">
					<Input
						value={state.searchTerm}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Rechercher un contact, une org…"
						className="h-10 text-sm pr-9"
						aria-label="Rechercher un contact"
					/>
					{state.searchTerm && (
						<button
							type="button"
							onClick={() => setSearch("")}
							className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							aria-label="Effacer la recherche"
						>
							<X className="h-3.5 w-3.5" />
						</button>
					)}
					{isSearchPending && (
						<Loader2 className="absolute right-9 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
					)}
				</div>

				{/* Segments */}
				<div className="flex items-center gap-1.5" role="tablist" aria-label="Périmètre">
					{SEGMENTS.map((seg) => (
						<button
							key={seg.id}
							type="button"
							role="tab"
							aria-selected={state.source === seg.id}
							onClick={() => setSource(seg.id)}
							title={seg.hint}
							className={cn(
								"text-xs px-3 py-1 rounded-md font-medium transition-colors",
								state.source === seg.id
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground hover:bg-muted",
							)}
						>
							{seg.label}
						</button>
					))}
				</div>

				{/* Filtres + sort + clear */}
				<div className="flex items-center gap-1.5 overflow-x-auto">
					<select
						value={state.country}
						onChange={(e) => setCountry(e.target.value)}
						className="text-xs px-2.5 py-1.5 rounded-md border bg-background text-foreground h-8"
						aria-label="Filtrer par pays"
					>
						<option value="">Tous pays</option>
						{countries.map((c) => (
							<option key={c.code} value={c.code}>
								{c.code} ({c.count})
							</option>
						))}
					</select>

					<select
						value={state.orgType}
						onChange={(e) => setOrgType(e.target.value)}
						className="text-xs px-2.5 py-1.5 rounded-md border bg-background text-foreground h-8"
						aria-label="Filtrer par type"
					>
						{ORG_TYPES.map((t) => (
							<option key={t.value} value={t.value}>
								{t.label}
							</option>
						))}
					</select>

					<select
						value={state.positionGrade}
						onChange={(e) => setGrade(e.target.value)}
						className="text-xs px-2.5 py-1.5 rounded-md border bg-background text-foreground h-8"
						aria-label="Filtrer par poste"
					>
						{GRADES.map((g) => (
							<option key={g.value} value={g.value}>
								{g.label}
							</option>
						))}
					</select>

					<button
						type="button"
						onClick={toggleSort}
						className="ml-auto shrink-0 inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border bg-background text-foreground h-8 hover:bg-muted transition-colors"
						aria-label={`Tri ${state.sort === "asc" ? "A → Z" : "Z → A"}`}
					>
						{state.sort === "asc" ? (
							<ArrowDownAZ className="h-3.5 w-3.5" />
						) : (
							<ArrowUpAZ className="h-3.5 w-3.5" />
						)}
						<span>{state.sort === "asc" ? "A → Z" : "Z → A"}</span>
					</button>

					{isFiltered && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-8 shrink-0 gap-1 text-xs"
							onClick={resetFilters}
						>
							<SlidersHorizontal className="h-3 w-3" />
							Effacer ({activeFilterCount})
						</Button>
					)}
				</div>
			</div>

			{/* ── Body ──────────────────────────────────────────────── */}
			<ScrollArea viewportRef={viewportRef} className="flex-1 min-h-0">
				{mode === "browse" && (
					<BrowseMode
						orgs={orgs}
						isPending={orgsPending}
						expandedOrgs={expandedOrgs}
						onToggleOrg={toggleOrg}
						sort={state.sort}
						onSelectContact={openCitizen}
					/>
				)}
				{mode === "team" && (
					<TeamMode
						members={teamMembers}
						isPending={teamPending}
					/>
				)}
				{mode === "search" && (
					<SearchMode
						results={searchResults}
						isPending={searchPending || isSearchPending}
						searchTerm={debouncedSearch}
						onSelectContact={openCitizen}
						onClearFilters={resetFilters}
						isFiltered={isFiltered}
					/>
				)}
				{mode === "citizens-prompt" && <CitizensPrompt />}
			</ScrollArea>

			{/* ── Footer stats ──────────────────────────────────────── */}
			<div className="border-t px-3 py-1.5 text-xs text-muted-foreground flex items-center justify-between shrink-0">
				{mode === "browse" ? (
					<>
						<span>
							{orgs.length} organisation{orgs.length > 1 ? "s" : ""}
						</span>
						<span className="text-muted-foreground/60">
							Cliquez une org pour voir ses membres
						</span>
					</>
				) : mode === "team" ? (
					<>
						<span>
							{teamMembers.length} collègue{teamMembers.length > 1 ? "s" : ""}
						</span>
						<span className="text-muted-foreground/60">Mon poste</span>
					</>
				) : mode === "search" ? (
					<>
						<span>
							{searchResults.length} résultat{searchResults.length > 1 ? "s" : ""}
						</span>
						<span className="text-muted-foreground/60">Recherche : « {debouncedSearch} »</span>
					</>
				) : (
					<>
						<span>Mode ressortissants</span>
						<span className="text-muted-foreground/60">Saisissez un nom pour rechercher</span>
					</>
				)}
			</div>

			{/* ── Fiche citoyen 360° ────────────────────────────────── */}
			{selectedCitizen && (
				<CitizenProfileDrawer
					open={!!selectedCitizen}
					onOpenChange={(v) => {
						if (!v) setSelectedCitizen(null);
					}}
					citizenId={selectedCitizen.id}
					name={selectedCitizen.name}
					avatarUrl={selectedCitizen.avatar}
					phone={selectedCitizen.phone}
					email={selectedCitizen.email}
				/>
			)}
		</div>
	);
}

// ─── Mode renderers ─────────────────────────────────────────────────

function BrowseMode({
	orgs,
	isPending,
	expandedOrgs,
	onToggleOrg,
	sort,
	onSelectContact,
}: {
	orgs: ContactOrgRowOrg[];
	isPending: boolean;
	expandedOrgs: Set<string>;
	onToggleOrg: (id: string) => void;
	sort: SortOrder;
	onSelectContact: (c: ContactResultItem) => void;
}) {
	if (isPending && orgs.length === 0) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
			</div>
		);
	}
	if (orgs.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-10 text-center px-6 gap-2">
				<Users className="h-8 w-8 text-muted-foreground/30 mb-1" />
				<p className="text-sm font-medium">Aucune organisation</p>
				<p className="text-xs text-muted-foreground max-w-xs">
					Ajustez les filtres pour voir d'autres représentations diplomatiques.
				</p>
			</div>
		);
	}
	return (
		<div>
			{orgs.map((org) => (
				<ContactOrgRow
					key={org.id}
					org={org}
					expanded={expandedOrgs.has(org.id)}
					onToggle={() => onToggleOrg(org.id)}
					sort={sort}
					onSelectContact={onSelectContact}
				/>
			))}
		</div>
	);
}

function TeamMode({
	members,
	isPending,
}: {
	members: ContactResultItem[];
	isPending: boolean;
}) {
	if (isPending && members.length === 0) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
			</div>
		);
	}
	if (members.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-10 text-center px-6 gap-2">
				<Users className="h-8 w-8 text-muted-foreground/30 mb-1" />
				<p className="text-sm font-medium">Aucun collègue trouvé</p>
				<p className="text-xs text-muted-foreground max-w-xs">
					Votre poste n'a pas encore d'autres membres actifs.
				</p>
			</div>
		);
	}
	return (
		<ul className="divide-y">
			{members.map((c) => (
				<SearchResultRow key={c.id} contact={c} />
			))}
		</ul>
	);
}

function SearchMode({
	results,
	isPending,
	searchTerm,
	onSelectContact,
	isFiltered,
	onClearFilters,
}: {
	results: ContactResultItem[];
	isPending: boolean;
	searchTerm: string;
	onSelectContact: (c: ContactResultItem) => void;
	isFiltered: boolean;
	onClearFilters: () => void;
}) {
	if (isPending && results.length === 0) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
			</div>
		);
	}
	if (results.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-10 text-center px-6 gap-2">
				<Search className="h-8 w-8 text-muted-foreground/30 mb-1" />
				<p className="text-sm font-medium">Aucun résultat pour « {searchTerm} »</p>
				<p className="text-xs text-muted-foreground max-w-xs">
					Essayez une autre orthographe ou élargissez le périmètre.
				</p>
				{isFiltered && (
					<Button variant="outline" size="sm" className="mt-2" onClick={onClearFilters}>
						Effacer les filtres
					</Button>
				)}
			</div>
		);
	}
	return (
		<ul className="divide-y">
			{results.map((c) => (
				<SearchResultRow
					key={c.id}
					contact={c}
					onClick={c.source === "citizen" ? () => onSelectContact(c) : undefined}
				/>
			))}
		</ul>
	);
}

function SearchResultRow({
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

	const showActions = !!contact.userId;

	return (
		<li className="group relative flex items-center gap-2 px-3 py-3 hover:bg-muted/30 transition-colors">
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
				<Avatar className="h-9 w-9 shrink-0">
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
						<p className="text-sm font-bold truncate">{contact.lastName}</p>
						<p className="text-sm text-foreground/80 truncate">{contact.firstName}</p>
						<Badge
							variant="outline"
							className={cn("text-[10px] h-4 px-1.5 shrink-0", sourceBadgeClass(contact.source))}
						>
							{sourceLabel(contact.source)}
						</Badge>
					</div>
					<p className="text-xs text-muted-foreground truncate">
						{contact.position ?? contact.orgName}
					</p>
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

function CitizensPrompt() {
	return (
		<div className="flex flex-col items-center justify-center py-12 text-center px-6 gap-3">
			<div className="rounded-full bg-primary/10 p-3">
				<Search className="h-6 w-6 text-primary" />
			</div>
			<div>
				<p className="text-sm font-semibold">Recherchez un ressortissant</p>
				<p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
					Pour préserver les performances, la liste complète des ressortissants
					n'est pas chargée par défaut. Saisissez un nom (ou un email) pour
					trouver une personne.
				</p>
			</div>
		</div>
	);
}

// ─── Helpers ────────────────────────────────────────────────────────

function sourceBadgeClass(source: ContactResultItem["source"]) {
	switch (source) {
		case "team":
			return "text-primary border-primary/30";
		case "citizen":
			return "text-foreground border-border";
		case "network":
			return "text-muted-foreground border-border";
		default:
			return "text-muted-foreground border-border";
	}
}

function sourceLabel(source: ContactResultItem["source"]) {
	switch (source) {
		case "team":
			return "Équipe";
		case "citizen":
			return "Citoyen";
		case "network":
			return "Réseau";
		case "administration":
			return "Admin";
		default:
			return source;
	}
}
