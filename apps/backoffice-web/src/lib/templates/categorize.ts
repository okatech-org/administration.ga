import type { Doc } from "@convex/_generated/dataModel";
import {
	FileText,
	Globe2,
	LayoutTemplate,
	type LucideIcon,
	Plane,
	Scale,
	Send,
} from "lucide-react";

/**
 * Les 25 modèles diplomatiques sont regroupés par sous-dossier (dérivé de la
 * description enregistrée par `seedDiplomaticDefaultsWithSceau`). Les modèles
 * hors-diplomatiques (récépissé, custom) tombent dans « autres ».
 */
export type TemplateSubfolder =
	| "consulaires"
	| "diplomatiques"
	| "correspondances"
	| "identite_voyage"
	| "notariaux"
	| "autres";

export interface SubfolderMeta {
	label: string;
	shortLabel: string;
	icon: LucideIcon;
}

export const SUBFOLDER_META: Record<TemplateSubfolder, SubfolderMeta> = {
	consulaires: {
		label: "Documents Consulaires",
		shortLabel: "Consulaires",
		icon: FileText,
	},
	diplomatiques: {
		label: "Documents Diplomatiques",
		shortLabel: "Diplomatiques",
		icon: Globe2,
	},
	correspondances: {
		label: "Correspondances Officielles",
		shortLabel: "Correspondances",
		icon: Send,
	},
	identite_voyage: {
		label: "Identité et Voyage",
		shortLabel: "Identité & Voyage",
		icon: Plane,
	},
	notariaux: {
		label: "Documents Notariaux et Juridiques",
		shortLabel: "Notariaux",
		icon: Scale,
	},
	autres: {
		label: "Autres modèles",
		shortLabel: "Autres",
		icon: LayoutTemplate,
	},
};

export const SUBFOLDER_ORDER: TemplateSubfolder[] = [
	"consulaires",
	"diplomatiques",
	"correspondances",
	"identite_voyage",
	"notariaux",
	"autres",
];

type TemplateLike = Pick<Doc<"documentTemplates">, "description">;

/** Normalise une chaîne : sans accents, minuscules, espaces compactés. */
function normalize(s: string): string {
	return s
		.normalize("NFD")
		.replace(/\p{Diacritic}+/gu, "")
		.toLowerCase()
		.replace(/\s+/g, " ")
		.trim();
}

/**
 * Dérive le sous-dossier d'un modèle à partir de sa description FR/EN.
 *
 * Le seed écrit `"Modèle officiel — 01 - Documents Consulaires"` ; on extrait
 * la partie après le premier numéro. Le matching est insensible aux accents
 * — les DOCX sources alternent `Identité` et `Identite` dans leurs noms de
 * sous-dossier.
 */
export function extractSubfolder(t: TemplateLike): TemplateSubfolder {
	const desc = t.description?.fr ?? t.description?.en ?? "";
	const match = desc.match(
		/(?:Mod[èe]le officiel|Official template)\s+[—-]\s*\d+\s*-\s*(.+)$/,
	);
	if (!match) return "autres";
	const name = normalize(match[1]);
	switch (name) {
		case "documents consulaires":
		case "consular documents":
			return "consulaires";
		case "documents diplomatiques":
		case "diplomatic documents":
			return "diplomatiques";
		case "correspondances officielles":
		case "official correspondence":
			return "correspondances";
		case "identite et voyage":
		case "identity and travel":
			return "identite_voyage";
		case "documents notariaux et juridiques":
		case "notarial and legal documents":
			return "notariaux";
		default:
			return "autres";
	}
}
