"use client";

import type { Doc } from "@convex/_generated/dataModel";
import { useMemo, useState } from "react";
import {
	extractSubfolder,
	type TemplateSubfolder,
} from "@/lib/templates/categorize";

export type TemplateTypeFilter =
	| "all"
	| "certificate"
	| "attestation"
	| "receipt"
	| "letter"
	| "custom";

export type SortOrder = "name" | "recent" | "type";
export type SubfolderFilter = TemplateSubfolder | "all";

export interface UseTemplatesFilterResult {
	filtered: Doc<"documentTemplates">[];
	query: string;
	setQuery: (v: string) => void;
	subfolder: SubfolderFilter;
	setSubfolder: (v: SubfolderFilter) => void;
	templateType: TemplateTypeFilter;
	setTemplateType: (v: TemplateTypeFilter) => void;
	sortOrder: SortOrder;
	setSortOrder: (v: SortOrder) => void;
	/** Nombre de modèles par sous-dossier, en appliquant search + type mais PAS subfolder. */
	countsBySubfolder: Record<TemplateSubfolder, number>;
	/** Nombre de modèles par templateType, en appliquant search + subfolder mais PAS type. */
	countsByType: Record<Exclude<TemplateTypeFilter, "all">, number>;
	/** Total brut, utilisé pour l'entrée « Tous les modèles » de la sidebar. */
	totalCount: number;
}

/** Insensible aux accents et à la casse — pour la search. */
function normalize(s: string): string {
	return s.normalize("NFD").replace(/\p{Diacritic}+/gu, "").toLowerCase();
}

function matchesQuery(t: Doc<"documentTemplates">, needle: string): boolean {
	if (needle.length === 0) return true;
	const name = t.name as { fr?: string; en?: string };
	const desc = t.description as { fr?: string; en?: string } | undefined;
	const fields = [name.fr ?? "", name.en ?? "", desc?.fr ?? "", desc?.en ?? ""];
	return fields.some((f) => normalize(f).includes(needle));
}

/**
 * Hook pur pour l'écran `/config/templates` : maintient l'état des filtres
 * et expose la liste filtrée + triée ainsi que les compteurs.
 *
 * Les compteurs croisés (ex : nombre par sous-dossier en tenant compte du
 * filtre search+type) permettent à la sidebar de refléter dynamiquement
 * l'effet de la recherche sans pour autant masquer les rubriques vides.
 */
export function useTemplatesFilter(
	templates: Doc<"documentTemplates">[] | undefined,
): UseTemplatesFilterResult {
	const [query, setQuery] = useState("");
	const [subfolder, setSubfolder] = useState<SubfolderFilter>("all");
	const [templateType, setTemplateType] = useState<TemplateTypeFilter>("all");
	const [sortOrder, setSortOrder] = useState<SortOrder>("name");

	const list = templates ?? [];

	const subfolderBy = useMemo(() => {
		const m = new Map<string, TemplateSubfolder>();
		for (const t of list) m.set(t._id as unknown as string, extractSubfolder(t));
		return m;
	}, [list]);

	const needle = normalize(query.trim());

	const filteredRaw = useMemo(() => {
		return list.filter((t) => {
			if (!matchesQuery(t, needle)) return false;
			if (subfolder !== "all") {
				const sf = subfolderBy.get(t._id as unknown as string);
				if (sf !== subfolder) return false;
			}
			if (templateType !== "all" && t.templateType !== templateType) return false;
			return true;
		});
	}, [list, needle, subfolder, templateType, subfolderBy]);

	const filtered = useMemo(() => {
		const out = [...filteredRaw];
		switch (sortOrder) {
			case "name": {
				out.sort((a, b) => {
					const an = (a.name as { fr?: string }).fr ?? "";
					const bn = (b.name as { fr?: string }).fr ?? "";
					return an.localeCompare(bn, "fr", { sensitivity: "base" });
				});
				break;
			}
			case "recent": {
				out.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
				break;
			}
			case "type": {
				out.sort((a, b) => a.templateType.localeCompare(b.templateType));
				break;
			}
		}
		return out;
	}, [filteredRaw, sortOrder]);

	const countsBySubfolder = useMemo(() => {
		const counts: Record<TemplateSubfolder, number> = {
			consulaires: 0,
			diplomatiques: 0,
			correspondances: 0,
			identite_voyage: 0,
			notariaux: 0,
			autres: 0,
		};
		for (const t of list) {
			if (!matchesQuery(t, needle)) continue;
			if (templateType !== "all" && t.templateType !== templateType) continue;
			const sf = subfolderBy.get(t._id as unknown as string) ?? "autres";
			counts[sf]++;
		}
		return counts;
	}, [list, needle, templateType, subfolderBy]);

	const countsByType = useMemo(() => {
		const counts = {
			certificate: 0,
			attestation: 0,
			receipt: 0,
			letter: 0,
			custom: 0,
		};
		for (const t of list) {
			if (!matchesQuery(t, needle)) continue;
			if (subfolder !== "all") {
				const sf = subfolderBy.get(t._id as unknown as string);
				if (sf !== subfolder) continue;
			}
			const key = t.templateType as keyof typeof counts;
			if (key in counts) counts[key]++;
		}
		return counts;
	}, [list, needle, subfolder, subfolderBy]);

	return {
		filtered,
		query,
		setQuery,
		subfolder,
		setSubfolder,
		templateType,
		setTemplateType,
		sortOrder,
		setSortOrder,
		countsBySubfolder,
		countsByType,
		totalCount: list.length,
	};
}
