"use client";

/**
 * Bulk generate dialog — lets an agent apply the same template to the
 * current selection of requests from the inbox. Uses the `bulkGenerate`
 * action which fans out scheduler jobs. Per-request outcomes surface in
 * each request's Documents section.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
	useAuthenticatedConvexQuery,
	useConvexActionQuery,
} from "@/integrations/convex/hooks";

interface Props {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	orgId: Id<"orgs">;
	selectedIds: Id<"requests">[];
	onCompleted?: () => void;
}

export function BulkGenerateDialog({
	open,
	onOpenChange,
	orgId,
	selectedIds,
	onCompleted,
}: Props) {
	const [templateId, setTemplateId] = useState<Id<"documentTemplates"> | "">("");
	const [publishImmediately, setPublishImmediately] = useState(false);
	const [running, setRunning] = useState(false);

	// Org-wide list — merges org + global templates from listByOrg.
	const { data: templates } = useAuthenticatedConvexQuery(
		api.functions.documentTemplates.listByOrg,
		{ orgId },
	);

	const { mutateAsync: bulkGenerate } = useConvexActionQuery(
		api.functions.generatedDocuments.bulkGenerate,
	);

	async function onRun() {
		if (!templateId || selectedIds.length === 0) return;
		setRunning(true);
		try {
			const res = await bulkGenerate({
				requestIds: selectedIds,
				templateId,
				autoPublishOverride: publishImmediately || undefined,
			});
			toast.success(
				`${res.scheduled} génération${res.scheduled > 1 ? "s" : ""} planifiée${
					res.scheduled > 1 ? "s" : ""
				}`,
			);
			onOpenChange(false);
			onCompleted?.();
			setTemplateId("");
		} catch (err) {
			const message = err instanceof Error ? err.message : "Échec de l'opération";
			toast.error(message);
		} finally {
			setRunning(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Générer un document pour plusieurs demandes</DialogTitle>
					<DialogDescription>
						Le modèle choisi sera appliqué à {selectedIds.length} demande
						{selectedIds.length > 1 ? "s" : ""}. Les documents apparaîtront
						dans quelques instants dans chaque demande.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4 py-2">
					<div className="flex flex-col gap-2">
						<Label htmlFor="bulk-template">Modèle</Label>
						<Select
							value={templateId}
							onValueChange={(v) => setTemplateId(v as Id<"documentTemplates">)}
						>
							<SelectTrigger id="bulk-template">
								<SelectValue placeholder={templates ? "Choisir un modèle…" : "Chargement…"} />
							</SelectTrigger>
							<SelectContent>
								{(templates ?? []).map((t) => (
									<SelectItem key={t._id} value={t._id}>
										{t.name.fr ?? t.name.en ?? "(sans titre)"}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<label className="flex items-center justify-between gap-3 rounded-md border p-3">
						<div>
							<div className="text-sm font-medium">Publier immédiatement</div>
							<div className="text-xs text-muted-foreground">
								Force la visibilité citoyen, quel que soit le paramètre du modèle.
							</div>
						</div>
						<Switch
							checked={publishImmediately}
							onCheckedChange={setPublishImmediately}
						/>
					</label>
				</div>

				<DialogFooter>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						Annuler
					</Button>
					<Button
						onClick={onRun}
						disabled={!templateId || running || selectedIds.length === 0}
					>
						{running ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Planification…
							</>
						) : (
							<>
								<Sparkles className="mr-2 h-4 w-4" />
								Générer pour {selectedIds.length} demande
								{selectedIds.length > 1 ? "s" : ""}
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
