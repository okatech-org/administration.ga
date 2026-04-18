"use client";

/**
 * Dialog d'attribution de modèles de documents à une représentation.
 *
 * - Liste la bibliothèque globale des modèles actifs.
 * - Multi-sélection par checkboxes avec recherche textuelle.
 * - Résout les modèles visibles via applicabilité globale (type d'org)
 *   pour indiquer lesquels le sont déjà automatiquement — ces derniers
 *   peuvent quand même être cochés explicitement (union à la résolution).
 * - Affiche un badge « auto » sur les modèles déjà visibles via `applicability`.
 *
 * Permission effective : super-admin (gate appliquée côté mutation Convex).
 */

import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { FileText, Loader2, Save, Search, Sparkles } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
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
	applicability?: "all" | "specificOrgTypes";
	applicableOrgTypes?: string[];
	allowedOrgTypes?: string[];
};

export interface AssignTemplatesDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	org: Pick<Doc<"orgs">, "_id" | "name" | "type" | "assignedTemplateIds">;
}

/** Retourne vrai si le modèle est déjà visible pour cette org via l'applicabilité. */
function isAutomaticallyVisible(tpl: GlobalTemplate, orgType: string): boolean {
	// Nouveau format
	if (tpl.applicability === "all") return true;
	if (tpl.applicability === "specificOrgTypes") {
		return (tpl.applicableOrgTypes ?? []).includes(orgType);
	}
	// Legacy fallback
	const allowed = tpl.allowedOrgTypes;
	if (!allowed || allowed.length === 0) return true;
	return allowed.includes(orgType);
}

export function AssignTemplatesDialog({
	open,
	onOpenChange,
	org,
}: AssignTemplatesDialogProps) {
	const router = useRouter();
	const pathname = usePathname();
	const { data: templates, isLoading } = useConvexQuery(
		api.functions.documentTemplates.listGlobal,
		{},
	);
	const { mutateAsync: assignTemplates, isPending } = useConvexMutationQuery(
		api.functions.orgs.assignTemplates,
	);

	// Sélection initiale = les IDs déjà attribués explicitement.
	const initialSelection = useMemo(
		() => new Set((org.assignedTemplateIds ?? []) as Id<"documentTemplates">[]),
		[org.assignedTemplateIds],
	);
	const [selected, setSelected] = useState<Set<Id<"documentTemplates">>>(
		new Set(initialSelection),
	);
	const [search, setSearch] = useState("");

	// Resync sélection à chaque ouverture (évite un état stale entre reps).
	useEffect(() => {
		if (open) {
			setSelected(new Set(initialSelection));
			setSearch("");
		}
	}, [open, initialSelection]);

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

	async function handleSave() {
		try {
			const result = await assignTemplates({
				orgId: org._id,
				templateIds: Array.from(selected),
			});
			toast.success(
				result.count === 0
					? "Attributions retirées"
					: `${result.count} modèle${result.count > 1 ? "s" : ""} attribué${result.count > 1 ? "s" : ""} à ${org.name}`,
			);
			onOpenChange(false);

			// Après l'attribution, on pousse l'utilisateur sur le volet
			// « Modèles » de la rep concernée. Si on y est déjà (dialog
			// ouvert depuis ce même volet), `router.push` est no-op mais
			// déclenche un refresh de la liste via invalidations Convex.
			const targetPath = `/reps/${org._id}?tab=templates`;
			if (pathname !== `/reps/${org._id}`) {
				router.push(targetPath);
			} else {
				// Même rep — bascule simplement sur l'onglet Modèles.
				router.replace(targetPath, { scroll: false });
			}
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Échec de l'attribution",
			);
		}
	}

	const explicitCount = selected.size;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Attribuer des modèles à {org.name}</DialogTitle>
					<DialogDescription>
						Coche les modèles à rendre disponibles pour cette représentation.
						Les modèles marqués <span className="font-medium">« auto »</span>{" "}
						sont déjà visibles via leur type d'organisation — tu peux quand
						même les cocher pour garantir l'accès.
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

				<div className="-mx-2 max-h-[55vh] overflow-y-auto px-2">
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
								const auto = isAutomaticallyVisible(tpl, org.type);
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
													{auto ? (
														<span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
															<Sparkles className="h-2.5 w-2.5" />
															auto
														</span>
													) : null}
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

				<DialogFooter className="flex-wrap items-center justify-between gap-2 sm:justify-between">
					<span className="text-xs text-muted-foreground">
						{explicitCount} modèle{explicitCount > 1 ? "s" : ""} explicitement
						attribué{explicitCount > 1 ? "s" : ""}
					</span>
					<div className="flex items-center gap-2">
						<Button
							variant="ghost"
							onClick={() => onOpenChange(false)}
							disabled={isPending}
						>
							Annuler
						</Button>
						<Button onClick={handleSave} disabled={isPending}>
							<Save className="mr-2 h-4 w-4" />
							{isPending ? "Enregistrement…" : "Enregistrer"}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
