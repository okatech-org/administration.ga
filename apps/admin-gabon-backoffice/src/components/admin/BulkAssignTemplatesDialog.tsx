"use client";

/**
 * Dialog d'attribution en lot : attribuer N modèles à M représentations en
 * un seul aller-retour serveur.
 *
 * - Réutilise la logique de multi-sélection de modèles de `AssignTemplatesDialog`.
 * - Ajoute un switch « Enrichir vs Remplacer » :
 *     * Enrichir (défaut)  → union des nouvelles attributions avec les
 *                            attributions existantes par rep (sûr, n'écrase
 *                            rien).
 *     * Remplacer          → écrase les attributions existantes de chaque
 *                            rep par la liste sélectionnée.
 *
 * Permission effective : super-admin (gate appliquée côté mutation Convex
 * `orgs.bulkAssignTemplates`).
 */

import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { FileText, Loader2, Save, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Switch } from "@/components/ui/switch";
import {
	useConvexMutationQuery,
	useConvexQuery,
} from "@/integrations/convex/hooks";

type GlobalTemplate = {
	_id: Id<"documentTemplates">;
	name: Record<string, string>;
	description?: Record<string, string>;
	templateType: string;
	version?: number;
};

export interface BulkAssignTemplatesDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Représentations cibles du lot. */
	orgs: Pick<Doc<"orgs">, "_id" | "name">[];
	/** Appelé après un enregistrement réussi (p. ex. pour sortir du mode sélection). */
	onSuccess?: () => void;
}

export function BulkAssignTemplatesDialog({
	open,
	onOpenChange,
	orgs,
	onSuccess,
}: BulkAssignTemplatesDialogProps) {
	const { data: templates, isLoading } = useConvexQuery(
		api.functions.documentTemplates.listGlobal,
		{},
	);
	const { mutateAsync: bulkAssign, isPending } = useConvexMutationQuery(
		api.functions.orgs.bulkAssignTemplates,
	);

	const [selected, setSelected] = useState<Set<Id<"documentTemplates">>>(new Set());
	const [search, setSearch] = useState("");
	const [replace, setReplace] = useState(false);

	// Reset à chaque ouverture (le lot change à chaque invocation).
	useEffect(() => {
		if (open) {
			setSelected(new Set());
			setSearch("");
			setReplace(false);
		}
	}, [open]);

	const tpls = (templates ?? []) as GlobalTemplate[];
	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return tpls;
		return tpls.filter((t) => {
			const hay = `${t.name.fr ?? ""} ${t.name.en ?? ""} ${t.description?.fr ?? ""} ${t.description?.en ?? ""} ${t.templateType}`.toLowerCase();
			return hay.includes(q);
		});
	}, [tpls, search]);

	function toggle(id: Id<"documentTemplates">) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	async function handleApply() {
		if (selected.size === 0) {
			toast.error("Sélectionne au moins un modèle à attribuer");
			return;
		}
		try {
			const result = await bulkAssign({
				orgIds: orgs.map((o) => o._id),
				templateIds: Array.from(selected),
				replace,
			});
			toast.success(
				`${selected.size} modèle${selected.size > 1 ? "s" : ""} ${replace ? "remplacé" : "attribué"}${selected.size > 1 ? "s" : ""} sur ${result.updated} représentation${result.updated > 1 ? "s" : ""}`,
			);
			onOpenChange(false);
			onSuccess?.();
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Échec de l'attribution en lot",
			);
		}
	}

	const orgsPreview =
		orgs.length <= 3
			? orgs.map((o) => o.name).join(", ")
			: `${orgs
					.slice(0, 3)
					.map((o) => o.name)
					.join(", ")} +${orgs.length - 3} autres`;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>
						Attribuer des modèles à {orgs.length} représentation
						{orgs.length > 1 ? "s" : ""}
					</DialogTitle>
					<DialogDescription>
						Coche les modèles à attribuer au lot. Cibles : {orgsPreview}.
					</DialogDescription>
				</DialogHeader>

				<div className="relative">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Rechercher un modèle par nom, type…"
						className="pl-9"
					/>
				</div>

				<div className="-mx-2 max-h-[50vh] overflow-y-auto px-2">
					{isLoading ? (
						<div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
							<Loader2 className="h-4 w-4 animate-spin" />
							Chargement de la bibliothèque…
						</div>
					) : filtered.length === 0 ? (
						<div className="flex flex-col items-center gap-2 p-8 text-center">
							<FileText className="h-8 w-8 text-muted-foreground" />
							<p className="text-sm text-muted-foreground">
								{tpls.length === 0
									? "Aucun modèle global — crée-en un dans /config/templates."
									: "Aucun modèle ne correspond à la recherche."}
							</p>
						</div>
					) : (
						<ul className="flex flex-col gap-2">
							{filtered.map((tpl) => {
								const checked = selected.has(tpl._id);
								const title = tpl.name.fr ?? tpl.name.en ?? "(sans nom)";
								const desc = tpl.description?.fr ?? tpl.description?.en;
								return (
									<li key={tpl._id}>
										<label className="flex cursor-pointer items-start gap-3 rounded-md border bg-background p-3 hover:bg-muted/30">
											<Checkbox
												checked={checked}
												onCheckedChange={() => toggle(tpl._id)}
												className="mt-0.5"
											/>
											<div className="min-w-0 flex-1">
												<div className="flex flex-wrap items-center gap-2">
													<span className="font-medium">{title}</span>
													<span className="rounded bg-muted px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wide">
														{tpl.templateType}
													</span>
													<span className="text-xs text-muted-foreground">
														v{tpl.version ?? 1}
													</span>
												</div>
												{desc ? (
													<p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
														{desc}
													</p>
												) : null}
											</div>
										</label>
									</li>
								);
							})}
						</ul>
					)}
				</div>

				<div className="flex items-start justify-between gap-3 rounded-md border bg-muted/30 p-3">
					<div className="min-w-0 flex-1">
						<Label htmlFor="bulk-replace" className="cursor-pointer font-medium">
							{replace ? "Remplacer" : "Enrichir"} les attributions existantes
						</Label>
						<p className="mt-0.5 text-xs text-muted-foreground">
							{replace
								? "Les attributions actuelles de chaque représentation seront ÉCRASÉES et remplacées par la liste ci-dessus."
								: "Les modèles cochés sont ajoutés aux attributions existantes de chaque représentation (union)."}
						</p>
					</div>
					<Switch
						id="bulk-replace"
						checked={replace}
						onCheckedChange={setReplace}
					/>
				</div>

				<DialogFooter className="flex-wrap items-center justify-between gap-2 sm:justify-between">
					<span className="text-xs text-muted-foreground">
						{selected.size} modèle{selected.size > 1 ? "s" : ""} × {orgs.length}{" "}
						rep{orgs.length > 1 ? "s" : ""} ={" "}
						{selected.size * orgs.length} attribution
						{selected.size * orgs.length > 1 ? "s" : ""}
					</span>
					<div className="flex items-center gap-2">
						<Button
							variant="ghost"
							onClick={() => onOpenChange(false)}
							disabled={isPending}
						>
							Annuler
						</Button>
						<Button
							onClick={handleApply}
							disabled={isPending || selected.size === 0}
						>
							<Save className="mr-2 h-4 w-4" />
							{isPending ? "Application…" : "Appliquer"}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
