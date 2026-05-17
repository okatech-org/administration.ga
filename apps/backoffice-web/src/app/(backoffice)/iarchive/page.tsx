"use client";

import { IArchiveBase } from "@workspace/agent-features/features/iarchive";
import { Archive } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { useOrgSelector } from "@/hooks/use-org-selector";

export default function BackofficeIArchivePage() {
	const { activeOrgId, activeOrg, OrgSelector, isPending } = useOrgSelector();

	if (isPending) {
		return (
			<PageHeader
				title="iArchive"
				subtitle="Chargement des organisations…"
				icon={<Archive className="h-5 w-5" />}
			/>
		);
	}

	if (!activeOrgId) {
		return (
			<PageHeader
				title="iArchive"
				subtitle="Aucune organisation accessible."
				icon={<Archive className="h-5 w-5" />}
			/>
		);
	}

	return (
		<>
			<PageHeader
				title="iArchive"
				subtitle="Documents archivés de l'organisation sélectionnée"
				icon={<Archive className="h-5 w-5" />}
				actions={<OrgSelector />}
			/>
			<IArchiveBase
				orgId={activeOrgId}
				orgType={(activeOrg as { type?: string } | null)?.type}
				permissionMode="superadmin"
			/>
		</>
	);
}
