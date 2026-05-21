/**
 * useOrgSelector — Hook réutilisable pour sélectionner une organisation
 * dans le backoffice (SuperAdmin).
 *
 * Le backoffice n'a pas d'OrgProvider comme agent-web.
 * Ce hook encapsule le pattern : fetch orgs → dropdown → activeOrgId.
 *
 * @example
 * ```tsx
 * const { activeOrgId, orgs, OrgSelector } = useOrgSelector();
 * // Utiliser activeOrgId dans les queries Convex
 * // Rendre <OrgSelector /> dans le header de la page
 * ```
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Building2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";

interface OrgItem {
	_id: Id<"orgs">;
	name: string;
	type?: string;
	country?: string;
	slug?: string;
}

export function useOrgSelector() {
	const { data: rawOrgs = [], isPending } = useAuthenticatedConvexQuery(
		api.functions.orgs.list,
		{},
	);
	const orgs = rawOrgs as OrgItem[];

	const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
	const activeOrgId = (selectedOrgId ?? orgs[0]?._id ?? null) as Id<"orgs"> | null;

	const activeOrg = useMemo(
		() => orgs.find((o) => o._id === activeOrgId) ?? null,
		[orgs, activeOrgId],
	);

	// Composant dropdown réutilisable
	const OrgSelector = useCallback(() => {
		if (isPending || orgs.length === 0) return null;
		if (orgs.length === 1) {
			return (
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Building2 className="h-4 w-4" />
					<span className="font-medium">{orgs[0].name}</span>
				</div>
			);
		}
		return (
			<Select
				value={activeOrgId ?? undefined}
				onValueChange={(v) => setSelectedOrgId(v)}
			>
				<SelectTrigger className="w-[280px] h-9">
					<Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
					<SelectValue placeholder="Sélectionner une organisation" />
				</SelectTrigger>
				<SelectContent>
					{orgs.map((org) => (
						<SelectItem key={org._id} value={org._id}>
							{org.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		);
	}, [orgs, activeOrgId, isPending]);

	return {
		activeOrgId,
		activeOrg,
		orgs,
		isPending,
		OrgSelector,
		setSelectedOrgId,
	};
}
