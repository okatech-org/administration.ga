/**
 * Bouton d'export ZIP du dossier complet d'une cible.
 * Déclenche l'action d'export et affiche un lien de téléchargement.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useState } from "react";
import { Package, Loader2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { useConvexMutationQuery } from "@workspace/api/hooks";
import { toast } from "sonner";

export function ExportZipButton({
	targetId,
}: {
	targetId: Id<"diplomaticTargets">;
}) {
	const [exporting, setExporting] = useState(false);

	const requestExport = useConvexMutationQuery(
		api.functions.diplomaticFolders.requestZipExport,
	);

	const handleExport = async () => {
		setExporting(true);
		try {
			await requestExport.mutateAsync({ targetId });
			toast.success(
				"Export lancé ! Le fichier ZIP apparaîtra dans le dossier opérateur une fois prêt.",
				{ duration: 5000 },
			);
		} catch {
			toast.error("Erreur lors de l'export du dossier. Veuillez réessayer.");
		} finally {
			setExporting(false);
		}
	};

	return (
		<Button
			variant="outline"
			size="sm"
			className="gap-1.5 text-xs"
			onClick={handleExport}
			disabled={exporting}
		>
			{exporting ? (
				<>
					<Loader2 className="h-3.5 w-3.5 animate-spin" />
					Export en cours...
				</>
			) : (
				<>
					<Package className="h-3.5 w-3.5" />
					Exporter ZIP
				</>
			)}
		</Button>
	);
}
