"use client";

import type { Doc, Id } from "@convex/_generated/dataModel";
import { FileText, Plus, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/design-system/flat-card";
import {
	TemplateThumbnailCard,
	type TemplateThumbnailData,
} from "@/components/admin/TemplateThumbnailCard";
import {
	extractSubfolder,
	SUBFOLDER_META,
} from "@/lib/templates/categorize";

interface TemplatesGridProps {
	templates: (Doc<"documentTemplates"> & { logoUrl?: string | null })[];
	locale?: string;
	isFiltered: boolean;
	onOpen: (id: Id<"documentTemplates">) => void;
	onDelete: (id: Id<"documentTemplates">) => void;
	onCreate: () => void;
	onClearFilters: () => void;
}

/**
 * Grille principale de la bibliothèque globale de modèles.
 *
 * Affiche trois états :
 *   - vide absolu (aucun modèle en base) → CTA création
 *   - vide filtré (des modèles existent mais aucun ne matche les filtres) →
 *     CTA pour réinitialiser les filtres
 *   - grille 1-4 colonnes avec vignettes A4 enrichies (badge sous-dossier +
 *     badge d'applicabilité)
 */
export function TemplatesGrid({
	templates,
	locale,
	isFiltered,
	onOpen,
	onDelete,
	onCreate,
	onClearFilters,
}: TemplatesGridProps) {
	if (templates.length === 0) {
		return (
			<FlatCard>
				<div className="flex flex-col items-center gap-3 p-10 text-center">
					{isFiltered ? (
						<>
							<SearchX className="h-10 w-10 text-muted-foreground" />
							<p className="font-medium">Aucun modèle ne correspond</p>
							<p className="max-w-md text-sm text-muted-foreground">
								Essaie de relâcher les filtres ou d'affiner ta recherche pour
								retrouver les modèles voulus.
							</p>
							<Button
								variant="outline"
								className="mt-2"
								onClick={onClearFilters}
							>
								Effacer les filtres
							</Button>
						</>
					) : (
						<>
							<FileText className="h-10 w-10 text-muted-foreground" />
							<p className="font-medium">Aucun modèle dans la bibliothèque</p>
							<p className="max-w-md text-sm text-muted-foreground">
								Crée un premier modèle global pour qu'il devienne accessible à
								toutes les représentations configurées.
							</p>
							<Button className="mt-2" onClick={onCreate}>
								<Plus className="mr-2 h-4 w-4" />
								Nouveau modèle
							</Button>
						</>
					)}
				</div>
			</FlatCard>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{templates.map((tpl) => {
				const sf = extractSubfolder(tpl);
				const meta = SUBFOLDER_META[sf];
				const applicability =
					tpl.applicability === "all"
						? "all"
						: tpl.applicability === "specificOrgTypes"
							? "specific"
							: undefined;
				return (
					<TemplateThumbnailCard
						key={tpl._id}
						template={tpl as TemplateThumbnailData}
						locale={locale}
						onOpen={() => onOpen(tpl._id as Id<"documentTemplates">)}
						onDelete={() => onDelete(tpl._id as Id<"documentTemplates">)}
						subfolderBadge={{
							label: meta.shortLabel,
							icon: meta.icon,
						}}
						applicabilityBadge={applicability}
					/>
				);
			})}
		</div>
	);
}
