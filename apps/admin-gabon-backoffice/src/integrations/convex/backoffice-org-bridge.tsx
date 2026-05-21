/**
 * BackofficeOrgBridge — synchronise l'org sélectionnée par `useOrgSelector`
 * (dropdown back-office) avec le `OrgProvider` du package agent-features.
 *
 * Le `OrgProvider` est monté avec `autoBindFirstMembership={false}` côté
 * back-office parce qu'un superadmin n'est pas nécessairement membre des
 * orgs qu'il consulte. Ce bridge fait passer l'orgId du dropdown vers le
 * provider pour que les features partagées (iDocument, iArchive, etc.)
 * qui consomment `useOrg()` voient un `activeOrgId` cohérent.
 */

"use client";

import { useEffect } from "react";
import { useOrg } from "@workspace/agent-features/shell";
import { useOrgSelector } from "@/hooks/use-org-selector";

export function BackofficeOrgBridge() {
	const { activeOrgId: selectedOrgId } = useOrgSelector();
	const { activeOrgId, setActiveOrgId } = useOrg();

	useEffect(() => {
		if (selectedOrgId && selectedOrgId !== activeOrgId) {
			setActiveOrgId(selectedOrgId);
		}
	}, [selectedOrgId, activeOrgId, setActiveOrgId]);

	return null;
}
