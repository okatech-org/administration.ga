"use client";

import { IDocumentBase } from "@workspace/agent-features/features/idocument";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { useOrgSelector } from "@/hooks/use-org-selector";

export default function BackofficeIDocumentPage() {
	const { activeOrgId, activeOrg, OrgSelector, isPending } = useOrgSelector();

	if (isPending) {
		return (
			<PageHeader
				title="iDocument"
				subtitle="Chargement des organisations…"
				icon={<FileText className="h-5 w-5" />}
			/>
		);
	}

	if (!activeOrgId) {
		return (
			<PageHeader
				title="iDocument"
				subtitle="Aucune organisation accessible."
				icon={<FileText className="h-5 w-5" />}
			/>
		);
	}

	return (
		<>
			<PageHeader
				title="iDocument"
				subtitle="Coffre documentaire de l'organisation sélectionnée"
				icon={<FileText className="h-5 w-5" />}
				actions={<OrgSelector />}
			/>
			<IDocumentBase
				orgId={activeOrgId}
				orgType={(activeOrg as { type?: string } | null)?.type}
				permissionMode="superadmin"
			/>
		</>
	);
}
