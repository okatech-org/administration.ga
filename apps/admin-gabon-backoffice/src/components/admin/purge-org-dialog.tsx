"use client";

import { useState } from "react";
import { AlertTriangle, Building2, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { useConvexMutationQuery } from "@/integrations/convex/hooks";
import { toast } from "sonner";

interface PurgeOrgDialogProps {
	org: Doc<"orgs">;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function PurgeOrgDialog({
	org,
	open,
	onOpenChange,
}: PurgeOrgDialogProps) {
	const [confirmText, setConfirmText] = useState("");

	const { mutate: hardDelete, isPending: isPurging } = useConvexMutationQuery(
		api.functions.admin.hardDeleteOrg,
	);

	const slugMatches = confirmText.trim() === org.slug;

	const handleConfirm = async () => {
		if (!slugMatches) return;
		try {
			await hardDelete({ orgId: org._id, confirmSlug: confirmText.trim() });
			toast.success("Organisme purgé définitivement");
			onOpenChange(false);
			setConfirmText("");
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors de la purge");
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(o) => {
				if (!o) setConfirmText("");
				onOpenChange(o);
			}}
		>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-destructive">
						<ShieldAlert className="h-5 w-5" />
						Purger définitivement
					</DialogTitle>
					<DialogDescription className="flex items-center gap-1.5 pt-1">
						<Building2 className="h-3.5 w-3.5" />
						<strong className="text-foreground">{org.name}</strong>
					</DialogDescription>
				</DialogHeader>

				<div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3.5 space-y-2">
					<div className="flex items-center gap-2 text-sm font-semibold text-destructive">
						<AlertTriangle className="h-4 w-4" />
						Action IRRÉVERSIBLE
					</div>
					<p className="text-xs text-muted-foreground leading-relaxed">
						Toutes les données opérationnelles de cet organisme vont être
						supprimées : memberships, demandes, dossiers, correspondance,
						documents, dossiers de renseignement, configuration, calendriers,
						rendez-vous…
					</p>
					<div className="text-xs text-muted-foreground pt-1 border-t border-destructive/20">
						<p className="font-medium text-foreground/80 mb-0.5">
							Préservé :
						</p>
						<p>• Logs d'audit Renseignement (rétention légale)</p>
						<p>• Profils citoyens (les pointeurs vers cet organisme sont vidés)</p>
					</div>
				</div>

				<div className="space-y-2">
					<Label htmlFor="confirm-slug" className="text-sm">
						Pour confirmer, tapez le slug{" "}
						<code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
							{org.slug}
						</code>
					</Label>
					<Input
						id="confirm-slug"
						value={confirmText}
						onChange={(e) => setConfirmText(e.target.value)}
						placeholder={org.slug}
						autoComplete="off"
						className="font-mono text-sm"
					/>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isPurging}
					>
						Annuler
					</Button>
					<Button
						variant="destructive"
						onClick={handleConfirm}
						disabled={!slugMatches || isPurging}
					>
						{isPurging ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Purge en cours…
							</>
						) : (
							<>
								<ShieldAlert className="mr-2 h-4 w-4" />
								Purger définitivement
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
