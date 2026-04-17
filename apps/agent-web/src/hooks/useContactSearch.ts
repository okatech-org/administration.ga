/**
 * useContactSearch — Hook réutilisable de recherche intelligente de contacts.
 *
 * Utilisé par : iContact, iChat, iAppel, iRéunion, iCorrespondance.
 * Encapsule la query Convex + filtres locaux + état.
 */

import { api } from "@convex/_generated/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOrg } from "@/components/org/org-provider";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";

/** Taille de page + plafond pour l'infinite scroll. */
const PAGE_SIZE = 500;
const MAX_LIMIT = 10000;

export type ContactSource = "team" | "network" | "citizens";

export interface ContactFilters {
	searchTerm: string;
	source: ContactSource | "all";
	country: string;
	orgType: string;
	positionGrade: string;
}

export interface ContactResultItem {
	id: string;
	userId: string;
	lastName: string;
	firstName: string;
	name: string;
	email?: string;
	phone?: string;
	avatar?: string;
	position?: string;
	positionGrade?: string;
	orgId: string;
	orgName: string;
	orgCountry?: string;
	orgType?: string;
	source: "team" | "network" | "citizen" | "administration";
}

export interface ContactGroup {
	org: { id: string; name: string; country?: string; type?: string };
	contacts: ContactResultItem[];
}

interface SearchContactsResult {
	total: number;
	groups: ContactGroup[];
}

interface CountryCount {
	code: string;
	count: number;
}

const DEFAULT_FILTERS: ContactFilters = {
	searchTerm: "",
	source: "all",
	country: "",
	orgType: "",
	positionGrade: "",
};

export function useContactSearch(initialSource?: ContactSource | "all") {
	const { activeOrgId } = useOrg();
	const [filters, setFilters] = useState<ContactFilters>({
		...DEFAULT_FILTERS,
		source: initialSource ?? "all",
	});

	// Limit progressive pour infinite scroll (bump de PAGE_SIZE à chaque loadMore).
	const [limit, setLimit] = useState<number>(PAGE_SIZE);
	const [previousTotal, setPreviousTotal] = useState<number>(0);

	useEffect(() => {
		setLimit(PAGE_SIZE);
		setPreviousTotal(0);
	}, [filters, activeOrgId]);

	// Query Convex avec les filtres actifs.
	//
	// Mapping source → scope pour agent-web :
	// - "network"  → "all-diplomatic" (corps diplomatique : tous les agents de toutes
	//   les représentations diplomatiques, indépendamment des filtres pays/type)
	// - "citizens" → "jurisdiction"   (ressortissants sous la juridiction de l'org active)
	// - "team" / "all" → "jurisdiction" : permet au tab "Tous" d'inclure AUSSI les
	//   citoyens de la juridiction (et pas seulement ceux explicitement managedBy myOrgId).
	//   Sans ça, un Consul Général ne voyait pas ses ressortissants dans "Tous".
	const queryArgs = useMemo(() => {
		if (!activeOrgId) return "skip" as const;

		let scope: "org" | "jurisdiction" | "all-diplomatic" = "jurisdiction";
		if (filters.source === "network") scope = "all-diplomatic";

		return {
			myOrgId: activeOrgId,
			searchTerm: filters.searchTerm || undefined,
			country: filters.country || undefined,
			orgType: filters.orgType || undefined,
			positionGrade: filters.positionGrade || undefined,
			source: filters.source !== "all" ? filters.source : undefined,
			scope,
			limit,
		};
	}, [activeOrgId, filters, limit]);

	const { data, isPending } = useAuthenticatedConvexQuery(
		api.functions.contactSearch.searchContacts,
		queryArgs,
	);

	// Pays disponibles pour le filtre
	const { data: availableCountries } = useAuthenticatedConvexQuery(
		api.functions.contactSearch.getAvailableCountries,
		{},
	);

	const typedData = data as SearchContactsResult | undefined;
	const typedCountries = availableCountries as CountryCount[] | undefined;
	const currentTotal = typedData?.total ?? 0;

	const hasMore =
		!isPending &&
		limit < MAX_LIMIT &&
		currentTotal >= limit &&
		currentTotal > previousTotal;

	useEffect(() => {
		if (!isPending && currentTotal !== previousTotal) {
			setPreviousTotal(currentTotal);
		}
	}, [isPending, currentTotal, previousTotal]);

	const loadMore = useCallback(() => {
		setLimit((prev) => Math.min(prev + PAGE_SIZE, MAX_LIMIT));
	}, []);

	// Helpers
	const setSearch = (term: string) => setFilters((f) => ({ ...f, searchTerm: term }));
	const setSource = (source: ContactSource | "all") => setFilters((f) => ({ ...f, source }));
	const setCountry = (country: string) => setFilters((f) => ({ ...f, country }));
	const setOrgType = (orgType: string) => setFilters((f) => ({ ...f, orgType }));
	const setPositionGrade = (grade: string) => setFilters((f) => ({ ...f, positionGrade: grade }));
	const resetFilters = () => setFilters({ ...DEFAULT_FILTERS, source: initialSource ?? "all" });

	return {
		// Données
		groups: typedData?.groups ?? [],
		total: currentTotal,
		availableCountries: typedCountries ?? [],
		isPending,
		hasMore,
		loadMore,

		// Filtres
		filters,
		setFilters,
		setSearch,
		setSource,
		setCountry,
		setOrgType,
		setPositionGrade,
		resetFilters,
	};
}
