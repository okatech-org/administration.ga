/**
 * useContactSearch — Hook de recherche intelligente de contacts pour backoffice.
 *
 * Adapté de agent-web : accepte orgId en paramètre au lieu de useOrg().
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMemo, useState } from "react";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";

export type ContactSource = "team" | "network" | "citizens";

export interface ContactFilters {
	searchTerm: string;
	source: ContactSource | "all";
	country: string;
	orgType: string;
	positionGrade: string;
}

const DEFAULT_FILTERS: ContactFilters = {
	searchTerm: "",
	source: "all",
	country: "",
	orgType: "",
	positionGrade: "",
};

export function useContactSearch(orgId: Id<"orgs"> | null, initialSource?: ContactSource | "all") {
	const [filters, setFilters] = useState<ContactFilters>({
		...DEFAULT_FILTERS,
		source: initialSource ?? "all",
	});

	const queryArgs = useMemo(() => {
		if (!orgId) return "skip" as const;
		return {
			myOrgId: orgId,
			searchTerm: filters.searchTerm || undefined,
			country: filters.country || undefined,
			orgType: filters.orgType || undefined,
			positionGrade: filters.positionGrade || undefined,
			source: filters.source !== "all" ? filters.source : undefined,
			limit: 100,
		};
	}, [orgId, filters]);

	const { data, isPending } = useAuthenticatedConvexQuery(
		api.functions.contactSearch.searchContacts,
		queryArgs,
	);

	const { data: availableCountries } = useAuthenticatedConvexQuery(
		api.functions.contactSearch.getAvailableCountries,
		{},
	);

	const setSearch = (term: string) => setFilters((f) => ({ ...f, searchTerm: term }));
	const setSource = (source: ContactSource | "all") => setFilters((f) => ({ ...f, source }));
	const setCountry = (country: string) => setFilters((f) => ({ ...f, country }));
	const setOrgType = (orgType: string) => setFilters((f) => ({ ...f, orgType }));
	const setPositionGrade = (grade: string) => setFilters((f) => ({ ...f, positionGrade: grade }));
	const resetFilters = () => setFilters({ ...DEFAULT_FILTERS, source: initialSource ?? "all" });

	return {
		groups: (data as any)?.groups ?? [],
		total: (data as any)?.total ?? 0,
		availableCountries: availableCountries ?? [],
		isPending,
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
