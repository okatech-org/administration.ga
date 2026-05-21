/**
 * Page fullscreen iContact — version agrandie de la fenêtre iAsted
 * centrée sur l'onglet "icontact" (Ressortissants / Équipe / Corps diplomatique).
 *
 * Déclenchée depuis la fenêtre flottante via le bouton Maximize2 (header).
 * Le bouton Réduire ramène l'utilisateur à la page précédente et réouvre
 * la fenêtre flottante sur le même onglet.
 *
 * Note : la page est rendue À L'INTÉRIEUR du `BackofficeLayout` (sidebar
 * principale + app header). On évite donc de dupliquer une nav verticale
 * iAsted — le composant `BackofficeContactTab` est simplement agrandi.
 */

"use client";

import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/design-system/page-header";
import { useOrgSelector } from "@/hooks/use-org-selector";
import { BackofficeContactTab } from "@/components/ai/tabs/BackofficeContactTab";
import { Minimize2 } from "lucide-react";

export default function AIContactsFullscreenPage() {
	const router = useRouter();
	const { activeOrgId, OrgSelector } = useOrgSelector();

	const handleMinimize = () => {
		router.back();
		// Laisse la navigation se terminer avant d'émettre l'event d'ouverture
		setTimeout(() => {
			window.dispatchEvent(
				new CustomEvent("iasted:open", { detail: { tab: "icontact" } }),
			);
		}, 50);
	};

	return (
		<div className="flex h-full flex-1 flex-col gap-4 px-7 pt-6 pb-[60px]">
			<PageHeader
				icon={<Users className="h-5 w-5" />}
				title="iContact"
				subtitle="Recherche intelligente cross-org — équipes, corps diplomatique, ressortissants"
				actions={
					<>
						<div className="w-[220px]">
							<OrgSelector />
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={handleMinimize}
							className="gap-2"
						>
							<Minimize2 className="h-4 w-4" />
							Réduire
						</Button>
					</>
				}
			/>

			<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card">
				<BackofficeContactTab orgId={activeOrgId} />
			</div>
		</div>
	);
}
