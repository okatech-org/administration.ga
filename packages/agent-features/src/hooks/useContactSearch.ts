/**
 * useContactSearch — Hook réutilisable de recherche intelligente de contacts.
 *
 * Utilisé par : iContact, iChat, iAppel, iRéunion, iCorrespondance.
 *
 * ⚠️ Chargement exhaustif : on récupère TOUS les contacts du périmètre (équipe
 * de l'org + ressortissants de la juridiction + réseau diplomatique selon le
 * segment). Pas de pagination — l'utilisateur voit l'intégralité de son
 * répertoire d'un coup, puis filtre via la recherche texte locale.
 *
 * Garde-fou Convex : le serveur accepte un `limit` optionnel (défaut 10 000,
 * ceiling proche du hard-cap `.collect()` Convex).
 */

import { api } from "@convex/_generated/api";
import { useMemo, useState } from "react";
import { useOrg } from "../shell/org-provider";
import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";

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
		};
	}, [activeOrgId, filters]);

	const { data, isPending } = useAuthenticatedConvexQuery(
		api.functions.contactSearch.searchContacts,
		queryArgs,
	);

	const { data: availableCountries } = useAuthenticatedConvexQuery(
		api.functions.contactSearch.getAvailableCountries,
		{},
	);

	const typedData = data as SearchContactsResult | undefined;
	const typedCountries = availableCountries as CountryCount[] | undefined;
	const currentTotal = typedData?.total ?? 0;

	const setSearch = (term: string) => setFilters((f) => ({ ...f, searchTerm: term }));
	const setSource = (source: ContactSource | "all") => setFilters((f) => ({ ...f, source }));
	const setCountry = (country: string) => setFilters((f) => ({ ...f, country }));
	const setOrgType = (orgType: string) => setFilters((f) => ({ ...f, orgType }));
	const setPositionGrade = (grade: string) => setFilters((f) => ({ ...f, positionGrade: grade }));
	const resetFilters = () => setFilters({ ...DEFAULT_FILTERS, source: initialSource ?? "all" });

	return {
		groups: typedData?.groups ?? [],
		total: currentTotal,
		availableCountries: typedCountries ?? [],
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
