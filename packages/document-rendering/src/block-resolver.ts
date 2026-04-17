/**
 * Normalise les 3 briques composées (Entête, Typo, Voix) récupérées depuis
 * Convex vers les types `*Resolved` attendus par les renderers HTML / PDF.
 *
 * Ne dépend pas de Convex — chaque champ est typé localement afin que les
 * renderers puissent tourner côté Node (pipeline PDF) comme côté browser
 * (preview live).
 *
 * La brique « Voix » (`voiceBlock`) N'est PAS rendue ici — elle est consommée
 * par le prompt IA en amont. Fournir un helper pour la transformer en contexte
 * textuel reste utile à `templateAI.generateFromDocument`.
 */

import type {
	HeaderFooterBlockResolved,
	TiptapDocument,
	TypographyBlockResolved,
} from "./types";

// ============================================================================
// Types de bloc côté Convex (sous-ensemble nécessaire au rendu)
// ============================================================================

export interface HeaderFooterBlockDoc {
	header: {
		logoStorageId?: string;
		logoAlignment: "left" | "center" | "right";
		height?: number;
		content: unknown;
	};
	footer: {
		height?: number;
		showPageNumbers?: boolean;
		content: unknown;
	};
}

export interface TypographyBlockDoc {
	fontFamily: string;
	fontSizeBase: number;
	lineHeight: number;
	defaultAlignment: "left" | "center" | "right" | "justify";
	headingStyles: {
		h1: HeadingDoc;
		h2: HeadingDoc;
		h3: HeadingDoc;
	};
	paragraphSpacingBefore?: number;
	paragraphSpacingAfter?: number;
	paragraphFirstLineIndent?: number;
	pageBreakBefore?: Array<"h1" | "h2" | "h3">;
	widowOrphanControl?: boolean;
	keepHeadingsWithNext?: boolean;
}

interface HeadingDoc {
	fontSize: number;
	bold: boolean;
	uppercase: boolean;
	spacingBefore?: number;
	spacingAfter?: number;
	alignment?: "left" | "center" | "right" | "justify";
}

export interface VoiceBlockDoc {
	tone: string;
	register: string;
	openingFormulas?: Array<{ text: string; templateType?: string }>;
	closingFormulas?: Array<{ text: string; templateType?: string }>;
	signatureFormulas?: string[];
	personPronoun: string;
	useFormalAddress?: boolean;
	politenessLevel: string;
	argumentationGuidelines?: string;
	vocabularyPreferences?: Array<{ prefer: string; avoid?: string[] }>;
}

// ============================================================================
// Résolveurs
// ============================================================================

/**
 * Résout le bloc Entête/Pied en remplaçant la référence de stockage du logo
 * par une URL `src`. Si aucun logo n'est configuré ou si `logoResolver`
 * renvoie `undefined`, la bande reste visuelle sans image.
 */
export async function resolveHeaderFooterBlock(
	block: HeaderFooterBlockDoc,
	logoResolver?: (storageId: string) => Promise<string | undefined>,
): Promise<HeaderFooterBlockResolved> {
	const logoSrc =
		block.header.logoStorageId && logoResolver
			? await logoResolver(block.header.logoStorageId)
			: undefined;
	return {
		header: {
			logoSrc,
			logoAlignment: block.header.logoAlignment,
			height: block.header.height,
			content: block.header.content as TiptapDocument,
		},
		footer: {
			height: block.footer.height,
			showPageNumbers: block.footer.showPageNumbers,
			content: block.footer.content as TiptapDocument,
		},
	};
}

/** La brique Typo mappe 1:1 — fourni pour symétrie et stabilité d'API. */
export function resolveTypographyBlock(
	block: TypographyBlockDoc,
): TypographyBlockResolved {
	return {
		fontFamily: block.fontFamily,
		fontSizeBase: block.fontSizeBase,
		lineHeight: block.lineHeight,
		defaultAlignment: block.defaultAlignment,
		headingStyles: block.headingStyles,
		paragraphSpacingBefore: block.paragraphSpacingBefore,
		paragraphSpacingAfter: block.paragraphSpacingAfter,
		paragraphFirstLineIndent: block.paragraphFirstLineIndent,
		pageBreakBefore: block.pageBreakBefore,
		widowOrphanControl: block.widowOrphanControl,
		keepHeadingsWithNext: block.keepHeadingsWithNext,
	};
}

/**
 * Transforme la brique Voix en « prompt système » texte prêt à être injecté
 * devant la consigne utilisateur dans `templateAI.generateFromDocument`.
 * Renvoie une chaîne vide si aucun réglage ne mérite d'être exposé.
 */
export function voiceBlockToPromptContext(block: VoiceBlockDoc): string {
	const lines: string[] = [];
	lines.push(`# Style rédactionnel`);
	lines.push(`- Ton : ${block.tone}`);
	lines.push(`- Registre : ${block.register}`);
	lines.push(`- Personne grammaticale : ${humanisePronoun(block.personPronoun)}`);
	lines.push(`- Politesse : ${block.politenessLevel}`);
	if (block.useFormalAddress) {
		lines.push(`- Vouvoiement systématique.`);
	}
	if (block.openingFormulas && block.openingFormulas.length > 0) {
		lines.push(`\n## Formules d'ouverture suggérées`);
		for (const f of block.openingFormulas) {
			lines.push(
				`- ${f.text}${f.templateType ? ` (pour : ${f.templateType})` : ""}`,
			);
		}
	}
	if (block.closingFormulas && block.closingFormulas.length > 0) {
		lines.push(`\n## Formules de clôture suggérées`);
		for (const f of block.closingFormulas) {
			lines.push(
				`- ${f.text}${f.templateType ? ` (pour : ${f.templateType})` : ""}`,
			);
		}
	}
	if (block.signatureFormulas && block.signatureFormulas.length > 0) {
		lines.push(`\n## Formules de signature`);
		for (const s of block.signatureFormulas) {
			lines.push(`- ${s}`);
		}
	}
	if (block.argumentationGuidelines && block.argumentationGuidelines.trim()) {
		lines.push(`\n## Directives d'argumentaire`);
		lines.push(block.argumentationGuidelines.trim());
	}
	if (block.vocabularyPreferences && block.vocabularyPreferences.length > 0) {
		lines.push(`\n## Préférences lexicales`);
		for (const v of block.vocabularyPreferences) {
			const avoids = v.avoid && v.avoid.length > 0
				? ` (éviter : ${v.avoid.join(", ")})`
				: "";
			lines.push(`- Préférer « ${v.prefer} »${avoids}`);
		}
	}
	return lines.join("\n");
}

function humanisePronoun(code: string): string {
	switch (code) {
		case "je":
			return "Je (1ʳᵉ pers. sing.)";
		case "nous":
			return "Nous (1ʳᵉ pers. plur.)";
		case "le_consulat":
			return "Le consulat / L'ambassade (3ᵉ pers. institutionnel)";
		case "impersonnel":
			return "Impersonnel (« il est attesté… »)";
		default:
			return code;
	}
}
