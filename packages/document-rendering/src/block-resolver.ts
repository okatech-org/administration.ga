/**
 * Normalise les 3 facettes inline d'un `documentTemplate` (Entête, Typo,
 * Voix) vers les types `*Resolved` attendus par les renderers HTML / PDF.
 *
 * Les facettes sont désormais stockées directement dans le document du
 * template (plus de table séparée). Ces helpers restent utiles pour :
 *
 *   - injecter le logo (`logoStorageId` → URL) avant rendu
 *   - convertir la facette « voix » en prompt IA pour `templateAI`
 *   - offrir des types stables côté pipeline de génération
 */

import type {
	HeaderFooterBlockResolved,
	TiptapDocument,
	TypographyBlockResolved,
} from "./types";

// ============================================================================
// Types des facettes inline (sous-ensemble nécessaire au rendu / à l'IA)
// ============================================================================

export interface HeaderFooterSection {
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

export interface TypographySection {
	fontFamily: string;
	fontSizeBase: number;
	lineHeight: number;
	defaultAlignment: "left" | "center" | "right" | "justify";
	headingStyles: {
		h1: HeadingSection;
		h2: HeadingSection;
		h3: HeadingSection;
	};
	paragraphSpacingBefore?: number;
	paragraphSpacingAfter?: number;
	paragraphFirstLineIndent?: number;
	pageBreakBefore?: Array<"h1" | "h2" | "h3">;
	widowOrphanControl?: boolean;
	keepHeadingsWithNext?: boolean;
}

interface HeadingSection {
	fontSize: number;
	bold: boolean;
	uppercase: boolean;
	spacingBefore?: number;
	spacingAfter?: number;
	alignment?: "left" | "center" | "right" | "justify";
}

export interface VoiceSection {
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

// ─── Aliases legacy (transition) ───────────────────────────────────────
// Conservés pour ne pas casser les consommateurs externes. À retirer dans
// un futur refactor.
/** @deprecated — utiliser `HeaderFooterSection`. */
export type HeaderFooterBlockDoc = HeaderFooterSection;
/** @deprecated — utiliser `TypographySection`. */
export type TypographyBlockDoc = TypographySection;
/** @deprecated — utiliser `VoiceSection`. */
export type VoiceBlockDoc = VoiceSection;

// ============================================================================
// Résolveurs
// ============================================================================

/**
 * Résout la facette Entête/Pied en remplaçant la référence de stockage du
 * logo par une URL `src`. Si aucun logo n'est configuré ou si
 * `logoResolver` renvoie `undefined`, la bande est rendue sans image.
 */
export async function resolveHeaderFooterBlock(
	section: HeaderFooterSection,
	logoResolver?: (storageId: string) => Promise<string | undefined>,
): Promise<HeaderFooterBlockResolved> {
	const logoSrc =
		section.header.logoStorageId && logoResolver
			? await logoResolver(section.header.logoStorageId)
			: undefined;
	return {
		header: {
			logoSrc,
			logoAlignment: section.header.logoAlignment,
			height: section.header.height,
			content: section.header.content as TiptapDocument,
		},
		footer: {
			height: section.footer.height,
			showPageNumbers: section.footer.showPageNumbers,
			content: section.footer.content as TiptapDocument,
		},
	};
}

/**
 * La facette Typo mappe 1:1 vers le type Resolved. Exposé comme fonction
 * pour une symétrie d'API avec `resolveHeaderFooterBlock`.
 */
export function resolveTypographyBlock(
	section: TypographySection,
): TypographyBlockResolved {
	return {
		fontFamily: section.fontFamily,
		fontSizeBase: section.fontSizeBase,
		lineHeight: section.lineHeight,
		defaultAlignment: section.defaultAlignment,
		headingStyles: section.headingStyles,
		paragraphSpacingBefore: section.paragraphSpacingBefore,
		paragraphSpacingAfter: section.paragraphSpacingAfter,
		paragraphFirstLineIndent: section.paragraphFirstLineIndent,
		pageBreakBefore: section.pageBreakBefore,
		widowOrphanControl: section.widowOrphanControl,
		keepHeadingsWithNext: section.keepHeadingsWithNext,
	};
}

/**
 * Transforme la facette Voix en « prompt système » texte prêt à être injecté
 * devant la consigne utilisateur dans `templateAI.generateFromDocument`.
 */
export function voiceBlockToPromptContext(section: VoiceSection): string {
	const lines: string[] = [];
	lines.push(`# Style rédactionnel`);
	lines.push(`- Ton : ${section.tone}`);
	lines.push(`- Registre : ${section.register}`);
	lines.push(`- Personne grammaticale : ${humanisePronoun(section.personPronoun)}`);
	lines.push(`- Politesse : ${section.politenessLevel}`);
	if (section.useFormalAddress) {
		lines.push(`- Vouvoiement systématique.`);
	}
	if (section.openingFormulas && section.openingFormulas.length > 0) {
		lines.push(`\n## Formules d'ouverture suggérées`);
		for (const f of section.openingFormulas) {
			lines.push(
				`- ${f.text}${f.templateType ? ` (pour : ${f.templateType})` : ""}`,
			);
		}
	}
	if (section.closingFormulas && section.closingFormulas.length > 0) {
		lines.push(`\n## Formules de clôture suggérées`);
		for (const f of section.closingFormulas) {
			lines.push(
				`- ${f.text}${f.templateType ? ` (pour : ${f.templateType})` : ""}`,
			);
		}
	}
	if (section.signatureFormulas && section.signatureFormulas.length > 0) {
		lines.push(`\n## Formules de signature`);
		for (const s of section.signatureFormulas) {
			lines.push(`- ${s}`);
		}
	}
	if (section.argumentationGuidelines && section.argumentationGuidelines.trim()) {
		lines.push(`\n## Directives d'argumentaire`);
		lines.push(section.argumentationGuidelines.trim());
	}
	if (
		section.vocabularyPreferences &&
		section.vocabularyPreferences.length > 0
	) {
		lines.push(`\n## Préférences lexicales`);
		for (const v of section.vocabularyPreferences) {
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
