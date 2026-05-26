/**
 * DisperseDialog — Dialog de dispersion des documents d'un dossier reçu.
 *
 * Permet de grouper les documents par destinataire et créer
 * N brouillons de correspondance avec les documents répartis.
 */

import type { Id } from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";
import { FileText, Loader2, Plus, Send, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { useConvexMutationQuery } from "@workspace/api/hooks";
import { cn } from "@workspace/ui/lib/utils";

interface DisperseDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	itemId: Id<"correspondanceItems">;
	documents: Array<{
		filename: string;
		label?: string;
		storageId: string;
		isMainDocument: boolean;
	}>;
}

interface DisperseGroup {
	id: string;
	recipientName: string;
	recipientOrgName: string;
	documentIndices: Set<number>;
}

export function DisperseDialog({ open, onOpenChange, itemId, documents }: DisperseDialogProps) {
	const [groups, setGroups] = useState<DisperseGroup[]>([]);

	const { mutateAsync: disperse, isPending } = useConvexMutationQuery(
		api.functions.correspondanceDocuments.disperseCorrespondance,
	);

	const addGroup = () => {
		setGroups([
			...groups,
			{
				id: crypto.randomUUID(),
				recipientName: "",
				recipientOrgName: "",
				documentIndices: new Set(),
			},
		]);
	};

	const removeGroup = (groupId: string) => {
		setGroups(groups.filter((g) => g.id !== groupId));
	};

	const toggleDocInGroup = (groupId: string, docIndex: number) => {
		setGroups(groups.map((g) => {
			if (g.id !== groupId) {
				// Retirer de l'autre groupe si présent
				const next = new Set(g.documentIndices);
				next.delete(docIndex);
				return { ...g, documentIndices: next };
			}
			const next = new Set(g.documentIndices);
			if (next.has(docIndex)) next.delete(docIndex);
			else next.add(docIndex);
			return { ...g, documentIndices: next };
		}));
	};

	const updateGroupRecipient = (groupId: string, field: "recipientName" | "recipientOrgName", value: string) => {
		setGroups(groups.map((g) =>
			g.id === groupId ? { ...g, [field]: value } : g,
		));
	};

	// Documents non assignés
	const assignedIndices = new Set<number>();
	for (const g of groups) {
		for (const i of g.documentIndices) assignedIndices.add(i);
	}
	const unassignedCount = documents.length - assignedIndices.size;

	const canSubmit = groups.length > 0 && groups.every((g) =>
		g.recipientName.trim() && g.documentIndices.size > 0,
	);

	const handleSubmit = async () => {
		if (!canSubmit) return;
		try {
			const result = await disperse({
				itemId,
				groups: groups.map((g) => ({
					documentIndices: Array.from(g.documentIndices),
					recipientName: g.recipientName.trim(),
					recipientOrgName: g.recipientOrgName.trim() || undefined,
				})),
			});
			toast.success(`${result.createdCorrespondanceIds.length} correspondance(s) créée(s) en brouillon `);
			onOpenChange(false);
			setGroups([]);
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors de la dispersion");
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-0 gap-0">
				<div className="border-b px-6 py-4">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Users className="h-5 w-5 text-primary" />
							Disperser les documents
						</DialogTitle>
						<DialogDescription>
							Répartissez les documents de ce dossier vers différents destinataires.
							Chaque groupe créera une nouvelle correspondance en brouillon.
						</DialogDescription>
					</DialogHeader>
				</div>

				<div className="overflow-y-auto p-6 space-y-4 flex-1">
					{/* Documents disponibles */}
					<div>
						<h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
							Documents ({documents.length}) — {unassignedCount} non assigné{unassignedCount > 1 ? "s" : ""}
						</h4>
						<div className="grid grid-cols-2 gap-2">
							{documents.map((doc, i) => (
								<div
									key={doc.storageId}
									className={cn(
										"flex items-center gap-2 p-2 rounded-lg border text-xs",
										assignedIndices.has(i) ? "bg-primary/5 border-primary/20" : "border-border/40",
									)}
								>
									<FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
									<span className="truncate flex-1">{doc.label ?? doc.filename}</span>
									{doc.isMainDocument && (
										<Badge variant="outline" className="text-[7px] shrink-0">Principal</Badge>
									)}
								</div>
							))}
						</div>
					</div>

					{/* Groupes de dispersion */}
					{groups.map((group, gi) => (
						<div key={group.id} className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
							<div className="flex items-center justify-between">
								<h4 className="text-sm font-semibold flex items-center gap-2">
									<Send className="h-4 w-4 text-primary" />
									Groupe {gi + 1}
								</h4>
								<Button
									variant="ghost"
									size="icon"
									className="h-7 w-7 text-destructive"
									onClick={() => removeGroup(group.id)}
								>
									<Trash2 className="h-3.5 w-3.5" />
								</Button>
							</div>

							{/* Destinataire */}
							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1">
									<Label className="text-[10px]">Destinataire *</Label>
									<Input
										value={group.recipientName}
										onChange={(e) => updateGroupRecipient(group.id, "recipientName", e.target.value)}
										placeholder="Nom ou service"
										className="h-8 text-xs"
									/>
								</div>
								<div className="space-y-1">
									<Label className="text-[10px]">Représentation</Label>
									<Input
										value={group.recipientOrgName}
										onChange={(e) => updateGroupRecipient(group.id, "recipientOrgName", e.target.value)}
										placeholder="Organisme (optionnel)"
										className="h-8 text-xs"
									/>
								</div>
							</div>

							{/* Sélection documents */}
							<div className="space-y-1">
								<Label className="text-[10px]">Documents à inclure</Label>
								<div className="space-y-1">
									{documents.map((doc, i) => {
										const isInThisGroup = group.documentIndices.has(i);
										const isInOtherGroup = !isInThisGroup && assignedIndices.has(i);
										return (
											<label
												key={doc.storageId}
												className={cn(
													"flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs",
													isInThisGroup ? "bg-primary/10" : "hover:bg-muted/30",
													isInOtherGroup && "opacity-40",
												)}
											>
												<Checkbox
													checked={isInThisGroup}
													onCheckedChange={() => toggleDocInGroup(group.id, i)}
													disabled={isInOtherGroup}
													className="h-3.5 w-3.5"
												/>
												<FileText className="h-3 w-3 text-muted-foreground shrink-0" />
												<span className="truncate">{doc.label ?? doc.filename}</span>
											</label>
										);
									})}
								</div>
							</div>
						</div>
					))}

					{/* Bouton ajouter un groupe */}
					<Button variant="outline" onClick={addGroup} className="w-full gap-1.5 border-dashed">
						<Plus className="h-3.5 w-3.5" />
						Ajouter un groupe de dispersion
					</Button>
				</div>

				{/* Footer */}
				<div className="border-t px-6 py-3 flex items-center justify-between">
					<span className="text-xs text-muted-foreground">
						{groups.length} groupe{groups.length > 1 ? "s" : ""} • {assignedIndices.size}/{documents.length} documents assignés
					</span>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
							Annuler
						</Button>
						<Button size="sm" onClick={handleSubmit} disabled={!canSubmit || isPending} className="gap-1.5">
							{isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
							Disperser
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
