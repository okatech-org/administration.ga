/**
 * useContactSearch — Hook de recherche intelligente de contacts pour backoffice.
 *
 * Scope "backoffice" : tous les comptes créés sur la plateforme (citoyens,
 * agents de toutes les orgs, admins plateforme) sont visibles pour un user
 * back-office (SuperAdmin, AdminSystem, Admin, SousAdmin). L'org active
 * reste transmise pour que l'admin puisse identifier ses propres collègues
 * sous la source "team", mais son absence ne bloque plus la recherche.
 *
 * ⚠️ Chargement exhaustif : pas de pagination. Le serveur renvoie tout le
 * périmètre (plafond de sécurité 10 000 côté Convex).
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMemo, useState } from "react";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";

export type ContactSource = "team" | "network" | "citizens" | "administration";

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

export function useContactSearch(orgId: Id<"orgs"> | null, initialSource?: ContactSource | "all") {
	const [filters, setFilters] = useState<ContactFilters>({
		...DEFAULT_FILTERS,
		source: initialSource ?? "all",
	});

	const queryArgs = useMemo(() => {
		// En backoffice, l'absence d'org active ne bloque pas la recherche globale.
		// Aucun `limit` : le serveur renvoie tout le périmètre (plafond interne 10 000).
		return {
			myOrgId: orgId ?? undefined,
			searchTerm: filters.searchTerm || undefined,
			country: filters.country || undefined,
			orgType: filters.orgType || undefined,
			positionGrade: filters.positionGrade || undefined,
			source: filters.source !== "all" ? filters.source : undefined,
			scope: "backoffice" as const,
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
