"use client";

/**
 * Historique des versions d'un modèle global. Accessible uniquement au
 * super-admin (gated côté serveur par `documentTemplates.listVersions`).
 *
 * Chaque édition structurelle du template (content, placeholders, flags de
 * publication/signature) archive l'état précédent ici. L'utilisateur peut
 * comparer les metadata et restaurer une version antérieure — la version
 * courante est elle-même archivée avant la restauration, rien n'est perdu.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { History, Loader2, RotateCcw } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	useConvexMutationQuery,
	useConvexQuery,
} from "@/integrations/convex/hooks";

export default function TemplateVersionsPage() {
	const params = useParams();
	const router = useRouter();
	const templateId = params.templateId as Id<"documentTemplates">;

	const { data: template } = useConvexQuery(
		api.functions.documentTemplates.getById,
		{ templateId },
	);
	const { data: versions, isLoading } = useConvexQuery(
		api.functions.documentTemplates.listVersions,
		{ templateId },
	);
	const { mutateAsync: restoreVersion, isPending: restoring } = useConvexMutationQuery(
		api.functions.documentTemplates.restoreVersion,
	);

	const [toRestore, setToRestore] = useState<number | null>(null);

	async function confirmRestore() {
		if (toRestore === null) return;
		try {
			const next = await restoreVersion({ templateId, version: toRestore });
			toast.success(`Version ${toRestore} restaurée (nouvelle version ${next})`);
			setToRestore(null);
			router.push(`/config/templates/${templateId}`);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Échec de la restauration";
			toast.error(message);
			setToRestore(null);
		}
	}

	const title = template?.name.fr ?? template?.name.en ?? "Modèle";
	const currentVersion = template?.version ?? 1;

	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title={`Historique — ${title}`}
				subtitle={`Version courante : v${currentVersion}`}
				icon={<History />}
				showBackButton
			/>

			<FlatCard>
				{isLoading ? (
					<div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						Chargement…
					</div>
				) : !versions || versions.length === 0 ? (
					<div className="flex flex-col items-center gap-3 p-10 text-center">
						<History className="h-8 w-8 text-muted-foreground" />
						<div>
							<p className="font-medium">Aucune version archivée</p>
							<p className="mt-1 text-sm text-muted-foreground">
								Les versions apparaîtront ici dès la première modification du contenu.
							</p>
						</div>
					</div>
				) : (
					<ul className="divide-y">
						{versions.map((v) => (
							<li
								key={v._id}
								className="flex flex-wrap items-center gap-3 px-5 py-4"
							>
								<div className="flex items-center gap-2">
									<Badge variant="secondary" className="font-mono">
										v{v.version}
									</Badge>
									<span className="font-medium">
										{v.name.fr ?? v.name.en ?? "(sans titre)"}
									</span>
								</div>
								<div className="flex-1 text-xs text-muted-foreground">
									{v.changeNote ? (
										<span>{v.changeNote} — </span>
									) : null}
									Archivé le{" "}
									{new Date(v.createdAt).toLocaleString("fr-FR", {
										day: "2-digit",
										month: "long",
										year: "numeric",
										hour: "2-digit",
										minute: "2-digit",
									})}
								</div>
								<Button
									size="sm"
									variant="outline"
									onClick={() => setToRestore(v.version)}
									disabled={restoring}
								>
									<RotateCcw className="mr-2 h-4 w-4" />
									Restaurer
								</Button>
							</li>
						))}
					</ul>
				)}
			</FlatCard>

			<AlertDialog
				open={toRestore !== null}
				onOpenChange={(open) => {
					if (!open) setToRestore(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Restaurer la version {toRestore} ?</AlertDialogTitle>
						<AlertDialogDescription>
							La version actuelle (v{currentVersion}) sera archivée avant la
							restauration — rien n'est perdu. Le modèle actif deviendra la
							version {currentVersion + 1}, identique au contenu de la version{" "}
							{toRestore}.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={restoring}>Annuler</AlertDialogCancel>
						<AlertDialogAction onClick={confirmRestore} disabled={restoring}>
							{restoring ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Restauration…
								</>
							) : (
								<>
									<RotateCcw className="mr-2 h-4 w-4" />
									Restaurer
								</>
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
