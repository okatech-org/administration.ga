/**
 * Tokens typographiques du module document-editor — 14 polices
 * diplomatiques (7 titres + 7 corps) + 10 tailles standard.
 *
 * Utilisés par la ContextualBubbleMenu (TextBubble) et par les
 * sélecteurs de police dans la sidebar contextuelle (Axe D).
 */

/** Tailles de police proposées (pt). */
export const FONT_SIZES = [9, 10, 11, 12, 14, 16, 18, 24, 32, 48] as const;

export type FontDefinition = { value: string; label: string };

/**
 * 7 polices serif / display curatées pour les titres et en-têtes
 * diplomatiques (caractères formels, élégants, bien lisibles en
 * majuscules).
 */
export const HEADING_FONTS: ReadonlyArray<FontDefinition> = [
	{ value: "Optima", label: "Optima" },
	{ value: "Cormorant Garamond", label: "Cormorant Garamond" },
	{ value: "EB Garamond", label: "EB Garamond" },
	{ value: "Playfair Display", label: "Playfair Display" },
	{ value: "Cinzel", label: "Cinzel" },
	{ value: "Cardo", label: "Cardo" },
	{ value: "Spectral SC", label: "Spectral SC" },
];

/**
 * 7 polices serif de lecture pour le corps du document et les pieds de
 * page. Toutes éprouvées sur textes longs administratifs et
 * diplomatiques.
 */
export const BODY_FONTS: ReadonlyArray<FontDefinition> = [
	{ value: "Times New Roman", label: "Times New Roman" },
	{ value: "Georgia", label: "Georgia" },
	{ value: "Lora", label: "Lora" },
	{ value: "Source Serif 4", label: "Source Serif 4" },
	{ value: "Libre Baskerville", label: "Libre Baskerville" },
	{ value: "Crimson Text", label: "Crimson Text" },
	{ value: "PT Serif", label: "PT Serif" },
];
