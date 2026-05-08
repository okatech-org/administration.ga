"use client";

import { useState } from "react";
import { AlertTriangle, Building2, Loader2, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { toast } from "sonner";

interface DeleteOrgDialogProps {
	org: Doc<"orgs">;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function DeleteOrgDialog({
	org,
	open,
	onOpenChange,
}: DeleteOrgDialogProps) {
	const { data: impact, isPending } = useAuthenticatedConvexQuery(
		api.functions.admin.getOrgDeletionImpact,
		open ? { orgId: org._id } : "skip",
	);

	const { mutate: softDelete, isPending: isDeleting } = useConvexMutationQuery(
		api.functions.admin.softDeleteOrg,
	);

	const handleConfirm = async () => {
		try {
			await softDelete({ orgId: org._id });
			toast.success("Organisme déplacé à la corbeille");
			onOpenChange(false);
		} catch (e: any) {
			const msg = e?.data ?? e?.message ?? "Erreur";
			toast.error(
				typeof msg === "string" && msg.startsWith("BLOCKERS:")
					? "Données actives détectées — voir détails"
					: "Erreur lors de la suppression",
			);
		}
	};

	const blockers = impact?.blockers;
	const totalBlockers = impact?.totalBlockers ?? 0;
	const hasBlockers = totalBlockers > 0;
	const volumes = impact?.volumes;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Trash2 className="h-5 w-5 text-destructive" />
						Déplacer à la corbeille
					</DialogTitle>
					<DialogDescription>
						<span className="flex items-center gap-1.5 text-foreground">
							<Building2 className="h-3.5 w-3.5" />
							<strong>{org.name}</strong>
						</span>
					</DialogDescription>
				</DialogHeader>

				{isPending ? (
					<div className="flex items-center justify-center py-6">
						<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
					</div>
				) : hasBlockers ? (
					<div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-2">
						<div className="flex items-center gap-2 text-sm font-semibold text-destructive">
							<AlertTriangle className="h-4 w-4" />
							Suppression bloquée
						</div>
						<p className="text-xs text-muted-foreground">
							Cet organisme contient des données opérationnelles actives.
							Désactivez ou migrez-les avant de supprimer.
						</p>
						<ul className="text-sm space-y-1 pt-1">
							{blockers?.activeMemberships ? (
								<li className="flex items-center gap-2">
									<Users className="h-3.5 w-3.5 text-muted-foreground" />
									<span>
										<strong>{blockers.activeMemberships}</strong>{" "}
										membre(s) actif(s)
									</span>
								</li>
							) : null}
							{blockers?.openRequests ? (
								<li>
									• <strong>{blockers.openRequests}</strong> demande(s) en
									cours
								</li>
							) : null}
							{blockers?.openDossiers ? (
								<li>
									• <strong>{blockers.openDossiers}</strong> dossier(s)
									ouvert(s)
								</li>
							) : null}
							{blockers?.openIntelCases ? (
								<li>
									• <strong>{blockers.openIntelCases}</strong> dossier(s)
									intelligence ouvert(s)
								</li>
							) : null}
							{blockers?.openCorrespondance ? (
								<li>
									• <strong>{blockers.openCorrespondance}</strong>{" "}
									correspondance(s) en cours
								</li>
							) : null}
						</ul>
					</div>
				) : (
					<div className="space-y-3">
						<div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
							<p className="font-medium">Action réversible.</p>
							<p className="text-xs text-muted-foreground">
								L'organisme sera caché de la liste, ses membres déconnectés.
								Vous pourrez le restaurer ou le purger définitivement depuis
								la corbeille.
							</p>
						</div>
						{volumes &&
						(volumes.requestsTotal ||
							volumes.dossiersTotal ||
							volumes.correspondanceTotal ||
							volumes.intelCasesTotal) ? (
							<div className="text-xs text-muted-foreground space-y-0.5 px-1">
								<p className="font-medium text-foreground/80">
									Volumes archivés conservés :
								</p>
								{volumes.requestsTotal ? (
									<p>• {volumes.requestsTotal} demande(s) historique(s)</p>
								) : null}
								{volumes.dossiersTotal ? (
									<p>• {volumes.dossiersTotal} dossier(s) historique(s)</p>
								) : null}
								{volumes.correspondanceTotal ? (
									<p>
										• {volumes.correspondanceTotal} correspondance(s)
										archivée(s)
									</p>
								) : null}
								{volumes.intelCasesTotal ? (
									<p>
										• {volumes.intelCasesTotal} dossier(s) intelligence
										archivé(s)
									</p>
								) : null}
							</div>
						) : null}
					</div>
				)}

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isDeleting}
					>
						Annuler
					</Button>
					<Button
						variant="destructive"
						onClick={handleConfirm}
						disabled={isDeleting || isPending || hasBlockers}
					>
						{isDeleting ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Suppression…
							</>
						) : (
							<>
								<Trash2 className="mr-2 h-4 w-4" />
								Déplacer à la corbeille
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
