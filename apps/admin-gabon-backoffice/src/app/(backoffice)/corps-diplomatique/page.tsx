"use client";

import { Shield } from "lucide-react";
import { DiplomaticProfilesView } from "@/components/admin/diplomatic-profiles-view";
import { PageHeader } from "@/components/design-system/page-header";

/**
 * Page dédiée Cadres Administratifs — extraite de l'ancien onglet
 * `/users?view=diplomatic`. Affiche les membres du corps administratif
 * avec leur fiche poste (hiérarchie province → ville → org → grade → statut).
 */
export default function CorpsDiplomatiquePage() {
	return (
		<div className="flex flex-1 flex-col gap-4 px-7 pt-6 pb-[60px]">
			<PageHeader
				icon={<Shield className="h-5 w-5" />}
				title="Cadres Administratifs"
				subtitle="Membres du corps administratif et leur fiche poste institutionnelle"
			/>
			<DiplomaticProfilesView />
		</div>
	);
}
