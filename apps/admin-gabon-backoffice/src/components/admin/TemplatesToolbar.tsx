"use client";

import { ArrowUpDown, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { SortOrder } from "@/hooks/useTemplatesFilter";

interface TemplatesToolbarProps {
	query: string;
	onQueryChange: (v: string) => void;
	sortOrder: SortOrder;
	onSortOrderChange: (v: SortOrder) => void;
	onCreate: () => void;
	resultCount: number;
	totalCount: number;
}

/**
 * Barre d'outils de la bibliothèque globale de modèles.
 *
 * Gauche : champ de recherche (filtre nom + description, insensible aux
 * accents) + indicateur du nombre de résultats affichés.
 * Droite : tri (alphabétique / plus récent / par type) + bouton de création.
 */
export function TemplatesToolbar({
	query,
	onQueryChange,
	sortOrder,
	onSortOrderChange,
	onCreate,
	resultCount,
	totalCount,
}: TemplatesToolbarProps) {
	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex flex-1 items-center gap-3">
				<div className="relative flex-1 max-w-md">
					<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={query}
						onChange={(e) => onQueryChange(e.target.value)}
						placeholder="Rechercher un modèle…"
						className="pl-9 pr-9"
						aria-label="Rechercher un modèle"
					/>
					{query.length > 0 ? (
						<button
							type="button"
							onClick={() => onQueryChange("")}
							className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
							aria-label="Effacer la recherche"
						>
							<X className="h-3.5 w-3.5" />
						</button>
					) : null}
				</div>
				<div className="hidden text-xs text-muted-foreground sm:block">
					{resultCount === totalCount
						? `${totalCount} modèle${totalCount > 1 ? "s" : ""}`
						: `${resultCount} / ${totalCount}`}
				</div>
			</div>
			<div className="flex items-center gap-2">
				<Select
					value={sortOrder}
					onValueChange={(v) => onSortOrderChange(v as SortOrder)}
				>
					<SelectTrigger size="sm" className="w-[180px]">
						<ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="name">Alphabétique</SelectItem>
						<SelectItem value="recent">Plus récent</SelectItem>
						<SelectItem value="type">Par type</SelectItem>
					</SelectContent>
				</Select>
				<Button onClick={onCreate}>
					<Plus className="mr-1.5 h-4 w-4" />
					Nouveau modèle
				</Button>
			</div>
		</div>
	);
}
